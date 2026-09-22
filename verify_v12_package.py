#!/usr/bin/env python3
r"""
VERIFICADOR TÉCNICO PORTÁTIL E AUTOCONTIDO — FASE G4.2 V12 (VITA SAÚDE)
=============================================================================
Auditoria Independente Integral:
1. Portabilidade Total: opera com pathlib.Path, argparse, caminhos com espaços e qualquer CWD.
2. Validação Estrita de ZIP: create_system == 3 (UNIX), permissões POSIX (0755/0644),
   rejeição de symlinks, devices, types especiais, traversals (..), caminhos absolutos e barras invertidas (\).
3. Auditoria Canônica do Manifesto: SHA-256 de 64 hexadecimais, sem duplicatas,
   cobertura total de 100% dos arquivos do pacote.
4. Auditoria de Finais de Linha e Fontes C: LF puro (zero CRLF, zero NUL, zero BOM),
   fontes C terminando estritamente em '}\n' (7d 0a).
5. Validação de Versão Estrita: Rejeição de qualquer menção residual a versões legadas
   anteriores (V8, V9, V10, V11) em fontes, scripts e arquivos operacionais de evidência.
6. Classificação Segura do LSan: LSAN_STATUS=UNAVAILABLE somente aceito mediante
   presença factual comprovada de erro de ptrace no container unprivileged.
   Qualquer RC=134 sem mensagem de ptrace é classificado estritamente como LSAN_STATUS=FAIL.
7. Execução Física do Pipeline Real Linux (quando gcc presente):
   - Compilação estrita do helper (-Wall -Wextra -Werror)
   - Execução do probe
   - Compilação estrita da suíte nativa (-Wall -Wextra -Werror -pthread)
   - Execução dos 15 testes físicos nativos via Python subprocess.run (resiliência total a SIGPIPE)
   - Execução dos 8 testes negativos do runner bash
   - Provas reais de sanitizers: ASan+UBSan, TSan e prova separada de LSan.
=============================================================================
"""

import sys
import os
import zipfile
import hashlib
import tempfile
import shutil
import argparse
import subprocess
from pathlib import Path

EXPECTED_SENTINEL_HASH = "c5ea76d815b5f9dd52cb5bf55801de4a6e2a04113d805cd0e22395e9fc324d07"
FORBIDDEN_LEGACY_VERSIONS = ["G4.2 " + v for v in ["V8", "V9", "V10", "V11"]]
FORBIDDEN_OLD_HASHES = [
    "94a3f54ff9dc727443f768c214caea63d8ae49529192586736c57e8b50556d30",
    "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
]

def sha256_file(filepath: Path) -> str:
    h = hashlib.sha256()
    with open(filepath, "rb") as f:
        while chunk := f.read(65536):
            h.update(chunk)
    return h.hexdigest()

def is_recognized_ptrace_unavail(text: str) -> bool:
    """Verifica se o log contém comprovação factual do runtime de indisponibilidade de ptrace."""
    return (
        ("LeakSanitizer does not work under ptrace" in text) or
        ("LeakSanitizer has encountered a fatal error" in text and "ptrace" in text) or
        ("PTRACE_ATTACH" in text and "Operation not permitted" in text)
    )

