# Relatório de Entrega Técnica — Fase G4.2 (Versão V11)
**Data/Hora (UTC):** 2026-09-22T18:33:51Z  
**Status Obrigatório:** `G4.2 = PENDING_EXTERNAL_AUDIT_V11`  
**Bloqueios:** `G5 = BLOCKED`, `G6 = BLOCKED`, `G7 = BLOCKED`  
**Produção:** 100% Intocada (Zero conexões à VPS 72.60.249.235)  

---

## 1. Resumo Executivo das Correções V11
1. **Resiliência a SIGPIPE e write determinístico:**
   - Adicionada manipulação explícita de `SIGPIPE` (`signal(SIGPIPE, SIG_IGN)` e `sigaction`) em `test_storage_linux_native.c` e `storage_linux_helper.c`.
   - Tratamento gracioso de `errno == EPIPE` em todas as rotinas de escrita em pipes.
   - Retorno fiel do código real do helper (`WEXITSTATUS`), eliminando o código 141 (`128 + 13`).
   - Adicionado teste de regressão nativo executado via Python `subprocess.run(..., stdout=PIPE, stderr=PIPE)`.
2. **Verificador com Pipeline Físico Real:**
   - `verify_v11_package.py` portátil, autocontido, operando a partir de qualquer CWD e com caminhos com espaços.
   - Execução integral de compilação GCC `-Wall -Wextra -Werror`, probe, 15 testes nativos, 8 testes negativos do runner e sanitizers.
3. **Classificação Honesta de Sanitizadores:**
   - ASan: PASS | UBSan: PASS | TSan: PASS.
   - LSan: Classificado tecnicamente como UNAVAILABLE devido a bloqueio de `ptrace()` em contêiner Docker unprivileged (Exit Code 134), com transcrição factual do runtime.
4. **Sentinela e Hashes Íntegros:**
   - Hash SHA-256 factual da sentinela: `c5ea76d815b5f9dd52cb5bf55801de4a6e2a04113d805cd0e22395e9fc324d07`.
   - Hashes antigos completamente expurgados de todas as evidências.
5. **Suíte de Testes Negativos do Verificador:**
   - 16 cenários negativos independentes aprovados (`VERIFIER_NEGATIVE_PASSED=16`, `VERIFIER_NEGATIVE_EXIT_CODE=0`).
