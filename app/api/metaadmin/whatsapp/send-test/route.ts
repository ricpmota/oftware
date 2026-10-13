import { NextRequest, NextResponse } from 'next/server';
import { requireMedicoMetaadmin } from '@/lib/server/metaadminExamesImagemGate';
import {
  sendWhatsappTestMessageForDoctor,
  whatsappTestErrorStatus,
} from '@/services/whatsappSendTestService';
import { WhatsappProviderError } from '@/services/whatsappProviderClient';

export const runtime = 'nodejs';

/**
 * POST /api/metaadmin/whatsapp/send-test
 *
 * A tela manual da Central foi descontinuada (`WhatsappMessageLogPanel`).
 * A rota permanece viva: aceita o contrato internacional (telefone + DDI)
 * e o legado `{ phone }` (BR-only). O servidor resolve; `phoneIsResolved`
 * e `telefoneE164` do client são ignorados.
 */
export async function POST(request: NextRequest) {
  const auth = await requireMedicoMetaadmin(request);
  if (!auth.ok) return auth.res;

  const body = (await request.json().catch(() => null)) as {
    phone?: string;
    telefone?: string;
    telefoneDdi?: string;
    telefonePais?: string;
    message?: string;
  } | null;

  const telefone = typeof body?.telefone === 'string' ? body.telefone.trim() : '';
  const phone = typeof body?.phone === 'string' ? body.phone.trim() : '';
  const telefoneDdi = typeof body?.telefoneDdi === 'string' ? body.telefoneDdi.trim() : '';
  const telefonePais = typeof body?.telefonePais === 'string' ? body.telefonePais.trim() : '';
  const message =
    typeof body?.message === 'string' && body.message.trim()
      ? body.message.trim()
      : 'Teste de envio automático — Oftware.';

  try {
    const result = await sendWhatsappTestMessageForDoctor({
      doctorId: auth.medicoDocId,
      telefone: telefone || undefined,
      telefoneDdi: telefoneDdi || undefined,
      telefonePais: telefonePais || undefined,
      phone: phone || undefined,
      message,
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error('[metaadmin/whatsapp/send-test]', error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Erro ao enviar mensagem de teste.',
      },
      { status: error instanceof WhatsappProviderError ? whatsappTestErrorStatus(error) : 500 },
    );
  }
}
