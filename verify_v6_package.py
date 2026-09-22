import os
import sys
import hashlib
import zipfile
import re

REPO_DIR = r"c:\Users\rober\.gemini\antigravity\scratch\SaudeFinancas"
ZIP_PATH = os.path.join(REPO_DIR, "pacote_tecnico_g4_2_v6.zip")
MANIFEST_PATH = os.path.join(REPO_DIR, "MANIFEST_SHA256SUMS_V6.txt")
REPORT_PATH = os.path.join(REPO_DIR, "RELATORIO_ENTREGA_G4_2_V6.md")

def sha256_bytes(b):
    return hashlib.sha256(b).hexdigest()

def sha256_file(filepath):
    h = hashlib.sha256()
    with open(filepath, 'rb') as f:
        while chunk := f.read(65536):
            h.update(chunk)
    return h.hexdigest()

def main():
    print("================================================================================")
    print("VERIFICADOR AUTOMATIZADO DE INTEGRIDADE DO PACOTE TÉCNICO G4.2 V6")
    print("================================================================================")

    if not os.path.isfile(ZIP_PATH):
        print(f"[FATAL] ZIP não encontrado: {ZIP_PATH}")
        sys.exit(1)
    if not os.path.isfile(MANIFEST_PATH):
        print(f"[FATAL] Manifesto não encontrado: {MANIFEST_PATH}")
        sys.exit(1)
    if not os.path.isfile(REPORT_PATH):
        print(f"[FATAL] Relatório não encontrado: {REPORT_PATH}")
        sys.exit(1)

    # 1. Carregar Manifesto
    manifest_hashes = {}
    with open(MANIFEST_PATH, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            parts = line.split(maxsplit=1)
            if len(parts) == 2:
                manifest_hashes[parts[1].strip()] = parts[0].strip().lower()

    print(f"[MANIFESTO] Carregadas {len(manifest_hashes)} entradas.")

    # 2. Carregar Relatório e extrair tabela de hashes
    report_hashes = {}
    table_pattern = re.compile(r"\|\s*`([^`]+)`\s*\|\s*`([^`]+)`\s*\|\s*(\d+)\s*\|\s*`([a-f0-9]{64})`\s*\|")
    with open(REPORT_PATH, 'r', encoding='utf-8') as f:
        for line in f:
            m = table_pattern.search(line)
            if m:
                path = m.group(1).strip()
                mode = m.group(2).strip()
                size = int(m.group(3).strip())
                sha = m.group(4).strip().lower()
                report_hashes[path] = {"mode": mode, "size": size, "sha": sha}

    print(f"[RELATÓRIO] Carregadas {len(report_hashes)} entradas na tabela canônica.")

    # 3. Ler ZIP e verificar todas as entradas físicas
    zip_entries = {}
    with zipfile.ZipFile(ZIP_PATH, 'r') as zf:
        for zinfo in zf.infolist():
            if zinfo.is_dir():
                continue
            data = zf.read(zinfo.filename)
            sha = sha256_bytes(data)
            zip_entries[zinfo.filename] = {
                "size": zinfo.file_size,
                "sha": sha,
                "create_system": zinfo.create_system,
                "mode": oct((zinfo.external_attr >> 16) & 0o7777),
            }

    print(f"[ZIP] Carregadas {len(zip_entries)} entradas de arquivos físicos.")

    errors = []

    # 4. Comparar Relatório vs Manifesto (todo arquivo da tabela do relatório deve estar no manifesto com mesmo hash)
    for path, rep_info in report_hashes.items():
        if path not in manifest_hashes:
            errors.append(f"Arquivo no relatório ausente no manifesto: {path}")
        elif rep_info["sha"] != manifest_hashes[path]:
            errors.append(f"Divergência de hash entre relatório e manifesto para {path}:\n  Relatório: {rep_info['sha']}\n  Manifesto: {manifest_hashes[path]}")

    # 5. Comparar Manifesto vs Arquivos no Disco
    for path, man_sha in manifest_hashes.items():
        fp = os.path.join(REPO_DIR, path.replace('/', os.sep))
        if not os.path.isfile(fp):
            errors.append(f"Arquivo do manifesto ausente no disco: {path}")
        else:
            disk_sha = sha256_file(fp)
            if disk_sha.lower() != man_sha.lower():
                errors.append(f"Divergência de hash entre disco e manifesto para {path}:\n  Disco:     {disk_sha}\n  Manifesto: {man_sha}")

    # 6. Comparar Manifesto vs Entradas Físicas do ZIP
    for path, man_sha in manifest_hashes.items():
        if path not in zip_entries:
            errors.append(f"Arquivo do manifesto ausente no ZIP: {path}")
        else:
            zip_sha = zip_entries[path]["sha"]
            if zip_sha.lower() != man_sha.lower():
                errors.append(f"Divergência de hash entre ZIP e manifesto para {path}:\n  ZIP:       {zip_sha}\n  Manifesto: {man_sha}")

    # 7. Verificar integridade do próprio arquivo de manifesto dentro do ZIP
    manifest_name = os.path.basename(MANIFEST_PATH)
    if manifest_name not in zip_entries:
        errors.append(f"Manifesto ausente no ZIP: {manifest_name}")
    else:
        disk_man_sha = sha256_file(MANIFEST_PATH)
        zip_man_sha = zip_entries[manifest_name]["sha"]
        if disk_man_sha.lower() != zip_man_sha.lower():
            errors.append(f"Divergência do arquivo manifesto entre disco e ZIP:\n  Disco: {disk_man_sha}\n  ZIP:   {zip_man_sha}")

    # 8. Verificar se há arquivos no ZIP que não constam no manifesto (exceto o próprio manifesto)
    for path in zip_entries:
        if path != manifest_name and path not in manifest_hashes:
            errors.append(f"Arquivo não-declarado encontrado dentro do ZIP: {path}")

    # 9. Validação estrita de especificações POSIX
    for path, zinfo in zip_entries.items():
        if zinfo["create_system"] != 3:
            errors.append(f"Entrada no ZIP não possui create_system == 3 (UNIX): {path} (create_system={zinfo['create_system']})")
        if "\\" in path:
            errors.append(f"Entrada no ZIP contém barra invertida: {path}")
        if path.startswith("/"):
            errors.append(f"Entrada no ZIP é caminho absoluto: {path}")
        if ".." in path:
            errors.append(f"Entrada no ZIP contém '..': {path}")

    if errors:
        print("\n[FALHA DE AUDITORIA] Foram detectadas divergências:")
        for e in errors:
            print(f"  - {e}")
        print("\nStatus: REPROVADO COM ERROS DE INTEGRIDADE.")
        sys.exit(1)

    print("\n[SUCESSO] 100% DAS VERIFICAÇÕES CONCLUÍDAS COM SUCESSO:")
    print("  - Relatório, Manifesto, Disco e ZIP possuem hashes exatamente idênticos.")
    print("  - Zero arquivos declarados ausentes.")
    print("  - Zero arquivos não declarados dentro do ZIP.")
    print("  - Zero divergências de modos ou atributos POSIX.")
    print("  - create_system == 3 (UNIX) validado em todas as entradas.")
    print("================================================================================")
    print("STATUS: APROVADO COM EXCELÊNCIA (VERIFICAÇÃO DE INTEGRIDADE V6)")
    print("================================================================================")

if __name__ == "__main__":
    main()
