import { listAutomationCenterCatalog } from '@/lib/metaadmingeral/automationCenterCatalog';
import { getAutomationTemplateById, listTemplatesByAutomationId } from '@/lib/metaadmingeral/automationCenterTemplates';
import {
  CLINICA_EXEMPLO_WL_ID,
  METODO_ORGANIZATION_ID,
} from '@/lib/organization/organizationRegistry';
import type { AutomationOrganizationSetting } from '@/types/automationCenter';

const SEED_CREATED_AT = '2026-06-15T12:00:00.000Z';
const SEED_UPDATED_AT = '2026-07-07T11:00:00.000Z';

export function buildAutomationOrganizationSettingId(
  organizationId: string,
  automationId: string,
): string {
  return `${organizationId}_${automationId}`;
}

function setting(
  organizationId: string,
  automationId: string,
  enabled: boolean,
  templateId?: string,
): AutomationOrganizationSetting {
  const automation = listAutomationCenterCatalog().find((item) => item.id === automationId);
  return {
    id: buildAutomationOrganizationSettingId(organizationId, automationId),
    organizationId,
    automationId,
    enabled,
    channel: automation?.channel ?? 'whatsapp',
    templateId,
    createdAt: SEED_CREATED_AT,
    updatedAt: SEED_UPDATED_AT,
  };
}

/** Fallback em memória quando não há documento no Firestore. */
export const AUTOMATION_ORGANIZATION_SETTINGS_SEED: AutomationOrganizationSetting[] = [
  setting(METODO_ORGANIZATION_ID, 'aplicacao_dia_whatsapp', true, 'aplicacao_dia_whatsapp_v1'),
  setting(METODO_ORGANIZATION_ID, 'aplicacao_d1_whatsapp', true, 'aplicacao_d1_whatsapp_v1'),
  setting(METODO_ORGANIZATION_ID, 'aplicacao_atrasada_whatsapp', true, 'aplicacao_atrasada_whatsapp_v1'),
  setting(METODO_ORGANIZATION_ID, 'injetavel_dia_whatsapp', true, 'injetavel_dia_whatsapp_v1'),
  setting(METODO_ORGANIZATION_ID, 'injetavel_d1_whatsapp', true, 'injetavel_d1_whatsapp_v1'),
  setting(METODO_ORGANIZATION_ID, 'aniversario_paciente_whatsapp', true, 'aniversario_paciente_whatsapp_v1'),
  setting(METODO_ORGANIZATION_ID, 'nutri_checkin_semanal_whatsapp', true, 'nutri_checkin_semanal_whatsapp_v1'),
  setting(METODO_ORGANIZATION_ID, 'conclusao_tratamento_whatsapp', true, 'conclusao_tratamento_whatsapp_v1'),
  setting(METODO_ORGANIZATION_ID, 'cobranca_automatica_whatsapp', true, 'cobranca_automatica_whatsapp_v1'),
  setting(METODO_ORGANIZATION_ID, 'cobranca_avulsa_whatsapp', true, 'cobranca_avulsa_whatsapp_v1'),
  setting(METODO_ORGANIZATION_ID, 'boas_vindas_paciente_whatsapp', true, 'boas_vindas_paciente_whatsapp_v1'),
  setting(METODO_ORGANIZATION_ID, 'consulta_confirmacao_whatsapp', true, 'consulta_confirmacao_whatsapp_v1'),
  setting(METODO_ORGANIZATION_ID, 'consulta_lembrete_paciente_whatsapp', true, 'consulta_lembrete_paciente_whatsapp_v1'),
  setting(METODO_ORGANIZATION_ID, 'consulta_lembrete_medico_whatsapp', true, 'consulta_lembrete_medico_whatsapp_v1'),
  setting(METODO_ORGANIZATION_ID, 'solicitacao_acompanhamento_whatsapp', true, 'solicitacao_acompanhamento_whatsapp_v1'),
  setting(METODO_ORGANIZATION_ID, 'calendario_lembrete_whatsapp', true, 'calendario_lembrete_whatsapp_v1'),
  setting(
    METODO_ORGANIZATION_ID,
    'compartilhamento_aceite_whatsapp',
    true,
    'compartilhamento_aceite_whatsapp_v1',
  ),
  setting(CLINICA_EXEMPLO_WL_ID, 'aplicacao_dia_whatsapp', true, 'aplicacao_dia_whatsapp_v1'),
];

export function listAutomationOrganizationSettingsSeed(): AutomationOrganizationSetting[] {
  return [...AUTOMATION_ORGANIZATION_SETTINGS_SEED];
}

