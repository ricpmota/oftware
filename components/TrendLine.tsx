'use client';

import React, { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea,
  LabelList,
} from 'recharts';

interface TrendLineProps {
  data: Record<string, unknown>[];
  dataKeys: {
    key: string;
    name: string;
    stroke: string;
    strokeWidth?: number;
    dot?: boolean;
    strokeDasharray?: string;
    legendType?: 'line' | 'square' | 'circle' | 'cross' | 'diamond' | 'star' | 'triangle' | 'wye' | undefined;
  }[];
  xKey: string;
  height?: number;
  yAxisLabel?: string;
  xAxisLabel?: string;
  domain?: [number | string, number | string];
  formatter?: (value: unknown) => string;
  labelFormatter?: (label: unknown) => string;
  referenceLines?: { value: number; label?: string; stroke?: string; strokeDasharray?: string }[];
  /** Mostra o valor numérico em cada ponto (evolução temporal). */
  showValueLabels?: boolean;
  /** Casas decimais nos rótulos dos pontos (padrão 1). */
  valueLabelDecimals?: number;
  /** Exibe a legenda do Recharts (padrão true). */
  showLegend?: boolean;
  /**
   * Visual premium para exames laboratoriais (datas curtas, unidade no canto,
   * faixa de referência suave, pontos destacados). Não altera os dados.
   */
  premium?: boolean;
  /** Faixa de referência (min/max) — geometria visual apenas. */
  referenceBand?: { min: number; max: number };
  /** Unidade exibida no canto superior esquerdo (ex.: mg/dL). */
  unitLabel?: string;
}

function formatShortDate(tickItem: unknown): string {
  if (typeof tickItem === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(tickItem)) {
    const [, m, d] = tickItem.split('-');
    return `${d}/${m}`;
  }
  return String(tickItem ?? '');
}

function formatFullDate(tickItem: unknown): string {
  if (typeof tickItem === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(tickItem)) {
    const [y, m, d] = tickItem.split('-').map(Number);
    if (!y || !m || !d) return tickItem;
    return new Date(y, m - 1, d).toLocaleDateString('pt-BR');
  }
  return String(tickItem ?? '');
}

function TrendDot({
  cx,
  cy,
  index,
  stroke,
  lastIndex,
  premium,
}: {
  cx?: number;
  cy?: number;
  index?: number;
  stroke: string;
  lastIndex: number;
  premium: boolean;
}) {
  if (cx == null || cy == null) return null;
  const isLast = index === lastIndex;
  const r = premium ? (isLast ? 5.5 : 4) : 4;
  return (
    <circle
      cx={cx}
      cy={cy}
      r={r}
      fill={stroke}
      stroke="#fff"
      strokeWidth={premium ? 2 : 1}
    />
  );
}

