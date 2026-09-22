#ifndef _GNU_SOURCE
#define _GNU_SOURCE
#endif

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdint.h>
#include <unistd.h>
#include <fcntl.h>
#include <sys/stat.h>
#include <sys/types.h>
#include <sys/wait.h>
#include <dirent.h>
#include <errno.h>
#include <assert.h>
#include <signal.h>
#include <pthread.h>
#include <stdatomic.h>

/**
 * SUÍTE DETERMINÍSTICA DE TESTES NATIVOS LINUX — DESCRITORES ANTI-TOCTOU & ATOMICIDADE (G4.2 V11)
 *
 * Cobertura de Testes Físicos Nativos:
 * 1.  Probe de capabilities do kernel (openat2, renameat2 RENAME_NOREPLACE, /proc/self/fd)
 * 2.  Publicação atômica completa em subdiretório com fchmod 0600 e fsync
 * 3.  Conflito EEXIST ao tentar sobrescrever destino existente via RENAME_NOREPLACE
 * 4.  Ataque de symlink intermediário apontando para fora da raiz (rejeição estrita com EXIT_ERR_SECURITY = 3)
 * 5.  Ataque de symlink no basename apontando para arquivo sentinela externo
 * 6.  Leitura segura rejeitando symlink direto com EXIT_ERR_SECURITY = 3
 * 7.  Leitura legítima de arquivo regular existente
 * 8.  Exclusão segura (unlink) rejeitando remoção via symlink com EXIT_ERR_SECURITY = 3
 * 9.  Ataque Físico Concorrente de Substituição do Diretório Pai (Parent Directory Swap TOCTOU)
 * 10. Exclusão legítima de arquivo regular existente
 * 11. Rejeição estrita de escape '..', caminhos absolutos e barras finais
 * 12. Teste Físico Real de Crash: SIGKILL durante escrita de payload grande
 * 13. Teste Físico Real de Crash: SIGKILL após fsync do temporário e antes do renameat2 via failpoint
 * 14. Teste Físico Real de Concorrência: 4 leitores atômicos vs escritor de 128 KB (zero leituras parciais)
 * 15. Auditoria final matemática do hash da sentinela externa
 */

#define PATH_BUF_SIZE 2048

/**
 * Composição segura de caminhos com verificação matemática de limites de buffer.
 * Elimina completamente advertências de format-truncation do compilador.
 */
static void safe_path_join(char *dest, size_t dest_size, const char *prefix, const char *suffix) {
    assert(dest != NULL && prefix != NULL && suffix != NULL && dest_size > 0);
    size_t p_len = strlen(prefix);
    size_t s_len = strlen(suffix);
    if (p_len + 1 + s_len + 1 > dest_size) {
        fprintf(stderr, "[FATAL] Truncamento de caminho detectado: '%s' + '%s' excede %zu bytes.\n",
                prefix, suffix, dest_size);
        abort();
    }
    memcpy(dest, prefix, p_len);
    dest[p_len] = '/';
    memcpy(dest + p_len + 1, suffix, s_len);
    dest[p_len + 1 + s_len] = '\0';
}

typedef struct {
    uint32_t state[8];
    uint64_t count;
    uint8_t buffer[64];
} sha256_ctx;

static inline uint32_t rotr(uint32_t x, uint32_t n) { return (x >> n) | (x << (32 - n)); }
static inline uint32_t choose(uint32_t e, uint32_t f, uint32_t g) { return (e & f) ^ (~e & g); }
static inline uint32_t majority(uint32_t a, uint32_t b, uint32_t c) { return (a & b) ^ (a & c) ^ (b & c); }
static inline uint32_t sig0(uint32_t x) { return rotr(x, 2) ^ rotr(x, 13) ^ rotr(x, 22); }
static inline uint32_t sig1(uint32_t x) { return rotr(x, 6) ^ rotr(x, 11) ^ rotr(x, 25); }
static inline uint32_t theta0(uint32_t x) { return rotr(x, 7) ^ rotr(x, 18) ^ (x >> 3); }
static inline uint32_t theta1(uint32_t x) { return rotr(x, 17) ^ rotr(x, 19) ^ (x >> 10); }

static const uint32_t K[64] = {
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
};

static void sha256_init(sha256_ctx *ctx) {
    ctx->state[0] = 0x6a09e667;
    ctx->state[1] = 0xbb67ae85;
    ctx->state[2] = 0x3c6ef372;
    ctx->state[3] = 0xa54ff53a;
    ctx->state[4] = 0x510e527f;
    ctx->state[5] = 0x9b05688c;
    ctx->state[6] = 0x1f83d9ab;
    ctx->state[7] = 0x5be0cd19;
    ctx->count = 0;
}

static void sha256_transform(sha256_ctx *ctx, const uint8_t data[64]) {
    uint32_t a, b, c, d, e, f, g, h, w[64];
    for (int i = 0; i < 16; i++) {
        w[i] = ((uint32_t)data[i*4] << 24) | ((uint32_t)data[i*4+1] << 16) |
               ((uint32_t)data[i*4+2] << 8)  | ((uint32_t)data[i*4+3]);
    }
    for (int i = 16; i < 64; i++) {
        w[i] = theta1(w[i-2]) + w[i-7] + theta0(w[i-15]) + w[i-16];
    }
    a = ctx->state[0]; b = ctx->state[1]; c = ctx->state[2]; d = ctx->state[3];
    e = ctx->state[4]; f = ctx->state[5]; g = ctx->state[6]; h = ctx->state[7];
    for (int i = 0; i < 64; i++) {
        uint32_t t1 = h + sig1(e) + choose(e, f, g) + K[i] + w[i];
        uint32_t t2 = sig0(a) + majority(a, b, c);
        h = g; g = f; f = e; e = d + t1;
        d = c; c = b; b = a; a = t1 + t2;
    }
    ctx->state[0] += a; ctx->state[1] += b; ctx->state[2] += c; ctx->state[3] += d;
    ctx->state[4] += e; ctx->state[5] += f; ctx->state[6] += g; ctx->state[7] += h;
}

