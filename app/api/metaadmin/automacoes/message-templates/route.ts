import { NextRequest, NextResponse } from 'next/server';
import { resolveDefaultTemplateIdForAutomation } from '@/lib/metaadmingeral/automationOrganizationSettings';
import { METODO_ORGANIZATION_ID } from '@/lib/organization/organizationRegistry';
import { requireMedicoMetaadmin } from '@/lib/server/metaadminExamesImagemGate';
import { getWhatsappMedicoContext } from '@/lib/server/whatsappMedicoContext.server';
import { listSettingsByOrganizationId } from '@/services/automationOrganizationSettingsService';
import { getAutomationTemplateById } from '@/services/automationTemplatesService';

export const runtime = 'nodejs';

/**
 * Automações cujo corpo de mensagem é gerenciado no MetaAdminGeral e usado
 * diretamente pelo calendário do MetaAdmin (envio manual pelo médico).
 */
const MANAGED_AUTOMATION_IDS = [
  'aniversario_paciente_whatsapp',
  'conclusao_tratamento_whatsapp',
] as const;

type ResolvedMessageTemplate = {
  templateId: string;
  name: string;
  body: string;
  variables: string[];
  version: number;
};

/**
 * GET /api/metaadmin/automacoes/message-templates
 * Retorna o corpo (editável no MetaAdminGeral) das mensagens de aniversário e
 * conclusão para a organização do médico logado. Somente leitura.
 */
export async function GET(request: NextRequest) {
  const auth = await requireMedicoMetaadmin(request);
  if (!auth.ok) return auth.res;

  try {
    const ctx = await getWhatsappMedicoContext(auth.medicoDocId);
    const organizationId = ctx.organizationId ?? METODO_ORGANIZATION_ID;

    const orgSettings = await listSettingsByOrganizationId(organizationId);
    const templateIdByAutomation = new Map(
      orgSettings.map((item) => [item.automationId, item.templateId]),
    );

    const templates: Record<string, ResolvedMessageTemplate> = {};

    await Promise.all(
      MANAGED_AUTOMATION_IDS.map(async (automationId) => {
        const templateId =
          templateIdByAutomation.get(automationId) ??
          resolveDefaultTemplateIdForAutomation(automationId);
        if (!templateId) return;

        const template = await getAutomationTemplateById(templateId);
        if (!template) return;

        templates[automationId] = {
          templateId: template.id,
          name: template.name,
          body: template.body,
          variables: template.variables,
          version: template.version,
        };
      }),
    );

    return NextResponse.json({ ok: true, organizationId, templates });
  } catch (error) {
    console.error('[metaadmin/automacoes/message-templates GET]', error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Erro ao carregar mensagens.',
      },
      { status: 500 },
    );
  }
}
