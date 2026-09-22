# Relatório Técnico de Prontidão e Homologação — Fase G4.2 (Pacote V9)

**Status Formal Obrigatório:** `G4.2 = PENDING_EXTERNAL_AUDIT_V9`  
**Salvaguarda de Produção:** VPS `72.60.249.235` intocada (zero comandos, zero migrations, zero containers).  
**Portões Arquiteturais:** G5 (Garmin Connect Scraper/OAuth), G6 (Agentes IA/Score) e G7 permanecem **100% BLOQUEADOS**.  
**Data/Hora de Emissão (UTC):** 2026-09-22T15:20:00Z  

---

        
O presente pacote técnico **G4.2 V9** resolve integralmente a corrupção nos bytes finais dos fontes C apontada na auditoria do V8:

1. **Eliminação Integral da Corrupção nos Fontes C:**
   - Os arquivos `storage_linux_helper.c` e `test_storage_linux_native.c` terminam estritamente com `}` seguido por um único byte `0x0a` (LF puro).
   - Removidos quaisquer caracteres literais `\n` e `\r` soltos fora de strings, bytes NUL, BOM e marcadores espúrios.
   - Confirmado via inspeção física de bytes: os últimos 16 bytes terminam rigorosamente em `7d 0a` (`}\n`).

2. **Normalização Global de Finais de Linha para LF:**
   - O `.gitattributes` foi configurado com regras estritas (`*.c`, `*.h`, `*.sh`, `*.mjs`, `*.ts`, `*.sql` com `text eol=lf`).
   - Executado `git add --renormalize .` e normalizados todos os arquivos do projeto para LF puro, com zero ocorrências de CRLF.

3. **Runner com Aborto Estrito e Tratamento de RC Zero sem Binário:**
   - O script `run_storage_linux_tests.sh` foi atualizado com verificação estrita: se o compilador retornar zero mas o binário não for gerado (`! -x $HELPER_BIN`), o script emite erro fatal e aborta com Exit Code 1.
   - A declaração de sucesso é estritamente condicionada a `TEST_RC == 0`.

4. **Suíte Formal de 8 Testes Negativos do Runner (`test_runner_negative.sh`):**
   - 8 cenários independentes em workspaces temporários isolados com fontes mínimos:
     * **Cenário 1:** Compilação do helper falha -> aborta com Exit Code 1 sem tentar probe;
     * **Cenário 2:** Probe do kernel falha -> aborta no passo 2 com Exit Code 2;
     * **Cenário 3:** Compilação da suíte nativa falha -> aborta no passo 3 sem executar binário ausente;
     * **Cenário 4:** Compilador retorna 0 sem produzir binário -> detecta e retorna Exit Code 1;
     * **Cenário 5:** Suíte física falha asserção -> propaga Exit Code 42 fielmente;
     * **Cenário 6:** Ausência de declaração indevida de sucesso em falhas;
     * **Cenário 7:** Preservação estrita de códigos arbitrários (Exit Code 77);
     * **Cenário 8:** Execução integral válida com Exit Code 0.
   - Resultado: **8/8 cenários aprovados (`NEGATIVE_PASSED=8`, `NEGATIVE_FAILED=0`, `NEGATIVE_EXIT_CODE=0`)**.

5. **Validação Concorrente Real com Thread Atacante no Teste 9:**
   - O Teste 9 implementa uma thread atacante dedicada (`pthread_t attacker_th`) que sincroniza via failpoint `VITA_FAILPOINT_PAUSE_BEFORE_UNLINK`, realiza o swap de diretórios (`rename` e `symlink`), registra identificador da thread, failpoint, códigos de retorno e aguarda com `pthread_join`.
   - Comprovada preservação total da sentinela externa (`vs_hash_after == vs_hash_before`).

6. **Inclusão Física dos Scripts de Build e Verificação:**
   - O pacote V9 inclui fisicamente `build_v9_package.py` e `verify_v9_package.py`.

---


