'use client';

import { useMedicoLeadsCrmTheme } from '@/components/crm/medico/MedicoLeadsCrmProvider';
import { toneDotClass } from '@/lib/paciente360/mergeCrmUnifiedTimeline';
import { toDateValue, startOfDay } from '@/lib/paciente360/paciente360DateUtils';
import type { CrmUnifiedTimelineEvent, CrmUnifiedTimelineSource } from '@/types/paciente360';

type Props = {
  events: CrmUnifiedTimelineEvent[];
};

const SOURCE_LABELS: Record<CrmUnifiedTimelineSource, string> = {
  crm: 'CRM',
  paciente360: 'Paciente 360',
  sistema: 'Sistema',
};

function formatTimelineDate(event: CrmUnifiedTimelineEvent): string {
  if (event.isSnapshot || event.sourceDateQuality === 'snapshot') {
    return 'Estado atual';
  }
  const d = toDateValue(event.date);
  if (!d) return 'Estado atual';
  const today = startOfDay(new Date());
  const day = startOfDay(d);
  if (day.getTime() === today.getTime()) return 'Hoje';
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function sourceBadgeClass(source: CrmUnifiedTimelineSource, t: ReturnType<typeof useMedicoLeadsCrmTheme>): string {
  if (source === 'paciente360') {
    return 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-200';
  }
  if (source === 'sistema') {
    return 'bg-slate-100 text-slate-600 dark:bg-slate-800/60 dark:text-slate-300';
  }
  return t.badgeCount;
}

export default function Paciente360Timeline({ events }: Props) {
  const t = useMedicoLeadsCrmTheme();

  if (events.length === 0) {
    return <p className={`text-sm ${t.textSubtle}`}>Nenhum evento na timeline.</p>;
  }

  return (
    <div className="space-y-0">
      {events.map((event, idx) => (
        <div key={event.id} className="flex gap-3 min-w-0">
          <div className="flex flex-col items-center shrink-0">
            <div
              className={`w-2.5 h-2.5 rounded-full mt-1.5 ${toneDotClass(event.tone)}`}
              aria-hidden
            />
            {idx < events.length - 1 && <div className={`w-px flex-1 min-h-[1rem] ${t.timelineLine} my-0.5`} />}
          </div>
          <div className="pb-4 min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <p className={`text-[10px] tabular-nums ${t.textSubtle}`}>{formatTimelineDate(event)}</p>
              <span
                className={`inline-flex rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${sourceBadgeClass(event.source, t)}`}
              >
                {SOURCE_LABELS[event.source]}
              </span>
            </div>
            <p className={`text-sm font-semibold mt-0.5 ${t.textPrimary}`}>{event.title}</p>
            {event.description && (
              <p className={`text-xs mt-0.5 leading-snug ${t.textMuted}`}>{event.description}</p>
            )}
            {event.createdBy && (
              <p className={`text-[10px] mt-0.5 ${t.textSubtle}`}>por {event.createdBy}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
