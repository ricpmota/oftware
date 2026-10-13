'use client';

import type { ReactNode } from 'react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import {
  TREINOS_WEEKDAY_LABELS,
  TREINOS_WEEKDAYS,
  type TreinosWeekday,
} from './treinosCentral.types';
import { TreinosPlannerCard } from './TreinosPlannerCard';
import { TreinosMonthBoard } from './TreinosMonthBoard';
import type { PlannerBoardCard } from '@/lib/metapersonal/treinosPlannerGroup';
import { TREINOS_WEEKDAY_TONES } from '@/lib/metapersonal/treinosPlannerTheme';
import type { MonthGridDay } from '@/lib/metapersonal/treinosMonth';
import type { PlannerViewMode } from '@/lib/metapersonal/treinosPlannerNav';

type Props = {
  cardsByWeekday: Record<TreinosWeekday, PlannerBoardCard[]>;
  weekLabel: string;
  loadingExisting?: boolean;
  plannerViewMode: PlannerViewMode;
  onPlannerViewModeChange: (mode: PlannerViewMode) => void;
  monthLabel?: string;
  monthDays?: MonthGridDay[];
  cardsByDate?: Record<string, PlannerBoardCard[]>;
  todayDate: string;
  weekDatesByWeekday: Record<TreinosWeekday, string>;
  onOpenWeek: (date: string) => void;
  onToday: () => void;
  onPrev: () => void;
  onNext: () => void;
  onAddClick: (weekday: TreinosWeekday) => void;
  onRemoveDraft: (weekday: TreinosWeekday, localId: string) => void;
  onVerPacientes: (card: PlannerBoardCard) => void;
  onAddObservacao: (card: PlannerBoardCard) => void;
  onEditWorkout: (card: PlannerBoardCard) => void;
  onToggleActive: (card: PlannerBoardCard) => void;
  onDeleteWorkout: (card: PlannerBoardCard) => void;
  canApply?: boolean;
  applyDisabledReason?: string;
  onApplyClick?: () => void;
  heading?: string;
  headerAction?: ReactNode;
  readOnly?: boolean;
};

