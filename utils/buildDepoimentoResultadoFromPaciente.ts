import type { PacienteCompleto } from '@/types/obesidade';
import type { MetaAdminDepoimentoSlide } from '@/utils/conclusaoTratamentoHistorico';

/** Mesmo formato do modal "Resultado do tratamento" na home (estatísticas) e no metaadmin. */
export type DepoimentoResultadoModalData = {
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
  /** `peso` pode ser null nas semanas só com dose (igual à API de depoimentos). */
  evolucao: { weekIndex: number; peso: number | null; doseMg: number }[];
};

function toDateDepoimentoMeta(val: unknown): Date | null {
  if (!val) return null;
  if (val instanceof Date) return val;
  const t = (val as { toDate?: () => Date })?.toDate?.();
  if (t) return t;
  const d = new Date(val as string | number);
  return isNaN(d.getTime()) ? null : d;
}

function calcularIdadeDepoimentoMeta(dataNasc: unknown): number | null {
  const dataNascimento = toDateDepoimentoMeta(dataNasc);
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

type PlanoComConclusao = { conclusaoTratamento?: { pesoFinalKg?: number } };

/** Alinhado a `app/api/depoimentos-medico/route.ts` para o gráfico e métricas do modal da home. */
export function buildDepoimentoResultadoFromPaciente(
  paciente: PacienteCompleto,
  estrelas: number,
  textoDepoimento: string
): DepoimentoResultadoModalData {
  const nome = (paciente.dadosIdentificacao?.nomeCompleto || paciente.nome || '').trim() || 'Paciente';
  const cidade = paciente.dadosIdentificacao?.endereco?.cidade?.trim();
  const estado = paciente.dadosIdentificacao?.endereco?.estado?.trim();
  const cidadeEstado = cidade && estado ? `${cidade}-${estado}` : cidade || estado || null;
  const idade = calcularIdadeDepoimentoMeta(paciente.dadosIdentificacao?.dataNascimento);

  const evolucaoRaw = Array.isArray(paciente.evolucaoSeguimento) ? paciente.evolucaoSeguimento : [];
  const evolucaoOrdenada = evolucaoRaw
    .map((p: Record<string, unknown>) => {
      const pesoVal = typeof p.peso === 'number' && (p.peso as number) > 0 ? (p.peso as number) : null;
      const q = (p.doseAplicada as { quantidade?: unknown } | undefined)?.quantidade;
      const doseNum =
        typeof q === 'number' ? q : typeof q === 'string' ? parseFloat(q.replace(',', '.')) : 0;
      return {
        weekIndex: (p.weekIndex as number) ?? (p.numeroSemana as number) ?? 0,
        peso: pesoVal,
        doseMg: Number.isFinite(doseNum) && doseNum > 0 ? doseNum : 0,
      };
    })
    .filter((p) => p.weekIndex > 0 && (p.peso !== null || p.doseMg > 0))
    .sort((a, b) => a.weekIndex - b.weekIndex);

  let pesoInicialKg: number | null = null;
  let pesoAtualKg: number | null = null;

  if (evolucaoOrdenada.length > 0) {
    pesoInicialKg = evolucaoOrdenada[0].peso;
    pesoAtualKg = evolucaoOrdenada[evolucaoOrdenada.length - 1].peso;
  } else {
    const medidas = paciente.dadosClinicos?.medidasIniciais;
    pesoInicialKg = typeof medidas?.peso === 'number' ? medidas.peso : null;
    const plano = paciente.planoTerapeutico as PlanoComConclusao | undefined;
    const conclusaoPeso = plano?.conclusaoTratamento?.pesoFinalKg;
    pesoAtualKg = typeof conclusaoPeso === 'number' ? conclusaoPeso : pesoInicialKg;
  }

  let perdaTotalKg: number | null = null;
  let perdaPercentual: number | null = null;
  if (pesoInicialKg != null && pesoAtualKg != null) {
    perdaTotalKg = pesoInicialKg - pesoAtualKg;
    perdaPercentual = pesoInicialKg > 0 ? (perdaTotalKg / pesoInicialKg) * 100 : null;
  }

  const evolucao = evolucaoOrdenada.map((p) => ({
    weekIndex: p.weekIndex,
    peso: p.peso,
    doseMg: p.doseMg,
  }));

  return {
    pacienteId: paciente.id,
    nome,
    cidadeEstado,
    idade,
    depoimento: textoDepoimento.trim(),
    estrelas: Math.min(5, Math.max(0, Math.round(estrelas))),
    pesoInicialKg,
    pesoAtualKg,
    perdaTotalKg,
    perdaPercentual,
    evolucao,
  };
}

/** Modal “Resultado” a partir de um slide (atual = evolução do paciente; histórico = snapshot arquivado). */
export function buildDepoimentoResultadoFromDepoimentoSlide(
  paciente: PacienteCompleto,
  slide: MetaAdminDepoimentoSlide,
  estrelasClassificacaoAtual: number
): DepoimentoResultadoModalData {
  if (slide.origem === 'atual') {
    return buildDepoimentoResultadoFromPaciente(paciente, estrelasClassificacaoAtual, slide.texto);
  }
  const nome = (paciente.dadosIdentificacao?.nomeCompleto || paciente.nome || '').trim() || 'Paciente';
  const cidade = paciente.dadosIdentificacao?.endereco?.cidade?.trim();
  const estado = paciente.dadosIdentificacao?.endereco?.estado?.trim();
  const cidadeEstado = cidade && estado ? `${cidade}-${estado}` : cidade || estado || null;
  const idade = calcularIdadeDepoimentoMeta(paciente.dadosIdentificacao?.dataNascimento);

  const evolucao = slide.evolucaoSnapshot.map((p) => ({
    weekIndex: p.weekIndex,
    peso: p.peso > 0 ? p.peso : null,
    doseMg: p.doseMg,
  }));

  let pesoInicialKg = slide.pesoInicialKg;
  let pesoAtualKg = slide.pesoAtualKg;
  const comPeso = evolucao.filter((e) => e.peso != null && e.peso > 0);
  if (comPeso.length > 0) {
    pesoInicialKg = pesoInicialKg ?? comPeso[0].peso;
    pesoAtualKg = pesoAtualKg ?? comPeso[comPeso.length - 1].peso;
  }
  if (pesoAtualKg == null && slide.pesoFinalKg != null) {
    pesoAtualKg = slide.pesoFinalKg;
  }
  if (pesoInicialKg == null) {
    const medidas = paciente.dadosClinicos?.medidasIniciais;
    pesoInicialKg = typeof medidas?.peso === 'number' ? medidas.peso : null;
  }

  let perdaTotalKg: number | null = slide.perdaTotalKg;
  let perdaPercentual: number | null = slide.perdaPercentual;
  if (perdaTotalKg == null && pesoInicialKg != null && pesoAtualKg != null) {
    perdaTotalKg = pesoInicialKg - pesoAtualKg;
    perdaPercentual = pesoInicialKg > 0 ? (perdaTotalKg / pesoInicialKg) * 100 : null;
  }

  const estrelasHist = slide.estrelas ?? 0;

  return {
    pacienteId: paciente.id,
    nome,
    cidadeEstado,
    idade,
    depoimento: slide.texto.trim(),
    estrelas: Math.min(5, Math.max(0, Math.round(estrelasHist))),
    pesoInicialKg,
    pesoAtualKg,
    perdaTotalKg,
    perdaPercentual,
    evolucao,
  };
}
