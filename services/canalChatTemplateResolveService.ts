import { getAutomationTemplateSeedById } from '@/lib/metaadmingeral/automationCenterTemplates';
import {
  resolveDefaultTemplateIdForAutomation,
} from '@/lib/metaadmingeral/automationOrganizationSettings';
import { renderAutomationTemplate } from '@/lib/metaadmingeral/renderAutomationTemplate';
import { METODO_ORGANIZATION_ID } from '@/lib/organization/organizationRegistry';
import { listSettingsByOrganizationId } from '@/services/automationOrganizationSettingsService';
import { getAutomationTemplateById } from '@/services/automationTemplatesService';

/**
 * Resolve o corpo publicado do template de uma automação Canal Chat / cobrança.
 */
export async function resolveCanalChatAutomationTemplate(params: {
  automationId: string;
  organizationId?: string | null;
}): Promise<{ templateId: string; body: string; variables: string[] } | null> {
  const automationId = params.automationId?.trim();
  if (!automationId) return null;

  const organizationId = params.organizationId?.trim() || METODO_ORGANIZATION_ID;
  const orgSettings = await listSettingsByOrganizationId(organizationId);
  const orgSetting = orgSettings.find((item) => item.automationId === automationId);

  const templateId =
    orgSetting?.templateId?.trim() ||
    resolveDefaultTemplateIdForAutomation(automationId);

  if (!templateId) return null;

  const template = await getAutomationTemplateById(templateId);
  if (!template?.body?.trim()) return null;

  const seed = getAutomationTemplateSeedById(templateId);
  if (seed?.body && /\{link\}/.test(template.body) && !/\{link\}/.test(seed.body)) {
    return {
      templateId: template.id,
      body: seed.body,
      variables: seed.variables,
    };
  }

  return {
    templateId: template.id,
    body: template.body,
    variables: template.variables,
  };
}

export function renderCanalChatTemplate(
  body: string,
  variables: Record<string, string>,
): string {
  return renderAutomationTemplate(body, variables).trim();
}
