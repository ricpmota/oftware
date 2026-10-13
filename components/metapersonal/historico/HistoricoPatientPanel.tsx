'use client';

import { X } from 'lucide-react';
import type { HistoryPatientMetrics, HistorySessionKind } from '@/lib/metapersonal/historicoAnalytics';
import {
  formatDayMonth,
  formatLastWorkoutLabel,
  historyKindLabel,
} from '@/lib/metapersonal/historicoAnalytics';
import { HistoricoStatusPill } from './HistoricoStatusPill';

type PanelTab = 'visao' | 'historico' | 'evolucao' | 'exercicios';

const WEEK_KIND: Record<HistorySessionKind | 'empty', string> = {
  done: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  missed: 'border-rose-200 bg-rose-50 text-rose-700',
  scheduled: 'border-blue-200 bg-blue-50 text-blue-700',
  inactive: 'border-gray-200 bg-gray-50 text-gray-400',
  empty: 'border-gray-100 bg-white text-gray-300',
};

function WeekMark({ kind }: { kind: HistorySessionKind | 'empty' }) {
  if (kind === 'done') return <span className="text-sm font-bold">✓</span>;
  if (kind === 'missed') return <span className="text-sm font-bold">✕</span>;
  if (kind === 'scheduled') return <span className="text-sm font-bold">○</span>;
  if (kind === 'inactive') return <span className="text-[10px]">off</span>;
  return <span className="text-sm">—</span>;
}

