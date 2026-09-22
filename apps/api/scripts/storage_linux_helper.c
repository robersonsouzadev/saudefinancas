#ifndef _GNU_SOURCE
#define _GNU_SOURCE
#endif

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <fcntl.h>
#include <unistd.h>
#include <sys/stat.h>
#include <sys/syscall.h>
#include <sys/types.h>
#include <errno.h>
#include <stdint.h>
#include <time.h>
#include <signal.h>

/**
 * HELPER LINUX DE OPERAÇÕES RELATIVAS A DESCRITOR (ANTI-TOCTOU) — VITA SAÚDE (G4.2 V12)
 *
 * Arquitetura de Navegação Integral Baseada em Descritores:
 * - A raiz é aberta uma única vez com O_DIRECTORY | O_CLOEXEC | O_NOFOLLOW.
 * - Cada diretório intermediário é resolvido passo a passo usando openat2() com:
 *     RESOLVE_BENEATH | RESOLVE_NO_SYMLINKS | RESOLVE_NO_MAGICLINKS
 * - Toda operação de mutação (write, unlink, stat) ocorre exclusivamente sobre o
 *   basename validado, relativo ao descritor seguro do diretório pai.
 * - Nenhuma syscall recebe caminhos compostos.
 * - Publicação atômica rigorosa: escrita em temporário no mesmo diretório pai,
 *   fchmod 0600, fsync, renameat2(RENAME_NOREPLACE) e fsync no diretório pai.
 *
 * Códigos de Saída Padronizados (Exit Codes):
 *   0: EXIT_OK              - Sucesso operacional
 *   1: EXIT_ERR_OPERATIONAL - Erro operacional (ENOENT, IO error, invalid args)
 *   2: EXIT_ERR_CONFLICT    - Conflito (EEXIST no renameat2 RENAME_NOREPLACE)
 *   3: EXIT_ERR_SECURITY    - Violação de segurança (symlink, traversal, escape da raiz)
 *   4: EXIT_ERR_UNAVAILABLE - Syscall ou recurso do kernel indisponível (ENOSYS)
 */

#define EXIT_OK                 0
#define EXIT_ERR_OPERATIONAL    1
#define EXIT_ERR_CONFLICT       2
#define EXIT_ERR_SECURITY       3
#define EXIT_ERR_UNAVAILABLE    4

#ifndef __NR_openat2
#if defined(__x86_64__)
#define __NR_openat2 437
#elif defined(__aarch64__)
#define __NR_openat2 437
#elif defined(__i386__)
#define __NR_openat2 437
#endif
#endif

#ifndef SYS_renameat2
#if defined(__x86_64__)
#define SYS_renameat2 316
#elif defined(__aarch64__)
#define SYS_renameat2 276
#endif
#endif

#ifndef RESOLVE_NO_XDEV
#define RESOLVE_NO_XDEV 0x01
#endif
#ifndef RESOLVE_NO_MAGICLINKS
#define RESOLVE_NO_MAGICLINKS 0x02
#endif
#ifndef RESOLVE_NO_SYMLINKS
#define RESOLVE_NO_SYMLINKS 0x04
#endif
#ifndef RESOLVE_BENEATH
#define RESOLVE_BENEATH 0x08
#endif

#ifndef RENAME_NOREPLACE
#define RENAME_NOREPLACE (1 << 0)
#endif

struct open_how {
    uint64_t flags;
    uint64_t mode;
    uint64_t resolve;
};

static inline int sys_openat2(int dfd, const char *path, struct open_how *how, size_t size) {
#ifdef __NR_openat2
    errno = 0;
    return (int)syscall(__NR_openat2, dfd, path, how, size);
#else
    (void)dfd; (void)path; (void)how; (void)size;
    errno = ENOSYS;
    return -1;
#endif
}

static inline int sys_renameat2(int olddfd, const char *oldpath, int newdfd, const char *newpath, unsigned int flags) {
#ifdef SYS_renameat2
    errno = 0;
    return (int)syscall(SYS_renameat2, olddfd, oldpath, newdfd, newpath, flags);
#else
    (void)olddfd; (void)oldpath; (void)newdfd; (void)newpath; (void)flags;
    errno = ENOSYS;
    return -1;
#endif
}

