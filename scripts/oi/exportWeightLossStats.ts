#!/usr/bin/env node
/**
 * Etapa 2 OI — exportação offline da base estatística anonimizada.
 * Leitura somente; não altera Firestore de produção.
 *
 * Uso:
 *   npx tsx scripts/oi/exportWeightLossStats.ts
 *
 * Variáveis de ambiente:
 *   FIREBASE_PROJECT_ID / NEXT_PUBLIC_FIREBASE_PROJECT_ID
 *   FIREBASE_CLIENT_EMAIL / FIREBASE_ADMIN_CLIENT_EMAIL
 *   FIREBASE_PRIVATE_KEY / FIREBASE_ADMIN_PRIVATE_KEY
 *   OI_ANON_SALT — salt obrigatório para pacienteAnonId (não logar)
 */
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { normalizePacienteDocument } from '@/lib/oi/normalizePacienteFirestore';
import {
  buildBenchmarks,
  buildPacienteConsolidado,
  MIN_BENCHMARK_SAMPLE,
  type ExportStats,
  type PacienteConsolidadoOi,
} from '@/lib/oi/weightLossExport';

const OUTPUT_DIR = join(process.cwd(), 'tmp', 'oi');
const CONSOLIDADO_PATH = join(OUTPUT_DIR, 'pacientes_tratamento_consolidado.json');
const BENCHMARKS_PATH = join(OUTPUT_DIR, 'weight_loss_benchmarks.json');

function getFirebaseAdmin() {
  const existingApps = getApps();
  if (existingApps.length > 0) {
    return getFirestore(existingApps[0] as ReturnType<typeof initializeApp>);
  }
  const projectId =
    process.env.FIREBASE_PROJECT_ID ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
    'oftware-9201e';
  const clientEmail =
    process.env.FIREBASE_CLIENT_EMAIL || process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey =
    process.env.FIREBASE_PRIVATE_KEY || process.env.FIREBASE_ADMIN_PRIVATE_KEY;

  if (!privateKey || !clientEmail) {
    throw new Error(
      'Credenciais Firebase Admin ausentes. Configure FIREBASE_CLIENT_EMAIL e FIREBASE_PRIVATE_KEY.'
    );
  }

  let processedKey = privateKey.replace(/\\n/g, '\n');
  if (!processedKey.includes('\n') && processedKey.includes('-----BEGIN')) {
    processedKey = processedKey
      .replace(/-----BEGIN PRIVATE KEY-----/, '-----BEGIN PRIVATE KEY-----\n')
      .replace(/-----END PRIVATE KEY-----/, '\n-----END PRIVATE KEY-----')
      .replace(/\n+/g, '\n');
  }

  const adminApp = initializeApp({
    credential: cert({ projectId, clientEmail, privateKey: processedKey }),
  });
  return getFirestore(adminApp);
}

function requireAnonSalt(): string {
  const salt = process.env.OI_ANON_SALT;
  if (!salt || salt.length < 16) {
    throw new Error(
      'OI_ANON_SALT ausente ou muito curto (mín. 16 caracteres). Necessário para pacienteAnonId irreversível.'
    );
  }
  return salt;
}

async function loadPacientesMap(db: Firestore): Promise<{
  map: Map<string, Record<string, unknown>>;
  duplicatasRemovidas: number;
}> {
  const map = new Map<string, Record<string, unknown>>();
  let duplicatasRemovidas = 0;

  const completosSnap = await db.collection('pacientes_completos').get();
  for (const doc of completosSnap.docs) {
    map.set(doc.id, doc.data() as Record<string, unknown>);
  }

  const abandonoSnap = await db.collection('pacientes_abandono').get();
  for (const doc of abandonoSnap.docs) {
    if (map.has(doc.id)) {
      duplicatasRemovidas += 1;
      continue;
    }
    map.set(doc.id, doc.data() as Record<string, unknown>);
  }

  return { map, duplicatasRemovidas };
}

