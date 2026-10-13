import { listAutomationCenterCatalog } from '@/lib/metaadmingeral/automationCenterCatalog';
import { channelLabel } from '@/lib/metaadmingeral/automationCenterLabels';
import {
  listAllAutomationDoctorSettings,
  resolveSettingProfessionalRole,
} from '@/services/automationDoctorSettingsService';
import { listAutomationOrganizationSettings } from '@/services/automationOrganizationSettingsService';
import { listAutomationTemplates } from '@/services/automationTemplatesService';
import type {
  AutomationChannel,
  AutomationDashboardDto,
  AutomationDashboardGovernanceDto,
} from '@/types/automationCenter';

const ALL_CHANNELS: AutomationChannel[] = ['whatsapp', 'email', 'push', 'sms', 'voice_ai'];

/** Só Aniversário e Pagamento contam no card de nutri/personal (Lembretes/Relacionamento são sempre on). */
const PROFESSIONAL_TOGGLE_AUTOMATION_IDS = new Set([
  'aniversario_paciente_whatsapp',
  'cobranca_automatica_whatsapp',
]);

export async function getAutomationDashboardMetrics(): Promise<AutomationDashboardDto> {
  const [catalog, templates, organizationSettings, doctorSettings] = await Promise.all([
    Promise.resolve(listAutomationCenterCatalog()),
    listAutomationTemplates(),
    listAutomationOrganizationSettings(),
    listAllAutomationDoctorSettings(),
  ]);

  const catalogTotal = catalog.length;
  const globalActiveAutomations = catalog.filter((item) => item.status === 'active').length;

  const templatesTotal = templates.length;
  const publishedTemplates = templates.filter((item) => item.status === 'published').length;

  const enabledOrganizationSettings = organizationSettings.filter((item) => item.enabled);
  const organizationReleasesTotal = enabledOrganizationSettings.length;
  const organizationsWithAutomations = new Set(
    enabledOrganizationSettings.map((item) => item.organizationId),
  ).size;

  const enabledSettings = doctorSettings.filter((item) => item.enabled);
  const enabledDoctorSettings = enabledSettings.filter(
    (item) => resolveSettingProfessionalRole(item) === 'medico',
  );
  const enabledNutriSettings = enabledSettings.filter(
    (item) =>
      resolveSettingProfessionalRole(item) === 'nutricionista' &&
      PROFESSIONAL_TOGGLE_AUTOMATION_IDS.has(item.automationId),
  );
  const enabledPersonalSettings = enabledSettings.filter(
    (item) =>
      resolveSettingProfessionalRole(item) === 'personal_trainer' &&
      PROFESSIONAL_TOGGLE_AUTOMATION_IDS.has(item.automationId),
  );

  const doctorActivationsTotal = enabledDoctorSettings.length;
  const doctorsWithAutomations = new Set(enabledDoctorSettings.map((item) => item.doctorId)).size;
  const nutricionistaActivationsTotal = enabledNutriSettings.length;
  const nutricionistasWithAutomations = new Set(
    enabledNutriSettings.map((item) => item.doctorId),
  ).size;
  const personalActivationsTotal = enabledPersonalSettings.length;
  const personalWithAutomations = new Set(
    enabledPersonalSettings.map((item) => item.doctorId),
  ).size;

  const automationCountByChannel = new Map<AutomationChannel, number>();
  for (const channel of ALL_CHANNELS) {
    automationCountByChannel.set(channel, 0);
  }
  for (const automation of catalog) {
    automationCountByChannel.set(
      automation.channel,
      (automationCountByChannel.get(automation.channel) ?? 0) + 1,
    );
  }

  const channels = ALL_CHANNELS.map((channel) => ({
    channel,
    label: channelLabel(channel),
    automationCount: automationCountByChannel.get(channel) ?? 0,
  }));

  const governance: AutomationDashboardGovernanceDto = {
    catalogLoaded: catalogTotal > 0,
    templatesLoaded: templatesTotal > 0,
    organizationReleaseActive: organizationReleasesTotal > 0,
    doctorActivationActive: doctorActivationsTotal > 0,
    // WhatsApp da jornada (dia, D-1, atrasada, aniversário, conclusão) já dispara com base neste hub.
    realSendingIntegrated: true,
  };

  return {
    catalogTotal,
    globalActiveAutomations,
    templatesTotal,
    publishedTemplates,
    organizationsWithAutomations,
    organizationReleasesTotal,
    doctorActivationsTotal,
    doctorsWithAutomations,
    nutricionistaActivationsTotal,
    nutricionistasWithAutomations,
    personalActivationsTotal,
    personalWithAutomations,
    channels,
    governance,
  };
}
