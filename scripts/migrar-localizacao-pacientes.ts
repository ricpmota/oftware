/**
 * Migração administrativa da localização em pacientes_completos.
 *
 * Padrão: dry-run. Não escreve.
 *
 *   npx tsx scripts/migrar-localizacao-pacientes.ts --dry-run
 *
 * Escrita, somente com os dois argumentos:
 *
 *   npx tsx scripts/migrar-localizacao-pacientes.ts --apply --confirm=LOCALIZACAO_ETAPA_7
 *
 * --apply sozinho é recusado. pacientes_abandono não é migrado.
 * --dry-run grava só reports/localizacao/etapa7-dry-run.json.
 * --apply grava um rollback e um arquivo de falhas novos em reports/localizacao/migrations/.
 * Nenhum dos dois modos regrava um rollback já existente.
 * A auditoria scripts/auditar-localizacao-pacientes.ts continua somente leitura.
 *
 * Cada update relê o documento numa transaction e classifica de novo.
 * Só entram B_RESOLVIVEL_SEM_CODIGO e C_RESOLVIVEL_NORMALIZACAO.
 * O update tem três paths e não substitui o mapa endereco.
 */
import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  gravarArtefatosApply,
  gravarRelatorioDryRun,
  type ResultadoMigracaoDocumento,
} from '../lib/localizacao/migracaoLocalizacaoArtefatos';
import {
  decidirMigracaoLocalizacao,
  extrairCamposEndereco,
  interpretarArgumentosMigracao,
  type DecisaoMigracaoLocalizacao,
} from '../lib/localizacao/migracaoLocalizacaoPaciente';
import type { PatientLocationCategory } from '../lib/localizacao/classifyPatientLocation';
import type { Firestore } from 'firebase-admin/firestore';

const COLECAO = 'pacientes_completos';
const COLECAO_ABANDONO = 'pacientes_abandono';

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

type Contagem = {
  total: number;
  categorias: Record<PatientLocationCategory, number>;
  eligible: number;
  b: number;
  c: number;
  skipped: number;
  porUf: Map<string, number>;
  porMunicipio: Map<string, { codigoIbge: string; cidade: string; uf: string; quantidade: number }>;
};

function contagemVazia(): Contagem {
  return {
    total: 0,
    categorias: {
      A_CANONICO: 0,
      B_RESOLVIVEL_SEM_CODIGO: 0,
      C_RESOLVIVEL_NORMALIZACAO: 0,
      D_CODIGO_INCONSISTENTE: 0,
      E_ESTADO_AUSENTE: 0,
      F_CIDADE_AUSENTE: 0,
      G_LOCALIZACAO_AUSENTE: 0,
      H_NAO_RESOLVIVEL: 0,
      I_ESTADO_INVALIDO: 0,
    },
    eligible: 0,
    b: 0,
    c: 0,
    skipped: 0,
    porUf: new Map(),
    porMunicipio: new Map(),
  };
}

function absorver(contagem: Contagem, decisao: DecisaoMigracaoLocalizacao) {
  contagem.total += 1;
  contagem.categorias[decisao.categoria] += 1;
  if (decisao.acao === 'ignorar') {
    contagem.skipped += 1;
    return;
  }
  contagem.eligible += 1;
  if (decisao.categoria === 'B_RESOLVIVEL_SEM_CODIGO') contagem.b += 1;
  if (decisao.categoria === 'C_RESOLVIVEL_NORMALIZACAO') contagem.c += 1;
  const uf = decisao.proposta.estado;
  contagem.porUf.set(uf, (contagem.porUf.get(uf) || 0) + 1);
  const municipio = contagem.porMunicipio.get(decisao.proposta.codigoIbge) || {
    codigoIbge: decisao.proposta.codigoIbge,
    cidade: decisao.proposta.cidade,
    uf: decisao.proposta.estado,
    quantidade: 0,
  };
  municipio.quantidade += 1;
  contagem.porMunicipio.set(decisao.proposta.codigoIbge, municipio);
}

function resultadoAtualizado(
  id: string,
  decisao: Extract<DecisaoMigracaoLocalizacao, { acao: 'atualizar' }>
): Extract<ResultadoMigracaoDocumento, { status: 'updated' }> {
  return {
    status: 'updated',
    documentId: id,
    before: {
      estado: decisao.anterior.estado,
      cidade: decisao.anterior.cidade,
      codigoIbge: decisao.anterior.codigoIbge,
    },
    after: {
      estado: decisao.update['dadosIdentificacao.endereco.estado'],
      cidade: decisao.update['dadosIdentificacao.endereco.cidade'],
      codigoIbge: decisao.update['dadosIdentificacao.endereco.codigoIbge'],
    },
  };
}

