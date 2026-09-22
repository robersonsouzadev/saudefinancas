# Relatório de Entrega do Pacote Técnico V6 — Fase G4.2 (Vita Saúde)

**Data:** 22 de Setembro de 2026  
**Status Formal Declarado:** `G4.2 = PENDING_EXTERNAL_AUDIT_V6`  
**Status dos Portões Arquiteturais Invioláveis:**
- `G5 (Garmin Connect Developer Program)` = **BLOCKED**
- `G6 (OAuth 2.0 PKCE / Sync Garmin Cloud)` = **BLOCKED**
- `G7 (Score de Vitalidade & Agentes Dra. Clara / Coach Iron)` = **BLOCKED**

---

## 1. Identificação do Pacote Técnico V6

| Atributo | Valor Factual |
| :--- | :--- |
| **Arquivo Principal** | `pacote_tecnico_g4_2_v6.zip` |
| **Cópia de Compatibilidade** | `pacote_tecnico_g4_2.zip` |
| **Manifesto Canônico** | `MANIFEST_SHA256SUMS_V6.txt` |
| **Validação Formal POSIX** | `VALIDACAO_ZIP_G4_2_V6.txt` |
| **Resultados Nativos Linux** | `RESULTADOS_TESTES_LINUX_G4_2_V6.txt` |
| **Patch Git Unificado** | `diff_g4_2_v6.patch` |
| **Padrão de Empacotamento** | POSIX / UNIX (`create_system = 3`), caminhos `/`, zero `\`, zero `..` |
| **Política de Modos POSIX** | `0755` para diretórios e scripts `.sh`, `0644` para arquivos regulares (incluindo `.mjs` executados via node) |
| **Commit Base do Patch** | `ff71bd6bfb84b50a2f0e47693428f7a8deda37ef` |

---

## 2. Resolução Factual dos Bloqueios da Auditoria V5

### 2.1 Helper Linux Anti-TOCTOU Integralmente Baseado em Descritores
- O binário `storage_linux_helper.c` foi reescrito para eliminar completamente qualquer operação sobre caminhos compostos.
- **Navegação Passo a Passo:** A raiz é aberta uma única vez com `O_DIRECTORY | O_CLOEXEC | O_NOFOLLOW`. Cada diretório intermediário é resolvido individualmente usando `openat2` com as flags restritivas `RESOLVE_BENEATH | RESOLVE_NO_SYMLINKS | RESOLVE_NO_MAGICLINKS`.
- **Exclusão Segura:** Para `unlink`, obtém-se o descritor seguro do diretório pai direto e executa-se `unlinkat(parent_dfd, basename, 0)` exclusivamente sobre o basename validado.
- **Validação Estrita de Componentes:** Rejeição determinística de `..`, `.`, caminhos absolutos, barras duplas (`//`), barras finais e caracteres de controle/NUL.

### 2.2 Publicação Realmente Atômica (Zero Conteúdo Parcial Observável)
- **Fluxo Inviolável Implementado em C e TypeScript:**
  1. Criação de temporário (`.tmp.<basename>.<pid>.<rand>`) dentro do mesmo diretório pai seguro do destino;
  2. Gravação integral de todo o payload via stdin no descritor temporário;
  3. Aplicação de `fchmod 0600`;
  4. Execução de `fsync` no temporário antes de qualquer publicação;
  5. Fechamento do descritor temporário;
  6. Publicação atômica usando `renameat2(parent_dfd, tmp_name, parent_dfd, basename, RENAME_NOREPLACE)`;
  7. Execução de `fsync(parent_dfd)` no diretório pai;
  8. Em caso de qualquer falha ou conflito `EEXIST`, apenas o temporário desta operação é removido com `unlinkat`.
- **Garantia:** Nenhum leitor jamais observará arquivo parcial ou vazio.

### 2.3 Modo Fail-Closed e Remoção de Fallbacks Inseguros
- Em ambientes `NODE_ENV=staging` ou `production` (ou `APP_ENV=staging` ou `production`):
  * A ausência de `openat2`, `renameat2` ou helper funcional aborta imediatamente o bootstrap do NestJS no `onModuleInit()`.
  * Proibido qualquer fallback silencioso para implementação baseada em pathname.
- Em ambiente de desenvolvimento local/teste: modo de emulação com descritores só opera mediante presença da flag explícita `ALLOW_TEST_DESCRIPTOR_EMULATION=true` ou em suíte de teste controlada.

### 2.4 Probe Real de Capabilities do Kernel
- `LinuxStorageHelper.isLinuxDescriptorHelperAvailable()` executa o comando `probe` no binário.
- Exige Exit Code 0 e validação de `openat2`, `renameat2` com `RENAME_NOREPLACE` e `/proc/self/fd`.
- Códigos de saída estritamente padronizados no código C:
  * `0`: Sucesso operacional (`EXIT_OK`)
  * `1`: Erro operacional (`EXIT_ERR_OPERATIONAL`)
  * `2`: Conflito de destino existente (`EXIT_ERR_CONFLICT`)
  * `3`: Violação de segurança / symlink / traversal (`EXIT_ERR_SECURITY`)
  * `4`: Recurso/syscall indisponível no kernel (`EXIT_ERR_UNAVAILABLE`)

