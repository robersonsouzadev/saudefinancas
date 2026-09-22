#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# SUÍTE DE TESTES NEGATIVOS DO RUNNER LINUX (G4.2 V12)
# ==============================================================================
# Valida formalmente os 8 cenários obrigatórios de robustez do runner:
# 1. Compilação do helper falha
# 2. Helper compila, mas probe falha
# 3. Helper e probe passam, mas compilação da suíte falha
# 4. Compilação passa, mas binário não é produzido (RC=0 sem binário)
# 5. Suíte retorna código não zero
# 6. Runner não imprime "100% SUCESSO" em qualquer cenário de falha
# 7. Exit Code original preservado estritamente
# 8. Execução integral válida retorna zero
# ==============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET_RUNNER="$SCRIPT_DIR/run_storage_linux_tests.sh"

NEGATIVE_TOTAL=8
NEGATIVE_PASSED=0
NEGATIVE_FAILED=0

echo "================================================================================"
echo "INICIANDO SUÍTE FORMAL DE TESTES NEGATIVOS DO RUNNER (G4.2 V12)"
echo "Target Runner: $TARGET_RUNNER"
echo "Timestamp (UTC): $(date -u +'%Y-%m-%dT%H:%M:%SZ')"
echo "================================================================================"

# Helper auxiliar para criar fontes C mínimos válidos em um workspace
setup_min_sources() {
  local ws="$1"
  cat << 'EOF' > "$ws/storage_linux_helper.c"
#include <stdio.h>
#include <string.h>
int main(int argc, char **argv) {
    if (argc > 1 && strcmp(argv[1], "probe") == 0) {
        printf("{\"status\":\"ok\",\"openat2\":true,\"renameat2_noreplace\":true,\"proc_self_fd\":true}\n");
        return 0;
    }
    return 0;
}
EOF

  cat << 'EOF' > "$ws/test_storage_linux_native.c"
#include <stdio.h>
int main(int argc, char **argv) {
    (void)argc; (void)argv;
    printf("Dummy tests passed.\n");
    return 0;
}
EOF
}

# ------------------------------------------------------------------------------
# Cenário 1: Compilação do helper falha
# ------------------------------------------------------------------------------
echo ""
echo "[TEST NEG 1/8] Validando: Compilação do helper falha..."
WS1=$(mktemp -d /tmp/neg_ws1_XXXXXX)
cp "$TARGET_RUNNER" "$WS1/run_storage_linux_tests.sh"
setup_min_sources "$WS1"
echo "int syntax error in helper" > "$WS1/storage_linux_helper.c"

set +e
bash "$WS1/run_storage_linux_tests.sh" > "$WS1/out.log" 2>&1
RC1=$?
set -e

if [ "$RC1" -ne 0 ] && grep -q "Falha na compilação de storage_linux_helper" "$WS1/out.log" && ! grep -q "Executando probe" "$WS1/out.log"; then
  echo "PASS (Cenário 1): Runner abortou no passo [1/4] sem executar probe (RC=$RC1)."
  NEGATIVE_PASSED=$((NEGATIVE_PASSED + 1))
else
  echo "FAIL (Cenário 1): Falha na validação de aborto na compilação do helper (RC=$RC1)." >&2
  cat "$WS1/out.log" >&2
  NEGATIVE_FAILED=$((NEGATIVE_FAILED + 1))
fi
rm -rf "$WS1"

# ------------------------------------------------------------------------------
# Cenário 2: Helper compila, mas probe falha
# ------------------------------------------------------------------------------
echo ""
echo "[TEST NEG 2/8] Validando: Helper compila, mas probe falha..."
WS2=$(mktemp -d /tmp/neg_ws2_XXXXXX)
cp "$TARGET_RUNNER" "$WS2/run_storage_linux_tests.sh"
setup_min_sources "$WS2"
cat << 'EOF' > "$WS2/storage_linux_helper.c"
#include <stdio.h>
#include <string.h>
int main(int argc, char **argv) {
    if (argc > 1 && strcmp(argv[1], "probe") == 0) {
        fprintf(stderr, "Kernel probe failure: openat2 unavailable\n");
        return 2;
    }
    return 0;
}
EOF

set +e
bash "$WS2/run_storage_linux_tests.sh" > "$WS2/out.log" 2>&1
RC2=$?
set -e

if [ "$RC2" -eq 2 ] && grep -q "Probe falhou com Exit Code 2" "$WS2/out.log" && ! grep -q "Compilando test_storage_linux_native" "$WS2/out.log"; then
  echo "PASS (Cenário 2): Runner abortou no passo [2/4] com Exit Code 2 sem compilar suíte."
  NEGATIVE_PASSED=$((NEGATIVE_PASSED + 1))