/**
 * Valida um único componente de caminho (não pode ser vazio, nem '.' ou '..',
 * não pode conter barras ou NUL, tamanho entre 1 e 255 bytes).
 */
static int validate_component(const char *comp) {
    if (!comp) return 0;
    size_t len = strlen(comp);
    if (len == 0 || len > 255) return 0;
    if (strcmp(comp, ".") == 0 || strcmp(comp, "..") == 0) return 0;
    for (size_t i = 0; i < len; i++) {
        unsigned char c = (unsigned char)comp[i];
        if (c == '/' || c == '\0' || c < 32 || c == 127) {
            return 0;
        }
    }
    return 1;
}

/**
 * Abre a raiz do storage com flags estritas.
 */
static int open_storage_root(const char *root_path) {
    if (!root_path || strlen(root_path) == 0) {
        fprintf(stderr, "[SECURITY_ERROR] Caminho da raiz vazio ou nulo.\n");
        return -1;
    }
    errno = 0;
    int dfd = open(root_path, O_RDONLY | O_DIRECTORY | O_CLOEXEC | O_NOFOLLOW);
    if (dfd < 0) {
        fprintf(stderr, "[ERROR] Falha ao abrir diretório base (%s): %s\n", root_path, strerror(errno));
        return -1;
    }
    return dfd;
}

/**
 * Resolve os diretórios intermediários componente a componente a partir de root_dfd
 * utilizando openat2 com RESOLVE_BENEATH | RESOLVE_NO_SYMLINKS | RESOLVE_NO_MAGICLINKS.
 *
 * Retorna o descritor seguro do diretório pai direto e preenche out_basename.
 * NUNCA passa caminhos compostos para qualquer syscall de mutação.
 */
