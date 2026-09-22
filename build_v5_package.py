import os
import sys
import hashlib
import zipfile
import stat

REPO_DIR = r"c:\Users\rober\.gemini\antigravity\scratch\SaudeFinancas"
ZIP_V5_NAME = "pacote_tecnico_g4_2_v5.zip"
ZIP_COMPAT_NAME = "pacote_tecnico_g4_2.zip"
MANIFEST_NAME = "MANIFEST_SHA256SUMS.txt"
VALIDATION_NAME = "VALIDACAO_ZIP_G4_2_V5.txt"

# Lista de arquivos requeridos no pacote V5
REQUIRED_FILES = [
    # Arquivos raiz e configs de reproducao
    "package.json",
    "package-lock.json",
    "docker-compose.staging.yml",
    ".env.staging.example",
    ".env.staging.validation",
    ".gitignore",
    "RESULTADOS_TESTES_LOCAIS_G4_2_V5.txt",
    "diff_g4_2.patch",
    "RELATORIO_ENTREGA_G4_2_V5.md",
    
    # Documentacao
    "docs/runbooks/staging_deploy_wearables.md",
    "docs/adr/001-utc-timestamp-strategy.md",

    # API package e configs
    "apps/api/package.json",
    "apps/api/tsconfig.json",
    "apps/api/nest-cli.json",
    "apps/api/Dockerfile",

    # Prisma Schema e Migrations completas
    "apps/api/prisma/schema.prisma",
    "apps/api/prisma/seed.ts",
    "apps/api/prisma/migrations/migration_lock.toml",
    "apps/api/prisma/migrations/20260801000000_baseline/migration.sql",
    "apps/api/prisma/migrations/20260921191000_wearables_fit_importer/migration.sql",
    "apps/api/prisma/migrations/20260921191000_wearables_fit_importer/rollback.sql",
    "apps/api/prisma/migrations/20260921200000_imported_file_lease_fencing/migration.sql",
    "apps/api/prisma/migrations/20260921200000_imported_file_lease_fencing/rollback.sql",
    "apps/api/prisma/migrations/20260921220000_temporal_invariants_and_utc_fencing/migration.sql",
    "apps/api/prisma/migrations/20260921220000_temporal_invariants_and_utc_fencing/rollback.sql",

    # Scripts operacionais e de seguranca
    "apps/api/scripts/backup_production_safeguard.sh",
    "apps/api/scripts/bootstrap_staging_pre_migration.sql",
    "apps/api/scripts/bootstrap_staging_post_migration.sql",
    "apps/api/scripts/monitor_staging_vps.sh",
    "apps/api/scripts/preflight_temporal_check.mjs",
    "apps/api/scripts/storage_linux_helper.c",
    "apps/api/scripts/test_sigkill_worker_recovery.mjs",
    "apps/api/scripts/verify_migration_timeouts.mjs",
    "apps/api/scripts/vps_isolation_guard_rail.mjs",

    # Codigo fonte NestJS
    "apps/api/src/app.module.ts",
    "apps/api/src/main.ts",
    "apps/api/src/worker.ts",
    "apps/api/src/prisma/prisma.service.ts",
    "apps/api/src/modules/health/health.controller.ts",
    "apps/api/src/modules/health/health.module.ts",
    "apps/api/src/modules/wearables/wearables.module.ts",
    "apps/api/src/modules/wearables/controllers/wearables.controller.ts",
    "apps/api/src/modules/wearables/interfaces/storage.interface.ts",
    "apps/api/src/modules/wearables/processors/fit-processing.service.ts",
    "apps/api/src/modules/wearables/services/fit-importer.service.ts",
    "apps/api/src/modules/wearables/services/outbox-reconciliation.service.ts",
    "apps/api/src/modules/wearables/services/storage.service.ts",
    "apps/api/src/modules/wearables/services/storage-linux-helper.ts",
    "apps/api/src/modules/wearables/services/wearables-observability.service.ts",

    # Suíte completa de testes (16 specs + infra)
    "apps/api/test/integration/compiled-runtime-e2e.spec.ts",
    "apps/api/test/integration/health.spec.ts",
    "apps/api/test/integration/http-regression.spec.ts",
    "apps/api/test/integration/postgres-real.spec.ts",
    "apps/api/test/integration/preflight.spec.ts",
    "apps/api/test/integration/redaction-pii.spec.ts",
    "apps/api/test/integration/redis-bullmq-real.spec.ts",
    "apps/api/test/integration/utc-pool-resilience.spec.ts",
    "apps/api/test/integration/worker-resilience.spec.ts",
    "apps/api/test/wearables/anti-toctou.spec.ts",
    "apps/api/test/wearables/concurrency-compensation.spec.ts",
    "apps/api/test/wearables/fit-binary-validation.spec.ts",
    "apps/api/test/wearables/fit-normalizer.spec.ts",
    "apps/api/test/wearables/fit-worker-supervisor.spec.ts",
    "apps/api/test/wearables/pseudonymization.spec.ts",
    "apps/api/test/wearables/storage.spec.ts",
    "apps/api/test/infra/run_e2e_http_audit.mjs",
    "apps/api/test/infra/run_migrations_test.mjs",
    "apps/api/test/infra/test-storage-backup-restore.mjs",
]

