'use client';

import type { MouseEvent, RefObject, TouchEvent } from 'react';
import Image from 'next/image';
import { Target } from 'lucide-react';
import {
  organizationPatientDashboardPaint,
  type OrganizationShellChrome,
} from '@/lib/organization/resolveOrganizationShellChrome';
import {
  calcularPosicaoMarcadorImcHome,
  faixaVisualImcHome,
  formatImcPtBr,
} from '@/utils/metaHomeImcRange';
import { formatKgPtBr } from '@/utils/metaHomeWeightPeriod';

const TICKS: { value: number; align: 'center' | 'end' | 'start' }[] = [
  { value: 18.5, align: 'center' },
  { value: 24.9, align: 'center' },
  { value: 29.9, align: 'end' },
  { value: 30, align: 'start' },
];

const ZONES: { name: string; range: string; color: string }[] = [
  { name: 'Baixo', range: '< 18,5', color: '#60a5fa' },
  { name: 'Saudável', range: '18,5 – 24,9', color: '#4CCB7A' },
  { name: 'Sobrepeso', range: '25,0 – 29,9', color: '#fbbf24' },
  { name: 'Obesidade', range: '≥ 30', color: '#f87171' },
];

export interface MetaHomeImcRangeProps {
  imcAtual: number | null | undefined;
  imcMeta?: number | null;
  pesoMetaKg?: number | null;
  faltamKg?: number | null;
  onOpenMetas?: () => void;
  classificacao?: string | null;
  accentColor?: string;
  barRef?: RefObject<HTMLDivElement | null>;
  onMarkerMouseDown?: (e: MouseEvent<HTMLDivElement>) => void;
  onMarkerTouchStart?: (e: TouchEvent<HTMLDivElement>) => void;
  /** Chrome autenticado. No Método valores, marcador e alvo conservam a identidade atual. */
  chrome?: OrganizationShellChrome | null;
}

const PANEL_SHADOW_LG_METODO = 'lg:shadow-[0_8px_24px_-16px_rgba(10,31,68,0.18)]';
const PANEL_SHADOW_LG_NEUTRAL = 'lg:shadow-[0_8px_24px_-16px_rgba(17,24,39,0.18)]';
const MARKER_SHADOW_METODO = 'shadow-[0_1px_4px_rgba(10,31,68,0.28)]';
const MARKER_SHADOW_NEUTRAL = 'shadow-[0_1px_4px_rgba(17,24,39,0.28)]';

function tickTransform(align: 'center' | 'end' | 'start'): string {
  if (align === 'end') return 'translateX(-100%)';
  if (align === 'start') return 'translateX(4px)';
  return 'translateX(-50%)';
}

function faltamTexto(faltamKg: number | null | undefined): string {
  if (faltamKg == null) return '—';
  if (faltamKg > 0) return `${formatKgPtBr(faltamKg)} kg`;
  return 'Atingida';
}