static int resolve_parent_and_basename(int root_dfd, const char *rel_path, char *out_basename, size_t max_basename_len, int *out_exit_code) {
    *out_exit_code = EXIT_ERR_OPERATIONAL;

    if (!rel_path || strlen(rel_path) == 0) {
        fprintf(stderr, "[SECURITY_ERROR] Caminho relativo vazio ou nulo.\n");
        *out_exit_code = EXIT_ERR_SECURITY;
        return -1;
    }

    // Rejeitar caminhos absolutos, barras finais, barras duplas e traversals
    if (rel_path[0] == '/') {
        fprintf(stderr, "[SECURITY_ERROR] Caminho absoluto proibido: %s\n", rel_path);
        *out_exit_code = EXIT_ERR_SECURITY;
        return -1;
    }
    size_t path_len = strlen(rel_path);
    if (rel_path[path_len - 1] == '/') {
        fprintf(stderr, "[SECURITY_ERROR] Barra final inesperada em caminho de arquivo: %s\n", rel_path);
        *out_exit_code = EXIT_ERR_SECURITY;
        return -1;
    }
    if (strstr(rel_path, "//") != NULL || strstr(rel_path, "..") != NULL) {
        fprintf(stderr, "[SECURITY_ERROR] Sequência proibida ('//' ou '..') em: %s\n", rel_path);
        *out_exit_code = EXIT_ERR_SECURITY;
        return -1;
    }

    // Fazer cópia mutável para tokenização
    char path_buf[4096];
    if (path_len >= sizeof(path_buf)) {
        fprintf(stderr, "[SECURITY_ERROR] Caminho excede tamanho máximo suportado (4095).\n");
        *out_exit_code = EXIT_ERR_SECURITY;
        return -1;
    }
    memcpy(path_buf, rel_path, path_len + 1);

    // Separar componentes
    char *components[64];
    int comp_count = 0;
    char *token = strtok(path_buf, "/");
    while (token != NULL) {
        if (comp_count >= 64) {
            fprintf(stderr, "[SECURITY_ERROR] Profundidade de diretórios excessiva (> 64).\n");
            *out_exit_code = EXIT_ERR_SECURITY;
            return -1;
        }
        if (!validate_component(token)) {
            fprintf(stderr, "[SECURITY_ERROR] Componente inválido detectado: '%s'\n", token);
            *out_exit_code = EXIT_ERR_SECURITY;
            return -1;
        }
        components[comp_count++] = token;
        token = strtok(NULL, "/");
    }

    if (comp_count == 0) {
        fprintf(stderr, "[SECURITY_ERROR] Nenhum componente válido encontrado no caminho.\n");
        *out_exit_code = EXIT_ERR_SECURITY;
        return -1;
    }

    // O último componente é estritamente o basename
    const char *base = components[comp_count - 1];
    if (strlen(base) >= max_basename_len) {
        fprintf(stderr, "[SECURITY_ERROR] Basename excede buffer de destino.\n");
        *out_exit_code = EXIT_ERR_SECURITY;
        return -1;
    }
    strncpy(out_basename, base, max_basename_len - 1);
    out_basename[max_basename_len - 1] = '\0';

    // Duplicar root_dfd para começar a cadeia de navegação
    errno = 0;
    int curr_dfd = fcntl(root_dfd, F_DUPFD_CLOEXEC, 0);
    if (curr_dfd < 0) {
        fprintf(stderr, "[ERROR] Falha no fcntl F_DUPFD_CLOEXEC: %s\n", strerror(errno));
        *out_exit_code = EXIT_ERR_OPERATIONAL;
        return -1;
    }

    // Resolver cada diretório pai intermediário estritamente com openat2
    for (int i = 0; i < comp_count - 1; i++) {
        const char *dir_name = components[i];
        struct open_how how;
        memset(&how, 0, sizeof(how));
        how.flags = O_RDONLY | O_DIRECTORY | O_CLOEXEC | O_NOFOLLOW;
        how.resolve = RESOLVE_BENEATH | RESOLVE_NO_SYMLINKS | RESOLVE_NO_MAGICLINKS;

        errno = 0;
        int next_dfd = sys_openat2(curr_dfd, dir_name, &how, sizeof(how));
        int saved_errno = errno;

        if (next_dfd < 0) {
            // Context analysis antes de fechar curr_dfd
            struct stat st;
            errno = 0;
            int st_res = fstatat(curr_dfd, dir_name, &st, AT_SYMLINK_NOFOLLOW);

            close(curr_dfd);

            if (saved_errno == ENOSYS) {
                fprintf(stderr, "[UNAVAILABLE_ERROR] openat2 não suportado pelo kernel (ENOSYS).\n");
                *out_exit_code = EXIT_ERR_UNAVAILABLE;
            } else if (saved_errno == ELOOP || saved_errno == EXDEV || saved_errno == EEXIST) {
                fprintf(stderr, "[SECURITY_ERROR] Violação de segurança/symlink em '%s': %s\n", dir_name, strerror(saved_errno));
                *out_exit_code = EXIT_ERR_SECURITY;
            } else if (st_res == 0 && (S_ISLNK(st.st_mode) || !S_ISDIR(st.st_mode))) {
                fprintf(stderr, "[SECURITY_ERROR] Componente intermediário '%s' é symlink ou não-diretório (modo 0%o, errno %d: %s)\n",
                        dir_name, (unsigned int)(st.st_mode & S_IFMT), saved_errno, strerror(saved_errno));
                *out_exit_code = EXIT_ERR_SECURITY;
            } else if (saved_errno == ENOTDIR) {
                fprintf(stderr, "[SECURITY_ERROR] Componente intermediário '%s' não é diretório (ENOTDIR).\n", dir_name);
                *out_exit_code = EXIT_ERR_SECURITY;
            } else if (saved_errno == ENOENT) {
                fprintf(stderr, "[ERROR] Diretório pai '%s' não encontrado (ENOENT).\n", dir_name);
                *out_exit_code = EXIT_ERR_OPERATIONAL;
            } else {
                fprintf(stderr, "[ERROR] Falha ao abrir diretório pai '%s': %s\n", dir_name, strerror(saved_errno));
                *out_exit_code = EXIT_ERR_OPERATIONAL;
            }
            return -1;
        }

        close(curr_dfd);
        curr_dfd = next_dfd;
    }

    *out_exit_code = EXIT_OK;
    return curr_dfd;
}

/**
 * 1. PROBE DE CAPABILITIES
 * Avalia funcionalidade real de openat2, renameat2(RENAME_NOREPLACE) e /proc/self/fd.
 * Retorna EXIT_OK (0) ou EXIT_ERR_UNAVAILABLE (4).
 */
