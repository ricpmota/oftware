import { getWeeklyNutritionCheckInFlags } from '@/lib/nutri/checkInSemanalNutriFlags';
import type { CheckInSemanalNutri } from '@/lib/nutri/checkInSemanalNutriTypes';
import { getPreviousNutritionWeek, getNutritionWeek } from '@/lib/nutri/checkInSemanalNutriWeek';
import { brasiliaWallTimeToInstant, parseHorarioBrasil } from '@/lib/time/brasilTimezone';
import { DEFAULT_NUTRI_WEEKLY_CHECKIN_TIME } from '@/lib/nutri/checkInSemanalNutriSchedule';

export const WEEKLY_NUTRI_CHECKIN_POLL_MS = 25_000;

export type WeeklyNutritionCheckInOperationalStatus =
  | 'upcoming'
  | 'due_today'
  | 'overdue'
  | 'completed';

export type WeeklyNutritionCheckInFilterId =
  | 'all'
  | 'completed'
  | 'waiting'
  | 'overdue'
  | 'attention';

export type WeeklyNutritionCheckInWhatsAppFilterId = 'all' | 'sent' | 'unsent' | 'failed';

export type WeeklyNutritionCheckInWhatsAppBadge = 'pending' | 'sent' | 'failed' | 'skipped';

export type WeeklyNutritionCheckInOperationalSlot = {
  patientId: string;
  patientName: string;
  weekKey: string;
  scheduledDate: string;
  scheduledTime: string;
  status: 'upcoming' | 'pending' | 'completed';
  record?: Pick<
    CheckInSemanalNutri,
    | 'score'
    | 'aderenciaPlano'
    | 'diasProteinaMeta'
    | 'diasMetaAgua'
    | 'nauseas'
    | 'constipacao'
    | 'diarreia'
    | 'energiaSemana'
    | 'weekKey'
  > | null;
  whatsapp?: WeeklyNutritionCheckInWhatsAppBadge | null;
};

export type WeeklyNutritionCheckInOperationalSummary = {
  total: number;
  completed: number;
  waiting: number;
  overdue: number;
  upcoming: number;
  attention: number;
  whatsappSent: number;
  whatsappFailed: number;
  /** completed / slots com scheduledDate <= hoje. null se o denominador é 0. */
  responseRate: number | null;
  dueCount: number;
};

export function shouldRunWeeklyNutritionCheckInPoll(input: {
  calendarVisible: boolean;
  documentVisible: boolean;
}): boolean {
  return input.calendarVisible && input.documentVisible;
}

export function getWeeklyCheckInScheduledAt(scheduledDate: string, scheduledTime: string): Date {
  const time = parseHorarioBrasil(scheduledTime) || DEFAULT_NUTRI_WEEKLY_CHECKIN_TIME;
  return brasiliaWallTimeToInstant(scheduledDate, time);
}

export function getWeeklyCheckInDelay(scheduledAt: Date, now: Date = new Date()): string | null {
  const ms = now.getTime() - scheduledAt.getTime();
  if (ms <= 0) return null;
  const minutes = Math.floor(ms / 60_000);
  const hours = Math.floor(ms / 3_600_000);
  const days = Math.floor(ms / 86_400_000);
  if (days >= 1) return days === 1 ? '1 dia de atraso' : `${days} dias de atraso`;
  if (hours >= 1) return hours === 1 ? '1 hora de atraso' : `${hours} horas de atraso`;
  const shown = Math.max(1, minutes);
  return shown === 1 ? '1 minuto de atraso' : `${shown} minutos de atraso`;
}

/**
 * Substatus operacional. Não altera upcoming/pending/completed clínicos.
 * due_today = o dia civil do schedule é hoje e ainda não há resposta.
 * overdue = o dia civil já passou e ainda não há resposta.
 */
export function resolveWeeklyNutritionCheckInOperationalStatus(input: {
  hasRecord: boolean;
  scheduledDate: string;
  todayYmd: string;
}): WeeklyNutritionCheckInOperationalStatus {
  if (input.hasRecord) return 'completed';
  if (input.scheduledDate > input.todayYmd) return 'upcoming';
  if (input.scheduledDate === input.todayYmd) return 'due_today';
  return 'overdue';
}

