/**
 * AUDITORIA SOMENTE LEITURA da localização em pacientes_completos e pacientes_abandono.
 *
 * Este arquivo não importa update, set, delete, batch nem bulkWriter.
 * Não aceita --apply. A migração fica para outro script, na Etapa 7.
 *
 * Uso:
 *   npx tsx scripts/auditar-localizacao-pacientes.ts
 *
 * Credenciais: as mesmas de lib/server/firebaseAdminOftware (variáveis de ambiente).
 * Nada de chave no código.
 */
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { readFileSync, existsSync } from 'node:fs';
import {
  classifyPatientLocation,
  categoriaEhCandidataAutomatica,
  type ClassifiedPatientLocation,
  type PatientLocationCategory,
} from '../lib/localizacao/classifyPatientLocation';

const FIRESTORE_WRITES = 0;
const FIRESTORE_DELETES = 0;

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

function assertReadOnlyInvocation() {
  const blocked = process.argv.filter((arg) => /apply|write|migrate|delete/i.test(arg));
  if (blocked.length > 0) {
    throw new Error(`Script somente leitura. Argumento recusado: ${blocked.join(', ')}`);
  }
}

function refHash(collection: string, id: string): string {
  return createHash('sha256').update(`${collection}/${id}`).digest('hex').slice(0, 16);
}

type Agg = {
  total: number;
  categories: Record<PatientLocationCategory, number>;
  codigoIbge: { presente: number; ausente: number; valido: number; invalido: number; inconsistente: number };
  legacyRoot: { cidade: number; estado: number; ambos: number; comEndereco: number; semEndereco: number };
  candidatosAutomaticos: number;
  revisaoManual: number;
  variacoes: Map<string, { de: string; para: string; quantidade: number }>;
  porEstado: Map<string, { uf: string; total: number; canonico: number; resolviveis: number; naoResolviveis: number; semCidade: number; semCodigoIbge: number }>;
  porMunicipio: Map<string, { codigoIbge: string; cidade: string; uf: string; quantidade: number }>;
  naoResolvidos: Map<string, { categoria: PatientLocationCategory; estado: string; cidade: string; quantidade: number }>;
  indice: Array<{ hash: string; colecao: string; id: string; categoria: PatientLocationCategory }>;
};

function emptyAgg(): Agg {
  const categories = {
    A_CANONICO: 0,
    B_RESOLVIVEL_SEM_CODIGO: 0,
    C_RESOLVIVEL_NORMALIZACAO: 0,
    D_CODIGO_INCONSISTENTE: 0,
    E_ESTADO_AUSENTE: 0,
    F_CIDADE_AUSENTE: 0,
    G_LOCALIZACAO_AUSENTE: 0,
    H_NAO_RESOLVIVEL: 0,
    I_ESTADO_INVALIDO: 0,
  };
  return {
    total: 0,
    categories,
    codigoIbge: { presente: 0, ausente: 0, valido: 0, invalido: 0, inconsistente: 0 },
    legacyRoot: { cidade: 0, estado: 0, ambos: 0, comEndereco: 0, semEndereco: 0 },
    candidatosAutomaticos: 0,
    revisaoManual: 0,
    variacoes: new Map(),
    porEstado: new Map(),
    porMunicipio: new Map(),
    naoResolvidos: new Map(),
    indice: [],
  };
}

function asText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function bumpEstado(agg: Agg, classified: ClassifiedPatientLocation) {
  const uf =
    classified.ufResolvida ||
    (classified.categoria === 'I_ESTADO_INVALIDO' ? '_INVALIDO' : '_SEM_UF');
  const row = agg.porEstado.get(uf) || {
    uf,
    total: 0,
    canonico: 0,
    resolviveis: 0,
    naoResolviveis: 0,
    semCidade: 0,
    semCodigoIbge: 0,
  };
  row.total += 1;
  if (classified.categoria === 'A_CANONICO') row.canonico += 1;
  if (categoriaEhCandidataAutomatica(classified.categoria)) row.resolviveis += 1;
  if (
    classified.categoria === 'D_CODIGO_INCONSISTENTE' ||
    classified.categoria === 'H_NAO_RESOLVIVEL' ||
    classified.categoria === 'I_ESTADO_INVALIDO'
  ) {
    row.naoResolviveis += 1;
  }
  if (classified.categoria === 'F_CIDADE_AUSENTE') row.semCidade += 1;
  if (!classified.codigoIbge.presente) row.semCodigoIbge += 1;
  agg.porEstado.set(uf, row);
}

