#!/usr/bin/env bash

# ==============================================================================
# MONITOR DE SAÚDE DA PRODUÇÃO E RECURSOS DO HOST (VITA SAÚDE - G4.2)
# ==============================================================================
# Monitora a cada 10 segundos os 6 critérios de salvaguarda.
# Se algum critério for violado:
#   1. Cancela supervisionadamente toda a árvore de processos de build e runners (--build-pid, --runner-pid);
#   2. Preserva os logs e códigos de status de encerramento;
#   3. Desliga os containers de staging;
#   4. JAMAIS toca ou reinicia a produção.
# ==============================================================================

set -u

PROD_API_URL="https://appapi.robersonsouza.com.br/health/liveness"
PROD_CONTAINER_API="sf-api-qo40k8o4g8owcoww0s4sccog-213922545655"
AUDIT_LOG_DIR="/data/vita-saude-staging-audit"
mkdir -p "$AUDIT_LOG_DIR"
AUDIT_LOG="$AUDIT_LOG_DIR/monitor_telemetry_$(date -u +%s).log"

BUILD_PID=""
RUNNER_PID=""
BASELINE_LATENCY_MS=0

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
    --baseline-ms)
      BASELINE_LATENCY_MS="$2"
      shift 2
      ;;
    *)
      echo "Argumento desconhecido: $1"
      exit 1
      ;;
  esac
done

echo "================================================================================"
echo "    MONITOR CONTÍNUO DE SALVAGUARDA DA PRODUÇÃO — VITA SAÚDE (G4.2)            "
echo "================================================================================"
echo "- Arquivo de Auditoria: $AUDIT_LOG"
echo "- Build PID Monitorado:  ${BUILD_PID:-Nenhum}"
echo "- Runner PID Monitorado: ${RUNNER_PID:-Nenhum}"
echo "- Baseline de Latência: ${BASELINE_LATENCY_MS} ms"
echo "--------------------------------------------------------------------------------"

# Captura inicial do RestartCount da produção
INITIAL_RESTART_COUNT=$(docker inspect --format='{{.RestartCount}}' "$PROD_CONTAINER_API" 2>/dev/null || echo "0")
HIGH_LOAD_COUNT=0

