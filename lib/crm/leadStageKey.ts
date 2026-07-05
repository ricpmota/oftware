import type { LeadMedico, LeadMedicoStatus } from '@/types/leadMedico';
import { LEAD_MEDICO_STATUS_ORDER } from '@/types/leadMedicoCrm';

export function getLeadStageKey(lead: Pick<LeadMedico, 'status' | 'crmStageKey'>): string {
  return lead.crmStageKey || lead.status;
}

export function isDefaultStageKey(stageKey: string): stageKey is LeadMedicoStatus {
  return LEAD_MEDICO_STATUS_ORDER.includes(stageKey as LeadMedicoStatus);
}

export function isCustomStageKey(stageKey: string): boolean {
  return stageKey.startsWith('custom_');
}
