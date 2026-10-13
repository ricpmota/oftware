import { NextRequest, NextResponse } from 'next/server';
import { requireMetaAdminGeral } from '@/lib/metaadmin/requireMetaAdminGeral';
import {
  rebuildWhatsappAutomationQueueForDoctor,
  rebuildWhatsappAutomationQueueForOrganization,
} from '@/services/whatsappRemindersService';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * POST /api/metaadmingeral/automacoes/whatsapp-queue/rebuild
 * Body opcional: { doctorId?, organizationId? }
 *
 * Reconstrói a fila de lembretes (whatsapp_automation_queue) sob demanda.
 * - doctorId → reconstrói só esse médico.
 * - organizationId (sem doctorId) → reconstrói médicos com lembrete ativo na organização.
 * - vazio → reconstrói todos os médicos com lembrete ativo (uso controlado).
 *
 * NÃO deve ser chamado a cada minuto — é operação pesada (varre pacientes).
 */
export async function POST(request: NextRequest) {
  const auth = await requireMetaAdminGeral(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = (await request.json().catch(() => null)) as {
      doctorId?: string;
      organizationId?: string;
    } | null;

    const doctorId = body?.doctorId?.trim();
    const organizationId = body?.organizationId?.trim();

    if (doctorId) {
      const result = await rebuildWhatsappAutomationQueueForDoctor(doctorId);
      return NextResponse.json({ ok: true, scope: 'doctor', result });
    }

    const result = await rebuildWhatsappAutomationQueueForOrganization(organizationId || undefined);
    return NextResponse.json({
      ok: true,
      scope: organizationId ? 'organization' : 'all',
      result,
    });
  } catch (error) {
    console.error('[metaadmingeral/automacoes/whatsapp-queue/rebuild POST]', error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Erro ao reconstruir a fila de lembretes.',
      },
      { status: 500 },
    );
  }
}
