# Relatório Técnico de Prontidão e Homologação — Fase G4.2 (Pacote V8)

**Status Formal Obrigatório:** `G4.2 = PENDING_EXTERNAL_AUDIT_V8`  
**Salvaguarda de Produção:** VPS `72.60.249.235` intocada (zero conexões, zero comandos, zero migrations, zero containers).  
**Portões Arquiteturais:** G5 (Garmin Connect Scraper/OAuth), G6 (Agentes IA/Score) e G7 permanecem **100% BLOQUEADOS**.  
**Data/Hora de Emissão (UTC):** 2026-09-22T17:00:00Z  

---

## 1. Sumário Executivo e Resolução Factual da Auditoria V7

O presente pacote técnico **G4.2 V8** resolve integralmente a falha de compilação apontada no V7 e adiciona salvaguardas adicionais no runner de testes:

1. **Eliminação do Erro de Compilação `-Werror=format-truncation`:**
   - Na suíte nativa (`test_storage_linux_native.c`), a concatenação de caminhos foi refatorada através da função determinística `safe_path_join()`, baseada em cálculo matemático prévio de limites (`p_len + 1 + s_len + 1 <= dest_size`) e cópia segura por `memcpy` com buffers de 2048 bytes.
   - Essa arquitetura elimina 100% qualquer risco de truncamento estático analisado pelo compilador GCC e compila com **zero warnings** sob `-O2 -Wall -Wextra -Werror` sem desabilitar flags de auditoria.

2. **Runner com Aborto Imediato e Falha Estrita (`set -euo pipefail`):**
   - O runner `run_storage_linux_tests.sh` foi atualizado para capturar estritamente os códigos de retorno em cada etapa (`BUILD_HELPER_RC`, `PROBE_RC`, `BUILD_TESTS_RC`, `TEST_RC`).
   - Se a compilação falhar, o script aborta no exato instante com a mensagem correspondente e o código de saída do compilador, sem jamais tentar executar binários ausentes (eliminando ocorrências de `127` descontrolado).
   - Remove previamente os binários antigos antes de compilar para assegurar que falhas nunca executem versões obsoletas.

3. **Suíte Formal de Testes Negativos do Runner (`test_runner_negative.sh`):**
   - Criado script de verificação formal dos 4 cenários negativos do runner com wrappers de simulação:
     * **Cenário 1:** Falha de compilação no helper -> runner aborta imediatamente com Exit Code 1;
     * **Cenário 2:** Falha no probe de capabilities -> runner aborta imediatamente com Exit Code 2;
     * **Cenário 3:** Falha de compilação no teste nativo -> runner aborta sem invocar binário inexistente;
     * **Cenário 4:** Falha na asserção da suíte física -> runner propaga fielmente o código de erro (Exit Code 42).
   - Resultado: 4/4 cenários validados com 100% de sucesso (`RUNNER_NEGATIVE_EXIT_CODE=0`).

4. **Sincronização Concorrente Precisa com Failpoint no Teste 9:**
   - No helper C (`storage_linux_helper.c`), foi adicionado o failpoint `VITA_FAILPOINT_PAUSE_BEFORE_UNLINK` para permitir pausar a execução imediatamente antes da chamada de `unlinkat`, garantindo que o thread adversário realize o swap do diretório pai durante a janela exata de TOCTOU.
   - O teste físico comprova que, mesmo com a substituição do diretório pai por symlink para a sentinela externa, o `unlinkat` baseado no descritor pai seguro recusa-se a atingir o arquivo externo.

5. **Compatibilidade Rigorosa com Sanitizers (ASan, UBSan e TSan):**
   - O teste de concorrência 14 utiliza tipos atômicos formais `<stdatomic.h>` (`atomic_int`, `atomic_load`, `atomic_store`, `atomic_fetch_add`) e mutex POSIX.
   - A suíte completa foi validada contra AddressSanitizer, UndefinedBehaviorSanitizer e ThreadSanitizer com zero falhas, zero vazamentos e zero data races.

---

## 2. Tabela Canônica de Arquivos, Modos POSIX e Hashes SHA-256

