'use client';

import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface TrendLineProps {
  data: any[];
  dataKeys: { key: string; name: string; stroke: string; strokeWidth?: number; dot?: boolean; strokeDasharray?: string; legendType?: 'line' | 'square' | 'circle' | 'cross' | 'diamond' | 'star' | 'triangle' | 'wye' | undefined }[];
  xKey: string;
  height?: number;
  yAxisLabel?: string;
  xAxisLabel?: string;
  domain?: [number | string, number | string];
  formatter?: (value: any) => string;
  labelFormatter?: (label: any) => string;
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
  labelFormatter
}: TrendLineProps) {
  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey={xKey}
            label={xAxisLabel ? { value: xAxisLabel, position: 'bottom', offset: -5, style: { textAnchor: 'middle' } } : undefined}
            tickFormatter={(tickItem) => {
              if (typeof tickItem === 'string' && tickItem.match(/^\d{4}-\d{2}-\d{2}$/)) {
                return new Date(tickItem).toLocaleDateString('pt-BR');
              }
              return tickItem;
            }}
          />
          <YAxis 
            label={yAxisLabel ? { value: yAxisLabel, angle: -90, position: 'insideLeft' } : undefined}
            domain={domain}
          />
          <Tooltip 
            formatter={formatter}
            labelFormatter={labelFormatter}
          />
          <Legend wrapperStyle={{ paddingTop: '20px' }} />
          {dataKeys.map((dk, idx) => (
            <Line
              key={idx}
              type="monotone"
              dataKey={dk.key}
              stroke={dk.stroke}
              strokeWidth={dk.strokeWidth || 2}
              name={dk.name}
              dot={dk.dot !== false ? { r: 4 } : false}
              strokeDasharray={dk.strokeDasharray}
              legendType={dk.legendType}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