function absorb(agg: Agg, collection: string, id: string, data: Record<string, unknown>) {
  const identificacao = data.dadosIdentificacao;
  const endereco =
    identificacao && typeof identificacao === 'object'
      ? (identificacao as { endereco?: Record<string, unknown> }).endereco
      : undefined;
  const temEndereco = Boolean(endereco && typeof endereco === 'object');
  const estado = temEndereco ? asText(endereco?.estado) : '';
  const cidade = temEndereco ? asText(endereco?.cidade) : '';
  const codigoIbge = temEndereco ? asText(endereco?.codigoIbge) : '';
  const rootCidade = asText(data.cidade);
  const rootEstado = asText(data.estado);
  const classified = classifyPatientLocation({ estado, cidade, codigoIbge });

  agg.total += 1;
  agg.categories[classified.categoria] += 1;
  if (classified.codigoIbge.presente) agg.codigoIbge.presente += 1;
  else agg.codigoIbge.ausente += 1;
  if (classified.codigoIbge.valido) agg.codigoIbge.valido += 1;
  if (classified.codigoIbge.invalido) agg.codigoIbge.invalido += 1;
  if (classified.codigoIbge.inconsistente) agg.codigoIbge.inconsistente += 1;
  if (rootCidade) agg.legacyRoot.cidade += 1;
  if (rootEstado) agg.legacyRoot.estado += 1;
  if (rootCidade && rootEstado) agg.legacyRoot.ambos += 1;
  if (temEndereco) agg.legacyRoot.comEndereco += 1;
  else agg.legacyRoot.semEndereco += 1;
  if (categoriaEhCandidataAutomatica(classified.categoria)) agg.candidatosAutomaticos += 1;
  if (
    classified.categoria === 'D_CODIGO_INCONSISTENTE' ||
    classified.categoria === 'E_ESTADO_AUSENTE' ||
    classified.categoria === 'F_CIDADE_AUSENTE' ||
    classified.categoria === 'H_NAO_RESOLVIVEL' ||
    classified.categoria === 'I_ESTADO_INVALIDO'
  ) {
    agg.revisaoManual += 1;
    agg.indice.push({
      hash: refHash(collection, id),
      colecao: collection,
      id,
      categoria: classified.categoria,
    });
    const key = `${classified.categoria}|${estado}|${cidade}`;
    const item = agg.naoResolvidos.get(key) || {
      categoria: classified.categoria,
      estado,
      cidade,
      quantidade: 0,
    };
    item.quantidade += 1;
    agg.naoResolvidos.set(key, item);
  }

  if (classified.proposta && categoriaEhCandidataAutomatica(classified.categoria)) {
    const de = `${cidade} / ${estado}`;
    const para = `${classified.proposta.cidade} / ${classified.proposta.estado}`;
    const vKey = `${de}=>${para}`;
    const row = agg.variacoes.get(vKey) || { de, para, quantidade: 0 };
    row.quantidade += 1;
    agg.variacoes.set(vKey, row);
    const mKey = classified.proposta.codigoIbge;
    const mun = agg.porMunicipio.get(mKey) || {
      codigoIbge: classified.proposta.codigoIbge,
      cidade: classified.proposta.cidade,
      uf: classified.proposta.estado,
      quantidade: 0,
    };
    mun.quantidade += 1;
    agg.porMunicipio.set(mKey, mun);
  }

  if (classified.categoria === 'A_CANONICO' && classified.proposta) {
    const mKey = classified.proposta.codigoIbge;
    const mun = agg.porMunicipio.get(mKey) || {
      codigoIbge: classified.proposta.codigoIbge,
      cidade: classified.proposta.cidade,
      uf: classified.proposta.estado,
      quantidade: 0,
    };
    mun.quantidade += 1;
    agg.porMunicipio.set(mKey, mun);
  }

  bumpEstado(agg, classified);
}

