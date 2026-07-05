/**
 * Cálculos puros para exportação estatística OI (sem Firestore, sem PII).
 */
import { createHmac } from 'crypto';
import { roundMetaHalfStep } from '@/utils/metaadminMetasUiSteps';
import type { NormalizedPacienteRaw } from './normalizePacienteFirestore';
import { toDateSafe } from './normalizePacienteFirestore';

export const MIN_BENCHMARK_SAMPLE = 30;

export type FaixaMetaOi =
  | 'ate_5'
  | '5_a_10'
  | '10_a_15'
  | '15_a_20'
  | 'acima_20';

export const FAIXAS_META: FaixaMetaOi[] = [
  'ate_5',
  '5_a_10',
  '10_a_15',
  '15_a_20',
  'acima_20',
];

export type PacienteConsolidadoOi = {
  pacienteAnonId: string;
  sexo: 'M' | 'F' | 'Outro' | 'NaoInformado';
  idade: number | null;
  faixaEtaria: string | null;
  altura: number | null;
  pesoInicialKg: number;
  pesoAtualKg: number;
  pesoPerdidoKg: number;
  percentualPesoPerdido: number;
  imcInicial: number | null;
  imcAtual: number | null;
  metaKg: number | null;
  metaPercentual: number | null;
  medicamento: string | null;
  doseAtualMg: number | null;
  doseMaximaMg: number | null;
  quantidadeTotalMgUtilizada: number;
  numeroAplicacoes: number;
  tempoTratamentoSemanas: number;
  statusTratamento: string;
  motivoEncerramento: string;
  atingiu5: boolean;
  atingiu10: boolean;
  atingiu15: boolean;
  atingiu20: boolean;
  atingiuMeta: boolean | null;
  faixaMeta: FaixaMetaOi | null;
};

export type BenchmarkFaixaOi = {
  faixa: FaixaMetaOi;
  n: number;
  dadosInsuficientes: boolean;
  perdaKgMedia: number | null;
  perdaPercentualMedia: number | null;
  mgMedio: number | null;
  semanasMedia: number | null;
  aplicacoesMedia: number | null;
  taxaAtingiuMeta: number | null;
  p25Mg: number | null;
  p50Mg: number | null;
  p75Mg: number | null;
  p90Mg: number | null;
  p25Semanas: number | null;
  p50Semanas: number | null;
  p75Semanas: number | null;
};

export type ExportStats = {
  totalLidos: number;
  totalElegivel: number;
  ignoradoSemPeso: number;
  ignoradoSemEvolucao: number;
  ignoradoSemDoseMg: number;
  duplicatasRemovidas: number;
};

type SeguimentoLike = {
  weekIndex?: number;
  dataRegistro?: Date | string;
  peso?: number;
  adherence?: string;
  adesao?: string;
  doseAplicada?: { quantidade?: number };
};

type MedidasIniciaisLike = {
  peso?: number;
  altura?: number;
  imc?: number;
};

export function generatePacienteAnonId(realId: string, salt: string): string {
  const hmac = createHmac('sha256', salt);
  hmac.update(realId);
  return `oi_${hmac.digest('hex').slice(0, 32)}`;
}

function calcularImc(pesoKg: number | null, alturaCm: number | undefined): number | null {
  if (pesoKg == null || pesoKg <= 0 || !alturaCm || alturaCm <= 0) return null;
  const alturaMetros = alturaCm / 100;
  return Math.round((pesoKg / (alturaMetros * alturaMetros)) * 100) / 100;
}

function obterPesos(paciente: NormalizedPacienteRaw): {
  pesoInicial: number | null;
  pesoAtual: number | null;
} {
  const medidasIniciais = (paciente.dadosClinicos as { medidasIniciais?: MedidasIniciaisLike })
    ?.medidasIniciais;
  const marcoZero = paciente.marcoZero as { pesoInicial?: number } | undefined;
  const evolucao = (paciente.evolucaoSeguimento || []) as SeguimentoLike[];

  const primeiroRegistro = evolucao.find((e) => e.weekIndex === 1);
  const pesoInicial =
    (primeiroRegistro?.peso && primeiroRegistro.peso > 0 ? primeiroRegistro.peso : null) ??
    (medidasIniciais?.peso && medidasIniciais.peso > 0 ? medidasIniciais.peso : null) ??
    (marcoZero?.pesoInicial && marcoZero.pesoInicial > 0 ? marcoZero.pesoInicial : null);

  let pesoAtual: number | null = null;
  if (evolucao.length > 0) {
    const evolucaoOrdenada = [...evolucao].sort((a, b) => {
      const dataA = toDateSafe(a.dataRegistro)?.getTime() ?? 0;
      const dataB = toDateSafe(b.dataRegistro)?.getTime() ?? 0;
      return dataB - dataA;
    });
    const ultimoRegistroComPeso = evolucaoOrdenada.find((s) => s.peso && s.peso > 0);
    pesoAtual = ultimoRegistroComPeso?.peso ?? null;
  }
  if (pesoAtual == null && medidasIniciais?.peso) {
    pesoAtual = medidasIniciais.peso;
  }

  return { pesoInicial, pesoAtual };
}

