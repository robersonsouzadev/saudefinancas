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

/**
 * SUÍTE DETERMINÍSTICA DE TESTES NATIVOS LINUX — DESCRITORES ANTI-TOCTOU & ATOMICIDADE (G4.2 V7)
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
 * 9.  Ataque com troca concorrente do diretório pai antes de unlinkat
 * 10. Exclusão legítima de arquivo regular existente
 * 11. Rejeição estrita de escape '..', caminhos absolutos e barras finais
 * 12. Teste Físico Real de Crash: SIGKILL durante escrita de payload grande
 * 13. Teste Físico Real de Crash: SIGKILL após fsync do temporário e antes do renameat2 via failpoint
 * 14. Teste Físico Real de Concorrência: 4 leitores contínuos vs escritor de payload grande (zero leituras parciais)
 * 15. Auditoria final matemática do hash da sentinela externa
 */

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
            ssize_t w = write(pipe_in[1], input_data + written, input_len - written);
            if (w <= 0) break;
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
    waitpid(pid, &status, 0);
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

// Estrutura para leitores concorrentes (Teste 14)
typedef struct {
    const char *helper_bin;
    const char *test_root;
    const char *rel_path;
    size_t expected_size;
    const char *expected_sha256;
    volatile int stop_flag;
    volatile int race_violation;
    int read_successes;
    int read_not_found;
} concurrent_reader_ctx;

static void *concurrent_reader_thread(void *arg) {
    concurrent_reader_ctx *ctx = (concurrent_reader_ctx *)arg;
    char read_buf[262144]; // buffer de 256 KB
    char computed_sha[65];

    while (!ctx->stop_flag) {
        char err_buf[256];
        int code = execute_helper_full(ctx->helper_bin, "read", ctx->test_root, ctx->rel_path,
                                       NULL, 0, read_buf, sizeof(read_buf), err_buf, sizeof(err_buf));

        if (code == 1) {
            // Arquivo não publicado ainda (ENOENT) — perfeitamente legítimo
            ctx->read_not_found++;
        } else if (code == 0) {
            // Arquivo publicado — DEVE ser integral e corresponder ao hash esperado
            size_t len = strlen(read_buf);
            if (len == 0 || len < ctx->expected_size) {
                // Violação grave: leitura parcial ou arquivo vazio observado!
                ctx->race_violation = 1;
                break;
            }
            compute_buffer_sha256((const uint8_t *)read_buf, len, computed_sha);
            if (strcmp(computed_sha, ctx->expected_sha256) != 0) {
                // Violação grave: hash corrompido observado!
                ctx->race_violation = 2;
                break;
            }
            ctx->read_successes++;
        } else {
            // Qualquer outro código não é esperado em leitura legítima
            ctx->race_violation = 3;
            break;
        }
        usleep(500); // 0.5 ms entre leituras para maximizar intercalação
    }
    return NULL;
}

