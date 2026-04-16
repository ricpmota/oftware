import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import type { RelatorioTirzepatidaRequest, RelatorioTirzepatidaResponse } from '@/types/relatoriosTirzepatida';

const METAADMINGERAL_EMAIL = 'ricpmota.med@gmail.com';
const DISCLAIMER_LINES = [
  'Resultados variam conforme perfil clínico, adesão, alimentação, atividade física e comorbidades.',
  'Dados apresentados de forma agregada e anonimizados.',
  'Não há garantia de resultados individuais.',
  'Conteúdo informativo e educativo.',
];

function getFirebaseAdmin() {
  const existingApps = getApps();
  if (existingApps.length > 0) return getFirestore(existingApps[0]);
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'oftware-9201e';
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL || process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY || process.env.FIREBASE_ADMIN_PRIVATE_KEY;
  if (!privateKey || !clientEmail) throw new Error('Firebase Admin não configurado');
  const key = privateKey.replace(/\\n/g, '\n');
  const app = initializeApp({ credential: cert({ projectId, clientEmail, privateKey: key }) });
  return getFirestore(app);
}

function getAuthAdmin() {
  const existingApps = getApps();
  if (existingApps.length > 0) return getAuth(existingApps[0]);
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'oftware-9201e';
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL || process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY || process.env.FIREBASE_ADMIN_PRIVATE_KEY;
  if (!privateKey || !clientEmail) throw new Error('Firebase Admin não configurado');
  const key = privateKey.replace(/\\n/g, '\n');
  const app = initializeApp({ credential: cert({ projectId, clientEmail, privateKey: key }) });
  return getAuth(app);
}

function toDate(v: unknown): Date | null {
  if (!v) return null;
  if (v instanceof Date) return v;
  if (typeof (v as { toDate?: () => Date }).toDate === 'function') return (v as { toDate: () => Date }).toDate();
  if (typeof v === 'string' || typeof v === 'number') return new Date(v);
  return null;
}

function median(arr: number[]): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

