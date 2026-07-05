import { NextRequest, NextResponse } from 'next/server';
import { logIncomingInstagramMessages, parseJsonSafe } from '@/lib/instagram/webhookMessaging';
import { sendInstagramMessage } from '@/lib/instagram/sendInstagramMessage';

/** Webhook Meta/Instagram — sem persistência nem respostas automáticas nesta fase. */
export const dynamic = 'force-dynamic';
const AUTO_REPLY_TEXT = 'Olá! Recebi sua mensagem. Em instantes vou te ajudar 😊';

export async function GET(request: NextRequest) {
  const mode = request.nextUrl.searchParams.get('hub.mode');
  const verifyToken = request.nextUrl.searchParams.get('hub.verify_token');
  const challenge = request.nextUrl.searchParams.get('hub.challenge');

  const expected = process.env.META_WEBHOOK_VERIFY_TOKEN;

  if (
    mode === 'subscribe' &&
    expected != null &&
    expected !== '' &&
    verifyToken === expected &&
    challenge != null &&
    challenge !== ''
  ) {
    return new NextResponse(challenge, {
      status: 200,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }

  return new NextResponse(null, { status: 403 });
}

export async function POST(request: NextRequest) {
  try {
    const raw = await request.text();
    const payload = parseJsonSafe(raw);
    if (payload === null) {
      console.error('[instagram/webhook] POST body is not valid JSON');
    } else {
      const incomingMessages = logIncomingInstagramMessages(payload);

      for (const message of incomingMessages) {
        if (!message.messageText.trim()) continue;

        await sendInstagramMessage(message.senderId, AUTO_REPLY_TEXT);
      }
    }
  } catch (e) {
    console.error('[instagram/webhook] POST read error:', e);
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
