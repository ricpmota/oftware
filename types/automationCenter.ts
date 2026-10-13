export type AutomationChannel = 'whatsapp' | 'email' | 'push' | 'sms' | 'voice_ai';

export type AutomationCategory =
  | 'jornada'
  | 'financeiro'
  | 'onboarding'
  | 'marketing'
  | 'relacionamento'
  | 'sistema'
  | 'exames'
  | 'prescricao';

export type AutomationStatus = 'draft' | 'active' | 'inactive' | 'planned';

export type AutomationProfessionalRole = 'medico' | 'nutricionista' | 'personal_trainer';

export interface AutomationDefinition {
  id: string;
  name: string;
  description: string;
  category: AutomationCategory;
  channel: AutomationChannel;
  status: AutomationStatus;
  defaultTemplateId?: string;
  allowOrganizationOverride: boolean;
  allowDoctorActivation: boolean;
  /** Pode ser ativada no MetaNutri (WhatsApp → Automações). */
  allowNutriActivation?: boolean;
  /** Pode ser ativada no MetaPersonal (WhatsApp → Automações). */
  allowPersonalActivation?: boolean;
  requiresPatientOptIn: boolean;
  maxPerDayPerDoctor?: number;
  allowedStartTime?: string;
  allowedEndTime?: string;
  createdAt: string;
  updatedAt: string;
}

export type AutomationTemplateStatus = 'draft' | 'published' | 'inactive' | 'planned';

export interface AutomationTemplate {
  id: string;
  name: string;
  description: string;
  channel: AutomationChannel;
  category: AutomationCategory;
  status: AutomationTemplateStatus;
  automationId: string;
  variables: string[];
  body: string;
  previewBody: string;
  version: number;
  createdAt: string;
  updatedAt: string;
  updatedBy?: string;
}

export interface AutomationOrganizationSetting {
  id: string;
  organizationId: string;
  automationId: string;
  enabled: boolean;
  channel: AutomationChannel;
  templateId?: string;
  createdAt: string;
  updatedAt: string;
  updatedBy?: string;
}

export interface AutomationOrganizationSettingDto {
  id: string;
  organizationId: string;
  automationId: string;
  enabled: boolean;
  channel: AutomationChannel;
  templateId?: string;
  createdAt: string;
  updatedAt: string;
  updatedBy?: string;
}

export function toAutomationOrganizationSettingDto(
  setting: AutomationOrganizationSetting,
): AutomationOrganizationSettingDto {
  return { ...setting };
}

export interface AutomationDoctorSetting {
  id: string;
  doctorId: string;
  organizationId: string;
  automationId: string;
  enabled: boolean;
  channel: AutomationChannel;
  templateId?: string;
  /** Horário (HH:mm, Brasília) individual desta automação para o médico. */
  horario?: string;
  /** Papel do dono; ausente = médico (legado). */
  professionalRole?: AutomationProfessionalRole;
  /** Corpo da mensagem editado pelo médico (sobrescreve o template da organização). */
  templateBody?: string;
  createdAt: string;
  updatedAt: string;
  updatedBy?: string;
}

export interface AutomationDoctorSettingDto {
  id: string;
  doctorId: string;
  organizationId: string;
  automationId: string;
  enabled: boolean;
  channel: AutomationChannel;
  templateId?: string;
  horario?: string;
  professionalRole?: AutomationProfessionalRole;
  templateBody?: string;
  createdAt: string;
  updatedAt: string;
  updatedBy?: string;
}

export interface DoctorAutomationTemplateSummaryDto {
  name: string;
  description: string;
  version: number;
  body: string;
  previewBody: string;
  variables?: string[];
}

export interface DoctorAutomationItemDto {
  automationId: string;
  name: string;
  description: string;
  channel: AutomationChannel;
  category: AutomationCategory;
  enabledByDoctor: boolean;
  templateId?: string;
  usesLegacyWhatsappConfig?: boolean;
  platformActive?: boolean;
  organizationReleased?: boolean;
  template?: DoctorAutomationTemplateSummaryDto;
  /** Horário (HH:mm) individual salvo pelo médico para esta automação, se houver. */
  horario?: string;
  /** Quando true, o disparo é no evento (aceite/consulta) — não exibir seletor de horário diário. */
  horarioFromEvent?: boolean;
  /** Quando true, o horário vem do cronograma do paciente — não exibir seletor global. */
  horarioFromPatientSchedule?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export function toAutomationDoctorSettingDto(
  setting: AutomationDoctorSetting,
): AutomationDoctorSettingDto {
  return { ...setting };
}

export interface AutomationDashboardChannelDto {
  channel: AutomationChannel;
  label: string;
  automationCount: number;
}

export interface AutomationDashboardGovernanceDto {
  catalogLoaded: boolean;
  templatesLoaded: boolean;
  organizationReleaseActive: boolean;
  doctorActivationActive: boolean;
  realSendingIntegrated: boolean;
}

export interface AutomationDashboardDto {
  catalogTotal: number;
  globalActiveAutomations: number;
  templatesTotal: number;
  publishedTemplates: number;
  organizationsWithAutomations: number;
  organizationReleasesTotal: number;
  doctorActivationsTotal: number;
  doctorsWithAutomations: number;
  nutricionistaActivationsTotal: number;
  nutricionistasWithAutomations: number;
  personalActivationsTotal: number;
  personalWithAutomations: number;
  channels: AutomationDashboardChannelDto[];
  governance: AutomationDashboardGovernanceDto;
}

export type DoctorAutomationGovernanceStatus = 'ativa' | 'parcial' | 'inativa';

export type AutomationSendMotor =
  | 'legacy_aplicacao_dia'
  | 'whatsapp_queue'
  | 'email_queue'
  | 'canal_chat'
  | 'none';

export type DoctorAutomationOpsReadiness = 'ready' | 'partial' | 'blocked';

export interface DoctorAutomationOpsChecklistDto {
  readiness: DoctorAutomationOpsReadiness;
  whatsappConnected: boolean;
  whatsappStatus?: string;
  whatsappPhone?: string;
  autoAplicacaoLegacyEnabled: boolean;
  aplicacaoDiaDoctorEnabled: boolean;
  aplicacaoDiaOrgReleased: boolean;
  aplicacaoDiaAuthorized: boolean;
  legacyFlagInSync: boolean;
  autoAplicacaoHorario?: string;
  horarioJaPassouHoje: boolean;
  cronEligible: boolean;
  aplicacoesHoje: number;
  aplicacoesHojePendentes: number;
  aplicacoesHojeIgnoradas: number;
  queuePending: number;
  queueDueNow: number;
  bloqueios: string[];
}

export interface DoctorAutomationDetailRowDto {
  automationId: string;
  automationName: string;
  channel: AutomationChannel;
  globalStatus: AutomationStatus;
  organizationReleased: boolean;
  enabledByDoctor: boolean;
  horario?: string;
  updatedAt?: string;
  motor?: AutomationSendMotor;
  readyToSend?: boolean;
  blockReason?: string;
}

export interface DoctorAutomationGovernanceDto {
  doctorId: string;
  doctorName: string;
  doctorEmail?: string;
  organizationId: string;
  organizationName?: string;
  enabledCount: number;
  totalAvailable: number;
  whatsappEnabled: number;
  emailEnabled: number;
  governanceStatus: DoctorAutomationGovernanceStatus;
  automations: DoctorAutomationDetailRowDto[];
  ops?: DoctorAutomationOpsChecklistDto;
}
