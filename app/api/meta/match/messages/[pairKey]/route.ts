import { NextRequest, NextResponse } from 'next/server';
import type { MatchChatAttachment } from '@/lib/match/matchChat';
import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import { uploadMatchChatFile } from '@/lib/server/matchChatFile';
import { readMatchThread, sendMatchChatMessage } from '@/lib/server/matchChatAdmin';
import { requireMatchUid } from '@/lib/server/matchApiAuth';

export const runtime = 'nodejs';

export async function GET(request: NextRequest, context: { params: Promise<{ pairKey: string }> }) {
  const auth = await requireMatchUid(request);
  if (auth instanceof NextResponse) return auth;
  const { pairKey } = await context.params;
  const before = Number(request.nextUrl.searchParams.get('before'));
  try {
    const result = await readMatchThread(getFirestoreAdmin(), auth.uid, pairKey, Number.isFinite(before) ? before : undefined);
    if (!result.ok) return NextResponse.json({ ok: false, code: result.code }, { status: 403 });
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ ok: false, error: 'Não foi possível abrir a conversa.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, context: { params: Promise<{ pairKey: string }> }) {
  const auth = await requireMatchUid(request);
  if (auth instanceof NextResponse) return auth;
  const { pairKey } = await context.params;
  const contentType = request.headers.get('content-type') || '';
  let text = '';
  let clientMessageId = '';
  let attachment: MatchChatAttachment | undefined;
  try {
    if (contentType.includes('multipart/form-data')) {
      const form = await request.formData();
      text = String(form.get('text') || '');
      clientMessageId = String(form.get('clientMessageId') || '');
      const file = form.get('file');
      if (file instanceof File && file.size > 0) {
        const uploaded = await uploadMatchChatFile(auth.uid, pairKey, clientMessageId, file);
        if (!uploaded.ok) return NextResponse.json({ ok: false, error: uploaded.error }, { status: 400 });
        attachment = uploaded.attachment;
      }
    } else {
      const body = (await request.json().catch(() => null)) as { text?: string; clientMessageId?: string } | null;
      text = body?.text || '';
      clientMessageId = body?.clientMessageId || '';
    }
    const result = await sendMatchChatMessage(getFirestoreAdmin(), auth.uid, pairKey, text, clientMessageId, attachment);
    if (!result.ok) {
      const status = result.code === 'invalid' ? 400 : 403;
      return NextResponse.json({ ok: false, code: result.code }, { status });
    }
    return NextResponse.json({ ok: true, message: result.message });
  } catch {
    return NextResponse.json({ ok: false, error: 'Não foi possível enviar.' }, { status: 500 });
  }
}
