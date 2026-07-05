import { calcularDoseTitulacaoMg, DOSE_INICIAL_PADRAO_MG } from '@/lib/tirzepatida/doseTitulacao';
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
  comprimentoAbdominalInicialCm: number | null;
  comprimentoAbdominalAtualCm: number | null;
  perdaAbdominalCm: number | null;
  perdaPercentualAbdominal: number | null;
  /** `peso` pode ser null nas semanas só com dose (igual à API de depoimentos). */
  evolucao: { weekIndex: number; peso: number | null; doseMg: number; foiAplicado?: boolean }[];
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

function parseDoseNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = parseFloat(value.replace(',', '.'));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

type PlanoComConclusao = {
  numeroSemanasTratamento?: number;
  doseInicialMg?: number;
  currentDoseMg?: number;
  esquemaDosesCustomizado?: { [semana: number]: number } | Record<string, number>;
  semanasCanceladas?: number[];
  startDate?: unknown;
  dataInicioTratamento?: unknown;
  injectionDayOfWeek?: 'seg' | 'ter' | 'qua' | 'qui' | 'sex' | 'sab' | 'dom';
  conclusaoTratamento?: { pesoFinalKg?: number; circunferenciaAbdominalFinalCm?: number };
};

function obterPrimeiraDosePlano(plano?: PlanoComConclusao): Date | null {
  if (!plano) return null;
  const dataBruta = plano.startDate ?? plano.dataInicioTratamento;
  const base = toDateDepoimentoMeta(dataBruta);
  if (!base) return null;
  const data = new Date(base);
  const dia = (plano.injectionDayOfWeek || '').toString().toLowerCase();
  const mapaDias: Record<string, number> = { dom: 0, seg: 1, ter: 2, qua: 3, qui: 4, sex: 5, sab: 6 };
  if (dia in mapaDias) {
    const alvo = mapaDias[dia];
    const atual = data.getDay();
    const diff = (alvo - atual + 7) % 7;
    data.setDate(data.getDate() + diff);
  }
  return data;
}

