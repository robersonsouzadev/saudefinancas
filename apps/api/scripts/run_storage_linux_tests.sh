#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# RUNNER OFICIAL DE TESTES NATIVOS LINUX — ANTI-TOCTOU & DESCRITORES (G4.2 V6)
# ==============================================================================
# Executa compilação do helper e validação física das syscalls no Linux.
# Produz evidências brutas para auditoria DevSecOps.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HELPER_SRC="$SCRIPT_DIR/storage_linux_helper.c"
HELPER_BIN="$SCRIPT_DIR/storage_linux_helper"
TEST_SRC="$SCRIPT_DIR/test_storage_linux_native.c"
TEST_BIN="$SCRIPT_DIR/test_storage_linux_native"

echo "================================================================================"
echo "INICIANDO SUÍTE REPRODUZÍVEL DE TESTES NATIVOS LINUX (G4.2 V6)"
echo "Data (UTC): $(date -u +'%Y-%m-%dT%H:%M:%SZ')"
echo "Host: $(uname -a)"
echo "Kernel: $(uname -r)"
echo "================================================================================"

# 1. Compilação do Helper em C com flags estritas
echo ""
echo "[1/4] Compilando storage_linux_helper..."
gcc -O2 -Wall -Wextra -D_GNU_SOURCE "$HELPER_SRC" -o "$HELPER_BIN"
chmod 0755 "$HELPER_BIN"
echo "storage_linux_helper compilado com sucesso."

# 2. Execução do Probe Real
echo ""
echo "[2/4] Executando probe de capabilities do kernel..."
PROBE_OUTPUT=$("$HELPER_BIN" probe)
PROBE_EXIT=$?
echo "Probe Exit Code: $PROBE_EXIT"
echo "Probe Output: $PROBE_OUTPUT"

if [ "$PROBE_EXIT" -ne 0 ]; then
  echo "[FATAL] Probe falhou. Kernel Linux incompatível com openat2 / renameat2 RENAME_NOREPLACE." >&2
  exit 1
fi

# 3. Compilação da Suíte Nativa de Testes
echo ""
echo "[3/4] Compilando test_storage_linux_native..."
gcc -O2 -Wall -Wextra -pthread -D_GNU_SOURCE "$TEST_SRC" -o "$TEST_BIN"
chmod 0755 "$TEST_BIN"
echo "test_storage_linux_native compilado com sucesso."

# 4. Execução dos Testes Físicos Nativos
echo ""
echo "[4/4] Executando testes físicos contra o kernel Linux..."
"$TEST_BIN" "$HELPER_BIN"
TEST_EXIT=$?

if [ "$TEST_EXIT" -ne 0 ]; then
  echo "[FATAL] Testes nativos Linux falharam com Exit Code $TEST_EXIT." >&2
  exit "$TEST_EXIT"
fi

echo ""
echo "================================================================================"
echo "TODOS OS TESTES NATIVOS LINUX FORAM EXECUTADOS E APROVADOS (EXIT CODE 0)"
echo "================================================================================"
exit 0
