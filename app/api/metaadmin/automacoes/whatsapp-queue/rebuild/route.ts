import { NextRequest, NextResponse } from 'next/server';
import { requireMedicoMetaadmin } from '@/lib/server/metaadminExamesImagemGate';
import { rebuildWhatsappAutomationQueueForDoctor } from '@/services/whatsappRemindersService';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * POST /api/metaadmin/automacoes/whatsapp-queue/rebuild
 * Reconstrói a fila WhatsApp (inclui aplicação do dia d0) do médico logado.
 */
export async function POST(request: NextRequest) {
  const auth = await requireMedicoMetaadmin(request);
  if (!auth.ok) return auth.res;

  try {
    const result = await rebuildWhatsappAutomationQueueForDoctor(auth.medicoDocId);
    return NextResponse.json({ ok: true, scope: 'doctor', result });
  } catch (error) {
    console.error('[metaadmin/automacoes/whatsapp-queue/rebuild POST]', error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Erro ao reconstruir a fila WhatsApp.',
      },
      { status: 500 },
    );
  }
}