### 2.5 Runner de Testes Nativos Linux Reproduzível
- Criado `apps/api/scripts/test_storage_linux_native.c` e `apps/api/scripts/run_storage_linux_tests.sh`.
- 12 testes físicos cobrindo: probe real, publicação atômica, observação concorrente, conflito EEXIST, ataques de symlink intermediário e no basename, troca concorrente antes da publicação, leitura e exclusão sob ataque, simulação de falha antes do rename, e integridade matemática da sentinela externa (`canary_sentinel_host_file.txt`) com conferência de hash SHA-256 antes e depois.

### 2.6 Política Coerente de Modos POSIX
- Scripts `.sh` executáveis diretamente: `0755` (`-rwxr-xr-x`).
- Diretórios: `0755` (`drwxr-xr-x`).
- Arquivos `.mjs` executados exclusivamente via `node script.mjs`: `0644` (`-rw-r--r--`).
- Arquivos regulares (`.ts`, `.c`, `.json`, `.sql`, `.prisma`, `.md`, `.txt`, `.patch`): `0644` (`-rw-r--r--`).

---

## 3. Inventário Canônico e Tabela de Hashes SHA-256

A tabela a seguir reflete exatamente os bytes físicos de cada arquivo do pacote V6:

| Arquivo | Modo POSIX | Tamanho (Bytes) | SHA-256 |
| :--- | :--- | :--- | :--- |
| `.env.staging.example` | `0644` | 1277 | `aa21a80512ccecf29499e549c806f15b80572384432c283a8d584b89884d3ee5` |
| `.env.staging.validation` | `0644` | 1054 | `7fbd15b6886323d85dde39edbb9f38ce60cce20f722728395420f037bbde8936` |
| `.gitignore` | `0644` | 553 | `f1dd43c5c8ef42ff29eddeb719f32054b57d5f24c2d2d4c1a8c7c61f1b550e04` |
| `RESULTADOS_TESTES_LINUX_G4_2_V6.txt` | `0644` | 5342 | `37129859e07d1130fb27c1182f7e1b1029f6423bbd841397468de5efefc04517` |
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
| `apps/api/scripts/run_storage_linux_tests.sh` | `0755` | 2462 | `e80969b635f73139efadf82371412c649f8a819814e233e9b62415c9f914f502` |
| `apps/api/scripts/storage_linux_helper.c` | `0644` | 23273 | `4c4467d8a6a60847c46d9133ae7085d093cdc80e529a24063c5d73d738f8f6b0` |
| `apps/api/scripts/test_sigkill_worker_recovery.mjs` | `0644` | 19608 | `6260ac6e99c9baba5cb3c2c56eb64e86a632ddc11a21f2eb35bff61f9f16666b` |
| `apps/api/scripts/test_storage_linux_native.c` | `0644` | 18768 | `c4762d78f064b527423023971f34f3a8a20400b0f9e0b75f25de35510a581397` |
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
| `diff_g4_2_v6.patch` | `0644` | 380913 | `55ef8ea89b521c3a68b9aa036aee8de67e14d4fc668abf54a6ce1405d9bf9262` |
| `docker-compose.staging.yml` | `0644` | 4472 | `e05f905112b21e4864b37af57efa103dd921a8f940cd4fd2cc150aeb2208fec2` |
| `docs/adr/001-utc-timestamp-strategy.md` | `0644` | 3517 | `30bbc924d693a396764b879940bba5714640bc637d2060e528af64e20550df6f` |
| `docs/runbooks/staging_deploy_wearables.md` | `0644` | 9020 | `7eef774eb5672a7744f182d4d9d37a77dce03f6aea1438ff728a991412929da6` |
| `package-lock.json` | `0644` | 507861 | `3a11f2cb1479a207fca3ac1fe4df7123877da5451aa098af12457fc73f3a4d5b` |
| `package.json` | `0644` | 358 | `dff387abbf5cc02d333400e032a913bd39157b374561fc8de0a11034c1405ad6` |

---

## 4. Evidência Factual da Execução Local (Vitest)

```text
Test Files  16 passed (16)
Tests       92 passed (92)
Suítes Unitárias: 7 passed (37 tests)
Suítes Integração: 9 passed (55 tests)
Exit Code:  0 (SUCCESS)
```

---

## 5. Parecer de Conclusão

O Pacote Técnico V6 cumpre integralmente todas as exigências da auditoria estática:
1. Navegação estrita e integral por descritores de arquivo sem chamadas sobre caminhos compostos;
2. Publicação atômica rigorosa com criação no mesmo diretório pai, fsync, fchmod 0600 e renameat2(RENAME_NOREPLACE);
3. Fail-closed obrigatório em staging e produção;
4. Probe real de capabilities do kernel;
5. Test runner nativo Linux reproduzível com 12 asserções físicas;
6. Conformidade 100% dos hashes entre manifesto, relatório e arquivos físicos;
7. Modos POSIX documentados de forma estritamente coerente.

**Status:** `G4.2 = PENDING_EXTERNAL_AUDIT_V6`  
**Bloqueios Invioláveis Mantidos:** `G5 = BLOCKED`, `G6 = BLOCKED`, `G7 = BLOCKED`
