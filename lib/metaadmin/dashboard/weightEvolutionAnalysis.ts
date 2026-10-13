import { PESO_ENERGETICO_MAX_KG, PESO_ENERGETICO_MIN_KG } from '@/lib/nutri/dadosEnergeticosPaciente';
import type { PacienteCompleto, SeguimentoSemanal } from '@/types/obesidade';

export type WeightDoseFilter = string;
export type WeightAgeFilter = 'todas' | '18-24' | '25-40' | '41-65' | '65+';
export type WeightSexFilter = 'todos' | 'M' | 'F';

export type WeightEvolutionPoint = {
  semana: number;
  media: number;
  perda: number;
  quantidade: number;
  reviewCount: number;
};

export type WeightReviewRecord = {
  id: string;
  pacienteId: string;
  semana: number;
  canIdentify: boolean;
  pacienteNome: string | null;
  dataRegistro: Date | null;
  pesoAnterior: number | null;
  pesoInformado: number;
  variacao: number | null;
  intervaloDias: number | null;
  motivos: string[];
};

export type WeightEvolutionResult = {
  points: WeightEvolutionPoint[];
  mediaSemanalKg: number | null;
  pacientesNaAnalise: number;
  reviews: WeightReviewRecord[];
};

const IQR_MIN_SAMPLE = 8;
const IQR_FENCE = 3;
/** Aumento vs. último peso aceito acima deste valor é tratado como inconsistente. */
export const MAX_GAIN_KG = 2;
/** Perda por semana de intervalo acima deste valor é tratada como inconsistente. */
export const MAX_WEEKLY_LOSS_KG = 6;

function toDate(value: unknown): Date | null {
  if (value == null) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value === 'object' && typeof (value as { toDate?: () => Date }).toDate === 'function') {
    try {
      const d = (value as { toDate: () => Date }).toDate();
      return d instanceof Date && !Number.isNaN(d.getTime()) ? d : null;
    } catch {
      return null;
    }
  }
  const d = new Date(value as string);
  return Number.isNaN(d.getTime()) ? null : d;
}

function weekOf(registro: SeguimentoSemanal): number {
  const raw = registro.weekIndex ?? registro.numeroSemana ?? 0;
  const w = typeof raw === 'number' ? raw : Number(raw);
  return Number.isFinite(w) ? w : 0;
}

function pesoOf(registro: SeguimentoSemanal): number | null {
  const p = typeof registro.peso === 'number' ? registro.peso : Number(registro.peso);
  if (!Number.isFinite(p) || p <= 0) return null;
  return p;
}