function logSafeStats(stats: ExportStats, benchmarkSummary: { faixa: string; n: number; confiavel: boolean }[]) {
  console.log('[OI Export] Resumo (sem PII):');
  console.log(`  Pacientes lidos: ${stats.totalLidos}`);
  console.log(`  Elegíveis na base: ${stats.totalElegivel}`);
  console.log(`  Ignorados — sem peso inicial: ${stats.ignoradoSemPeso}`);
  console.log(`  Ignorados — sem evolução: ${stats.ignoradoSemEvolucao}`);
  console.log(`  Ignorados — sem dose/mg: ${stats.ignoradoSemDoseMg}`);
  console.log(`  Duplicatas removidas (abandono): ${stats.duplicatasRemovidas}`);
  console.log(`  Amostra mínima benchmark: n >= ${MIN_BENCHMARK_SAMPLE}`);
  console.log('  Benchmarks por faixa de meta:');
  for (const row of benchmarkSummary) {
    console.log(`    ${row.faixa}: n=${row.n} confiavel=${row.confiavel}`);
  }
  console.log(`  Arquivo consolidado: ${CONSOLIDADO_PATH}`);
  console.log(`  Arquivo benchmarks: ${BENCHMARKS_PATH}`);
}

async function main() {
  const anonSalt = requireAnonSalt();
  const db = getFirebaseAdmin();

  console.log('[OI Export] Iniciando leitura Firestore (somente leitura)...');

  const { map, duplicatasRemovidas } = await loadPacientesMap(db);

  const stats: ExportStats = {
    totalLidos: map.size,
    totalElegivel: 0,
    ignoradoSemPeso: 0,
    ignoradoSemEvolucao: 0,
    ignoradoSemDoseMg: 0,
    duplicatasRemovidas,
  };

  const consolidado: PacienteConsolidadoOi[] = [];

  for (const [docId, raw] of map.entries()) {
    const normalized = normalizePacienteDocument(docId, raw);
    const result = buildPacienteConsolidado(normalized, anonSalt);

    if (!result.ok) {
      if (result.reason === 'sem_evolucao') stats.ignoradoSemEvolucao += 1;
      else if (result.reason === 'sem_peso') stats.ignoradoSemPeso += 1;
      else if (result.reason === 'sem_dose_mg') stats.ignoradoSemDoseMg += 1;
      continue;
    }

    consolidado.push(result.record);
    stats.totalElegivel += 1;
  }

  const faixas = buildBenchmarks(consolidado);
  const benchmarkSummary = Object.values(faixas).map((f) => ({
    faixa: f.faixa,
    n: f.n,
    confiavel: !f.dadosInsuficientes,
  }));

  mkdirSync(OUTPUT_DIR, { recursive: true });

  const consolidadoPayload = {
    meta: {
      geradoEm: new Date().toISOString(),
      versao: '1.0.0',
      totalRegistros: consolidado.length,
      criteriosElegibilidade: [
        'evolucaoSeguimento com ao menos 1 registro',
        'pesoInicialKg > 0 (semana 1, medidas iniciais ou marco zero)',
        'quantidadeTotalMgUtilizada > 0 ou numeroAplicacoes > 0',
      ],
      regraBaselinePeso:
        'evolucaoSeguimento[weekIndex=1].peso ?? medidasIniciais.peso ?? marcoZero.pesoInicial',
      regraPesoAtual: 'último evolucaoSeguimento.peso por dataRegistro',
    },
    pacientes: consolidado,
  };

  const benchmarksPayload = {
    meta: {
      geradoEm: new Date().toISOString(),
      versao: '1.0.0',
      minSampleSize: MIN_BENCHMARK_SAMPLE,
      agrupamento: 'faixa de meta cadastrada (metaPercentual)',
      nota:
        'Faixas com dadosInsuficientes=true (n<30) não devem alimentar estimativas confiáveis do Orçamento Terapêutico.',
    },
    faixas,
  };

  writeFileSync(CONSOLIDADO_PATH, JSON.stringify(consolidadoPayload, null, 2), 'utf-8');
  writeFileSync(BENCHMARKS_PATH, JSON.stringify(benchmarksPayload, null, 2), 'utf-8');

  logSafeStats(stats, benchmarkSummary);
  console.log('[OI Export] Concluído.');
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error('[OI Export] Falha:', message);
  process.exit(1);
});
