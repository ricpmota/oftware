/**
 * Script one-shot: cria as 7 pastas e importa os 37 protocolos do JSON.
 * Uso: npx tsx lib/prescricao/runImportarProtocolos.ts
 */
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { importarProtocolosOftware } from './importarProtocolosOftware';

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
  const { getFirestoreAdmin } = await import('@/lib/server/firebaseAdminOftware');
  const db = getFirestoreAdmin();
  const resultado = await importarProtocolosOftware(db);
  console.log('Importação concluída:');
  console.log(`  Pastas criadas: ${resultado.pastasCriadas}`);
  console.log(`  Pastas existentes: ${resultado.pastasExistentes}`);
  console.log(`  Protocolos criados: ${resultado.protocolosCriados}`);
  console.log(`  Protocolos atualizados: ${resultado.protocolosAtualizados}`);
  console.log(`  Protocolos ignorados: ${resultado.protocolosIgnorados}`);
  console.log(JSON.stringify(resultado, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