export function weeklyNutritionCheckInFlagCardLabel(flag: {
  id: string;
  label: string;
}): string {
  if (flag.id === 'low_protein') {
    const match = /(\d+)/.exec(flag.label);
    return match ? `Proteína ${match[1]}/7` : 'Proteína baixa';
  }
  if (flag.id === 'low_hydration') {
    const match = /(\d+)/.exec(flag.label);
    return match ? `Água ${match[1]}/7` : 'Hidratação baixa';
  }
  if (flag.id === 'low_adherence') return flag.label.replace(/^Aderência /, 'Aderência ');
  return flag.label;
}

export function compactWeeklyNutritionAttentionFlags(
  flags: Array<{ id: string; label: string }>,
  limit = 3
): { shown: Array<{ id: string; label: string }>; extra: number } {
  const shown = flags.slice(0, Math.max(0, limit)).map((flag) => ({
    id: flag.id,
    label: weeklyNutritionCheckInFlagCardLabel(flag),
  }));
  return { shown, extra: Math.max(0, flags.length - shown.length) };
}

export function slotHasClinicalAttention(slot: WeeklyNutritionCheckInOperationalSlot): boolean {
  if (slot.status !== 'completed' || !slot.record) return false;
  return getWeeklyNutritionCheckInFlags(slot.record).length > 0;
}

export function buildWeeklyNutritionCheckInOperationalSummary(
  slots: WeeklyNutritionCheckInOperationalSlot[],
  input: { todayYmd: string }
): WeeklyNutritionCheckInOperationalSummary {
  let completed = 0;
  let waiting = 0;
  let overdue = 0;
  let upcoming = 0;
  let attention = 0;
  let whatsappSent = 0;
  let whatsappFailed = 0;
  let dueCount = 0;

  for (const slot of slots) {
    const operational = resolveWeeklyNutritionCheckInOperationalStatus({
      hasRecord: slot.status === 'completed' || Boolean(slot.record),
      scheduledDate: slot.scheduledDate,
      todayYmd: input.todayYmd,
    });
    if (operational === 'completed') completed += 1;
    else if (operational === 'due_today') waiting += 1;
    else if (operational === 'overdue') overdue += 1;
    else upcoming += 1;

    if (operational !== 'upcoming') dueCount += 1;
    if (slotHasClinicalAttention(slot)) attention += 1;
    if (slot.whatsapp === 'sent') whatsappSent += 1;
    if (slot.whatsapp === 'failed') whatsappFailed += 1;
  }

  return {
    total: slots.length,
    completed,
    waiting,
    overdue,
    upcoming,
    attention,
    whatsappSent,
    whatsappFailed,
    responseRate: dueCount === 0 ? null : Math.round((completed / dueCount) * 100),
    dueCount,
  };
}

export function filterWeeklyNutritionCheckInSlots(
  slots: WeeklyNutritionCheckInOperationalSlot[],
  input: {
    todayYmd: string;
    statusFilter: WeeklyNutritionCheckInFilterId;
    whatsappFilter?: WeeklyNutritionCheckInWhatsAppFilterId;
  }
): WeeklyNutritionCheckInOperationalSlot[] {
  return slots.filter((slot) => {
    const operational = resolveWeeklyNutritionCheckInOperationalStatus({
      hasRecord: slot.status === 'completed' || Boolean(slot.record),
      scheduledDate: slot.scheduledDate,
      todayYmd: input.todayYmd,
    });
    if (input.statusFilter === 'completed' && operational !== 'completed') return false;
    if (input.statusFilter === 'waiting' && operational !== 'due_today') return false;
    if (input.statusFilter === 'overdue' && operational !== 'overdue') return false;
    if (input.statusFilter === 'attention' && !slotHasClinicalAttention(slot)) return false;

    const whatsapp = slot.whatsapp ?? null;
    if (input.whatsappFilter === 'sent' && whatsapp !== 'sent') return false;
    if (input.whatsappFilter === 'failed' && whatsapp !== 'failed') return false;
    if (input.whatsappFilter === 'unsent' && (whatsapp === 'sent' || whatsapp === 'failed')) return false;
    return true;
  });
}

const OPERATIONAL_SORT_RANK: Record<WeeklyNutritionCheckInOperationalStatus, number> = {
  overdue: 0,
  due_today: 1,
  completed: 2,
  upcoming: 3,
};

