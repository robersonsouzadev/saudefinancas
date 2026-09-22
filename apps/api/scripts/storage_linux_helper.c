#define _GNU_SOURCE
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <fcntl.h>
#include <unistd.h>
#include <sys/stat.h>
#include <sys/syscall.h>
#include <errno.h>
#include <stdint.h>
#include <libgen.h>

/**
 * HELPER LINUX DE OPERAÇÕES RELATIVAS A DESCRITOR (ANTI-TOCTOU) — VITA SAÚDE (G4.2)
 *
 * Utiliza exclusivamente primitivas seguras do kernel Linux relativas a descritor (dfd):
 * - openat2 com RESOLVE_BENEATH | RESOLVE_NO_SYMLINKS | RESOLVE_NO_MAGICLINKS
 * - openat com O_NOFOLLOW e O_DIRECTORY
 * - linkat / renameat2 (RENAME_NOREPLACE)
 * - unlinkat
 * - fstat / fstatat com AT_SYMLINK_NOFOLLOW
 * - fsync
 *
 * Comandos suportados:
 *   write  <base_dir> <rel_path> <temp_file_rel>
 *   read   <base_dir> <rel_path>
 *   unlink <base_dir> <rel_path>
 *   stat   <base_dir> <rel_path>
 *   probe
 */

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
    return syscall(__NR_openat2, dfd, path, how, size);
#else
    errno = ENOSYS;
    return -1;
#endif
}

static inline int sys_renameat2(int olddfd, const char *oldpath, int newdfd, const char *newpath, unsigned int flags) {
#ifdef SYS_renameat2
    return syscall(SYS_renameat2, olddfd, oldpath, newdfd, newpath, flags);
#else
    errno = ENOSYS;
    return -1;
#endif
}

static int open_base_dfd(const char *base_dir) {
    int dfd = open(base_dir, O_RDONLY | O_DIRECTORY | O_CLOEXEC);
    if (dfd < 0) {
        fprintf(stderr, "[ERROR] Falha ao abrir diretório base (%s): %s\n", base_dir, strerror(errno));
        return -1;
    }
    return dfd;
}

static int verify_descriptor_beneath(int fd, const char *base_dir) {
    char proc_path[64];
    char resolved[4096];
    char base_resolved[4096];

    if (!realpath(base_dir, base_resolved)) {
        return -1;
    }

    snprintf(proc_path, sizeof(proc_path), "/proc/self/fd/%d", fd);
    ssize_t len = readlink(proc_path, resolved, sizeof(resolved) - 1);
    if (len < 0) {
        // Se /proc não estiver montado, prossegue com validações do kernel
        return 0;
    }
    resolved[len] = '\0';

    size_t base_len = strlen(base_resolved);
    if (strncmp(resolved, base_resolved, base_len) != 0 ||
        (resolved[base_len] != '/' && resolved[base_len] != '\0')) {
        fprintf(stderr, "[SECURITY_ERROR] Violação RESOLVE_BENEATH: descritor aponta para fora da raiz (%s)\n", resolved);
        return -1;
    }
    return 0;
}

