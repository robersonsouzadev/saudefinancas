#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# SUÍTE DE TESTES NEGATIVOS DO RUNNER LINUX (G4.2 V8)
# ==============================================================================
# Valida formalmente que run_storage_linux_tests.sh:
# 1. Aborta imediatamente se a compilação do helper falhar.
# 2. Aborta imediatamente se o probe de capabilities do kernel falhar.
# 3. Aborta imediatamente se a compilação dos testes nativos falhar.
# 4. Propaga fielmente o exit code de falha retornado pelos testes.
# ==============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RUNNER="$SCRIPT_DIR/run_storage_linux_tests.sh"
TEMP_DIR=$(mktemp -d /tmp/runner_neg_test_XXXXXX)

cleanup() {
  rm -rf "$TEMP_DIR"
}
trap cleanup EXIT

TOTAL_CASES=4
PASSED_CASES=0

echo "================================================================================"
echo "INICIANDO TESTES NEGATIVOS DO RUNNER LINUX (G4.2 V8)"
echo "Target Runner: $RUNNER"
echo "Temp Workspace: $TEMP_DIR"
echo "================================================================================"

# ------------------------------------------------------------------------------
# Cenário 1: GCC falha ao compilar storage_linux_helper.c
# ------------------------------------------------------------------------------
echo ""
echo "[TEST NEG 1/4] Simulando falha de compilação em storage_linux_helper..."
MOCK_BIN_DIR="$TEMP_DIR/mock1"
mkdir -p "$MOCK_BIN_DIR"
cat << 'EOF' > "$MOCK_BIN_DIR/gcc"
#!/usr/bin/env bash
if [[ "$*" == *"storage_linux_helper.c"* ]]; then
  echo "Mock GCC: Simulando erro de sintaxe/compilação em storage_linux_helper.c" >&2
  exit 1
fi
exec /usr/bin/gcc "$@"
EOF
chmod 0755 "$MOCK_BIN_DIR/gcc"

set +e
PATH="$MOCK_BIN_DIR:$PATH" bash "$RUNNER" > "$TEMP_DIR/out_neg1.log" 2>&1
RUNNER_EXIT_1=$?
set -e

if [ "$RUNNER_EXIT_1" -ne 0 ] && grep -q "Falha na compilação de storage_linux_helper" "$TEMP_DIR/out_neg1.log"; then
  echo "PASS: Runner abortou imediatamente na compilação do helper (Exit Code $RUNNER_EXIT_1)."
  PASSED_CASES=$((PASSED_CASES + 1))
else
  echo "FAIL: Runner não abortou corretamente na compilação do helper (Exit Code $RUNNER_EXIT_1)." >&2
  cat "$TEMP_DIR/out_neg1.log" >&2
  exit 1
fi