export function calcularIdadePaciente(dataNasc: unknown): number | null {
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

export function obterFaixaEtaria(idade: number | null): string {
  if (!idade) return 'desconhecida';
  if (idade >= 18 && idade <= 24) return '18-24';
  if (idade >= 25 && idade <= 40) return '25-40';
  if (idade >= 41 && idade <= 65) return '41-65';
  if (idade > 65) return '65+';
  return 'desconhecida';
}

function sortEvolucao(evolucao: SeguimentoSemanal[]): SeguimentoSemanal[] {
  return [...evolucao].sort((a, b) => {
    const semanaA = weekOf(a);
    const semanaB = weekOf(b);
    if (semanaA !== semanaB) return semanaA - semanaB;
    const dataA = toDate(a.dataRegistro) || new Date(0);
    const dataB = toDate(b.dataRegistro) || new Date(0);
    return dataA.getTime() - dataB.getTime();
  });
}

function intervaloDias(prev: Date | null, curr: Date | null): number | null {
  if (!prev || !curr) return null;
  return Math.abs(Math.round((curr.getTime() - prev.getTime()) / (24 * 60 * 60 * 1000)));
}

export function isInconsistentWeightChange(pesoAnterior: number, pesoInformado: number): boolean {
  return detectInconsistentDelta(pesoAnterior, pesoInformado).length > 0;
}

/** Salto entre dois registros: aumento > 2 kg ou perda > 6 kg sai da curva. */
export function detectInconsistentDelta(pesoAnterior: number, pesoInformado: number): string[] {
  const gain = pesoInformado - pesoAnterior;
  if (gain > MAX_GAIN_KG) return ['Aumento de peso superior a 2 kg.'];
  const loss = pesoAnterior - pesoInformado;
  if (loss > MAX_WEEKLY_LOSS_KG) return ['Perda semanal superior a 6 kg.'];
  return [];
}

function detectLevel1(pesoAnterior: number | null, pesoInformado: number, days: number | null): string[] {
  const motivos: string[] = [];
  if (pesoInformado < PESO_ENERGETICO_MIN_KG || pesoInformado > PESO_ENERGETICO_MAX_KG) {
    motivos.push('Valor fora da faixa plausível configurada.');
  }
  if (pesoAnterior != null && pesoAnterior > 0 && pesoInformado > 0) {
    const ratio = pesoAnterior / pesoInformado;
    if ((ratio >= 8 && ratio <= 12.5) || (ratio >= 0.08 && ratio <= 0.125)) {
      motivos.push('Possível erro de casa decimal.');
    }
    const delta = Math.abs(pesoInformado - pesoAnterior);
    if (days != null && days <= 10 && delta >= 15) {
      motivos.push('Variação incompatível com o intervalo entre registros.');
    } else if (days != null && days <= 21 && delta >= 20) {
      motivos.push('Variação incompatível com o intervalo entre registros.');
    } else if (days == null && delta >= 25) {
      motivos.push('Variação incompatível com o intervalo entre registros.');
    }
  }
  return motivos;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function smoothWeightCurve(points: WeightEvolutionPoint[]): WeightEvolutionPoint[] {
  if (points.length === 0) return [];
  const peakN = Math.max(...points.map((p) => p.quantidade));
  const minN = peakN <= 3 ? 1 : Math.max(2, Math.ceil(peakN * 0.12));
  const filtered = points.filter((p) => p.quantidade >= minN);
  const series = filtered.length > 0 ? filtered : points;

  const clamped: WeightEvolutionPoint[] = [];
  for (let i = 0; i < series.length; i++) {
    const curr = series[i];
    if (i === 0) {
      clamped.push(curr);
      continue;
    }
    const prev = clamped[i - 1];
    const weeks = Math.max(curr.semana - prev.semana, 1);
    const delta = curr.media - prev.media;
    let media = curr.media;
    if (delta > MAX_WEEKLY_LOSS_KG * weeks) media = prev.media + MAX_WEEKLY_LOSS_KG * weeks;
    if (delta < -MAX_GAIN_KG * weeks) media = prev.media - MAX_GAIN_KG * weeks;
    clamped.push({ ...curr, media, perda: -media });
  }

  if (clamped.length < 3) return clamped;
  return clamped.map((p, i, arr) => {
    const from = Math.max(0, i - 1);
    const to = Math.min(arr.length - 1, i + 1);
    let sum = 0;
    let n = 0;
    for (let j = from; j <= to; j++) {
      sum += arr[j].media;
      n++;
    }
    const media = sum / n;
    return { ...p, media, perda: -media };
  });
}

function mediaSemanalDaCurva(points: WeightEvolutionPoint[]): number | null {
  if (points.length === 0) return null;
  const last = points[points.length - 1];
  const weeks = Math.max(last.semana - 1, 1);
  return last.media / weeks;
}

function quantile(sorted: number[], q: number): number {
  if (sorted.length === 0) return 0;
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  const next = sorted[base + 1];
  if (next == null) return sorted[base];
  return sorted[base] + (next - sorted[base]) * rest;
}

function iqrOutlier(values: number[], value: number): boolean {
  if (values.length < IQR_MIN_SAMPLE) return false;
  const sorted = [...values].sort((a, b) => a - b);
  const q1 = quantile(sorted, 0.25);
  const q3 = quantile(sorted, 0.75);
  const iqr = q3 - q1;
  if (iqr <= 0) return false;
  return value < q1 - IQR_FENCE * iqr || value > q3 + IQR_FENCE * iqr;
}

type Contribution = {
  semana: number;
  pacienteId: string;
  pacienteNome: string;
  canIdentify: boolean;
  dataRegistro: Date | null;
  pesoAnterior: number | null;
  pesoInformado: number;
  perda: number;
  intervaloDias: number | null;
  level1: string[];
};

export function buildWeightEvolutionAnalysis(params: {
  pacientes: PacienteCompleto[];
  ownPatientIds: Set<string>;
  filtroSexo: WeightSexFilter;
  filtroFaixaEtaria: WeightAgeFilter;
  filtroDose: WeightDoseFilter;
}): WeightEvolutionResult {
  const { pacientes, ownPatientIds, filtroSexo, filtroFaixaEtaria, filtroDose } = params;
  const perdasPorSemana: Record<number, Contribution[]> = {};
  const pacientesIds = new Set<string>();

  pacientes.forEach((paciente) => {
    const sexo = paciente.dadosIdentificacao?.sexoBiologico;
    if (filtroSexo !== 'todos' && sexo !== filtroSexo) return;
    const idade = calcularIdadePaciente(paciente.dadosIdentificacao?.dataNascimento);
    const faixaEtaria = obterFaixaEtaria(idade);
    if (filtroFaixaEtaria !== 'todas' && faixaEtaria !== filtroFaixaEtaria) return;

    const evolucao = paciente.evolucaoSeguimento || [];
    if (evolucao.length < 2) return;
    const evolucaoOrdenada = sortEvolucao(evolucao);
    const registroSemana1 = evolucaoOrdenada.find((r) => weekOf(r) === 1 && pesoOf(r) != null);
    const pesoBaseline = registroSemana1 ? pesoOf(registroSemana1) : null;
    if (pesoBaseline == null) return;
    const pacienteId = paciente.id || paciente.userId || '';
    const canIdentify = ownPatientIds.has(paciente.id) || (!!paciente.userId && ownPatientIds.has(paciente.userId));
    const pacienteNome = paciente.dadosIdentificacao?.nomeCompleto || 'Paciente';

    let lastAcceptedPeso = pesoBaseline;
    let lastAcceptedDate = toDate(registroSemana1?.dataRegistro);

    evolucaoOrdenada.forEach((registro) => {
      const semana = weekOf(registro);
      const peso = pesoOf(registro);
      if (semana <= 1 || peso == null) return;

      const registrosAteSemana = evolucaoOrdenada.filter((r) => {
        const sem = weekOf(r);
        if (r.adherence === 'MISSED' || r.adesao === 'esquecida') return false;
        return sem >= 1 && sem <= semana && r.doseAplicada?.quantidade;
      });
      let doseMedia = 0;
      if (registrosAteSemana.length > 0) {
        const somaDoses = registrosAteSemana.reduce((sum, r) => sum + (r.doseAplicada?.quantidade || 0), 0);
        doseMedia = somaDoses / registrosAteSemana.length;
      }
      if (filtroDose !== 'todas') {
        const doseFiltro = parseFloat(filtroDose);
        if (Math.abs(doseMedia - doseFiltro) > 0.5) return;
      }

      const pesoAnterior = lastAcceptedPeso;
      const currDate = toDate(registro.dataRegistro);
      const days = intervaloDias(lastAcceptedDate, currDate);
      const level1 = detectLevel1(pesoAnterior, peso, days);
      if (isInconsistentWeightChange(pesoAnterior, peso) || peso - pesoBaseline > MAX_GAIN_KG) {
        return;
      }

      lastAcceptedPeso = peso;
      lastAcceptedDate = currDate;

      if (!perdasPorSemana[semana]) perdasPorSemana[semana] = [];
      perdasPorSemana[semana].push({
        semana,
        pacienteId,
        pacienteNome,
        canIdentify,
        dataRegistro: currDate,
        pesoAnterior,
        pesoInformado: peso,
        perda: pesoBaseline - peso,
        intervaloDias: days,
        level1,
      });
      if (pacienteId) pacientesIds.add(pacienteId);
    });
  });

  const reviews: WeightReviewRecord[] = [];
  const reviewCountByWeek: Record<number, number> = {};

  Object.entries(perdasPorSemana).forEach(([semanaKey, contribs]) => {
    const semana = parseInt(semanaKey, 10);
    const perdas = contribs.map((c) => c.perda);
    contribs.forEach((c) => {
      const motivos = [...c.level1];
      if (iqrOutlier(perdas, c.perda)) {
        motivos.push('Ponto estatisticamente discrepante em relação à série da semana.');
      }
      if (motivos.length === 0) return;
      const unique = [...new Set(motivos)];
      reviews.push({
        id: `${c.pacienteId}-${semana}`,
        pacienteId: c.pacienteId,
        semana,
        canIdentify: c.canIdentify,
        pacienteNome: c.canIdentify ? c.pacienteNome : null,
        dataRegistro: c.dataRegistro,
        pesoAnterior: c.pesoAnterior,
        pesoInformado: c.pesoInformado,
        variacao: c.pesoAnterior != null ? c.pesoInformado - c.pesoAnterior : null,
        intervaloDias: c.intervaloDias,
        motivos: unique,
      });
      reviewCountByWeek[semana] = (reviewCountByWeek[semana] || 0) + 1;
    });
  });

  const points: WeightEvolutionPoint[] = smoothWeightCurve(
    Object.entries(perdasPorSemana)
      .map(([semana, contribs]) => {
        const perdas = contribs.map((c) => c.perda);
        const validas = contribs.filter((c) => !iqrOutlier(perdas, c.perda));
        const valores = (validas.length > 0 ? validas : contribs).map((c) => c.perda);
        const media = median(valores);
        const semanaNum = parseInt(semana, 10);
        return {
          semana: semanaNum,
          media,
          perda: -media,
          quantidade: validas.length > 0 ? validas.length : contribs.length,
          reviewCount: reviewCountByWeek[semanaNum] || 0,
        };
      })
      .filter((item) => item.quantidade > 0)
      .sort((a, b) => a.semana - b.semana)
  );

  return {
    points,
    mediaSemanalKg: mediaSemanalDaCurva(points),
    pacientesNaAnalise: pacientesIds.size,
    reviews,
  };
}
