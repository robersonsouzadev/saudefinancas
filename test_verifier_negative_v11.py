#!/usr/bin/env python3
"""
SUÍTE DE TESTES NEGATIVOS DO VERIFICADOR V11 — FASE G4.2 (VITA SAÚDE)
=============================================================================
Comprova a robustez da auditoria contra:
1.  ZIP inexistente
2.  Manifesto ausente no ZIP
3.  Linha malformada no manifesto
4.  Caminho duplicado no manifesto
5.  Arquivo no ZIP não listado no manifesto
6.  Hash SHA-256 divergente no manifesto
7.  Symlink injetado dentro do ZIP
8.  Path traversal (..) dentro do ZIP
9.  Permissão POSIX incompatível (.sh sem 0755)
10. Fonte C com literal '\\n' nos bytes finais
11. Arquivo de texto contendo CRLF
12. Evidência contendo somente o token 'V11' sem contadores reais
13. Evidência com hash de sentinela divergente (ex: 94a3f54f...)
14. Evidência de sanitizers com FAIL
15. Validação de ZIP válido em caminho com espaços (Exit Code 0)
16. Validação de ZIP válido a partir de CWD externo arbitrário (Exit Code 0)
=============================================================================
"""

import os
import sys
import zipfile
import hashlib
import tempfile
import shutil
import subprocess
from pathlib import Path

EXPECTED_SENTINEL_HASH = "c5ea76d815b5f9dd52cb5bf55801de4a6e2a04113d805cd0e22395e9fc324d07"

def make_valid_mock_files():
    """Retorna dicionário de arquivos mínimos válidos para um pacote V11."""
    files = {}

    h_c = (
        '#include <stdio.h>\n'
        '#include <string.h>\n'
        '#include <signal.h>\n'
        'int main(int argc, char **argv) {\n'
        '    signal(SIGPIPE, SIG_IGN);\n'
        '    if (argc > 1 && strcmp(argv[1], "probe") == 0) {\n'
        '        printf("{\\"status\\":\\"ok\\",\\"openat2\\":true,\\"renameat2_noreplace\\":true,\\"proc_self_fd\\":true}\\n");\n'
        '        return 0;\n'
        '    }\n'
        '    return 0;\n'
        '}\n'
    )
    t_c = (
        '#include <stdio.h>\n'
        '#include <signal.h>\n'
        'int main(int argc, char **argv) {\n'
        '    (void)argc; (void)argv;\n'
        '    signal(SIGPIPE, SIG_IGN);\n'
        '    printf("[SENTINELA] Hash SHA-256 inicial: ' + EXPECTED_SENTINEL_HASH + '\\n");\n'
        '    printf("RESULTADO DOS TESTES NATIVOS: 15/15 PASSARAM\\n");\n'
        '    printf("PASSED=15\\nFAILED=0\\nTOTAL=15\\nEXIT_CODE=0\\n");\n'
        '    return 0;\n'
        '}\n'
    )
    r_sh = '#!/usr/bin/env bash\necho "OK"\n'
    neg_sh = '#!/usr/bin/env bash\necho "NEGATIVE_PASSED=8"\necho "NEGATIVE_FAILED=0"\nexit 0\n'

    ev_runner = (
        '================================================================================\n'
        'EXECUÇÃO OFICIAL DOS TESTES NATIVOS LINUX (G4.2 V11)\n'
        '================================================================================\n'
        '[SENTINELA] Hash SHA-256 inicial: ' + EXPECTED_SENTINEL_HASH + '\n'
        'RESULTADO DOS TESTES NATIVOS: 15/15 PASSARAM\n'
        'PASSED=15\nFAILED=0\nTOTAL=15\nEXIT_CODE=0\n'
    )
    ev_neg = (
        '================================================================================\n'
        'RESUMO DOS TESTES NEGATIVOS DO RUNNER (G4.2 V11):\n'
        'NEGATIVE_PASSED=8\nNEGATIVE_FAILED=0\nNEGATIVE_TOTAL=8\nNEGATIVE_EXIT_CODE=0\n'
    )
    ev_probe = '{"status":"ok","openat2":true,"renameat2_noreplace":true,"proc_self_fd":true}\n'
    ev_san = (
        'ASAN_STATUS=PASS\n'
        'UBSAN_STATUS=PASS\n'
        'TSAN_STATUS=PASS\n'
        'LSAN_STATUS=UNAVAILABLE: ptrace restrito no kernel do container (Exit Code 134)\n'
    )

    files["apps/api/scripts/storage_linux_helper.c"] = (h_c.encode("utf-8"), 0o644)
    files["apps/api/scripts/test_storage_linux_native.c"] = (t_c.encode("utf-8"), 0o644)
    files["apps/api/scripts/run_storage_linux_tests.sh"] = (r_sh.encode("utf-8"), 0o755)
    files["apps/api/scripts/test_runner_negative.sh"] = (neg_sh.encode("utf-8"), 0o755)
    files["EVIDENCIA_RUNNER_STORAGE_LINUX_V11.txt"] = (ev_runner.encode("utf-8"), 0o644)
    files["EVIDENCIA_TESTES_NEGATIVOS_RUNNER_V11.txt"] = (ev_neg.encode("utf-8"), 0o644)
    files["EVIDENCIA_PROBE_CAPABILITIES_V11.txt"] = (ev_probe.encode("utf-8"), 0o644)
    files["EVIDENCIA_SANITIZERS_V11.txt"] = (ev_san.encode("utf-8"), 0o644)
    return files

