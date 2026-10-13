'use client';

import { useMemo, useState } from 'react';
import MetodoEmagrecerIcon from '@/components/metodo/MetodoEmagrecerIcon';
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
import type { PacienteCompleto } from '@/types/obesidade';
import {
  buildWeightEvolutionAnalysis,
  type WeightAgeFilter,
  type WeightDoseFilter,
  type WeightEvolutionPoint,
  type WeightSexFilter,
} from '@/lib/metaadmin/dashboard/weightEvolutionAnalysis';
import DashboardWeightFilters from '@/components/metaadmin/dashboard/DashboardWeightFilters';
import DashboardWeightDataQualityAlert from '@/components/metaadmin/dashboard/DashboardWeightDataQualityAlert';
import DashboardWeightOutlierModal from '@/components/metaadmin/dashboard/DashboardWeightOutlierModal';

type Props = {
  pacientes: PacienteCompleto[];
  ownPatientIds: string[];
  loading?: boolean;
  filtroDose: WeightDoseFilter;
  filtroFaixaEtaria: WeightAgeFilter;
  filtroSexo: WeightSexFilter;
  onDoseChange: (value: WeightDoseFilter) => void;
  onFaixaChange: (value: WeightAgeFilter) => void;
  onSexoChange: (value: WeightSexFilter) => void;
  onOpenPaciente?: (pacienteId: string) => void;
  headerClassName?: string;
  filtersWrapClassName?: string;
  filtersGridClassName?: string;
};

function formatKg(value: number): string {
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function WeightTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ payload: WeightEvolutionPoint }>;
  label?: number | string;
}) {
  if (!active || !payload?.[0]) return null;
  const point = payload[0].payload;
  return (
    <div className="rounded-xl border bg-white px-3 py-2.5 shadow-sm" style={{ borderColor: 'var(--border-default)' }}>
      <p className="text-[12px] font-semibold text-[var(--text-primary)]">Semana {label}</p>
      <p className="mt-1 text-[12px] text-[var(--text-secondary)]">
        Perda média{' '}
        <span className="font-bold text-[var(--text-primary)]">{formatKg(point.media)} kg</span>
      </p>
      <p className="text-[12px] text-[var(--text-secondary)]">
        Pacientes <span className="font-bold text-[var(--text-primary)]">{point.quantidade}</span>
      </p>
      {point.reviewCount > 0 ? (
        <p className="mt-1 text-[12px] text-amber-700">
          Este ponto contém {point.reviewCount} registro{point.reviewCount === 1 ? '' : 's'} para revisão.
        </p>
      ) : null}
    </div>
  );
}

export default function DashboardWeightEvolution({
  pacientes,
  ownPatientIds,
  loading = false,
  filtroDose,
  filtroFaixaEtaria,
  filtroSexo,
  onDoseChange,
  onFaixaChange,
  onSexoChange,
  onOpenPaciente,
  headerClassName,
  filtersWrapClassName,
  filtersGridClassName,
}: Props) {
  const [reviewOpen, setReviewOpen] = useState(false);
  const ownIds = useMemo(() => new Set(ownPatientIds), [ownPatientIds]);
  const analysis = useMemo(
    () =>
      buildWeightEvolutionAnalysis({
        pacientes,
        ownPatientIds: ownIds,
        filtroSexo,
        filtroFaixaEtaria,
        filtroDose,
      }),
    [pacientes, ownIds, filtroSexo, filtroFaixaEtaria, filtroDose]
  );

  const mediaLabel =
    analysis.mediaSemanalKg == null
      ? '—'
      : analysis.mediaSemanalKg.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div
      className="border bg-[var(--surface-card)]"
      style={{ borderColor: 'var(--border-default)', borderRadius: 20 }}
    >
      <div className="p-4 sm:p-6">
        <div
          className={
            headerClassName ??
            'flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between'
          }
        >
          <div className="min-w-0">
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">Evolução da perda de peso</h3>
            <p className="mt-1 text-[13px] text-[var(--text-secondary)]">
              Acompanhe a evolução média dos pacientes de acordo com os filtros selecionados.
            </p>
          </div>
          <div className={filtersWrapClassName ?? 'w-full lg:max-w-xl'}>
            <DashboardWeightFilters
              filtroDose={filtroDose}
              filtroFaixaEtaria={filtroFaixaEtaria}
              filtroSexo={filtroSexo}
              onDoseChange={onDoseChange}
              onFaixaChange={onFaixaChange}
              onSexoChange={onSexoChange}
              className={filtersGridClassName}
            />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600" />
            <span className="ml-3 text-sm text-[var(--text-secondary)]">Carregando base da organização...</span>
          </div>
        ) : (
          <>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex items-start gap-3 rounded-[16px] bg-emerald-50 px-4 py-3">
                <MetodoEmagrecerIcon icon="grafico" size={40} />
                <div>
                  <p className="text-[12px] font-medium text-[var(--text-secondary)]">Média semanal</p>
                  <p className="mt-0.5 text-[28px] font-extrabold leading-none text-[var(--text-primary)]">
                    {mediaLabel} <span className="text-[16px] font-semibold text-[var(--text-secondary)]">kg</span>
                  </p>
                  <p className="mt-1 text-[12px] text-[var(--text-secondary)]">Perda média por semana</p>
                </div>
              </div>
              {analysis.pacientesNaAnalise > 0 ? (
                <p className="text-[12px] text-[var(--text-secondary)]">
                  Baseado em {analysis.pacientesNaAnalise} paciente{analysis.pacientesNaAnalise === 1 ? '' : 's'}
                </p>
              ) : null}
            </div>

            <div className="mt-4">
              <DashboardWeightDataQualityAlert
                count={analysis.reviews.length}
                onReview={() => setReviewOpen(true)}
              />
            </div>

            <div className="mt-4">
              {analysis.points.length === 0 ? (
                <p className="py-16 text-center text-[13px] text-[var(--text-secondary)]">
                  Dados insuficientes para esta combinação de filtros.
                </p>
              ) : (
                <div className="h-[240px] w-full sm:h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={analysis.points} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                      <XAxis
                        dataKey="semana"
                        tick={{ fontSize: 11, fill: '#6b7280' }}
                        tickLine={false}
                        axisLine={false}
                        minTickGap={18}
                        tickFormatter={(value) => `${value}`}
                      />
                      <YAxis
                        dataKey="perda"
                        reversed
                        tick={{ fontSize: 11, fill: '#6b7280' }}
                        tickLine={false}
                        axisLine={false}
                        width={42}
                        tickFormatter={(value) => Number(value).toFixed(1)}
                        unit=""
                      />
                      <Tooltip content={<WeightTooltip />} />
                      <Area type="linear" dataKey="perda" stroke="none" fill="var(--chart-1)" fillOpacity={0.08} />
                      <Line
                        type="linear"
                        dataKey="perda"
                        stroke="var(--chart-1)"
                        strokeWidth={2.2}
                        dot={{ r: 3, fill: 'var(--chart-1)', stroke: '#fff', strokeWidth: 1 }}
                        activeDot={{ r: 5 }}
                        name="Perda de peso"
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <DashboardWeightOutlierModal
        open={reviewOpen}
        records={analysis.reviews}
        onClose={() => setReviewOpen(false)}
        onOpenPaciente={onOpenPaciente}
      />
    </div>
  );
}
