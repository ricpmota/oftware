/**
 * Script one-shot: backfill pacientes_completos profissionais espelho.
 *
 * Uso:
 *   npx tsx scripts/backfill-paciente-profissionais-espelho.ts
 *   npx tsx scripts/backfill-paciente-profissionais-espelho.ts --dry-run
 */

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

function loadEnvFile(filePath: string) {
  if (!existsSync(filePath)) return;
  const text = readFileSync(filePath, 'utf8');
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadEnvFile(resolve(process.cwd(), '.env.local'));
loadEnvFile(resolve(process.cwd(), '.env'));

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const { getFirestoreAdmin } = await import('../lib/server/firebaseAdminOftware');
  const { backfillPacienteProfissionaisEspelho } = await import(
    '../lib/paciente/backfillPacienteProfissionaisEspelho.server'
  );

  const report = await backfillPacienteProfissionaisEspelho(getFirestoreAdmin(), { dryRun });
  console.log(JSON.stringify(report, null, 2));
  if (report.erros.length > 0) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
