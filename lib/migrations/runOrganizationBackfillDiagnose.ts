/**
 * CLI — diagnóstico e dry-run do Organization Backfill (somente leitura).
 *
 * Uso:
 *   npx tsx lib/migrations/runOrganizationBackfillDiagnose.ts
 *   npx tsx lib/migrations/runOrganizationBackfillDiagnose.ts --dry-run
 */
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import {
  diagnoseOrganizationBackfill,
  dryRunOrganizationBackfill,
  formatDiagnosisReportForConsole,
} from '@/lib/migrations';

function loadEnvLocal() {
  const envPath = join(process.cwd(), '.env.local');
  if (!existsSync(envPath)) return;
  const lines = readFileSync(envPath, 'utf-8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

async function main() {
  loadEnvLocal();
  const dryRun = process.argv.includes('--dry-run');

  const { getFirestoreAdmin } = await import('@/lib/server/firebaseAdminOftware');
  const db = getFirestoreAdmin();

  const report = dryRun
    ? await dryRunOrganizationBackfill(db)
    : await diagnoseOrganizationBackfill(db);

  console.log(formatDiagnosisReportForConsole(report));
  console.log('');
  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