export function TreinosWeeklyBoard({
  cardsByWeekday,
  weekLabel,
  loadingExisting = false,
  plannerViewMode,
  onPlannerViewModeChange,
  monthLabel,
  monthDays = [],
  cardsByDate = {},
  todayDate,
  weekDatesByWeekday,
  onOpenWeek,
  onToday,
  onPrev,
  onNext,
  onAddClick,
  onRemoveDraft,
  onVerPacientes,
  onAddObservacao,
  onEditWorkout,
  onToggleActive,
  onDeleteWorkout,
  canApply = false,
  applyDisabledReason,
  onApplyClick,
  heading = 'Planejamento',
  headerAction,
  readOnly = false,
}: Props) {
  const navLabel = plannerViewMode === 'month' ? monthLabel || weekLabel : weekLabel;

  return (
    <section className="flex min-h-[34rem] min-w-0 flex-col rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="relative flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-base font-semibold text-gray-900">{heading}</h2>
          <div className="inline-flex rounded-lg border border-gray-200 p-0.5">
            <button
              type="button"
              onClick={() => onPlannerViewModeChange('week')}
              className={`h-7 rounded-md px-2.5 text-[11px] font-semibold ${
                plannerViewMode === 'week' ? 'bg-emerald-500 text-white' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              Semanal
            </button>
            <button
              type="button"
              onClick={() => onPlannerViewModeChange('month')}
              className={`h-7 rounded-md px-2.5 text-[11px] font-semibold ${
                plannerViewMode === 'month' ? 'bg-emerald-500 text-white' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              Mensal
            </button>
          </div>
        </div>
        <div className="flex items-center gap-1 text-xs text-gray-500 2xl:absolute 2xl:left-1/2 2xl:-translate-x-1/2">
          <button
            type="button"
            onClick={onPrev}
            className="rounded p-0.5 hover:bg-gray-100"
            aria-label={plannerViewMode === 'month' ? 'Mês anterior' : 'Semana anterior'}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="min-w-[8rem] text-center text-sm font-semibold tracking-wide text-gray-700">
            {navLabel}
          </span>
          <button
            type="button"
            onClick={onNext}
            className="rounded p-0.5 hover:bg-gray-100"
            aria-label={plannerViewMode === 'month' ? 'Próximo mês' : 'Próxima semana'}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onToday}
            className="ml-1 h-7 rounded-md px-2 text-[11px] font-semibold text-gray-500 hover:bg-gray-100 hover:text-gray-700"
            aria-label={plannerViewMode === 'month' ? 'Ir para o mês atual' : 'Ir para a semana atual'}
          >
            Hoje
          </button>
          {loadingExisting ? <span className="ml-2 text-gray-400">Atualizando…</span> : null}
        </div>
        {headerAction || onApplyClick ? (
          <div className="flex shrink-0 items-center gap-2">
            {headerAction}
            {onApplyClick ? (
              <button
                type="button"
                disabled={!canApply}
                title={!canApply ? applyDisabledReason : undefined}
                onClick={onApplyClick}
                className="h-9 shrink-0 rounded-lg bg-emerald-500 px-3.5 text-sm font-semibold text-white hover:bg-emerald-600 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-500"
              >
                Aplicar planejamento
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      {plannerViewMode === 'month' ? (
        <TreinosMonthBoard
          days={monthDays}
          cardsByDate={cardsByDate}
          loading={loadingExisting}
          todayDate={todayDate}
          onOpenWeek={onOpenWeek}
          onSelectCard={onVerPacientes}
        />
      ) : (
        <div className="min-h-0 flex-1 overflow-x-auto p-3">
          <div className="grid w-full min-w-[72.5rem] grid-cols-7 gap-2">
            {TREINOS_WEEKDAYS.map((weekday) => {
              const label = TREINOS_WEEKDAY_LABELS[weekday];
              const items = cardsByWeekday[weekday] || [];
              const tone = TREINOS_WEEKDAY_TONES[weekday];
              const isToday = weekDatesByWeekday[weekday] === todayDate;
              return (
                <div
                  key={weekday}
                  className={`flex min-h-[26rem] min-w-[164px] flex-col overflow-visible rounded-xl ring-1 ${
                    isToday ? 'ring-emerald-200' : 'ring-gray-100'
                  } ${tone.header}`}
                >
                  <div className={`rounded-t-xl border-t-[3px] ${tone.bar} px-2.5 py-2`}>
                    <p className={`text-[11px] font-bold tracking-wide ${tone.label}`}>{label.short}</p>
                    {isToday ? (
                      <p className="text-[10px] font-semibold text-emerald-700">Hoje</p>
                    ) : (
                      <p className="text-[10px] text-gray-500">{label.long}</p>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col gap-2 px-2 pb-2">
                    {items.map((card) => (
                      <TreinosPlannerCard
                        key={card.id}
                        card={card}
                        onVerPacientes={() => onVerPacientes(card)}
                        onAddObservacao={
                          card.source === 'existing' ? () => onAddObservacao(card) : undefined
                        }
                        onEditWorkout={
                          card.source === 'existing' ? () => onEditWorkout(card) : undefined
                        }
                        onToggleActive={
                          card.source === 'existing' ? () => onToggleActive(card) : undefined
                        }
                        onDeleteWorkout={
                          card.source === 'existing' ? () => onDeleteWorkout(card) : undefined
                        }
                        readOnly={readOnly}
                        onRemoveDraft={
                          card.draftLocalId
                            ? () => onRemoveDraft(weekday, card.draftLocalId as string)
                            : undefined
                        }
                      />
                    ))}
                    {readOnly ? null : (
                      <button
                        type="button"
                        onClick={() => onAddClick(weekday)}
                        className="flex min-h-[3.5rem] flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-white/80 px-2 py-2 text-gray-500 transition hover:border-emerald-400 hover:bg-emerald-50/60 hover:text-emerald-700"
                        aria-label={`Adicionar treino em ${label.long}`}
                      >
                        <Plus className="h-4 w-4" />
                        <span className="mt-0.5 text-[11px] font-semibold">Adicionar treino</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
