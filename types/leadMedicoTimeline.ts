export type LeadMedicoTimelineEventType =
  | 'lead_created'
  | 'stage_changed'
  | 'note'
  | 'estrelas_changed';

export type LeadMedicoTimelineEvent = {
  id: string;
  leadId: string;
  medicoId: string;
  type: LeadMedicoTimelineEventType;
  description: string;
  createdBy?: string;
  createdAt: Date | null;
};