else
  echo "FAIL (Cenário 2): Probe não falhou conforme esperado (RC=$RC2)." >&2
  cat "$WS2/out.log" >&2
  NEGATIVE_FAILED=$((NEGATIVE_FAILED + 1))
fi
rm -rf "$WS2"

# ------------------------------------------------------------------------------
# Cenário 3: Helper e probe passam, mas compilação da suíte falha
# ------------------------------------------------------------------------------
echo ""
echo "[TEST NEG 3/8] Validando: Helper e probe passam, mas compilação da suíte falha..."
WS3=$(mktemp -d /tmp/neg_ws3_XXXXXX)
cp "$TARGET_RUNNER" "$WS3/run_storage_linux_tests.sh"
setup_min_sources "$WS3"
echo "syntax error in native tests" > "$WS3/test_storage_linux_native.c"

set +e
bash "$WS3/run_storage_linux_tests.sh" > "$WS3/out.log" 2>&1
RC3=$?
set -e

if [ "$RC3" -ne 0 ] && grep -q "Falha na compilação de test_storage_linux_native" "$WS3/out.log" && ! grep -q "No such file or directory" "$WS3/out.log"; then
  echo "PASS (Cenário 3): Runner abortou no passo [3/4] sem invocar binário inexistente (RC=$RC3)."
  NEGATIVE_PASSED=$((NEGATIVE_PASSED + 1))
else
  echo "FAIL (Cenário 3): Não abortou adequadamente na compilação da suíte (RC=$RC3)." >&2
  cat "$WS3/out.log" >&2
  NEGATIVE_FAILED=$((NEGATIVE_FAILED + 1))
fi
rm -rf "$WS3"

# ------------------------------------------------------------------------------
# Cenário 4: Compilação passa, mas binário não é produzido (RC=0 sem binário)
# ------------------------------------------------------------------------------
echo ""
echo "[TEST NEG 4/8] Validando: Compilação retorna zero, mas binário não é produzido..."
WS4=$(mktemp -d /tmp/neg_ws4_XXXXXX)
cp "$TARGET_RUNNER" "$WS4/run_storage_linux_tests.sh"
setup_min_sources "$WS4"
MOCK_BIN4="$WS4/mock_bin"
mkdir -p "$MOCK_BIN4"
cat << 'EOF' > "$MOCK_BIN4/gcc"
#!/usr/bin/env bash
# Simula compilador retornando 0 sem produzir o binário do helper
exit 0
EOF
chmod 0755 "$MOCK_BIN4/gcc"

set +e
PATH="$MOCK_BIN4:$PATH" bash "$WS4/run_storage_linux_tests.sh" > "$WS4/out.log" 2>&1
RC4=$?
set -e

if [ "$RC4" -ne 0 ] && grep -q "Compilador retornou zero, mas o binário" "$WS4/out.log"; then
  echo "PASS (Cenário 4): Runner detectou ausência de binário e retornou Exit Code não zero ($RC4)."
  NEGATIVE_PASSED=$((NEGATIVE_PASSED + 1))
else
  echo "FAIL (Cenário 4): Runner permitiu RC zero sem binário produzido (RC=$RC4)." >&2
  cat "$WS4/out.log" >&2
  NEGATIVE_FAILED=$((NEGATIVE_FAILED + 1))
fi
rm -rf "$WS4"

# ------------------------------------------------------------------------------
# Cenário 5: Suíte retorna código não zero
# ------------------------------------------------------------------------------
echo ""
echo "[TEST NEG 5/8] Validando: Suíte física de testes retorna código não zero..."
WS5=$(mktemp -d /tmp/neg_ws5_XXXXXX)
cp "$TARGET_RUNNER" "$WS5/run_storage_linux_tests.sh"
setup_min_sources "$WS5"
cat << 'EOF' > "$WS5/test_storage_linux_native.c"
#include <stdio.h>
int main(int argc, char **argv) {
    (void)argc; (void)argv;
    fprintf(stderr, "Simulated assertion failure in native test\n");
    return 42;
}
EOF

set +e
bash "$WS5/run_storage_linux_tests.sh" > "$WS5/out.log" 2>&1
RC5=$?
set -e

if [ "$RC5" -eq 42 ] && grep -q "Testes nativos Linux falharam com Exit Code 42" "$WS5/out.log"; then
  echo "PASS (Cenário 5): Runner propagou fielmente o Exit Code 42 dos testes."
  NEGATIVE_PASSED=$((NEGATIVE_PASSED + 1))
