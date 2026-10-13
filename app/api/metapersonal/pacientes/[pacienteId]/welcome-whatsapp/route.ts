import { NextRequest, NextResponse } from 'next/server';
import { requirePersonalMetaPersonal } from '@/lib/metapersonal/requirePersonalMetaPersonal';
import {
  PersonalWelcomeWhatsappError,
  buildPersonalWelcomePayload,
  sendPersonalWelcomeWhatsapp,
} from '@/lib/personal/agenda/personalWelcomeWhatsappService';

export const runtime = 'nodejs';
export const maxDuration = 60;

function errorStatus(error: PersonalWelcomeWhatsappError): number {
  if (error.code === 'not_linked') return 403;
  if (error.code === 'no_phone') return 400;
  if (error.code === 'disconnected') return 409;
  return 502;
}

function jsonError(error: unknown) {
  if (error instanceof PersonalWelcomeWhatsappError) {
    return NextResponse.json(
      { ok: false, error: error.message, code: error.code },
      { status: errorStatus(error) }
    );
  }
  console.error('[metapersonal/welcome-whatsapp]', error);
  return NextResponse.json(
    { ok: false, error: error instanceof Error ? error.message : 'Erro ao preparar a mensagem.' },
    { status: 500 }
  );
}

/**
 * GET — prévia da mensagem de boas-vindas (mesmo texto do aceite de vínculo).
 * POST — envia pelo WhatsApp conectado do personal.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ pacienteId: string }> }
) {
  const auth = await requirePersonalMetaPersonal(request);
  if (auth instanceof NextResponse) return auth;

  const pacienteId = String((await params).pacienteId || '').trim();
  if (!pacienteId) {
    return NextResponse.json({ ok: false, error: 'Paciente inválido.' }, { status: 400 });
  }

  try {
    const payload = await buildPersonalWelcomePayload(auth.uid, pacienteId);
    return NextResponse.json({ ok: true, ...payload });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ pacienteId: string }> }
) {
  const auth = await requirePersonalMetaPersonal(request);
  if (auth instanceof NextResponse) return auth;

  const pacienteId = String((await params).pacienteId || '').trim();
  if (!pacienteId) {
    return NextResponse.json({ ok: false, error: 'Paciente inválido.' }, { status: 400 });
  }

  try {
    const payload = await sendPersonalWelcomeWhatsapp(auth.uid, pacienteId);
    return NextResponse.json({ ok: true, phone: payload.phone });
  } catch (error) {
    return jsonError(error);
  }
}
