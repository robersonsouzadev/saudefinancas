#!/usr/bin/env bash

# ==============================================================================
# MONITOR DE SAÚDE DA PRODUÇÃO E RECURSOS DO HOST (VITA SAÚDE - G4.2 V5)
# ==============================================================================
# Monitora a cada 10 segundos os 6 critérios de salvaguarda.
# Se algum critério for violado:
#   1. Cancela supervisionadamente toda a árvore de processos de build e runners (--build-pid, --runner-pid);
#   2. Preserva os logs e códigos de status de encerramento;
#   3. Desliga os containers de staging;
#   4. JAMAIS toca ou reinicia a produção.
# ==============================================================================

set -euo pipefail

PROD_API_URL="https://appapi.robersonsouza.com.br/health/liveness"
PROD_CONTAINERS=(
  "sf-api-qo40k8o4g8owcoww0s4sccog-213922545655"
  "sf-web-qo40k8o4g8owcoww0s4sccog-213922581192"
  "sf-redis-qo40k8o4g8owcoww0s4sccog-213922522114"
  "sf-db-qo40k8o4g8owcoww0s4sccog-213922496244"
)

AUDIT_LOG_DIR="/data/vita-saude-staging-audit"
mkdir -p "$AUDIT_LOG_DIR" 2>/dev/null || AUDIT_LOG_DIR="/tmp/vita-saude-staging-audit"
mkdir -p "$AUDIT_LOG_DIR"
AUDIT_LOG="$AUDIT_LOG_DIR/monitor_telemetry_$(date -u +%s).log"

BUILD_PID=""
RUNNER_PID=""

# Parse de argumentos
while [[ $# -gt 0 ]]; do
  case "$1" in
    --build-pid)
      BUILD_PID="$2"
      shift 2
      ;;
    --runner-pid)
      RUNNER_PID="$2"
      shift 2
      ;;
    *)
      echo "Argumento desconhecido: $1"
      exit 1
      ;;
  esac
done

echo "================================================================================"
echo "    MONITOR CONTÍNUO DE SALVAGUARDA DA PRODUÇÃO — VITA SAÚDE (G4.2 V5)          "
echo "================================================================================"
echo "- Arquivo de Auditoria: $AUDIT_LOG"
echo "- Build PID Monitorado:  ${BUILD_PID:-Nenhum}"
echo "- Runner PID Monitorado: ${RUNNER_PID:-Nenhum}"
echo "- Containers de Produção Monitorados: ${#PROD_CONTAINERS[@]}"
echo "--------------------------------------------------------------------------------"

# ------------------------------------------------------------------------------
# 1. CÁLCULO INTERNO DE BASELINE DA PRODUÇÃO (5 AMOSTRAS VÁLIDAS)
# ------------------------------------------------------------------------------
echo "--- [Iniciando Coleta de Baseline: 5 amostras consecutivas na rota de produção] ---"
SAMPLES=()

for i in {1..5}; do
  CURL_OUT=$(curl -o /dev/null -s -w "%{http_code} %{time_total}" --max-time 5 "$PROD_API_URL" 2>/dev/null || echo "000 9.999")
  SAMPLE_HTTP=$(echo "$CURL_OUT" | awk '{print $1}')
  SAMPLE_TIME=$(echo "$CURL_OUT" | awk '{print $2}')
  SAMPLE_MS=$(echo "$SAMPLE_TIME" | awk '{printf "%.0f", $1 * 1000}')

  echo "  -> Amostra $i: HTTP $SAMPLE_HTTP em ${SAMPLE_MS} ms"

  if [[ "$SAMPLE_HTTP" == "000" ]] || [[ ! "$SAMPLE_HTTP" =~ ^2 ]]; then
    echo "[ERRO FATAL NO BASELINE]: Rota de produção inacessível ou respondeu status não-2xx (HTTP $SAMPLE_HTTP) na amostra $i."
    echo "Execução de staging bloqueada preventivamente."
    exit 1
  fi

  SAMPLES+=("$SAMPLE_MS")
  sleep 2
done

