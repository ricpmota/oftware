import {
  listAutomationCenterCatalog,
  listProfessionalActivatableCatalog,
} from '@/lib/metaadmingeral/automationCenterCatalog';
import { isMedicoEventAutomationId } from '@/lib/whatsapp/canalChatTemplates';
import {
  getMergedAutomationOrganizationSetting,
  mergeAutomationOrganizationSettings,
} from '@/lib/metaadmingeral/automationOrganizationSettings';
import type {
  AutomationDoctorSetting,
  AutomationOrganizationSetting,
  AutomationProfessionalRole,
  DoctorAutomationDetailRowDto,
  DoctorAutomationGovernanceStatus,
} from '@/types/automationCenter';

export type DoctorAutomationSummary = {
  doctorId: string;
  organizationId: string;
  enabledCount: number;
  totalAvailable: number;
  whatsappEnabled: number;
  emailEnabled: number;
  governanceStatus: DoctorAutomationGovernanceStatus;
};

type ProfessionalRole = Extract<AutomationProfessionalRole, 'nutricionista' | 'personal_trainer'>;

const PROFESSIONAL_DISPLAY_NAMES: Record<string, string> = {
  aniversario_paciente_whatsapp: 'Aniversário',
  nutri_checkin_semanal_whatsapp: 'Check-in Semanal Nutri',
  cobranca_automatica_whatsapp: 'Pagamento',
};

function countActivatableAutomations(
  organizationId: string,
  mergedOrgSettings: AutomationOrganizationSetting[],
  catalogIds: Set<string>,
): number {
  return [...catalogIds].filter((automationId) => {
    const orgSetting = getMergedAutomationOrganizationSetting(
      mergedOrgSettings,
      organizationId,
      automationId,
    );
    return orgSetting?.enabled === true;
  }).length;
}

export function buildDoctorAutomationSummary(
  doctorId: string,
  organizationId: string,
  doctorSettings: AutomationDoctorSetting[],
  mergedOrgSettings: AutomationOrganizationSetting[],
  options?: { role?: ProfessionalRole },
): DoctorAutomationSummary {
  const enabledSettings = doctorSettings.filter((item) => item.enabled);
  const catalogIds = options?.role
    ? new Set(listProfessionalActivatableCatalog(options.role).map((item) => item.id))
    : new Set(
        listAutomationCenterCatalog()
          .filter((item) => item.allowDoctorActivation)
          .map((item) => item.id),
      );
  const totalAvailable = countActivatableAutomations(
    organizationId,
    mergedOrgSettings,
    catalogIds,
  );
  const impliedEventEnabled =
    options?.role
      ? 0
      : [...catalogIds].filter((automationId) => {
          if (!isMedicoEventAutomationId(automationId)) return false;
          const orgSetting = getMergedAutomationOrganizationSetting(
            mergedOrgSettings,
            organizationId,
            automationId,
          );
          if (orgSetting?.enabled !== true) return false;
          return !doctorSettings.some((item) => item.automationId === automationId);
        }).length;
  const enabledCount = enabledSettings.length + impliedEventEnabled;
  const whatsappEnabled =
    enabledSettings.filter((item) => item.channel === 'whatsapp').length + impliedEventEnabled;
  const emailEnabled = enabledSettings.filter((item) => item.channel === 'email').length;

  let governanceStatus: DoctorAutomationGovernanceStatus = 'inativa';
  if (enabledCount === 0) {
    governanceStatus = 'inativa';
  } else if (totalAvailable > 0 && enabledCount >= Math.ceil(totalAvailable / 2)) {
    governanceStatus = 'ativa';
  } else {
    governanceStatus = 'parcial';
  }

  return {
    doctorId,
    organizationId,
    enabledCount,
    totalAvailable,
    whatsappEnabled,
    emailEnabled,
    governanceStatus,
  };
}

