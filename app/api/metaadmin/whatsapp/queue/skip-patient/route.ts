import { NextRequest, NextResponse } from 'next/server';
import { requireMedicoMetaadmin } from '@/lib/server/metaadminExamesImagemGate';
import { skipWhatsappQueueItemsForPatient } from '@/services/whatsappAutomationQueueService';
import { WHATSAPP_QUEUE_SKIP_PACIENTE_FORA_DO_QUADRO } from '@/lib/whatsapp/whatsappQueuePatientGuard';

export const runtime = 'nodejs';

/**
 * POST /api/metaadmin/whatsapp/queue/skip-patient
 * Body: { pacienteId }
 * Tira da fila de envios automáticos os itens deste paciente neste médico.
 */
export async function POST(request: NextRequest) {
  const auth = await requireMedicoMetaadmin(request);
  if (!auth.ok) return auth.res;

  const body = (await request.json().catch(() => null)) as { pacienteId?: string } | null;
  const pacienteId = typeof body?.pacienteId === 'string' ? body.pacienteId.trim() : '';
  if (!pacienteId) {
    return NextResponse.json({ ok: false, error: 'Paciente inválido.' }, { status: 400 });
  }

  try {
    const result = await skipWhatsappQueueItemsForPatient({
      patientId: pacienteId,
      doctorId: auth.medicoDocId,
      reason: WHATSAPP_QUEUE_SKIP_PACIENTE_FORA_DO_QUADRO,
    });
    return NextResponse.json({ ok: true, skipped: result.skipped });
  } catch (error) {
    console.error('[metaadmin/whatsapp/queue/skip-patient]', error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Erro ao limpar a fila.' },
      { status: 500 },
    );
  }
}