# ------------------------------------------------------------------------------
# Cenário 2: Probe de capabilities do kernel falha
# ------------------------------------------------------------------------------
echo ""
echo "[TEST NEG 2/4] Simulando falha no probe de capabilities do kernel..."
MOCK_BIN_DIR2="$TEMP_DIR/mock2"
mkdir -p "$MOCK_BIN_DIR2"
cat << 'EOF' > "$MOCK_BIN_DIR2/gcc"
#!/usr/bin/env bash
# Compila normalmente mas substitui o binário gerado por um mock falho no probe
/usr/bin/gcc "$@"
RC=$?
if [ $RC -eq 0 ] && [[ "$*" == *"storage_linux_helper.c"* ]]; then
  while [ $# -gt 0 ]; do
    if [ "$1" = "-o" ]; then
      TARGET_BIN="$2"
      cat << 'MOCK_HELPER' > "$TARGET_BIN"
#!/usr/bin/env bash
if [ "$1" = "probe" ]; then
  echo "PROBE_FAILED: Kernel lacks openat2 support"
  exit 2
fi
exit 0
MOCK_HELPER
      chmod 0755 "$TARGET_BIN"
      break
    fi
    shift
  done
fi
exit $RC
EOF
chmod 0755 "$MOCK_BIN_DIR2/gcc"

set +e
PATH="$MOCK_BIN_DIR2:$PATH" bash "$RUNNER" > "$TEMP_DIR/out_neg2.log" 2>&1
RUNNER_EXIT_2=$?
set -e

if [ "$RUNNER_EXIT_2" -ne 0 ] && grep -q "Probe falhou" "$TEMP_DIR/out_neg2.log"; then
  echo "PASS: Runner abortou imediatamente após falha no probe (Exit Code $RUNNER_EXIT_2)."
  PASSED_CASES=$((PASSED_CASES + 1))
else
  echo "FAIL: Runner não abortou adequadamente no probe (Exit Code $RUNNER_EXIT_2)." >&2
  cat "$TEMP_DIR/out_neg2.log" >&2
  exit 1
fi

# ------------------------------------------------------------------------------
# Cenário 3: GCC falha ao compilar test_storage_linux_native.c
# ------------------------------------------------------------------------------
echo ""
echo "[TEST NEG 3/4] Simulando falha de compilação em test_storage_linux_native..."
MOCK_BIN_DIR3="$TEMP_DIR/mock3"
mkdir -p "$MOCK_BIN_DIR3"
cat << 'EOF' > "$MOCK_BIN_DIR3/gcc"
#!/usr/bin/env bash
if [[ "$*" == *"test_storage_linux_native.c"* ]]; then
  echo "Mock GCC: Simulando erro de compilação em test_storage_linux_native.c" >&2
  exit 1
fi
exec /usr/bin/gcc "$@"
EOF
chmod 0755 "$MOCK_BIN_DIR3/gcc"

set +e
PATH="$MOCK_BIN_DIR3:$PATH" bash "$RUNNER" > "$TEMP_DIR/out_neg3.log" 2>&1
RUNNER_EXIT_3=$?
set -e

if [ "$RUNNER_EXIT_3" -ne 0 ] && grep -q "Falha na compilação de test_storage_linux_native" "$TEMP_DIR/out_neg3.log"; then
  if grep -q "No such file or directory" "$TEMP_DIR/out_neg3.log"; then
    echo "FAIL: Runner tentou executar binário inexistente!" >&2
    exit 1
  fi
  echo "PASS: Runner abortou na compilação dos testes sem tentar executar binário ausente (Exit Code $RUNNER_EXIT_3)."
  PASSED_CASES=$((PASSED_CASES + 1))
else
  echo "FAIL: Runner não tratou erro de compilação dos testes nativos (Exit Code $RUNNER_EXIT_3)." >&2
  cat "$TEMP_DIR/out_neg3.log" >&2
  exit 1
fi

# ------------------------------------------------------------------------------
# Cenário 4: Execução dos testes físicos retorna erro (Exit Code != 0)
# ------------------------------------------------------------------------------
echo ""
echo "[TEST NEG 4/4] Simulando falha de asserção na suíte nativa..."
MOCK_BIN_DIR4="$TEMP_DIR/mock4"
mkdir -p "$MOCK_BIN_DIR4"
cat << 'EOF' > "$MOCK_BIN_DIR4/gcc"
#!/usr/bin/env bash
/usr/bin/gcc "$@"
RC=$?
if [ $RC -eq 0 ] && [[ "$*" == *"test_storage_linux_native.c"* ]]; then
  while [ $# -gt 0 ]; do
    if [ "$1" = "-o" ]; then
      TARGET_BIN="$2"
      cat << 'MOCK_TEST' > "$TARGET_BIN"
#!/usr/bin/env bash
echo "FALHA SIMULADA: Teste 7 falhou asserção esperada." >&2
exit 42
MOCK_TEST
      chmod 0755 "$TARGET_BIN"
      break
    fi
    shift
  done
fi
exit $RC
EOF
chmod 0755 "$MOCK_BIN_DIR4/gcc"

set +e
PATH="$MOCK_BIN_DIR4:$PATH" bash "$RUNNER" > "$TEMP_DIR/out_neg4.log" 2>&1
RUNNER_EXIT_4=$?
set -e

if [ "$RUNNER_EXIT_4" -eq 42 ] && grep -q "Testes nativos Linux falharam com Exit Code 42" "$TEMP_DIR/out_neg4.log"; then
  echo "PASS: Runner propagou fielmente o exit code 42 da suíte de teste."
  PASSED_CASES=$((PASSED_CASES + 1))
else
  echo "FAIL: Runner não propagou o exit code correto dos testes (Esperado 42, obtido $RUNNER_EXIT_4)." >&2
  cat "$TEMP_DIR/out_neg4.log" >&2
  exit 1
fi

echo ""
echo "================================================================================"
echo "TODOS OS TESTES NEGATIVOS DO RUNNER FORAM APROVADOS: $PASSED_CASES/$TOTAL_CASES (100%)"
echo "RUNNER_NEGATIVE_EXIT_CODE=0"
echo "================================================================================"
exit 0