function resolverMeta(
  paciente: NormalizedPacienteRaw,
  pesoInicial: number | null
): { metaKg: number | null; metaPercentual: number | null } {
  const metas = (paciente.planoTerapeutico as { metas?: Record<string, unknown> } | undefined)?.metas;
  const peso0 = pesoInicial;

  if (peso0 == null || peso0 <= 0) {
    return { metaKg: null, metaPercentual: null };
  }

  const pctMin = 5;
  const pctMax = 45;
  const kgMin = roundMetaHalfStep((peso0 * pctMin) / 100);
  const kgMax = roundMetaHalfStep((peso0 * pctMax) / 100);

  let kgRaw: number | null = null;
  if (
    metas?.weightLossTargetType === 'PESO_ABSOLUTO' &&
    typeof metas.weightLossTargetValue === 'number' &&
    metas.weightLossTargetValue > 0
  ) {
    kgRaw = metas.weightLossTargetValue;
  } else if (
    metas?.weightLossTargetType === 'PERCENTUAL' &&
    typeof metas.weightLossTargetValue === 'number' &&
    metas.weightLossTargetValue > 0
  ) {
    kgRaw = (peso0 * metas.weightLossTargetValue) / 100;
  } else if (typeof metas?.weightLossTargetValue === 'number' && metas.weightLossTargetValue > 0) {
    kgRaw = (peso0 * metas.weightLossTargetValue) / 100;
  }

  if (kgRaw == null) {
    return { metaKg: null, metaPercentual: null };
  }

  const metaKg = roundMetaHalfStep(Math.min(kgMax, Math.max(kgMin, kgRaw)));
  const metaPercentual = Math.round(((metaKg / peso0) * 100) * 10) / 10;
  return { metaKg, metaPercentual };
}

function inferirMedicamento(paciente: NormalizedPacienteRaw): string | null {
  const dose = (paciente.planoTerapeutico as { currentDoseMg?: number } | undefined)?.currentDoseMg;
  if (dose != null && dose > 0) return 'tirzepatida';
  const evolucao = (paciente.evolucaoSeguimento || []) as SeguimentoLike[];
  const comDose = evolucao.find((e) => e.doseAplicada?.quantidade && e.doseAplicada.quantidade > 0);
  if (comDose?.doseAplicada?.quantidade) return 'tirzepatida';
  return null;
}

function isAplicacaoValida(reg: SeguimentoLike): boolean {
  if (reg.adherence === 'MISSED' || reg.adesao === 'esquecida') return false;
  if (reg.doseAplicada && reg.doseAplicada.quantidade && reg.doseAplicada.quantidade > 0) return true;
  if (reg.adherence && reg.adherence !== 'MISSED') return true;
  if (reg.adesao && reg.adesao !== 'esquecida') return true;
  return false;
}

function calcularMgEAplicacoes(paciente: NormalizedPacienteRaw): {
  quantidadeTotalMgUtilizada: number;
  numeroAplicacoes: number;
  doseMaximaMg: number;
  doseAtualMg: number | null;
} {
  const evolucao = (paciente.evolucaoSeguimento || []) as SeguimentoLike[];
  let quantidadeTotalMgUtilizada = 0;
  let doseMaximaMg = 0;
  const dosesAplicadas: number[] = [];

  for (const reg of evolucao) {
    if (!isAplicacaoValida(reg)) continue;
    const mg = reg.doseAplicada?.quantidade;
    if (mg != null && mg > 0) {
      quantidadeTotalMgUtilizada += mg;
      dosesAplicadas.push(mg);
      if (mg > doseMaximaMg) doseMaximaMg = mg;
    }
  }

  const planoDose = (paciente.planoTerapeutico as { currentDoseMg?: number } | undefined)?.currentDoseMg;
  if (planoDose != null && planoDose > doseMaximaMg) doseMaximaMg = planoDose;

  const doseAtualMg =
    planoDose != null && planoDose > 0
      ? planoDose
      : dosesAplicadas.length > 0
        ? dosesAplicadas[dosesAplicadas.length - 1]
        : null;

  const numeroAplicacoes = evolucao.filter(isAplicacaoValida).length;

  return { quantidadeTotalMgUtilizada, numeroAplicacoes, doseMaximaMg, doseAtualMg };
}

