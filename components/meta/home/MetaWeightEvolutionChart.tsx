'use client';

import { useMemo } from 'react';
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { WeightSeriesPoint } from '@/utils/metaHomeWeightPeriod';
import { formatKgPtBr } from '@/utils/metaHomeWeightPeriod';

const LINE = '#4CCB7A';
const META = '#3B82F6';
const AREA = 'rgba(76, 203, 122, 0.16)';
const GRID = '#e8edf2';
const TICK = '#94a3b8';

export interface MetaWeightEvolutionChartProps {
  points: WeightSeriesPoint[];
  pesoMetaKg?: number | null;
  height?: number;
  reduceMotion?: boolean;
}

function formatAxisDate(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  if (!y || !m || !d) return dateKey;
  return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}`;
}

function formatTooltipDate(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  if (!y || !m || !d) return dateKey;
  return new Date(y, m - 1, d).toLocaleDateString('pt-BR');
}

function EndBadgeDot(props: {
  cx?: number;
  cy?: number;
  index?: number;
  lastIndex: number;
  value?: number;
  fill: string;
  showIntermediate?: boolean;
}) {
  const { cx, cy, index, lastIndex, value, fill, showIntermediate = true } = props;
  if (cx == null || cy == null) return null;
  const isLast = index === lastIndex;
  if (!isLast) {
    if (!showIntermediate) return null;
    return <circle cx={cx} cy={cy} r={4} fill={fill} stroke="#fff" strokeWidth={2} />;
  }
  const label = value != null ? formatKgPtBr(value) : '';
  const w = Math.max(36, 10 + label.length * 7);
  return (
    <g>
      <circle cx={cx} cy={cy} r={6} fill={fill} stroke="#fff" strokeWidth={2.5} />
      <rect x={cx + 10} y={cy - 12} width={w} height={24} rx={12} fill={fill} />
      <text
        x={cx + 10 + w / 2}
        y={cy + 4}
        textAnchor="middle"
        fill="#fff"
        fontSize={11}
        fontWeight={700}
      >
        {label}
      </text>
    </g>
  );
}

export function MetaWeightEvolutionChart({
  points,
  pesoMetaKg,
  reduceMotion = false,
}: MetaWeightEvolutionChartProps) {
  const hasMeta = pesoMetaKg != null && pesoMetaKg > 0;
  const data = useMemo(
    () =>
      points.map((p) => ({
        dateKey: p.dateKey,
        peso: p.peso,
        origem: p.origem,
        meta: hasMeta ? pesoMetaKg : undefined,
      })),
    [points, hasMeta, pesoMetaKg]
  );
  const lastIndex = data.length - 1;
  const lastPeso = data[lastIndex]?.peso;

  const xInterval = useMemo(() => {
    if (data.length <= 4) return 0;
    if (data.length <= 8) return 1;
    return Math.ceil(data.length / 5) - 1;
  }, [data.length]);

  const yDomain = useMemo<[number, number] | ['auto', 'auto']>(() => {
    const pesos = data.map((d) => d.peso).filter((n) => Number.isFinite(n));
    if (pesos.length === 0) return ['auto', 'auto'];
    if (hasMeta && pesoMetaKg != null) pesos.push(pesoMetaKg);
    const min = Math.min(...pesos);
    const max = Math.max(...pesos);
    const pad = Math.max(0.8, (max - min) * 0.18);
    return [Math.floor((min - pad) * 10) / 10, Math.ceil((max + pad) * 10) / 10];
  }, [data, hasMeta, pesoMetaKg]);

  return (
    <div className="w-full min-w-0 overflow-hidden h-[240px] lg:h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 12, right: 62, left: 0, bottom: 4 }}>
          <CartesianGrid stroke={GRID} strokeDasharray="3 6" vertical={false} />
          <XAxis
            dataKey="dateKey"
            interval={xInterval}
            tick={{ fontSize: 10, fill: TICK }}
            tickMargin={8}
            axisLine={{ stroke: GRID }}
            tickLine={false}
            tickFormatter={formatAxisDate}
          />
          <YAxis
            domain={yDomain}
            width={36}
            tick={{ fontSize: 10, fill: TICK }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => formatKgPtBr(Number(v))}
          />
          <Tooltip
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              const row = payload.find((p) => p.dataKey === 'peso')?.payload as
                | { peso?: number; origem?: string; meta?: number }
                | undefined;
              if (row?.peso == null || !Number.isFinite(row.peso)) return null;
              const origemLabel =
                row.origem === 'bioimpedancia'
                  ? 'Bioimpedância'
                  : row.origem === 'seguimento'
                    ? 'Seguimento'
                    : null;
              return (
                <div className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs">
                  <p className="font-medium text-gray-500">{formatTooltipDate(String(label ?? ''))}</p>
                  <p className="mt-0.5 font-semibold text-[#0A1F44]">{formatKgPtBr(row.peso)} kg</p>
                  {origemLabel ? <p className="mt-0.5 text-gray-400">{origemLabel}</p> : null}
                </div>
              );
            }}
          />
          <Area
            type="linear"
            dataKey="peso"
            fill={AREA}
            stroke="none"
            legendType="none"
            isAnimationActive={!reduceMotion}
            animationDuration={450}
          />
          {hasMeta ? (
            <Line
              type="linear"
              dataKey="meta"
              stroke={META}
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={(props: { cx?: number; cy?: number; index?: number }) => (
                <EndBadgeDot
                  key={`meta-dot-${props.index ?? 0}`}
                  cx={props.cx}
                  cy={props.cy}
                  index={props.index}
                  lastIndex={lastIndex}
                  value={pesoMetaKg ?? undefined}
                  fill={META}
                  showIntermediate={false}
                />
              )}
              activeDot={false}
              connectNulls
              legendType="none"
              isAnimationActive={!reduceMotion}
              animationDuration={450}
            />
          ) : null}
          <Line
            type="linear"
            dataKey="peso"
            stroke={LINE}
            strokeWidth={2.5}
            dot={(props: { cx?: number; cy?: number; index?: number }) => (
              <EndBadgeDot
                key={`dot-${props.index ?? 0}`}
                cx={props.cx}
                cy={props.cy}
                index={props.index}
                lastIndex={lastIndex}
                value={props.index === lastIndex ? lastPeso : undefined}
                fill={LINE}
              />
            )}
            activeDot={{ r: 6, strokeWidth: 2, stroke: '#fff', fill: LINE }}
            connectNulls={false}
            legendType="none"
            isAnimationActive={!reduceMotion}
            animationDuration={450}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
