import { NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

function getFirebaseAdmin() {
  const existingApps = getApps();
  if (existingApps.length > 0) {
    return getFirestore(existingApps[0] as any);
  }
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'oftware-9201e';
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL || process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY || process.env.FIREBASE_ADMIN_PRIVATE_KEY;
  if (!privateKey || !clientEmail) {
    throw new Error('Variáveis de ambiente do Firebase Admin não configuradas');
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

function toDate(val: unknown): Date | null {
  if (!val) return null;
  if (val instanceof Date) return val;
  const t = (val as { toDate?: () => Date })?.toDate?.();
  if (t) return t;
  const d = new Date(val as string | number);
  return isNaN(d.getTime()) ? null : d;
}

function processPacienteDoc(data: Record<string, unknown>) {
  const evolucao = (data.evolucaoSeguimento || []) as Array<{
    doseAplicada?: { quantidade?: number };
    adherence?: string;
    adesao?: string;
    peso?: number;
    weekIndex?: number;
    numeroSemana?: number;
    dataRegistro?: unknown;
  }>;
  let mg = 0;
  evolucao.forEach((reg) => {
    const qtd = reg.doseAplicada?.quantidade;
    const adesaoOk = reg.adherence !== 'MISSED' && reg.adesao !== 'esquecida';
    if (adesaoOk && typeof qtd === 'number' && qtd > 0) mg += qtd;
  });
  const comPeso = evolucao
    .filter((r) => typeof r.peso === 'number' && r.peso > 0)
    .sort((a, b) => {
      const sa = a.weekIndex ?? a.numeroSemana ?? 0;
      const sb = b.weekIndex ?? b.numeroSemana ?? 0;
      if (sa !== sb) return sa - sb;
      const da = toDate(a.dataRegistro) || new Date(0);
      const db = toDate(b.dataRegistro) || new Date(0);
      return da.getTime() - db.getTime();
    });
  const dadosClinicos = data.dadosClinicos as { medidasIniciais?: { peso?: number } } | undefined;
  const planoTerapeutico = data.planoTerapeutico as { conclusaoTratamento?: { pesoFinalKg?: number } } | undefined;
  const pesoInicial = comPeso[0]?.peso ?? dadosClinicos?.medidasIniciais?.peso ?? null;
  const pesoFinal = comPeso.length > 0 ? comPeso[comPeso.length - 1]?.peso : planoTerapeutico?.conclusaoTratamento?.pesoFinalKg ?? null;
  const kg = pesoInicial != null && pesoFinal != null && pesoInicial > pesoFinal ? pesoInicial - pesoFinal : 0;
  return { mg, kg, registros: evolucao.length };
}

/**
 * GET /api/indicadores-plataforma
 * Retorna indicadores consolidados da plataforma para exibição na landing.
 * Dados reais do Firestore (pacientes_completos + pacientes_abandono).
 */
export async function GET() {
  try {
    const db = getFirebaseAdmin();
    const [snapCompletos, snapAbandono] = await Promise.all([
      db.collection('pacientes_completos').get(),
      db.collection('pacientes_abandono').get(),
    ]);

    let kgPerdidoTotal = 0;
    let mgAplicadaTotal = 0;
    let totalRegistrosEvolucao = 0;
    let pacientesEmAcompanhamento = 0;

    const processar = (doc: { data: () => Record<string, unknown> }, contaEmAcompanhamento: boolean) => {
      const data = doc.data();
      if (contaEmAcompanhamento && data.statusTratamento === 'em_tratamento') {
        pacientesEmAcompanhamento += 1;
      }
      const { mg, kg, registros } = processPacienteDoc(data);
      kgPerdidoTotal += kg;
      mgAplicadaTotal += mg;
      totalRegistrosEvolucao += registros;
    };

    snapCompletos.docs.forEach((doc) => processar(doc, true));
    snapAbandono.docs.forEach((doc) => processar(doc, false));

    return NextResponse.json({
      kgReducaoTotal: Math.round(kgPerdidoTotal * 10) / 10,
      mgAplicacoesTotal: Math.round(mgAplicadaTotal * 10) / 10,
      pacientesEmAcompanhamento,
      registrosEvolucao: totalRegistrosEvolucao,
    });
  } catch (err) {
    console.error('Erro em indicadores-plataforma:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro ao buscar indicadores' },
      { status: 500 }
    );
  }
}