| Caminho Relativo | Modo POSIX | Tamanho (bytes) | SHA-256 Canônico |
| :--- | :---: | :---: | :--- |
| `.env.staging.example` | `0644` | 1277 | `aa21a80512ccecf29499e549c806f15b80572384432c283a8d584b89884d3ee5` |
| `.env.staging.validation` | `0644` | 1054 | `7fbd15b6886323d85dde39edbb9f38ce60cce20f722728395420f037bbde8936` |
| `.gitattributes` | `0644` | 71 | `f295420737ac777e14260dd07ec0d7d4a593f7d3d66b8dd1fc5d44362d07e003` |
| `.gitignore` | `0644` | 553 | `f1dd43c5c8ef42ff29eddeb719f32054b57d5f24c2d2d4c1a8c7c61f1b550e04` |
| `EVIDENCIA_COMPILACAO_HELPER_V8.txt` | `0644` | 1484 | `30ee5f8199f05419c0268333c04ec5ded13830d66ccbe06511be6bceaf5b74f9` |
| `EVIDENCIA_PROBE_CAPABILITIES_V8.txt` | `0644` | 1586 | `2c70a1de8706675432d554ee5f16587a11509e32616f66d31bc7b9542d189e79` |
| `EVIDENCIA_RUNNER_STORAGE_LINUX_V8.txt` | `0644` | 4114 | `2351f4fbba3fbe1e2a40d98b44b43e73b696b327a51dad7a78152855d72b5695` |
| `EVIDENCIA_SANITIZERS_V8.txt` | `0644` | 2561 | `5c7601e004dc6718250b62aa886ca3613baa897e8abd1bd7e43cd3b7bd14d93b` |
| `EVIDENCIA_TESTES_NEGATIVOS_RUNNER_V8.txt` | `0644` | 1724 | `de3a358f34d9744728ad35c07bb8e13e4b3e813c859bd8a762cfee1c955467bf` |
| `RESULTADOS_TESTES_LINUX_G4_2_V8.txt` | `0644` | 7260 | `e74b6a8ad51972ea3ef816d9520d2f21c087c32e73756a760017b49e445fc96c` |
| `apps/api/Dockerfile` | `0644` | 1850 | `f71e87a816b1bc3295e6d1af1f96b6df55c208d99cb20a00e86b3a6127ae7865` |
| `apps/api/nest-cli.json` | `0644` | 305 | `8463115b5d9f14f7f2b2cd1020200272143efb92234c76a917c6f5e1426a48b5` |
| `apps/api/package.json` | `0644` | 1990 | `0aa75755b07be906f6cb2eb3a02a348b8f68126b5a2ac1278f1f8349b18db6fc` |
| `apps/api/prisma/migrations/20260801000000_baseline/migration.sql` | `0644` | 32673 | `1f1b83912d7f10018d14357a7a76ff1fc35b5379f121168a560f425cf34e6f94` |
| `apps/api/prisma/migrations/20260921191000_wearables_fit_importer/migration.sql` | `0644` | 9299 | `e873064b113ac84882c1e6f04a74d80ef303f748e33ff9fc8375dba3bf31d7be` |
| `apps/api/prisma/migrations/20260921191000_wearables_fit_importer/rollback.sql` | `0644` | 1570 | `c91486e2089a926cb41405fc23e17f92daf5ba84ea411d332098f96a359d44b6` |
| `apps/api/prisma/migrations/20260921200000_imported_file_lease_fencing/migration.sql` | `0644` | 1105 | `a47b6921a4965f4e6f2009ccc9173d4b312e5efdddc065cee90dff685f89e2f9` |
| `apps/api/prisma/migrations/20260921200000_imported_file_lease_fencing/rollback.sql` | `0644` | 894 | `bb9127852e29b915e6970e3fd2952c8f110896ac72217e3a0d64016db47d75fb` |
| `apps/api/prisma/migrations/20260921220000_temporal_invariants_and_utc_fencing/migration.sql` | `0644` | 1493 | `6b0cc69b4666055b958c3f0bfcf75e6a6e18dd515aaefa5c610d3cedfee7af2a` |
| `apps/api/prisma/migrations/20260921220000_temporal_invariants_and_utc_fencing/rollback.sql` | `0644` | 1054 | `2601c755d51cec12604781ece68a04c52d8363ae480ff6d4c87d5049365b316a` |
| `apps/api/prisma/migrations/migration_lock.toml` | `0644` | 64 | `162ff5818ed32b5113b4fb76482715281a9f8809c6ebd1b72dd604de469f1746` |
| `apps/api/prisma/schema.prisma` | `0644` | 33515 | `fe4be1d042063f88851a44fd65b548ee0f5a9073b2aa0c75096f52c2aabc3efb` |
| `apps/api/prisma/seed.ts` | `0644` | 13755 | `e70a2fe7f81a3e68122bf8f13eb409316021f936af200ee3e3f823e265cc4492` |
| `apps/api/scripts/backup_production_safeguard.sh` | `0755` | 2834 | `b381d5d9adb792c8c32ad7676a18aeddc2497fe5aaf9ab0c5b60d18b8e8ac12b` |
| `apps/api/scripts/bootstrap_staging_post_migration.sql` | `0644` | 2796 | `85cba7bf6a3cdf84ef85015f0f84a5e7dfbd6bba93c562925062556220fc715c` |
| `apps/api/scripts/bootstrap_staging_pre_migration.sql` | `0644` | 2813 | `60d9c03c045b7cad8dff012b894c3093c7ec90791a8727f5542948d0b7442072` |
| `apps/api/scripts/monitor_staging_vps.sh` | `0755` | 12342 | `7fe78b0e8f41111a3c1a980c99f1d00271e269b4b4c530f5dd58a201175086dc` |
| `apps/api/scripts/preflight_temporal_check.mjs` | `0644` | 12556 | `2086bdc9ec0901dd7def3875fa57aa1541445651a24e4994bb5aeec4411bd30f` |
| `apps/api/scripts/run_storage_linux_tests.sh` | `0755` | 3446 | `3f2f9bcf49337cfbc3ddd45255f42c46a5b67fc234d24d886343e879e29eb35e` |
| `apps/api/scripts/storage_linux_helper.c` | `0644` | 26991 | `0ea790a2605b2e13cc11d749d33d6055417db205f780d09a927de05a109981d4` |
| `apps/api/scripts/test_runner_negative.sh` | `0755` | 6807 | `62e1e7feb62780ade869ccbd13f99862b2ae5cee9f1336377997e8829bf7f881` |
| `apps/api/scripts/test_sigkill_worker_recovery.mjs` | `0644` | 19608 | `6260ac6e99c9baba5cb3c2c56eb64e86a632ddc11a21f2eb35bff61f9f16666b` |
| `apps/api/scripts/test_storage_linux_native.c` | `0644` | 36563 | `62ab777bbde52e221a9f482eb6c9ba9864e52d3dfa634cd99ad6190ccca322d7` |
| `apps/api/scripts/verify_migration_timeouts.mjs` | `0644` | 14096 | `30c511f77d8a0c5395c4c45d34b3b6d986ffc978435d48b8e207d9aadad97595` |
| `apps/api/scripts/vps_isolation_guard_rail.mjs` | `0644` | 23612 | `76a3294ae7ec6edec6fa9f482719b0e7b48cb15f467efde37fe40c83ea5ed9fe` |
| `apps/api/src/app.module.ts` | `0644` | 2532 | `775581475888413379a35227f4d15c5654aff6920581fbaa1fc6cde991e7b133` |
| `apps/api/src/main.ts` | `0644` | 694 | `801e8c34c5ccb49c8214090ab67a8abf4d1f94bb1f0bc35d4e6985984e841bce` |
| `apps/api/src/modules/health/health.controller.ts` | `0644` | 3710 | `05e89ec7a817bf3a924c70f4876de8dc119e42b025fe2959b9d70bd3111a675c` |
| `apps/api/src/modules/health/health.module.ts` | `0644` | 820 | `2bf4e61ae96ae6296b438462bc97920a40e50d11a0f845bac6ea81a7ea68300b` |
| `apps/api/src/modules/wearables/controllers/wearables.controller.ts` | `0644` | 12137 | `fadecb10b9be0746bb7eec2f622c65b1ef0d47ab3d36673764e27c16ada3a170` |
| `apps/api/src/modules/wearables/interfaces/storage.interface.ts` | `0644` | 421 | `adf52973bd0c4a15deb9176e695fb32ec6f89a348640327d4cd2e91ac71c13e6` |
| `apps/api/src/modules/wearables/processors/fit-processing.service.ts` | `0644` | 14650 | `04034057b4bcea336272bd58eda03e89b6b98ca64ed27b5170fb3f6397932749` |
| `apps/api/src/modules/wearables/services/fit-importer.service.ts` | `0644` | 4671 | `1faea330a3f82be1354230d1245a29e1e3211cc337fc050dbdab97fd59ae0679` |
| `apps/api/src/modules/wearables/services/outbox-reconciliation.service.ts` | `0644` | 6018 | `e469efa041be5d44c0c19d654dca39663be397a4e153b915b4e7069ae4180875` |
| `apps/api/src/modules/wearables/services/storage-linux-helper.ts` | `0644` | 8849 | `c49046a7c75a15936434c008512a367406bfafdd7766f0dab8359e78877da076` |
| `apps/api/src/modules/wearables/services/storage.service.ts` | `0644` | 18572 | `3fe96529da2d37085c78ce6d1177a17e7187dd357318bcfacbb16c13e74a3433` |
| `apps/api/src/modules/wearables/services/wearables-observability.service.ts` | `0644` | 4825 | `ec2f9e5a2adf735c8e2b8155d81606cdada67759ccca379edc904a3be5ead77f` |
| `apps/api/src/modules/wearables/wearables.module.ts` | `0644` | 2257 | `9df7c696769c23fab36e6abb3f2bd0c99bb296cca1491836d88a73c96e824a29` |
| `apps/api/src/prisma/prisma.service.ts` | `0644` | 1101 | `58e7042d1c9fc2d680203752e958f392e7a6ffbf8976c0c09facc54ee46e5d9d` |
| `apps/api/src/worker.ts` | `0644` | 1887 | `023799eb4e4a0c054dcd080730587f745b58fc0690f4fe66f3c88429122bc799` |
| `apps/api/test/infra/run_e2e_http_audit.mjs` | `0644` | 27243 | `1362135cc49ee7d6fe3634e77ad4c43a82cbbd46cb1dfc6a2e0923f605e77464` |
| `apps/api/test/infra/run_migrations_test.mjs` | `0644` | 9911 | `2cfa35c3151bbf22ea5912958aef0c28bc98115da42de97c174efef1de77bfe8` |
| `apps/api/test/infra/test-storage-backup-restore.mjs` | `0644` | 5482 | `50c529eb797342dabdcfeacaebed5de709f936194c93e654b85f182910dd2435` |
| `apps/api/test/integration/compiled-runtime-e2e.spec.ts` | `0644` | 8995 | `ed126bd0386653a5f0ce746392270197bb933c627f64b8bcc2d9d0e483ea6f96` |
| `apps/api/test/integration/health.spec.ts` | `0644` | 6214 | `709072465ea39430ed3c5372434b883c911a2fe66a6e226de8344ae15b60459e` |
| `apps/api/test/integration/http-regression.spec.ts` | `0644` | 5991 | `6a18d2e8da7a1bed97f480fcdac3ee35f9dd84b02c1b6b03814e62dbb1c1d149` |
| `apps/api/test/integration/postgres-real.spec.ts` | `0644` | 17286 | `b760a1933ff94a8808008c36105f85278716923d0d3ecc797c4a1afc08ff8d5b` |
| `apps/api/test/integration/preflight.spec.ts` | `0644` | 3730 | `c8db8f9af5bed85598c63a8b4e6410b4d9892c0540f9e799595b87675faa7eaa` |
| `apps/api/test/integration/redaction-pii.spec.ts` | `0644` | 4985 | `f39b50f6017e72c04f121299a4796d85c13ea778ac4612fc4ebf4bc4e60e95c9` |
| `apps/api/test/integration/redis-bullmq-real.spec.ts` | `0644` | 7319 | `2adf2d9895242afc3709136395d8c581032d1fe25c77ae9ae75f05439aed0c76` |
| `apps/api/test/integration/utc-pool-resilience.spec.ts` | `0644` | 7947 | `158b5e292e208ba4be0ae85a067d6901777c90925a345d12f07d8b0d251dfb5c` |
| `apps/api/test/integration/worker-resilience.spec.ts` | `0644` | 12830 | `40340208b95268fbf7c59a3325cad1236373d2ba308e3037c6eb70ab0249dc98` |
| `apps/api/test/wearables/anti-toctou.spec.ts` | `0644` | 17819 | `e9c40362b599d7529c6670fd5e74cbad527a4ca57bd97eceeeab9f318a733a02` |
| `apps/api/test/wearables/concurrency-compensation.spec.ts` | `0644` | 8570 | `11006d49042f63a6e903959cf469a8b8a3bdf94e1b7eb5b2fa4251ed16ef5516` |
| `apps/api/test/wearables/fit-binary-validation.spec.ts` | `0644` | 4178 | `95f44841830400d2ca7c91a0b9946708c6a1b4ab9171ccb928dc7ed4b33fc57c` |
| `apps/api/test/wearables/fit-normalizer.spec.ts` | `0644` | 5171 | `4348eb674bb430e489374f3f791537cc9968e42a3704ba75ed74ddfa05d07876` |
| `apps/api/test/wearables/fit-worker-supervisor.spec.ts` | `0644` | 1788 | `0d591d6fcd81569e1870d2a1f018dc679a5718019255ef32e26f998760f9ab3b` |
| `apps/api/test/wearables/pseudonymization.spec.ts` | `0644` | 1641 | `d9b6aabd1bd919b02dc141c1ebf1a99ead25196f82eda79fda85f905bf621837` |
| `apps/api/test/wearables/storage.spec.ts` | `0644` | 5236 | `f8bf2fea38583886823fe2ee272e4e08e30dfca9c62e7ccc3e1fef1a8192e08a` |
| `apps/api/tsconfig.json` | `0644` | 546 | `0fd360def9226104787fbf41c69e966ccedf9abe04b462e786c660cc503835fb` |
| `diff_g4_2_v8.patch` | `0644` | 411833 | `ac9e7b4d51733ee73d583af8c300202f4f4f36634899b149a968aa57e91e3efa` |
| `docker-compose.staging.yml` | `0644` | 4472 | `e05f905112b21e4864b37af57efa103dd921a8f940cd4fd2cc150aeb2208fec2` |
| `docs/adr/001-utc-timestamp-strategy.md` | `0644` | 3517 | `30bbc924d693a396764b879940bba5714640bc637d2060e528af64e20550df6f` |
| `docs/runbooks/staging_deploy_wearables.md` | `0644` | 9020 | `7eef774eb5672a7744f182d4d9d37a77dce03f6aea1438ff728a991412929da6` |
| `package-lock.json` | `0644` | 507861 | `3a11f2cb1479a207fca3ac1fe4df7123877da5451aa098af12457fc73f3a4d5b` |
| `package.json` | `0644` | 358 | `dff387abbf5cc02d333400e032a913bd39157b374561fc8de0a11034c1405ad6` |

