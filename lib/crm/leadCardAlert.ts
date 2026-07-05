import { getLeadIdleDays } from '@/lib/crm/leadAge';
import type { LeadMedico } from '@/types/leadMedico';
import type { Paciente360Summary } from '@/types/paciente360';
import type { LeadTaskSummary } from '@/lib/crm/leadTaskSummary';

export type LeadCardAlertReason =
  | 'risco_alto'
  | 'lembrete_atrasado'
  | 'pagamento'
  | 'acao_critica'
  | 'lead_parado';

export type LeadCardAlert = {
  show: boolean;
  tone: 'warning' | 'danger';
  reasons: LeadCardAlertReason[];
};

export function getLeadCardAlert(params: {
  lead: LeadMedico;
  summary?: Paciente360Summary;
  tasks: LeadTaskSummary;
  now?: Date;
}): LeadCardAlert {
  const { lead, summary, tasks, now = new Date() } = params;
  const reasons: LeadCardAlertReason[] = [];

  if (summary?.risco.nivel === 'alto') reasons.push('risco_alto');
  if (tasks.overdue > 0) reasons.push('lembrete_atrasado');

  const fin = summary?.financeiro;
  if (
    fin?.statusPagamento === 'atrasado' ||
    summary?.proximaAcao?.tipo === 'cobrar_pagamento' ||
    (fin?.valorPendente ?? 0) > 0
  ) {
    reasons.push('pagamento');
  }

  if ((summary?.proximaAcao?.prioridade ?? 0) >= 80) {
    reasons.push('acao_critica');
  }

  if (getLeadIdleDays(lead.dataStatus, now) > 15) {
    reasons.push('lead_parado');
  }

  const tone: 'warning' | 'danger' =
    reasons.includes('risco_alto') ||
    reasons.includes('lembrete_atrasado') ||
    reasons.includes('lead_parado')
      ? 'danger'
      : 'warning';

  return { show: reasons.length > 0, tone, reasons };
}