static int cmd_probe(void) {
    char template_dir[] = "/tmp/vita_storage_probe_XXXXXX";
    errno = 0;
    char *tmp_dir = mkdtemp(template_dir);
    if (!tmp_dir) {
        fprintf(stderr, "[ERROR] probe: Falha ao criar diretório temporário: %s\n", strerror(errno));
        return EXIT_ERR_OPERATIONAL;
    }

    errno = 0;
    int root_dfd = open(tmp_dir, O_RDONLY | O_DIRECTORY | O_CLOEXEC | O_NOFOLLOW);
    if (root_dfd < 0) {
        fprintf(stderr, "[ERROR] probe: Falha ao abrir dir temporário: %s\n", strerror(errno));
        rmdir(tmp_dir);
        return EXIT_ERR_OPERATIONAL;
    }

    // 1. Testar openat2 com RESOLVE_BENEATH | RESOLVE_NO_SYMLINKS | RESOLVE_NO_MAGICLINKS
    struct open_how how;
    memset(&how, 0, sizeof(how));
    how.flags = O_WRONLY | O_CREAT | O_EXCL | O_CLOEXEC | O_NOFOLLOW;
    how.mode = 0600;
    how.resolve = RESOLVE_BENEATH | RESOLVE_NO_SYMLINKS | RESOLVE_NO_MAGICLINKS;

    errno = 0;
    int probe_fd = sys_openat2(root_dfd, "probe_test_file.tmp", &how, sizeof(how));
    if (probe_fd < 0) {
        int err = errno;
        close(root_dfd);
        unlinkat(AT_FDCWD, template_dir, AT_REMOVEDIR);
        if (err == ENOSYS) {
            fprintf(stderr, "[UNAVAILABLE_ERROR] probe: openat2 ausente no kernel (ENOSYS).\n");
            return EXIT_ERR_UNAVAILABLE;
        }
        fprintf(stderr, "[ERROR] probe: openat2 falhou: %s\n", strerror(err));
        return EXIT_ERR_OPERATIONAL;
    }

    const char test_data[] = "vita_saude_probe_atomic_payload_2026";
    ssize_t written = write(probe_fd, test_data, sizeof(test_data));
    (void)written;
    fchmod(probe_fd, 0600);
    fdatasync(probe_fd);
    close(probe_fd);

    // 2. Testar renameat2 com RENAME_NOREPLACE
    errno = 0;
    int r1 = sys_renameat2(root_dfd, "probe_test_file.tmp", root_dfd, "probe_test_file.final", RENAME_NOREPLACE);
    if (r1 != 0) {
        int err = errno;
        close(root_dfd);
        unlinkat(AT_FDCWD, template_dir, AT_REMOVEDIR);
        if (err == ENOSYS) {
            fprintf(stderr, "[UNAVAILABLE_ERROR] probe: renameat2 ausente no kernel (ENOSYS).\n");
            return EXIT_ERR_UNAVAILABLE;
        }
        fprintf(stderr, "[ERROR] probe: renameat2 falhou: %s\n", strerror(err));
        return EXIT_ERR_OPERATIONAL;
    }

    // 3. Testar se renameat2 com RENAME_NOREPLACE falha com EEXIST quando destino existe
    errno = 0;
    int probe_fd2 = sys_openat2(root_dfd, "probe_test_file.tmp2", &how, sizeof(how));
    if (probe_fd2 >= 0) {
        close(probe_fd2);
        errno = 0;
        int r2 = sys_renameat2(root_dfd, "probe_test_file.tmp2", root_dfd, "probe_test_file.final", RENAME_NOREPLACE);
        if (r2 == 0 || errno != EEXIST) {
            fprintf(stderr, "[SECURITY_ERROR] probe: renameat2 RENAME_NOREPLACE não retornou EEXIST.\n");
            unlinkat(root_dfd, "probe_test_file.tmp2", 0);
            unlinkat(root_dfd, "probe_test_file.final", 0);
            close(root_dfd);
            rmdir(tmp_dir);
            return EXIT_ERR_SECURITY;
        }
        unlinkat(root_dfd, "probe_test_file.tmp2", 0);
    }
    unlinkat(root_dfd, "probe_test_file.final", 0);

    // 4. Testar disponibilidade de /proc/self/fd com verificação segura de buffer
    char proc_path[64];
    int n_proc = snprintf(proc_path, sizeof(proc_path), "/proc/self/fd/%d", root_dfd);
    struct stat proc_st;
    errno = 0;
    int proc_ok = (n_proc > 0 && (size_t)n_proc < sizeof(proc_path) && stat(proc_path, &proc_st) == 0);

    fsync(root_dfd);
    close(root_dfd);
    rmdir(tmp_dir);

    // Saída estruturada do probe
    printf("{\"status\":\"ok\",\"openat2\":true,\"renameat2_noreplace\":true,\"proc_self_fd\":%s}\n",
           proc_ok ? "true" : "false");
    return EXIT_OK;
}