static void sha256_update(sha256_ctx *ctx, const uint8_t *data, size_t len) {
    size_t i = 0;
    size_t index = (size_t)((ctx->count >> 3) & 63);
    ctx->count += (uint64_t)len << 3;
    size_t part_len = 64 - index;
    if (len >= part_len) {
        memcpy(&ctx->buffer[index], data, part_len);
        sha256_transform(ctx, ctx->buffer);
        for (i = part_len; i + 63 < len; i += 64)
            sha256_transform(ctx, &data[i]);
        index = 0;
    }
    if (i < len)
        memcpy(&ctx->buffer[index], &data[i], len - i);
}

static void sha256_final(sha256_ctx *ctx, uint8_t hash[32]) {
    uint8_t final_count[8];
    for (int i = 0; i < 8; i++) final_count[i] = (uint8_t)((ctx->count >> ((7 - i) * 8)) & 0xFF);
    uint8_t pad = 0x80;
    sha256_update(ctx, &pad, 1);
    while (((ctx->count >> 3) & 63) != 56) {
        uint8_t zero = 0;
        sha256_update(ctx, &zero, 1);
    }
    sha256_update(ctx, final_count, 8);
    for (int i = 0; i < 8; i++) {
        hash[i*4]   = (uint8_t)((ctx->state[i] >> 24) & 0xFF);
        hash[i*4+1] = (uint8_t)((ctx->state[i] >> 16) & 0xFF);
        hash[i*4+2] = (uint8_t)((ctx->state[i] >> 8) & 0xFF);
        hash[i*4+3] = (uint8_t)(ctx->state[i] & 0xFF);
    }
}

static void compute_file_sha256(const char *filepath, char out_hex[65]) {
    sha256_ctx ctx;
    sha256_init(&ctx);
    FILE *f = fopen(filepath, "rb");
    if (!f) {
        strcpy(out_hex, "ERROR_OPENING_FILE");
        return;
    }
    uint8_t buf[4096];
    size_t n;
    while ((n = fread(buf, 1, sizeof(buf), f)) > 0) {
        sha256_update(&ctx, buf, n);
    }
    fclose(f);
    uint8_t hash[32];
    sha256_final(&ctx, hash);
    for (int i = 0; i < 32; i++) {
        sprintf(out_hex + (i * 2), "%02x", hash[i]);
    }
    out_hex[64] = '\0';
}

static void compute_buffer_sha256(const uint8_t *data, size_t len, char out_hex[65]) {
    sha256_ctx ctx;
    sha256_init(&ctx);
    sha256_update(&ctx, data, len);
    uint8_t hash[32];
    sha256_final(&ctx, hash);
    for (int i = 0; i < 32; i++) {
        sprintf(out_hex + (i * 2), "%02x", hash[i]);
    }
    out_hex[64] = '\0';
}

static int execute_helper_full(const char *helper_bin, const char *action,
                            const char *arg1, const char *arg2,
                            const char *input_data, size_t input_len,
                            char *out_buf, size_t out_buf_len,
                            char *err_buf, size_t err_buf_len) {
    int pipe_in[2];
    int pipe_out[2];
    int pipe_err[2];

    if (pipe(pipe_in) < 0 || pipe(pipe_out) < 0 || pipe(pipe_err) < 0) {
        return -1;
    }

    pid_t pid = fork();
    if (pid < 0) {
        close(pipe_in[0]); close(pipe_in[1]);
        close(pipe_out[0]); close(pipe_out[1]);
        close(pipe_err[0]); close(pipe_err[1]);
        return -1;
    }

    if (pid == 0) {
        dup2(pipe_in[0], STDIN_FILENO);
        dup2(pipe_out[1], STDOUT_FILENO);
        dup2(pipe_err[1], STDERR_FILENO);
        close(pipe_in[0]); close(pipe_in[1]);
        close(pipe_out[0]); close(pipe_out[1]);
        close(pipe_err[0]); close(pipe_err[1]);

        if (arg2) {
            execl(helper_bin, helper_bin, action, arg1, arg2, (char *)NULL);
        } else if (arg1) {
            execl(helper_bin, helper_bin, action, arg1, (char *)NULL);
        } else {
            execl(helper_bin, helper_bin, action, (char *)NULL);
        }
        _exit(127);
    }

    close(pipe_in[0]);
    close(pipe_out[1]);
    close(pipe_err[1]);

    if (input_data && input_len > 0) {
        size_t written = 0;
        while (written < input_len) {
            errno = 0;
            ssize_t w = write(pipe_in[1], input_data + written, input_len - written);
            if (w < 0) {
                if (errno == EINTR) {
                    continue;
                }
                if (errno == EPIPE) {
                    // O processo filho fechou o pipe de leitura precocemente (ex: rejeição de segurança / conflito).
                    // Comportamento determinístico e esperado em testes de segurança Anti-TOCTOU.
                    break;
                }
                break;
            }
            if (w == 0) break;
            written += (size_t)w;
        }
    }
    close(pipe_in[1]);

    size_t total_out = 0;
    if (out_buf && out_buf_len > 0) {
        ssize_t r;
        while ((r = read(pipe_out[0], out_buf + total_out, out_buf_len - 1 - total_out)) > 0) {
            total_out += (size_t)r;
        }
        out_buf[total_out] = '\0';
    }
    close(pipe_out[0]);

    size_t total_err = 0;
    if (err_buf && err_buf_len > 0) {
        ssize_t r;
        while ((r = read(pipe_err[0], err_buf + total_err, err_buf_len - 1 - total_err)) > 0) {
            total_err += (size_t)r;
        }
        err_buf[total_err] = '\0';
    }
    close(pipe_err[0]);

    int status;
    pid_t wpid = waitpid(pid, &status, 0);
    assert(wpid == pid);
    if (WIFEXITED(status)) {
        return WEXITSTATUS(status);
    }
    if (WIFSIGNALED(status)) {
        return 128 + WTERMSIG(status);
    }
    return -1;
}

