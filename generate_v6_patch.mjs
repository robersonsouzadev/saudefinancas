import { execSync } from 'child_process';
import * as fs from 'fs';

// Adicionar arquivos ao git index
execSync('git add apps/api/scripts/storage_linux_helper.c apps/api/src/modules/wearables/services/storage-linux-helper.ts apps/api/src/modules/wearables/services/storage.service.ts apps/api/test/wearables/anti-toctou.spec.ts apps/api/scripts/run_storage_linux_tests.sh apps/api/scripts/test_storage_linux_native.c RESULTADOS_TESTES_LINUX_G4_2_V6.txt', { stdio: 'inherit' });

// Obter diff unificado limpo contra ff71bd6bfb84b50a2f0e47693428f7a8deda37ef excluindo zips e arquivos de patch
const diff = execSync('git diff ff71bd6bfb84b50a2f0e47693428f7a8deda37ef -- . ":!*.zip" ":!*.patch"', {
  maxBuffer: 50 * 1024 * 1024,
  encoding: 'utf8'
});

fs.writeFileSync('diff_g4_2_v6.patch', diff, { encoding: 'utf8' });
console.log('diff_g4_2_v6.patch gerado com sucesso:', diff.length, 'caracteres.');
