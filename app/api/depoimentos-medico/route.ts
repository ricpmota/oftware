import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const COLLECTION_CLASSIFICACAO = 'classificacao_profissionais';

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

/** Retorna nome completo (nome + último nome) ou "Paciente". */
function nomeCompletoPaciente(nomeCompleto: string | undefined, nome: string | undefined): string {
  const raw = (nomeCompleto || nome || '').trim();
  return raw || 'Paciente';
}

function toDate(val: unknown): Date | null {
  if (!val) return null;
  if (val instanceof Date) return val;
  const t = (val as { toDate?: () => Date })?.toDate?.();
  if (t) return t;
  const d = new Date(val as string | number);
  return isNaN(d.getTime()) ? null : d;
}

function calcularIdade(dataNasc: unknown): number | null {
  const dataNascimento = toDate(dataNasc);
  if (!dataNascimento) return null;
  const hoje = new Date();
  let idade = hoje.getFullYear() - dataNascimento.getFullYear();
  const mesAtual = hoje.getMonth();
  const diaAtual = hoje.getDate();
  const mesNasc = dataNascimento.getMonth();
  const diaNasc = dataNascimento.getDate();
  if (mesAtual < mesNasc || (mesAtual === mesNasc && diaAtual < diaNasc)) idade--;
  return idade > 0 ? idade : null;
}

export type DepoimentoItem = {
  /** Chave estável para lista (um paciente pode ter vários depoimentos de ciclos diferentes) */
  instanceKey: string;
  pacienteId: string;
  nome: string;
  cidadeEstado: string | null;
  idade: number | null;
  depoimento: string;
  estrelas: number;
  pesoInicialKg: number | null;
  pesoAtualKg: number | null;
  perdaTotalKg: number | null;
  perdaPercentual: number | null;
  comprimentoAbdominalInicialCm: number | null;
  comprimentoAbdominalAtualCm: number | null;
  perdaAbdominalCm: number | null;
  perdaPercentualAbdominal: number | null;
  evolucao: { weekIndex: number; peso: number; doseMg: number; circunferenciaAbdominal?: number | null }[];
};

type EvolucaoRow = { weekIndex: number; peso: number | null; doseMg: number; circunferenciaAbdominal: number | null };

function evolucaoOrdenadaFromRaw(evolucaoRaw: unknown[]): EvolucaoRow[] {
  return evolucaoRaw
    .map((p: Record<string, unknown>) => {
      const pesoVal = typeof p.peso === 'number' && p.peso > 0 ? (p.peso as number) : null;
      const q = (p.doseAplicada as { quantidade?: unknown } | undefined)?.quantidade;
      const doseNum =
        typeof q === 'number' ? q : typeof q === 'string' ? parseFloat(String(q).replace(',', '.')) : 0;
      const circVal =
        typeof p.circunferenciaAbdominal === 'number' && p.circunferenciaAbdominal > 0
          ? (p.circunferenciaAbdominal as number)
          : null;
      return {
        weekIndex: (p.weekIndex ?? p.numeroSemana ?? 0) as number,
        peso: pesoVal,
        doseMg: Number.isFinite(doseNum) && doseNum > 0 ? doseNum : 0,
        circunferenciaAbdominal: circVal,
      };
    })
    .filter((p) => p.weekIndex > 0 && (p.peso !== null || p.doseMg > 0 || p.circunferenciaAbdominal !== null))
    .sort((a, b) => a.weekIndex - b.weekIndex);
}

function timestampOrdenacaoConclusao(conclusao: Record<string, unknown>): number {
  const d = toDate(conclusao.dataConclusao) ?? toDate(conclusao.arquivadoEm);
  return d?.getTime() ?? 0;
}

/**
 * GET /api/depoimentos-medico?medicoId=xxx
 * GET /api/depoimentos-medico?medicoEmail=xxx
 * Depoimentos da conclusão atual e de historicoConclusoesTratamento (ciclos anteriores),
 * somente nota 5 e não ocultos na página pública.
 */