---

## 3. Matriz de Resultados dos 15 Testes Físicos Nativos Linux

A execução física da suíte em ambiente Linux (Kernel >= 5.6 com gcc) resultou em **15/15 testes aprovados (100% SUCESSO)**:

| # | Cenário de Teste | Syscalls Auditadas | Resultado Esperado | Resultado Físico | Status |
| :---: | :--- | :--- | :--- | :--- | :---: |
| 1 | Probe de capabilities de kernel | `openat2`, `renameat2`, `/proc/self/fd` | Exit Code 0, capabilities ativas | Exit Code 0, status ok | **PASSED** |
| 2 | Publicação atômica em subdiretório | `openat2`, `fchmod 0600`, `fsync`, `renameat2` | Exit Code 0, Mode 0600, Size 58 | Exit Code 0, Mode 0600, Size 58 | **PASSED** |
| 3 | Conflito `EEXIST` (sobrescrita negada) | `renameat2(RENAME_NOREPLACE)` | Exit Code 2, conteúdo intacto | Exit Code 2, payload preservado | **PASSED** |
| 4 | Ataque symlink intermediário fora da raiz | `openat2(RESOLVE_NO_SYMLINKS)`, `fstatat` | Exit Code 3, zero arquivos fora da raiz | Exit Code 3, sentinela intacta | **PASSED** |
| 5 | Ataque symlink no basename de destino | `renameat2(RENAME_NOREPLACE)`, `openat2` | Exit Code 2 ou 3, sentinela intacta | Exit Code 3, sentinela intacta | **PASSED** |
| 6 | Leitura segura rejeitando symlink direto | `openat2(RESOLVE_NO_SYMLINKS)`, `S_ISREG` | Exit Code 3 (violação de segurança) | Exit Code 3, leitura recusada | **PASSED** |
| 7 | Leitura legítima de arquivo regular | `openat2`, `read`, `fstat` | Exit Code 0, payload idêntico | Exit Code 0, dados idênticos | **PASSED** |
| 8 | Exclusão segura rejeitando symlink | `fstatat(AT_SYMLINK_NOFOLLOW)`, `unlinkat` | Exit Code 3, alvo preservado | Exit Code 3, sentinela intacta | **PASSED** |
| 9 | Ataque com troca concorrente de pai (failpoint) | `openat2`, failpoint, `unlinkat` | Sentinela preservada, sem escape | Sentinela intacta com mesmo SHA | **PASSED** |
| 10 | Exclusão legítima de arquivo regular | `fstatat`, `unlinkat`, `fsync` | Exit Code 0, arquivo removido | Exit Code 0, arquivo excluído | **PASSED** |
| 11 | Rejeição estrita de `..`, `/` e `//` | `validate_component`, `openat2` | Todos retornam Exit Code 3 | Todos retornaram Exit Code 3 | **PASSED** |
| 12 | Crash físico: SIGKILL durante escrita | `kill(SIGKILL)`, `waitpid`, `unlinkat` | Destino ausente, órfão isolado | Destino inexistente, órfão limpo | **PASSED** |
| 13 | Crash físico: SIGKILL antes do rename | Failpoint de teste, `kill(SIGKILL)` | Destino ausente, órfão isolado | Destino inexistente, órfão limpo | **PASSED** |
| 14 | Concorrência real atômica: 4 leitores vs escritor | `stdatomic`, `pthread_create`, `openat2` | Zero leituras parciais em 5 iterações | 5 iterações 100% íntegras (TSan clean) | **PASSED** |
| 15 | Auditoria final do hash da sentinela | SHA-256 físico de `canary_path` | Hash inalterado antes e depois | Hash idêntico (94a3f54f...) | **PASSED** |

