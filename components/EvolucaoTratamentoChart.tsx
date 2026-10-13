'use client';

import { Bar, CartesianGrid, Cell, ComposedChart, LabelList, Line, ReferenceDot, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { deltaLabelsNaSemanaAnterior } from '@/utils/evolucaoTratamentoDeltaLabel';

export type EvolucaoTratamentoPonto = {
  weekIndex: number;
  peso: number | null;
  doseMg: number;
  foiAplicado?: boolean;
  circunferenciaCm?: number | null;
  /** Último ponto do eixo: medição da conclusão, sem barra de dose e sem rótulo próprio. */
  isConclusao?: boolean;
};

type MetricaEvolucao = 'peso' | 'circunferencia';

type Props = {
  evolucao: EvolucaoTratamentoPonto[];
  pacienteId: string;
  /** Barras de dose iguais; a linha segue peso (kg) ou circunferência (cm). */
  metrica?: MetricaEvolucao;
  /**
   * Rótulo acima da barra de dose. Quando omitido, segue `metrica`.
   * Com `peso`, a linha pode continuar no peso e o rótulo troca para cm.
   */
  rotuloVariacao?: MetricaEvolucao;
  /**
   * `true` = mesmo contraste do modal no metaadmin quando themeHome é dark
   * (fundo branco no modal, eixos pretos, tooltip claro).
   */
  invertedModal?: boolean;
  hideTitle?: boolean;
  /** Menos margem interna para o gráfico ocupar mais o card. */
  compact?: boolean;
};

/**
 * Gráfico combinado: linha verde (peso) + barras rosa (dose mg), igual ao modal
 * "Resultado do tratamento" / depoimento no metaadmin.
 */
export function EvolucaoTratamentoChart({
  evolucao,
  pacienteId,
  metrica = 'peso',
  rotuloVariacao,
  invertedModal = false,
  hideTitle = false,
  compact = false,
}: Props) {
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
  const unidade = metrica === 'circunferencia' ? 'cm' : 'kg';
  const nomeMedida = metrica === 'circunferencia' ? 'Comp. abdominal' : 'Peso';
  const fonteRotulo = rotuloVariacao ?? metrica;
  const pontos = evolucao.map((p) => {
    const medida = metrica === 'circunferencia' ? p.circunferenciaCm ?? null : p.peso ?? null;
    const medidaRotulo = fonteRotulo === 'circunferencia' ? p.circunferenciaCm ?? null : p.peso ?? null;
    return {
      weekIndex: p.weekIndex,
      medida,
      medidaRotulo,
      dose: p.doseMg ?? 0,
      foiAplicado: p.isConclusao ? false : p.foiAplicado !== false,
      isConclusao: p.isConclusao === true,
    };
  });
  const deltaLabels = deltaLabelsNaSemanaAnterior(pontos.map((p) => ({ peso: p.medidaRotulo })));
  const chartData = pontos.map((p, index) => ({
    semana: p.isConclusao ? 'Conc' : `S${p.weekIndex}`,
    semanaTick: p.isConclusao ? 'Conc' : `S${p.weekIndex}`,
    medidaLine: p.medida,
    dose: p.isConclusao ? 0 : p.dose,
    foiAplicado: p.foiAplicado,
    isConclusao: p.isConclusao,
    deltaLabel: deltaLabels[index] ?? '',
  }));
  const totalDose = evolucao.reduce((s, p) => s + (p.doseMg || 0), 0);
  const ultimoPontoComMedida = [...chartData].reverse().find((p) => p.medidaLine != null);
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
      {hideTitle ? null : (
      <h4 className={`text-sm font-semibold ${isHomeDark ? 'text-black' : 'text-gray-700 dark:text-gray-300'}`}>
        Evolução do tratamento
      </h4>
      )}
      <div className="relative h-56 w-full min-h-[14rem]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={chartData}
            margin={compact ? { top: 16, right: 0, left: 0, bottom: 0 } : { top: 18, right: 8, left: 8, bottom: 8 }}
          >
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
            <XAxis dataKey="semanaTick" tick={{ fontSize: 11, fill: modalChartTickFill }} />
            <YAxis
              yAxisId="peso"
              width={compact ? 42 : 60}
              tick={{ fontSize: compact ? 10 : 11, fill: modalChartTickFill }}
              unit={` ${unidade}`}
            />
            <YAxis
              yAxisId="dose"
              orientation="right"
              width={compact ? 36 : 60}
              tick={{ fontSize: compact ? 10 : 11, fill: modalDosePink }}
              unit=" mg"
              domain={[0, maxDoseAxis]}
              ticks={doseTicks}
            />
            <Tooltip
              contentStyle={modalTooltipStyle}
              labelStyle={modalTooltipLabelStyle}
              formatter={(val: number, key: string) => {
                if (key === 'medidaLine') return [`${val != null ? val.toFixed(1) : '—'} ${unidade}`, nomeMedida];
                if (key === 'dose') return [`${val.toFixed(1)} mg`, 'Dose do plano'];
                return [val, key];
              }}
              labelFormatter={(l) => (l === 'Conc' ? 'Conclusão' : `Semana ${l}`)}
            />
            <Bar
              yAxisId="dose"
              dataKey="dose"
              name="Dose do plano"
              isAnimationActive={false}
              strokeWidth={1}
              barSize={Math.min(28, Math.max(10, 320 / chartData.length))}
              radius={[4, 4, 0, 0]}
            >
              {chartData.map((entry, idx) => (
                <Cell
                  key={`dose-${entry.semana}-${idx}`}
                  fill={
                    entry.isConclusao
                      ? 'transparent'
                      : entry.foiAplicado
                        ? `url(#${patternId})`
                        : '#d1d5db'
                  }
                  stroke={
                    entry.isConclusao ? 'transparent' : entry.foiAplicado ? modalDosePink : '#9ca3af'
                  }
                />
              ))}
              <LabelList
                dataKey="deltaLabel"
                position="top"
                content={(props) => {
                  const { x, y, width, value } = props as {
                    x?: number;
                    y?: number;
                    width?: number;
                    value?: string | number;
                  };
                  const label = value == null ? '' : String(value);
                  if (!label || x == null || y == null || width == null) return null;
                  const fill = label.startsWith('+') ? '#e11d48' : label === '0' ? '#64748b' : '#059669';
                  return (
                    <text
                      x={x + width / 2}
                      y={y - 3}
                      textAnchor="middle"
                      fontSize={chartData.length > 12 ? 8 : 10}
                      fontWeight={700}
                      fill={fill}
                    >
                      {label}
                    </text>
                  );
                }}
              />
            </Bar>
            <Line
              yAxisId="peso"
              type="monotone"
              dataKey="medidaLine"
              name={nomeMedida}
              isAnimationActive={false}
              stroke={chartColors.vitalGreen}
              strokeWidth={2.5}
              connectNulls
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
            {ultimoPontoComMedida && (
              <ReferenceDot
                yAxisId="peso"
                x={ultimoPontoComMedida.semanaTick}
                y={ultimoPontoComMedida.medidaLine as number}
                r={4}
                fill={chartColors.vitalGreen}
                stroke="#ffffff"
                strokeWidth={1.5}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      {totalDose > 0 && (
        <div className="flex justify-center pt-1 pb-1">
          <div className="px-3 py-1.5 rounded-full bg-pink-500 text-xs font-semibold shadow text-white">
            {totalDose.toFixed(1)} mg (total)
          </div>
        </div>
      )}
    </div>
  );
}
