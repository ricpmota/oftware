export type WhiteLabelClientEventType =
  | 'scheduler_viewed'
  | 'scheduler_slot_selected'
  | 'meeting_confirmed';

export type WhiteLabelClientEvent = {
  type: WhiteLabelClientEventType;
  createdAt: string;
  meta?: Record<string, string>;
};

export const WHITELABEL_CLIENT_EVENT_LABELS: Record<WhiteLabelClientEventType, string> = {
  scheduler_viewed: 'Visualizou a agenda de horários',
  scheduler_slot_selected: 'Selecionou horário na agenda',
  meeting_confirmed: 'Confirmou agendamento da reunião',
};