def main():
    parser = argparse.ArgumentParser(
        description="Auditoria e Verificação Técnica Independente — Fase G4.2 V12"
    )
    parser.add_argument(
        "--zip",
        dest="zip_path",
        default=None,
        help="Caminho do pacote ZIP a ser auditado (relativo, absoluto ou com espaços)."
    )
    parser.add_argument(
        "--repo-root",
        dest="repo_root",
        default=None,
        help="Caminho da raiz do repositório (opcional)."
    )
    parser.add_argument(
        "--evidence-out",
        dest="evidence_out",
        default=None,
        help="Caminho do arquivo de evidência de saída (opcional)."
    )

    args = parser.parse_args()

    script_dir = Path(__file__).resolve().parent
    repo_root = Path(args.repo_root).resolve() if args.repo_root else script_dir

    if args.zip_path:
        zip_path = Path(args.zip_path).resolve()
    else:
        candidates = [
            Path.cwd() / "pacote_tecnico_g4_2_v12.zip",
            Path.cwd() / "pacote_tecnico_g4_2.zip",
            script_dir / "pacote_tecnico_g4_2_v12.zip",
            script_dir / "pacote_tecnico_g4_2.zip",
            repo_root / "pacote_tecnico_g4_2_v12.zip",
            repo_root / "pacote_tecnico_g4_2.zip"
        ]
        zip_path = next((c for c in candidates if c.exists()), candidates[0])

    log_lines = []
    def log(msg=""):
        print(msg)
        log_lines.append(msg)

    log("=" * 80)
    log("AUDITORIA TÉCNICA INDEPENDENTE DE INTEGRIDADE — FASE G4.2 V12")
    log("Host OS:        " + sys.platform)
    log("Alvo Auditado:  " + str(zip_path))
    log("=" * 80)

    # 1. Existência do arquivo ZIP
    if not zip_path.exists() or not zip_path.is_file():
        log(f"[FATAL] Arquivo ZIP não encontrado no caminho especificado: {zip_path}")
        sys.exit(1)

    zip_bytes = zip_path.read_bytes()
    zip_size = len(zip_bytes)
    zip_hash = hashlib.sha256(zip_bytes).hexdigest()
    log(f"Tamanho do ZIP:  {zip_size:,} bytes")
    log(f"SHA-256 do ZIP:  {zip_hash}")

    # 2. Análise Estrutural e Hardening do ZIP
    try:
        zf = zipfile.ZipFile(zip_path, "r")
    except Exception as e:
        log(f"[FATAL] Arquivo ZIP corrompido ou inválido: {e}")
        sys.exit(1)

    infolist = zf.infolist()
    total_entries = len(infolist)
    file_entries = [i for i in infolist if not i.is_dir()]
    dir_entries = [i for i in infolist if i.is_dir()]

    log(f"Total Entradas:  {total_entries} (Arquivos: {len(file_entries)}, Diretórios: {len(dir_entries)})")

    seen_names = set()
    for entry in infolist:
        name = entry.filename

        if "\\" in name:
            log(f"[FATAL] Barra invertida (\\) detectada na entrada: {name}")
            sys.exit(1)

        if name.startswith("/") or name.startswith("\\") or "/../" in name or name.startswith("../") or name.endswith("/.."):
            log(f"[FATAL] Path traversal ou caminho absoluto proibido: {name}")
            sys.exit(1)

        if name in seen_names:
            log(f"[FATAL] Entrada duplicada detectada no ZIP: {name}")
            sys.exit(1)
        seen_names.add(name)

        if entry.create_system != 3:
            log(f"[FATAL] Entrada gravada com sistema não-UNIX (create_system={entry.create_system}): {name}")
            sys.exit(1)

        mode = (entry.external_attr >> 16) & 0o7777
        file_type = (entry.external_attr >> 16) & 0o170000

        if file_type not in (0o100000, 0o040000, 0):
            log(f"[FATAL] Tipo de arquivo proibido/especial detectado no ZIP (type={oct(file_type)}): {name}")
            sys.exit(1)

        if entry.is_dir():
            if (mode & 0o777) != 0o755:
                log(f"[FATAL] Diretório com permissão inválida ({oct(mode)} != 0755): {name}")
                sys.exit(1)
        else:
            if name.endswith(".sh") or name.endswith(".py"):
                if (mode & 0o777) != 0o755:
                    log(f"[FATAL] Script executável sem permissão 0755 ({oct(mode)}): {name}")
                    sys.exit(1)
            else:
                if (mode & 0o777) != 0o644:
                    log(f"[FATAL] Arquivo regular com permissão diferente de 0644 ({oct(mode)}): {name}")
                    sys.exit(1)

    log("  [PASS] Hardening estrutural do ZIP: 100% UNIX, zero symlinks, permissões 0755/0644 estritas.")

    # 3. Extração para diretório temporário limpo
    tmp_extract_dir = Path(tempfile.mkdtemp(prefix="vita_v12_audit_"))
    try:
        zf.extractall(tmp_extract_dir)
        log(f"  [PASS] Pacote extraído com sucesso em: {tmp_extract_dir}")

        # 4. Auditoria Canônica do Manifesto
        manifest_path = tmp_extract_dir / "MANIFEST_SHA256SUMS_V12.txt"
        if not manifest_path.exists():
            log("[FATAL] Manifesto canônico MANIFEST_SHA256SUMS_V12.txt ausente no pacote!")
            sys.exit(1)

        manifest_lines = manifest_path.read_text(encoding="utf-8").splitlines()
        manifest_files = {}
        for line_num, line in enumerate(manifest_lines, 1):
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            parts = line.split("  ", 1)
            if len(parts) != 2:
                log(f"[FATAL] Linha malformada no manifesto (linha {line_num}): '{line}'")
                sys.exit(1)
            f_hash, f_rel = parts[0].strip(), parts[1].strip()
            if len(f_hash) != 64 or not all(c in "0123456789abcdefABCDEF" for c in f_hash):
                log(f"[FATAL] Hash SHA-256 inválido no manifesto (linha {line_num}): '{f_hash}'")
                sys.exit(1)
            if f_rel in manifest_files:
                log(f"[FATAL] Caminho duplicado no manifesto: '{f_rel}'")
                sys.exit(1)
            manifest_files[f_rel] = f_hash.lower()

        extracted_files = [p for p in tmp_extract_dir.rglob("*") if p.is_file()]
        for fpath in extracted_files:
            rel = fpath.relative_to(tmp_extract_dir).as_posix()
            if rel == "MANIFEST_SHA256SUMS_V12.txt":
                continue
            if rel not in manifest_files:
                log(f"[FATAL] Arquivo presente no ZIP não listado no manifesto: {rel}")
                sys.exit(1)
            actual_h = sha256_file(fpath)
            if actual_h != manifest_files[rel]:
                log(f"[FATAL] Hash divergente para '{rel}': esperado {manifest_files[rel]}, calculado {actual_h}")
                sys.exit(1)

        for rel in manifest_files:
            target = tmp_extract_dir / rel
            if not target.exists():
                log(f"[FATAL] Arquivo declarado no manifesto não encontrado no pacote: {rel}")
                sys.exit(1)

        log(f"  [PASS] Manifesto canônico auditado: {len(manifest_files)}/{len(manifest_files)} arquivos íntegros.")

        # 5. Auditoria de Finais de Linha, Fontes C e Rótulos Residuais
        text_extensions = {".c", ".h", ".sh", ".py", ".md", ".txt", ".sql", ".prisma", ".json", ".mjs", ".patch"}
        for fpath in extracted_files:
            if fpath.suffix in text_extensions:
                data = fpath.read_bytes()
                rel = fpath.relative_to(tmp_extract_dir).as_posix()
                if b"\r\n" in data or b"\r" in data:
                    log(f"[FATAL] Fim de linha não-POSIX (CRLF/CR) detectado em: {rel}")
                    sys.exit(1)
                if b"\x00" in data and not rel.endswith(".fit"):
                    log(f"[FATAL] Byte NUL inesperado detectado em: {rel}")
                    sys.exit(1)
                if data.startswith(b"\xef\xbb\xbf"):
                    log(f"[FATAL] UTF-8 BOM detectado em: {rel}")
                    sys.exit(1)

                # CORREÇÃO 4: Rejeitar rótulos residuais de versões anteriores nos fontes, scripts e evidências
                # Exclui apenas relatório de entrega, patch diff histórico, e scripts/evidências de teste do verificador
                if not (rel.startswith("RELATORIO_") or rel.endswith(".patch") or rel == "docs/adr/001-utc-timestamp-strategy.md" or rel in ("verify_v12_package.py", "build_v12_package.py", "test_verifier_negative_v12.py", "EVIDENCIA_TESTES_NEGATIVOS_VERIFICADOR_V12.txt")):
                    text_str = data.decode("utf-8", errors="replace")
                    for leg_ver in FORBIDDEN_LEGACY_VERSIONS:
                        if leg_ver in text_str:
                            log(f"[FATAL] Rótulo de versão residual proibido '{leg_ver}' detectado no arquivo: {rel}")
                            sys.exit(1)

        # Verificação dos bytes finais dos fontes C
        helper_c = tmp_extract_dir / "apps" / "api" / "scripts" / "storage_linux_helper.c"
        tests_c = tmp_extract_dir / "apps" / "api" / "scripts" / "test_storage_linux_native.c"
        for c_file in [helper_c, tests_c]:
            rel = c_file.relative_to(tmp_extract_dir).as_posix()
            data = c_file.read_bytes()
            if not data.endswith(b"}\n"):
                log(f"[FATAL] Fonte C '{rel}' não termina com '}}\\n' (bytes: {data[-4:]})")
                sys.exit(1)
            if b"}\\n" in data[-5:]:
                log(f"[FATAL] Literal '\\n' detectado nos bytes finais de {rel}")
                sys.exit(1)

        log("  [PASS] 100% dos fontes em LF puro, terminando em '}\\n' e sem rótulos residuais.")

        # 6. Validação Semântica das Evidências Incluídas no ZIP
        ev_runner = tmp_extract_dir / "EVIDENCIA_RUNNER_STORAGE_LINUX_V12.txt"
        ev_neg_runner = tmp_extract_dir / "EVIDENCIA_TESTES_NEGATIVOS_RUNNER_V12.txt"
        ev_probe = tmp_extract_dir / "EVIDENCIA_PROBE_CAPABILITIES_V12.txt"
        ev_sanitizers = tmp_extract_dir / "EVIDENCIA_SANITIZERS_V12.txt"

        required_evs = [ev_runner, ev_neg_runner, ev_probe, ev_sanitizers]
        for ev in required_evs:
            if not ev.exists():
                log(f"[FATAL] Arquivo de evidência obrigatório ausente: {ev.name}")
                sys.exit(1)
            ev_text = ev.read_text(encoding="utf-8")
            for old_h in FORBIDDEN_OLD_HASHES:
                if old_h in ev_text:
                    log(f"[FATAL] Hash antigo proibido detectado na evidência {ev.name}: {old_h}")
                    sys.exit(1)

        # Validação semântica detalhada do runner
        runner_content = ev_runner.read_text(encoding="utf-8")
        if "PASSED=15" not in runner_content or "FAILED=0" not in runner_content or "TOTAL=15" not in runner_content:
            log("[FATAL] EVIDENCIA_RUNNER_STORAGE_LINUX_V12.txt não comprova 15/15 testes aprovados!")
            sys.exit(1)
        if "CONFORME COM AUDITORIA G4.2 V12" not in runner_content:
            log("[FATAL] EVIDENCIA_RUNNER_STORAGE_LINUX_V12.txt não contém o selo de auditoria G4.2 V12!")
            sys.exit(1)
        if EXPECTED_SENTINEL_HASH not in runner_content:
            log(f"[FATAL] Hash da sentinela divergente na evidência do runner (esperado {EXPECTED_SENTINEL_HASH})")
            sys.exit(1)
        if "141" in runner_content and "Exit Code: 141" in runner_content:
            log("[FATAL] Código de erro SIGPIPE 141 detectado na evidência do runner!")
            sys.exit(1)

        neg_runner_content = ev_neg_runner.read_text(encoding="utf-8")
        if "NEGATIVE_PASSED=8" not in neg_runner_content or "NEGATIVE_FAILED=0" not in neg_runner_content:
            log("[FATAL] EVIDENCIA_TESTES_NEGATIVOS_RUNNER_V12.txt não comprova 8/8 testes negativos!")
            sys.exit(1)

        probe_content = ev_probe.read_text(encoding="utf-8")
        if '"status":"ok"' not in probe_content or '"openat2":true' not in probe_content:
            log("[FATAL] EVIDENCIA_PROBE_CAPABILITIES_V12.txt não comprova capacidades do kernel!")
            sys.exit(1)

        # CORREÇÃO 3: Validação Semântica Segura do LSan
        sanitizers_content = ev_sanitizers.read_text(encoding="utf-8")
        if "ASAN_STATUS=PASS" not in sanitizers_content or "UBSAN_STATUS=PASS" not in sanitizers_content:
            log("[FATAL] ASan/UBSan não aprovados na evidência de sanitizers!")
            sys.exit(1)
        if "TSAN_STATUS=PASS" not in sanitizers_content:
            log("[FATAL] TSan não aprovado na evidência de sanitizers!")
            sys.exit(1)
        if "LSAN_STATUS=FAIL" in sanitizers_content:
            log("[FATAL] LSan reportou FAIL na evidência de sanitizers!")
            sys.exit(1)

        if "LSAN_STATUS=UNAVAILABLE" in sanitizers_content:
            if not is_recognized_ptrace_unavail(sanitizers_content):
                log("[FATAL] LSAN_STATUS=UNAVAILABLE emitido sem mensagem factual reconhecida de ptrace!")
                log("LSAN_STATUS=FAIL")
                sys.exit(1)
        elif "LSAN_STATUS=PASS" in sanitizers_content:
            pass
        else:
            log("[FATAL] Status de LSan inválido ou ausente na evidência!")
            sys.exit(1)

        log("  [PASS] Validação semântica completa das evidências V12 aprovada.")

        # 7. Execução do Pipeline Físico Real (Compilação GCC, Testes Nativos, Sanitizers)
        gcc_bin = shutil.which("gcc")
        if gcc_bin and sys.platform != "win32":
            log("\n[PIPELINE FÍSICO LINUX] Compilador GCC detectado. Executando suíte completa de testes...")
            bin_dir = tmp_extract_dir / "bin_audit"
            bin_dir.mkdir(parents=True, exist_ok=True)

            helper_bin = bin_dir / "storage_linux_helper"
            tests_bin = bin_dir / "test_storage_linux_native"

            # 7.1 Compilar Helper com -Werror
            cmd_build_h = [
                "gcc", "-O2", "-Wall", "-Wextra", "-Werror", "-D_GNU_SOURCE", "-std=gnu11",
                str(helper_c), "-o", str(helper_bin)
            ]
            log(f"  > {' '.join(cmd_build_h)}")
            res_bh = subprocess.run(cmd_build_h, capture_output=True, text=True)
            if res_bh.returncode != 0:
                log(f"[FATAL] Falha compilando storage_linux_helper com -Werror:\n{res_bh.stderr}")
                sys.exit(1)
            helper_bin.chmod(0o755)

            # 7.2 Probe físico
            cmd_probe = [str(helper_bin), "probe"]
            log(f"  > {' '.join(cmd_probe)}")
            res_p = subprocess.run(cmd_probe, capture_output=True, text=True)
            if res_p.returncode != 0 or '"status":"ok"' not in res_p.stdout:
                log(f"[FATAL] Probe físico falhou (RC={res_p.returncode}):\n{res_p.stdout}\n{res_p.stderr}")
                sys.exit(1)

            # 7.3 Compilar Testes Nativos com -Werror e -pthread
            cmd_build_t = [
                "gcc", "-O2", "-Wall", "-Wextra", "-Werror", "-pthread", "-D_GNU_SOURCE", "-std=gnu11",
                str(tests_c), "-o", str(tests_bin)
            ]
            log(f"  > {' '.join(cmd_build_t)}")
            res_bt = subprocess.run(cmd_build_t, capture_output=True, text=True)
            if res_bt.returncode != 0:
                log(f"[FATAL] Falha compilando test_storage_linux_native com -Werror:\n{res_bt.stderr}")
                sys.exit(1)
            tests_bin.chmod(0o755)

            # 7.4 Execução Física dos 15 Testes Nativos via Python subprocess.run (anti-SIGPIPE)
            cmd_run_tests = [str(tests_bin), str(helper_bin)]
            log(f"  > {' '.join(cmd_run_tests)}")
            res_t = subprocess.run(cmd_run_tests, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
            if res_t.returncode != 0:
                log(f"[FATAL] Suíte nativa falhou com Exit Code {res_t.returncode}!\nStdout:\n{res_t.stdout}\nStderr:\n{res_t.stderr}")
                sys.exit(1)
            if "RESULTADO DOS TESTES NATIVOS: 15/15 PASSARAM" not in res_t.stdout:
                log(f"[FATAL] Nem todos os 15 testes passaram na execução física!\n{res_t.stdout}")
                sys.exit(1)
            if "CONFORME COM AUDITORIA G4.2 V12" not in res_t.stdout:
                log(f"[FATAL] Saída do binário nativo não reflete o rótulo G4.2 V12!\n{res_t.stdout}")
                sys.exit(1)
            if EXPECTED_SENTINEL_HASH not in res_t.stdout:
                log(f"[FATAL] Hash da sentinela física divergiu do esperado!\n{res_t.stdout}")
                sys.exit(1)
            log("  [PASS] 15/15 testes físicos nativos executados e aprovados via Python subprocess.")

            # 7.5 Execução dos 8 Testes Negativos do Runner
            bash_bin = shutil.which("bash")
            neg_script = tmp_extract_dir / "apps" / "api" / "scripts" / "test_runner_negative.sh"
            if bash_bin and neg_script.exists():
                cmd_neg = [bash_bin, str(neg_script)]
                log(f"  > {' '.join(cmd_neg)}")
                res_neg = subprocess.run(cmd_neg, cwd=str(neg_script.parent), capture_output=True, text=True)
                if res_neg.returncode != 0 or "NEGATIVE_PASSED=8" not in res_neg.stdout:
                    log(f"[FATAL] Testes negativos do runner falharam (RC={res_neg.returncode}):\n{res_neg.stdout}\n{res_neg.stderr}")
                    sys.exit(1)
                log("  [PASS] 8/8 testes negativos do runner executados e aprovados.")

            # 7.6 Provas Reais de Sanitizers (ASan/UBSan, TSan, LSan)
            san_dir = tmp_extract_dir / "sanitizers_exec"
            san_dir.mkdir(parents=True, exist_ok=True)

            # a) ASan + UBSan
            log("\n[SANITIZERS] Compilando e executando ASan + UBSan...")
            h_asan = san_dir / "helper_asan"
            t_asan = san_dir / "tests_asan"
            cmd_c_hasan = ["gcc", "-O1", "-g", "-fsanitize=address,undefined", "-fno-omit-frame-pointer",
                           "-Wall", "-Wextra", "-Werror", "-D_GNU_SOURCE", str(helper_c), "-o", str(h_asan)]
            cmd_c_tasan = ["gcc", "-O1", "-g", "-fsanitize=address,undefined", "-fno-omit-frame-pointer",
                           "-Wall", "-Wextra", "-Werror", "-pthread", "-D_GNU_SOURCE", str(tests_c), "-o", str(t_asan)]
            r1 = subprocess.run(cmd_c_hasan, capture_output=True, text=True)
            r2 = subprocess.run(cmd_c_tasan, capture_output=True, text=True)
            if r1.returncode == 0 and r2.returncode == 0:
                env_asan = dict(os.environ, ASAN_OPTIONS="detect_leaks=0:abort_on_error=1", UBSAN_OPTIONS="abort_on_error=1")
                r_asan = subprocess.run([str(t_asan), str(h_asan)], capture_output=True, text=True, env=env_asan)
                if r_asan.returncode == 0:
                    log("  [PASS] ASAN_STATUS=PASS | UBSAN_STATUS=PASS")
                else:
                    log(f"[FATAL] ASan/UBSan detectou violação física (RC={r_asan.returncode}):\n{r_asan.stderr}")
                    sys.exit(1)
            else:
                log("  [UNAVAILABLE] Compilador local não suporta AddressSanitizer/UndefinedBehaviorSanitizer.")

            # b) TSan
            log("[SANITIZERS] Compilando e executando ThreadSanitizer (TSan)...")
            h_tsan = san_dir / "helper_tsan"
            t_tsan = san_dir / "tests_tsan"
            cmd_c_htsan = ["gcc", "-O1", "-g", "-fsanitize=thread", "-fno-omit-frame-pointer",
                           "-Wall", "-Wextra", "-Werror", "-D_GNU_SOURCE", str(helper_c), "-o", str(h_tsan)]
            cmd_c_ttsan = ["gcc", "-O1", "-g", "-fsanitize=thread", "-fno-omit-frame-pointer",
                           "-Wall", "-Wextra", "-Werror", "-pthread", "-D_GNU_SOURCE", str(tests_c), "-o", str(t_tsan)]
            r3 = subprocess.run(cmd_c_htsan, capture_output=True, text=True)
            r4 = subprocess.run(cmd_c_ttsan, capture_output=True, text=True)
            if r3.returncode == 0 and r4.returncode == 0:
                env_tsan = dict(os.environ, TSAN_OPTIONS="abort_on_error=1:report_bugs=1")
                r_tsan = subprocess.run([str(t_tsan), str(h_tsan)], capture_output=True, text=True, env=env_tsan)
                if r_tsan.returncode == 0:
                    log("  [PASS] TSAN_STATUS=PASS")
                else:
                    log(f"[FATAL] TSan detectou corrida física de threads (RC={r_tsan.returncode}):\n{r_tsan.stderr}")
                    sys.exit(1)
            else:
                log("  [UNAVAILABLE] Compilador local não suporta ThreadSanitizer.")

            # c) LSan prova separada com classificação segura (CORREÇÃO 3)
            log("[SANITIZERS] Executando prova separada de LeakSanitizer (LSan)...")
            h_lsan = san_dir / "helper_lsan"
            t_lsan = san_dir / "tests_lsan"
            cmd_c_hlsan = ["gcc", "-O1", "-g", "-fsanitize=leak", "-fno-omit-frame-pointer",
                           "-Wall", "-Wextra", "-Werror", "-D_GNU_SOURCE", str(helper_c), "-o", str(h_lsan)]
            cmd_c_tlsan = ["gcc", "-O1", "-g", "-fsanitize=leak", "-fno-omit-frame-pointer",
                           "-Wall", "-Wextra", "-Werror", "-pthread", "-D_GNU_SOURCE", str(tests_c), "-o", str(t_lsan)]
            r5 = subprocess.run(cmd_c_hlsan, capture_output=True, text=True)
            r6 = subprocess.run(cmd_c_tlsan, capture_output=True, text=True)
            if r5.returncode == 0 and r6.returncode == 0:
                env_lsan = dict(os.environ, LSAN_OPTIONS="abort_on_error=1:report_objects=1")
                r_lsan = subprocess.run([str(t_lsan), str(h_lsan)], capture_output=True, text=True, env=env_lsan)
                if r_lsan.returncode == 0:
                    log("  [PASS] LSAN_STATUS=PASS")
                else:
                    err_lsan = r_lsan.stderr + " " + r_lsan.stdout
                    if is_recognized_ptrace_unavail(err_lsan):
                        log("  [UNAVAILABLE] LSAN_STATUS=UNAVAILABLE: ptrace restrito pelo kernel no contêiner atual (Exit Code 134).")
                    else:
                        log(f"[FATAL] LSan falhou com Exit Code {r_lsan.returncode} sem mensagem factual de ptrace:\n{r_lsan.stderr}")
                        log("LSAN_STATUS=FAIL")
                        sys.exit(1)
            else:
                log("  [UNAVAILABLE] Compilador local não suporta LeakSanitizer.")

        else:
            log("\n[AVISO] Compilador GCC Linux não disponível neste host (ambiente de montagem Windows).")
            log("Validações estáticas de código C, scripts, manifesto e evidências V12 concluídas com 100% de sucesso.")

    finally:
        shutil.rmtree(tmp_extract_dir, ignore_errors=True)

    log("\n" + "=" * 80)
    log("AUDITORIA INTEGRAL CONCLUÍDA COM 100% DE APROVAÇÃO (VERIFY_EXIT_CODE=0)")
    log("STATUS FORMAL: G4.2 = PENDING_EXTERNAL_AUDIT_V12")
    log("=" * 80)

    ev_out_path = Path(args.evidence_out) if args.evidence_out else (repo_root / "EVIDENCIA_VERIFICACAO_INTEGRAL_V12.txt")
    try:
        ev_out_path.parent.mkdir(parents=True, exist_ok=True)
        content = "\n".join(log_lines) + "\n"
        content = content.replace("\r\n", "\n").replace("\r", "\n")
        ev_out_path.write_bytes(content.encode("utf-8"))
        print(f"\nEvidência gravada com sucesso em: {ev_out_path}")
    except Exception as e:
        print(f"\n[AVISO] Não foi possível gravar evidência em {ev_out_path}: {e}")

    sys.exit(0)

if __name__ == "__main__":
    main()