export function MetaHomeImcRange({
  imcAtual,
  imcMeta,
  pesoMetaKg,
  faltamKg,
  onOpenMetas,
  classificacao,
  accentColor,
  barRef,
  onMarkerMouseDown,
  onMarkerTouchStart,
  chrome,
}: MetaHomeImcRangeProps) {
  const paint = organizationPatientDashboardPaint(chrome);
  const inkStyle = paint ? { color: paint.ink } : undefined;
  const markerColor = accentColor ?? paint?.ink ?? '#0A1F44';
  const imc = imcAtual != null && imcAtual > 0 ? imcAtual : null;
  const posAtual = calcularPosicaoMarcadorImcHome(imc);
  const meta = imcMeta != null && imcMeta > 0 ? imcMeta : null;
  const posMeta = meta != null ? calcularPosicaoMarcadorImcHome(meta) : null;
  const faixa = classificacao || faixaVisualImcHome(imc);
  const faixaAria = (faixa || '').toLowerCase();
  const metaKg = pesoMetaKg != null && pesoMetaKg > 0 ? pesoMetaKg : null;
  const metaClickable = typeof onOpenMetas === 'function';

  const statsRow = (
    <div className="grid grid-cols-3 items-baseline gap-1 text-center">
      <p className="min-w-0 text-[13px] font-semibold tabular-nums text-[#0A1F44]" style={inkStyle}>
        IMC {imc != null ? formatImcPtBr(imc) : '—'}
      </p>
      <button
        type="button"
        onClick={onOpenMetas}
        disabled={!metaClickable}
        className={`min-w-0 text-[13px] font-semibold tabular-nums text-[#0A1F44] ${
          metaClickable ? 'cursor-pointer' : 'cursor-default'
        }`}
        style={inkStyle}
      >
        {metaKg != null ? `Meta ${formatKgPtBr(metaKg)} kg` : 'Meta —'}
      </button>
      <button
        type="button"
        onClick={onOpenMetas}
        disabled={!metaClickable}
        className={`min-w-0 text-[13px] font-medium tabular-nums text-gray-500 ${
          metaClickable ? 'cursor-pointer' : 'cursor-default'
        }`}
      >
        {faltamKg == null
          ? ''
          : faltamKg > 0
            ? `Faltam ${formatKgPtBr(faltamKg)} kg`
            : 'Meta atingida'}
      </button>
    </div>
  );

  return (
    <div className={`mt-4 overflow-visible rounded-[18px] border border-gray-200/90 bg-white px-4 py-4 sm:px-5 sm:py-5 lg:mt-0 lg:flex lg:h-full lg:flex-col lg:rounded-[20px] lg:px-5 lg:py-5 ${paint ? PANEL_SHADOW_LG_NEUTRAL : PANEL_SHADOW_LG_METODO}`}>
      {imc == null ? (
        <p className="text-sm text-gray-500">Dados insuficientes para calcular o IMC</p>
      ) : (
        <>
          <div className="lg:hidden">{statsRow}</div>
          <div className="mb-4 hidden text-center lg:block">
            <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">IMC atual</p>
            <p className="mt-1 text-[44px] font-extrabold leading-none tabular-nums text-[#0A1F44]" style={inkStyle}>
              {formatImcPtBr(imc)}
            </p>
            {faixa ? (
              <p className="mt-2 text-sm font-medium text-gray-600">{faixa}</p>
            ) : null}
            <div className="mt-3 flex items-baseline justify-center gap-5">
              <button
                type="button"
                onClick={onOpenMetas}
                disabled={!metaClickable}
                className={metaClickable ? 'cursor-pointer' : 'cursor-default'}
              >
                <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">Meta</p>
                <p className="mt-0.5 text-sm font-bold tabular-nums text-[#0A1F44]" style={inkStyle}>
                  {metaKg != null ? `${formatKgPtBr(metaKg)} kg` : '—'}
                </p>
              </button>
              <button
                type="button"
                onClick={onOpenMetas}
                disabled={!metaClickable}
                className={metaClickable ? 'cursor-pointer' : 'cursor-default'}
              >
                <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">Faltam</p>
                <p className="mt-0.5 text-sm font-bold tabular-nums text-[#0A1F44]" style={inkStyle}>
                  {faltamTexto(faltamKg)}
                </p>
              </button>
            </div>
          </div>

          <div className="relative mt-3 lg:mt-auto">
            <div className="relative mb-1 h-4">
              {TICKS.map((tick) => (
                <span
                  key={tick.value}
                  className="absolute whitespace-nowrap text-[10px] text-gray-400 sm:text-[11px]"
                  style={{
                    left: `${calcularPosicaoMarcadorImcHome(tick.value)}%`,
                    transform: tickTransform(tick.align),
                  }}
                >
                  {formatImcPtBr(tick.value)}
                </span>
              ))}
            </div>

            {meta != null ? <div className="h-7" aria-hidden /> : <div className="h-0.5" aria-hidden />}

            <div className="relative">
              {meta != null && posMeta != null ? (
                <div
                  className="pointer-events-none absolute bottom-full z-[6] mb-0.5 flex -translate-x-1/2 flex-col items-center drop-shadow-md"
                  style={{ left: `${posMeta}%` }}
                  title={`IMC correspondente à meta: ${formatImcPtBr(meta)}`}
                  role="img"
                  aria-label={`IMC correspondente à meta: ${formatImcPtBr(meta)}`}
                >
                  <div className="flex h-[26px] w-[26px] shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-white bg-white shadow-md">
                    {paint ? (
                      <Target
                        className="h-[70%] w-[70%]"
                        strokeWidth={2.25}
                        style={{ color: paint.mark }}
                        aria-hidden
                        data-dashboard-neutral-icon="imc-meta-alvo"
                      />
                    ) : (
                      <Image
                        src="/icones/imc-meta-alvo-simbolo.png"
                        alt=""
                        width={22}
                        height={22}
                        className="h-[88%] w-[88%] object-contain object-center"
                        draggable={false}
                      />
                    )}
                  </div>
                  <div
                    className="-mt-px h-0 w-0 shrink-0 border-x-[7px] border-t-[8px] border-x-transparent border-t-white"
                    aria-hidden
                  />
                </div>
              ) : null}

              <div ref={barRef} className="relative h-[9px] overflow-visible rounded-full">
                <div className="flex h-full overflow-hidden rounded-full">
                  {ZONES.map((zone) => (
                    <div
                      key={zone.name}
                      className="h-full flex-1"
                      style={{ backgroundColor: zone.color }}
                    />
                  ))}
                </div>

                <div
                  className="absolute top-1/2 z-10 flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 cursor-grab touch-none select-none items-center justify-center active:cursor-grabbing"
                  style={{ left: `${posAtual}%` }}
                  onMouseDown={onMarkerMouseDown}
                  onTouchStart={onMarkerTouchStart}
                  role="slider"
                  aria-valuemin={0}
                  aria-valuemax={50}
                  aria-valuenow={Math.round(imc * 10) / 10}
                  aria-label={`IMC atual: ${formatImcPtBr(imc)}${
                    faixaAria ? `, classificação ${faixaAria}` : ''
                  }`}
                >
                  <span
                    className={`h-3.5 w-3.5 rounded-full bg-white ${paint ? MARKER_SHADOW_NEUTRAL : MARKER_SHADOW_METODO}`}
                    style={{ border: `2px solid ${markerColor}` }}
                    aria-hidden
                  />
                </div>
              </div>
            </div>

            <div className="mt-2.5 grid grid-cols-4 gap-1">
              {ZONES.map((zone) => (
                <div key={zone.name} className="min-w-0 text-center">
                  <p className="text-[10px] font-medium leading-tight text-gray-600 sm:text-[11px] lg:text-[12px]">
                    {zone.name}
                  </p>
                  <p className="mt-0.5 text-[10px] leading-tight text-gray-400 sm:text-[11px]">
                    {zone.range}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