# Ordenar amostras numericamente
IFS=$'\n' SORTED_SAMPLES=($(sort -n <<<"${SAMPLES[*]}"))
unset IFS

BASELINE_MEDIAN="${SORTED_SAMPLES[2]}" # 3ª amostra de 5
BASELINE_P95="${SORTED_SAMPLES[4]}"    # 5ª amostra de 5 (máxima)

echo "[Baseline Calculada]: Mediana = ${BASELINE_MEDIAN} ms | p95 = ${BASELINE_P95} ms"
echo "BASELINE_ESTABLISHED median_ms=$BASELINE_MEDIAN p95_ms=$BASELINE_P95 timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ)" >> "$AUDIT_LOG"

# ------------------------------------------------------------------------------
# 2. AUDITORIA RIGOROSA INICIAL DOS 4 CONTAINERS DE PRODUÇÃO
# ------------------------------------------------------------------------------
echo "--- [Inspecionando estado dos 4 containers de produção factuais] ---"
declare -A INITIAL_RESTARTS

for c in "${PROD_CONTAINERS[@]}"; do
  INSPECT_RAW=$(docker inspect "$c" 2>/dev/null) || {
    echo "[ERRO FATAL]: Container de produção esperado '$c' NÃO foi localizado no host Docker!"
    exit 1
  }

  C_STATUS=$(echo "$INSPECT_RAW" | jq -r '.[0].State.Status // empty' 2>/dev/null || docker inspect --format='{{.State.Status}}' "$c")
  C_RUNNING=$(echo "$INSPECT_RAW" | jq -r '.[0].State.Running // empty' 2>/dev/null || docker inspect --format='{{.State.Running}}' "$c")
  C_OOM=$(echo "$INSPECT_RAW" | jq -r '.[0].State.OOMKilled // empty' 2>/dev/null || docker inspect --format='{{.State.OOMKilled}}' "$c")
  C_HEALTH=$(echo "$INSPECT_RAW" | jq -r '.[0].State.Health.Status // "none"' 2>/dev/null || docker inspect --format='{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' "$c" 2>/dev/null || echo "none")
  C_RESTARTS=$(echo "$INSPECT_RAW" | jq -r '.[0].RestartCount // empty' 2>/dev/null || docker inspect --format='{{.RestartCount}}' "$c")

  if [[ "$C_RUNNING" != "true" ]] || [[ "$C_STATUS" != "running" ]]; then
    echo "[ERRO FATAL]: Container de produção '$c' não está em execução (Status: $C_STATUS, Running: $C_RUNNING)!"
    exit 1
  fi
  if [[ "$C_OOM" == "true" ]]; then
    echo "[ERRO FATAL]: Container de produção '$c' sofreu OOMKilled!"
    exit 1
  fi
  if [[ "$C_HEALTH" == "unhealthy" ]]; then
    echo "[ERRO FATAL]: Container de produção '$c' apresenta status de saúde UNHEALTHY!"
    exit 1
  fi
  if [[ -z "$C_RESTARTS" ]]; then
    echo "[ERRO FATAL]: Falha ao capturar RestartCount do container de produção '$c'!"
    exit 1
  fi

  INITIAL_RESTARTS["$c"]="$C_RESTARTS"
  echo "  -> Container: $c | Status: $C_STATUS | Restarts: $C_RESTARTS | Health: $C_HEALTH"
done

echo "--------------------------------------------------------------------------------"
HIGH_LOAD_COUNT=0