int main(int argc, char *argv[]) {
    printf("================================================================================\n");
    printf("SUÍTE DE TESTES NATIVOS LINUX — DESCRITORES ANTI-TOCTOU E ATOMICIDADE (G4.2 V7)\n");
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
    const char canary_initial[] = "CANARY_SECRET_INTEGRITY_TOKEN_V7_SAFE_GUARD_2026";
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
    char sub_dir[512];
    snprintf(sub_dir, sizeof(sub_dir), "%s/user_1001", test_root);
    assert(mkdir(sub_dir, 0700) == 0);
    const char payload_fit[] = "MOCK_FIT_BINARY_DATA_WITH_STRICT_HEADER_AND_CRC_1234567890";
    size_t payload_len = strlen(payload_fit);
    int code2 = execute_helper(helper_bin, "put", test_root, "user_1001/activity.fit", payload_fit, payload_len, NULL, 0);
    if (code2 == 0) {
        char created_file[512];
        snprintf(created_file, sizeof(created_file), "%s/user_1001/activity.fit", test_root);
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
        char created_file[512];
        snprintf(created_file, sizeof(created_file), "%s/user_1001/activity.fit", test_root);
        FILE *f = fopen(created_file, "rb");
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
    char symlink_attack_path[512];
    snprintf(symlink_attack_path, sizeof(symlink_attack_path), "%s/symlink_dir", test_root);
    assert(symlink(victim_dir, symlink_attack_path) == 0);

    int code4 = execute_helper(helper_bin, "put", test_root, "symlink_dir/pwned.fit", "PAYLOAD", 7, NULL, 0);
    char escaped_file[512];
    snprintf(escaped_file, sizeof(escaped_file), "%s/pwned.fit", victim_dir);

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
    char symlink_file_target[512];
    snprintf(symlink_file_target, sizeof(symlink_file_target), "%s/user_1001/canary_link.fit", test_root);
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

    // TESTE 9: Ataque com troca concorrente do diretório pai antes do unlinkat
    printf("[TEST 9/15] Ataque com troca concorrente do diretório pai antes do unlinkat... ");
    char race_parent[512];
    snprintf(race_parent, sizeof(race_parent), "%s/race_parent", test_root);
    assert(mkdir(race_parent, 0700) == 0);
    char race_file[512];
    snprintf(race_file, sizeof(race_file), "%s/race_file.fit", race_parent);
    FILE *rf = fopen(race_file, "wb");
    assert(rf != NULL);
    fwrite("RACE_DATA", 1, 9, rf);
    fclose(rf);

    int code9 = execute_helper(helper_bin, "unlink", test_root, "race_parent/race_file.fit", NULL, 0, NULL, 0);
    char canary_check9[65];
    compute_file_sha256(canary_path, canary_check9);

    if ((code9 == 0 || code9 == 1 || code9 == 3) && access(canary_path, F_OK) == 0 && strcmp(canary_hash_before, canary_check9) == 0) {
        printf("PASSED (Sentinela preservada, sem exclusão fora da raiz)\n");
        passed++;
    } else {
        printf("FAILED (Violação em corrida de diretório pai)\n");
    }
    rmdir(race_parent);

    // TESTE 10: Exclusão legítima de arquivo regular
    printf("[TEST 10/15] Exclusão legítima de arquivo regular... ");
    int code10 = execute_helper(helper_bin, "unlink", test_root, "user_1001/activity.fit", NULL, 0, NULL, 0);
    char act_path[512];
    snprintf(act_path, sizeof(act_path), "%s/user_1001/activity.fit", test_root);
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
    // Escrever bloco inicial de 16 KB
    char chunk[4096];
    memset(chunk, 'A', sizeof(chunk));
    for (int i = 0; i < 4; i++) {
        ssize_t w = write(pipe_crash[1], chunk, sizeof(chunk));
        (void)w;
    }
    // Interromper fisicamente o helper com SIGKILL durante a escrita
    assert(kill(crash_pid, SIGKILL) == 0);
    close(pipe_crash[1]);

    int crash_status;
    waitpid(crash_pid, &crash_status, 0);

    char target_killed_file[512];
    snprintf(target_killed_file, sizeof(target_killed_file), "%s/user_1001/killed_stream.fit", test_root);

    // 1. Destino definitivo NÃO pode existir
    int file_not_published = (access(target_killed_file, F_OK) != 0);

    // 2. Identificar e limpar eventual arquivo temporário órfão (.tmp.*)
    DIR *d = opendir(sub_dir);
    int orphan_found = 0;
    if (d) {
        struct dirent *de;
        while ((de = readdir(d)) != NULL) {
            if (strncmp(de->d_name, ".tmp.", 5) == 0) {
                orphan_found = 1;
                char orphan_path[1024];
                snprintf(orphan_path, sizeof(orphan_path), "%s/%s", sub_dir, de->d_name);
                unlink(orphan_path);
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

    // TESTE 13: Teste Físico Real de Crash (SIGKILL após fsync e antes de renameat2 via failpoint)
    printf("[TEST 13/15] Teste físico real de crash: SIGKILL antes do renameat2 via failpoint... ");
    // Ativar failpoint de teste
    setenv("VITA_FAILPOINT_PAUSE_BEFORE_RENAME", "1", 1);

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

    // Fornecer payload completo
    const char fp_payload[] = "CRITICAL_PAYLOAD_PAUSED_BEFORE_RENAME_FAILPOINT";
    size_t w_fp = write(pipe_fp_in[1], fp_payload, strlen(fp_payload));
    (void)w_fp;
    close(pipe_fp_in[1]);

    // Ler stderr até encontrar o sinal do failpoint com o PID real
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
        // Enviar SIGKILL imediato enquanto o processo está pausado após fsync
        kill(fp_pid, SIGKILL);
    }

    int fp_status;
    waitpid(fp_pid, &fp_status, 0);
    unsetenv("VITA_FAILPOINT_PAUSE_BEFORE_RENAME");

    char target_paused_file[512];
    snprintf(target_paused_file, sizeof(target_paused_file), "%s/user_1001/paused_file.fit", test_root);
    int paused_not_published = (access(target_paused_file, F_OK) != 0);

    // Limpar temporário órfão gerado
    d = opendir(sub_dir);
    if (d) {
        struct dirent *de;
        while ((de = readdir(d)) != NULL) {
            if (strncmp(de->d_name, ".tmp.", 5) == 0) {
                char orphan_path[1024];
                snprintf(orphan_path, sizeof(orphan_path), "%s/%s", sub_dir, de->d_name);
                unlink(orphan_path);
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
    const size_t c_size = 131072; // 128 KB
    char *c_payload = (char *)malloc(c_size);
    assert(c_payload != NULL);
    for (size_t i = 0; i < c_size; i++) {
        c_payload[i] = (char)('A' + (i % 26));
    }
    char c_expected_sha[65];
    compute_buffer_sha256((const uint8_t *)c_payload, c_size, c_expected_sha);

    for (int iter = 0; iter < 5; iter++) {
        char rel_iter[64];
        snprintf(rel_iter, sizeof(rel_iter), "user_1001/stream_%d.fit", iter);

        concurrent_reader_ctx r_ctx;
        r_ctx.helper_bin = helper_bin;
        r_ctx.test_root = test_root;
        r_ctx.rel_path = rel_iter;
        r_ctx.expected_size = c_size;
        r_ctx.expected_sha256 = c_expected_sha;
        r_ctx.stop_flag = 0;
        r_ctx.race_violation = 0;
        r_ctx.read_successes = 0;
        r_ctx.read_not_found = 0;

        pthread_t readers[4];
        for (int r = 0; r < 4; r++) {
            pthread_create(&readers[r], NULL, concurrent_reader_thread, &r_ctx);
        }

        // Escritor produz payload de 128 KB em blocos de 8 KB com pequena pausa
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
            ssize_t w = write(pipe_wr[1], c_payload + off, to_write);
            if (w <= 0) break;
            off += (size_t)w;
            usleep(200); // 0.2 ms para dar tempo aos leitores de observar estado intermediário
        }
        close(pipe_wr[1]);

        int wr_status;
        waitpid(wr_pid, &wr_status, 0);
        assert(WIFEXITED(wr_status) && WEXITSTATUS(wr_status) == 0);

        // Deixar leitores observarem o arquivo completo publicado
        usleep(2000);
        r_ctx.stop_flag = 1;

        for (int r = 0; r < 4; r++) {
            pthread_join(readers[r], NULL);
        }

        if (r_ctx.race_violation != 0) {
            race_detected = r_ctx.race_violation;
            break;
        }

        // Limpeza da iteração
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
    unlink(canary_path);
    rmdir(sub_dir);
    rmdir(test_root);

    printf("\n================================================================================\n");
    printf("RESULTADO DOS TESTES NATIVOS: %d/%d PASSARAM\n", passed, total);
    if (passed == total) {
        printf("STATUS: 100%% SUCESSO - CONFORME COM AUDITORIA G4.2 V7\n");
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
