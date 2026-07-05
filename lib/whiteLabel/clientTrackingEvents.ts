import {
  WHITELABEL_CLIENT_EVENT_LABELS,
  type WhiteLabelClientEvent,
  type WhiteLabelClientEventType,
} from '@/types/whiteLabelClientEvents';

export function createClientEvent(
  type: WhiteLabelClientEventType,
  meta?: Record<string, string>
): WhiteLabelClientEvent {
  return {
    type,
    createdAt: new Date().toISOString(),
    meta,
  };
}

export function clientEventsForTimeline(events: WhiteLabelClientEvent[]) {
  return events.map((event) => ({
    type: event.type,
    createdAt: event.createdAt,
    description: formatClientEventDescription(event),
  }));
}

export function formatClientEventDescription(event: WhiteLabelClientEvent): string {
  const base = WHITELABEL_CLIENT_EVENT_LABELS[event.type] || event.type;
  if (event.type === 'scheduler_slot_selected' && event.meta?.date && event.meta?.startTime) {
    return `${base} — ${event.meta.date} às ${event.meta.startTime}`;
  }
  return base;
}

export function buildGoogleCalendarAddUrl(input: {
  date: string;
  startTime: string;
  endTime: string;
  title: string;
  details?: string;
  location?: string;
}): string {
  const toGcal = (date: string, time: string) =>
    `${date.replace(/-/g, '')}T${time.replace(':', '')}00`;

  const dates = `${toGcal(input.date, input.startTime)}/${toGcal(input.date, input.endTime)}`;
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: input.title,
    dates,
    ctz: 'America/Sao_Paulo',
  });
  if (input.details) params.set('details', input.details);
  if (input.location) params.set('location', input.location);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function slotDurationMinutes(startTime: string, endTime: string): number {
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  return eh * 60 + em - (sh * 60 + sm);
}
