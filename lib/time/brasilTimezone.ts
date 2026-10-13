/** Timezone canônico do produto (não espalhar o literal). */
export const BRASIL_TIMEZONE = 'America/Sao_Paulo';

const BR_TZ = BRASIL_TIMEZONE;

export function getBrasilDateTimeParts(date = new Date()): {
  dateKey: string;
  hours: number;
  minutes: number;
  hhmm: string;
} {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: BR_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? '';

  const year = get('year');
  const month = get('month');
  const day = get('day');
  const hours = Number(get('hour'));
  const minutes = Number(get('minute'));

  return {
    dateKey: `${year}-${month}-${day}`,
    hours,
    minutes,
    hhmm: `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`,
  };
}

export function parseHorarioBrasil(raw: string | null | undefined): string | null {
  // Aceita HH:mm ou HH:mm:ss (alguns browsers emitem segundos no input type=time).
  if (typeof raw !== 'string') return null;
  const match = raw.trim().match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

/** Mesma regra do motor automático: envio só quando agora (BR) >= horário configurado. */
export function horarioConfiguradoJaPassou(agoraHhmm: string, configuradoHhmm: string): boolean {
  const [ah, am] = agoraHhmm.split(':').map(Number);
  const [ch, cm] = configuradoHhmm.split(':').map(Number);
  if (ah > ch) return true;
  if (ah === ch && am >= cm) return true;
  return false;
}

export function formatBrasilClock(date = new Date()): string {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: BR_TZ,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(date);
}

export function formatBrasilDateLabel(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  if (!y || !m || !d) return dateKey;
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateToBrasilDateKey(date: Date): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: BR_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = formatter.formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

export const BRASIL_TIMEZONE_LABEL = 'America/Sao_Paulo (Brasília)';

export const DEFAULT_AUTO_APLICACAO_HORARIO = '08:00';

/** Brasil sem horário de verão (UTC-3 fixo). */
const BRASILIA_UTC_OFFSET_HOURS = 3;

/** Converte "dia + horário" (parede de Brasília) no instante UTC correspondente. */
export function brasiliaWallTimeToInstant(dateKey: string, hhmm: string): Date {
  const [y, m, d] = dateKey.split('-').map(Number);
  const [hh, mm] = hhmm.split(':').map(Number);
  return new Date(
    Date.UTC(y, (m ?? 1) - 1, d ?? 1, (hh ?? 0) + BRASILIA_UTC_OFFSET_HOURS, mm ?? 0, 0, 0),
  );
}
