import { NextRequest, NextResponse } from 'next/server';
import { METODO_ORGANIZATION_ID } from '@/lib/organization/organizationRegistry';
import { requireNutricionistaWhatsapp } from '@/lib/server/profissionalWhatsappGate';
import {
  listProfessionalAutomationCards,
  upsertAutomationDoctorSetting,
} from '@/services/automationDoctorSettingsService';
import {
  ANIVERSARIO_AUTOMATION_ID,
  rebuildWhatsappAutomationQueueForDoctor,
} from '@/services/whatsappRemindersService';
import { NUTRI_CHECKIN_WHATSAPP_AUTOMATION_ID } from '@/lib/nutri/checkInSemanalNutriWhatsApp';

export const runtime = 'nodejs';

const WHATSAPP_QUEUE_AUTOMATION_IDS = new Set<string>([
  ANIVERSARIO_AUTOMATION_ID,
  NUTRI_CHECKIN_WHATSAPP_AUTOMATION_ID,
]);

/**
 * GET /api/metanutri/automacoes/settings
 */
export async function GET(request: NextRequest) {
  const auth = await requireNutricionistaWhatsapp(request);
  if (!auth.ok) return auth.res;

  try {
    const organizationId = auth.owner.organizationId ?? METODO_ORGANIZATION_ID;
    const ownerId = auth.owner.uid;
    const automations = await listProfessionalAutomationCards(
      ownerId,
      organizationId,
      'nutricionista',
    );

    return NextResponse.json({
      ok: true,
      doctorId: ownerId,
      organizationId,
      role: 'nutricionista',
      automations,
    });
  } catch (error) {
    console.error('[metanutri/automacoes/settings GET]', error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Erro ao carregar automações.',
      },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/metanutri/automacoes/settings
 * Body: { automationId, enabled?, horario? }
 */
export async function PUT(request: NextRequest) {
  const auth = await requireNutricionistaWhatsapp(request);
  if (!auth.ok) return auth.res;

  try {
    const body = (await request.json().catch(() => null)) as {
      automationId?: string;
      enabled?: boolean;
      horario?: string;
    } | null;

    const automationId = body?.automationId?.trim();
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

    if (body?.enabled === undefined && body?.horario === undefined) {
      return NextResponse.json(
        { ok: false, error: 'Informe enabled e/ou horario.' },
        { status: 400 },
      );
    }

    const organizationId = auth.owner.organizationId ?? METODO_ORGANIZATION_ID;
    const ownerId = auth.owner.uid;

    const setting = await upsertAutomationDoctorSetting({
      doctorId: ownerId,
      organizationId,
      automationId,
      enabled: body.enabled,
      horario: body.horario,
      updatedBy: auth.owner.uid,
      professionalRole: 'nutricionista',
    });

    let queueRebuild:
      | { doctorId: string; automations: number; patientsScanned: number; enqueued: number; updated: number }
      | undefined;
    if (
      WHATSAPP_QUEUE_AUTOMATION_IDS.has(automationId) &&
      (body.horario !== undefined || body.enabled !== undefined)
    ) {
      queueRebuild = await rebuildWhatsappAutomationQueueForDoctor(ownerId, {
        professionalRole: 'nutricionista',
      });
    }

    const automations = await listProfessionalAutomationCards(
      ownerId,
      organizationId,
      'nutricionista',
    );

    return NextResponse.json({
      ok: true,
      setting,
      automations,
      queueRebuild,
    });
  } catch (error) {
    console.error('[metanutri/automacoes/settings PUT]', error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Erro ao salvar automação.',
      },
      { status: 400 },
    );
  }
}