else
  echo "FAIL (Cenário 5): Runner não propagou o Exit Code 42 (RC=$RC5)." >&2
  cat "$WS5/out.log" >&2
  NEGATIVE_FAILED=$((NEGATIVE_FAILED + 1))
fi
rm -rf "$WS5"

# ------------------------------------------------------------------------------
# Cenário 6: Runner não pode imprimir "100% SUCESSO" em qualquer cenário de falha
# ------------------------------------------------------------------------------
echo ""
echo "[TEST NEG 6/8] Validando: Ausência de mensagem '100% SUCESSO' em falhas..."
WS6=$(mktemp -d /tmp/neg_ws6_XXXXXX)
cp "$TARGET_RUNNER" "$WS6/run_storage_linux_tests.sh"
setup_min_sources "$WS6"
echo "syntax error" > "$WS6/storage_linux_helper.c"

set +e
bash "$WS6/run_storage_linux_tests.sh" > "$WS6/out.log" 2>&1
RC6=$?
set -e

if ! grep -q "100% SUCESSO" "$WS6/out.log" && ! grep -q "FORAM EXECUTADOS E APROVADOS" "$WS6/out.log"; then
  echo "PASS (Cenário 6): Runner não emitiu qualquer declaração indevida de sucesso em falha."
  NEGATIVE_PASSED=$((NEGATIVE_PASSED + 1))
else
  echo "FAIL (Cenário 6): Runner emitiu declaração indevida de sucesso em cenário de falha!" >&2
  cat "$WS6/out.log" >&2
  NEGATIVE_FAILED=$((NEGATIVE_FAILED + 1))
fi
rm -rf "$WS6"

# ------------------------------------------------------------------------------
# Cenário 7: Exit Code original deve ser preservado estritamente
# ------------------------------------------------------------------------------
echo ""
echo "[TEST NEG 7/8] Validando: Preservação estrita de Exit Codes específicos..."
WS7=$(mktemp -d /tmp/neg_ws7_XXXXXX)
cp "$TARGET_RUNNER" "$WS7/run_storage_linux_tests.sh"
setup_min_sources "$WS7"
cat << 'EOF' > "$WS7/test_storage_linux_native.c"
int main(void) { return 77; }
EOF

set +e
bash "$WS7/run_storage_linux_tests.sh" > "$WS7/out.log" 2>&1
RC7=$?
set -e

if [ "$RC7" -eq 77 ]; then
  echo "PASS (Cenário 7): Exit Code arbitrário 77 foi fielmente preservado pelo runner."
  NEGATIVE_PASSED=$((NEGATIVE_PASSED + 1))
else
  echo "FAIL (Cenário 7): Exit Code 77 foi alterado para $RC7!" >&2
  NEGATIVE_FAILED=$((NEGATIVE_FAILED + 1))
fi
rm -rf "$WS7"

# ------------------------------------------------------------------------------
# Cenário 8: Execução integral válida retorna zero
# ------------------------------------------------------------------------------
echo ""
echo "[TEST NEG 8/8] Validando: Execução integral válida retorna Exit Code 0..."
WS8=$(mktemp -d /tmp/neg_ws8_XXXXXX)
cp "$TARGET_RUNNER" "$WS8/run_storage_linux_tests.sh"
setup_min_sources "$WS8"

set +e
bash "$WS8/run_storage_linux_tests.sh" > "$WS8/out.log" 2>&1
RC8=$?
set -e

if [ "$RC8" -eq 0 ] && grep -q "100% SUCESSO" "$WS8/out.log"; then
  echo "PASS (Cenário 8): Execução integral válida aprovada com Exit Code 0."
  NEGATIVE_PASSED=$((NEGATIVE_PASSED + 1))
else
  echo "FAIL (Cenário 8): Execução integral válida falhou (RC=$RC8)." >&2
  cat "$WS8/out.log" >&2
  NEGATIVE_FAILED=$((NEGATIVE_FAILED + 1))
fi
rm -rf "$WS8"

# ------------------------------------------------------------------------------
# Resumo Final dos Testes Negativos
# ------------------------------------------------------------------------------
echo ""
echo "================================================================================"
echo "RESUMO DOS TESTES NEGATIVOS DO RUNNER (G4.2 V12):"
echo "NEGATIVE_PASSED=$NEGATIVE_PASSED"
echo "NEGATIVE_FAILED=$NEGATIVE_FAILED"
echo "NEGATIVE_TOTAL=$NEGATIVE_TOTAL"
if [ "$NEGATIVE_FAILED" -eq 0 ]; then
  echo "NEGATIVE_EXIT_CODE=0"
  echo "================================================================================"
  exit 0
else
  echo "NEGATIVE_EXIT_CODE=1"
  echo "================================================================================"
  exit 1
fi