/**
 * 2. PUBLICAÇÃO REALMENTE ATÔMICA (PUT)
 * Fluxo Inviolável:
 * - Resolve o descritor seguro do diretório pai via openat2.
 * - Cria temporário (.tmp.<base>.<pid>.<rand>) no mesmo diretório pai via openat2 com O_CREAT|O_EXCL|O_NOFOLLOW.
 * - Escreve TODO o payload da stdin.
 * - fchmod 0600 e fsync(tmp_fd).
 * - Fecha tmp_fd.
 * - Failpoint opcional de pausa para testes físicos de crash com SIGKILL.
 * - renameat2(parent_fd, tmp, parent_fd, base, RENAME_NOREPLACE).
 * - fsync(parent_dfd).
 * - Se falhar, remove apenas o arquivo temporário pertencente a esta operação.
 */
static int cmd_put(const char *root_dir, const char *rel_path) {
    int root_dfd = open_storage_root(root_dir);
    if (root_dfd < 0) return EXIT_ERR_OPERATIONAL;

    char basename_buf[256];
    int exit_code = EXIT_ERR_OPERATIONAL;
    int parent_dfd = resolve_parent_and_basename(root_dfd, rel_path, basename_buf, sizeof(basename_buf), &exit_code);
    close(root_dfd);
    if (parent_dfd < 0) {
        return exit_code;
    }

    // Gerar nome único para o temporário com verificação explícita de tamanho
    char tmp_name[512];
    struct timespec ts;
    clock_gettime(CLOCK_REALTIME, &ts);
    int n_tmp = snprintf(tmp_name, sizeof(tmp_name), ".tmp.%s.%d.%ld.%d",
                         basename_buf, (int)getpid(), (long)ts.tv_nsec, rand());
    if (n_tmp < 0 || (size_t)n_tmp >= sizeof(tmp_name)) {
        fprintf(stderr, "[ERROR] Nome de arquivo temporário excede buffer.\n");
        close(parent_dfd);
        return EXIT_ERR_OPERATIONAL;
    }

    // Abrir arquivo temporário seguro
    struct open_how how;
    memset(&how, 0, sizeof(how));
    how.flags = O_WRONLY | O_CREAT | O_EXCL | O_CLOEXEC | O_NOFOLLOW;
    how.mode = 0600;
    how.resolve = RESOLVE_BENEATH | RESOLVE_NO_SYMLINKS | RESOLVE_NO_MAGICLINKS;

    errno = 0;
    int tmp_fd = sys_openat2(parent_dfd, tmp_name, &how, sizeof(how));
    if (tmp_fd < 0) {
        int err = errno;
        close(parent_dfd);
        if (err == ENOSYS) return EXIT_ERR_UNAVAILABLE;
        if (err == ELOOP || err == EXDEV) return EXIT_ERR_SECURITY;
        fprintf(stderr, "[ERROR] Falha ao criar temporário '%s': %s\n", tmp_name, strerror(err));
        return EXIT_ERR_OPERATIONAL;
    }

    // Ler stdin em blocos e gravar no temporário
    char buf[65536];
    ssize_t bytes_read;
    int write_failed = 0;
    while ((bytes_read = read(STDIN_FILENO, buf, sizeof(buf))) > 0) {
        ssize_t total_written = 0;
        while (total_written < bytes_read) {
            errno = 0;
            ssize_t w = write(tmp_fd, buf + total_written, bytes_read - total_written);
            if (w <= 0) {
                write_failed = 1;
                break;
            }
            total_written += w;
        }
        if (write_failed) break;
    }

    if (bytes_read < 0 || write_failed) {
        fprintf(stderr, "[ERROR] Falha de escrita no arquivo temporário.\n");
        close(tmp_fd);
        unlinkat(parent_dfd, tmp_name, 0);
        close(parent_dfd);
        return EXIT_ERR_OPERATIONAL;
    }

    // Aplicar permissões restritas 0600
    if (fchmod(tmp_fd, 0600) != 0) {
        fprintf(stderr, "[ERROR] fchmod 0600 falhou: %s\n", strerror(errno));
        close(tmp_fd);
        unlinkat(parent_dfd, tmp_name, 0);
        close(parent_dfd);
        return EXIT_ERR_OPERATIONAL;
    }

    // fsync obrigatório no arquivo temporário antes da publicação
    if (fsync(tmp_fd) != 0) {
        fprintf(stderr, "[ERROR] fsync falhou no temporário: %s\n", strerror(errno));
        close(tmp_fd);
        unlinkat(parent_dfd, tmp_name, 0);
        close(parent_dfd);
        return EXIT_ERR_OPERATIONAL;
    }

    // Fechar descritor do temporário antes do rename
    close(tmp_fd);

    // Failpoint de teste físico: pausar para permitir interrupção/SIGKILL externo após fsync
    const char *fp_pause = getenv("VITA_FAILPOINT_PAUSE_BEFORE_RENAME");
    if (fp_pause && strcmp(fp_pause, "1") == 0) {
        fprintf(stderr, "[FAILPOINT] READY_FOR_SIGKILL_PID=%d\n", (int)getpid());
        fflush(stderr);
        sleep(10);
    }

    // Publicação estritamente atômica usando renameat2 com RENAME_NOREPLACE
    errno = 0;
    int ren_res = sys_renameat2(parent_dfd, tmp_name, parent_dfd, basename_buf, RENAME_NOREPLACE);
    int ren_err = errno;

    if (ren_res != 0) {
        // Falha no rename: remover exclusivamente nosso arquivo temporário
        unlinkat(parent_dfd, tmp_name, 0);
        close(parent_dfd);

        if (ren_err == EEXIST) {
            fprintf(stderr, "[CONFLICT] Destino '%s' já existe (RENAME_NOREPLACE recusou sobrescrita).\n", basename_buf);
            return EXIT_ERR_CONFLICT;
        }
        if (ren_err == ENOSYS) {
            fprintf(stderr, "[UNAVAILABLE_ERROR] renameat2 ausente no kernel (ENOSYS).\n");
            return EXIT_ERR_UNAVAILABLE;
        }
        if (ren_err == ELOOP || ren_err == EXDEV) {
            fprintf(stderr, "[SECURITY_ERROR] renameat2 violação de link/dispositivo: %s\n", strerror(ren_err));
            return EXIT_ERR_SECURITY;
        }

        fprintf(stderr, "[ERROR] renameat2 falhou: %s\n", strerror(ren_err));
        return EXIT_ERR_OPERATIONAL;
    }

    // fsync obrigatório no diretório pai após o rename para persistência de metadata
    if (fsync(parent_dfd) != 0) {
        fprintf(stderr, "[WARNING] fsync falhou no diretório pai: %s\n", strerror(errno));
    }

    close(parent_dfd);
    return EXIT_OK;
}

