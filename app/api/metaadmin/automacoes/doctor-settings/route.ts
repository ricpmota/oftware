import { NextRequest, NextResponse } from 'next/server';
import { METODO_ORGANIZATION_ID } from '@/lib/organization/organizationRegistry';
import { updateMedicoAgendaSettings } from '@/lib/metaadmin/agenda/agendaSettingsService';
import { CONSULTA_CONFIRMACAO_LEGACY_VARIABLE_NAMES } from '@/lib/metaadmin/agenda/consultaMessageTemplates';
import { resolveDefaultTemplateIdForAutomation } from '@/lib/metaadmingeral/automationOrganizationSettings';
import { findDisallowedTemplateVariable } from '@/lib/metaadmingeral/renderAutomationTemplate';
import { requireMedicoMetaadmin } from '@/lib/server/metaadminExamesImagemGate';
import { getWhatsappMedicoContext } from '@/lib/server/whatsappMedicoContext.server';
import { CONSULTA_CONFIRMACAO_AUTOMATION_ID } from '@/lib/whatsapp/canalChatTemplates';
import {
  listDoctorAutomationCards,
  upsertAutomationDoctorSetting,
} from '@/services/automationDoctorSettingsService';
import { listSettingsByOrganizationId } from '@/services/automationOrganizationSettingsService';
import { getAutomationTemplateById } from '@/services/automationTemplatesService';
import {
  APLICACAO_DIA_WHATSAPP_AUTOMATION_ID,
  syncLegacyAutoAplicacaoFromDoctorSettings,
} from '@/lib/whatsapp/autoAplicacaoAuthorization.server';
import { updateWhatsappAutoAplicacaoSettings } from '@/services/whatsappConnectionService';
import {
  APLICACAO_ATRASADA_AUTOMATION_ID,
  APLICACAO_D1_AUTOMATION_ID,
  ANIVERSARIO_AUTOMATION_ID,
  CONCLUSAO_AUTOMATION_ID,
  INJETAVEL_D1_WHATSAPP_AUTOMATION_ID,
  INJETAVEL_DIA_WHATSAPP_AUTOMATION_ID,
  rebuildWhatsappAutomationQueueForDoctor,
} from '@/services/whatsappRemindersService';

export const runtime = 'nodejs';

const WHATSAPP_QUEUE_AUTOMATION_IDS = new Set<string>([
  APLICACAO_DIA_WHATSAPP_AUTOMATION_ID,
  APLICACAO_D1_AUTOMATION_ID,
  APLICACAO_ATRASADA_AUTOMATION_ID,
  INJETAVEL_DIA_WHATSAPP_AUTOMATION_ID,
  INJETAVEL_D1_WHATSAPP_AUTOMATION_ID,
  ANIVERSARIO_AUTOMATION_ID,
  CONCLUSAO_AUTOMATION_ID,
]);

/**
 * GET /api/metaadmin/automacoes/doctor-settings
 * Automações liberadas pela organização e ativação do médico logado.
 */
