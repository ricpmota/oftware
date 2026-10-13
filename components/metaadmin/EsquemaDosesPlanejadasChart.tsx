'use client';

import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { PacienteCompleto } from '@/types/obesidade';
import { formatarDoseMgNumero } from '@/lib/tirzepatida/doseTitulacao';
import { semanaInicioCicloDoPlano } from '@/utils/datasAplicacaoSemanaPlano';
import { buildSemanasEsquemaDoses } from '@/utils/esquemaDosesSemana';
import { semanaRelativaNoProtocolo } from '@/utils/tirzepatidaProtocoloDisplay';

const DOSE_PINK = '#ec4899';
const DOSE_PINK_SOFT = 'rgba(236,72,153,0.14)';

type PontoDose = {
  semanaTick: string;
  doseBar: number;
};

/**
 * Histograma só das doses planejadas no esquema semanal.
 * Toda semana com mg > 0 usa o rosa das barras já aplicadas, para marcar o plano — sem linha de peso e sem variação.
 */
export function EsquemaDosesPlanejadasChart({ paciente }: { paciente: PacienteCompleto }) {
  const built = buildSemanasEsquemaDoses(paciente);
  if (!built) return null;

  const inicio = semanaInicioCicloDoPlano(paciente.planoTerapeutico);
  const rows: PontoDose[] = built.semanas
    .filter((s) => !s.isConclusao)
    .map((s) => ({
      semanaTick: `S${semanaRelativaNoProtocolo(s.semana, inicio)}`,
      doseBar: s.isCancelada ? 0 : Number(s.doseAtual) || 0,
    }));

  if (rows.length === 0) return null;

  const safeId = String(paciente.id || 'plano').replace(/[^a-zA-Z0-9_-]/g, '_');
  const patternId = `dosePlan_${safeId}_${inicio}`;
  const total = rows.reduce((acc, row) => acc + row.doseBar, 0);
  const labelSize = rows.length > 16 ? 0 : rows.length > 10 ? 9 : 11;

  return (
    <div className="min-w-0 rounded-2xl border border-gray-200/80 bg-[color:var(--surface-card)] px-4 py-4 md:p-5">
      <h5 className="mb-2 text-[15px] font-bold leading-tight text-[color:var(--text-primary)] md:text-[17px]">
        Doses planejadas
      </h5>
      <div className="h-[200px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} margin={{ top: 18, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <pattern
                id={patternId}
                patternUnits="userSpaceOnUse"
                width="8"
                height="8"
                patternTransform="rotate(45)"
              >
                <rect width="8" height="8" fill={DOSE_PINK_SOFT} />
                <line x1="0" y1="0" x2="0" y2="8" stroke={DOSE_PINK} strokeWidth="2" />
              </pattern>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis dataKey="semanaTick" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
            <YAxis
              domain={[0, (dataMax: number) => Math.max(2.5, Math.ceil((dataMax || 0) + 1))]}
              tick={{ fontSize: 11, fill: '#64748b' }}
              width={36}
              axisLine={false}
              tickLine={false}
              tickFormatter={(value: number) => (Number.isInteger(value) ? String(value) : value.toFixed(1))}
            />
            <Tooltip
              cursor={{ fill: 'rgba(236,72,153,0.08)' }}
              contentStyle={{
                borderRadius: 12,
                border: '1px solid #e2e8f0',
                fontSize: 13,
              }}
              formatter={(value) => [`${formatarDoseMgNumero(Number(value) || 0)} mg`, 'Dose']}
              labelFormatter={(label) => `Semana ${String(label).replace(/^S/, '')}`}
            />
            <Bar dataKey="doseBar" radius={[4, 4, 0, 0]} isAnimationActive={false} maxBarSize={36}>
              {rows.map((row) => (
                <Cell key={row.semanaTick} fill={row.doseBar > 0 ? `url(#${patternId})` : 'transparent'} />
              ))}
              {labelSize > 0 ? (
                <LabelList
                  dataKey="doseBar"
                  position="top"
                  formatter={(value) => {
                    const n = Number(value);
                    return n > 0 ? formatarDoseMgNumero(n) : '';
                  }}
                  style={{ fontSize: labelSize, fill: '#9d174d', fontWeight: 600 }}
                />
              ) : null}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      {total > 0 ? (
        <div className="flex justify-center pt-2">
          <div className="rounded-full bg-pink-500 px-3 py-1.5 text-xs font-semibold text-white shadow">
            {total.toFixed(1)} mg (planejado)
          </div>
        </div>
      ) : null}
    </div>
  );
}
