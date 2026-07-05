import { startOfDay, toDateValue } from '@/lib/paciente360/paciente360DateUtils';

export type LeadAgeTone = 'neutral' | 'warning' | 'danger';

export function getLeadIdleDays(
  referenceDate: Date | string | undefined | null,
  now = new Date()
): number {
  const ref = toDateValue(referenceDate);
  if (!ref) return 0;
  const diff = startOfDay(now).getTime() - startOfDay(ref).getTime();
  return Math.max(0, Math.floor(diff / 86_400_000));
}

/** Ex.: Hoje, 1d, 8d, 31d */
export function formatLeadAge(
  referenceDate: Date | string | undefined | null,
  now = new Date()
): string {
  const days = getLeadIdleDays(referenceDate, now);
  if (days <= 0) return 'Hoje';
  if (days === 1) return '1d';
  return `${days}d`;
}

export function getLeadIdleTone(
  referenceDate: Date | string | undefined | null,
  now = new Date()
): LeadAgeTone {
  const days = getLeadIdleDays(referenceDate, now);
  if (days > 15) return 'danger';
  if (days > 7) return 'warning';
  return 'neutral';
}