function calcularIdade(dataNascimento: Date | undefined, referencia: Date): number | null {
  if (!dataNascimento) return null;
  let idade = referencia.getFullYear() - dataNascimento.getFullYear();
  const m = referencia.getMonth() - dataNascimento.getMonth();
  if (m < 0 || (m === 0 && referencia.getDate() < dataNascimento.getDate())) {
    idade -= 1;
  }
  return idade >= 0 && idade <= 120 ? idade : null;
}

export function faixaEtariaFromIdade(idade: number | null): string | null {
  if (idade == null) return null;
  if (idade < 30) return '18_29';
  if (idade < 40) return '30_39';
  if (idade < 50) return '40_49';
  if (idade < 60) return '50_59';
  return '60_mais';
}

export function assignFaixaMeta(metaPercentual: number | null): FaixaMetaOi | null {
  if (metaPercentual == null || metaPercentual <= 0) return null;
  if (metaPercentual <= 5) return 'ate_5';
  if (metaPercentual <= 10) return '5_a_10';
  if (metaPercentual <= 15) return '10_a_15';
  if (metaPercentual <= 20) return '15_a_20';
  return 'acima_20';
}

export function categorizarMotivoEncerramento(paciente: NormalizedPacienteRaw): string {
  const status = String(paciente.statusTratamento || 'pendente');
  if (status === 'em_tratamento' || status === 'pendente') return 'em_andamento';
  if (status === 'concluido') return 'conclusao';

  if (status === 'abandono') {
    const motivo = String(paciente.motivoAbandono || '').toLowerCase();
    if (!motivo) return 'abandono_sem_motivo';
    if (/efeito|adverso|colateral|nausea|vomito|mal.estar/.test(motivo)) return 'efeito_adverso';
    if (/financeir|preco|valor|custo|pag/.test(motivo)) return 'financeiro';
    if (/medico|medica|profissional/.test(motivo)) return 'medico_encerrou';
    if (/meta|ating/.test(motivo)) return 'meta_atingida';
    return 'abandono_outro';
  }

  return 'desconhecido';
}

function calcularTempoSemanas(paciente: NormalizedPacienteRaw): number {
  const evolucao = (paciente.evolucaoSeguimento || []) as SeguimentoLike[];
  const plano = paciente.planoTerapeutico as { startDate?: Date } | undefined;

  const datas: Date[] = [];
  if (plano?.startDate) {
    const d = toDateSafe(plano.startDate);
    if (d) datas.push(d);
  }
  for (const seg of evolucao) {
    const d = toDateSafe(seg.dataRegistro);
    if (d) datas.push(d);
  }

  if (datas.length < 2) {
    const maxWeek = evolucao.reduce((m, s) => Math.max(m, s.weekIndex ?? 0), 0);
    return maxWeek > 0 ? maxWeek : evolucao.length;
  }

  datas.sort((a, b) => a.getTime() - b.getTime());
  const dias = (datas[datas.length - 1].getTime() - datas[0].getTime()) / (1000 * 60 * 60 * 24);
  return Math.max(1, Math.round(dias / 7));
}

export type ElegibilityResult =
  | { ok: true; record: PacienteConsolidadoOi }
  | { ok: false; reason: 'sem_peso' | 'sem_evolucao' | 'sem_dose_mg' };

