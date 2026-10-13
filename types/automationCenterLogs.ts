export type AutomationCenterLogChannel = 'whatsapp' | 'email';

export type AutomationCenterLogStatus =
  | 'sent'
  | 'failed'
  | 'skipped'
  | 'pending'
  | 'processing';

export interface AutomationCenterLogEventDto {
  id: string;
  at: string;
  channel: AutomationCenterLogChannel;
  organizationId?: string;
  organizationName?: string;
  doctorId?: string;
  doctorName?: string;
  eventType: string;
  status: AutomationCenterLogStatus;
  detail?: string;
  errorMessage?: string;
  recipient?: string;
  /** Quando pendente: instante previsto do envio. */
  scheduledFor?: string;
}

export type AutomationCenterDoctorActivityStatus = 'active' | 'silent' | 'failed_recent';

export interface AutomationCenterDoctorActivityDto {
  doctorId: string;
  doctorName: string;
  organizationId: string;
  organizationName?: string;
  whatsappEnabled: number;
  emailEnabled: number;
  lastWhatsappAt?: string;
  lastWhatsappStatus?: 'sent' | 'failed';
  lastEmailAt?: string;
  lastEmailStatus?: 'sent' | 'failed' | 'skipped';
  activityStatus: AutomationCenterDoctorActivityStatus;
  recentEventCount: number;
}

export interface AutomationCenterLogsDto {
  generatedAt: string;
  events: AutomationCenterLogEventDto[];
  doctorActivity: AutomationCenterDoctorActivityDto[];
}