| Caminho Relativo | Modo POSIX | Tamanho (bytes) | SHA-256 Canônico |
| :--- | :---: | :---: | :--- |
| `.env.staging.example` | `0644` | 1277 | `aa21a80512ccecf29499e549c806f15b80572384432c283a8d584b89884d3ee5` |
| `.env.staging.validation` | `0644` | 1054 | `7fbd15b6886323d85dde39edbb9f38ce60cce20f722728395420f037bbde8936` |
| `.gitattributes` | `0644` | 108 | `4bb375e4682dede1f041734b41155f8f2e34df55c09aab6aed4e4a66574cd975` |
| `.gitignore` | `0644` | 553 | `f1dd43c5c8ef42ff29eddeb719f32054b57d5f24c2d2d4c1a8c7c61f1b550e04` |
| `EVIDENCIA_COMPILACAO_HELPER_V9.txt` | `0644` | 1515 | `92193923a10464aa3241cadad0683b2bbfb01428c0e2b2ef93945dc3c71bf1f0` |
| `EVIDENCIA_PROBE_CAPABILITIES_V9.txt` | `0644` | 1617 | `c3cc93c2136f29da5aa390fe068b1791e88275f320eef43d65c814942c3651b6` |
| `EVIDENCIA_RUNNER_STORAGE_LINUX_V9.txt` | `0644` | 4088 | `fb506c8d5a46f53d434ff0d92978fef30f8f2e6e4e730c54290aad7d0e1e8cff` |
| `EVIDENCIA_SANITIZERS_V9.txt` | `0644` | 2620 | `1fb044cca70fc29def06cecb1a73c334eb8051582710556d406d6604e555d7f4` |
| `EVIDENCIA_TESTES_NEGATIVOS_RUNNER_V9.txt` | `0644` | 2474 | `c5146a1532632b652edbb59187a72a68c36f3589742b8bcc707185afa1e52344` |
| `RESULTADOS_TESTES_LINUX_G4_2_V9.txt` | `0644` | 7316 | `ee99c254df15cce5a6994f9915b7943cc95bea5d32ec9a8ad0d073bab5e08fb5` |
| `apps/api/Dockerfile` | `0644` | 1850 | `f71e87a816b1bc3295e6d1af1f96b6df55c208d99cb20a00e86b3a6127ae7865` |
| `apps/api/nest-cli.json` | `0644` | 305 | `8463115b5d9f14f7f2b2cd1020200272143efb92234c76a917c6f5e1426a48b5` |
| `apps/api/package.json` | `0644` | 1928 | `24af9c1d688d3780b610cca45640a3256066ede28add072b62e3e4df4fa2e87b` |
| `apps/api/prisma/migrations/20260801000000_baseline/migration.sql` | `0644` | 31980 | `1c3e39f6fdaaa970efec97b48cf35b3c17f3426f23ccad8f75913343ea6bdbd6` |
| `apps/api/prisma/migrations/20260921191000_wearables_fit_importer/migration.sql` | `0644` | 9299 | `e873064b113ac84882c1e6f04a74d80ef303f748e33ff9fc8375dba3bf31d7be` |
| `apps/api/prisma/migrations/20260921191000_wearables_fit_importer/rollback.sql` | `0644` | 1570 | `c91486e2089a926cb41405fc23e17f92daf5ba84ea411d332098f96a359d44b6` |
| `apps/api/prisma/migrations/20260921200000_imported_file_lease_fencing/migration.sql` | `0644` | 1105 | `a47b6921a4965f4e6f2009ccc9173d4b312e5efdddc065cee90dff685f89e2f9` |
| `apps/api/prisma/migrations/20260921200000_imported_file_lease_fencing/rollback.sql` | `0644` | 894 | `bb9127852e29b915e6970e3fd2952c8f110896ac72217e3a0d64016db47d75fb` |
| `apps/api/prisma/migrations/20260921220000_temporal_invariants_and_utc_fencing/migration.sql` | `0644` | 1493 | `6b0cc69b4666055b958c3f0bfcf75e6a6e18dd515aaefa5c610d3cedfee7af2a` |
| `apps/api/prisma/migrations/20260921220000_temporal_invariants_and_utc_fencing/rollback.sql` | `0644` | 1054 | `2601c755d51cec12604781ece68a04c52d8363ae480ff6d4c87d5049365b316a` |
| `apps/api/prisma/migrations/migration_lock.toml` | `0644` | 64 | `162ff5818ed32b5113b4fb76482715281a9f8809c6ebd1b72dd604de469f1746` |
| `apps/api/prisma/schema.prisma` | `0644` | 33515 | `fe4be1d042063f88851a44fd65b548ee0f5a9073b2aa0c75096f52c2aabc3efb` |
| `apps/api/prisma/seed.ts` | `0644` | 13464 | `6007be0fd114096abea40caa0105c1e29a161df92439867d9ec4900548aeebdf` |
| `apps/api/scripts/backup_production_safeguard.sh` | `0755` | 2834 | `b381d5d9adb792c8c32ad7676a18aeddc2497fe5aaf9ab0c5b60d18b8e8ac12b` |
| `apps/api/scripts/bootstrap_staging_post_migration.sql` | `0644` | 2796 | `85cba7bf6a3cdf84ef85015f0f84a5e7dfbd6bba93c562925062556220fc715c` |
| `apps/api/scripts/bootstrap_staging_pre_migration.sql` | `0644` | 2813 | `60d9c03c045b7cad8dff012b894c3093c7ec90791a8727f5542948d0b7442072` |
| `apps/api/scripts/monitor_staging_vps.sh` | `0755` | 12342 | `7fe78b0e8f41111a3c1a980c99f1d00271e269b4b4c530f5dd58a201175086dc` |
| `apps/api/scripts/preflight_temporal_check.mjs` | `0644` | 12556 | `2086bdc9ec0901dd7def3875fa57aa1541445651a24e4994bb5aeec4411bd30f` |
| `apps/api/scripts/run_storage_linux_tests.sh` | `0755` | 3799 | `8a2a54ab004e71aab3044b98b55e67e3760df9288fc27aa2b7df4afc3677f0ac` |
| `apps/api/scripts/storage_linux_helper.c` | `0644` | 26268 | `4e574c9c6b0b513329875f5ba666c46ea2cfa29ce40ee7b203cf16f9f432449b` |
| `apps/api/scripts/test_runner_negative.sh` | `0755` | 11199 | `faf54b1380b8412cb3594ab58350fd9a5ea952ac636510bd24a2a11501a21675` |
| `apps/api/scripts/test_sigkill_worker_recovery.mjs` | `0644` | 19608 | `6260ac6e99c9baba5cb3c2c56eb64e86a632ddc11a21f2eb35bff61f9f16666b` |
| `apps/api/scripts/test_storage_linux_native.c` | `0644` | 37126 | `44f9e62a645cf22adcb88616a48bf5ff4eb71b8954056bf861a7912a2d7752ae` |
| `apps/api/scripts/verify_migration_timeouts.mjs` | `0644` | 14096 | `30c511f77d8a0c5395c4c45d34b3b6d986ffc978435d48b8e207d9aadad97595` |
| `apps/api/scripts/vps_isolation_guard_rail.mjs` | `0644` | 23612 | `76a3294ae7ec6edec6fa9f482719b0e7b48cb15f467efde37fe40c83ea5ed9fe` |
| `apps/api/src/app.module.ts` | `0644` | 2468 | `d0a3671695bfa612caf67b018211bc2c2883228b72f9d9805fba2c0112797325` |
| `apps/api/src/main.ts` | `0644` | 670 | `471ebc2af242f5490c8e4a53851d81bd126e00f0afe9cefddd4360695672b535` |
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
| `build_v9_package.py` | `0644` | 20774 | `913e2f385ffc76fe6b08ddd95115cd3f491604715d6bb90b49e2857282017941` |
| `diff_g4_2_v9.patch` | `0644` | 418181 | `974abdf3b7bfe01913964988ee190d6054fe93917525956a36b94f399aada4c2` |
| `docker-compose.staging.yml` | `0644` | 4472 | `e05f905112b21e4864b37af57efa103dd921a8f940cd4fd2cc150aeb2208fec2` |
| `docs/adr/001-utc-timestamp-strategy.md` | `0644` | 3517 | `30bbc924d693a396764b879940bba5714640bc637d2060e528af64e20550df6f` |
| `docs/runbooks/staging_deploy_wearables.md` | `0644` | 9020 | `7eef774eb5672a7744f182d4d9d37a77dce03f6aea1438ff728a991412929da6` |
| `package-lock.json` | `0644` | 507861 | `3a11f2cb1479a207fca3ac1fe4df7123877da5451aa098af12457fc73f3a4d5b` |
| `package.json` | `0644` | 358 | `dff387abbf5cc02d333400e032a913bd39157b374561fc8de0a11034c1405ad6` |
| `verify_v9_package.py` | `0644` | 6218 | `d38c93a275a8869285d522d67ea7ad8a19ebf95d6e215509d191f7c0c37bc0c9` |

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
| 9 | Ataque com troca concorrente de pai | `openat2`, `unlinkat` | Sentinela preservada, sem escape | Sentinela intacta com mesmo SHA | **PASSED** |
| 10 | Exclusão legítima de arquivo regular | `fstatat`, `unlinkat`, `fsync` | Exit Code 0, arquivo removido | Exit Code 0, arquivo excluído | **PASSED** |
| 11 | Rejeição estrita de `..`, `/` e `//` | `validate_component`, `openat2` | Todos retornam Exit Code 3 | Todos retornaram Exit Code 3 | **PASSED** |
| 12 | Crash físico: SIGKILL durante escrita | `kill(SIGKILL)`, `waitpid`, `unlinkat` | Destino ausente, órfão isolado | Destino inexistente, órfão limpo | **PASSED** |
| 13 | Crash físico: SIGKILL antes do rename | Failpoint de teste, `kill(SIGKILL)` | Destino ausente, órfão isolado | Destino inexistente, órfão limpo | **PASSED** |
| 14 | Concorrência real: 4 leitores vs escritor | `pthread_create`, `openat2`, `renameat2` | Zero leituras parciais em 5 iterações | 5 iterações 100% íntegras | **PASSED** |
| 15 | Auditoria final do hash da sentinela | SHA-256 físico de `canary_path` | Hash inalterado antes e depois | Hash idêntico (94a3f54f...) | **PASSED** |

---

## 4. Instruções de Reprodução em Staging

Para reproduzir integralmente em qualquer host Linux (Kernel >= 5.6 com gcc e pthread):

```bash
# 1. Extrair pacote V9
unzip pacote_tecnico_g4_2_v9.zip -d /tmp/repro_v9 && cd /tmp/repro_v9

# 2. Validar manifesto
sha256sum -c MANIFEST_SHA256SUMS_V9.txt

# 3. Executar runner oficial
bash apps/api/scripts/run_storage_linux_tests.sh
```

**Critério de Aceite Factual:**  
- Compilação do helper com `-Werror` com Exit Code 0;  
- Probe com Exit Code 0;  
- Compilação dos testes com `-Werror` e `-pthread` com Exit Code 0;  
- Todos os 15 testes físicos aprovados (`15/15 PASSARAM`);  
- Exit code final 0.
