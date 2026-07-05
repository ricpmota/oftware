export type { CrmTagPresetColorId } from '@/lib/crm/crmTagPresets';
export { CRM_TAG_PRESET_COLORS } from '@/lib/crm/crmTagPresets';

export interface CrmTag {
  id: string;
  medicoId: string;
  label: string;
  color: string;
  backgroundColor?: string;
  createdAt: Date;
  updatedAt: Date;
  archived?: boolean;
}

/** Snapshot salvo no documento leads_medico.crmTags */
export interface LeadCrmTagSnapshot {
  tagId: string;
  label: string;
  color: string;
  backgroundColor?: string;
}

export type CreateCrmTagInput = {
  label: string;
  color: string;
  backgroundColor?: string;
};

export type UpdateCrmTagInput = Partial<CreateCrmTagInput>;