/**
 * 3. LEITURA SEGURA (READ)
 * Abre descritor com openat2(RESOLVE_BENEATH | RESOLVE_NO_SYMLINKS) e valida S_ISREG.
 */
static int cmd_read(const char *root_dir, const char *rel_path) {
    int root_dfd = open_storage_root(root_dir);
    if (root_dfd < 0) return EXIT_ERR_OPERATIONAL;

    char basename_buf[256];
    int exit_code = EXIT_ERR_OPERATIONAL;
    int parent_dfd = resolve_parent_and_basename(root_dfd, rel_path, basename_buf, sizeof(basename_buf), &exit_code);
    close(root_dfd);
    if (parent_dfd < 0) return exit_code;

    struct open_how how;
    memset(&how, 0, sizeof(how));
    how.flags = O_RDONLY | O_CLOEXEC | O_NOFOLLOW;
    how.resolve = RESOLVE_BENEATH | RESOLVE_NO_SYMLINKS | RESOLVE_NO_MAGICLINKS;

    errno = 0;
    int fd = sys_openat2(parent_dfd, basename_buf, &how, sizeof(how));
    int err = errno;
    close(parent_dfd);

    if (fd < 0) {
        if (err == ENOENT) return EXIT_ERR_OPERATIONAL;
        if (err == ENOSYS) return EXIT_ERR_UNAVAILABLE;
        if (err == ELOOP || err == EXDEV) return EXIT_ERR_SECURITY;
        fprintf(stderr, "[ERROR] openat2 leitura falhou para '%s': %s\n", basename_buf, strerror(err));
        return EXIT_ERR_OPERATIONAL;
    }

    // Verificar se é estritamente arquivo regular
    struct stat st;
    if (fstat(fd, &st) != 0 || !S_ISREG(st.st_mode)) {
        fprintf(stderr, "[SECURITY_ERROR] Alvo '%s' não é um arquivo regular.\n", basename_buf);
        close(fd);
        return EXIT_ERR_SECURITY;
    }

    // Despejar na stdout
    char buf[65536];
    ssize_t bytes_read;
    while ((bytes_read = read(fd, buf, sizeof(buf))) > 0) {
        ssize_t total_written = 0;
        while (total_written < bytes_read) {
            errno = 0;
            ssize_t w = write(STDOUT_FILENO, buf + total_written, bytes_read - total_written);
            if (w <= 0) {
                close(fd);
                if (errno == EPIPE) return EXIT_OK;
                return EXIT_ERR_OPERATIONAL;
            }
            total_written += w;
        }
    }
    close(fd);
    return EXIT_OK;
}