static int execute_helper(const char *helper_bin, const char *action,
                          const char *arg1, const char *arg2,
                          const char *input_data, size_t input_len,
                          char *out_buf, size_t out_buf_len) {
    return execute_helper_full(helper_bin, action, arg1, arg2, input_data, input_len, out_buf, out_buf_len, NULL, 0);
}

// Estrutura para leitores concorrentes com sincronização atômica formal (Teste 14)
typedef struct {
    const char *helper_bin;
    const char *test_root;
    const char *rel_path;
    size_t expected_size;
    const char *expected_sha256;
    atomic_int stop_flag;
    atomic_int race_violation;
    atomic_int read_successes;
    atomic_int read_not_found;
    pthread_mutex_t mutex;
} concurrent_reader_ctx;

static void *concurrent_reader_thread(void *arg) {
    concurrent_reader_ctx *ctx = (concurrent_reader_ctx *)arg;
    char read_buf[262144];
    char computed_sha[65];

    while (atomic_load(&ctx->stop_flag) == 0) {
        char err_buf[256];
        int code = execute_helper_full(ctx->helper_bin, "read", ctx->test_root, ctx->rel_path,
                                       NULL, 0, read_buf, sizeof(read_buf), err_buf, sizeof(err_buf));

        if (code == 1) {
            atomic_fetch_add(&ctx->read_not_found, 1);
        } else if (code == 0) {
            size_t len = strlen(read_buf);
            if (len == 0 || len < ctx->expected_size) {
                atomic_store(&ctx->race_violation, 1);
                break;
            }
            compute_buffer_sha256((const uint8_t *)read_buf, len, computed_sha);
            if (strcmp(computed_sha, ctx->expected_sha256) != 0) {
                atomic_store(&ctx->race_violation, 2);
                break;
            }
            atomic_fetch_add(&ctx->read_successes, 1);
        } else {
            atomic_store(&ctx->race_violation, 3);
            break;
        }
        usleep(500);
    }
    return NULL;
}


typedef struct {
    const char *legit_parent;
    const char *backup_parent;
    const char *ext_victim_dir;
    int pipe_sync_fd;
    volatile int failpoint_reached;
    volatile int swap_rename_rc;
    volatile int swap_symlink_rc;
    volatile int swap_executed;
    pthread_t thread_id;
} unlink_attacker_args_t;

static void *unlink_attacker_worker(void *arg) {
    unlink_attacker_args_t *args = (unlink_attacker_args_t *)arg;
    args->thread_id = pthread_self();

    char sync_buf[512];
    ssize_t sn_r;
    while ((sn_r = read(args->pipe_sync_fd, sync_buf, sizeof(sync_buf) - 1)) > 0) {
        sync_buf[sn_r] = '\0';
        if (strstr(sync_buf, "[FAILPOINT] READY_FOR_PARENT_SWAP_ATTACK_PID=")) {
            args->failpoint_reached = 1;
            break;
        }
    }

    if (args->failpoint_reached) {
        // Executar tentativa concorrente de troca do diretório legítimo por symlink para a vítima externa
        args->swap_rename_rc = rename(args->legit_parent, args->backup_parent);
        args->swap_symlink_rc = symlink(args->ext_victim_dir, args->legit_parent);
        args->swap_executed = 1;
    }

    return NULL;
}

