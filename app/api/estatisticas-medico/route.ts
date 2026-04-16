import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, type Firestore, type DocumentSnapshot, type QueryDocumentSnapshot } from 'firebase-admin/firestore';

/** Tipo mínimo para cálculo das estatísticas (dados vindos do Firestore Admin) */
type PacienteRaw = {
  statusTratamento: string;
  dadosIdentificacao?: {
    dataNascimento?: unknown;
    sexoBiologico?: 'M' | 'F';
    endereco?: { cidade?: string; estado?: string };
  };
  evolucaoSeguimento?: Array<{
    weekIndex?: number;
    numeroSemana?: number;
    dataRegistro?: unknown;
    peso?: number;
    adherence?: string;
    adesao?: string;
    doseAplicada?: { quantidade?: number };
  }>;
  dadosClinicos?: {
    medidasIniciais?: { peso?: number };
  };
  planoTerapeutico?: {
    conclusaoTratamento?: { pesoFinalKg?: number };
  };
};

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

function normalizarCidadeEstado(cidade: string, estado: string): string {
  const cidadeNormalizada = cidade
    .trim()
    .replace(/\s+/g, ' ')
    .split(' ')
    .map(palavra => palavra.charAt(0).toUpperCase() + palavra.slice(1).toLowerCase())
    .join(' ')
    .trim();
  const estadoNormalizado = estado.trim().toUpperCase().replace(/\s+/g, '');
  return `${cidadeNormalizada}, ${estadoNormalizado}`;
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

function obterFaixaEtaria(idade: number | null): string {
  if (!idade) return 'desconhecida';
  if (idade >= 18 && idade <= 24) return '18-24';
  if (idade >= 25 && idade <= 40) return '25-40';
  if (idade >= 41 && idade <= 65) return '41-65';
  if (idade > 65) return '65+';
  return 'desconhecida';
}

function mapDocToPacienteRaw(doc: DocumentSnapshot): PacienteRaw {
  const data = doc.data() || {};
  let evolucaoSeguimento = data.evolucaoSeguimento;
  if (evolucaoSeguimento && Array.isArray(evolucaoSeguimento)) {
    evolucaoSeguimento = evolucaoSeguimento.map((seg: any) => ({
      ...seg,
      dataRegistro: seg.dataRegistro?.toDate ? seg.dataRegistro.toDate() : seg.dataRegistro,
    }));
  }
  return {
    statusTratamento: data.statusTratamento || 'pendente',
    dadosIdentificacao: data.dadosIdentificacao
      ? {
          ...data.dadosIdentificacao,
          dataNascimento: data.dadosIdentificacao.dataNascimento?.toDate
            ? data.dadosIdentificacao.dataNascimento.toDate()
            : data.dadosIdentificacao.dataNascimento,
        }
      : undefined,
    evolucaoSeguimento,
    dadosClinicos: data.dadosClinicos,
    planoTerapeutico: data.planoTerapeutico,
  };
}

async function getPacientesByMedicoAdmin(db: Firestore, medicoId: string): Promise<PacienteRaw[]> {
  const ativosSnap = await db.collection('pacientes_completos').where('medicoResponsavelId', '==', medicoId).get();
  const abandonoSnap = await db.collection('pacientes_completos').where('statusTratamento', '==', 'abandono').get();
  const abandonoDocs = abandonoSnap.docs.filter(d => String(d.data()?.medicoResponsavelAnteriorId) === String(medicoId));
  let abandonoNovos: QueryDocumentSnapshot[] = [];
  try {
    const snapAbandono = await db.collection('pacientes_abandono').where('medicoResponsavelAnteriorId', '==', medicoId).get();
    abandonoNovos = snapAbandono.docs;
  } catch {
    const allAbandono = await db.collection('pacientes_abandono').get();
    abandonoNovos = allAbandono.docs.filter(d => String(d.data()?.medicoResponsavelAnteriorId) === String(medicoId));
  }
  const seen = new Set<string>();
  const docs: DocumentSnapshot[] = [];
  for (const d of [...ativosSnap.docs, ...abandonoDocs, ...abandonoNovos]) {
    if (!seen.has(d.id)) {
      seen.add(d.id);
      docs.push(d);
    }
  }
  return docs.map(mapDocToPacienteRaw);
}

async function getAllPacientesAdmin(db: Firestore): Promise<PacienteRaw[]> {
  const snap = await db.collection('pacientes_completos').get();
  return snap.docs.map(mapDocToPacienteRaw);
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const medicoId = searchParams.get('medicoId');
    const base = searchParams.get('base') || 'meus';
    const sexo = searchParams.get('sexo') || 'todos';
    const faixaEtaria = searchParams.get('faixaEtaria') || 'todas';
    const dose = searchParams.get('dose') || 'todas';

    if (!medicoId && base === 'meus') {
      return NextResponse.json({ error: 'medicoId obrigatório quando base=meus' }, { status: 400 });
    }

    const db = getFirebaseAdmin();
    let pacientes: PacienteRaw[];
    if (base === 'oftware') {
      pacientes = await getAllPacientesAdmin(db);
    } else {
      pacientes = await getPacientesByMedicoAdmin(db, medicoId!);
    }

    const totalPacientes = pacientes.length;
    const pacientesPendentes = pacientes.filter(p => p.statusTratamento === 'pendente').length;
    const pacientesEmTratamento = pacientes.filter(p => p.statusTratamento === 'em_tratamento').length;
    const pacientesConcluidos = pacientes.filter(p => p.statusTratamento === 'concluido').length;
    const pacientesAbandono = pacientes.filter(p => p.statusTratamento === 'abandono').length;

    const counts = {
      total: totalPacientes,
      pendentes: pacientesPendentes,
      emTratamento: pacientesEmTratamento,
      concluidos: pacientesConcluidos,
      abandono: pacientesAbandono,
    };

    const pacientesComIdade = pacientes.filter(p => {
      const dataNasc = p.dadosIdentificacao?.dataNascimento;
      return dataNasc !== null && dataNasc !== undefined;
    });
    const idades = pacientesComIdade
      .map(p => calcularIdade(p.dadosIdentificacao?.dataNascimento))
      .filter((idade): idade is number => idade !== null && idade > 0);
    const idadeMedia = idades.length > 0 ? idades.reduce((s, i) => s + i, 0) / idades.length : 0;
    const totalComIdade = idades.length;
    const faixasEtarias = {
      '18-24': idades.filter(i => i >= 18 && i <= 24).length,
      '25-40': idades.filter(i => i >= 25 && i <= 40).length,
      '41-65': idades.filter(i => i >= 41 && i <= 65).length,
      '65+': idades.filter(i => i > 65).length,
    };
    const porcentagensFaixas = {
      '18-24': totalComIdade > 0 ? (faixasEtarias['18-24'] / totalComIdade) * 100 : 0,
      '25-40': totalComIdade > 0 ? (faixasEtarias['25-40'] / totalComIdade) * 100 : 0,
      '41-65': totalComIdade > 0 ? (faixasEtarias['41-65'] / totalComIdade) * 100 : 0,
      '65+': totalComIdade > 0 ? (faixasEtarias['65+'] / totalComIdade) * 100 : 0,
    };

    const pacientesComGenero = pacientes.filter(p => {
      const g = p.dadosIdentificacao?.sexoBiologico;
      return g === 'M' || g === 'F';
    });
    const homens = pacientesComGenero.filter(p => p.dadosIdentificacao?.sexoBiologico === 'M').length;
    const mulheres = pacientesComGenero.filter(p => p.dadosIdentificacao?.sexoBiologico === 'F').length;
    const totalGenero = homens + mulheres;
    const dadosGenero = [
      { name: 'Masculino', value: homens, porcentagem: totalGenero > 0 ? (homens / totalGenero) * 100 : 0 },
      { name: 'Feminino', value: mulheres, porcentagem: totalGenero > 0 ? (mulheres / totalGenero) * 100 : 0 },
    ];

    const demografia = {
      idadeMedia,
      totalComIdade,
      faixasEtarias,
      porcentagensFaixas,
      homens,
      mulheres,
      totalGenero,
      dadosGenero,
    };

    const pacientesComCidade = pacientes.filter(p => {
      const cidade = p.dadosIdentificacao?.endereco?.cidade;
      const estado = p.dadosIdentificacao?.endereco?.estado;
      return cidade && cidade.trim() !== '' && estado && estado.trim() !== '';
    });
    const cidadesCount: Record<string, number> = {};
    pacientesComCidade.forEach(p => {
      const cidade = p.dadosIdentificacao?.endereco?.cidade || '';
      const estado = p.dadosIdentificacao?.endereco?.estado || '';
      const chave = normalizarCidadeEstado(cidade, estado);
      cidadesCount[chave] = (cidadesCount[chave] || 0) + 1;
    });
    const cidadesOrdenadas = Object.entries(cidadesCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    const totalComCidade = pacientesComCidade.length;
    const totalOutras = totalComCidade - cidadesOrdenadas.reduce((s, [, c]) => s + c, 0);
    const dadosCidades = cidadesOrdenadas.map(([cidadeEstado, count]) => ({
      cidadeEstado,
      count,
      porcentagem: totalComCidade > 0 ? (count / totalComCidade) * 100 : 0,
    }));
    if (totalOutras > 0) {
      dadosCidades.push({
        cidadeEstado: 'Outras',
        count: totalOutras,
        porcentagem: totalComCidade > 0 ? (totalOutras / totalComCidade) * 100 : 0,
      });
    }

    const geografia = { dadosCidades, totalComCidade };

    const perdasPesoPorSemana: Record<number, number[]> = {};
    let mgAplicadaTotal = 0;
    let kgPerdidoTotal = 0;

    pacientes.forEach(paciente => {
      const sexoPac = paciente.dadosIdentificacao?.sexoBiologico;
      if (sexo !== 'todos' && sexoPac !== sexo) return;
      const idade = calcularIdade(paciente.dadosIdentificacao?.dataNascimento);
      const faixa = obterFaixaEtaria(idade);
      if (faixaEtaria !== 'todas' && faixa !== faixaEtaria) return;

      const evolucao = paciente.evolucaoSeguimento || [];
      if (evolucao.length < 1) return;

      // Somar mg aplicada deste paciente
      evolucao.forEach((reg) => {
        const qtd = reg.doseAplicada?.quantidade;
        const adesaoOk = reg.adherence !== 'MISSED' && reg.adesao !== 'esquecida';
        if (adesaoOk && typeof qtd === 'number' && qtd > 0) {
          mgAplicadaTotal += qtd;
        }
      });

      const evolucaoOrdenada = [...evolucao].sort((a, b) => {
        const semanaA = a.weekIndex ?? a.numeroSemana ?? 0;
        const semanaB = b.weekIndex ?? b.numeroSemana ?? 0;
        if (semanaA !== semanaB) return semanaA - semanaB;
        const dataA = toDate(a.dataRegistro) || new Date(0);
        const dataB = toDate(b.dataRegistro) || new Date(0);
        return dataA.getTime() - dataB.getTime();
      });

      const registroSemana1 = evolucaoOrdenada.find(r => (r.weekIndex ?? r.numeroSemana ?? 0) === 1 && r.peso);
      let pesoBaseline = registroSemana1?.peso ?? paciente.dadosClinicos?.medidasIniciais?.peso ?? null;
      if (!pesoBaseline) return;

      evolucaoOrdenada.forEach(registro => {
        const semana = registro.weekIndex ?? registro.numeroSemana ?? 0;
        if (semana <= 1 || !registro.peso) return;

        const registrosAteSemana = evolucaoOrdenada.filter(r => {
          const sem = r.weekIndex ?? r.numeroSemana ?? 0;
          if (r.adherence === 'MISSED' || r.adesao === 'esquecida') return false;
          return sem >= 1 && sem <= semana && r.doseAplicada?.quantidade;
        });
        let doseMedia = 0;
        if (registrosAteSemana.length > 0) {
          doseMedia = registrosAteSemana.reduce((s, r) => s + (r.doseAplicada?.quantidade || 0), 0) / registrosAteSemana.length;
        }
        if (dose !== 'todas') {
          const doseFiltro = parseFloat(dose);
          if (Math.abs(doseMedia - doseFiltro) > 0.5) return;
        }

        const perdaPeso = pesoBaseline - registro.peso;
        if (!perdasPesoPorSemana[semana]) perdasPesoPorSemana[semana] = [];
        perdasPesoPorSemana[semana].push(perdaPeso);
      });
    });

    const mediasPorSemana = Object.entries(perdasPesoPorSemana)
      .map(([semana, perdas]) => ({
        semana: parseInt(semana, 10),
        media: perdas.length > 0 ? perdas.reduce((s, p) => s + p, 0) / perdas.length : 0,
        quantidade: perdas.length,
      }))
      .filter(item => item.quantidade > 0)
      .sort((a, b) => a.semana - b.semana);

    // Somar perda total de peso por paciente
    pacientes.forEach((paciente) => {
      const evolucao = paciente.evolucaoSeguimento || [];
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

      let pesoInicial =
        comPeso[0]?.peso ??
        paciente.dadosClinicos?.medidasIniciais?.peso ??
        null;
      let pesoFinal =
        comPeso[comPeso.length - 1]?.peso ??
        paciente.planoTerapeutico?.conclusaoTratamento?.pesoFinalKg ??
        null;

      if (pesoInicial != null && pesoFinal != null && pesoInicial > pesoFinal) {
        kgPerdidoTotal += pesoInicial - pesoFinal;
      }
    });

    const perdaPeso = { mediasPorSemana };

    return NextResponse.json({
      counts,
      demografia,
      geografia,
      perdaPeso,
      totais: {
        mgAplicadaTotal,
        kgPerdidoTotal,
      },
    });
  } catch (err) {
    console.error('Erro em estatisticas-medico:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro ao calcular estatísticas' },
      { status: 500 }
    );
  }
}