// 1. ESCRITA SEGURA VIA DESCRITOR RELATIVO
static int cmd_write(const char *base_dir, const char *rel_path, const char *temp_file_rel) {
    int dfd = open_base_dfd(base_dir);
    if (dfd < 0) return 1;

    // Verificar se caminho relativo contém tentativas de traversal '..'
    if (strstr(rel_path, "..") != NULL || strstr(temp_file_rel, "..") != NULL) {
        fprintf(stderr, "[SECURITY_ERROR] Navegação com '..' proibida em caminhos relativos.\n");
        close(dfd);
        return 1;
    }

    // Validação estrita do arquivo temporário com fstat e AT_SYMLINK_NOFOLLOW
    struct stat temp_st;
    if (fstatat(dfd, temp_file_rel, &temp_st, AT_SYMLINK_NOFOLLOW) != 0) {
        fprintf(stderr, "[ERROR] Arquivo temporário não acessível via dfd: %s\n", strerror(errno));
        close(dfd);
        return 1;
    }
    if (S_ISLNK(temp_st.st_mode)) {
        fprintf(stderr, "[SECURITY_ERROR] Arquivo temporário é um symlink proibido.\n");
        unlinkat(dfd, temp_file_rel, 0);
        close(dfd);
        return 1;
    }
    if (!S_ISREG(temp_st.st_mode)) {
        fprintf(stderr, "[SECURITY_ERROR] Arquivo temporário não é arquivo regular.\n");
        unlinkat(dfd, temp_file_rel, 0);
        close(dfd);
        return 1;
    }

    // 1. Tentar openat2 com RESOLVE_BENEATH | RESOLVE_NO_SYMLINKS | RESOLVE_NO_MAGICLINKS
    struct open_how how = {
        .flags = O_WRONLY | O_CREAT | O_EXCL | O_CLOEXEC,
        .mode = 0600,
        .resolve = RESOLVE_BENEATH | RESOLVE_NO_SYMLINKS | RESOLVE_NO_MAGICLINKS
    };

    int dest_fd = sys_openat2(dfd, rel_path, &how, sizeof(how));
    if (dest_fd >= 0) {
        // Kernel suporta openat2 e destino foi criado atomicamente
        if (verify_descriptor_beneath(dest_fd, base_dir) != 0) {
            unlinkat(dfd, rel_path, 0);
            unlinkat(dfd, temp_file_rel, 0);
            close(dest_fd);
            close(dfd);
            return 1;
        }

        // Copia do temp para o dest com fsync
        int temp_fd = openat(dfd, temp_file_rel, O_RDONLY | O_CLOEXEC);
        if (temp_fd < 0) {
            unlinkat(dfd, rel_path, 0);
            close(dest_fd);
            close(dfd);
            return 1;
        }

        char buf[8192];
        ssize_t bytes;
        while ((bytes = read(temp_fd, buf, sizeof(buf))) > 0) {
            if (write(dest_fd, buf, bytes) != bytes) {
                close(temp_fd);
                close(dest_fd);
                unlinkat(dfd, rel_path, 0);
                unlinkat(dfd, temp_file_rel, 0);
                close(dfd);
                return 1;
            }
        }
        close(temp_fd);

        fchmod(dest_fd, 0600);
        fsync(dest_fd);
        close(dest_fd);

        // Remove temporário com unlinkat relativo ao dfd
        unlinkat(dfd, temp_file_rel, 0);
        fsync(dfd);
        close(dfd);
        return 0;
    }

    // Se destino já existia ou foi rejeitado por violação de symlink
    if (errno == EEXIST) {
        fprintf(stderr, "[EEXIST] Destino já existe (%s).\n", rel_path);
        unlinkat(dfd, temp_file_rel, 0);
        close(dfd);
        return 2;
    }
    if (errno == ELOOP || errno == EXDEV) {
        fprintf(stderr, "[SECURITY_VIOLATION] openat2 rejeitou resolução por symlink ou escape de raiz: %s\n", strerror(errno));
        unlinkat(dfd, temp_file_rel, 0);
        close(dfd);
        return 3;
    }

    // Fallback de publicação atômica via renameat2 (RENAME_NOREPLACE) ou linkat relativo
    int res = sys_renameat2(dfd, temp_file_rel, dfd, rel_path, RENAME_NOREPLACE);
    if (res != 0 && errno == ENOSYS) {
        res = linkat(dfd, temp_file_rel, dfd, rel_path, 0);
        if (res == 0) {
            unlinkat(dfd, temp_file_rel, 0);
        }
    }

    if (res != 0) {
        fprintf(stderr, "[ERROR] Publicação atômica falhou (%s): %s\n", rel_path, strerror(errno));
        unlinkat(dfd, temp_file_rel, 0);
        close(dfd);
        return (errno == EEXIST) ? 2 : 1;
    }

    // Validação pós-publicação via openat com O_NOFOLLOW
    int final_fd = openat(dfd, rel_path, O_RDONLY | O_NOFOLLOW | O_CLOEXEC);
    if (final_fd < 0) {
        fprintf(stderr, "[SECURITY_ERROR] Destino pós-publicação não pôde ser aberto com O_NOFOLLOW: %s\n", strerror(errno));
        unlinkat(dfd, rel_path, 0);
        close(dfd);
        return 1;
    }

    struct stat final_st;
    if (fstat(final_fd, &final_st) != 0 || S_ISLNK(final_st.st_mode) || !S_ISREG(final_st.st_mode)) {
        fprintf(stderr, "[SECURITY_ERROR] Arquivo final não é arquivo regular estrito.\n");
        close(final_fd);
        unlinkat(dfd, rel_path, 0);
        close(dfd);
        return 1;
    }

    if (verify_descriptor_beneath(final_fd, base_dir) != 0) {
        close(final_fd);
        unlinkat(dfd, rel_path, 0);
        close(dfd);
        return 1;
    }

    fsync(final_fd);
    close(final_fd);
    fsync(dfd);
    close(dfd);
    return 0;
}

