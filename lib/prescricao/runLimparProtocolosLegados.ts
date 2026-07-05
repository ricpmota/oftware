/**
 * Remove protocolos legados da aba Protocolo (fora do JSON canônico de 41 itens).
 * Uso: npx tsx lib/prescricao/runLimparProtocolosLegados.ts
 */
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { limparProtocolosLegadosOftware } from './importarProtocolosOftware';

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
  const resultado = await limparProtocolosLegadosOftware(db);

  console.log('Limpeza concluída:');
  console.log(`  Protocolos mantidos: ${resultado.protocolosMantidos}`);
  console.log(`  Protocolos removidos: ${resultado.protocolosRemovidos}`);
  if (resultado.removidos.length > 0) {
    console.log('\nRemovidos:');
    for (const r of resultado.removidos) {
      console.log(`  - [${r.pastaNome}] ${r.nome}`);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