export function sortWeeklyNutritionCheckInOperationalSlots(
  slots: WeeklyNutritionCheckInOperationalSlot[],
  input: { todayYmd: string }
): WeeklyNutritionCheckInOperationalSlot[] {
  return [...slots].sort((a, b) => {
    const aStatus = resolveWeeklyNutritionCheckInOperationalStatus({
      hasRecord: a.status === 'completed' || Boolean(a.record),
      scheduledDate: a.scheduledDate,
      todayYmd: input.todayYmd,
    });
    const bStatus = resolveWeeklyNutritionCheckInOperationalStatus({
      hasRecord: b.status === 'completed' || Boolean(b.record),
      scheduledDate: b.scheduledDate,
      todayYmd: input.todayYmd,
    });
    const aAttention = aStatus === 'completed' && slotHasClinicalAttention(a) ? 0 : 1;
    const bAttention = bStatus === 'completed' && slotHasClinicalAttention(b) ? 0 : 1;
    if (aStatus !== bStatus) return OPERATIONAL_SORT_RANK[aStatus] - OPERATIONAL_SORT_RANK[bStatus];
    if (aStatus === 'completed' && aAttention !== bAttention) return aAttention - bAttention;
    const dateCmp = a.scheduledDate.localeCompare(b.scheduledDate);
    if (dateCmp !== 0) return dateCmp;
    const timeCmp = a.scheduledTime.localeCompare(b.scheduledTime);
    if (timeCmp !== 0) return timeCmp;
    return a.patientName.localeCompare(b.patientName, 'pt-BR');
  });
}

export function previousWeekRecordOf<T extends Pick<CheckInSemanalNutri, 'pacienteId' | 'weekKey'>>(
  records: T[],
  patientId: string,
  weekKey: string
): T | null {
  const previous = getPreviousNutritionWeek(getNutritionWeek(weekKey));
  return records.find((record) => record.pacienteId === patientId && record.weekKey === previous.weekKey) ?? null;
}

export function slotsInYmdRange<T extends { scheduledDate: string }>(
  slots: T[],
  rangeStart: string,
  rangeEnd: string
): T[] {
  return slots.filter((slot) => slot.scheduledDate >= rangeStart && slot.scheduledDate <= rangeEnd);
}

export type WeeklyNutritionCheckInCardActions = {
  canFill: boolean;
  fillTitle: string;
  canMessage: boolean;
  messageTitle: string;
  canViewHistory: boolean;
  historyTitle: string;
};

/**
 * Ações do card operacional (ETAPA 07B).
 * Preencher: semanas já iniciadas ainda sem registro; nunca semana futura.
 * WhatsApp de convite só no dia/atrasado, com telefone, e nunca em completed.
 */
export function resolveWeeklyNutritionCheckInCardActions(input: {
  status: 'upcoming' | 'pending' | 'completed';
  scheduledDate: string;
  todayYmd: string;
  weekKey?: string;
  hasPhone: boolean;
  autoEnabled?: boolean;
  envio?: WeeklyNutritionCheckInWhatsAppBadge | null;
}): WeeklyNutritionCheckInCardActions {
  const completed = input.status === 'completed';
  const inviteDue = !completed && input.scheduledDate <= input.todayYmd;
  const weekKey = input.weekKey || getNutritionWeek(input.scheduledDate).weekKey;
  const isFutureWeek = weekKey > getNutritionWeek(input.todayYmd).weekKey;

  let canMessage = false;
  let messageTitle = 'Enviar pelo WhatsApp';
  if (completed) {
    messageTitle = 'Check-in já respondido';
  } else if (!input.hasPhone) {
    messageTitle = 'Paciente sem WhatsApp cadastrado';
  } else if (!inviteDue) {
    messageTitle = 'Disponível no dia do Check-in';
  } else {
    canMessage = true;
    const parts = ['Enviar pelo WhatsApp'];
    if (input.autoEnabled) parts.push('Automação ativa');
    if (input.envio === 'sent') parts.push('WhatsApp enviado');
    if (input.envio === 'failed') parts.push('Falha no envio');
    messageTitle = parts.join('. ');
  }

  return {
    canFill: !completed && !isFutureWeek,
    fillTitle: completed
      ? 'Check-in já respondido'
      : isFutureWeek
        ? 'Disponível na semana do Check-in'
        : 'Preencher Check-in',
    canMessage,
    messageTitle,
    canViewHistory: true,
    historyTitle: 'Evolução Nutricional',
  };
}