export default function TrendLine({
  data,
  dataKeys,
  xKey,
  height = 300,
  yAxisLabel,
  xAxisLabel,
  domain,
  formatter,
  labelFormatter,
  referenceLines,
  showValueLabels = false,
  valueLabelDecimals = 1,
  showLegend = true,
  premium = false,
  referenceBand,
  unitLabel,
}: TrendLineProps) {
  const labelFmt = (v: unknown) => {
    if (v == null || v === '') return '';
    const n = Number(v);
    if (!Number.isFinite(n)) return '';
    if (valueLabelDecimals === 0) return String(Math.round(n));
    const fixed = n.toFixed(valueLabelDecimals);
    return fixed.endsWith('.0') ? fixed.slice(0, -2) : fixed;
  };

  const chartHeight = premium ? Math.min(height, 220) : height;
  const unitText = unitLabel || (premium ? yAxisLabel : undefined);

  const xInterval = useMemo(() => {
    if (!premium || !Array.isArray(data)) return 0;
    if (data.length <= 6) return 0;
    if (data.length <= 10) return 1;
    return Math.ceil(data.length / 6) - 1;
  }, [premium, data]);

  const lastIndex = Array.isArray(data) ? data.length - 1 : -1;

  return (
    <div className="relative w-full min-w-0" style={{ height: chartHeight }}>
      {premium && unitText ? (
        <span className="pointer-events-none absolute left-1 top-0 z-[1] text-[10px] font-medium text-slate-400">
          {unitText}
        </span>
      ) : null}
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{
            top: showValueLabels || premium ? 26 : 6,
            right: premium ? 10 : 6,
            left: premium ? 0 : 4,
            bottom: premium ? 2 : 4,
          }}
        >
          <CartesianGrid
            strokeDasharray={premium ? '3 6' : '3 3'}
            stroke={premium ? '#e2e8f0' : '#ccc'}
            vertical={!premium}
          />
          <XAxis
            dataKey={xKey}
            label={
              !premium && xAxisLabel
                ? { value: xAxisLabel, position: 'bottom', offset: -5, style: { textAnchor: 'middle' } }
                : undefined
            }
            interval={premium ? xInterval : 0}
            tick={{ fontSize: premium ? 10 : 12, fill: premium ? '#94a3b8' : '#666' }}
            tickMargin={premium ? 6 : 4}
            axisLine={premium ? { stroke: '#e2e8f0' } : undefined}
            tickLine={premium ? false : undefined}
            tickFormatter={(tickItem) => {
              if (premium) return formatShortDate(tickItem);
              if (typeof tickItem === 'string' && tickItem.match(/^\d{4}-\d{2}-\d{2}$/)) {
                return new Date(tickItem).toLocaleDateString('pt-BR');
              }
              return tickItem;
            }}
          />
          <YAxis
            label={
              !premium && yAxisLabel
                ? { value: yAxisLabel, angle: -90, position: 'insideLeft' }
                : undefined
            }
            domain={domain}
            width={premium ? 36 : undefined}
            tick={{ fontSize: premium ? 10 : 12, fill: premium ? '#94a3b8' : '#666' }}
            axisLine={premium ? false : undefined}
            tickLine={premium ? false : undefined}
          />
          <Tooltip
            formatter={
              formatter
                ? (value: unknown) => formatter(value)
                : (value: unknown) => {
                    if (value == null) return ['N/A', ''];
                    const n = Number(value);
                    const text = Number.isFinite(n) ? labelFmt(n) : String(value);
                    return [unitText ? `${text} ${unitText}` : text, 'Valor'];
                  }
            }
            labelFormatter={
              labelFormatter
                ? (label: unknown) => labelFormatter(label)
                : (label: unknown) => `Data: ${formatFullDate(label)}`
            }
            contentStyle={
              premium
                ? {
                    borderRadius: 10,
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                    fontSize: 12,
                  }
                : undefined
            }
          />
          {showLegend && !premium ? <Legend wrapperStyle={{ paddingTop: '20px' }} /> : null}

          {premium && referenceBand ? (
            <ReferenceArea
              y1={referenceBand.min}
              y2={referenceBand.max}
              fill="#86efac"
              fillOpacity={0.18}
              strokeOpacity={0}
              ifOverflow="extendDomain"
            />
          ) : null}

          {referenceLines &&
            referenceLines.map((refLine, idx) => (
              <ReferenceLine
                key={`ref-${idx}`}
                y={refLine.value}
                label={
                  !premium && refLine.label
                    ? { value: refLine.label, position: 'right' }
                    : undefined
                }
                stroke={premium ? '#94a3b8' : refLine.stroke || '#94a3b8'}
                strokeDasharray={premium ? '4 6' : refLine.strokeDasharray || '5 5'}
                strokeOpacity={premium ? 0.35 : 1}
              />
            ))}

          {dataKeys.map((dk, idx) => (
            <Line
              key={idx}
              type="monotone"
              dataKey={dk.key}
              stroke={dk.stroke}
              strokeWidth={dk.strokeWidth || (premium ? 2.25 : 2)}
              name={dk.name}
              dot={
                dk.dot !== false
                  ? (props) => (
                      <TrendDot
                        {...props}
                        stroke={dk.stroke}
                        lastIndex={lastIndex}
                        premium={premium}
                      />
                    )
                  : false
              }
              activeDot={premium ? { r: 6, strokeWidth: 2, stroke: '#fff' } : undefined}
              strokeDasharray={dk.strokeDasharray}
              legendType={dk.legendType}
              isAnimationActive={false}
              connectNulls={false}
            >
              {showValueLabels ? (
                <LabelList
                  dataKey={dk.key}
                  position="top"
                  offset={premium ? 8 : 6}
                  fontSize={premium ? 11 : 10}
                  fontWeight={premium ? 600 : 400}
                  fill={premium ? '#0f172a' : dk.stroke}
                  formatter={labelFmt}
                />
              ) : null}
            </Line>
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