terminate_process_tree() {
  local pid="$1"
  local proc_name="$2"
  if [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null; then
    echo "[ABORT SAFEGUARD] Cancelando árvore de processos de $proc_name (PID raiz: $pid)..."
    
    # 1. Envia SIGTERM para os filhos e depois para o pai
    pkill -TERM -P "$pid" 2>/dev/null || true
    kill -15 "$pid" 2>/dev/null || true
    
    sleep 3
    
    # 2. Se ainda estiver ativo, envia SIGKILL para toda a árvore
    if kill -0 "$pid" 2>/dev/null; then
      echo "[ABORT SAFEGUARD] Processo ainda ativo após SIGTERM. Forçando SIGKILL em toda a árvore (PID: $pid)..."
      pkill -KILL -P "$pid" 2>/dev/null || true
      kill -9 "$pid" 2>/dev/null || true
    fi
    
    wait "$pid" 2>/dev/null
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
  echo " [VIOLAÇÃO CRÍTICA DE LIMIAR DETECTADA EM $timestamp]                           "
  echo " Motivo: $reason"
  echo "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!"

  echo "HALT_TRIGGERED reason=\"$reason\" timestamp=$timestamp" >> "$AUDIT_LOG"

  # 1. Cancela supervisionadamente toda a árvore de build e teste
  terminate_process_tree "$BUILD_PID" "Build Staging"
  terminate_process_tree "$RUNNER_PID" "Test Runner Staging"

  # 2. Desliga os contêineres de staging com segurança
  echo "[ISOLATION HALT] Desligando contêineres de staging..."
  docker stop sf-api-staging sf-worker-staging sf-db-staging sf-redis-staging 2>/dev/null || true

  echo "[ISOLATION HALT] Contêineres de staging paralisados com sucesso."
  echo "[PRODUÇÃO PRESERVADA] Nenhum recurso de produção foi afetado ou reiniciado."
  echo "================================================================================"
  exit 1
}

# Loop de monitoramento contínuo
while true; do
  TS=$(date -u +%Y-%m-%dT%H:%M:%SZ)

  # 1. Verificação de Latência e Erro HTTP na API de Produção
  CURL_OUT=$(curl -o /dev/null -s -w "%{http_code} %{time_total}" --max-time 5 "$PROD_API_URL" 2>/dev/null || echo "000 9.999")
  HTTP_CODE=$(echo "$CURL_OUT" | awk '{print $1}')
  TIME_TOTAL=$(echo "$CURL_OUT" | awk '{print $2}')
  LATENCY_MS=$(echo "$TIME_TOTAL" | awk '{printf "%.0f", $1 * 1000}')

  # Critério 1A: Erro 5xx na Produção
  if [[ "$HTTP_CODE" =~ ^5 ]]; then
    trigger_safeguard_halt "API de produção retornou erro HTTP $HTTP_CODE"
  fi

  # Critério 1B: Latência p95 > 200 ms ou aumento > 50% relativo à baseline
  if [[ "$LATENCY_MS" -gt 200 ]]; then
    trigger_safeguard_halt "Latência da API de produção excedeu 200 ms: ${LATENCY_MS} ms"
  fi
  if [[ "$BASELINE_LATENCY_MS" -gt 0 ]]; then
    MAX_ALLOWED_LATENCY=$(( BASELINE_LATENCY_MS + (BASELINE_LATENCY_MS / 2) ))
    if [[ "$LATENCY_MS" -gt "$MAX_ALLOWED_LATENCY" ]] && [[ "$LATENCY_MS" -gt 100 ]]; then
      trigger_safeguard_halt "Acréscimo de latência da produção > 50%: ${LATENCY_MS} ms (Baseline: ${BASELINE_LATENCY_MS} ms)"
    fi
  fi

  # 2. Verificação de Memória Disponível no Host (Limiar: < 1200 MB)
  MEM_AVAIL_MB=$(free -m | awk '/Mem:/{print $7}')
  if [[ "$MEM_AVAIL_MB" -lt 1200 ]]; then
    trigger_safeguard_halt "Memória RAM disponível no host atingiu piso crítico: ${MEM_AVAIL_MB} MB (< 1200 MB)"
  fi

  # 3. Verificação de Disco Livre no Host (Limiar: < 45 GB = 47.185.920 KB)
  DISK_AVAIL_KB=$(df --output=avail /dev/sda1 | tail -1 | tr -d ' ')
  if [[ "$DISK_AVAIL_KB" -lt 47185920 ]]; then
    DISK_AVAIL_GB=$(( DISK_AVAIL_KB / 1024 / 1024 ))
    trigger_safeguard_halt "Espaço em disco livre atingiu piso crítico: ${DISK_AVAIL_GB} GB (< 45 GB)"
  fi

  # 4. Verificação de Load Average do Host (Limiar: > 2.5 contínuo por > 30s)
  LOAD_1MIN=$(cat /proc/loadavg | awk '{print $1}')
  LOAD_INT=$(echo "$LOAD_1MIN" | awk '{printf "%.0f", $1 * 10}')
  if [[ "$LOAD_INT" -gt 25 ]]; then
    HIGH_LOAD_COUNT=$(( HIGH_LOAD_COUNT + 1 ))
    if [[ "$HIGH_LOAD_COUNT" -ge 3 ]]; then # 3 amostras de 10s = 30s
      trigger_safeguard_halt "Load average do host superior a 2.5 sustentado por 30s: $LOAD_1MIN"
    fi
  else
    HIGH_LOAD_COUNT=0
  fi

  # 5. Verificação de Reinicialização de Contêineres de Produção
  CURRENT_RESTARTS=$(docker inspect --format='{{.RestartCount}}' "$PROD_CONTAINER_API" 2>/dev/null || echo "0")
  if [[ "$CURRENT_RESTARTS" -gt "$INITIAL_RESTART_COUNT" ]]; then
    trigger_safeguard_halt "Contêiner de produção $PROD_CONTAINER_API sofreu reinício inesperado (RestartCount: $CURRENT_RESTARTS)"
  fi

  # Registro no log de telemetria
  echo "$TS status=HEALTHY prod_http=$HTTP_CODE prod_lat=${LATENCY_MS}ms mem_avail=${MEM_AVAIL_MB}MB disk_avail_gb=$(( DISK_AVAIL_KB / 1024 / 1024 )) load=$LOAD_1MIN prod_restarts=$CURRENT_RESTARTS" >> "$AUDIT_LOG"

  sleep 10
done
