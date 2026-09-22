#!/usr/bin/env bash
set -uo pipefail

# ==============================================================================
# RUNNER OFICIAL DE TESTES NATIVOS LINUX — ANTI-TOCTOU & ATOMICIDADE (G4.2 V7)
# ==============================================================================
# Executa compilação com -Werror, probe e testes físicos com captura de código.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HELPER_SRC="$SCRIPT_DIR/storage_linux_helper.c"
HELPER_BIN="$SCRIPT_DIR/storage_linux_helper"
TEST_SRC="$SCRIPT_DIR/test_storage_linux_native.c"
TEST_BIN="$SCRIPT_DIR/test_storage_linux_native"

echo "================================================================================"
echo "INICIANDO SUÍTE REPRODUZÍVEL DE TESTES NATIVOS LINUX (G4.2 V7)"
echo "Data (UTC): $(date -u +'%Y-%m-%dT%H:%M:%SZ')"
echo "Host: $(uname -a)"
echo "Kernel: $(uname -r)"
echo "Compilador: $(gcc --version | head -n 1)"
echo "================================================================================"

# 1. Compilação estrita do Helper com -Werror
echo ""
echo "[1/4] Compilando storage_linux_helper com -O2 -Wall -Wextra -Werror..."
gcc -O2 -Wall -Wextra -Werror -D_GNU_SOURCE "$HELPER_SRC" -o "$HELPER_BIN"
chmod 0755 "$HELPER_BIN"
echo "storage_linux_helper compilado com sucesso (zero warnings, Exit Code 0)."

# 2. Execução do Probe de Capabilities do Kernel
echo ""
echo "[2/4] Executando probe de capabilities do kernel..."
PROBE_OUTPUT=$("$HELPER_BIN" probe)
PROBE_EXIT=$?
echo "Probe Exit Code: $PROBE_EXIT"
echo "Probe Output: $PROBE_OUTPUT"

if [ "$PROBE_EXIT" -ne 0 ]; then
  echo "[FATAL] Probe falhou. Kernel incompatível com openat2 ou renameat2 RENAME_NOREPLACE." >&2
  exit 1
fi

# 3. Compilação da Suíte Nativa com -Werror e -pthread
echo ""
echo "[3/4] Compilando test_storage_linux_native com -O2 -Wall -Wextra -Werror -pthread..."
gcc -O2 -Wall -Wextra -Werror -pthread -D_GNU_SOURCE "$TEST_SRC" -o "$TEST_BIN"
chmod 0755 "$TEST_BIN"
echo "test_storage_linux_native compilado com sucesso (zero warnings, Exit Code 0)."

# 4. Execução dos Testes Físicos Nativos
echo ""
echo "[4/4] Executando testes físicos contra o kernel Linux..."
set +e
"$TEST_BIN" "$HELPER_BIN"
TEST_EXIT=$?
set -e

echo ""
echo "================================================================================"
if [ "$TEST_EXIT" -eq 0 ]; then
  echo "TODOS OS TESTES NATIVOS LINUX FORAM EXECUTADOS E APROVADOS (100% SUCESSO)"
  echo "EXIT_CODE=0"
else
  echo "[FATAL] Testes nativos Linux falharam com Exit Code $TEST_EXIT." >&2
  echo "EXIT_CODE=$TEST_EXIT"
  exit "$TEST_EXIT"
fi
echo "================================================================================"
exit 0
