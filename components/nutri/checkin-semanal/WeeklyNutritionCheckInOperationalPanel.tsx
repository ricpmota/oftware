'use client';

import type { WeeklyNutritionCheckInOperationalSummary } from '@/lib/nutri/checkInSemanalNutriOperational';
import type { WeeklyNutritionCheckInFilterId, WeeklyNutritionCheckInWhatsAppFilterId } from '@/lib/nutri/checkInSemanalNutriOperational';
import { formatNutritionWeekShortLabel, type NutritionWeek } from '@/lib/nutri/checkInSemanalNutriWeek';

const STATUS_FILTERS: Array<{ id: WeeklyNutritionCheckInFilterId; label: string }> = [
  { id: 'all', label: 'Todos' },
  { id: 'completed', label: 'Respondidos' },
  { id: 'waiting', label: 'Aguardando' },
  { id: 'overdue', label: 'Atrasados' },
  { id: 'attention', label: 'Com atenção' },
];

type Props = {
  week: NutritionWeek;
  summary: WeeklyNutritionCheckInOperationalSummary;
  isMobile: boolean;
  statusFilter: WeeklyNutritionCheckInFilterId;
  whatsappFilter: WeeklyNutritionCheckInWhatsAppFilterId;
  onStatusFilter: (id: WeeklyNutritionCheckInFilterId) => void;
  onWhatsappFilter: (id: WeeklyNutritionCheckInWhatsAppFilterId) => void;
};

function Kpi({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: 'slate' | 'green' | 'amber' | 'red';
}) {
  const tones = {
    slate: 'bg-slate-50 text-slate-800',
    green: 'bg-emerald-50 text-emerald-800',
    amber: 'bg-amber-50 text-amber-800',
    red: 'bg-rose-50 text-rose-800',
  };
  return (
    <div className={`rounded-xl px-3 py-2 ${tones[tone]}`}>
      <p className="text-[10px] font-semibold uppercase tracking-wide opacity-80">{label}</p>
      <p className="text-lg font-bold tabular-nums">{value}</p>
    </div>
  );
}

export function WeeklyNutritionCheckInOperationalPanel({
  week,
  summary,
  isMobile,
  statusFilter,
  whatsappFilter,
  onStatusFilter,
  onWhatsappFilter,
}: Props) {
  if (summary.total === 0) {
    return (
      <section className="rounded-2xl border border-teal-100 bg-white p-4 shadow-sm">
        <p className="text-[10px] font-bold uppercase tracking-wider text-teal-800">Check-ins da semana</p>
        <p className="mt-1 text-sm font-semibold text-slate-900">Semana {formatNutritionWeekShortLabel(week)}</p>
        <p className="mt-2 text-sm text-slate-600">Nenhum Check-in Semanal programado para este período.</p>
      </section>
    );
  }

  const allDueAnswered = summary.dueCount > 0 && summary.completed === summary.dueCount && summary.overdue === 0 && summary.waiting === 0;

  return (
    <section className="rounded-2xl border border-teal-100 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-teal-800">Check-ins da semana</p>
          <p className="mt-0.5 text-sm font-semibold text-slate-900">
            Semana {formatNutritionWeekShortLabel(week)} · {summary.total} programados
          </p>
        </div>
        {summary.responseRate != null ? (
          <p className="text-sm text-slate-600">
            Taxa de resposta <span className="font-semibold tabular-nums text-slate-900">{summary.responseRate}%</span>
          </p>
        ) : null}
      </div>

      <div className={`mt-3 grid gap-2 ${isMobile ? 'grid-cols-2' : 'grid-cols-4'}`}>
        <Kpi label="Respondidos" value={summary.completed} tone="green" />
        <Kpi label="Aguardando" value={summary.waiting} tone="amber" />
        <Kpi label="Atrasados" value={summary.overdue} tone="red" />
        <Kpi label="Atenção" value={summary.attention} tone="slate" />
      </div>

      {allDueAnswered ? (
        <p className="mt-3 text-sm text-emerald-800">
          Todos os Check-ins programados até agora foram respondidos.
        </p>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-1.5">
        {STATUS_FILTERS.map((filter) => {
          const active = statusFilter === filter.id;
          return (
            <button
              key={filter.id}
              type="button"
              onClick={() => onStatusFilter(filter.id)}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                active
                  ? 'bg-teal-700 text-white'
                  : 'bg-teal-50 text-teal-900 hover:bg-teal-100'
              }`}
            >
              {filter.label}
            </button>
          );
        })}
        <label className="ml-auto inline-flex items-center gap-1.5 text-xs text-slate-600">
          WhatsApp
          <select
            value={whatsappFilter}
            onChange={(e) => onWhatsappFilter(e.target.value as WeeklyNutritionCheckInWhatsAppFilterId)}
            className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-800"
          >
            <option value="all">Todos</option>
            <option value="sent">Enviado</option>
            <option value="unsent">Não enviado</option>
            <option value="failed">Falhou</option>
          </select>
        </label>
      </div>
    </section>
  );
}
