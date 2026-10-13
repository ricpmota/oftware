'use client';

import { Search } from 'lucide-react';
import type {
  HistoryPatientMetrics,
  HistoryTableFilter,
} from '@/lib/metapersonal/historicoAnalytics';
import {
  filterHistoryPatients,
  formatDayMonth,
  formatLastWorkoutLabel,
} from '@/lib/metapersonal/historicoAnalytics';
import { HistoricoStatusPill } from './HistoricoStatusPill';

const FILTERS: Array<{ id: HistoryTableFilter; label: string }> = [
  { id: 'todos', label: 'Todos' },
  { id: 'excelente', label: 'Excelente' },
  { id: 'boa', label: 'Boa adesão' },
  { id: 'atencao', label: 'Atenção' },
  { id: 'critica', label: 'Críticos' },
  { id: 'sem-treino-recente', label: 'Sem treino recente' },
];

function EvolutionMark({ trend }: { trend: HistoryPatientMetrics['evolution'] }) {
  if (trend === 'up') return <span className="font-semibold text-emerald-600">↗</span>;
  if (trend === 'down') return <span className="font-semibold text-rose-600">↓</span>;
  if (trend === 'stable') return <span className="font-semibold text-gray-500">→</span>;
  return <span className="text-gray-400">—</span>;
}

export function HistoricoPatientsTable({
  patients,
  filter,
  search,
  selectedPatientKey,
  today,
  onFilterChange,
  onSearchChange,
  onSelect,
}: {
  patients: HistoryPatientMetrics[];
  filter: HistoryTableFilter;
  search: string;
  selectedPatientKey: string | null;
  today: string;
  onFilterChange: (filter: HistoryTableFilter) => void;
  onSearchChange: (value: string) => void;
  onSelect: (patientKey: string) => void;
}) {
  const visible = filterHistoryPatients(patients, filter, search);

  return (
    <section className="rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">Seus pacientes</h2>
          <p className="text-[11px] text-gray-500">{visible.length} na lista</p>
        </div>
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Buscar paciente..."
            className="w-full rounded-xl border border-gray-200 bg-white py-2 pl-8 pr-3 text-[13px] text-gray-800 outline-none focus:border-gray-300 focus:ring-2 focus:ring-gray-100"
          />
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5 px-4 py-2">
        {FILTERS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onFilterChange(item.id)}
            className={`rounded-full px-3 py-1 text-[12px] font-semibold ${
              filter === item.id
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-[13px]">
          <thead>
            <tr className="border-y border-gray-100 text-[11px] uppercase tracking-wide text-gray-500">
              <th className="px-4 py-2 font-semibold">Paciente</th>
              <th className="px-3 py-2 font-semibold">Adesão</th>
              <th className="px-3 py-2 font-semibold">Últimos 7 dias</th>
              <th className="px-3 py-2 font-semibold">Sequência</th>
              <th className="px-3 py-2 font-semibold">Evolução</th>
              <th className="px-3 py-2 font-semibold">Último treino</th>
              <th className="px-3 py-2 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                  Nenhum paciente neste filtro.
                </td>
              </tr>
            ) : (
              visible.map((patient) => {
                const selected = selectedPatientKey === patient.patientKey;
                return (
                  <tr
                    key={patient.patientKey}
                    onClick={() => onSelect(patient.patientKey)}
                    className={`cursor-pointer border-b border-gray-50 hover:bg-gray-50 ${
                      selected ? 'bg-emerald-50/60' : ''
                    }`}
                  >
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-2">
                        {patient.photoUrl ? (
                          <img
                            src={patient.photoUrl}
                            alt=""
                            className="h-7 w-7 rounded-full object-cover"
                          />
                        ) : (
                          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 text-[11px] font-semibold text-gray-600">
                            {patient.name.slice(0, 1).toUpperCase()}
                          </span>
                        )}
                        <span className="font-medium text-gray-900">{patient.name}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2 font-semibold text-gray-800">
                      {patient.adherence.percent == null
                        ? '—'
                        : `${Math.round(patient.adherence.percent)}%`}
                    </td>
                    <td className="px-3 py-2 text-gray-700">
                      {patient.last7Days.expected > 0
                        ? `${patient.last7Days.done}/${patient.last7Days.expected}`
                        : '—'}
                    </td>
                    <td className="px-3 py-2">
                      {patient.streak && patient.streak > 0 ? `🔥 ${patient.streak}` : '—'}
                    </td>
                    <td className="px-3 py-2">
                      <EvolutionMark trend={patient.evolution} />
                    </td>
                    <td className="px-3 py-2 text-gray-700">
                      <div>{formatLastWorkoutLabel(patient.lastWorkoutDate, today)}</div>
                      {patient.lastWorkoutDate ? (
                        <div className="text-[11px] text-gray-400">
                          {formatDayMonth(patient.lastWorkoutDate)}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-3 py-2">
                      <HistoricoStatusPill status={patient.status} compact />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