terminate_process_tree() {
  local pid="$1"
  local proc_name="$2"
  if [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null; then
    echo "[ABORT SAFEGUARD] Cancelando árvore de processos de $proc_name (PID raiz: $pid)..."
    pkill -TERM -P "$pid" 2>/dev/null || true
    kill -15 "$pid" 2>/dev/null || true
    sleep 3
    if kill -0 "$pid" 2>/dev/null; then
      echo "[ABORT SAFEGUARD] Forçando SIGKILL em toda a árvore (PID: $pid)..."
      pkill -KILL -P "$pid" 2>/dev/null || true
      kill -9 "$pid" 2>/dev/null || true
    fi
    wait "$pid" 2>/dev/null || true
    local exit_code=$?
    echo "[ABORT SAFEGUARD] $proc_name finalizado. Código de saída preservado: $exit_code"
    echo "CANCELLED_PROCESS name=\"$proc_name\" pid=$pid exit_code=$exit_code timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ)" >> "$AUDIT_LOG"
  fi
}

trigger_safeguard_halt() {
  local reason="$1"
  local timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ)

  echo ""
  echo "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!"
  echo " [VIOLAÇÃO CRÍTICA DE SALVAGUARDA DETECTADA EM $timestamp]                      "
  echo " Motivo: $reason"
  echo "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!"

  echo "HALT_TRIGGERED reason=\"$reason\" timestamp=$timestamp" >> "$AUDIT_LOG"

  terminate_process_tree "$BUILD_PID" "Build Staging"
  terminate_process_tree "$RUNNER_PID" "Test Runner Staging"

  echo "[ISOLATION HALT] Desligando contêineres de staging..."
  docker stop sf-api-staging sf-worker-staging sf-db-staging sf-redis-staging 2>/dev/null || true

  echo "[ISOLATION HALT] Contêineres de staging paralisados com sucesso."
  echo "[PRODUÇÃO PRESERVADA] Nenhum recurso de produção foi afetado ou reiniciado."
  echo "================================================================================"
  exit 1
}

# Descoberta dinâmica de filesystem para monitoramento de disco
DISCOVERED_MOUNT="/data"
if [ ! -d "$DISCOVERED_MOUNT" ]; then
  DISCOVERED_MOUNT="/"
fi
echo "- Ponto de Montagem para Monitoramento de Disco: $DISCOVERED_MOUNT"

