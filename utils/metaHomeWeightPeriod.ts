import type { BioImpedanciaRegistro } from '@/types/bioImpedancia';
import type { PacienteCompleto } from '@/types/obesidade';
import { resolveMetaPesoKgLoss } from '@/lib/paciente/metaProgresso';
import { resolveMetaPerdaPesoAtiva } from '@/utils/metasTratamentoSwitches';
import { parseBioDataRegistro } from '@/utils/bioImpedanciaDate';
import { metaHomeDateKey } from '@/utils/metaHomeDataReferencia';

export type WeightPeriodDays = 7 | 30;
export type WeightPeriodId = WeightPeriodDays | 'inicio';
export type WeightPointOrigem = 'seguimento' | 'bioimpedancia';

export interface WeightSeriesPoint {
  dateKey: string;
  date: Date;
  peso: number;
  origem: WeightPointOrigem;
}

type EvolucaoPesoItem = {
  dataRegistro?: Date | string | number | { toDate?: () => Date };
  peso?: number | null;
};

function parseRegistroDate(raw: unknown): Date | null {
  if (!raw) return null;
  if (raw instanceof Date) return Number.isNaN(raw.getTime()) ? null : raw;
  if (typeof raw === 'object' && raw !== null && typeof (raw as { toDate?: () => Date }).toDate === 'function') {
    try {
      const d = (raw as { toDate: () => Date }).toDate();
      return d instanceof Date && !Number.isNaN(d.getTime()) ? d : null;
    } catch {
      return null;
    }
  }
  const d = new Date(raw as string | number);
  return Number.isNaN(d.getTime()) ? null : d;
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addDays(d: Date, days: number): Date {
  const x = startOfDay(d);
  x.setDate(x.getDate() + days);
  return x;
}

function isPesoValido(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v) && v > 0;
}

/**
 * Janela em torno do alvo (7d → ±2 = 5–9 dias). 30 dias usa a mesma proporção.
 */
export function comparisonWindowDays(periodDays: WeightPeriodDays): number {
  return Math.max(2, Math.round((periodDays * 2) / 7));
}

export function daysSinceFirstWeight(
  series: WeightSeriesPoint[],
  refDate: Date
): number {
  const end = startOfDay(refDate).getTime();
  const first = series.find((p) => startOfDay(p.date).getTime() <= end);
  if (!first) return 0;
  return Math.max(
    0,
    Math.round((end - startOfDay(first.date).getTime()) / (24 * 60 * 60 * 1000))
  );
}

/**
 * Série data→peso com registros reais.
 * Mesmo dia: último timestamp vence; seguimento tem prioridade sobre bioimpedância
 * (igual a getPesoNaDataReferencia).
 */
export function buildMetaHomeWeightSeries(
  evolucao: EvolucaoPesoItem[] | undefined,
  bios: BioImpedanciaRegistro[] | undefined
): WeightSeriesPoint[] {
  type Acc = { date: Date; peso: number; origem: WeightPointOrigem; ts: number };
  const byDay = new Map<string, Acc>();

  const consider = (date: Date, peso: number, origem: WeightPointOrigem) => {
    if (!isPesoValido(peso)) return;
    const dateKey = metaHomeDateKey(date);
    const ts = date.getTime();
    const prev = byDay.get(dateKey);
    if (!prev) {
      byDay.set(dateKey, { date, peso, origem, ts });
      return;
    }
    if (origem === 'seguimento' && prev.origem === 'bioimpedancia') {
      byDay.set(dateKey, { date, peso, origem, ts });
      return;
    }
    if (origem === prev.origem && ts >= prev.ts) {
      byDay.set(dateKey, { date, peso, origem, ts });
    }
  };

  for (const e of evolucao || []) {
    const d = parseRegistroDate(e.dataRegistro);
    if (!d || !isPesoValido(e.peso)) continue;
    consider(d, e.peso, 'seguimento');
  }

  for (const b of bios || []) {
    const d = parseBioDataRegistro(b.dataRegistro);
    if (!d || Number.isNaN(d.getTime()) || !isPesoValido(b.peso)) continue;
    consider(d, b.peso, 'bioimpedancia');
  }

  return Array.from(byDay.entries())
    .map(([dateKey, v]) => ({ dateKey, date: startOfDay(v.date), peso: v.peso, origem: v.origem }))
    .sort((a, b) => a.date.getTime() - b.date.getTime());
}

