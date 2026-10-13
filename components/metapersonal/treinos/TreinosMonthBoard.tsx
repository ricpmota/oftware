'use client';

import { cardActiveSummary, type PlannerBoardCard } from '@/lib/metapersonal/treinosPlannerGroup';
import { resolveTreinoColor } from '@/lib/metapersonal/treinosPlannerTheme';
import type { MonthGridDay } from '@/lib/metapersonal/treinosMonth';
import { formatOpenWeekAriaLabel } from '@/lib/metapersonal/treinosPlannerNav';
import { TREINOS_WEEKDAY_LABELS, TREINOS_WEEKDAYS } from './treinosCentral.types';

const VISIBLE_CHIPS = 2;

type Props = {
  days: MonthGridDay[];
  cardsByDate: Record<string, PlannerBoardCard[]>;
  loading?: boolean;
  todayDate: string;
  onOpenWeek: (date: string) => void;
  onSelectCard: (card: PlannerBoardCard) => void;
};

export function TreinosMonthBoard({
  days,
  cardsByDate,
  loading,
  todayDate,
  onOpenWeek,
  onSelectCard,
}: Props) {
  return (
    <div className="min-h-0 flex-1 overflow-auto p-3">
      <div className="grid grid-cols-7 gap-1.5">
        {TREINOS_WEEKDAYS.map((weekday) => (
          <div key={weekday} className="px-1 pb-1 text-center text-[10px] font-bold tracking-wide text-gray-500">
            {TREINOS_WEEKDAY_LABELS[weekday].short}
          </div>
        ))}
        {days.map((day) => {
          const cards = cardsByDate[day.date] || [];
          const extra = Math.max(0, cards.length - VISIBLE_CHIPS);
          const visible = cards.slice(0, VISIBLE_CHIPS);
          const isToday = day.date === todayDate;
          return (
            <div
              key={day.date}
              className={`min-h-[6.5rem] rounded-lg border p-1.5 ${
                day.inMonth ? 'border-gray-100 bg-white' : 'border-transparent bg-gray-50/70 text-gray-400'
              } ${isToday ? 'bg-emerald-50/70 ring-2 ring-emerald-300' : ''}`}
            >
              <button
                type="button"
                onClick={() => onOpenWeek(day.date)}
                aria-label={formatOpenWeekAriaLabel(day.date)}
                className={`flex items-center gap-1 rounded-md px-0.5 text-left text-[11px] font-semibold hover:underline ${
                  day.inMonth ? 'text-gray-800' : 'text-gray-400'
                } ${isToday ? 'text-emerald-800' : ''}`}
              >
                <span>{day.dayNumber}</span>
                {isToday ? (
                  <span className="rounded-full bg-emerald-500 px-1 py-px text-[8px] font-bold uppercase tracking-wide text-white">
                    Hoje
                  </span>
                ) : null}
              </button>
              <div className="mt-1 space-y-1">
                {visible.map((card) => {
                  const tone = resolveTreinoColor(card.colorKey, card.visualSignature);
                  const active = cardActiveSummary(card);
                  const inactive = active.state === 'all-inactive';
                  const mixed = active.state === 'mixed';
                  return (
                    <button
                      key={card.id}
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onSelectCard(card);
                      }}
                      title={
                        mixed
                          ? `${card.title} · ${active.activeCount}/${active.total} ativos`
                          : inactive
                            ? `${card.title} · inativo`
                            : card.title
                      }
                      className={`flex w-full items-center gap-1 rounded-md border px-1 py-0.5 text-left ${tone.bg} ${
                        inactive ? `border-dashed ${tone.border} opacity-55` : tone.border
                      }`}
                    >
                      <span
                        aria-hidden
                        className={
                          inactive
                            ? `h-1.5 w-1.5 shrink-0 rounded-full border ${tone.border} bg-transparent`
                            : `h-1.5 w-1.5 shrink-0 rounded-full ${tone.accent}`
                        }
                      />
                      <span className={`min-w-0 truncate text-[10px] font-semibold ${tone.badge}`}>
                        {card.title}
                      </span>
                      {mixed ? (
                        <span className="shrink-0 text-[9px] font-medium text-amber-700">
                          {active.activeCount}/{active.total}
                        </span>
                      ) : null}
                    </button>
                  );
                })}
                {extra > 0 ? (
                  <p className="px-1 text-[9px] font-medium text-gray-500">+{extra} treinos</p>
                ) : null}
                {loading && cards.length === 0 && day.inMonth ? (
                  <p className="px-1 text-[9px] text-gray-300">…</p>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
