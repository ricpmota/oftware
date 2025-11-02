'use client';

import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';

interface StackedBarsProps {
  data: any[];
  dataKeys: { key: string; name: string; color: string }[];
  xKey: string;
  height?: number;
  yAxisLabel?: string;
  xAxisLabel?: string;
  formatter?: (value: any) => string;
}

export default function StackedBars({
  data,
  dataKeys,
  xKey,
  height = 300,
  yAxisLabel,
  xAxisLabel,
  formatter
}: StackedBarsProps) {
  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey={xKey}
            label={xAxisLabel ? { value: xAxisLabel, position: 'bottom', offset: -5, style: { textAnchor: 'middle' } } : undefined}
          />
          <YAxis 
            label={yAxisLabel ? { value: yAxisLabel, angle: -90, position: 'insideLeft' } : undefined}
          />
          <Tooltip formatter={formatter} />
          <Legend wrapperStyle={{ paddingTop: '20px' }} />
          {dataKeys.map((dk, idx) => (
            <Bar key={idx} dataKey={dk.key} stackId="stack" fill={dk.color} name={dk.name} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