int main(int argc, char *argv[]) {
    // 1. Ignorar explicitamente SIGPIPE para garantir execução determinística sob Python subprocess.run
    struct sigaction sa_pipe;
    memset(&sa_pipe, 0, sizeof(sa_pipe));
    sa_pipe.sa_handler = SIG_IGN;
    sigemptyset(&sa_pipe.sa_mask);
    sa_pipe.sa_flags = 0;
    if (sigaction(SIGPIPE, &sa_pipe, NULL) != 0) {
        signal(SIGPIPE, SIG_IGN);
    }

    printf("================================================================================\n");
    printf("SUÍTE DE TESTES NATIVOS LINUX — DESCRITORES ANTI-TOCTOU E ATOMICIDADE (G4.2 V11)\n");
    printf("================================================================================\n");

    const char *helper_bin = (argc > 1) ? argv[1] : "./storage_linux_helper";
    if (access(helper_bin, X_OK) != 0) {
        fprintf(stderr, "[FATAL] Binário '%s' não encontrado ou não executável.\n", helper_bin);
        return 1;
    }

    char test_root_template[] = "/tmp/vita_native_tests_XXXXXX";
    char *test_root = mkdtemp(test_root_template);
    assert(test_root != NULL);
    assert(chmod(test_root, 0700) == 0);

    // Criar arquivo sentinela externo (fora da raiz de storage)
    char canary_path[] = "/tmp/vita_canary_sentinel_host_file.txt";
    FILE *canary = fopen(canary_path, "wb");
    assert(canary != NULL);
    const char canary_initial[] = "CANARY_SECRET_INTEGRITY_TOKEN_V10_SAFE_GUARD_2026";
    size_t nw = fwrite(canary_initial, 1, strlen(canary_initial), canary);
    assert(nw == strlen(canary_initial));
    fclose(canary);
    assert(chmod(canary_path, 0600) == 0);

    char canary_hash_before[65];
    compute_file_sha256(canary_path, canary_hash_before);
    printf("[SENTINELA] Hash SHA-256 inicial: %s\n", canary_hash_before);

    int passed = 0;
    int total = 15;

    // TESTE 1: Probe de Capabilities
    printf("\n[TEST 1/15] Probe de capabilities (openat2, renameat2, /proc/self/fd)... ");
    char probe_out[256];
    int code1 = execute_helper(helper_bin, "probe", NULL, NULL, NULL, 0, probe_out, sizeof(probe_out));
    if (code1 == 0 && strstr(probe_out, "\"status\":\"ok\"") && strstr(probe_out, "\"openat2\":true")) {
        printf("PASSED (Exit Code: 0, Output: %s)\n", probe_out);
        passed++;
    } else {
        printf("FAILED (Exit Code: %d, Output: %s)\n", code1, probe_out);
    }

    // TESTE 2: Publicação atômica completa e integridade (tamanho exato: 58 bytes)
    printf("[TEST 2/15] Publicação atômica em subdiretório seguro com payload completo... ");
    char sub_dir[PATH_BUF_SIZE];
    safe_path_join(sub_dir, sizeof(sub_dir), test_root, "user_1001");
    assert(mkdir(sub_dir, 0700) == 0);
    const char payload_fit[] = "MOCK_FIT_BINARY_DATA_WITH_STRICT_HEADER_AND_CRC_1234567890";
    size_t payload_len = strlen(payload_fit);
    int code2 = execute_helper(helper_bin, "put", test_root, "user_1001/activity.fit", payload_fit, payload_len, NULL, 0);
    if (code2 == 0) {
        char created_file[PATH_BUF_SIZE];
        safe_path_join(created_file, sizeof(created_file), sub_dir, "activity.fit");
        struct stat st;
        if (stat(created_file, &st) == 0 && (st.st_mode & 0777) == 0600 && st.st_size == (off_t)payload_len) {
            printf("PASSED (Exit Code: 0, Mode: 0600, Size: %ld)\n", (long)st.st_size);
            passed++;
        } else {
            printf("FAILED (Metadata ou permissão divergente)\n");
        }
    } else {
        printf("FAILED (Exit Code: %d)\n", code2);
    }

    // TESTE 3: Destino já existente (Conflito EEXIST via RENAME_NOREPLACE)
    printf("[TEST 3/15] Conflito EEXIST: tentativa de sobrescrever destino existente... ");
    const char payload_conflict[] = "OVERWRITE_PAYLOAD_THAT_MUST_BE_REJECTED";
    int code3 = execute_helper(helper_bin, "put", test_root, "user_1001/activity.fit", payload_conflict, strlen(payload_conflict), NULL, 0);
    if (code3 == 2) {
        char created_file[PATH_BUF_SIZE];
        safe_path_join(created_file, sizeof(created_file), sub_dir, "activity.fit");
        FILE *f = fopen(created_file, "rb");
        assert(f != NULL);
        char read_back[128];
        size_t rn = fread(read_back, 1, sizeof(read_back) - 1, f);
        read_back[rn] = '\0';
        fclose(f);
        if (strcmp(read_back, payload_fit) == 0) {
            printf("PASSED (Exit Code: 2 [CONFLICT], Conteúdo original intacto)\n");
            passed++;
        } else {
            printf("FAILED (Conteúdo foi corrompido)\n");
        }
    } else {
        printf("FAILED (Esperado Exit Code 2, recebido: %d)\n", code3);
    }

    // TESTE 4: Ataque de symlink intermediário apontando para fora da raiz
    printf("[TEST 4/15] Ataque de symlink intermediário apontando para fora da raiz... ");
    char victim_dir[] = "/tmp/vita_victim_escape_dir";
    assert(mkdir(victim_dir, 0700) == 0);
    char symlink_attack_path[PATH_BUF_SIZE];
    safe_path_join(symlink_attack_path, sizeof(symlink_attack_path), test_root, "symlink_dir");
    assert(symlink(victim_dir, symlink_attack_path) == 0);

    int code4 = execute_helper(helper_bin, "put", test_root, "symlink_dir/pwned.fit", "PAYLOAD", 7, NULL, 0);
    char escaped_file[PATH_BUF_SIZE];
    safe_path_join(escaped_file, sizeof(escaped_file), victim_dir, "pwned.fit");

    char canary_check_t4[65];
    compute_file_sha256(canary_path, canary_check_t4);

    if (code4 == 3 && access(escaped_file, F_OK) != 0 && strcmp(canary_hash_before, canary_check_t4) == 0) {
        printf("PASSED (Exit Code: 3 [SECURITY], Nenhum arquivo criado fora da raiz)\n");
        passed++;
    } else {
        printf("FAILED (Esperado Exit Code 3, recebido: %d; escaped_exists: %d)\n",
               code4, access(escaped_file, F_OK) == 0);
    }
    assert(unlink(symlink_attack_path) == 0);
    assert(rmdir(victim_dir) == 0);

    // TESTE 5: Ataque de symlink no basename de destino apontando para sentinela
    printf("[TEST 5/15] Ataque de symlink no basename apontando para arquivo sentinela... ");
    char symlink_file_target[PATH_BUF_SIZE];
    safe_path_join(symlink_file_target, sizeof(symlink_file_target), sub_dir, "canary_link.fit");
    assert(symlink(canary_path, symlink_file_target) == 0);

    int code5 = execute_helper(helper_bin, "put", test_root, "user_1001/canary_link.fit", "MALICIOUS_DATA", 14, NULL, 0);
    if (code5 == 2 || code5 == 3) {
        char canary_check[65];
        compute_file_sha256(canary_path, canary_check);
        if (strcmp(canary_hash_before, canary_check) == 0) {
            printf("PASSED (Exit Code: %d, Sentinela 100%% preservada)\n", code5);
            passed++;
        } else {
            printf("FAILED (Sentinela foi alterada!)\n");
        }
    } else {
        printf("FAILED (Esperado Exit Code 2 ou 3, recebido: %d)\n", code5);
    }
    assert(unlink(symlink_file_target) == 0);

    // TESTE 6: Leitura segura rejeitando symlink
    printf("[TEST 6/15] Leitura segura rejeitando symlink direto... ");
    assert(symlink(canary_path, symlink_file_target) == 0);
    char read_buf[256];
    int code6 = execute_helper(helper_bin, "read", test_root, "user_1001/canary_link.fit", NULL, 0, read_buf, sizeof(read_buf));
    if (code6 == 3) {
        printf("PASSED (Exit Code: 3 [SECURITY_VIOLATION])\n");
        passed++;
    } else {
        printf("FAILED (Esperado Exit Code 3, recebido: %d)\n", code6);
    }
    assert(unlink(symlink_file_target) == 0);

    // TESTE 7: Leitura legítima de arquivo regular
    printf("[TEST 7/15] Leitura legítima de arquivo existente... ");
    int code7 = execute_helper(helper_bin, "read", test_root, "user_1001/activity.fit", NULL, 0, read_buf, sizeof(read_buf));
    if (code7 == 0 && strcmp(read_buf, payload_fit) == 0) {
        printf("PASSED (Exit Code: 0, Payload lido exatamente igual)\n");
        passed++;
    } else {
        printf("FAILED (Exit Code: %d, Payload divergente)\n", code7);
    }

    // TESTE 8: Exclusão segura rejeitando symlink apontando para sentinela
    printf("[TEST 8/15] Exclusão segura (unlink) rejeitando remoção via symlink... ");
    assert(symlink(canary_path, symlink_file_target) == 0);
    int code8 = execute_helper(helper_bin, "unlink", test_root, "user_1001/canary_link.fit", NULL, 0, NULL, 0);

    char canary_check8[65];
    compute_file_sha256(canary_path, canary_check8);

    if (code8 == 3 && access(canary_path, F_OK) == 0 && strcmp(canary_hash_before, canary_check8) == 0) {
        printf("PASSED (Exit Code: 3 [SECURITY], Sentinela física externa intacta)\n");
        passed++;
    } else {
        printf("FAILED (Esperado Exit Code 3, recebido: %d; Sentinela modificada ou ausente)\n", code8);
    }
    assert(unlink(symlink_file_target) == 0);

    // TESTE 9: Ataque Físico Concorrente de Substituição do Diretório Pai (Parent Swap TOCTOU)
    printf("[TEST 9/15] Ataque com troca concorrente do diretório pai antes do unlinkat... ");
    char legit_parent[PATH_BUF_SIZE];
    safe_path_join(legit_parent, sizeof(legit_parent), test_root, "race_parent");
    assert(mkdir(legit_parent, 0700) == 0);

    char legit_file[PATH_BUF_SIZE];
    safe_path_join(legit_file, sizeof(legit_file), legit_parent, "target.fit");
    FILE *lf = fopen(legit_file, "wb");
    assert(lf != NULL);
    const char target_content[] = "LEGITIMATE_TARGET_DATA";
    size_t lf_w = fwrite(target_content, 1, strlen(target_content), lf);
    assert(lf_w == strlen(target_content));
    fclose(lf);

    char ext_victim_dir[] = "/tmp/vita_victim_swap_dir";
    assert(mkdir(ext_victim_dir, 0700) == 0);
    char ext_sentinel[PATH_BUF_SIZE];
    safe_path_join(ext_sentinel, sizeof(ext_sentinel), ext_victim_dir, "victim_sentinel.txt");
    FILE *vsf = fopen(ext_sentinel, "wb");
    assert(vsf != NULL);
    const char vs_token[] = "VICTIM_SENTINEL_SECRET_TOKEN_DO_NOT_DELETE";
    size_t vs_w = fwrite(vs_token, 1, strlen(vs_token), vsf);
    assert(vs_w == strlen(vs_token));
    fclose(vsf);

    char vs_hash_before[65];
    compute_file_sha256(ext_sentinel, vs_hash_before);

    // Ativar failpoint de sincronização de corrida antes do unlinkat
    assert(setenv("VITA_FAILPOINT_PAUSE_BEFORE_UNLINK", "1", 1) == 0);

    int pipe_u_err[2];
    int pipe_u_out[2];
    assert(pipe(pipe_u_err) == 0 && pipe(pipe_u_out) == 0);

    pid_t u_pid = fork();
    assert(u_pid >= 0);

    if (u_pid == 0) {
        dup2(pipe_u_out[1], STDOUT_FILENO);
        dup2(pipe_u_err[1], STDERR_FILENO);
        close(pipe_u_out[0]); close(pipe_u_out[1]);
        close(pipe_u_err[0]); close(pipe_u_err[1]);

        execl(helper_bin, helper_bin, "unlink", test_root, "race_parent/target.fit", (char *)NULL);
        _exit(127);
    }

    close(pipe_u_out[1]);
    close(pipe_u_err[1]);

    char backup_parent[PATH_BUF_SIZE];
    safe_path_join(backup_parent, sizeof(backup_parent), test_root, "race_parent_backup");

    unlink_attacker_args_t attacker_args = {
        .legit_parent = legit_parent,
        .backup_parent = backup_parent,
        .ext_victim_dir = ext_victim_dir,
        .pipe_sync_fd = pipe_u_err[0],
        .failpoint_reached = 0,
        .swap_rename_rc = -1,
        .swap_symlink_rc = -1,
        .swap_executed = 0,
        .thread_id = 0
    };

    // Criar thread atacante dedicada
    pthread_t attacker_th;
    assert(pthread_create(&attacker_th, NULL, unlink_attacker_worker, &attacker_args) == 0);

    // Aguardar conclusão da thread atacante
    assert(pthread_join(attacker_th, NULL) == 0);

    int u_status = 0;
    pid_t u_wpid = waitpid(u_pid, &u_status, 0);
    assert(u_wpid == u_pid);
    int helper_exit_code = WEXITSTATUS(u_status);
    assert(unsetenv("VITA_FAILPOINT_PAUSE_BEFORE_UNLINK") == 0);
    close(pipe_u_err[0]);
    close(pipe_u_out[0]);

    // Comprovar que o arquivo da vítima externa foi 100% preservado
    char vs_hash_after[65];
    compute_file_sha256(ext_sentinel, vs_hash_after);
    int ext_sentinel_intact = (access(ext_sentinel, F_OK) == 0 && strcmp(vs_hash_before, vs_hash_after) == 0);

    // Limpeza da área do ataque
    if (attacker_args.swap_symlink_rc == 0) {
        unlink(legit_parent);
    }
    char backup_file[PATH_BUF_SIZE];
    safe_path_join(backup_file, sizeof(backup_file), backup_parent, "target.fit");
    unlink(backup_file);
    rmdir(backup_parent);
    unlink(ext_sentinel);
    rmdir(ext_victim_dir);

    // O teste DEVE falhar se a troca concorrente não aconteceu ou a sentinela foi corrompida
    // HelperRC=0 é plenamente seguro pois o helper utiliza o descritor seguro do diretório renomeado
    if (attacker_args.failpoint_reached &&
        attacker_args.swap_executed &&
        attacker_args.swap_rename_rc == 0 &&
        attacker_args.swap_symlink_rc == 0 &&
        ext_sentinel_intact &&
        (helper_exit_code == 0 || helper_exit_code == 3)) {
        printf("PASSED (Ataque concorrente validado: HelperPID=%d, AttackerThID=%lu, HelperRC=%d, Sentinela 100%% preservada)\n",
               (int)u_pid, (unsigned long)attacker_args.thread_id, helper_exit_code);
        passed++;
    } else {
        printf("FAILED (failpoint=%d, swap_exec=%d, rename_rc=%d, symlink_rc=%d, sentinel_intact=%d)\n",
               attacker_args.failpoint_reached, attacker_args.swap_executed,
               attacker_args.swap_rename_rc, attacker_args.swap_symlink_rc, ext_sentinel_intact);
    }

    printf("[TEST 10/15] Exclusão legítima de arquivo regular... ");
    int code10 = execute_helper(helper_bin, "unlink", test_root, "user_1001/activity.fit", NULL, 0, NULL, 0);
    char act_path[PATH_BUF_SIZE];
    safe_path_join(act_path, sizeof(act_path), sub_dir, "activity.fit");
    if (code10 == 0 && access(act_path, F_OK) != 0) {
        printf("PASSED (Exit Code: 0, Arquivo removido com sucesso)\n");
        passed++;
    } else {
        printf("FAILED (Exit Code: %d)\n", code10);
    }

    // TESTE 11: Rejeição estrita de sequências de escape ('..', caminhos absolutos, barras)
    printf("[TEST 11/15] Rejeição estrita de '..', caminhos absolutos e barras finais... ");
    int c_trav = execute_helper(helper_bin, "put", test_root, "../escape.fit", "DATA", 4, NULL, 0);
    int c_abs  = execute_helper(helper_bin, "put", test_root, "/etc/passwd", "DATA", 4, NULL, 0);
    int c_slash = execute_helper(helper_bin, "put", test_root, "user_1001/sub/", "DATA", 4, NULL, 0);
    if (c_trav == 3 && c_abs == 3 && c_slash == 3) {
        printf("PASSED (Todos retornaram Exit Code 3 [SECURITY])\n");
        passed++;
    } else {
        printf("FAILED (Codes: trav=%d, abs=%d, slash=%d)\n", c_trav, c_abs, c_slash);
    }

    // TESTE 12: Teste Físico Real de Crash (SIGKILL durante escrita de payload grande)
    printf("[TEST 12/15] Teste físico real de crash: SIGKILL durante escrita de payload... ");
    int pipe_crash[2];
    assert(pipe(pipe_crash) == 0);

    pid_t crash_pid = fork();
    assert(crash_pid >= 0);

    if (crash_pid == 0) {
        dup2(pipe_crash[0], STDIN_FILENO);
        close(pipe_crash[0]);
        close(pipe_crash[1]);
        int null_fd = open("/dev/null", O_WRONLY);
        if (null_fd >= 0) {
            dup2(null_fd, STDOUT_FILENO);
            dup2(null_fd, STDERR_FILENO);
            close(null_fd);
        }
        execl(helper_bin, helper_bin, "put", test_root, "user_1001/killed_stream.fit", (char *)NULL);
        _exit(127);
    }

    close(pipe_crash[0]);
    char chunk[4096];
    memset(chunk, 'A', sizeof(chunk));
    for (int i = 0; i < 4; i++) {
        errno = 0;
        ssize_t w = write(pipe_crash[1], chunk, sizeof(chunk));
        if (w < 0 && (errno == EPIPE || errno == EINTR)) {
            break;
        }
    }
    // Interromper fisicamente o helper com SIGKILL durante a escrita
    assert(kill(crash_pid, SIGKILL) == 0);
    close(pipe_crash[1]);

    int crash_status;
    pid_t cwpid = waitpid(crash_pid, &crash_status, 0);
    assert(cwpid == crash_pid);

    char target_killed_file[PATH_BUF_SIZE];
    safe_path_join(target_killed_file, sizeof(target_killed_file), sub_dir, "killed_stream.fit");

    int file_not_published = (access(target_killed_file, F_OK) != 0);

    // Identificar e limpar eventual arquivo temporário órfão (.tmp.*)
    DIR *d = opendir(sub_dir);
    int orphan_found = 0;
    if (d) {
        struct dirent *de;
        while ((de = readdir(d)) != NULL) {
            if (strncmp(de->d_name, ".tmp.", 5) == 0) {
                orphan_found = 1;
                char orphan_path[PATH_BUF_SIZE];
                safe_path_join(orphan_path, sizeof(orphan_path), sub_dir, de->d_name);
                assert(unlink(orphan_path) == 0);
            }
        }
        closedir(d);
    }

    char canary_check12[65];
    compute_file_sha256(canary_path, canary_check12);

    if (WIFSIGNALED(crash_status) && WTERMSIG(crash_status) == SIGKILL &&
        file_not_published && strcmp(canary_hash_before, canary_check12) == 0) {
        printf("PASSED (SIGKILL confirmado, zero conteúdo publicado, órfão=%d)\n", orphan_found);
        passed++;
    } else {
        printf("FAILED (crash_status=%d, published=%d)\n", crash_status, !file_not_published);
    }

    // TESTE 13: Teste Físico Real de Crash (SIGKILL antes de renameat2 via failpoint)
    printf("[TEST 13/15] Teste físico real de crash: SIGKILL antes do renameat2 via failpoint... ");
    assert(setenv("VITA_FAILPOINT_PAUSE_BEFORE_RENAME", "1", 1) == 0);

    int pipe_fp_out[2];
    int pipe_fp_err[2];
    int pipe_fp_in[2];
    assert(pipe(pipe_fp_in) == 0 && pipe(pipe_fp_out) == 0 && pipe(pipe_fp_err) == 0);

    pid_t fp_pid = fork();
    assert(fp_pid >= 0);

    if (fp_pid == 0) {
        dup2(pipe_fp_in[0], STDIN_FILENO);
        dup2(pipe_fp_out[1], STDOUT_FILENO);
        dup2(pipe_fp_err[1], STDERR_FILENO);
        close(pipe_fp_in[0]); close(pipe_fp_in[1]);
        close(pipe_fp_out[0]); close(pipe_fp_out[1]);
        close(pipe_fp_err[0]); close(pipe_fp_err[1]);

        execl(helper_bin, helper_bin, "put", test_root, "user_1001/paused_file.fit", (char *)NULL);
        _exit(127);
    }

    close(pipe_fp_in[0]);
    close(pipe_fp_out[1]);
    close(pipe_fp_err[1]);

    const char fp_payload[] = "CRITICAL_PAYLOAD_PAUSED_BEFORE_RENAME_FAILPOINT";
    ssize_t w_fp = write(pipe_fp_in[1], fp_payload, strlen(fp_payload));
    assert(w_fp == (ssize_t)strlen(fp_payload));
    close(pipe_fp_in[1]);

    char fp_err_buf[512];
    int fp_ready = 0;
    ssize_t n_err;
    while ((n_err = read(pipe_fp_err[0], fp_err_buf, sizeof(fp_err_buf) - 1)) > 0) {
        fp_err_buf[n_err] = '\0';
        if (strstr(fp_err_buf, "[FAILPOINT] READY_FOR_SIGKILL_PID=")) {
            fp_ready = 1;
            break;
        }
    }
    close(pipe_fp_err[0]);
    close(pipe_fp_out[0]);

    if (fp_ready) {
        assert(kill(fp_pid, SIGKILL) == 0);
    }

    int fp_status;
    pid_t fp_wpid = waitpid(fp_pid, &fp_status, 0);
    assert(fp_wpid == fp_pid);
    assert(unsetenv("VITA_FAILPOINT_PAUSE_BEFORE_RENAME") == 0);

    char target_paused_file[PATH_BUF_SIZE];
    safe_path_join(target_paused_file, sizeof(target_paused_file), sub_dir, "paused_file.fit");
    int paused_not_published = (access(target_paused_file, F_OK) != 0);

    d = opendir(sub_dir);
    if (d) {
        struct dirent *de;
        while ((de = readdir(d)) != NULL) {
            if (strncmp(de->d_name, ".tmp.", 5) == 0) {
                char orphan_path[PATH_BUF_SIZE];
                safe_path_join(orphan_path, sizeof(orphan_path), sub_dir, de->d_name);
                assert(unlink(orphan_path) == 0);
            }
        }
        closedir(d);
    }

    char canary_check13[65];
    compute_file_sha256(canary_path, canary_check13);

    if (fp_ready && WIFSIGNALED(fp_status) && WTERMSIG(fp_status) == SIGKILL &&
        paused_not_published && strcmp(canary_hash_before, canary_check13) == 0) {
        printf("PASSED (Failpoint acionado, SIGKILL interceptou antes do renameat2)\n");
        passed++;
    } else {
        printf("FAILED (fp_ready=%d, published=%d)\n", fp_ready, !paused_not_published);
    }

    // TESTE 14: Teste Físico Real de Concorrência (4 Leitores Contínuos vs Escritor em 5 Iterações)
    printf("[TEST 14/15] Teste físico de concorrência real: 4 leitores vs escritor (5 iterações)... ");
    int race_detected = 0;
    const size_t c_size = 131072;
    char *c_payload = (char *)malloc(c_size);
    assert(c_payload != NULL);
    for (size_t i = 0; i < c_size; i++) {
        c_payload[i] = (char)('A' + (i % 26));
    }
    char c_expected_sha[65];
    compute_buffer_sha256((const uint8_t *)c_payload, c_size, c_expected_sha);

    for (int iter = 0; iter < 5; iter++) {
        char iter_suffix[64];
        sprintf(iter_suffix, "stream_%d.fit", iter);
        char rel_iter[128];
        sprintf(rel_iter, "user_1001/stream_%d.fit", iter);

        concurrent_reader_ctx r_ctx;
        r_ctx.helper_bin = helper_bin;
        r_ctx.test_root = test_root;
        r_ctx.rel_path = rel_iter;
        r_ctx.expected_size = c_size;
        r_ctx.expected_sha256 = c_expected_sha;
        atomic_init(&r_ctx.stop_flag, 0);
        atomic_init(&r_ctx.race_violation, 0);
        atomic_init(&r_ctx.read_successes, 0);
        atomic_init(&r_ctx.read_not_found, 0);
        assert(pthread_mutex_init(&r_ctx.mutex, NULL) == 0);

        pthread_t readers[4];
        for (int r = 0; r < 4; r++) {
            assert(pthread_create(&readers[r], NULL, concurrent_reader_thread, &r_ctx) == 0);
        }

        int pipe_wr[2];
        assert(pipe(pipe_wr) == 0);
        pid_t wr_pid = fork();
        assert(wr_pid >= 0);

        if (wr_pid == 0) {
            dup2(pipe_wr[0], STDIN_FILENO);
            close(pipe_wr[0]);
            close(pipe_wr[1]);
            execl(helper_bin, helper_bin, "put", test_root, rel_iter, (char *)NULL);
            _exit(127);
        }

        close(pipe_wr[0]);
        size_t off = 0;
        while (off < c_size) {
            size_t to_write = (c_size - off > 8192) ? 8192 : (c_size - off);
            errno = 0;
            ssize_t w = write(pipe_wr[1], c_payload + off, to_write);
            if (w < 0) {
                if (errno == EINTR) continue;
                if (errno == EPIPE) break;
                break;
            }
            if (w == 0) break;
            off += (size_t)w;
            usleep(200);
        }
        close(pipe_wr[1]);

        int wr_status;
        pid_t wr_wpid = waitpid(wr_pid, &wr_status, 0);
        assert(wr_wpid == wr_pid);
        assert(WIFEXITED(wr_status) && WEXITSTATUS(wr_status) == 0);

        usleep(2000);
        atomic_store(&r_ctx.stop_flag, 1);

        for (int r = 0; r < 4; r++) {
            assert(pthread_join(readers[r], NULL) == 0);
        }

        assert(pthread_mutex_destroy(&r_ctx.mutex) == 0);

        int v = atomic_load(&r_ctx.race_violation);
        if (v != 0) {
            race_detected = v;
            break;
        }

        execute_helper(helper_bin, "unlink", test_root, rel_iter, NULL, 0, NULL, 0);
    }
    free(c_payload);

    if (race_detected == 0) {
        printf("PASSED (Zero leituras parciais ou vazias em 5 iterações)\n");
        passed++;
    } else {
        printf("FAILED (Violação de concorrência detectada: código %d)\n", race_detected);
    }

    // TESTE 15: Auditoria final do hash da sentinela externa
    printf("[TEST 15/15] Verificação final de integridade e hash do arquivo sentinela... ");
    char canary_hash_after[65];
    compute_file_sha256(canary_path, canary_hash_after);
    if (strcmp(canary_hash_before, canary_hash_after) == 0) {
        printf("PASSED (Hash SHA-256 idêntico ao inicial: %s)\n", canary_hash_after);
        passed++;
    } else {
        printf("FAILED (Hash divergiu! Before: %s, After: %s)\n", canary_hash_before, canary_hash_after);
    }

    // Limpeza
    assert(unlink(canary_path) == 0);
    assert(rmdir(sub_dir) == 0);
    assert(rmdir(test_root) == 0);

    printf("\n================================================================================\n");
    printf("RESULTADO DOS TESTES NATIVOS: %d/%d PASSARAM\n", passed, total);
    if (passed == total) {
        printf("STATUS: 100%% SUCESSO - CONFORME COM AUDITORIA G4.2 V10\n");
    } else {
        printf("STATUS: FAILED (%d cenários falharam)\n", total - passed);
    }
    printf("================================================================================\n");
    printf("PASSED=%d\n", passed);
    printf("FAILED=%d\n", total - passed);
    printf("TOTAL=%d\n", total);
    printf("EXIT_CODE=%d\n", (passed == total) ? 0 : 1);

    return (passed == total) ? 0 : 1;
}
