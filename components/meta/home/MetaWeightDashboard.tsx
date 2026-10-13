'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import type { BioImpedanciaRegistro } from '@/types/bioImpedancia';
import type { PacienteCompleto } from '@/types/obesidade';
import { MetaWeightEvolutionChart } from '@/components/meta/home/MetaWeightEvolutionChart';
import {
  organizationPatientDashboardPaint,
  type OrganizationShellChrome,
} from '@/lib/organization/resolveOrganizationShellChrome';
import {
  buildMetaHomeWeightSeries,
  computeWeightPeriodVariation,
  daysSinceFirstWeight,
  filterWeightSeriesByPeriod,
  findWeightComparisonPoint,
  formatDayMonthPtBr,
  formatKgPtBr,
  formatPctPtBr,
  resolvePesoMetaKgReal,
  type WeightPeriodId,
} from '@/utils/metaHomeWeightPeriod';

export interface MetaWeightDashboardProps {
  pesoAtual: number | null | undefined;
  weightValue: ReactNode;
  imc: number | null | undefined;
  imcLabel?: string | null;
  imcClassName?: string;
  imcBackground?: string;
  paciente: PacienteCompleto | null;
  refDate: Date | null;
  evolucao: Array<{ dataRegistro?: Date | string | number; peso?: number | null }>;
  bios: BioImpedanciaRegistro[];
  pesoInicial: number | null | undefined;
  children?: ReactNode;
  imcPanel?: ReactNode;
  /** Quando true, o dashboard entra no grid desktop ao lado do banner (CSS contents). */
  hasBanner?: boolean;
  /** Chrome autenticado. No Método os cards conservam navy e sombra atuais. */
  chrome?: OrganizationShellChrome | null;
}

const CARD_SHADOW_METODO = 'shadow-[0_8px_24px_-16px_rgba(10,31,68,0.18)]';
const CARD_SHADOW_NEUTRAL = 'shadow-[0_8px_24px_-16px_rgba(17,24,39,0.18)]';
const CARD_SHADOW_LG_METODO = 'lg:shadow-[0_8px_24px_-16px_rgba(10,31,68,0.18)]';
const CARD_SHADOW_LG_NEUTRAL = 'lg:shadow-[0_8px_24px_-16px_rgba(17,24,39,0.18)]';

function usePrefersReducedMotion(): boolean {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => setReduce(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);
  return reduce;
}

