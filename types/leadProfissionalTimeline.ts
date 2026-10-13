export type LeadProfissionalTimelineEventType =
  | 'lead_created'
  | 'stage_changed'
  | 'consulta_agendada'
  | 'note';

export type LeadProfissionalTimelineEvent = {
  id: string;
  leadId: string;
  role: 'nutri' | 'personal' | 'psiquiatra';
  profissionalId: string;
  type: LeadProfissionalTimelineEventType;
  description: string;
  createdBy?: string;
  createdAt: Date | null;
};
