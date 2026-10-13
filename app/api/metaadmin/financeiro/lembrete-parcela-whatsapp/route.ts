import { NextRequest, NextResponse } from 'next/server';
import {
  requireMedicoMetaadmin,
  requireMedicoPacienteMetaadmin,
} from '@/lib/server/metaadminExamesImagemGate';
import { CANAL_CHAT_OWNER_ID } from '@/lib/whatsapp/canalChatOwner';
import { getWhatsappConnectionByDoctor } from '@/services/whatsappConnectionService';
import { sendLembreteParcelaWhatsapp, type LembreteParcelaVia } from '@/services/lembreteParcelaWhatsappService';
import { WhatsappProviderError } from '@/services/whatsappProviderClient';
import { whatsappTestErrorStatus } from '@/services/whatsappSendTestService';

export const runtime = 'nodejs';
export const maxDuration = 60;

/** GET — conexão do médico e do Setor Financeiro, sem expor o nome interno do canal. */
export async function GET(request: NextRequest) {
  const auth = await requireMedicoMetaadmin(request);
  if (!auth.ok) return auth.res;

  try {
    const [medico, setor] = await Promise.all([
      getWhatsappConnectionByDoctor(auth.medicoDocId),
      getWhatsappConnectionByDoctor(CANAL_CHAT_OWNER_ID),
    ]);
    return NextResponse.json({
      ok: true,
      medicoConnected: medico?.status === 'connected',
      setorFinanceiroConnected: setor?.status === 'connected',
    });
  } catch (error) {
    console.error('[metaadmin/financeiro/lembrete-parcela-whatsapp] status', error);
    return NextResponse.json(
      { ok: false, error: 'Não foi possível consultar as conexões.' },
      { status: 500 },
    );
  }
}

/**
 * POST /api/metaadmin/financeiro/lembrete-parcela-whatsapp
 * Body: { pacienteId, message, via: 'medico' | 'canal_chat' }
 */
export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as {
    pacienteId?: string;
    message?: string;
    via?: string;
  } | null;

  const pacienteId = body?.pacienteId?.trim() ?? '';
  const message = typeof body?.message === 'string' ? body.message.trim() : '';
  const via: LembreteParcelaVia | null =
    body?.via === 'medico' || body?.via === 'canal_chat' ? body.via : null;

  if (!pacienteId) {
    return NextResponse.json({ ok: false, error: 'pacienteId é obrigatório.' }, { status: 400 });
  }
  if (!message) {
    return NextResponse.json({ ok: false, error: 'Informe a mensagem.' }, { status: 400 });
  }
  if (!via) {
    return NextResponse.json({ ok: false, error: 'Escolha quem envia a mensagem.' }, { status: 400 });
  }

  const auth = await requireMedicoPacienteMetaadmin(request, pacienteId);
  if (!auth.ok) return auth.res;

  try {
    const result = await sendLembreteParcelaWhatsapp({
      medicoId: auth.medicoDocId,
      pacienteId,
      message,
      via,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error('[metaadmin/financeiro/lembrete-parcela-whatsapp]', error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Não foi possível enviar a mensagem.',
      },
      { status: error instanceof WhatsappProviderError ? whatsappTestErrorStatus(error) : 500 },
    );
  }
}