export function buildPacienteConsolidado(
  paciente: NormalizedPacienteRaw,
  anonSalt: string
): ElegibilityResult {
  const evolucao = (paciente.evolucaoSeguimento || []) as SeguimentoLike[];
  if (!evolucao.length) {
    return { ok: false, reason: 'sem_evolucao' };
  }

  const { pesoInicial, pesoAtual } = obterPesos(paciente);
  if (pesoInicial == null || pesoInicial <= 0) {
    return { ok: false, reason: 'sem_peso' };
  }

  const { quantidadeTotalMgUtilizada, numeroAplicacoes, doseMaximaMg, doseAtualMg } =
    calcularMgEAplicacoes(paciente);
  if (quantidadeTotalMgUtilizada <= 0 && numeroAplicacoes <= 0) {
    return { ok: false, reason: 'sem_dose_mg' };
  }

  const pesoAtualFinal = pesoAtual ?? pesoInicial;
  const pesoPerdidoKg = Math.round((pesoInicial - pesoAtualFinal) * 100) / 100;
  const percentualPesoPerdido =
    Math.round((pesoPerdidoKg / pesoInicial) * 100 * 100) / 100;

  const medidasIniciais = (paciente.dadosClinicos as { medidasIniciais?: MedidasIniciaisLike })
    ?.medidasIniciais;
  const altura = medidasIniciais?.altura ?? null;
  const imcInicial = calcularImc(pesoInicial, altura ?? undefined) ?? medidasIniciais?.imc ?? null;
  const imcAtual = calcularImc(pesoAtualFinal, altura ?? undefined);

  const { metaKg, metaPercentual } = resolverMeta(paciente, pesoInicial);
  const faixaMeta = assignFaixaMeta(metaPercentual);

  const dataInicio =
    toDateSafe((paciente.planoTerapeutico as { startDate?: unknown } | undefined)?.startDate) ??
    toDateSafe(evolucao[0]?.dataRegistro) ??
    new Date();

  const dadosId = paciente.dadosIdentificacao as { sexoBiologico?: string; dataNascimento?: Date };
  const sexoRaw = dadosId?.sexoBiologico;
  const sexo: PacienteConsolidadoOi['sexo'] =
    sexoRaw === 'M' || sexoRaw === 'F' || sexoRaw === 'Outro' ? sexoRaw : 'NaoInformado';

  const idade = calcularIdade(dadosId?.dataNascimento, dataInicio);

  const atingiuMeta =
    metaPercentual != null ? percentualPesoPerdido >= metaPercentual : null;

  const docId = String(paciente.id || '');

  return {
    ok: true,
    record: {
      pacienteAnonId: generatePacienteAnonId(docId, anonSalt),
      sexo,
      idade,
      faixaEtaria: faixaEtariaFromIdade(idade),
      altura,
      pesoInicialKg: pesoInicial,
      pesoAtualKg: pesoAtualFinal,
      pesoPerdidoKg,
      percentualPesoPerdido,
      imcInicial,
      imcAtual,
      metaKg,
      metaPercentual,
      medicamento: inferirMedicamento(paciente),
      doseAtualMg,
      doseMaximaMg: doseMaximaMg > 0 ? doseMaximaMg : null,
      quantidadeTotalMgUtilizada,
      numeroAplicacoes,
      tempoTratamentoSemanas: calcularTempoSemanas(paciente),
      statusTratamento: String(paciente.statusTratamento || 'pendente'),
      motivoEncerramento: categorizarMotivoEncerramento(paciente),
      atingiu5: percentualPesoPerdido >= 5,
      atingiu10: percentualPesoPerdido >= 10,
      atingiu15: percentualPesoPerdido >= 15,
      atingiu20: percentualPesoPerdido >= 20,
      atingiuMeta,
      faixaMeta,
    },
  };
}

function percentile(sorted: number[], p: number): number | null {
  if (sorted.length === 0) return null;
  if (sorted.length === 1) return sorted[0];
  const index = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower];
  const weight = index - lower;
  return Math.round((sorted[lower] * (1 - weight) + sorted[upper] * weight) * 100) / 100;
}

function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 100) / 100;
}

export function buildBenchmarks(records: PacienteConsolidadoOi[]): Record<FaixaMetaOi, BenchmarkFaixaOi> {
  const result = {} as Record<FaixaMetaOi, BenchmarkFaixaOi>;

  for (const faixa of FAIXAS_META) {
    const grupo = records.filter((r) => r.faixaMeta === faixa);
    const n = grupo.length;
    const dadosInsuficientes = n < MIN_BENCHMARK_SAMPLE;

    const mgValues = grupo.map((r) => r.quantidadeTotalMgUtilizada).sort((a, b) => a - b);
    const semanasValues = grupo.map((r) => r.tempoTratamentoSemanas).sort((a, b) => a - b);

    const comMeta = grupo.filter((r) => r.atingiuMeta != null);
    const taxaAtingiuMeta =
      comMeta.length > 0
        ? Math.round((comMeta.filter((r) => r.atingiuMeta === true).length / comMeta.length) * 1000) /
          1000
        : null;

    result[faixa] = {
      faixa,
      n,
      dadosInsuficientes,
      perdaKgMedia: mean(grupo.map((r) => r.pesoPerdidoKg)),
      perdaPercentualMedia: mean(grupo.map((r) => r.percentualPesoPerdido)),
      mgMedio: mean(mgValues),
      semanasMedia: mean(semanasValues),
      aplicacoesMedia: mean(grupo.map((r) => r.numeroAplicacoes)),
      taxaAtingiuMeta,
      p25Mg: percentile(mgValues, 25),
      p50Mg: percentile(mgValues, 50),
      p75Mg: percentile(mgValues, 75),
      p90Mg: percentile(mgValues, 90),
      p25Semanas: percentile(semanasValues, 25),
      p50Semanas: percentile(semanasValues, 50),
      p75Semanas: percentile(semanasValues, 75),
    };
  }

  return result;
}