export async function GET(request: NextRequest) {
  try {
    const medicoIdParam = request.nextUrl.searchParams.get('medicoId');
    const medicoEmailParam = request.nextUrl.searchParams.get('medicoEmail');
    const limitParam = Number(request.nextUrl.searchParams.get('limit') || '30');
    const limit = Number.isFinite(limitParam) ? Math.min(100, Math.max(1, Math.floor(limitParam))) : 30;
    let medicoId = medicoIdParam;

    const db = getFirebaseAdmin();

    if (!medicoId && medicoEmailParam) {
      const medicosSnap = await db.collection('medicos').where('email', '==', medicoEmailParam.trim()).get();
      if (medicosSnap.empty) {
        return NextResponse.json({ depoimentos: [] });
      }
      medicoId = medicosSnap.docs[0].id;
    }

    if (!medicoId) {
      return NextResponse.json({ error: 'medicoId ou medicoEmail é obrigatório' }, { status: 400 });
    }

    const pacientesSnap = await db
      .collection('pacientes_completos')
      .where('medicoResponsavelId', '==', medicoId)
      .select('dadosIdentificacao', 'nome', 'evolucaoSeguimento', 'dadosClinicos', 'planoTerapeutico')
      .get();

    const candidatosPorPaciente = await Promise.all(pacientesSnap.docs.map(async (doc) => {
      const data = doc.data();
      const pacienteId = doc.id;
      const docIdClassificacao = `${pacienteId}_medico_${medicoId}`;
      const classSnap = await db.collection(COLLECTION_CLASSIFICACAO).doc(docIdClassificacao).get();
      const estrelasAtual = typeof classSnap.data()?.estrelas === 'number'
        ? Math.min(5, Math.max(1, Math.round(classSnap.data()!.estrelas)))
        : 0;
      const candidatos: { ordenacao: number; item: DepoimentoItem }[] = [];
      let instanceSeq = 0;

      const nome = nomeCompletoPaciente(data.dadosIdentificacao?.nomeCompleto, data.nome);
      const cidade = data.dadosIdentificacao?.endereco?.cidade?.trim();
      const estado = data.dadosIdentificacao?.endereco?.estado?.trim();
      const cidadeEstado = cidade && estado ? `${cidade}-${estado}` : (cidade || estado || null);
      const idade = calcularIdade(data.dadosIdentificacao?.dataNascimento);

      const evolucaoRaw = Array.isArray(data.evolucaoSeguimento) ? data.evolucaoSeguimento : [];

      const pushDepoimento = (
        conclusao: Record<string, unknown> | undefined,
        estrelas: number,
        evolucaoOrdenada: EvolucaoRow[]
      ) => {
        const depoimentoTexto = conclusao?.depoimento;
        if (!depoimentoTexto || typeof depoimentoTexto !== 'string' || depoimentoTexto.trim() === '') return;
        if (conclusao?.ocultarDepoimentoPaginaPublica === true) return;
        if (estrelas !== 5) return;

        let pesoInicialKg: number | null =
          typeof conclusao.pesoInicialKg === 'number' && !isNaN(conclusao.pesoInicialKg as number)
            ? (conclusao.pesoInicialKg as number)
            : null;
        let pesoAtualKg: number | null =
          typeof conclusao.pesoAtualKg === 'number' && !isNaN(conclusao.pesoAtualKg as number)
            ? (conclusao.pesoAtualKg as number)
            : null;
        let perdaTotalKg: number | null =
          typeof conclusao.perdaTotalKg === 'number' && !isNaN(conclusao.perdaTotalKg as number)
            ? (conclusao.perdaTotalKg as number)
            : null;
        let perdaPercentual: number | null =
          typeof conclusao.perdaPercentual === 'number' && !isNaN(conclusao.perdaPercentual as number)
            ? (conclusao.perdaPercentual as number)
            : null;
        let comprimentoAbdominalInicialCm: number | null =
          typeof conclusao.comprimentoAbdominalInicialCm === 'number' && !isNaN(conclusao.comprimentoAbdominalInicialCm as number)
            ? (conclusao.comprimentoAbdominalInicialCm as number)
            : typeof conclusao.circunferenciaAbdominalInicialCm === 'number' && !isNaN(conclusao.circunferenciaAbdominalInicialCm as number)
            ? (conclusao.circunferenciaAbdominalInicialCm as number)
            : null;
        let comprimentoAbdominalAtualCm: number | null =
          typeof conclusao.comprimentoAbdominalFinalCm === 'number' && !isNaN(conclusao.comprimentoAbdominalFinalCm as number)
            ? (conclusao.comprimentoAbdominalFinalCm as number)
            : typeof conclusao.circunferenciaAbdominalFinalCm === 'number' && !isNaN(conclusao.circunferenciaAbdominalFinalCm as number)
            ? (conclusao.circunferenciaAbdominalFinalCm as number)
            : null;

        const evolucaoOut: DepoimentoItem['evolucao'] = evolucaoOrdenada.map((p) => ({
          weekIndex: p.weekIndex,
          peso: p.peso ?? 0,
          doseMg: p.doseMg,
          circunferenciaAbdominal: p.circunferenciaAbdominal ?? null,
        }));

        if (pesoInicialKg == null || pesoAtualKg == null) {
          if (evolucaoOrdenada.length > 0) {
            pesoInicialKg = pesoInicialKg ?? evolucaoOrdenada[0].peso;
            pesoAtualKg = pesoAtualKg ?? evolucaoOrdenada[evolucaoOrdenada.length - 1].peso;
          }
        }
        if ((pesoInicialKg == null || pesoAtualKg == null) && typeof conclusao.pesoFinalKg === 'number') {
          const medidas = data.dadosClinicos?.medidasIniciais;
          pesoInicialKg = pesoInicialKg ?? (typeof medidas?.peso === 'number' ? medidas.peso : null);
          pesoAtualKg = pesoAtualKg ?? conclusao.pesoFinalKg;
        }
        if (perdaTotalKg == null && pesoInicialKg != null && pesoAtualKg != null) {
          perdaTotalKg = pesoInicialKg - pesoAtualKg;
          perdaPercentual = perdaPercentual ?? (pesoInicialKg > 0 ? (perdaTotalKg / pesoInicialKg) * 100 : null);
        }
        if (comprimentoAbdominalInicialCm == null) {
          const medidas = data.dadosClinicos?.medidasIniciais;
          comprimentoAbdominalInicialCm =
            typeof medidas?.comprimentoAbdominal === 'number'
              ? medidas.comprimentoAbdominal
              : typeof medidas?.circunferenciaAbdominal === 'number'
              ? medidas.circunferenciaAbdominal
              : null;
        }
        if (comprimentoAbdominalAtualCm == null && evolucaoOrdenada.length > 0) {
          const ultimo = evolucaoOrdenada[evolucaoOrdenada.length - 1];
          if (typeof ultimo.circunferenciaAbdominal === 'number' && !isNaN(ultimo.circunferenciaAbdominal)) {
            comprimentoAbdominalAtualCm = ultimo.circunferenciaAbdominal;
          }
        }
        const perdaAbdominalCm =
          comprimentoAbdominalInicialCm != null && comprimentoAbdominalAtualCm != null
            ? comprimentoAbdominalInicialCm - comprimentoAbdominalAtualCm
            : null;
        const perdaPercentualAbdominal =
          perdaAbdominalCm != null && comprimentoAbdominalInicialCm != null && comprimentoAbdominalInicialCm > 0
            ? (perdaAbdominalCm / comprimentoAbdominalInicialCm) * 100
            : null;

        const ordenacao = timestampOrdenacaoConclusao(conclusao);
        instanceSeq += 1;
        candidatos.push({
          ordenacao,
          item: {
            instanceKey: `${pacienteId}_${ordenacao}_${instanceSeq}`,
            pacienteId,
            nome,
            cidadeEstado,
            idade,
            depoimento: depoimentoTexto.trim(),
            estrelas: 5,
            pesoInicialKg,
            pesoAtualKg,
            perdaTotalKg,
            perdaPercentual,
            comprimentoAbdominalInicialCm,
            comprimentoAbdominalAtualCm,
            perdaAbdominalCm,
            perdaPercentualAbdominal,
            evolucao: evolucaoOut,
          },
        });
      };

      const historico = data.planoTerapeutico?.historicoConclusoesTratamento;
      if (Array.isArray(historico)) {
        for (const snap of historico) {
          if (!snap || typeof snap !== 'object') continue;
          const s = snap as Record<string, unknown>;
          const est =
            typeof s.estrelasArquivamento === 'number'
              ? Math.min(5, Math.max(1, Math.round(s.estrelasArquivamento)))
              : 0;
          const evSnap = Array.isArray(s.evolucaoSnapshot)
            ? (s.evolucaoSnapshot as EvolucaoRow[]).map((p) => ({
                weekIndex: Number(p.weekIndex) || 0,
                peso: typeof p.peso === 'number' && p.peso > 0 ? p.peso : null,
                doseMg: typeof p.doseMg === 'number' && p.doseMg > 0 ? p.doseMg : 0,
              }))
            : [];
          const evFiltered = evSnap.filter((p) => p.weekIndex > 0 && (p.peso !== null || p.doseMg > 0));
          pushDepoimento(s, est, evFiltered);
        }
      }

      const conclusao = data.planoTerapeutico?.conclusaoTratamento as Record<string, unknown> | undefined;
      const evolucaoOrdenada = evolucaoOrdenadaFromRaw(evolucaoRaw);
      if (conclusao) {
        pushDepoimento(conclusao, estrelasAtual, evolucaoOrdenada);
      }
      return candidatos;
    }));

    const candidatos = candidatosPorPaciente.flat();
    candidatos.sort((a, b) => b.ordenacao - a.ordenacao);
    const depoimentos = candidatos.slice(0, limit).map((c) => c.item);

    return NextResponse.json(
      { depoimentos },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=300',
        },
      }
    );
  } catch (err) {
    console.error('Erro em depoimentos-medico:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro ao buscar depoimentos' },
      { status: 500 }
    );
  }
}
