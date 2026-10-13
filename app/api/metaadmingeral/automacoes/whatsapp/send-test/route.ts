import { NextRequest, NextResponse } from 'next/server';
import { requireMetaAdminGeral } from '@/lib/metaadmin/requireMetaAdminGeral';
import {
  sendWhatsappTestMessageForDoctor,
  whatsappTestErrorStatus,
} from '@/services/whatsappSendTestService';
import { WhatsappProviderError } from '@/services/whatsappProviderClient';

export const runtime = 'nodejs';

/**
 * POST /api/metaadmingeral/automacoes/whatsapp/send-test
 * Body: { doctorId, telefone, telefoneDdi, telefonePais, message? }
 *
 * O servidor resolve o número. `phoneIsResolved` e `telefoneE164` do client são ignorados.
 */
export async function POST(request: NextRequest) {
  const auth = await requireMetaAdminGeral(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = (await request.json().catch(() => null)) as {
      doctorId?: string;
      telefone?: string;
      telefoneDdi?: string;
      telefonePais?: string;
      message?: string;
    } | null;

    const doctorId = body?.doctorId?.trim() ?? '';
    const telefone = body?.telefone?.trim() ?? '';
    const telefoneDdi = body?.telefoneDdi?.trim() ?? '';
    const telefonePais = body?.telefonePais?.trim() ?? '';
    const message =
      typeof body?.message === 'string' && body.message.trim()
        ? body.message.trim()
        : 'Teste de envio automático — MetaAdmin Geral (Oftware).';

    const result = await sendWhatsappTestMessageForDoctor({
      doctorId,
      telefone,
      telefoneDdi: telefoneDdi || undefined,
      telefonePais: telefonePais || undefined,
      message,
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error('[metaadmingeral/automacoes/whatsapp/send-test]', error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Erro ao enviar mensagem de teste.',
      },
      { status: error instanceof WhatsappProviderError ? whatsappTestErrorStatus(error) : 500 },
    );
  }
}
