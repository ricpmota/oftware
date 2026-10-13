import type { LeadProfissional, LeadProfissionalRole, LeadProfissionalStatus } from '@/types/leadProfissional';
import { getLeadProfissionalStatusOrder } from '@/types/leadProfissionalCrm';

export function getLeadProfissionalStageKey(
  lead: Pick<LeadProfissional, 'status' | 'crmStageKey'>
): string {
  return lead.crmStageKey || lead.status;
}

export function isDefaultProfissionalStageKey(
  role: LeadProfissionalRole,
  stageKey: string
): stageKey is LeadProfissionalStatus {
  return getLeadProfissionalStatusOrder(role).includes(stageKey as LeadProfissionalStatus);
}