export function resolveDefaultTemplateIdForAutomation(automationId: string): string | undefined {
  const templates = listTemplatesByAutomationId(automationId);
  const published = templates.find((item) => item.status === 'published');
  if (published) return published.id;
  return templates[0]?.id;
}

export function mergeAutomationOrganizationSettings(
  firestoreSettings: AutomationOrganizationSetting[],
  organizationId?: string,
): AutomationOrganizationSetting[] {
  const byKey = new Map<string, AutomationOrganizationSetting>();

  for (const seed of AUTOMATION_ORGANIZATION_SETTINGS_SEED) {
    if (organizationId && seed.organizationId !== organizationId) continue;
    byKey.set(buildAutomationOrganizationSettingId(seed.organizationId, seed.automationId), seed);
  }

  for (const row of firestoreSettings) {
    if (organizationId && row.organizationId !== organizationId) continue;
    byKey.set(buildAutomationOrganizationSettingId(row.organizationId, row.automationId), row);
  }

  return Array.from(byKey.values());
}

export function getMergedAutomationOrganizationSetting(
  mergedSettings: AutomationOrganizationSetting[],
  organizationId: string,
  automationId: string,
): AutomationOrganizationSetting | undefined {
  return mergedSettings.find(
    (item) => item.organizationId === organizationId && item.automationId === automationId,
  );
}

export type OrganizationAutomationSummary = {
  organizationId: string;
  enabledCount: number;
  totalAvailable: number;
  whatsappEnabled: number;
  emailEnabled: number;
  governanceStatus: 'ativa' | 'parcial' | 'inativa';
};

export function buildOrganizationAutomationSummary(
  organizationId: string,
  mergedSettings: AutomationOrganizationSetting[],
): OrganizationAutomationSummary {
  const catalog = listAutomationCenterCatalog();
  const orgSettings = mergedSettings.filter(
    (item) => item.organizationId === organizationId && item.enabled,
  );
  const enabledCount = orgSettings.length;
  const totalAvailable = catalog.length;
  const whatsappEnabled = orgSettings.filter((item) => item.channel === 'whatsapp').length;
  const emailEnabled = orgSettings.filter((item) => item.channel === 'email').length;

  let governanceStatus: OrganizationAutomationSummary['governanceStatus'] = 'inativa';
  if (enabledCount === 0) {
    governanceStatus = 'inativa';
  } else if (enabledCount >= Math.ceil(totalAvailable / 2)) {
    governanceStatus = 'ativa';
  } else {
    governanceStatus = 'parcial';
  }

  return {
    organizationId,
    enabledCount,
    totalAvailable,
    whatsappEnabled,
    emailEnabled,
    governanceStatus,
  };
}

export type OrganizationAutomationDetailRow = {
  automationId: string;
  automationName: string;
  channel: AutomationOrganizationSetting['channel'];
  globalStatus: string;
  enabledForOrganization: boolean;
  templateId?: string;
  templateName?: string;
  defaultTemplateId?: string;
  defaultTemplateName?: string;
};

export function listOrganizationAutomationDetails(
  organizationId: string,
  mergedSettings: AutomationOrganizationSetting[],
): OrganizationAutomationDetailRow[] {
  const catalog = listAutomationCenterCatalog();

  return catalog.map((automation) => {
    const orgSetting = getMergedAutomationOrganizationSetting(
      mergedSettings,
      organizationId,
      automation.id,
    );
    const enabledForOrganization = orgSetting?.enabled === true;
    const defaultTemplateId = resolveDefaultTemplateIdForAutomation(automation.id);
    const defaultTemplate = defaultTemplateId ? getAutomationTemplateById(defaultTemplateId) : undefined;
    const templateId = defaultTemplateId ?? orgSetting?.templateId;
    const template = templateId ? getAutomationTemplateById(templateId) : undefined;

    return {
      automationId: automation.id,
      automationName: automation.name,
      channel: automation.channel,
      globalStatus: automation.status,
      enabledForOrganization,
      templateId: enabledForOrganization ? templateId : undefined,
      templateName: enabledForOrganization ? template?.name : undefined,
      defaultTemplateId,
      defaultTemplateName: defaultTemplate?.name,
    };
  });
}

export function organizationGovernanceStatusLabel(
  status: OrganizationAutomationSummary['governanceStatus'],
): string {
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

export function organizationGovernanceStatusTone(
  status: OrganizationAutomationSummary['governanceStatus'],
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