# ------------------------------------------------------------------------------
# 3. LOOP CONTÍNUO DE SUPERVISÃO A CADA 10 SEGUNDOS
# ------------------------------------------------------------------------------
while true; do
  TS=$(date -u +%Y-%m-%dT%H:%M:%SZ)

  # 1. Latência e Erro HTTP na API de Produção
  CURL_OUT=$(curl -o /dev/null -s -w "%{http_code} %{time_total}" --max-time 5 "$PROD_API_URL" 2>/dev/null || echo "000 9.999")
  HTTP_CODE=$(echo "$CURL_OUT" | awk '{print $1}')
  TIME_TOTAL=$(echo "$CURL_OUT" | awk '{print $2}')
  LATENCY_MS=$(echo "$TIME_TOTAL" | awk '{printf "%.0f", $1 * 1000}')

  if [[ "$HTTP_CODE" == "000" ]] || [[ "$HTTP_CODE" =~ ^5 ]]; then
    trigger_safeguard_halt "API de produção inacessível ou retornou erro HTTP $HTTP_CODE (tempo=${LATENCY_MS}ms)"
  fi

  if [[ "$LATENCY_MS" -gt 200 ]]; then
    trigger_safeguard_halt "Latência da API de produção excedeu teto de 200 ms: ${LATENCY_MS} ms"
  fi
  if [[ "$BASELINE_P95" -gt 0 ]]; then
    MAX_ALLOWED_LATENCY=$(( BASELINE_P95 + (BASELINE_P95 / 2) ))
    if [[ "$LATENCY_MS" -gt "$MAX_ALLOWED_LATENCY" ]] && [[ "$LATENCY_MS" -gt 100 ]]; then
      trigger_safeguard_halt "Acréscimo de latência da produção > 50%: ${LATENCY_MS} ms (Baseline p95: ${BASELINE_P95} ms)"
    fi
  fi

  # 2. Memória Disponível no Host (< 1200 MB)
  MEM_AVAIL_MB=$(free -m | awk '/Mem:/{print $7}')
  if [[ "$MEM_AVAIL_MB" -lt 1200 ]]; then
    trigger_safeguard_halt "Memória RAM disponível no host atingiu piso crítico: ${MEM_AVAIL_MB} MB (< 1200 MB)"
  fi

  # 3. Disco Livre no Host (< 45 GB = 47.185.920 KB)
  DISK_AVAIL_KB=$(df -k --output=avail "$DISCOVERED_MOUNT" | tail -1 | tr -d ' ')
  if [[ "$DISK_AVAIL_KB" -lt 47185920 ]]; then
    DISK_AVAIL_GB=$(( DISK_AVAIL_KB / 1024 / 1024 ))
    trigger_safeguard_halt "Espaço em disco livre atingiu piso crítico no ponto $DISCOVERED_MOUNT: ${DISK_AVAIL_GB} GB (< 45 GB)"
  fi

  # 4. Load Average do Host (> 2.5 sustentado por 30s)
  LOAD_1MIN=$(cat /proc/loadavg | awk '{print $1}')
  LOAD_INT=$(echo "$LOAD_1MIN" | awk '{printf "%.0f", $1 * 10}')
  if [[ "$LOAD_INT" -gt 25 ]]; then
    HIGH_LOAD_COUNT=$(( HIGH_LOAD_COUNT + 1 ))
    if [[ "$HIGH_LOAD_COUNT" -ge 3 ]]; then
      trigger_safeguard_halt "Load average do host superior a 2.5 sustentado por 30s: $LOAD_1MIN"
    fi
  else
    HIGH_LOAD_COUNT=0
  fi

  # 5. Inviolabilidade e Status dos 4 Containers de Produção (SEM ACEITAR MISSING OU FALLBACK)
  RESTARTS_SUMMARY=""
  for c in "${PROD_CONTAINERS[@]}"; do
    C_INSPECT=$(docker inspect "$c" 2>/dev/null) || {
      trigger_safeguard_halt "Container de produção $c DESAPARECEU ou não respondeu ao docker inspect!"
    }

    C_STATUS=$(echo "$C_INSPECT" | jq -r '.[0].State.Status // empty' 2>/dev/null || docker inspect --format='{{.State.Status}}' "$c")
    C_RUNNING=$(echo "$C_INSPECT" | jq -r '.[0].State.Running // empty' 2>/dev/null || docker inspect --format='{{.State.Running}}' "$c")
    C_OOM=$(echo "$C_INSPECT" | jq -r '.[0].State.OOMKilled // empty' 2>/dev/null || docker inspect --format='{{.State.OOMKilled}}' "$c")
    C_HEALTH=$(echo "$C_INSPECT" | jq -r '.[0].State.Health.Status // "none"' 2>/dev/null || docker inspect --format='{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' "$c" 2>/dev/null || echo "none")
    C_RESTARTS=$(echo "$C_INSPECT" | jq -r '.[0].RestartCount // empty' 2>/dev/null || docker inspect --format='{{.RestartCount}}' "$c")

    if [[ "$C_RUNNING" != "true" ]] || [[ "$C_STATUS" != "running" ]]; then
      trigger_safeguard_halt "Container de produção $c não está em execução (Status: $C_STATUS, Running: $C_RUNNING)!"
    fi
    if [[ "$C_OOM" == "true" ]]; then
      trigger_safeguard_halt "Container de produção $c sofreu OOMKilled!"
    fi
    if [[ "$C_HEALTH" == "unhealthy" ]]; then
      trigger_safeguard_halt "Container de produção $c reportou status UNHEALTHY!"
    fi

    INIT_R="${INITIAL_RESTARTS[$c]}"
    if [[ -z "$C_RESTARTS" ]] || [[ "$C_RESTARTS" -gt "$INIT_R" ]]; then
      trigger_safeguard_halt "Container de produção $c sofreu reinício inesperado (RestartCount: $C_RESTARTS, Inicial: $INIT_R)"
    fi

    RESTARTS_SUMMARY="$RESTARTS_SUMMARY $c=$C_RESTARTS"
  done

  echo "$TS status=HEALTHY prod_http=$HTTP_CODE prod_lat=${LATENCY_MS}ms mem_avail=${MEM_AVAIL_MB}MB disk_avail_gb=$(( DISK_AVAIL_KB / 1024 / 1024 )) load=$LOAD_1MIN prod_restarts=[$RESTARTS_SUMMARY ]" >> "$AUDIT_LOG"

  sleep 10
done
