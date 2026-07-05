import { formatYmd, startOfDay } from '@/lib/paciente360/paciente360DateUtils';
import type { Lembrete } from '@/types/lembrete';

export type LeadTaskSummary = {
  total: number;
  completed: number;
  pending: number;
  overdue: number;
};

export function summarizeLeadTasks(
  lembretes: Lembrete[] | undefined,
  now = new Date()
): LeadTaskSummary {
  const hojeYmd = formatYmd(startOfDay(now));
  let completed = 0;
  let pending = 0;
  let overdue = 0;

  for (const l of lembretes ?? []) {
    if (l.concluido) {
      completed += 1;
      continue;
    }
    pending += 1;
    if (l.data < hojeYmd) overdue += 1;
  }

  return {
    total: (lembretes ?? []).length,
    completed,
    pending,
    overdue,
  };
}

export function formatLeadTaskCounter(summary: LeadTaskSummary): string | null {
  if (summary.total === 0) return null;
  return `${summary.completed}/${summary.total}`;
}