export function HistoricoPatientPanel({
  patient,
  today,
  tab,
  onTabChange,
  onClose,
}: {
  patient: HistoryPatientMetrics;
  today: string;
  tab: PanelTab;
  onTabChange: (tab: PanelTab) => void;
  onClose: () => void;
}) {
  return (
    <aside className="flex h-full min-h-[520px] flex-col rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-start justify-between gap-3 border-b border-gray-100 px-4 py-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="truncate text-base font-bold text-gray-900">{patient.name}</h2>
            <HistoricoStatusPill status={patient.status} />
          </div>
          <p className="mt-1 text-[12px] text-gray-500">
            Personal: <span className="font-medium text-gray-700">{patient.personalName || '—'}</span>
          </p>
          <p className="text-[12px] text-gray-500">
            Adesão:{' '}
            <span className="font-semibold text-gray-800">
              {patient.adherence.percent == null ? '—' : `${Math.round(patient.adherence.percent)}%`}
            </span>
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
          aria-label="Fechar painel"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex gap-1 border-b border-gray-100 px-3 py-2">
        {(
          [
            ['visao', 'Visão geral'],
            ['historico', 'Histórico'],
            ['evolucao', 'Evolução'],
            ['exercicios', 'Exercícios'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => onTabChange(id)}
            className={`rounded-lg px-2.5 py-1 text-[12px] font-semibold ${
              tab === id ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-100'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {tab === 'visao' ? <VisaoGeral patient={patient} today={today} /> : null}
        {tab === 'historico' ? <HistoricoBasico patient={patient} /> : null}
        {tab === 'evolucao' ? (
          <Placeholder title="Evolução" text="Séries, volume e carga entram na próxima etapa, após o uso de exerciseExecutions." />
        ) : null}
        {tab === 'exercicios' ? (
          <Placeholder title="Exercícios" text="A evolução por exercício depende de carga/reps em exerciseExecutions e fica para a próxima etapa." />
        ) : null}
      </div>
    </aside>
  );
}

function VisaoGeral({
  patient,
  today,
}: {
  patient: HistoryPatientMetrics;
  today: string;
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        <MiniKpi
          label="Adesão"
          value={patient.adherence.percent == null ? '—' : `${Math.round(patient.adherence.percent)}%`}
        />
        <MiniKpi
          label="Treinos"
          value={
            patient.adherence.expected > 0
              ? `${patient.adherence.done}/${patient.adherence.expected}`
              : '—'
          }
        />
        <MiniKpi label="Sequência" value={patient.streak && patient.streak > 0 ? `🔥 ${patient.streak}` : '—'} />
        <MiniKpi
          label="Último treino"
          value={formatLastWorkoutLabel(patient.lastWorkoutDate, today)}
          hint={
            patient.lastWorkoutDate
              ? `${formatDayMonth(patient.lastWorkoutDate)}${
                  patient.lastWorkoutTime ? ` · ${patient.lastWorkoutTime}` : ''
                }`
              : undefined
          }
        />
      </div>

      <div>
        <h3 className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-gray-500">
          Esta semana
        </h3>
        <div className="grid grid-cols-7 gap-1">
          {patient.week.map((day) => (
            <div
              key={day.date}
              className={`rounded-xl border px-1 py-2 text-center ${WEEK_KIND[day.kind]}`}
            >
              <p className="text-[10px] font-semibold">{day.label}</p>
              <div className="mt-1 flex justify-center">
                <WeekMark kind={day.kind} />
              </div>
              <p className="mt-1 truncate text-[9px] leading-tight">
                {day.kind === 'empty' ? '' : day.title || historyKindLabel(day.kind)}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2.5">
        <h3 className="mb-1.5 text-[12px] font-semibold uppercase tracking-wide text-gray-500">
          Insights
        </h3>
        {patient.insights.length === 0 ? (
          <p className="text-[12px] text-gray-500">Sem sinais determinísticos neste período.</p>
        ) : (
          <ul className="space-y-1">
            {patient.insights.map((insight) => (
              <li key={insight} className="text-[12px] text-gray-700">
                {insight}
              </li>
            ))}
          </ul>
        )}
      </div>

      {patient.notes.length > 0 ? (
        <div>
          <h3 className="mb-1.5 text-[12px] font-semibold uppercase tracking-wide text-gray-500">
            Observações recentes
          </h3>
          <ul className="space-y-2">
            {patient.notes.map((note, index) => (
              <li key={`${note.kind}-${note.date}-${index}`} className="rounded-xl border border-gray-100 px-3 py-2">
                <p className="text-[11px] font-semibold text-gray-500">
                  {note.kind === 'patient' ? 'Feedback do paciente' : 'Observação do personal'}
                  <span className="ml-1 font-normal text-gray-400">· {formatDayMonth(note.date)}</span>
                </p>
                <p className="mt-0.5 text-[12px] text-gray-800">{note.text}</p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function HistoricoBasico({ patient }: { patient: HistoryPatientMetrics }) {
  if (patient.timeline.length === 0) {
    return (
      <p className="text-[13px] text-gray-500">
        Ainda não há sessões no período para montar o histórico.
      </p>
    );
  }
  return (
    <ul className="space-y-2">
      {patient.timeline.map((item) => (
        <li
          key={item.sessionId || `${item.scheduledDate}-${item.title}`}
          className="flex items-start justify-between gap-3 rounded-xl border border-gray-100 px-3 py-2"
        >
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
              {formatDayMonth(item.scheduledDate)}
            </p>
            <p className="truncate text-[13px] font-medium text-gray-900">{item.title || 'Treino'}</p>
          </div>
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
              item.kind === 'done'
                ? 'bg-emerald-50 text-emerald-700'
                : item.kind === 'missed'
                  ? 'bg-rose-50 text-rose-700'
                  : 'bg-blue-50 text-blue-700'
            }`}
          >
            {item.kind === 'done' ? '✓ Realizado' : historyKindLabel(item.kind)}
          </span>
        </li>
      ))}
    </ul>
  );
}

function MiniKpi({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">{label}</p>
      <p className="text-lg font-extrabold leading-tight text-gray-900">{value}</p>
      {hint ? <p className="text-[11px] text-gray-500">{hint}</p> : null}
    </div>
  );
}

function Placeholder({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-xl border border-dashed border-gray-200 px-4 py-8 text-center">
      <p className="text-sm font-semibold text-gray-800">{title}</p>
      <p className="mt-1 text-[12px] text-gray-500">{text}</p>
    </div>
  );
}