async function main() {
  const modo = interpretarArgumentosMigracao(process.argv.slice(2));
  loadEnvFile(resolve(process.cwd(), '.env.local'));
  loadEnvFile(resolve(process.cwd(), '.env'));

  const { getFirestoreAdmin } = await import('../lib/server/firebaseAdminOftware');
  const db = getFirestoreAdmin();
  let reads = 0;
  let writes = 0;
  const deletes = 0;

  const snap = await db
    .collection(COLECAO)
    .select(
      'dadosIdentificacao.endereco.estado',
      'dadosIdentificacao.endereco.cidade',
      'dadosIdentificacao.endereco.codigoIbge'
    )
    .get();
  reads += snap.size;

  const contagem = contagemVazia();
  const candidatos: string[] = [];
  for (const doc of snap.docs) {
    const decisao = decidirMigracaoLocalizacao(extrairCamposEndereco(doc.data() as Record<string, unknown>));
    absorver(contagem, decisao);
    if (decisao.acao === 'atualizar') candidatos.push(doc.id);
  }

  const abandonoSnap = await db
    .collection(COLECAO_ABANDONO)
    .select(
      'dadosIdentificacao.endereco.estado',
      'dadosIdentificacao.endereco.cidade',
      'dadosIdentificacao.endereco.codigoIbge'
    )
    .get();
  reads += abandonoSnap.size;
  let abandonoEligible = 0;
  for (const doc of abandonoSnap.docs) {
    const decisao = decidirMigracaoLocalizacao(extrairCamposEndereco(doc.data() as Record<string, unknown>));
    if (decisao.acao === 'atualizar') abandonoEligible += 1;
  }

  const dir = resolve(process.cwd(), 'reports/localizacao');

  const porUf = [...contagem.porUf.entries()]
    .map(([uf, quantidade]) => ({ uf, quantidade }))
    .sort((a, b) => b.quantidade - a.quantidade);
  const porMunicipio = [...contagem.porMunicipio.values()].sort((a, b) => b.quantidade - a.quantidade);

  const dryRun = {
    modo: 'dry-run' as const,
    collection: COLECAO,
    geradoEm: new Date().toISOString(),
    totalLido: contagem.total,
    categorias: contagem.categorias,
    B: contagem.b,
    C: contagem.c,
    eligible: contagem.eligible,
    skipped: contagem.skipped,
    porUf,
    porMunicipio,
    pacientes_abandono: {
      totalLido: abandonoSnap.size,
      eligible: abandonoEligible,
      writes: 0,
    },
    firestoreReads: reads,
    firestoreWrites: 0,
    firestoreDeletes: deletes,
  };

  if (modo.modo === 'dry-run') {
    gravarRelatorioDryRun(dir, dryRun);
  }

  if (modo.modo === 'apply') {
    const executedAt = new Date();
    const resultado = await aplicar(db, candidatos);
    writes = resultado.filter((item) => item.status === 'updated').length;
    const artefatos = gravarArtefatosApply({
      dir: resolve(dir, 'migrations'),
      executedAt,
      executionId: randomBytes(4).toString('hex'),
      resultados: resultado,
    });
    console.log(
      JSON.stringify(
        {
          modo: 'apply',
          attempted: resultado.length,
          updated: writes,
          skippedBecauseChanged: resultado.filter((item) => item.status === 'skippedBecauseChanged').length,
          failed: resultado.filter((item) => item.status === 'failed').length,
          firestoreWrites: writes,
          firestoreDeletes: deletes,
          rollback: artefatos.rollbackPath,
          falhas: artefatos.falhasPath,
        },
        null,
        2
      )
    );
    return;
  }

  if (writes !== 0 || deletes !== 0) {
    throw new Error('Dry-run tentou alterar o Firestore.');
  }

  console.log(
    JSON.stringify(
      {
        modo: dryRun.modo,
        totalLido: dryRun.totalLido,
        categorias: dryRun.categorias,
        B: dryRun.B,
        C: dryRun.C,
        eligible: dryRun.eligible,
        skipped: dryRun.skipped,
        porUf: dryRun.porUf,
        pacientes_abandono: dryRun.pacientes_abandono,
        firestoreReads: reads,
        firestoreWrites: 0,
        firestoreDeletes: 0,
      },
      null,
      2
    )
  );
}

async function aplicar(db: Firestore, ids: string[]): Promise<ResultadoMigracaoDocumento[]> {
  if (COLECAO !== 'pacientes_completos') {
    throw new Error('Esta migração só altera pacientes_completos.');
  }

  const resultados: ResultadoMigracaoDocumento[] = [];

  for (const id of ids) {
    try {
      const outcome = await db.runTransaction(async (tx) => {
        const ref = db.collection(COLECAO).doc(id);
        const snap = await tx.get(ref);
        if (!snap.exists) return { status: 'skippedBecauseChanged' as const, documentId: id };
        const dados = snap.data() as Record<string, unknown> | undefined;
        const decisao = decidirMigracaoLocalizacao(extrairCamposEndereco(dados));
        if (decisao.acao !== 'atualizar') return { status: 'skippedBecauseChanged' as const, documentId: id };
        const row = resultadoAtualizado(id, decisao);
        tx.update(ref, decisao.update);
        return row;
      });
      resultados.push(outcome);
    } catch (error) {
      resultados.push({
        status: 'failed',
        documentId: id,
        motivo: error instanceof Error ? error.message : 'falha sem mensagem',
      });
    }
  }

  return resultados;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