---

## 4. Matriz dos Testes Negativos do Runner

| # | Cenário Negativo Avaliado | Simulação Aplicada | Comportamento Esperado | Comportamento Físico | Status |
| :---: | :--- | :--- | :--- | :--- | :---: |
| 1 | Erro de compilação em `storage_linux_helper.c` | Wrapper GCC retornando Exit Code 1 | Aborto imediato com mensagem de erro | Abortou no passo [1/4] (Exit Code 1) | **PASSED** |
| 2 | Falha no probe de capabilities de kernel | Wrapper retornando Exit Code 2 | Aborto imediato com mensagem de erro | Abortou no passo [2/4] (Exit Code 2) | **PASSED** |
| 3 | Erro de compilação em `test_storage_linux_native.c` | Wrapper GCC retornando Exit Code 1 | Aborto sem invocar binário ausente | Abortou no passo [3/4] (Exit Code 1) | **PASSED** |
| 4 | Falha na execução da suíte de testes | Wrapper binário retornando Exit Code 42 | Propagação estrita do Exit Code | Retornou Exit Code 42 sem engolir erro | **PASSED** |

---

## 5. Instruções de Reprodução em Staging

Para reproduzir integralmente em qualquer host Linux (Kernel >= 5.6 com gcc e pthread):

```bash
# 1. Extrair pacote V8
unzip pacote_tecnico_g4_2_v8.zip -d /tmp/repro_v8 && cd /tmp/repro_v8

# 2. Validar integridade do manifesto
sha256sum -c MANIFEST_SHA256SUMS_V8.txt

# 3. Executar runner oficial de testes nativos
bash apps/api/scripts/run_storage_linux_tests.sh

# 4. Executar suíte de testes negativos do runner
bash apps/api/scripts/test_runner_negative.sh
```

**Critério de Aceite Factual:**  
- Compilação do helper com `-Werror` com Exit Code 0;  
- Probe com Exit Code 0;  
- Compilação dos testes com `-Werror` e `-pthread` com Exit Code 0;  
- Todos os 15 testes físicos aprovados (`15/15 PASSARAM`);  
- Todos os 4 testes negativos do runner aprovados (`4/4 PASSARAM`);  
- Exit code final 0.