export function filterWeightSeriesByPeriod(
  series: WeightSeriesPoint[],
  refDate: Date,
  period: WeightPeriodId
): WeightSeriesPoint[] {
  const end = startOfDay(refDate);
  if (period === 'inicio') {
    return series.filter((p) => startOfDay(p.date).getTime() <= end.getTime());
  }
  const start = addDays(end, -period);
  return series.filter((p) => {
    const t = startOfDay(p.date).getTime();
    return t >= start.getTime() && t <= end.getTime();
  });
}

/**
 * Peso de comparação: registro real no dia alvo, senão o mais próximo na janela.
 * Sem interpolação. Sem fallback fora da janela.
 * Em "desde o início": primeiro registro real até a data de referência.
 */
export function findWeightComparisonPoint(
  series: WeightSeriesPoint[],
  refDate: Date,
  period: WeightPeriodId
): WeightSeriesPoint | null {
  const refStart = startOfDay(refDate);
  if (period === 'inicio') {
    const upTo = series.filter((p) => startOfDay(p.date).getTime() <= refStart.getTime());
    if (upTo.length < 2) return null;
    return upTo[0];
  }
  const target = addDays(refStart, -period);
  const w = comparisonWindowDays(period);
  const windowStart = addDays(target, -w);
  const windowEnd = addDays(target, w);
  const latestAllowed = addDays(refStart, -1);
  const upper = Math.min(windowEnd.getTime(), latestAllowed.getTime());

  const candidates = series.filter((p) => {
    const t = startOfDay(p.date).getTime();
    return t >= windowStart.getTime() && t <= upper;
  });
  if (candidates.length === 0) return null;

  const exactKey = metaHomeDateKey(target);
  const exact = candidates.find((p) => p.dateKey === exactKey);
  if (exact) return exact;

  const targetMs = target.getTime();
  return [...candidates].sort((a, b) => {
    const da = Math.abs(startOfDay(a.date).getTime() - targetMs);
    const db = Math.abs(startOfDay(b.date).getTime() - targetMs);
    if (da !== db) return da - db;
    return startOfDay(a.date).getTime() - startOfDay(b.date).getTime();
  })[0];
}

export interface WeightPeriodVariation {
  deltaKg: number;
  pct: number;
  comparison: WeightSeriesPoint;
  isExactPeriod: boolean;
}

export function computeWeightPeriodVariation(
  pesoAtual: number | null | undefined,
  comparison: WeightSeriesPoint | null,
  refDate: Date,
  period: WeightPeriodId
): WeightPeriodVariation | null {
  if (!isPesoValido(pesoAtual) || !comparison || !isPesoValido(comparison.peso)) return null;
  const deltaKg = pesoAtual - comparison.peso;
  if (!Number.isFinite(deltaKg)) return null;
  const pct = (deltaKg / comparison.peso) * 100;
  if (!Number.isFinite(pct)) return null;
  const expectedKey =
    period === 'inicio'
      ? comparison.dateKey
      : metaHomeDateKey(addDays(startOfDay(refDate), -period));
  return {
    deltaKg,
    pct,
    comparison,
    isExactPeriod: comparison.dateKey === expectedKey,
  };
}

/**
 * Peso-alvo em kg a partir de meta REAL (PERCENTUAL / PESO_ABSOLUTO / targetWeightKg).
 * Não aplica o fallback silencioso de 12% da Home antiga.
 */
export function resolvePesoMetaKgReal(
  paciente: PacienteCompleto | null | undefined,
  pesoInicialKg: number | null | undefined
): number | null {
  const metas = paciente?.planoTerapeutico?.metas;
  if (!resolveMetaPerdaPesoAtiva(metas)) return null;

  const hasExplicitValue =
    (metas?.weightLossTargetValue != null && metas.weightLossTargetValue > 0) ||
    (metas?.targetWeightKg != null && metas.targetWeightKg > 0);
  if (!hasExplicitValue) return null;
  if (!isPesoValido(pesoInicialKg)) return null;

  if (
    metas?.targetWeightKg != null &&
    metas.targetWeightKg > 0 &&
    !(metas.weightLossTargetValue != null && metas.weightLossTargetValue > 0)
  ) {
    return Math.round(metas.targetWeightKg * 10) / 10;
  }

  const kgLoss = resolveMetaPesoKgLoss(paciente, pesoInicialKg);
  if (kgLoss == null || !(kgLoss > 0)) return null;
  const alvo = pesoInicialKg - kgLoss;
  if (!Number.isFinite(alvo) || !(alvo > 0)) return null;
  return Math.round(alvo * 10) / 10;
}

export function formatKgPtBr(value: number): string {
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

export function formatPctPtBr(value: number): string {
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

export function formatDayMonthPtBr(d: Date): string {
  return startOfDay(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}
