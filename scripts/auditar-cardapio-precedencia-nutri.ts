/**
 * Diagnóstico: planos em que a nutri salvou cardápio mas a opção Atual
 * ainda é o padrão automático (paciente antigo / anamnese sobrescreveu).
 *
 * Uso: npx tsx scripts/auditar-cardapio-precedencia-nutri.ts
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
  const { getFirestoreAdmin } = await import('../lib/server/firebaseAdminOftware');
  const {
    planoTemEdicaoDeNutricionista,
    resolverOpcaoAtualComPrecedenciaNutri,
    slotFoiEditadoPorNutricionista,
    REFEICOES_CARDAPIO_KEYS,
    normalizarSlotsCardapio,
  } = await import('../lib/nutri/cardapioPrecedenciaNutri');
  const db = getFirestoreAdmin();
  const planosSnap = await db.collectionGroup('nutricao').get();
  const divergentes: Array<{
    pacienteId: string;
    refeicoes: string[];
    temFlagNutri: boolean;
  }> = [];
  let comPlano = 0;
  let comEdicaoNutri = 0;

  for (const planoSnap of planosSnap.docs) {
    if (planoSnap.id !== 'plano') continue;
    comPlano += 1;
    const plano = planoSnap.data() || {};
    const temEdicao = planoTemEdicaoDeNutricionista(plano);
    if (temEdicao) comEdicaoNutri += 1;
    const refeicoes: string[] = [];
    for (const key of REFEICOES_CARDAPIO_KEYS) {
      const slots = normalizarSlotsCardapio(plano.opcoesSlots?.[key]);
      const selecionadaId = plano.opcoesSelecionadas?.[key];
      const resolvida = resolverOpcaoAtualComPrecedenciaNutri(slots, selecionadaId, key);
      const selecionada = slots.find((s) => s.id === selecionadaId);
      const temNutri = slots.some(
        (s, i) =>
          slotFoiEditadoPorNutricionista(s) ||
          (i > 0 && Boolean(s.descricao || s.itensSelecionados?.length))
      );
      if (
        temNutri &&
        resolvida !== selecionadaId &&
        (!selecionada || selecionada.origem === 'automatica')
      ) {
        refeicoes.push(key);
      }
    }
    if (refeicoes.length > 0) {
      const pacienteId = planoSnap.ref.parent.parent?.id || planoSnap.id;
      divergentes.push({
        pacienteId,
        refeicoes,
        temFlagNutri: Boolean(plano.cardapioEditadoPorNutricionista),
      });
    }
  }

  console.log(
    JSON.stringify(
      {
        docsNutricao: planosSnap.size,
        comPlano,
        comEdicaoNutri,
        divergentesCount: divergentes.length,
        divergentes: divergentes.slice(0, 80),
      },
      null,
      2
    )
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
