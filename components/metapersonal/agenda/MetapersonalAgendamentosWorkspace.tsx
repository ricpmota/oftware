'use client';

import { useState } from 'react';
import { CalendarDays, CalendarOff, ClipboardList, Repeat, Settings2 } from 'lucide-react';
import MetapersonalAvailabilityManager from '@/components/metapersonal/agenda/MetapersonalAvailabilityManager';
import MetapersonalRecurringRulesEditor from '@/components/metapersonal/agenda/MetapersonalRecurringRulesEditor';
import MetapersonalCalendarExceptionsPanel from '@/components/metapersonal/agenda/MetapersonalCalendarExceptionsPanel';
import MetapersonalAgendaSettingsPanel from '@/components/metapersonal/agenda/MetapersonalAgendaSettingsPanel';
import MetapersonalAgendaResumoPanel from '@/components/metapersonal/agenda/MetapersonalAgendaResumoPanel';

export type AgendamentosSubTab = 'calendar' | 'resumo' | 'recurring' | 'exceptions' | 'settings';

const SUB_TABS: { id: AgendamentosSubTab; label: string; hint: string; icon: typeof CalendarDays }[] = [
  { id: 'calendar', label: 'Calendário', hint: 'Horários do dia', icon: CalendarDays },
  { id: 'resumo', label: 'Resumo', hint: 'Datas e edição em massa', icon: ClipboardList },
  { id: 'recurring', label: 'Recorrente', hint: 'Semana típica', icon: Repeat },
  { id: 'exceptions', label: 'Exceções', hint: 'Feriados e extras', icon: CalendarOff },
  { id: 'settings', label: 'Configurações', hint: 'Duração e avisos', icon: Settings2 },
];

export default function MetapersonalAgendamentosWorkspace() {
  const [subTab, setSubTab] = useState<AgendamentosSubTab>('calendar');
  const [reloadKey, setReloadKey] = useState(0);

  const bumpCalendar = () => setReloadKey((key) => key + 1);

  const sidePanel =
    subTab === 'calendar' ? undefined : subTab === 'resumo' ? (
      <MetapersonalAgendaResumoPanel onMutated={bumpCalendar} />
    ) : subTab === 'recurring' ? (
      <MetapersonalRecurringRulesEditor embedded onSaved={bumpCalendar} />
    ) : subTab === 'exceptions' ? (
      <MetapersonalCalendarExceptionsPanel embedded onSaved={bumpCalendar} />
    ) : (
      <MetapersonalAgendaSettingsPanel embedded />
    );

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h3 className="text-lg font-bold text-gray-900">Agendamentos</h3>
        <div className="flex gap-1 overflow-x-auto rounded-2xl border border-gray-200 bg-white p-1 shadow-sm">
          {SUB_TABS.map(({ id, label, icon: Icon }) => {
            const selected = subTab === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setSubTab(id)}
                className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-2 text-sm font-medium transition-all ${
                  selected
                    ? 'bg-green-600 text-white shadow-sm'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <MetapersonalAvailabilityManager sidePanel={sidePanel} reloadKey={reloadKey} />
    </div>
  );
}
