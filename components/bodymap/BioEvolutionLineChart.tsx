'use client';

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';

export interface BioEvolutionLineChartPoint {
  data: string;
  valor: number | null;
}

export interface BioEvolutionLineChartProps {
  data: BioEvolutionLineChartPoint[];
  label: string;
  unit: string;
  color: string;
  height?: number;
}

export function BioEvolutionLineChart({
  data,
  label,
  unit,
  color,
  height = 220,
}: BioEvolutionLineChartProps) {
  const hasData = data.some((d) => d.valor != null);

  if (!hasData) {
    return <p className="text-sm text-gray-500 text-center py-8">Sem dados para esta métrica.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 12, right: 12, left: 0, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="data" tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} />
        <YAxis
          tick={{ fontSize: 10, fill: '#6b7280' }}
          axisLine={false}
          tickLine={false}
          width={36}
          domain={['auto', 'auto']}
        />
        <Tooltip
          contentStyle={{
            borderRadius: 12,
            border: '1px solid #e5e7eb',
            fontSize: 12,
          }}
          formatter={(v: number) => [
            `${Number(v).toFixed(1)}${unit ? ` ${unit}` : ''}`,
            label,
          ]}
        />
        <Line
          type="monotone"
          dataKey="valor"
          stroke={color}
          strokeWidth={2.5}
          dot={{ r: 4, fill: color, strokeWidth: 0 }}
          activeDot={{ r: 6 }}
          connectNulls
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
