import { execSync } from 'child_process';
import * as fs from 'fs';

// Primeiro git add para rastrear todos os novos arquivos
execSync('git add apps/api/scripts/storage_linux_helper.c apps/api/src/modules/wearables/services/storage-linux-helper.ts apps/api/Dockerfile apps/api/scripts/monitor_staging_vps.sh apps/api/scripts/vps_isolation_guard_rail.mjs apps/api/src/modules/wearables/services/storage.service.ts apps/api/test/wearables/anti-toctou.spec.ts docs/runbooks/staging_deploy_wearables.md RESULTADOS_TESTES_LOCAIS_G4_2_V5.txt', { stdio: 'inherit' });

// Obter o diff em relacao a ff71bd6bfb84b50a2f0e47693428f7a8deda37ef excluindo zips e o patch
const diff = execSync('git diff ff71bd6bfb84b50a2f0e47693428f7a8deda37ef -- . ":!*.zip" ":!diff_g4_2.patch"', {
  maxBuffer: 50 * 1024 * 1024,
  encoding: 'utf8'
});

fs.writeFileSync('diff_g4_2.patch', diff, { encoding: 'utf8' });
console.log('Diff gerado com sucesso:', diff.length, 'caracteres.');