/**
 * 4. EXCLUSÃO SEGURA (UNLINK)
 * Valida que o basename não é symlink e executa unlinkat estritamente sobre o basename no parent_dfd seguro.
 */
static int cmd_unlink(const char *root_dir, const char *rel_path) {
    int root_dfd = open_storage_root(root_dir);
    if (root_dfd < 0) return EXIT_ERR_OPERATIONAL;

    char basename_buf[256];
    int exit_code = EXIT_ERR_OPERATIONAL;
    int parent_dfd = resolve_parent_and_basename(root_dfd, rel_path, basename_buf, sizeof(basename_buf), &exit_code);
    close(root_dfd);
    if (parent_dfd < 0) return exit_code;

    // Failpoint de teste de concorrência: sincronizar após resolução do pai e antes do unlinkat
    const char *fp_unlink_pause = getenv("VITA_FAILPOINT_PAUSE_BEFORE_UNLINK");
    if (fp_unlink_pause && strcmp(fp_unlink_pause, "1") == 0) {
        fprintf(stderr, "[FAILPOINT] READY_FOR_PARENT_SWAP_ATTACK_PID=%d\n", (int)getpid());
        fflush(stderr);
        usleep(150000); // 150 ms para permitir tentativa de substituição concorrente
    }

    // Verificar se o alvo a ser excluído é estritamente arquivo regular
    struct stat st;
    errno = 0;
    if (fstatat(parent_dfd, basename_buf, &st, AT_SYMLINK_NOFOLLOW) != 0) {
        int err = errno;
        close(parent_dfd);
        if (err == ENOENT) return EXIT_ERR_OPERATIONAL;
        return EXIT_ERR_OPERATIONAL;
    }

    if (S_ISLNK(st.st_mode) || !S_ISREG(st.st_mode)) {
        fprintf(stderr, "[SECURITY_ERROR] unlink recusado: '%s' não é um arquivo regular (symlink/dir detectado).\n", basename_buf);
        close(parent_dfd);
        return EXIT_ERR_SECURITY;
    }

    errno = 0;
    int r = unlinkat(parent_dfd, basename_buf, 0);
    int err = errno;

    if (r != 0) {
        close(parent_dfd);
        if (err == ENOENT) return EXIT_ERR_OPERATIONAL;
        fprintf(stderr, "[ERROR] unlinkat falhou para '%s': %s\n", basename_buf, strerror(err));
        return EXIT_ERR_OPERATIONAL;
    }

    fsync(parent_dfd);
    close(parent_dfd);
    return EXIT_OK;
}

