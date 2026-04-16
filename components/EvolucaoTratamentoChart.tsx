'use client';

import { Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export type EvolucaoTratamentoPonto = { weekIndex: number; peso: number | null; doseMg: number };

type Props = {
  evolucao: EvolucaoTratamentoPonto[];
  pacienteId: string;
  /**
   * `true` = mesmo contraste do modal no metaadmin quando themeHome é dark
   * (fundo branco no modal, eixos pretos, tooltip claro).
   */
  invertedModal?: boolean;
};

/**
 * Gráfico combinado: linha verde (peso) + barras rosa (dose mg), igual ao modal
 * "Resultado do tratamento" / depoimento no metaadmin.
 */
export function EvolucaoTratamentoChart({ evolucao, pacienteId, invertedModal = false }: Props) {
  if (evolucao.length === 0) return null;

  const isHomeDark = invertedModal;
  const chartGridStroke = isHomeDark ? 'rgba(232, 237, 237, 0.25)' : '#e5e7eb';
  const chartTickFill = isHomeDark ? '#E8EDED' : '#6b7280';
  const chartTooltipStyle = isHomeDark
    ? { backgroundColor: '#0A1F44', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }
    : undefined;
  const chartColors = isHomeDark
    ? { vitalGreen: '#4CCB7A', dataBlue: '#2F8FA3', deepBlue: '#0A1F44' }
    : { vitalGreen: '#10b981', dataBlue: '#0d9488', deepBlue: '#0f766e' };

  const maxDose = evolucao.reduce((m, p) => Math.max(m, p.doseMg || 0), 0);
  const maxDoseAxis = maxDose > 0 ? Math.min(30, (maxDose || 0) * 2) : 15;
  const baseTicks = [2.5, 5, 7.5, 10, 12.5, 15];
  const doseTicks = baseTicks.filter((v) => v <= maxDoseAxis);
  const chartData = evolucao.map((p) => ({
    semana: `S${p.weekIndex}`,
    peso: p.peso ?? null,
    dose: p.doseMg ?? 0,
  }));
  const totalDose = evolucao.reduce((s, p) => s + (p.doseMg || 0), 0);
  const patternId = `dosePat_chart_${String(pacienteId || 'x').replace(/[^a-zA-Z0-9_-]/g, '_')}`;
  const modalDosePink = '#ec4899';
  const modalDosePinkSoft = isHomeDark ? 'rgba(236,72,153,0.22)' : 'rgba(236,72,153,0.14)';
  const modalChartTickFill = isHomeDark ? '#000000' : chartTickFill;
  const modalChartGridStroke = isHomeDark ? '#e5e7eb' : chartGridStroke;
  const modalTooltipStyle = isHomeDark
    ? { backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', color: '#000000' }
    : chartTooltipStyle;
  const modalTooltipLabelStyle = isHomeDark ? { color: '#000000' } : undefined;

  return (
    <div className="space-y-4">
      <h4 className={`text-sm font-semibold ${isHomeDark ? 'text-black' : 'text-gray-700 dark:text-gray-300'}`}>
        Evolução do tratamento
      </h4>
      <div className="h-56 w-full min-h-[14rem]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
            <defs>
              <pattern id={patternId} patternUnits="userSpaceOnUse" width={10} height={10}>
                <rect width="10" height="10" fill={modalDosePinkSoft} />
                <path
                  d="M0 10 L10 0 M-2 2 L2 -2 M8 12 L12 8"
                  stroke={modalDosePink}
                  strokeWidth={1.2}
                  strokeOpacity={0.85}
                />
              </pattern>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={modalChartGridStroke} />
            <XAxis dataKey="semana" tick={{ fontSize: 11, fill: modalChartTickFill }} />
            <YAxis yAxisId="peso" tick={{ fontSize: 11, fill: modalChartTickFill }} unit=" kg" />
            <YAxis
              yAxisId="dose"
              orientation="right"
              tick={{ fontSize: 11, fill: modalDosePink }}
              unit=" mg"
              domain={[0, maxDoseAxis]}
              ticks={doseTicks}
            />
            <Tooltip
              contentStyle={modalTooltipStyle}
              labelStyle={modalTooltipLabelStyle}
              formatter={(val: number, key: string) => {
                if (key === 'peso') return [`${val != null ? val.toFixed(1) : '—'} kg`, 'Peso'];
                if (key === 'dose') return [`${val.toFixed(1)} mg`, 'Dose aplicada'];
                return [val, key];
              }}
              labelFormatter={(l) => `Semana ${l}`}
            />
            <Bar
              yAxisId="dose"
              dataKey="dose"
              name="Dose aplicada"
              fill={`url(#${patternId})`}
              stroke={modalDosePink}
              strokeWidth={1}
              barSize={Math.min(28, Math.max(10, 320 / chartData.length))}
              radius={[4, 4, 0, 0]}
            />
            <Line
              yAxisId="peso"
              type="monotone"
              dataKey="peso"
              stroke={chartColors.vitalGreen}
              strokeWidth={2.5}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      {totalDose > 0 && (
        <div className="flex justify-center pt-3 pb-1">
          <div className="px-3 py-1.5 rounded-full bg-pink-500 text-xs font-semibold shadow text-white">
            {totalDose.toFixed(1)} mg (total)
          </div>
        </div>
      )}
    </div>
  );
}
