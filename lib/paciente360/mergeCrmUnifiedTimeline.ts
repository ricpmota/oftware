import type { LeadMedicoTimelineEvent, LeadMedicoTimelineEventType } from '@/types/leadMedicoTimeline';
import type {
  CrmUnifiedTimelineEvent,
  Paciente360TimelineBuildResult,
  Paciente360TimelineEvent,
  Paciente360TimelineTone,
} from '@/types/paciente360';
import { toDateValue } from '@/lib/paciente360/paciente360DateUtils';

const CRM_TITLES: Record<LeadMedicoTimelineEventType, string> = {
  lead_created: 'Lead captado',
  stage_changed: 'Mudança de estágio',
  note: 'Observação',
  estrelas_changed: 'Classificação atualizada',
};

export const CRM_UNIFIED_TIMELINE_MAX_EVENTS = 20;

function eventTime(date?: Date | string | null): number {
  const d = toDateValue(date);
  return d?.getTime() ?? 0;
}

export function leadMedicoEventToUnified(event: LeadMedicoTimelineEvent): CrmUnifiedTimelineEvent {
  let title = CRM_TITLES[event.type] ?? event.type;
  let description = event.description;

  if (event.type === 'lead_created') {
    description = description || 'Paciente entrou no funil pelo CRM.';
  }

  if (event.type === 'stage_changed' && event.description.startsWith('Estágio atual:')) {
    title = event.description;
    description = undefined;
  }

  return {
    id: `crm-${event.id}`,
    date: event.createdAt,
    source: 'crm',
    title,
    description,
    tone: 'neutral',
    createdBy: event.createdBy,
    sourceDateQuality: 'real',
  };
}

export function paciente360EventToUnified(event: Paciente360TimelineEvent): CrmUnifiedTimelineEvent {
  return {
    id: `p360-${event.id}`,
    date: event.date,
    source: 'paciente360',
    title: event.title,
    description: event.description,
    tone: event.tone ?? 'neutral',
    isSnapshot: event.isSnapshot,
    sourceDateQuality: event.sourceDateQuality,
  };
}

export function mergeCrmUnifiedTimeline(
  crmEvents: LeadMedicoTimelineEvent[],
  paciente360: Paciente360TimelineBuildResult | Paciente360TimelineEvent[]
): CrmUnifiedTimelineEvent[] {
  const p360Result: Paciente360TimelineBuildResult = Array.isArray(paciente360)
    ? { events: paciente360 }
    : paciente360;

  const dated: CrmUnifiedTimelineEvent[] = [
    ...crmEvents.map(leadMedicoEventToUnified),
    ...p360Result.events.map(paciente360EventToUnified),
  ];

  dated.sort((a, b) => eventTime(b.date) - eventTime(a.date));

  const maxDated = p360Result.currentState
    ? CRM_UNIFIED_TIMELINE_MAX_EVENTS - 1
    : CRM_UNIFIED_TIMELINE_MAX_EVENTS;
  const limitedDated = dated.slice(0, maxDated);

  const result: CrmUnifiedTimelineEvent[] = [];
  if (p360Result.currentState) {
    result.push(paciente360EventToUnified(p360Result.currentState));
  }
  result.push(...limitedDated);

  return result;
}

export function toneDotClass(tone: Paciente360TimelineTone | undefined): string {
  const map: Record<Paciente360TimelineTone, string> = {
    neutral: 'bg-slate-400',
    success: 'bg-emerald-500',
    warning: 'bg-amber-500',
    danger: 'bg-rose-500',
    info: 'bg-sky-500',
  };
  return map[tone ?? 'neutral'];
}
