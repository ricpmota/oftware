'use client';

import { CalendarClock, Users } from 'lucide-react';

export type LeadsAgendaTab = 'leads' | 'agendamentos';

const TABS: { id: LeadsAgendaTab; label: string; icon: typeof Users }[] = [
  { id: 'leads', label: 'Leads', icon: Users },
  { id: 'agendamentos', label: 'Agendamentos', icon: CalendarClock },
];

type Props = {
  active: LeadsAgendaTab;
  onChange: (tab: LeadsAgendaTab) => void;
};

/** Controle segmentado Leads / Agendamentos. Só alterna a aba; o conteúdo continua no hub. */
export default function LeadsAgendaSegmentedTabs({ active, onChange }: Props) {
  return (
    <div className="flex justify-center">
      <div
        className="flex w-full max-w-md gap-1 overflow-x-auto rounded-2xl border border-gray-200/80 bg-gray-100/80 p-1 sm:w-auto"
        role="tablist"
        aria-label="Leads e agendamentos"
      >
        {TABS.map(({ id, label, icon: Icon }) => {
          const selected = active === id;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => onChange(id)}
              className={`inline-flex min-w-0 flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors duration-200 sm:min-w-[9.5rem] sm:flex-none ${
                selected
                  ? 'bg-emerald-100 text-emerald-900 shadow-sm'
                  : 'text-gray-600 hover:bg-white/80 hover:text-gray-900'
              }`}
            >
              <Icon className={`h-4 w-4 shrink-0 ${selected ? 'text-emerald-700' : 'text-gray-500'}`} />
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