function calcularDosePlanejadaSemana({
  semana,
  plano,
  evolucaoRaw,
  primeiraDose,
}: {
  semana: number;
  plano?: PlanoComConclusao;
  evolucaoRaw: Record<string, unknown>[];
  primeiraDose: Date | null;
}): number {
  const doseInicial = Number(plano?.currentDoseMg ?? plano?.doseInicialMg ?? DOSE_INICIAL_PADRAO_MG) || DOSE_INICIAL_PADRAO_MG;
  const customRaw = (plano?.esquemaDosesCustomizado as Record<string, unknown> | undefined)?.[String(semana)];
  const customDose = parseDoseNumber(customRaw);
  if (customDose != null && customDose > 0) return customDose;

  if (!primeiraDose) return doseInicial;
  const semanaIndex = Math.max(0, semana - 1);
  let semanasDesdeUltimoCiclo = semanaIndex;

  for (let s = 0; s < semanaIndex; s++) {
    const dataPrevista = new Date(primeiraDose);
    dataPrevista.setHours(0, 0, 0, 0);
    dataPrevista.setDate(dataPrevista.getDate() + s * 7);

    const registro = evolucaoRaw.find((e) => {
      const dataRegistro = toDateDepoimentoMeta((e as { dataRegistro?: unknown }).dataRegistro);
      if (!dataRegistro) return false;
      dataRegistro.setHours(0, 0, 0, 0);
      const diffDias = Math.abs((dataRegistro.getTime() - dataPrevista.getTime()) / (1000 * 60 * 60 * 24));
      return diffDias <= 1;
    });

    const dataRegistro = registro
      ? toDateDepoimentoMeta((registro as { dataRegistro?: unknown }).dataRegistro)
      : null;
    if (!dataRegistro) continue;
    dataRegistro.setHours(0, 0, 0, 0);
    const diffDias = (dataRegistro.getTime() - dataPrevista.getTime()) / (1000 * 60 * 60 * 24);
    if (diffDias >= 4) {
      semanasDesdeUltimoCiclo = semanaIndex - s - 1;
      break;
    }
  }

  return calcularDoseTitulacaoMg(doseInicial, semanasDesdeUltimoCiclo);
}

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
  const evolucaoOrdenadaBase = evolucaoRaw
    .map((p: Record<string, unknown>) => {
      const pesoVal = typeof p.peso === 'number' && (p.peso as number) > 0 ? (p.peso as number) : null;
      const q = (p.doseAplicada as { quantidade?: unknown } | undefined)?.quantidade;
      const doseNum =
        typeof q === 'number' ? q : typeof q === 'string' ? parseFloat(q.replace(',', '.')) : 0;
      const adherence = typeof p.adherence === 'string' ? p.adherence : typeof p.adesao === 'string' ? p.adesao : '';
      const missed = String(adherence).toUpperCase() === 'MISSED' || String(adherence).toLowerCase() === 'esquecida';
      const foiAplicado = !missed && Number.isFinite(doseNum) && doseNum > 0;
      return {
        weekIndex: (p.weekIndex as number) ?? (p.numeroSemana as number) ?? 0,
        peso: pesoVal,
        doseMg: Number.isFinite(doseNum) && doseNum > 0 ? doseNum : 0,
        foiAplicado,
        circunferenciaAbdominal:
          typeof p.circunferenciaAbdominal === 'number' && (p.circunferenciaAbdominal as number) > 0
            ? (p.circunferenciaAbdominal as number)
            : null,
      };
    })
    .filter((p) => p.weekIndex > 0)
    .sort((a, b) => a.weekIndex - b.weekIndex);
  const plano = paciente.planoTerapeutico as PlanoComConclusao | undefined;
  const numeroSemanas = Math.max(Number(plano?.numeroSemanasTratamento) || 0, evolucaoOrdenadaBase.length);
  const primeiraDosePlano = obterPrimeiraDosePlano(plano);
  const semanasCanceladas = new Set(
    Array.isArray(plano?.semanasCanceladas)
      ? plano!.semanasCanceladas!.map((w) => Number(w)).filter((w) => Number.isFinite(w) && w > 0)
      : []
  );
  const evolucaoOrdenada =
    numeroSemanas > 0
      ? Array.from({ length: numeroSemanas }, (_, idx) => {
          const semana = idx + 1;
          const atual = evolucaoOrdenadaBase.find((p) => p.weekIndex === semana);
          const dosePlanejada = semanasCanceladas.has(semana)
            ? 0
            : calcularDosePlanejadaSemana({
                semana,
                plano,
                evolucaoRaw,
                primeiraDose: primeiraDosePlano,
              });
          return (
            atual ?? {
              weekIndex: semana,
              peso: null,
              doseMg: dosePlanejada,
              foiAplicado: false,
              circunferenciaAbdominal: null,
            }
          );
        })
      : evolucaoOrdenadaBase;

  let pesoInicialKg: number | null = null;
  let pesoAtualKg: number | null = null;
  const primeiroPesoValido = evolucaoOrdenada.find((p) => p.peso != null && p.peso > 0)?.peso ?? null;
  const ultimoPesoValido = [...evolucaoOrdenada].reverse().find((p) => p.peso != null && p.peso > 0)?.peso ?? null;

  if (evolucaoOrdenada.length > 0) {
    pesoInicialKg = primeiroPesoValido;
    pesoAtualKg = ultimoPesoValido;
  } else {
    const medidas = paciente.dadosClinicos?.medidasIniciais;
    pesoInicialKg = typeof medidas?.peso === 'number' ? medidas.peso : null;
    const conclusaoPeso = plano?.conclusaoTratamento?.pesoFinalKg;
    pesoAtualKg = typeof conclusaoPeso === 'number' ? conclusaoPeso : pesoInicialKg;
  }

  let perdaTotalKg: number | null = null;
  let perdaPercentual: number | null = null;
  const comprimentoAbdominalInicialCm =
    typeof paciente.dadosClinicos?.medidasIniciais?.circunferenciaAbdominal === 'number'
      ? paciente.dadosClinicos.medidasIniciais.circunferenciaAbdominal
      : null;
  const ultimaCirc = [...evolucaoOrdenada].reverse().find((p) => p.circunferenciaAbdominal != null)?.circunferenciaAbdominal ?? null;
  const conclusaoCirc = plano?.conclusaoTratamento?.circunferenciaAbdominalFinalCm;
  const comprimentoAbdominalAtualCm = ultimaCirc ?? (typeof conclusaoCirc === 'number' && conclusaoCirc > 0 ? conclusaoCirc : null);
  if (pesoInicialKg != null && pesoAtualKg != null) {
    perdaTotalKg = pesoInicialKg - pesoAtualKg;
    perdaPercentual = pesoInicialKg > 0 ? (perdaTotalKg / pesoInicialKg) * 100 : null;
  }
  const perdaAbdominalCm =
    comprimentoAbdominalInicialCm != null && comprimentoAbdominalAtualCm != null
      ? comprimentoAbdominalInicialCm - comprimentoAbdominalAtualCm
      : null;
  const perdaPercentualAbdominal =
    perdaAbdominalCm != null && comprimentoAbdominalInicialCm != null && comprimentoAbdominalInicialCm > 0
      ? (perdaAbdominalCm / comprimentoAbdominalInicialCm) * 100
      : null;

  const evolucao = evolucaoOrdenada.map((p) => ({
    weekIndex: p.weekIndex,
    peso: p.peso,
    doseMg: p.doseMg,
    foiAplicado: p.foiAplicado,
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
    comprimentoAbdominalInicialCm,
    comprimentoAbdominalAtualCm,
    perdaAbdominalCm,
    perdaPercentualAbdominal,
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
    foiAplicado: p.doseMg > 0,
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
  const comprimentoAbdominalInicialCm =
    typeof paciente.dadosClinicos?.medidasIniciais?.circunferenciaAbdominal === 'number'
      ? paciente.dadosClinicos.medidasIniciais.circunferenciaAbdominal
      : null;

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
    comprimentoAbdominalInicialCm,
    comprimentoAbdominalAtualCm: null,
    perdaAbdominalCm: null,
    perdaPercentualAbdominal: null,
    evolucao,
  };
}