export function listDoctorAutomationDetailRows(
  organizationId: string,
  doctorSettings: AutomationDoctorSetting[],
  mergedOrgSettings: AutomationOrganizationSetting[],
): DoctorAutomationDetailRowDto[] {
  const doctorByAutomation = new Map(doctorSettings.map((item) => [item.automationId, item]));
  const catalog = listAutomationCenterCatalog().filter((item) => item.allowDoctorActivation);

  return catalog.map((automation) => {
    const orgSetting = getMergedAutomationOrganizationSetting(
      mergedOrgSettings,
      organizationId,
      automation.id,
    );
    const doctorSetting = doctorByAutomation.get(automation.id);

    return {
      automationId: automation.id,
      automationName: automation.name,
      channel: automation.channel,
      globalStatus: automation.status,
      organizationReleased: orgSetting?.enabled === true,
      enabledByDoctor: doctorSetting
        ? doctorSetting.enabled === true
        : isMedicoEventAutomationId(automation.id),
      horario: doctorSetting?.horario,
      updatedAt: doctorSetting?.updatedAt,
    };
  });
}

export function listProfessionalAutomationDetailRows(
  organizationId: string,
  ownerSettings: AutomationDoctorSetting[],
  mergedOrgSettings: AutomationOrganizationSetting[],
  role: ProfessionalRole,
): DoctorAutomationDetailRowDto[] {
  const byAutomation = new Map(ownerSettings.map((item) => [item.automationId, item]));
  const catalog = listProfessionalActivatableCatalog(role);

  return catalog.map((automation) => {
    const orgSetting = getMergedAutomationOrganizationSetting(
      mergedOrgSettings,
      organizationId,
      automation.id,
    );
    const ownerSetting = byAutomation.get(automation.id);

    return {
      automationId: automation.id,
      automationName: PROFESSIONAL_DISPLAY_NAMES[automation.id] ?? automation.name,
      channel: automation.channel,
      globalStatus: automation.status,
      organizationReleased: orgSetting?.enabled === true,
      enabledByDoctor: ownerSetting?.enabled === true,
      horario: ownerSetting?.horario,
      updatedAt: ownerSetting?.updatedAt,
    };
  });
}

export function doctorGovernanceStatusLabel(status: DoctorAutomationGovernanceStatus): string {
  switch (status) {
    case 'ativa':
      return 'Ativa';
    case 'parcial':
      return 'Parcial';
    case 'inativa':
      return 'Inativa';
    default:
      return status;
  }
}

export function doctorGovernanceStatusTone(
  status: DoctorAutomationGovernanceStatus,
): 'success' | 'warn' | 'muted' {
  switch (status) {
    case 'ativa':
      return 'success';
    case 'parcial':
      return 'warn';
    case 'inativa':
      return 'muted';
    default:
      return 'muted';
  }
}

export function automationMotorLabel(
  motor: import('@/types/automationCenter').AutomationSendMotor,
): string {
  switch (motor) {
    case 'legacy_aplicacao_dia':
      return 'Cron legado (aplicação do dia)';
    case 'whatsapp_queue':
      return 'Fila WhatsApp';
    case 'email_queue':
      return 'Fila e-mail';
    case 'canal_chat':
      return 'Canal Chat';
    default:
      return '—';
  }
}

export function opsReadinessLabel(
  readiness: import('@/types/automationCenter').DoctorAutomationOpsReadiness,
): string {
  switch (readiness) {
    case 'ready':
      return 'Pronto';
    case 'partial':
      return 'Parcial';
    case 'blocked':
      return 'Bloqueado';
    default:
      return readiness;
  }
}

export function opsReadinessTone(
  readiness: import('@/types/automationCenter').DoctorAutomationOpsReadiness,
): 'success' | 'warn' | 'muted' {
  switch (readiness) {
    case 'ready':
      return 'success';
    case 'partial':
      return 'warn';
    case 'blocked':
      return 'muted';
    default:
      return 'muted';
  }
}

export function mergeDoctorSettingsByDoctorId(
  settings: AutomationDoctorSetting[],
): Map<string, AutomationDoctorSetting[]> {
  const byDoctor = new Map<string, AutomationDoctorSetting[]>();
  for (const setting of settings) {
    const list = byDoctor.get(setting.doctorId) ?? [];
    list.push(setting);
    byDoctor.set(setting.doctorId, list);
  }
  return byDoctor;
}

export function mergeOrganizationSettingsForGovernance(
  firestoreSettings: AutomationOrganizationSetting[],
): AutomationOrganizationSetting[] {
  return mergeAutomationOrganizationSettings(firestoreSettings);
}
