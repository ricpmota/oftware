import { NextRequest, NextResponse } from 'next/server';
import { isZeptoMailConfigured, sendEmail } from '@/lib/email/transporter';

export const runtime = 'nodejs';

const MAX_TRANSCRIPT = 80_000;
const MAX_NAME = 120;
const MAX_PHONE = 40;

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function isReason(s: unknown): s is 'idle_5m' | 'whatsapp' {
  return s === 'idle_5m' || s === 'whatsapp';
}

function validNotifyEmail(to: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to);
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      name?: unknown;
      phone?: unknown;
      transcript?: unknown;
      reason?: unknown;
    };

    const name = typeof body.name === 'string' ? body.name.trim().slice(0, MAX_NAME) : '';
    const phone = typeof body.phone === 'string' ? body.phone.trim().slice(0, MAX_PHONE) : '';
    const transcript =
      typeof body.transcript === 'string' ? body.transcript.trim().slice(0, MAX_TRANSCRIPT) : '';
    const reason = body.reason;

    if (!name || !phone) {
      return NextResponse.json({ error: 'Nome e telefone são obrigatórios.' }, { status: 400 });
    }
    if (!transcript) {
      return NextResponse.json({ error: 'Transcrição vazia.' }, { status: 400 });
    }
    if (!isReason(reason)) {
      return NextResponse.json({ error: 'Motivo inválido.' }, { status: 400 });
    }

    const to = process.env.NEXT_PUBLIC_RAFAELA_EMAIL?.trim();
    if (!to || !validNotifyEmail(to)) {
      return NextResponse.json(
        { error: 'Destino não configurado: defina NEXT_PUBLIC_RAFAELA_EMAIL com um e-mail válido.' },
        { status: 503 }
      );
    }

    if (!isZeptoMailConfigured()) {
      return NextResponse.json(
        { error: 'Envio de e-mail não configurado no servidor (ZeptoMail / MAIL_FROM).' },
        { status: 503 }
      );
    }

    const reasonLabel = reason === 'whatsapp' ? 'Clique em WhatsApp' : 'Inatividade (5 min)';
    const subject = `[Landing Rafaela] Chat — ${reasonLabel}`;

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8" /></head>
<body style="font-family:Segoe UI,Arial,sans-serif;line-height:1.5;color:#222;">
  <h2 style="margin:0 0 12px;">Resumo do contato (chat do site)</h2>
  <p><strong>Motivo do envio:</strong> ${escapeHtml(reasonLabel)}</p>
  <p><strong>Nome:</strong> ${escapeHtml(name)}</p>
  <p><strong>Telefone / WhatsApp:</strong> ${escapeHtml(phone)}</p>
  <hr style="border:none;border-top:1px solid #ddd;margin:16px 0;" />
  <h3 style="margin:0 0 8px;">Transcrição</h3>
  <pre style="white-space:pre-wrap;font-size:13px;background:#f7f7f7;padding:12px;border-radius:8px;">${escapeHtml(
    transcript
  )}</pre>
</body>
</html>`.trim();

    const text = `Motivo: ${reasonLabel}\nNome: ${name}\nTelefone: ${phone}\n\n--- Transcrição ---\n${transcript}`;

    const sent = await sendEmail({ to, subject, html, text });

    if (!sent.success) {
      console.error('[api/rafaela/chat-transcript]', sent.error);
      return NextResponse.json({ error: sent.error || 'Falha ao enviar.' }, { status: 502 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[api/rafaela/chat-transcript]', e);
    return NextResponse.json({ error: 'Erro ao processar pedido.' }, { status: 500 });
  }
}
