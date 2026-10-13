'use client';

import { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Loader2, Users } from 'lucide-react';
import type { Medico } from '@/types/medico';
import type { OrganizationDefinition } from '@/lib/organization/organizationTypes';
import type { PacienteCompleto } from '@/types/obesidade';
import { buildOrganizationPacientesMetrics } from '@/lib/metaadmingeral/buildOrganizationPacientesMetrics';

const STATUS_COLORS = {
  pendente: '#FBBF24',
  em_tratamento: '#4CCB7A',
  concluido: '#38BDF8',
  abandono: '#F87171',
} as const;

type OrganizationPacientesPanelProps = {
  organization: OrganizationDefinition;
  medicos: Medico[];
  pacientes: Pick<
    PacienteCompleto,
    'medicoResponsavelId' | 'medicoResponsavelAnteriorId' | 'statusTratamento' | 'dataCadastro'
  >[];
  loading: boolean;
};

export default function OrganizationPacientesPanel({
  organization,
  medicos,
  pacientes,
  loading,
}: OrganizationPacientesPanelProps) {
  /** `null` = todos; `[]` = nenhum; `[ids]` = filtrados. */
  const [selectedMedicoIds, setSelectedMedicoIds] = useState<string[] | null>(null);

  const metrics = useMemo(
    () =>
      buildOrganizationPacientesMetrics({
        medicos,
        pacientes,
        selectedMedicoIds,
        monthsBack: 12,
      }),
    [medicos, pacientes, selectedMedicoIds],
  );

  const allSelected = selectedMedicoIds == null;
  const filterLabel = allSelected
    ? 'Todos os médicos'
    : selectedMedicoIds.length === 0
      ? 'Nenhum médico selecionado'
      : selectedMedicoIds.length === 1
        ? '1 médico selecionado'
        : `${selectedMedicoIds.length} médicos selecionados`;

  const toggleMedico = (medicoId: string) => {
    setSelectedMedicoIds((prev) => {
      if (prev == null) {
        // Estava em "todos": desmarcar este = todos menos ele
        return medicos.map((m) => m.id).filter((id) => id !== medicoId);
      }
      if (prev.includes(medicoId)) {
        return prev.filter((id) => id !== medicoId);
      }
      const next = [...prev, medicoId];
      if (next.length === medicos.length) return null;
      return next;
    });
  };

  const selectAll = () => setSelectedMedicoIds(null);
  const clearSelection = () => setSelectedMedicoIds([]);

  const isMedicoChecked = (medicoId: string) =>
    selectedMedicoIds == null || selectedMedicoIds.includes(medicoId);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[#E8EDED]">Pacientes</h2>
        <p className="mt-1 text-sm text-[#E8EDED]/60">
          Monitoramento por médico em{' '}
          <span className="font-medium text-[#E8EDED]">{organization.name}</span>
          {' · '}
          {filterLabel}
          {' · '}
          {metrics.totalMedicos} médico{metrics.totalMedicos === 1 ? '' : 's'} na organização
        </p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-sm font-medium text-[#E8EDED]">Filtrar por médico</p>
            <p className="text-xs text-[#E8EDED]/50">
              Selecione um, vários ou todos para ver o gráfico e a tabela.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={selectAll}
              className="rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-[#E8EDED]/85 transition-colors hover:border-[#4CCB7A]/40 hover:bg-[#4CCB7A]/10"
            >
              Todos
            </button>
            <button
              type="button"
              onClick={clearSelection}
              className="rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-[#E8EDED]/85 transition-colors hover:border-red-400/40 hover:bg-red-400/10"
            >
              Nenhum
            </button>
          </div>
        </div>

        {medicos.length === 0 ? (
          <p className="text-sm text-[#E8EDED]/50">Nenhum médico nesta organização.</p>
        ) : (
          <div className="grid max-h-48 grid-cols-1 gap-2 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3">
            {medicos.map((medico) => {
              const checked = isMedicoChecked(medico.id);
              return (
                <label
                  key={medico.id}
                  className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm transition-colors ${
                    checked
                      ? 'border-[#4CCB7A]/40 bg-[#4CCB7A]/10 text-[#E8EDED]'
                      : 'border-white/10 bg-white/5 text-[#E8EDED]/60'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleMedico(medico.id)}
                    className="h-4 w-4 rounded border-white/30 bg-transparent text-[#4CCB7A] focus:ring-[#4CCB7A]"
                  />
                  <span className="truncate">{medico.nome}</span>
                </label>
              );
            })}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-[#E8EDED]/50">Total</p>
          <p className="mt-2 text-2xl font-bold text-[#E8EDED]">
            {loading ? '—' : metrics.totals.total}
          </p>
        </div>
        <div className="rounded-2xl border border-amber-400/30 bg-white/5 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-amber-200/70">Pendente</p>
          <p className="mt-2 text-2xl font-bold text-[#E8EDED]">
            {loading ? '—' : metrics.totals.pendente}
          </p>
        </div>
        <div className="rounded-2xl border border-[#4CCB7A]/30 bg-white/5 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-[#4CCB7A]/80">Tratamento</p>
          <p className="mt-2 text-2xl font-bold text-[#E8EDED]">
            {loading ? '—' : metrics.totals.em_tratamento}
          </p>
        </div>
        <div className="rounded-2xl border border-sky-400/30 bg-white/5 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-sky-300/80">Concluído</p>
          <p className="mt-2 text-2xl font-bold text-[#E8EDED]">
            {loading ? '—' : metrics.totals.concluido}
          </p>
        </div>
        <div className="rounded-2xl border border-red-400/30 bg-white/5 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-red-300/80">Abandono</p>
          <p className="mt-2 text-2xl font-bold text-[#E8EDED]">
            {loading ? '—' : metrics.totals.abandono}
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 transition-colors hover:border-[#4CCB7A]/30">
        <div className="mb-1 flex items-center gap-2">
          <Users className="h-5 w-5 text-[#4CCB7A]" />
          <h3 className="text-lg font-semibold text-[#E8EDED]">Pacientes por mês</h3>
        </div>
        <p className="mb-4 text-xs text-[#E8EDED]/50">
          Cadastros nos últimos 12 meses, agrupados pelo status atual (Pendente, Tratamento,
          Concluído, Abandono).
        </p>

        {loading ? (
          <div className="py-16 text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-[#4CCB7A]" />
            <p className="mt-4 text-sm text-[#E8EDED]/70">Carregando pacientes...</p>
          </div>
        ) : (
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics.months} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(232,237,237,0.12)" />
                <XAxis
                  dataKey="label"
                  tick={{ fill: 'rgba(232,237,237,0.65)', fontSize: 12 }}
                  axisLine={{ stroke: 'rgba(232,237,237,0.2)' }}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fill: 'rgba(232,237,237,0.65)', fontSize: 12 }}
                  axisLine={{ stroke: 'rgba(232,237,237,0.2)' }}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    background: '#0f1c1f',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: 12,
                    color: '#E8EDED',
                  }}
                  labelStyle={{ color: '#E8EDED' }}
                />
                <Legend
                  wrapperStyle={{ color: '#E8EDED', fontSize: 12, paddingTop: 8 }}
                />
                <Bar
                  dataKey="pendente"
                  name="Pendente"
                  stackId="status"
                  fill={STATUS_COLORS.pendente}
                  radius={[0, 0, 0, 0]}
                />
                <Bar
                  dataKey="em_tratamento"
                  name="Tratamento"
                  stackId="status"
                  fill={STATUS_COLORS.em_tratamento}
                />
                <Bar
                  dataKey="concluido"
                  name="Concluído"
                  stackId="status"
                  fill={STATUS_COLORS.concluido}
                />
                <Bar
                  dataKey="abandono"
                  name="Abandono"
                  stackId="status"
                  fill={STATUS_COLORS.abandono}
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 transition-colors hover:border-[#4CCB7A]/30">
        <div className="mb-4 flex items-center gap-2">
          <Users className="h-5 w-5 text-[#4CCB7A]" />
          <h3 className="text-lg font-semibold text-[#E8EDED]">Pacientes por médico</h3>
        </div>

        {loading ? (
          <div className="py-12 text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-[#4CCB7A]" />
            <p className="mt-4 text-sm text-[#E8EDED]/70">Carregando pacientes...</p>
          </div>
        ) : metrics.rows.length === 0 ? (
          <div className="py-12 text-center text-[#E8EDED]/50">
            <p className="text-sm">Nenhum médico selecionado ou cadastrado nesta organização.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-white/10">
              <thead className="bg-white/10">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#E8EDED]/70">
                    Médico
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-[#E8EDED]/70">
                    Total
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-[#E8EDED]/70">
                    Pendente
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-[#E8EDED]/70">
                    Tratamento
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-[#E8EDED]/70">
                    Concluído
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-[#E8EDED]/70">
                    Abandono
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {metrics.rows.map((row) => (
                  <tr key={row.medicoId} className="hover:bg-white/10">
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="text-sm font-medium text-[#E8EDED]">{row.medicoNome}</div>
                      <div className="text-sm text-[#E8EDED]/45">{row.medicoEmail}</div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-center text-sm font-medium text-[#E8EDED]">
                      {row.total}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-center text-sm text-amber-300">
                      {row.pendente}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-center text-sm text-[#4CCB7A]">
                      {row.em_tratamento}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-center text-sm text-sky-300">
                      {row.concluido}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-center text-sm text-red-300/90">
                      {row.abandono}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