function formatPeriodLabel(dateStart: string, dateEnd: string): string {
  const d1 = new Date(dateStart);
  const d2 = new Date(dateEnd);
  if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return `${dateStart} – ${dateEnd}`;
  return `${d1.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })} – ${d2.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}`;
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) {
      return NextResponse.json({ error: 'Token de autenticação obrigatório.' }, { status: 401 });
    }
    try {
      const auth = getAuthAdmin();
      const decoded = await auth.verifyIdToken(token);
      if (decoded.email !== METAADMINGERAL_EMAIL) {
        return NextResponse.json({ error: 'Acesso negado. Apenas MetaAdminGeral.' }, { status: 403 });
      }
    } catch {
      return NextResponse.json({ error: 'Token inválido ou expirado.' }, { status: 401 });
    }
    const body = (await request.json()) as RelatorioTirzepatidaRequest;
    const { dateStart, dateEnd, minWeeks, onlyActive } = body;
    if (!dateStart || !dateEnd) {
      return NextResponse.json({ error: 'dateStart e dateEnd são obrigatórios' }, { status: 400 });
    }
    const start = new Date(dateStart);
    const end = new Date(dateEnd);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
      return NextResponse.json({ error: 'Período inválido' }, { status: 400 });
    }
    const minWeeksNum = Math.max(1, minWeeks ?? 4);
    const endTime = end.getTime();

    const db = getFirebaseAdmin();
    const snapshotCompletos = await db.collection('pacientes_completos').get();
    const docsToProcess = [...snapshotCompletos.docs];
    if (!onlyActive) {
      const snapshotAbandono = await db.collection('pacientes_abandono').get();
      docsToProcess.push(...snapshotAbandono.docs);
    }

    type PatientRow = {
      pesoInicial: number;
      dataPesoInicial: number;
      pesoFinal: number;
      dataPesoFinal: number;
      semanasAcompanhamento: number;
      aplicacoes: number;
      perdaPercent: number;
      perda4Sem: number | null;
      perda8Sem: number | null;
      perda12Sem: number | null;
      tem8Semanas: boolean;
      tem12Semanas: boolean;
    };

    const rows: PatientRow[] = [];

    for (const docSnap of docsToProcess) {
      const data = docSnap.data();
      if (onlyActive) {
        if (data.status === 'inativo' || data.statusTratamento === 'abandono') continue;
      }

      const evolucaoRaw = Array.isArray(data.evolucaoSeguimento) ? data.evolucaoSeguimento : [];
      const evolucao = evolucaoRaw
        .map((e: { dataRegistro?: unknown; peso?: number; doseAplicada?: { data?: unknown } }) => ({
          dataRegistro: toDate(e.dataRegistro),
          peso: typeof e.peso === 'number' && !isNaN(e.peso) ? e.peso : undefined,
          doseAplicada: e.doseAplicada,
        }))
        .filter((e: { dataRegistro: Date | null }) => e.dataRegistro) as { dataRegistro: Date; peso?: number; doseAplicada?: { data?: unknown } }[];

      evolucao.sort((a: { dataRegistro: Date }, b: { dataRegistro: Date }) => a.dataRegistro.getTime() - b.dataRegistro.getTime());

      // pesoInicial = primeiro peso registrado (global, independente do período)
      let pesoInicial: number | undefined;
      let dataPesoInicial: number | undefined;
      const medidasIniciais = data.dadosClinicos?.medidasIniciais;
      if (medidasIniciais?.peso != null && Number.isFinite(medidasIniciais.peso)) {
        const planStart = toDate(data.planoTerapeutico?.startDate);
        const firstReg = evolucao[0];
        if (!firstReg || (planStart && planStart.getTime() <= (firstReg.dataRegistro?.getTime() ?? 0))) {
          pesoInicial = medidasIniciais.peso;
          dataPesoInicial = planStart ? planStart.getTime() : (firstReg?.dataRegistro?.getTime() ?? start.getTime());
        }
      }
      if (pesoInicial == null && evolucao.length > 0) {
        const firstWithPeso = evolucao.find((e: { peso?: number }) => e.peso != null);
        if (firstWithPeso?.peso != null) {
          pesoInicial = firstWithPeso.peso;
          dataPesoInicial = firstWithPeso.dataRegistro.getTime();
        }
      }
      if (pesoInicial == null || !Number.isFinite(pesoInicial) || pesoInicial <= 0 || dataPesoInicial == null) continue;

      // pesoFinal = último registro COM PESO registrado até dateEnd (não exige que o último registro cronológico tenha peso)
      const registrosAteFimComPeso = evolucao.filter(
        (e: { dataRegistro: Date; peso?: number }) =>
          e.dataRegistro.getTime() <= endTime && e.peso != null && Number.isFinite(e.peso)
      );
      if (registrosAteFimComPeso.length === 0) continue;
      const ultimoReg = registrosAteFimComPeso[registrosAteFimComPeso.length - 1]!;
      const pesoFinal = ultimoReg.peso!;
      const dataPesoFinal = ultimoReg.dataRegistro.getTime();

      const semanasAcompanhamento = Math.max(0, Math.floor((dataPesoFinal - dataPesoInicial) / (7 * 24 * 60 * 60 * 1000)));
      // ≥ 1 semana = pelo menos 1 aplicação/registro com peso (semanasAcompanhamento pode ser 0); ≥ 4/8/12 exige esse mínimo de semanas
      if (minWeeksNum > 1 && semanasAcompanhamento < minWeeksNum) continue;

      const perdaPercent = Number((((pesoInicial - pesoFinal) / pesoInicial) * 100).toFixed(1));

      // Marcos: primeiro registro COM PESO ao atingir 4, 8, 12 semanas a partir de dataPesoInicial
      const pesoAt4 = evolucao.find((e: { dataRegistro: Date; peso?: number }) => {
        const sem = Math.floor((e.dataRegistro.getTime() - dataPesoInicial!) / (7 * 24 * 60 * 60 * 1000));
        return sem >= 4 && e.dataRegistro.getTime() <= endTime && e.peso != null && Number.isFinite(e.peso);
      })?.peso;
      const pesoAt8 = evolucao.find((e: { dataRegistro: Date; peso?: number }) => {
        const sem = Math.floor((e.dataRegistro.getTime() - dataPesoInicial!) / (7 * 24 * 60 * 60 * 1000));
        return sem >= 8 && e.dataRegistro.getTime() <= endTime && e.peso != null && Number.isFinite(e.peso);
      })?.peso;
      const pesoAt12 = evolucao.find((e: { dataRegistro: Date; peso?: number }) => {
        const sem = Math.floor((e.dataRegistro.getTime() - dataPesoInicial!) / (7 * 24 * 60 * 60 * 1000));
        return sem >= 12 && e.dataRegistro.getTime() <= endTime && e.peso != null && Number.isFinite(e.peso);
      })?.peso;
      const perda4Sem = pesoAt4 != null && Number.isFinite(pesoAt4) && pesoInicial > 0
        ? Number((((pesoInicial - pesoAt4) / pesoInicial) * 100).toFixed(1)) : null;
      const perda8Sem = pesoAt8 != null && Number.isFinite(pesoAt8) && pesoInicial > 0
        ? Number((((pesoInicial - pesoAt8) / pesoInicial) * 100).toFixed(1)) : null;
      const perda12Sem = pesoAt12 != null && Number.isFinite(pesoAt12) && pesoInicial > 0
        ? Number((((pesoInicial - pesoAt12) / pesoInicial) * 100).toFixed(1)) : null;

      let aplicacoes = 0;
      evolucao.forEach((e: { doseAplicada?: { data?: unknown }; dataRegistro: Date }) => {
        if (e.doseAplicada?.data) {
          const d = toDate(e.doseAplicada.data);
          if (d && d.getTime() >= start.getTime() && d.getTime() <= endTime) aplicacoes++;
        }
      });
      if (aplicacoes === 0) {
        evolucao.forEach((e: { dataRegistro: Date }) => {
          const t = e.dataRegistro.getTime();
          if (t >= start.getTime() && t <= endTime) aplicacoes++;
        });
      }

      rows.push({
        pesoInicial,
        dataPesoInicial,
        pesoFinal,
        dataPesoFinal,
        semanasAcompanhamento,
        aplicacoes,
        perdaPercent,
        perda4Sem,
        perda8Sem,
        perda12Sem,
        tem8Semanas: semanasAcompanhamento >= 8,
        tem12Semanas: semanasAcompanhamento >= 12,
      });
    }

    const totalPacientes = rows.length;
    if (totalPacientes === 0) {
      return NextResponse.json(
        { error: 'Nenhum paciente encontrado com os filtros selecionados. Ajuste o período ou filtros.' },
        { status: 400 }
      );
    }

    const semanasArr = rows.map(r => r.semanasAcompanhamento);
    const tempoMedianoSemanas = Math.round(median(semanasArr));
    const aplicacoesMediasPorPaciente = Number((rows.reduce((s, r) => s + r.aplicacoes, 0) / rows.length).toFixed(1));

    const perdas = rows.map(r => r.perdaPercent);
    const medianaPerdaPesoPercent = Number(median(perdas).toFixed(1));
    const pctAtingiu5 = Math.round((rows.filter(r => r.perdaPercent >= 5).length / totalPacientes) * 100);
    const pctAtingiu10 = Math.round((rows.filter(r => r.perdaPercent >= 10).length / totalPacientes) * 100);

    const perdas4 = rows.map(r => r.perda4Sem).filter((p): p is number => p != null);
    const perdas8 = rows.map(r => r.perda8Sem).filter((p): p is number => p != null);
    const perdas12 = rows.map(r => r.perda12Sem).filter((p): p is number => p != null);
    const perda4SemPercent = perdas4.length > 0 ? Number(median(perdas4).toFixed(1)) : null;
    const perda8SemPercent = perdas8.length > 0 ? Number(median(perdas8).toFixed(1)) : null;
    const perda12SemPercent = perdas12.length > 0 ? Number(median(perdas12).toFixed(1)) : null;

    const pctContinuidade8Sem = Math.round((rows.filter(r => r.tem8Semanas).length / totalPacientes) * 100);
    const pctContinuidade12Sem = Math.round((rows.filter(r => r.tem12Semanas).length / totalPacientes) * 100);

    const response: RelatorioTirzepatidaResponse = {
      periodo: {
        dateStart,
        dateEnd,
        label: formatPeriodLabel(dateStart, dateEnd),
      },
      amostra: {
        totalPacientes,
        tempoMedianoSemanas,
        aplicacoesMediasPorPaciente,
      },
      resultado: {
        medianaPerdaPesoPercent,
        pctAtingiu5,
        pctAtingiu10,
      },
      marcos: {
        perda4SemPercent,
        perda8SemPercent,
        perda12SemPercent,
      },
      aderencia: {
        pctContinuidade8Sem,
        pctContinuidade12Sem,
      },
      disclaimer: DISCLAIMER_LINES,
      metadata: {
        minWeeks: minWeeksNum,
        onlyActive: !!onlyActive,
        generatedAt: new Date().toISOString(),
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Erro relatório tirzepatida:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao gerar relatório' },
      { status: 500 }
    );
  }
}
