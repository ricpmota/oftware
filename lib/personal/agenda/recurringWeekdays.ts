import { WHITELABEL_WEEKDAYS } from '@/types/whiteLabelAgenda';

export type RecurringRuleLike = {
  weekday: number;
  enabled?: boolean;
  periods?: unknown[] | null;
};

/** Dias da semana que de fato geram horário na aba Recorrente. */
export function weekdaysFromRecurringRules(rules: RecurringRuleLike[]): number[] {
  const days = new Set<number>();
  for (const rule of rules) {
    if (rule.enabled === false) continue;
    if (!Array.isArray(rule.periods) || rule.periods.length === 0) continue;
    if (!Number.isInteger(rule.weekday) || rule.weekday < 0 || rule.weekday > 6) continue;
    days.add(rule.weekday);
  }
  return [...days].sort((a, b) => a - b);
}

export function labelsForWeekdays(weekdays: number[]): string[] {
  return weekdays
    .map((day) => WHITELABEL_WEEKDAYS.find((item) => item.weekday === day)?.label)
    .filter((label): label is string => Boolean(label));
}