// 2. LEITURA SEGURA VIA DESCRITOR RELATIVO
static int cmd_read(const char *base_dir, const char *rel_path) {
    int dfd = open_base_dfd(base_dir);
    if (dfd < 0) return 1;

    if (strstr(rel_path, "..") != NULL) {
        fprintf(stderr, "[SECURITY_ERROR] Navegação com '..' proibida.\n");
        close(dfd);
        return 1;
    }

    struct open_how how = {
        .flags = O_RDONLY | O_CLOEXEC,
        .mode = 0,
        .resolve = RESOLVE_BENEATH | RESOLVE_NO_SYMLINKS | RESOLVE_NO_MAGICLINKS
    };

    int fd = sys_openat2(dfd, rel_path, &how, sizeof(how));
    if (fd < 0) {
        if (errno == ENOSYS) {
            fd = openat(dfd, rel_path, O_RDONLY | O_NOFOLLOW | O_CLOEXEC);
        } else {
            fprintf(stderr, "[SECURITY_REJECT] openat2 rejeitou leitura segura (%s): %s\n", rel_path, strerror(errno));
            close(dfd);
            return 1;
        }
    }

    if (fd < 0) {
        fprintf(stderr, "[ERROR] openat falhou na leitura (%s): %s\n", rel_path, strerror(errno));
        close(dfd);
        return 1;
    }

    struct stat st;
    if (fstat(fd, &st) != 0 || S_ISLNK(st.st_mode) || !S_ISREG(st.st_mode)) {
        fprintf(stderr, "[SECURITY_ERROR] Arquivo não é regular ou é symlink.\n");
        close(fd);
        close(dfd);
        return 1;
    }

    if (verify_descriptor_beneath(fd, base_dir) != 0) {
        close(fd);
        close(dfd);
        return 1;
    }

    char buf[8192];
    ssize_t bytes;
    while ((bytes = read(fd, buf, sizeof(buf))) > 0) {
        if (fwrite(buf, 1, bytes, stdout) != (size_t)bytes) {
            close(fd);
            close(dfd);
            return 1;
        }
    }

    close(fd);
    close(dfd);
    return 0;
}

// 3. EXCLUSÃO SEGURA VIA DESCRITOR RELATIVO
static int cmd_unlink(const char *base_dir, const char *rel_path) {
    int dfd = open_base_dfd(base_dir);
    if (dfd < 0) return 1;

    if (strstr(rel_path, "..") != NULL) {
        fprintf(stderr, "[SECURITY_ERROR] Navegação com '..' proibida.\n");
        close(dfd);
        return 1;
    }

    struct stat st;
    if (fstatat(dfd, rel_path, &st, AT_SYMLINK_NOFOLLOW) != 0) {
        close(dfd);
        return 0; // Já não existe
    }

    if (S_ISLNK(st.st_mode)) {
        fprintf(stderr, "[SECURITY_ERROR] Tentativa de exclusão sobre symlink proibida.\n");
        close(dfd);
        return 1;
    }

    if (unlinkat(dfd, rel_path, 0) != 0) {
        fprintf(stderr, "[ERROR] unlinkat falhou (%s): %s\n", rel_path, strerror(errno));
        close(dfd);
        return 1;
    }

    fsync(dfd);
    close(dfd);
    return 0;
}

int main(int argc, char *argv[]) {
    if (argc < 2) {
        fprintf(stderr, "Uso: %s <cmd> [args...]\n", argv[0]);
        return 1;
    }

    const char *cmd = argv[1];

    if (strcmp(cmd, "probe") == 0) {
        struct open_how how = { .flags = O_RDONLY, .resolve = RESOLVE_BENEATH };
        int res = sys_openat2(AT_FDCWD, ".", &how, sizeof(how));
        if (res >= 0) close(res);
        if (errno == ENOSYS) {
            printf("OPENAT2_SUPPORTED=false\n");
        } else {
            printf("OPENAT2_SUPPORTED=true\n");
        }
        return 0;
    }

    if (strcmp(cmd, "write") == 0) {
        if (argc < 5) {
            fprintf(stderr, "Uso: %s write <base_dir> <rel_path> <temp_file_rel>\n", argv[0]);
            return 1;
        }
        return cmd_write(argv[2], argv[3], argv[4]);
    }

    if (strcmp(cmd, "read") == 0) {
        if (argc < 4) {
            fprintf(stderr, "Uso: %s read <base_dir> <rel_path>\n", argv[0]);
            return 1;
        }
        return cmd_read(argv[2], argv[3]);
    }

    if (strcmp(cmd, "unlink") == 0) {
        if (argc < 4) {
            fprintf(stderr, "Uso: %s unlink <base_dir> <rel_path>\n", argv[0]);
            return 1;
        }
        return cmd_unlink(argv[2], argv[3]);
    }

    fprintf(stderr, "Comando desconhecido: %s\n", cmd);
    return 1;
}
