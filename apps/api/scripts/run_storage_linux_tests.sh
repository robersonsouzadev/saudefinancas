#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# RUNNER OFICIAL DE TESTES NATIVOS LINUX — ANTI-TOCTOU & ATOMICIDADE (G4.2 V12)
# ==============================================================================
# Executa compilação com -Werror, probe e testes físicos com captura estrita de código.
# Falha imediatamente em qualquer erro de compilação ou execução.
# Preserva o Exit Code original e nunca executa binário ausente nem emite 100% SUCESSO em falha.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HELPER_SRC="$SCRIPT_DIR/storage_linux_helper.c"
HELPER_BIN="$SCRIPT_DIR/storage_linux_helper"
TEST_SRC="$SCRIPT_DIR/test_storage_linux_native.c"
TEST_BIN="$SCRIPT_DIR/test_storage_linux_native"

echo "================================================================================"
echo "INICIANDO SUÍTE REPRODUZÍVEL DE TESTES NATIVOS LINUX (G4.2 V12)"
echo "Data (UTC): $(date -u +'%Y-%m-%dT%H:%M:%SZ')"
echo "Host: $(uname -a 2>/dev/null || echo 'Unknown Linux')"
echo "Kernel: $(uname -r 2>/dev/null || echo 'Unknown Kernel')"
echo "Compilador: $(gcc --version 2>/dev/null | head -n 1 || echo 'gcc')"
echo "================================================================================"

# Limpeza prévia de binários anteriores para evitar reuso espúrio
rm -f "$HELPER_BIN" "$TEST_BIN"

# 1. Compilação estrita do Helper com -Werror
echo ""
echo "[1/5] Compilando storage_linux_helper com -O2 -Wall -Wextra -Werror..."
set +e
gcc -O2 -Wall -Wextra -Werror -D_GNU_SOURCE "$HELPER_SRC" -o "$HELPER_BIN"
BUILD_HELPER_RC=$?
set -e

if [ "$BUILD_HELPER_RC" -ne 0 ]; then
  echo "[FATAL] Falha na compilação de storage_linux_helper (RC=$BUILD_HELPER_RC)." >&2
  exit "$BUILD_HELPER_RC"
fi

if [ ! -x "$HELPER_BIN" ]; then
  echo "[FATAL] Compilador retornou zero, mas o binário de storage_linux_helper não foi produzido." >&2
  exit 1
fi
chmod 0755 "$HELPER_BIN"
echo "storage_linux_helper compilado com sucesso (zero warnings, Exit Code 0)."

# 2. Execução do Probe de Capabilities do Kernel
echo ""
echo "[2/5] Executando probe de capabilities do kernel..."
set +e
PROBE_OUTPUT=$("$HELPER_BIN" probe)
PROBE_RC=$?
set -e
echo "Probe Exit Code: $PROBE_RC"
echo "Probe Output: $PROBE_OUTPUT"

if [ "$PROBE_RC" -ne 0 ]; then
  echo "[FATAL] Probe falhou com Exit Code $PROBE_RC. Kernel incompatível com openat2 ou renameat2 RENAME_NOREPLACE." >&2
  exit "$PROBE_RC"
fi

# 3. Compilação da Suíte Nativa com -Werror e -pthread
echo ""
echo "[3/5] Compilando test_storage_linux_native com -O2 -Wall -Wextra -Werror -pthread..."
set +e
gcc -O2 -Wall -Wextra -Werror -pthread -D_GNU_SOURCE "$TEST_SRC" -o "$TEST_BIN"
BUILD_TESTS_RC=$?
set -e

if [ "$BUILD_TESTS_RC" -ne 0 ]; then
  echo "[FATAL] Falha na compilação de test_storage_linux_native (RC=$BUILD_TESTS_RC)." >&2
  exit "$BUILD_TESTS_RC"
fi

if [ ! -x "$TEST_BIN" ]; then
  echo "[FATAL] Compilador retornou zero, mas o binário de test_storage_linux_native não foi produzido." >&2
  exit 1
fi
chmod 0755 "$TEST_BIN"
echo "test_storage_linux_native compilado com sucesso (zero warnings, Exit Code 0)."

# 4. Execução dos Testes Físicos Nativos
echo ""
echo "[4/5] Executando testes físicos diretos contra o kernel Linux..."
set +e
"$TEST_BIN" "$HELPER_BIN"
TEST_RC=$?
set -e

if [ "$TEST_RC" -ne 0 ]; then
  echo "[FATAL] Testes nativos Linux falharam com Exit Code $TEST_RC." >&2
  echo "EXIT_CODE=$TEST_RC"
  exit "$TEST_RC"
fi

# 5. Teste de Regressão Obrigatório: Execução por Python subprocess.run(..., stdout=PIPE, stderr=PIPE)
echo ""
echo "[5/5] Executando teste de regressão anti-SIGPIPE via Python subprocess.run..."
set +e
python3 -c "
import subprocess, sys
res = subprocess.run(['$TEST_BIN', '$HELPER_BIN'], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
print(res.stdout, end='')
if res.returncode != 0:
    print(res.stderr, file=sys.stderr, end='')
    sys.exit(res.returncode)
"
PY_RC=$?
set -e

if [ "$PY_RC" -ne 0 ]; then
  echo "[FATAL] Teste de regressão Python subprocess falhou com Exit Code $PY_RC (possível SIGPIPE)." >&2
  echo "EXIT_CODE=$PY_RC"
  exit "$PY_RC"
fi
echo "Teste de regressão Python subprocess aprovado com Exit Code 0 (resiliência total a SIGPIPE comprovada)."

echo ""
echo "================================================================================"
echo "TODOS OS TESTES NATIVOS LINUX FORAM EXECUTADOS E APROVADOS (100% SUCESSO)"
echo "EXIT_CODE=0"
echo "================================================================================"
exit 0