def build_custom_zip(zip_path: Path, files_dict, manifest_override=None, inject_symlink=False, traversal_entry=False):
    """Cria um pacote ZIP personalizado para testes com permissões UNIX estritas."""
    with zipfile.ZipFile(zip_path, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        # Calcular manifesto canônico
        manifest_lines = []
        for rel_path, (data, _) in sorted(files_dict.items()):
            h = hashlib.sha256(data).hexdigest()
            manifest_lines.append(f"{h}  {rel_path}\n")

        if manifest_override is not None:
            manifest_bytes = manifest_override.encode("utf-8")
        else:
            manifest_bytes = "".join(manifest_lines).encode("utf-8")

        # Escrever manifesto
        zinfo_m = zipfile.ZipInfo("MANIFEST_SHA256SUMS_V11.txt")
        zinfo_m.create_system = 3
        zinfo_m.external_attr = (0o100644 << 16) | 0o644
        zf.writestr(zinfo_m, manifest_bytes)

        # Escrever arquivos do pacote
        for rel_path, (data, mode) in files_dict.items():
            zinfo = zipfile.ZipInfo(rel_path)
            zinfo.create_system = 3
            zinfo.external_attr = ((0o100000 | mode) << 16) | mode
            zf.writestr(zinfo, data)

        if inject_symlink:
            zinfo_s = zipfile.ZipInfo("apps/api/scripts/symlink_attack")
            zinfo_s.create_system = 3
            # Modo 0o120777 indica symlink POSIX
            zinfo_s.external_attr = (0o120777 << 16)
            zf.writestr(zinfo_s, b"/etc/passwd")

        if traversal_entry:
            zinfo_tr = zipfile.ZipInfo("apps/api/scripts/../../escape.txt")
            zinfo_tr.create_system = 3
            zinfo_tr.external_attr = (0o100644 << 16) | 0o644
            zf.writestr(zinfo_tr, b"ESCAPE")

def main():
    script_dir = Path(__file__).resolve().parent
    verifier_script = script_dir / "verify_v11_package.py"

    log_lines = []
    def log(msg=""):
        print(msg)
        log_lines.append(msg)

    log("=" * 80)
    log("SUÍTE DE TESTES NEGATIVOS DO VERIFICADOR V11 — FASE G4.2")
    log("Verificador: " + str(verifier_script))
    log("=" * 80)

    if not verifier_script.exists():
        log(f"[FATAL] verify_v11_package.py não encontrado em {verifier_script}")
        sys.exit(1)

    passed_tests = 0
    total_tests = 16

    tmp_ws = Path(tempfile.mkdtemp(prefix="vita_test_verifier_neg_v11_"))

    try:
        # 1. ZIP Inexistente
        log("\n[TEST NEG 1/16] Simulando: ZIP inexistente...")
        z_none = tmp_ws / "inexistente.zip"
        res = subprocess.run([sys.executable, str(verifier_script), "--zip", str(z_none)],
                             stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        if res.returncode != 0 and "não encontrado" in res.stdout:
            log(f"  PASS: Verificador rejeitou ZIP inexistente (RC={res.returncode}).")
            passed_tests += 1
        else:
            log(f"  FAIL: Verificador aceitou ZIP inexistente (RC={res.returncode}).")

        # 2. Manifesto ausente no ZIP
        log("\n[TEST NEG 2/16] Simulando: Manifesto ausente no ZIP...")
        z_noman = tmp_ws / "no_manifest.zip"
        with zipfile.ZipFile(z_noman, "w") as zf:
            zi = zipfile.ZipInfo("dummy.txt")
            zi.create_system = 3
            zi.external_attr = (0o100644 << 16) | 0o644
            zf.writestr(zi, b"teste")
        res = subprocess.run([sys.executable, str(verifier_script), "--zip", str(z_noman)],
                             stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        if res.returncode != 0 and "Manifesto canônico" in res.stdout:
            log(f"  PASS: Verificador rejeitou ZIP sem manifesto (RC={res.returncode}).")
            passed_tests += 1
        else:
            log(f"  FAIL: Verificador aceitou ZIP sem manifesto (RC={res.returncode}).")

        # 3. Linha malformada no manifesto
        log("\n[TEST NEG 3/16] Simulando: Linha malformada no manifesto...")
        z_badman = tmp_ws / "bad_manifest.zip"
        files3 = make_valid_mock_files()
        build_custom_zip(z_badman, files3, manifest_override="HASH_INVALIDO_CURTO  apps/api/scripts/run.sh\n")
        res = subprocess.run([sys.executable, str(verifier_script), "--zip", str(z_badman)],
                             stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        if res.returncode != 0 and "inválido no manifesto" in res.stdout:
            log(f"  PASS: Verificador rejeitou manifesto malformado (RC={res.returncode}).")
            passed_tests += 1
        else:
            log(f"  FAIL: Verificador aceitou manifesto malformado (RC={res.returncode}).")

        # 4. Caminho duplicado no manifesto
        log("\n[TEST NEG 4/16] Simulando: Caminho duplicado no manifesto...")
        z_dup = tmp_ws / "dup_manifest.zip"
        files4 = make_valid_mock_files()
        dup_content = (
            "c5ea76d815b5f9dd52cb5bf55801de4a6e2a04113d805cd0e22395e9fc324d07  EVIDENCIA_RUNNER_STORAGE_LINUX_V11.txt\n"
            "c5ea76d815b5f9dd52cb5bf55801de4a6e2a04113d805cd0e22395e9fc324d07  EVIDENCIA_RUNNER_STORAGE_LINUX_V11.txt\n"
        )
        build_custom_zip(z_dup, files4, manifest_override=dup_content)
        res = subprocess.run([sys.executable, str(verifier_script), "--zip", str(z_dup)],
                             stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        if res.returncode != 0 and "Caminho duplicado" in res.stdout:
            log(f"  PASS: Verificador detectou e rejeitou caminho duplicado (RC={res.returncode}).")
            passed_tests += 1
        else:
            log(f"  FAIL: Verificador aceitou caminho duplicado (RC={res.returncode}).")

        # 5. Arquivo presente no ZIP não listado no manifesto
        log("\n[TEST NEG 5/16] Simulando: Arquivo presente no ZIP não listado no manifesto...")
        z_unlisted = tmp_ws / "unlisted.zip"
        files5 = make_valid_mock_files()
        # Remove um arquivo do manifesto gerado
        m_lines = []
        for k, (v, _) in files5.items():
            if "storage_linux_helper.c" not in k:
                m_lines.append(f"{hashlib.sha256(v).hexdigest()}  {k}\n")
        build_custom_zip(z_unlisted, files5, manifest_override="".join(m_lines))
        res = subprocess.run([sys.executable, str(verifier_script), "--zip", str(z_unlisted)],
                             stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        if res.returncode != 0 and "não listado no manifesto" in res.stdout:
            log(f"  PASS: Verificador rejeitou arquivo não listado (RC={res.returncode}).")
            passed_tests += 1
        else:
            log(f"  FAIL: Verificador aceitou arquivo não listado (RC={res.returncode}).")

        # 6. Hash SHA-256 divergente no manifesto
        log("\n[TEST NEG 6/16] Simulando: Hash SHA-256 divergente no manifesto...")
        z_hashdiv = tmp_ws / "hashdiv.zip"
        files6 = make_valid_mock_files()
        m_div = []
        for k, (v, _) in files6.items():
            h = hashlib.sha256(v).hexdigest()
            if "storage_linux_helper.c" in k:
                h = "0000000000000000000000000000000000000000000000000000000000000000"
            m_div.append(f"{h}  {k}\n")
        build_custom_zip(z_hashdiv, files6, manifest_override="".join(m_div))
        res = subprocess.run([sys.executable, str(verifier_script), "--zip", str(z_hashdiv)],
                             stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        if res.returncode != 0 and "Hash divergente" in res.stdout:
            log(f"  PASS: Verificador detectou divergência de SHA-256 (RC={res.returncode}).")
            passed_tests += 1
        else:
            log(f"  FAIL: Verificador aceitou hash divergente (RC={res.returncode}).")

        # 7. Symlink injetado dentro do ZIP
        log("\n[TEST NEG 7/16] Simulando: Symlink injetado dentro do ZIP...")
        z_symlink = tmp_ws / "symlink.zip"
        files7 = make_valid_mock_files()
        build_custom_zip(z_symlink, files7, inject_symlink=True)
        res = subprocess.run([sys.executable, str(verifier_script), "--zip", str(z_symlink)],
                             stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        if res.returncode != 0 and ("proibido" in res.stdout or "symlink" in res.stdout):
            log(f"  PASS: Verificador rejeitou symlink dentro do ZIP (RC={res.returncode}).")
            passed_tests += 1
        else:
            log(f"  FAIL: Verificador aceitou symlink dentro do ZIP (RC={res.returncode}).")

        # 8. Path traversal (..) dentro do ZIP
        log("\n[TEST NEG 8/16] Simulando: Path traversal (..) dentro do ZIP...")
        z_trav = tmp_ws / "traversal.zip"
        files8 = make_valid_mock_files()
        build_custom_zip(z_trav, files8, traversal_entry=True)
        res = subprocess.run([sys.executable, str(verifier_script), "--zip", str(z_trav)],
                             stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        if res.returncode != 0 and "Path traversal" in res.stdout:
            log(f"  PASS: Verificador rejeitou path traversal no ZIP (RC={res.returncode}).")
            passed_tests += 1
        else:
            log(f"  FAIL: Verificador aceitou path traversal no ZIP (RC={res.returncode}).")

        # 9. Permissão POSIX incompatível (.sh sem 0755)
        log("\n[TEST NEG 9/16] Simulando: Permissão POSIX incompatível (.sh sem 0755)...")
        z_perm = tmp_ws / "bad_perm.zip"
        files9 = make_valid_mock_files()
        # Modifica permissão de run_storage_linux_tests.sh para 0644
        data, _ = files9["apps/api/scripts/run_storage_linux_tests.sh"]
        files9["apps/api/scripts/run_storage_linux_tests.sh"] = (data, 0o644)
        build_custom_zip(z_perm, files9)
        res = subprocess.run([sys.executable, str(verifier_script), "--zip", str(z_perm)],
                             stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        if res.returncode != 0 and "sem permissão 0755" in res.stdout:
            log(f"  PASS: Verificador rejeitou script .sh sem permissão 0755 (RC={res.returncode}).")
            passed_tests += 1
        else:
            log(f"  FAIL: Verificador aceitou modo incorreto em script (RC={res.returncode}).")

        # 10. Fonte C com literal '\n' nos bytes finais
        log("\n[TEST NEG 10/16] Simulando: Fonte C com literal '\\n' nos bytes finais...")
        z_litn = tmp_ws / "litn.zip"
        files10 = make_valid_mock_files()
        files10["apps/api/scripts/storage_linux_helper.c"] = (b"int main(){ return 0; }\\n", 0o644)
        build_custom_zip(z_litn, files10)
        res = subprocess.run([sys.executable, str(verifier_script), "--zip", str(z_litn)],
                             stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        if res.returncode != 0 and ("não termina com" in res.stdout or "Literal '\\n'" in res.stdout):
            log(f"  PASS: Verificador rejeitou fonte com literal '\\n' (RC={res.returncode}).")
            passed_tests += 1
        else:
            log(f"  FAIL: Verificador aceitou fonte com literal '\\n' (RC={res.returncode}).")

        # 11. Arquivo de texto contendo CRLF
        log("\n[TEST NEG 11/16] Simulando: Arquivo de texto contendo CRLF...")
        z_crlf = tmp_ws / "crlf.zip"
        files11 = make_valid_mock_files()
        files11["apps/api/scripts/run_storage_linux_tests.sh"] = (b"#!/usr/bin/env bash\r\necho OK\r\n", 0o755)
        build_custom_zip(z_crlf, files11)
        res = subprocess.run([sys.executable, str(verifier_script), "--zip", str(z_crlf)],
                             stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        if res.returncode != 0 and "CRLF" in res.stdout:
            log(f"  PASS: Verificador rejeitou arquivo com CRLF (RC={res.returncode}).")
            passed_tests += 1
        else:
            log(f"  FAIL: Verificador aceitou arquivo com CRLF (RC={res.returncode}).")

        # 12. Evidência contendo somente o token 'V11' sem contadores reais
        log("\n[TEST NEG 12/16] Simulando: Evidência contendo somente token V11...")
        z_tokonly = tmp_ws / "token_only.zip"
        files12 = make_valid_mock_files()
        files12["EVIDENCIA_RUNNER_STORAGE_LINUX_V11.txt"] = (b"V11\n", 0o644)
        build_custom_zip(z_tokonly, files12)
        res = subprocess.run([sys.executable, str(verifier_script), "--zip", str(z_tokonly)],
                             stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        if res.returncode != 0 and "não comprova 15/15" in res.stdout:
            log(f"  PASS: Verificador rejeitou evidência com apenas token V11 (RC={res.returncode}).")
            passed_tests += 1
        else:
            log(f"  FAIL: Verificador aceitou evidência mockada (RC={res.returncode}).")

        # 13. Evidência com hash de sentinela divergente (ex: hash antigo do V8/V10)
        log("\n[TEST NEG 13/16] Simulando: Evidência com hash de sentinela divergente (94a3f5...)...")
        z_oldhash = tmp_ws / "old_hash.zip"
        files13 = make_valid_mock_files()
        files13["EVIDENCIA_RUNNER_STORAGE_LINUX_V11.txt"] = (
            b"EXECUCAO\nPASSED=15\nFAILED=0\nTOTAL=15\n"
            b"[SENTINELA] Hash SHA-256 inicial: 94a3f54ff9dc727443f768c214caea63d8ae49529192586736c57e8b50556d30\n",
            0o644
        )
        build_custom_zip(z_oldhash, files13)
        res = subprocess.run([sys.executable, str(verifier_script), "--zip", str(z_oldhash)],
                             stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        if res.returncode != 0 and ("proibido detectado" in res.stdout or "divergente" in res.stdout):
            log(f"  PASS: Verificador rejeitou evidência com hash de sentinela antigo/divergente (RC={res.returncode}).")
            passed_tests += 1
        else:
            log(f"  FAIL: Verificador aceitou hash de sentinela incorreto (RC={res.returncode}).")

        # 14. Evidência de sanitizers com FAIL
        log("\n[TEST NEG 14/16] Simulando: Evidência de sanitizers com FAIL...")
        z_sanfail = tmp_ws / "san_fail.zip"
        files14 = make_valid_mock_files()
        files14["EVIDENCIA_SANITIZERS_V11.txt"] = (
            b"ASAN_STATUS=PASS\nUBSAN_STATUS=PASS\nTSAN_STATUS=PASS\nLSAN_STATUS=FAIL\n", 0o644
        )
        build_custom_zip(z_sanfail, files14)
        res = subprocess.run([sys.executable, str(verifier_script), "--zip", str(z_sanfail)],
                             stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        if res.returncode != 0 and "LSan reportou FAIL" in res.stdout:
            log(f"  PASS: Verificador rejeitou pacote com FAIL em sanitizer (RC={res.returncode}).")
            passed_tests += 1
        else:
            log(f"  FAIL: Verificador aceitou sanitizer com FAIL (RC={res.returncode}).")

        # 15. Validação de ZIP válido em caminho com espaços (Exit Code 0)
        log("\n[TEST NEG 15/16] Validando: ZIP válido em diretório com espaços...")
        space_dir = tmp_ws / "caminho com espacos na auditoria"
        space_dir.mkdir(parents=True, exist_ok=True)
        z_valid_space = space_dir / "pacote tecnico com espacos.zip"
        files15 = make_valid_mock_files()
        build_custom_zip(z_valid_space, files15)
        ev_space_out = space_dir / "evidencia com espacos.txt"
        res = subprocess.run([
            sys.executable, str(verifier_script),
            "--zip", str(z_valid_space),
            "--evidence-out", str(ev_space_out)
        ], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        if res.returncode == 0 and "AUDITORIA INTEGRAL CONCLUÍDA" in res.stdout and ev_space_out.exists():
            log(f"  PASS: Verificador operou perfeitamente em caminhos com espaços (RC=0).")
            passed_tests += 1
        else:
            log(f"  FAIL: Verificador falhou sob caminho com espaços (RC={res.returncode}):\n{res.stdout}\n{res.stderr}")

        # 16. Validação de ZIP válido executado a partir de CWD externo arbitrário (Exit Code 0)
        log("\n[TEST NEG 16/16] Validando: Execução de ZIP válido a partir de CWD externo arbitrário...")
        external_cwd = tmp_ws / "cwd_externo"
        external_cwd.mkdir(parents=True, exist_ok=True)
        res = subprocess.run([
            sys.executable, str(verifier_script),
            "--zip", str(z_valid_space)
        ], cwd=str(external_cwd), stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        if res.returncode == 0 and "AUDITORIA INTEGRAL CONCLUÍDA" in res.stdout:
            log(f"  PASS: Verificador operou com 100% de sucesso a partir de CWD externo (RC=0).")
            passed_tests += 1
        else:
            log(f"  FAIL: Verificador falhou sob CWD externo (RC={res.returncode}):\n{res.stdout}\n{res.stderr}")

    finally:
        shutil.rmtree(tmp_ws, ignore_errors=True)

    log("\n" + "=" * 80)
    log(f"RESUMO DOS TESTES NEGATIVOS DO VERIFICADOR V11: {passed_tests}/{total_tests} PASSARAM")
    log(f"VERIFIER_NEGATIVE_PASSED={passed_tests}")
    log(f"VERIFIER_NEGATIVE_FAILED={total_tests - passed_tests}")
    log(f"VERIFIER_NEGATIVE_TOTAL={total_tests}")
    log(f"VERIFIER_NEGATIVE_EXIT_CODE={0 if passed_tests == total_tests else 1}")
    log("=" * 80)

    # Gravar evidência com LF puro
    ev_path = script_dir / "EVIDENCIA_TESTES_NEGATIVOS_VERIFICADOR_V11.txt"
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
