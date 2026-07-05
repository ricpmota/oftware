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

/** ~7.700 kcal por kg de massa corporal (aproximação clínica para exibição agregada). */
const KCAL_POR_KG_PERDIDO = 7700;

function processPacienteDoc(data: Record<string, unknown>) {
  const evolucao = (data.evolucaoSeguimento || []) as Array<{
    peso?: number;
    weekIndex?: number;
    numeroSemana?: number;
    dataRegistro?: unknown;
    adherence?: string;
    adesao?: string;
    doseAplicada?: { quantidade?: number };
  }>;
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

  let mg = 0;
  let aplicacoesRegistradas = 0;
  let checkInsRealizados = 0;

  evolucao.forEach((reg) => {
    const qtd = reg.doseAplicada?.quantidade;
    const adesaoOk = reg.adherence !== 'MISSED' && reg.adesao !== 'esquecida';
    if (adesaoOk && typeof qtd === 'number' && qtd > 0) {
      mg += qtd;
      aplicacoesRegistradas += 1;
    }
    if (reg.adherence || reg.adesao || reg.dataRegistro) {
      checkInsRealizados += 1;
    }
  });

  const status = data.statusTratamento as string | undefined;
  const jornadaAtiva = status === 'em_tratamento' || status === 'pendente' ? 1 : 0;
  const protocoloAtivo = status === 'em_tratamento' ? 1 : 0;

  return {
    kg,
    mg,
    registros: evolucao.length,
    aplicacoesRegistradas,
    checkInsRealizados,
    jornadaAtiva,
    protocoloAtivo,
  };
}

/**
 * GET /api/indicadores-plataforma
 * Retorna indicadores consolidados da plataforma para exibição na landing.
 * Dados reais do Firestore (pacientes_completos + pacientes_abandono).
 */
export async function GET() {
  try {
    const db = getFirebaseAdmin();
    const camposIndicadores = [
      'statusTratamento',
      'evolucaoSeguimento',
      'dadosClinicos.medidasIniciais.peso',
      'planoTerapeutico.conclusaoTratamento.pesoFinalKg',
    ] as const;

    const [snapCompletos, snapAbandono, snapMedicos, snapNutris, snapPersonal] = await Promise.all([
      db.collection('pacientes_completos').select(...camposIndicadores).get(),
      db.collection('pacientes_abandono').select(...camposIndicadores).get(),
      db.collection('medicos').select('nome').get(),
      db.collection('nutricionistas').select('nome').get(),
      db.collection('personal_trainers').select('nome').get(),
    ]);

    let kgPerdidoTotal = 0;
    let mgAplicadaTotal = 0;
    let totalRegistrosEvolucao = 0;
    let pacientesEmAcompanhamento = 0;
    let pacientesConcluidos = 0;
    let aplicacoesRegistradas = 0;
    let checkInsRealizados = 0;
    let jornadasAtivas = 0;
    let protocolosAtivos = 0;

    const processar = (doc: { data: () => Record<string, unknown> }, contaEmAcompanhamento: boolean) => {
      const data = doc.data();
      if (contaEmAcompanhamento && data.statusTratamento === 'em_tratamento') {
        pacientesEmAcompanhamento += 1;
      }
      if (data.statusTratamento === 'concluido') {
        pacientesConcluidos += 1;
      }
      const stats = processPacienteDoc(data);
      kgPerdidoTotal += stats.kg;
      mgAplicadaTotal += stats.mg;
      totalRegistrosEvolucao += stats.registros;
      aplicacoesRegistradas += stats.aplicacoesRegistradas;
      checkInsRealizados += stats.checkInsRealizados;
      jornadasAtivas += stats.jornadaAtiva;
      protocolosAtivos += stats.protocoloAtivo;
    };

    snapCompletos.docs.forEach((doc) => processar(doc, true));
    snapAbandono.docs.forEach((doc) => processar(doc, false));

    const kgReducaoTotal = Math.round(kgPerdidoTotal * 10) / 10;
    const caloriasPerdidasTotal = Math.round(kgReducaoTotal * KCAL_POR_KG_PERDIDO);
    const profissionaisConectados =
      snapMedicos.docs.length + snapNutris.docs.length + snapPersonal.docs.length;

    return NextResponse.json({
      kgReducaoTotal,
      mgAplicadaTotal: Math.round(mgAplicadaTotal),
      caloriasPerdidasTotal,
      totalPacientes: snapCompletos.docs.length + snapAbandono.docs.length,
      pacientesConcluidos,
      pacientesEmAcompanhamento,
      registrosEvolucao: totalRegistrosEvolucao,
      profissionaisConectados,
      registrosClinicos: totalRegistrosEvolucao,
      checkInsRealizados,
      aplicacoesRegistradas,
      jornadasAtivas,
      protocolosAtivos,
    });
  } catch (err) {
    console.error('Erro em indicadores-plataforma:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro ao buscar indicadores' },
      { status: 500 }
    );
  }
}
