import { getAutomationDoctorSetting } from '@/services/automationDoctorSettingsService';
import { resolveCanalChatAutomationTemplate } from '@/services/canalChatTemplateResolveService';
import { listSettingsByOrganizationId } from '@/services/automationOrganizationSettingsService';
import { isMedicoEventAutomationId } from '@/lib/whatsapp/canalChatTemplates';
import { getWhatsappMedicoContext } from '@/lib/server/whatsappMedicoContext.server';

export async function isMedicoEventAutomationEnabled(params: {
  medicoId: string;
  automationId: string;
  organizationId?: string | null;
}): Promise<boolean> {
  const automationId = params.automationId.trim();
  const medicoId = params.medicoId.trim();
  if (!automationId || !medicoId) return false;

  const organizationId =
    params.organizationId?.trim() ||
    (await getWhatsappMedicoContext(medicoId).catch(() => null))?.organizationId;
  if (organizationId) {
    const orgSettings = await listSettingsByOrganizationId(organizationId);
    const org = orgSettings.find((item) => item.automationId === automationId);
    if (org && org.enabled !== true) return false;
  }

  const setting = await getAutomationDoctorSetting(medicoId, automationId);
  if (!setting) return isMedicoEventAutomationId(automationId);
  return setting.enabled === true;
}

export async function resolveMedicoAutomationTemplate(params: {
  automationId: string;
  medicoId: string;
  organizationId?: string | null;
}): Promise<{ body: string; variables: string[]; source: 'doctor' | 'org' } | null> {
  const automationId = params.automationId.trim();
  const medicoId = params.medicoId.trim();
  if (!automationId || !medicoId) return null;

  const [doctorSetting, orgTemplate] = await Promise.all([
    getAutomationDoctorSetting(medicoId, automationId),
    resolveCanalChatAutomationTemplate({
      automationId,
      organizationId: params.organizationId,
    }),
  ]);

  const doctorBody = doctorSetting?.templateBody?.trim();
  if (doctorBody) {
    return {
      body: doctorBody,
      variables: orgTemplate?.variables ?? [],
      source: 'doctor',
    };
  }
  if (!orgTemplate?.body?.trim()) return null;
  return { body: orgTemplate.body, variables: orgTemplate.variables, source: 'org' };
}
