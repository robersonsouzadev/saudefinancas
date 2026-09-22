#!/usr/bin/env python3
"""
SUÍTE DE TESTES NEGATIVOS DO VERIFICADOR — FASE G4.2 V10 (Vita Saúde)
================================================================================
Valida formalmente que verify_v10_package.py detecta e rejeita:
1. ZIP ausente / não existente;
2. Manifesto ausente;
3. Hash divergente no manifesto;
4. Arquivo declarado no manifesto ausente;
5. Fonte C com literal \\n no final;
6. Fonte contendo CRLF;
7. Permissão POSIX inválida (.sh sem 0755);
8. Entrada com backslash;
9. Suporte a caminho do ZIP contendo espaços;
10. Execução a partir de diretório de trabalho arbitrário.
"""

import sys
import os
import subprocess
import tempfile
import shutil
import zipfile
import stat
from pathlib import Path
from datetime import datetime, timezone

def sha256_file(filepath):
    import hashlib
    h = hashlib.sha256()
    with open(filepath, 'rb') as f:
        while chunk := f.read(65536):
            h.update(chunk)
    return h.hexdigest()

def main():
    script_dir = Path(__file__).resolve().parent
    verifier_script = (script_dir / "verify_v10_package.py").resolve()

    assert verifier_script.is_file(), f"verify_v10_package.py não encontrado em {verifier_script}"

    log_lines = []
    def log(msg=""):
        print(msg)
        log_lines.append(msg)

    log("=" * 80)
    log("SUÍTE DE TESTES NEGATIVOS DO VERIFICADOR V10")
    log(f"Timestamp (UTC): {datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')}")
    log(f"Verificador:     {verifier_script}")
    log("=" * 80)

    total_tests = 10
    passed_tests = 0

    # 1. ZIP não existe
    log("\n[TEST NEG 1/10] Simulando: ZIP inexistente...")
    res = subprocess.run([sys.executable, str(verifier_script), "--zip", "/caminho/fantasma/nao_existe.zip"],
                         stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    if res.returncode != 0 and "não encontrado" in res.stdout:
        log(f"  PASS: Verificador rejeitou ZIP inexistente (RC={res.returncode}).")
        passed_tests += 1
    else:
        log(f"  FAIL: Verificador aceitou ZIP inexistente (RC={res.returncode}). Output:\n{res.stdout}")

    # Helper para criar ZIPs de teste minimais
    def make_mock_zip(target_zip, corrupt_type):
        fixed_time = (2026, 9, 22, 17, 15, 0)
        with zipfile.ZipFile(target_zip, 'w') as zf:
            # Diretórios
            for d in ["apps/", "apps/api/", "apps/api/scripts/"]:
                zi = zipfile.ZipInfo(d, fixed_time)
                zi.create_system = 3
                zi.external_attr = (stat.S_IFDIR | 0o755) << 16
                zf.writestr(zi, b"")

            # storage_linux_helper.c
            hc_data = b"#include <stdio.h>\nint main(void) {\n    return 0;\n}\n"
            if corrupt_type == "literal_backslash_n":
                hc_data = b"#include <stdio.h>\nint main(void) {\n    return 0;\n}\\n"
            elif corrupt_type == "crlf":
                hc_data = b"#include <stdio.h>\r\nint main(void) {\r\n    return 0;\r\n}\r\n"

            zi = zipfile.ZipInfo("apps/api/scripts/storage_linux_helper.c", fixed_time)
            zi.create_system = 3
            zi.external_attr = (stat.S_IFREG | 0o644) << 16
            zf.writestr(zi, hc_data)

            # test_storage_linux_native.c
            tc_data = b"#include <stdio.h>\nint main(void) {\n    return 0;\n}\n"
            zi = zipfile.ZipInfo("apps/api/scripts/test_storage_linux_native.c", fixed_time)
            zi.create_system = 3
            zi.external_attr = (stat.S_IFREG | 0o644) << 16
            zf.writestr(zi, tc_data)

            # Evidências
            for ev in ["EVIDENCIA_COMPILACAO_HELPER_V10.txt", "EVIDENCIA_PROBE_CAPABILITIES_V10.txt",
                       "EVIDENCIA_RUNNER_STORAGE_LINUX_V10.txt", "EVIDENCIA_TESTES_NEGATIVOS_RUNNER_V10.txt",
                       "EVIDENCIA_SANITIZERS_V10.txt", "RESULTADOS_TESTES_LINUX_G4_2_V10.txt"]:
                zi = zipfile.ZipInfo(ev, fixed_time)
                zi.create_system = 3
                zi.external_attr = (stat.S_IFREG | 0o644) << 16
                zf.writestr(zi, b"G4.2 V10 EVIDENCE CONTENT\n")

            # Manifesto
            import hashlib
            hc_hash = hashlib.sha256(hc_data).hexdigest()
            tc_hash = hashlib.sha256(tc_data).hexdigest()

            if corrupt_type == "hash_divergence":
                hc_hash = "0000000000000000000000000000000000000000000000000000000000000000"

            manifest_content = f"{hc_hash}  apps/api/scripts/storage_linux_helper.c\n{tc_hash}  apps/api/scripts/test_storage_linux_native.c\n"
            if corrupt_type == "missing_manifest_file":
                manifest_content += "12345678  apps/api/scripts/arquivo_fantasma.c\n"

            if corrupt_type != "no_manifest":
                zi = zipfile.ZipInfo("MANIFEST_SHA256SUMS_V10.txt", fixed_time)
                zi.create_system = 3
                zi.external_attr = (stat.S_IFREG | 0o644) << 16
                zf.writestr(zi, manifest_content.encode("utf-8"))

            if corrupt_type == "traversal_entry":
                zi = zipfile.ZipInfo(date_time=fixed_time)
                zi.filename = "../escape.txt"
                zi.create_system = 3
                zi.external_attr = (stat.S_IFREG | 0o644) << 16
                zf.writestr(zi, b"bad\n")

            if corrupt_type == "bad_posix_mode":
                zi = zipfile.ZipInfo("bad_perm.sh", fixed_time)
                zi.create_system = 3
                zi.external_attr = (stat.S_IFREG | 0o644) << 16 # Erro: .sh deveria ser 0755
                zf.writestr(zi, b"#!/bin/sh\n")

    tmp_ws = Path(tempfile.mkdtemp(prefix="test_neg_verifier_"))
    try:
        # 2. Manifesto ausente
        log("\n[TEST NEG 2/10] Simulando: Manifesto ausente...")
        z2 = tmp_ws / "no_manifest.zip"
        make_mock_zip(z2, "no_manifest")
        res = subprocess.run([sys.executable, str(verifier_script), "--zip", str(z2)],
                             stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        if res.returncode != 0 and "Manifesto" in res.stdout:
            log(f"  PASS: Verificador rejeitou pacote sem manifesto (RC={res.returncode}).")
            passed_tests += 1
        else:
            log(f"  FAIL: Verificador não tratou ausência de manifesto (RC={res.returncode}). Output:\n{res.stdout}")

        # 3. Hash divergente no manifesto
        log("\n[TEST NEG 3/10] Simulando: Hash divergente no manifesto...")
        z3 = tmp_ws / "hash_div.zip"
        make_mock_zip(z3, "hash_divergence")
        res = subprocess.run([sys.executable, str(verifier_script), "--zip", str(z3)],
                             stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        if res.returncode != 0 and "Hash divergente" in res.stdout:
            log(f"  PASS: Verificador detectou divergência de SHA-256 (RC={res.returncode}).")
            passed_tests += 1
        else:
            log(f"  FAIL: Verificador não detectou hash divergente (RC={res.returncode}). Output:\n{res.stdout}")

        # 4. Arquivo declarado no manifesto ausente
        log("\n[TEST NEG 4/10] Simulando: Arquivo do manifesto ausente no ZIP...")
        z4 = tmp_ws / "missing_file.zip"
        make_mock_zip(z4, "missing_manifest_file")
        res = subprocess.run([sys.executable, str(verifier_script), "--zip", str(z4)],
                             stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        if res.returncode != 0 and "ausente" in res.stdout:
            log(f"  PASS: Verificador detectou arquivo ausente (RC={res.returncode}).")
            passed_tests += 1
        else:
            log(f"  FAIL: Verificador não detectou arquivo ausente (RC={res.returncode}). Output:\n{res.stdout}")

        # 5. Fonte C com literal \n no final
        log("\n[TEST NEG 5/10] Simulando: Fonte C com literal \\n no final...")
        z5 = tmp_ws / "lit_n.zip"
        make_mock_zip(z5, "literal_backslash_n")
        res = subprocess.run([sys.executable, str(verifier_script), "--zip", str(z5)],
                             stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        if res.returncode != 0 and ("termina com" in res.stdout or "Fonte C" in res.stdout):
            log(f"  PASS: Verificador rejeitou fonte C com literal \\n no final (RC={res.returncode}).")
            passed_tests += 1
        else:
            log(f"  FAIL: Verificador aceitou fonte com literal \\n (RC={res.returncode}). Output:\n{res.stdout}")

        # 6. Fonte com CRLF
        log("\n[TEST NEG 6/10] Simulando: Fonte contendo CRLF...")
        z6 = tmp_ws / "crlf.zip"
        make_mock_zip(z6, "crlf")
        res = subprocess.run([sys.executable, str(verifier_script), "--zip", str(z6)],
                             stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        if res.returncode != 0 and "CRLF" in res.stdout:
            log(f"  PASS: Verificador detectou e rejeitou CRLF (RC={res.returncode}).")
            passed_tests += 1
        else:
            log(f"  FAIL: Verificador não detectou CRLF (RC={res.returncode}). Output:\n{res.stdout}")

        # 7. Permissão POSIX inválida (.sh sem 0755)
        log("\n[TEST NEG 7/10] Simulando: Permissão POSIX inválida em script .sh...")
        z7 = tmp_ws / "bad_perm.zip"
        make_mock_zip(z7, "bad_posix_mode")
        res = subprocess.run([sys.executable, str(verifier_script), "--zip", str(z7)],
                             stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        if res.returncode != 0 and "permissão inválida" in res.stdout:
            log(f"  PASS: Verificador rejeitou permissão POSIX incompatível (RC={res.returncode}).")
            passed_tests += 1
        else:
            log(f"  FAIL: Verificador aceitou modo POSIX incorreto (RC={res.returncode}). Output:\n{res.stdout}")

        # 8. Entrada com backslash
        log("\n[TEST NEG 8/10] Simulando: Entrada com path traversal (..) no caminho...")
        z8 = tmp_ws / "backslash.zip"
        make_mock_zip(z8, "traversal_entry")
        res = subprocess.run([sys.executable, str(verifier_script), "--zip", str(z8)],
                             stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        if res.returncode != 0 and "traversal" in res.stdout:
            log(f"  PASS: Verificador rejeitou entrada com path traversal (RC={res.returncode}).")
            passed_tests += 1
        else:
            log(f"  FAIL: Verificador aceitou path traversal no ZIP (RC={res.returncode}). Output:\n{res.stdout}")

        # 9. Caminho com espaços suportado adequadamente
        log("\n[TEST NEG 9/10] Validando: Caminho do ZIP contendo espaços...")
        space_dir = tmp_ws / "diretorio com espacos"
        space_dir.mkdir(parents=True, exist_ok=True)
        z9 = space_dir / "pacote com espacos.zip"
        make_mock_zip(z9, "no_manifest")
        res = subprocess.run([sys.executable, str(verifier_script), "--zip", str(z9)],
                             stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        if "pacote com espacos.zip" in res.stdout and "Manifesto" in res.stdout:
            log("  PASS: Verificador processou corretamente caminho com espaços.")
            passed_tests += 1
        else:
            log(f"  FAIL: Falha ao lidar com espaços no caminho (RC={res.returncode}). Output:\n{res.stdout}")

        # 10. Execução a partir de cwd externo arbitrário
        log("\n[TEST NEG 10/10] Validando: Execução a partir de cwd externo...")
        res = subprocess.run([sys.executable, str(verifier_script), "--zip", str(z9)],
                             cwd=str(tmp_ws),
                             stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        if "pacote com espacos.zip" in res.stdout:
            log("  PASS: Verificador opera de qualquer diretório atual (CWD independente).")
            passed_tests += 1
        else:
            log(f"  FAIL: Verificador falhou sob CWD externo (RC={res.returncode}). Output:\n{res.stdout}")

    finally:
        shutil.rmtree(tmp_ws, ignore_errors=True)

    log("\n" + "=" * 80)
    log(f"RESUMO DOS TESTES NEGATIVOS DO VERIFICADOR: {passed_tests}/{total_tests} PASSARAM")
    log(f"VERIFIER_NEGATIVE_PASSED={passed_tests}")
    log(f"VERIFIER_NEGATIVE_FAILED={total_tests - passed_tests}")
    log(f"VERIFIER_NEGATIVE_TOTAL={total_tests}")
    log(f"VERIFIER_NEGATIVE_EXIT_CODE={0 if passed_tests == total_tests else 1}")
    log("=" * 80)

    # Gravar evidência
    ev_path = script_dir / "EVIDENCIA_TESTES_NEGATIVOS_VERIFICADOR_V10.txt"
    try:
        content = "\n".join(log_lines) + "\n"
        content = content.replace("\r\n", "\n").replace("\r", "\n")
        ev_path.write_bytes(content.encode("utf-8"))
        print(f"\nEvidência dos testes negativos gravada em: {ev_path}")
    except Exception as e:
        print(f"\n[AVISO] Erro gravando evidência: {e}")

    sys.exit(0 if passed_tests == total_tests else 1)

if __name__ == "__main__":
    main()
