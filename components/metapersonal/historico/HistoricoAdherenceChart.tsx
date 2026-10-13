'use client';

import { useState } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { HistoryChartMetric, HistoryChartPoint } from '@/lib/metapersonal/historicoAnalytics';

export function HistoricoAdherenceChart({ points }: { points: HistoryChartPoint[] }) {
  const [metric, setMetric] = useState<HistoryChartMetric>('adherence');
  const hasExpected = points.some((item) => item.expected > 0);

  return (
    <section className="flex h-full min-h-[220px] flex-col rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-gray-900">Adesão ao longo do tempo</h2>
        <div className="flex rounded-lg border border-gray-200 p-0.5 text-[11px] font-semibold">
          <button
            type="button"
            onClick={() => setMetric('adherence')}
            className={`rounded-md px-2 py-1 ${
              metric === 'adherence' ? 'bg-gray-900 text-white' : 'text-gray-500'
            }`}
          >
            Adesão
          </button>
          <button
            type="button"
            onClick={() => setMetric('done')}
            className={`rounded-md px-2 py-1 ${
              metric === 'done' ? 'bg-gray-900 text-white' : 'text-gray-500'
            }`}
          >
            Realizados
          </button>
        </div>
      </div>
      {!hasExpected ? (
        <p className="flex flex-1 items-center text-[13px] text-gray-500">
          Ainda não há treinos suficientes para gerar o gráfico.
        </p>
      ) : (
        <div className="min-h-0 flex-1">
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={points} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#6B7280' }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fontSize: 11, fill: '#6B7280' }}
                axisLine={false}
                tickLine={false}
                domain={metric === 'adherence' ? [0, 100] : [0, 'auto']}
              />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 12, borderColor: '#E5E7EB' }}
                formatter={(value) =>
                  metric === 'adherence'
                    ? [`${value ?? '—'}%`, 'Adesão']
                    : [String(value ?? '—'), 'Realizados']
                }
              />
              <Line
                type="monotone"
                dataKey={metric === 'adherence' ? 'adherencePercent' : 'done'}
                stroke="#059669"
                strokeWidth={2}
                dot={{ r: 3, fill: '#059669' }}
                connectNulls={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}
