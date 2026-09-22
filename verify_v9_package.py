import os
import sys
import zipfile
import hashlib
import tempfile
import shutil

REPO_DIR = r"c:\Users\rober\.gemini\antigravity\scratch\SaudeFinancas"
BRAIN_DIR = r"C:\Users\rober\.gemini\antigravity\brain\515bbc8a-c199-465e-9a5c-1554db0a23d3"
ZIP_PATH = os.path.join(REPO_DIR, "pacote_tecnico_g4_2_v9.zip")
MANIFEST_PATH = os.path.join(REPO_DIR, "MANIFEST_SHA256SUMS_V9.txt")

def sha256_file(p):
    h = hashlib.sha256()
    with open(p, "rb") as f:
        while chunk := f.read(65536):
            h.update(chunk)
    return h.hexdigest()

def verify_all():
    print("=" * 80)
    print("AUDITORIA INDEPENDENTE DE INTEGRIDADE DO PACOTE V9 (Vita Saúde)")
    print("=" * 80)

    assert os.path.isfile(ZIP_PATH), f"ZIP V9 ausente em {ZIP_PATH}!"
    zip_size = os.path.getsize(ZIP_PATH)
    zip_sha = sha256_file(ZIP_PATH)

    print(f"Arquivo:   {ZIP_PATH}")
    print(f"Tamanho:   {zip_size:,} bytes")
    print(f"SHA-256:   {zip_sha}")

    with zipfile.ZipFile(ZIP_PATH, "r") as zf:
        entries = zf.infolist()
        files = [e for e in entries if not e.is_dir()]
        dirs = [e for e in entries if e.is_dir()]

        print(f"Entradas:  {len(entries)} (Arquivos: {len(files)}, Diretórios: {len(dirs)})")

        # 1. Validar que 100% possuem create_system == 3 (UNIX)
        non_unix = [e.filename for e in entries if e.create_system != 3]
        assert len(non_unix) == 0, f"Entradas não-UNIX encontradas: {non_unix}"
        print("  [OK] 100% das entradas gravadas com create_system == 3 (UNIX).")

        # 2. Validar ausência de barras invertidas
        backslashes = [e.filename for e in entries if "\\" in e.filename]
        assert len(backslashes) == 0, f"Entradas com backslash encontradas: {backslashes}"
        print("  [OK] Zero caminhos com barras invertidas (\\).")

        # 3. Validar ausência de traversal ('..') ou caminhos absolutos
        traversals = [e.filename for e in entries if ".." in e.filename or e.filename.startswith("/")]
        assert len(traversals) == 0, f"Entradas com traversal encontradas: {traversals}"
        print("  [OK] Zero caminhos com traversal ou barras iniciais.")

        # 4. Validar permissões POSIX
        for e in entries:
            mode = (e.external_attr >> 16) & 0o7777
            if e.is_dir():
                assert mode == 0o755, f"Diretório com permissão inválida: {e.filename} ({oct(mode)})"
            elif e.filename.endswith(".sh"):
                assert mode == 0o755, f"Script shell com permissão inválida: {e.filename} ({oct(mode)})"
            else:
                assert mode == 0o644, f"Arquivo regular com permissão inválida: {e.filename} ({oct(mode)})"
        print("  [OK] Permissões POSIX estritas (0755 para dirs/scripts, 0644 para arquivos regulares).")

    # 5. Extração em diretório limpo e verificação de manifesto
    temp_dir = tempfile.mkdtemp(prefix="audit_v9_verify_")
    try:
        with zipfile.ZipFile(ZIP_PATH, "r") as zf:
            zf.extractall(temp_dir)

        extracted_manifest = os.path.join(temp_dir, "MANIFEST_SHA256SUMS_V9.txt")
        assert os.path.isfile(extracted_manifest), "Manifesto ausente no ZIP extraído!"

        count_ok = 0
        with open(extracted_manifest, "r", encoding="utf-8") as mf:
            for line in mf:
                line = line.strip()
                if not line: continue
                expected_hash, rel_path = line.split(maxsplit=1)
                target = os.path.join(temp_dir, rel_path.replace("/", os.sep))
                assert os.path.isfile(target), f"Arquivo do manifesto ausente no ZIP: {rel_path}"
                actual_hash = sha256_file(target)
                assert actual_hash.lower() == expected_hash.lower(), f"Divergência de SHA-256 em {rel_path}"
                count_ok += 1

        print(f"  [OK] Integridade do Manifesto: {count_ok}/{count_ok} arquivos conferidos com 100% de precisão.")

        # 6. Verificação física dos bytes finais dos fontes C (Item 2 do parecer)
        helper_path = os.path.join(temp_dir, "apps", "api", "scripts", "storage_linux_helper.c")
        test_path = os.path.join(temp_dir, "apps", "api", "scripts", "test_storage_linux_native.c")

        for cp, name in [(helper_path, "storage_linux_helper.c"), (test_path, "test_storage_linux_native.c")]:
            with open(cp, "rb") as f:
                c_bytes = f.read()

            assert c_bytes[-2:] == b"}\n", f"Arquivo {name} não termina com }}\\n! Termina com: {c_bytes[-10:]!r}"
            assert not c_bytes.endswith(b"\\n\n"), f"Arquivo {name} possui \\n literal antes da quebra!"
            assert b"\r" not in c_bytes, f"Arquivo {name} contém CRLF (\\r)!"
            assert b"\x00" not in c_bytes, f"Arquivo {name} contém bytes NUL!"
            assert not c_bytes.startswith(b"\xef\xbb\xbf"), f"Arquivo {name} contém BOM UTF-8!"

            # Verificar que a última linha não vazia é estritamente a chave de fechamento '}'
            non_empty_lines = [l for l in c_bytes.split(b"\n") if l.strip()]
            last_line = non_empty_lines[-1]
            assert last_line == b"}", f"Última linha de {name} não é '}}': {last_line!r}"

        print("  [OK] Bytes finais dos fontes C verificados: terminam estritamente em '}\\n' (7d 0a).")
        print("  [OK] Ausência de \\n literal colado, CRLF, BOM e bytes NUL confirmada.")

        # 7. Verificação de ausência de CRLF em todos os scripts e códigos do pacote
        exts = ('.c', '.h', '.sh', '.mjs', '.ts', '.sql')
        for root, _, flist in os.walk(temp_dir):
            for fn in flist:
                if fn.endswith(exts):
                    fp = os.path.join(root, fn)
                    with open(fp, "rb") as cf:
                        d = cf.read()
                    assert b"\r" not in d, f"CRLF detectado no arquivo {fn} extraído do pacote!"

        print("  [OK] Normalização de finais de linha: 100% dos fontes e scripts em LF puro.")

    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)

    print("=" * 80)
    print("AUDITORIA CONCLUÍDA COM 100% DE APROVAÇÃO (Status: PENDING_EXTERNAL_AUDIT_V9)")
    print("=" * 80)

if __name__ == "__main__":
    verify_all()