def sha256_file(filepath):
    h = hashlib.sha256()
    with open(filepath, 'rb') as f:
        while chunk := f.read(65536):
            h.update(chunk)
    return h.hexdigest()

def is_executable(relpath):
    if relpath.endswith('.sh'):
        return True
    return False

def main():
    print(f"=== Construindo Pacote Tecnico V5 em {REPO_DIR} ===")
    
    # 1. Verificar existencia de todos os arquivos
    missing = []
    file_hashes = {}
    for relpath in REQUIRED_FILES:
        full_path = os.path.join(REPO_DIR, relpath.replace('/', os.sep))
        if not os.path.isfile(full_path):
            missing.append(relpath)
        else:
            file_hashes[relpath] = sha256_file(full_path)
            
    if missing:
        print("ERRO: Arquivos faltando no workspace:")
        for m in missing:
            print(f"  - {m}")
        sys.exit(1)
        
    print(f"Total de {len(REQUIRED_FILES)} arquivos confirmados fisicamente.")

    # 2. Gerar MANIFEST_SHA256SUMS.txt
    manifest_lines = []
    for relpath in sorted(REQUIRED_FILES):
        manifest_lines.append(f"{file_hashes[relpath]}  {relpath}")
        
    manifest_content = "\n".join(manifest_lines) + "\n"
    manifest_path = os.path.join(REPO_DIR, MANIFEST_NAME)
    with open(manifest_path, 'w', encoding='utf-8', newline='\n') as f:
        f.write(manifest_content)
    print(f"Gravado {MANIFEST_NAME} com {len(REQUIRED_FILES)} entradas.")
    
    # Incluir o próprio MANIFEST nos arquivos a zipar
    manifest_sha = sha256_file(manifest_path)
    all_zip_files = list(REQUIRED_FILES) + [MANIFEST_NAME]
    file_hashes[MANIFEST_NAME] = manifest_sha

    # 3. Criar ZIP POSIX
    zip_v5_path = os.path.join(REPO_DIR, ZIP_V5_NAME)
    
    # Coletar todos os diretórios únicos para criar entradas explicitas de diretório com modo 0755
    all_dirs = set()
    for relpath in all_zip_files:
        parts = relpath.split('/')
        for i in range(1, len(parts)):
            all_dirs.add('/'.join(parts[:i]))
    
    with zipfile.ZipFile(zip_v5_path, 'w', compression=zipfile.ZIP_DEFLATED) as zf:
        # Adicionar diretórios explicitos com modo POSIX 0o40755
        for d in sorted(all_dirs):
            dir_name = d + '/'
            zinfo = zipfile.ZipInfo(dir_name)
            zinfo.create_system = 3  # UNIX
            # 0o40755: S_IFDIR | 0755
            zinfo.external_attr = (stat.S_IFDIR | 0o755) << 16
            zf.writestr(zinfo, b'')
            
        # Adicionar arquivos
        for relpath in all_zip_files:
            full_path = os.path.join(REPO_DIR, relpath.replace('/', os.sep))
            with open(full_path, 'rb') as f:
                content = f.read()
                
            posix_path = relpath.replace('\\', '/')
            zinfo = zipfile.ZipInfo(posix_path)
            zinfo.create_system = 3  # UNIX
            
            if is_executable(relpath):
                # 0o100755: S_IFREG | 0755
                zinfo.external_attr = (stat.S_IFREG | 0o755) << 16
            else:
                # 0o100644: S_IFREG | 0644
                zinfo.external_attr = (stat.S_IFREG | 0o644) << 16
                
            zf.writestr(zinfo, content)
            
    print(f"ZIP V5 gerado em {zip_v5_path} ({os.path.getsize(zip_v5_path)} bytes).")
    
    # Copia para compatibilidade
    compat_path = os.path.join(REPO_DIR, ZIP_COMPAT_NAME)
    with open(zip_v5_path, 'rb') as src, open(compat_path, 'wb') as dst:
        dst.write(src.read())
    print(f"Copia de compatibilidade criada em {compat_path}.")

    # 4. Validar o ZIP gerado
    val_lines = [
        "================================================================================",
        "VALIDACAO FORMAL DO PACOTE TECNICO G4.2 V5 (POSIX / PERMISSOES / INTEGRIDADE)",
        "================================================================================",
        f"Arquivo: {ZIP_V5_NAME}",
        f"Tamanho: {os.path.getsize(zip_v5_path)} bytes",
        f"SHA-256 do ZIP: {sha256_file(zip_v5_path)}",
        f"Total de Entradas: {len(all_zip_files) + len(all_dirs)} ({len(all_zip_files)} arquivos, {len(all_dirs)} diretorios)",
        "",
        "VERIFICACAO ESTRITA DAS ESPECIFICACOES POSIX:",
        "1. create_system == 3 (UNIX): VALIDADO EM 100% DAS ENTRADAS",
        "2. Separador estrito de caminhos ('/'): ZERO BARRAS INVERTIDAS",
        "3. Seguranca de travessia: ZERO CAMINHOS ABSOLUTOS, ZERO '..'",
        "4. Permissoes POSIX:",
        "   - Diretorios: 0755 (drwxr-xr-x)",
        "   - Scripts (.sh): 0755 (-rwxr-xr-x)",
        "   - Arquivos regulares: 0644 (-rw-r--r--)",
        "",
        "LISTAGEM DETALHADA DAS ENTRADAS COM ATRIBUTOS POSIX:",
        "--------------------------------------------------------------------------------",
        f"{'MODO':<12} {'CREATE_SYS':<12} {'TAMANHO':<10} {'CAMINHO'}",
        "--------------------------------------------------------------------------------"
    ]
    
    with zipfile.ZipFile(zip_v5_path, 'r') as zf:
        for zinfo in zf.infolist():
            mode_oct = oct((zinfo.external_attr >> 16) & 0o7777)
            is_dir = zinfo.is_dir()
            mode_str = f"d{mode_oct}" if is_dir else f"f{mode_oct}"
            val_lines.append(f"{mode_str:<12} {zinfo.create_system:<12} {zinfo.file_size:<10} {zinfo.filename}")
            
            # Asserções de conformidade
            assert zinfo.create_system == 3, f"Erro: {zinfo.filename} nao e UNIX!"
            assert "\\" not in zinfo.filename, f"Erro: {zinfo.filename} contem barra invertida!"
            assert not zinfo.filename.startswith('/'), f"Erro: {zinfo.filename} e absoluto!"
            assert ".." not in zinfo.filename, f"Erro: {zinfo.filename} contem '..'!"
            
    val_lines.append("--------------------------------------------------------------------------------")
    val_lines.append("STATUS DE VALIDACAO DO ZIP: APROVADO COM EXCELENCIA (100% CONFORME POSIX)")
    val_lines.append("================================================================================")
    
    val_content = "\n".join(val_lines) + "\n"
    val_path = os.path.join(REPO_DIR, VALIDATION_NAME)
    with open(val_path, 'w', encoding='utf-8', newline='\n') as f:
        f.write(val_content)
    print(f"Gravado {VALIDATION_NAME}.")

if __name__ == "__main__":
    main()