/**
 * 5. STAT SEGURO (STAT)
 * Abre descritor do arquivo com O_PATH | O_NOFOLLOW e obtém fstat.
 */
static int cmd_stat(const char *root_dir, const char *rel_path) {
    int root_dfd = open_storage_root(root_dir);
    if (root_dfd < 0) return EXIT_ERR_OPERATIONAL;

    char basename_buf[256];
    int exit_code = EXIT_ERR_OPERATIONAL;
    int parent_dfd = resolve_parent_and_basename(root_dfd, rel_path, basename_buf, sizeof(basename_buf), &exit_code);
    close(root_dfd);
    if (parent_dfd < 0) return exit_code;

    struct open_how how;
    memset(&how, 0, sizeof(how));
    how.flags = O_RDONLY | O_CLOEXEC | O_NOFOLLOW;
    how.resolve = RESOLVE_BENEATH | RESOLVE_NO_SYMLINKS | RESOLVE_NO_MAGICLINKS;

    errno = 0;
    int fd = sys_openat2(parent_dfd, basename_buf, &how, sizeof(how));
    int err = errno;
    close(parent_dfd);

    if (fd < 0) {
        if (err == ENOENT) return EXIT_ERR_OPERATIONAL;
        if (err == ENOSYS) return EXIT_ERR_UNAVAILABLE;
        if (err == ELOOP || err == EXDEV) return EXIT_ERR_SECURITY;
        return EXIT_ERR_OPERATIONAL;
    }

    struct stat st;
    if (fstat(fd, &st) != 0) {
        close(fd);
        return EXIT_ERR_OPERATIONAL;
    }
    close(fd);

    printf("{\"size\":%lld,\"mode\":%u,\"isReg\":%s}\n",
           (long long)st.st_size, (unsigned int)(st.st_mode & 0777),
           S_ISREG(st.st_mode) ? "true" : "false");
    return EXIT_OK;
}

int main(int argc, char *argv[]) {
    // Ignorar explicitamente SIGPIPE para resiliência de I/O em pipelines e pipes
    struct sigaction sa_pipe;
    memset(&sa_pipe, 0, sizeof(sa_pipe));
    sa_pipe.sa_handler = SIG_IGN;
    sigemptyset(&sa_pipe.sa_mask);
    sa_pipe.sa_flags = 0;
    if (sigaction(SIGPIPE, &sa_pipe, NULL) != 0) {
        signal(SIGPIPE, SIG_IGN);
    }

    if (argc < 2) {
        fprintf(stderr, "Uso: %s <probe|put|read|unlink|stat> [args...]\n", argv[0]);
        return EXIT_ERR_OPERATIONAL;
    }

    const char *action = argv[1];

    if (strcmp(action, "probe") == 0) {
        return cmd_probe();
    } else if (strcmp(action, "put") == 0) {
        if (argc < 4) {
            fprintf(stderr, "Uso: %s put <root_dir> <rel_path>\n", argv[0]);
            return EXIT_ERR_OPERATIONAL;
        }
        return cmd_put(argv[2], argv[3]);
    } else if (strcmp(action, "read") == 0) {
        if (argc < 4) {
            fprintf(stderr, "Uso: %s read <root_dir> <rel_path>\n", argv[0]);
            return EXIT_ERR_OPERATIONAL;
        }
        return cmd_read(argv[2], argv[3]);
    } else if (strcmp(action, "unlink") == 0) {
        if (argc < 4) {
            fprintf(stderr, "Uso: %s unlink <root_dir> <rel_path>\n", argv[0]);
            return EXIT_ERR_OPERATIONAL;
        }
        return cmd_unlink(argv[2], argv[3]);
    } else if (strcmp(action, "stat") == 0) {
        if (argc < 4) {
            fprintf(stderr, "Uso: %s stat <root_dir> <rel_path>\n", argv[0]);
            return EXIT_ERR_OPERATIONAL;
        }
        return cmd_stat(argv[2], argv[3]);
    } else {
        fprintf(stderr, "[ERROR] Ação desconhecida: '%s'\n", action);
        return EXIT_ERR_OPERATIONAL;
    }
}
