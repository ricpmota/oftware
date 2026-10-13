/**
 * Gera um link de check-in de hidratação para teste local (Admin SDK).
 * Não é uma rota pública.
 *
 * Uso:
 *   npx tsx scripts/gerar-link-hidratacao-checkin.ts --patientId=ID_DO_PACIENTE
 *   npx tsx scripts/gerar-link-hidratacao-checkin.ts --patientId=ID --expired
 *   npx tsx scripts/gerar-link-hidratacao-checkin.ts --patientId=ID --dates=2026-08-29,2026-08-30
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

function argValue(name: string): string | null {
  const prefix = `--${name}=`;
  const found = process.argv.find((a) => a.startsWith(prefix));
  return found ? found.slice(prefix.length).trim() : null;
}

async function main() {
  const patientId = argValue('patientId') || argValue('pacienteId');
  if (!patientId) {
    console.error('Informe --patientId=ID_DO_PACIENTE');
    process.exit(1);
  }

  const expired = process.argv.includes('--expired');
  const datesRaw = argValue('dates');
  const allowedDates = datesRaw
    ? datesRaw.split(',').map((d) => d.trim()).filter(Boolean)
    : undefined;

  const { getFirestoreAdmin } = await import('../lib/server/firebaseAdminOftware');
  const { createHydrationCheckInLink } = await import(
    '../lib/nutri/hidratacao/hydrationCheckInLink.server'
  );

  const created = await createHydrationCheckInLink(getFirestoreAdmin(), {
    patientId,
    createdByType: 'system',
    createdByUserId: 'dev-script',
    allowedDates,
    ttlDays: expired ? -1 : undefined,
    skipReuse: expired,
  });

  console.log(
    JSON.stringify(
      {
        reused: created.reused,
        url: created.url,
        token: created.token,
        allowedDates: created.link.allowedDates,
        expiresAt: created.link.expiresAt.toISOString(),
        expired,
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