export async function GET(request: NextRequest) {
  const auth = await requireMedicoMetaadmin(request);
  if (!auth.ok) return auth.res;

  try {
    const ctx = await getWhatsappMedicoContext(auth.medicoDocId);
    const organizationId = ctx.organizationId ?? METODO_ORGANIZATION_ID;
    const automations = await listDoctorAutomationCards(auth.medicoDocId, organizationId);

    return NextResponse.json({
      ok: true,
      doctorId: auth.medicoDocId,
      organizationId,
      automations,
    });
  } catch (error) {
    console.error('[metaadmin/automacoes/doctor-settings GET]', error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Erro ao carregar automações do médico.',
      },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/metaadmin/automacoes/doctor-settings
 * Body: { automationId, enabled?, horario?, templateBody? } — informar ao menos um campo.
 */
export async function PUT(request: NextRequest) {
  const auth = await requireMedicoMetaadmin(request);
  if (!auth.ok) return auth.res;

  try {
    const body = (await request.json().catch(() => null)) as {
      automationId?: string;
      enabled?: boolean;
      horario?: string;
      templateBody?: string;
    } | null;

    if (!body) {
      return NextResponse.json({ ok: false, error: 'Body inválido.' }, { status: 400 });
    }

    const automationId = body.automationId?.trim();
    if (!automationId) {
      return NextResponse.json(
        { ok: false, error: 'automationId é obrigatório.' },
        { status: 400 },
      );
    }

    if (body?.enabled !== undefined && typeof body.enabled !== 'boolean') {
      return NextResponse.json(
        { ok: false, error: 'enabled deve ser boolean.' },
        { status: 400 },
      );
    }

    if (body?.horario !== undefined && typeof body.horario !== 'string') {
      return NextResponse.json(
        { ok: false, error: 'horario deve ser string HH:mm.' },
        { status: 400 },
      );
    }

    if (body?.templateBody !== undefined && typeof body.templateBody !== 'string') {
      return NextResponse.json(
        { ok: false, error: 'templateBody deve ser string.' },
        { status: 400 },
      );
    }

    if (
      body?.enabled === undefined &&
      body?.horario === undefined &&
      body?.templateBody === undefined
    ) {
      return NextResponse.json(
        { ok: false, error: 'Informe enabled, horario e/ou templateBody.' },
        { status: 400 },
      );
    }

    const ctx = await getWhatsappMedicoContext(auth.medicoDocId);
    const organizationId = ctx.organizationId ?? METODO_ORGANIZATION_ID;

    if (typeof body.templateBody === 'string' && body.templateBody.trim()) {
      const orgSettings = await listSettingsByOrganizationId(organizationId);
      const orgSetting = orgSettings.find((item) => item.automationId === automationId);
      const templateId =
        orgSetting?.templateId ?? resolveDefaultTemplateIdForAutomation(automationId);
      const template = templateId ? await getAutomationTemplateById(templateId) : undefined;
      const allowed = [
        ...(template?.variables ?? []),
        ...(automationId === CONSULTA_CONFIRMACAO_AUTOMATION_ID
          ? CONSULTA_CONFIRMACAO_LEGACY_VARIABLE_NAMES
          : []),
      ];
      const invalid = findDisallowedTemplateVariable(body.templateBody, allowed);
      if (invalid) {
        return NextResponse.json({ ok: false, error: invalid }, { status: 400 });
      }
    }

    const setting = await upsertAutomationDoctorSetting({
      doctorId: auth.medicoDocId,
      organizationId,
      automationId,
      enabled: body.enabled,
      horario: body.horario,
      templateBody: body.templateBody,
      updatedBy: auth.uid,
    });

    if (
      automationId === CONSULTA_CONFIRMACAO_AUTOMATION_ID &&
      typeof body.templateBody === 'string' &&
      body.templateBody.trim()
    ) {
      await updateMedicoAgendaSettings(auth.medicoDocId, {
        welcomeMessageTemplate: body.templateBody,
      }).catch(() => undefined);
    }

    // A automação "Aplicação no dia" é enviada pela fila WhatsApp
    // (cron send-whatsapp-lembretes). Espelhamos flap + horário na conexão
    // só para o painel legado e o cutover de dedup.
    if (automationId === APLICACAO_DIA_WHATSAPP_AUTOMATION_ID) {
      await syncLegacyAutoAplicacaoFromDoctorSettings(auth.medicoDocId);
      if (setting.horario) {
        await updateWhatsappAutoAplicacaoSettings(auth.medicoDocId, {
          autoAplicacaoHorario: setting.horario,
        });
      }
    }

    // Sempre que o médico muda toggle/horário de uma automação WhatsApp da fila,
    // recompõe pendências para refletir imediatamente o novo horário do dia.
    let queueRebuild:
      | { doctorId: string; automations: number; patientsScanned: number; enqueued: number; updated: number }
      | undefined;
    if (
      WHATSAPP_QUEUE_AUTOMATION_IDS.has(automationId) &&
      (body.horario !== undefined || body.enabled !== undefined)
    ) {
      queueRebuild = await rebuildWhatsappAutomationQueueForDoctor(auth.medicoDocId);
    }

    const automations = await listDoctorAutomationCards(auth.medicoDocId, organizationId);

    return NextResponse.json({
      ok: true,
      setting,
      automations,
      queueRebuild,
    });
  } catch (error) {
    console.error('[metaadmin/automacoes/doctor-settings PUT]', error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Erro ao salvar automação do médico.',
      },
      { status: 400 },
    );
  }
}