export function MetaWeightDashboard({
  pesoAtual,
  weightValue,
  imc,
  imcLabel,
  imcClassName,
  imcBackground,
  paciente,
  refDate,
  evolucao,
  bios,
  pesoInicial,
  children,
  imcPanel,
  hasBanner = false,
  chrome,
}: MetaWeightDashboardProps) {
  const paint = organizationPatientDashboardPaint(chrome);
  const cardShadow = paint ? CARD_SHADOW_NEUTRAL : CARD_SHADOW_METODO;
  const cardShadowLg = paint ? CARD_SHADOW_LG_NEUTRAL : CARD_SHADOW_LG_METODO;
  const inkStyle = paint ? { color: paint.ink } : undefined;
  const [periodId, setPeriodId] = useState<WeightPeriodId>('inicio');
  const reduceMotion = usePrefersReducedMotion();

  const fullSeries = useMemo(
    () => buildMetaHomeWeightSeries(evolucao, bios),
    [evolucao, bios]
  );

  const spanDays = useMemo(
    () => (refDate ? daysSinceFirstWeight(fullSeries, refDate) : 0),
    [fullSeries, refDate]
  );

  const periodOptions = useMemo(
    () => [
      { id: 'inicio' as const, label: spanDays > 0 ? `${spanDays} dias` : 'Desde o início' },
      { id: 7 as const, label: '7 dias' },
      { id: 30 as const, label: '30 dias' },
    ],
    [spanDays]
  );

  const periodSeries = useMemo(() => {
    if (!refDate) return [];
    return filterWeightSeriesByPeriod(fullSeries, refDate, periodId);
  }, [fullSeries, refDate, periodId]);

  const comparison = useMemo(() => {
    if (!refDate) return null;
    return findWeightComparisonPoint(fullSeries, refDate, periodId);
  }, [fullSeries, refDate, periodId]);

  const variation = useMemo(() => {
    if (!refDate) return null;
    return computeWeightPeriodVariation(pesoAtual, comparison, refDate, periodId);
  }, [pesoAtual, comparison, refDate, periodId]);

  const pesoMetaKg = useMemo(
    () => resolvePesoMetaKgReal(paciente, pesoInicial),
    [paciente, pesoInicial]
  );

  const hasChart = periodSeries.length >= 2;
  const chartTitle = pesoMetaKg != null ? 'Evolução do peso rumo à meta' : 'Evolução do peso';

  let variationTone = 'text-gray-500';
  let variationArrow = '→';
  let variationKgAbs = '0,0';
  if (variation) {
    const mag = Math.abs(variation.deltaKg);
    variationKgAbs = formatKgPtBr(mag);
    if (mag < 0.05) {
      variationTone = 'text-gray-500';
      variationArrow = '→';
    } else if (variation.deltaKg < 0) {
      variationTone = 'text-[#16a34a]';
      variationArrow = '↓';
    } else {
      variationTone = 'text-amber-600';
      variationArrow = '↑';
    }
  }

  return (
    <section
      className={`relative overflow-hidden rounded-[20px] border border-gray-200/90 bg-white ${cardShadow} lg:overflow-visible lg:rounded-none lg:border-0 lg:bg-transparent lg:shadow-none ${
        hasBanner ? 'lg:contents' : 'lg:flex lg:flex-col lg:gap-6'
      }`}
    >
      {children ? (
        <div className="pointer-events-none absolute inset-0 z-[51] overflow-hidden rounded-[20px] lg:hidden">
          {children}
        </div>
      ) : null}

      <div
        className={`relative min-w-0 px-4 pb-4 pt-4 sm:px-5 sm:pb-5 sm:pt-5 lg:flex lg:h-full lg:min-h-[240px] lg:flex-col lg:rounded-[20px] lg:border lg:border-gray-200/90 lg:bg-white lg:px-6 lg:py-5 ${cardShadowLg} ${
          hasBanner ? '' : 'lg:w-full'
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">Peso atual</p>
            <div className="mt-1 flex items-baseline gap-2">
              <span
                className="font-extrabold tabular-nums leading-none text-[#0A1F44] text-[44px] sm:text-[52px] lg:text-[48px] xl:text-[52px]"
                style={inkStyle}
              >
                {weightValue}
              </span>
              {pesoAtual != null && pesoAtual > 0 ? (
                <span className="text-[18px] font-semibold text-gray-500 sm:text-[20px]">kg</span>
              ) : null}
            </div>
            {(imcLabel || (imc != null && imc > 0)) && (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {imcLabel ? (
                  <div
                    className={`inline-flex items-center rounded-full px-3 py-1.5 text-sm font-medium ${imcClassName ?? ''}`}
                    style={{ background: imcBackground }}
                  >
                    {imcLabel}
                  </div>
                ) : null}
                {imc != null && imc > 0 ? (
                  <span className="text-sm font-medium text-gray-500">
                    IMC {imc.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                  </span>
                ) : null}
              </div>
            )}
          </div>

          <div className="flex shrink-0 flex-col items-end gap-2">
            <label className="sr-only" htmlFor="meta-home-peso-periodo">
              Período da variação de peso
            </label>
            <div className="relative">
              <select
                id="meta-home-peso-periodo"
                value={periodId}
                onChange={(e) => {
                  const v = e.target.value;
                  setPeriodId(v === 'inicio' ? 'inicio' : (Number(v) as WeightPeriodId));
                }}
                className="appearance-none rounded-md border-0 bg-transparent py-0.5 pl-1.5 pr-5 text-[11px] font-medium text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-0"
              >
                {periodOptions.map((o) => (
                  <option key={String(o.id)} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
              <span
                className="pointer-events-none absolute right-0.5 top-1/2 -translate-y-1/2 text-[8px] leading-none text-gray-300"
                aria-hidden
              >
                ▾
              </span>
            </div>

            <div
              key={String(periodId)}
              className={`min-w-[8.5rem] rounded-[14px] border border-gray-200 bg-gray-50/80 px-3 py-2 text-right lg:hidden ${
                reduceMotion ? '' : 'transition-opacity duration-200'
              }`}
            >
              {variation ? (
                <>
                  <p className={`text-sm font-semibold tabular-nums leading-tight ${variationTone}`}>
                    {variationArrow} {variationKgAbs} kg
                    <span className="ml-1.5 font-medium text-gray-500">
                      {variation.pct > 0 ? '+' : ''}
                      {formatPctPtBr(variation.pct)}%
                    </span>
                  </p>
                  <p className="mt-0.5 text-[11px] text-gray-400">
                    {periodId === 'inicio'
                      ? 'desde o início'
                      : variation.isExactPeriod
                        ? 'no período'
                        : `vs ${formatDayMonthPtBr(variation.comparison.date)}`}
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm font-semibold tabular-nums text-gray-400">—</p>
                  <p className="mt-0.5 text-[11px] leading-snug text-gray-400">
                    Dados insuficientes no período
                  </p>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="mt-4 hidden border-t border-gray-100 pt-4 lg:mt-auto lg:block">
          <div
            key={`desk-${String(periodId)}`}
            className={reduceMotion ? '' : 'transition-opacity duration-200'}
          >
            {variation ? (
              <>
                <p className={`text-lg font-semibold tabular-nums leading-tight ${variationTone}`}>
                  {variationArrow} {variationKgAbs} kg
                  <span className="ml-2 text-sm font-medium text-gray-500">
                    {variation.pct > 0 ? '+' : ''}
                    {formatPctPtBr(variation.pct)}%
                  </span>
                </p>
                <p className="mt-0.5 text-[12px] text-gray-400">
                  {periodId === 'inicio'
                    ? 'desde o início'
                    : variation.isExactPeriod
                      ? 'no período'
                      : `vs ${formatDayMonthPtBr(variation.comparison.date)}`}
                </p>
              </>
            ) : (
              <>
                <p className="text-sm font-semibold tabular-nums text-gray-400">—</p>
                <p className="mt-0.5 text-[12px] text-gray-400">Dados insuficientes no período</p>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="min-w-0 lg:col-span-2 lg:grid lg:grid-cols-[minmax(0,1.8fr)_minmax(0,1fr)] lg:items-stretch lg:gap-6">
        <div className={`relative min-w-0 px-4 pb-4 sm:px-5 lg:flex lg:h-full lg:flex-col lg:rounded-[20px] lg:border lg:border-gray-200/90 lg:bg-white lg:px-6 lg:py-5 ${cardShadowLg}`}>
          <h3 className="mb-2 text-sm font-semibold text-[#0A1F44]" style={inkStyle}>
            {chartTitle}
          </h3>
          {hasChart ? (
            <div className="lg:flex lg:flex-1 lg:flex-col lg:justify-center">
              <MetaWeightEvolutionChart
                points={periodSeries}
                pesoMetaKg={pesoMetaKg}
                reduceMotion={reduceMotion}
              />
            </div>
          ) : (
            <p className="py-10 text-center text-sm text-gray-400 lg:flex lg:min-h-[300px] lg:items-center lg:justify-center">
              Histórico insuficiente para este período.
            </p>
          )}
        </div>

        <div className="min-w-0 px-4 pb-4 sm:px-5 lg:flex lg:h-full lg:flex-col lg:px-0 lg:pb-0">
          {imcPanel}
        </div>
      </div>
    </section>
  );
}