function percent(count: number, total: number): number {
  if (!total) return 0;
  return Math.round((count / total) * 1000) / 10;
}

function serialize(collection: string, agg: Agg) {
  const categories = Object.fromEntries(
    Object.entries(agg.categories).map(([key, count]) => [key, { count, percent: percent(count, agg.total) }])
  );
  return {
    collection,
    total: agg.total,
    categories,
    codigoIbge: agg.codigoIbge,
    legacyRoot: agg.legacyRoot,
    candidatosAutomaticos: agg.candidatosAutomaticos,
    revisaoManual: agg.revisaoManual,
    localizacaoAusente: agg.categories.G_LOCALIZACAO_AUSENTE,
  };
}

async function main() {
  assertReadOnlyInvocation();
  loadEnvFile(resolve(process.cwd(), '.env.local'));
  loadEnvFile(resolve(process.cwd(), '.env'));

  const { getFirestoreAdmin } = await import('../lib/server/firebaseAdminOftware');
  const db = getFirestoreAdmin();
  let reads = 0;

  async function load(collectionName: string) {
    const snap = await db
      .collection(collectionName)
      .select('dadosIdentificacao.endereco', 'cidade', 'estado')
      .get();
    reads += snap.size;
    return snap;
  }

  const completos = await load('pacientes_completos');
  const abandono = await load('pacientes_abandono');
  const aggCompletos = emptyAgg();
  const aggAbandono = emptyAgg();

  for (const doc of completos.docs) {
    absorb(aggCompletos, 'pacientes_completos', doc.id, doc.data() as Record<string, unknown>);
  }
  for (const doc of abandono.docs) {
    absorb(aggAbandono, 'pacientes_abandono', doc.id, doc.data() as Record<string, unknown>);
  }

  const dir = resolve(process.cwd(), 'reports/localizacao');
  mkdirSync(dir, { recursive: true });

  const top = (rows: Array<{ quantidade: number }>, limit = 20) =>
    [...rows].sort((a, b) => b.quantidade - a.quantidade).slice(0, limit);

  writeFileSync(resolve(dir, 'resumo.json'), JSON.stringify(serialize('pacientes_completos', aggCompletos), null, 2));
  writeFileSync(resolve(dir, 'resumo-abandono.json'), JSON.stringify(serialize('pacientes_abandono', aggAbandono), null, 2));
  writeFileSync(
    resolve(dir, 'variacoes.json'),
    JSON.stringify(top([...aggCompletos.variacoes.values()], 200), null, 2)
  );
  writeFileSync(
    resolve(dir, 'por-estado.json'),
    JSON.stringify(
      [...aggCompletos.porEstado.values()].sort((a, b) => b.total - a.total),
      null,
      2
    )
  );
  writeFileSync(
    resolve(dir, 'por-municipio.json'),
    JSON.stringify(
      [...aggCompletos.porMunicipio.values()].sort((a, b) => b.quantidade - a.quantidade),
      null,
      2
    )
  );
  writeFileSync(
    resolve(dir, 'nao-resolvidos.json'),
    JSON.stringify(top([...aggCompletos.naoResolvidos.values()], 200), null, 2)
  );
  writeFileSync(resolve(dir, 'revisao-indice.json'), JSON.stringify(aggCompletos.indice, null, 2));

  if (FIRESTORE_WRITES !== 0 || FIRESTORE_DELETES !== 0) {
    throw new Error('Escrita detectada. A auditoria foi interrompida.');
  }

  const resumo = serialize('pacientes_completos', aggCompletos);
  console.log(
    JSON.stringify(
      {
        pacientes_completos: resumo.total,
        categorias: resumo.categories,
        candidatosAutomaticos: resumo.candidatosAutomaticos,
        revisaoManual: resumo.revisaoManual,
        localizacaoAusente: resumo.localizacaoAusente,
        codigoIbge: resumo.codigoIbge,
        legacyRoot: resumo.legacyRoot,
        pacientes_abandono: serialize('pacientes_abandono', aggAbandono).total,
        abandonoCategorias: serialize('pacientes_abandono', aggAbandono).categories,
        firestoreReads: reads,
        firestoreWrites: FIRESTORE_WRITES,
        firestoreDeletes: FIRESTORE_DELETES,
        relatorios: dir,
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
