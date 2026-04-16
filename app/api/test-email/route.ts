import { NextRequest, NextResponse } from 'next/server';
import {
  isZeptoMailConfigured,
  sendEmail,
} from '@/lib/email/transporter';

const SUBJECT = 'Teste ZeptoMail';
const HTML =
  '<h1>Teste ZeptoMail</h1><p>Se você recebeu isso, está funcionando.</p>';

function resolveTo(body: { to?: string } | null): string | null {
  const fromBody = body?.to?.trim();
  if (fromBody) return fromBody;
  const fromEnv = process.env.TEST_EMAIL_TO?.trim();
  return fromEnv || null;
}

export async function GET() {
  const to = resolveTo(null);
  if (!to) {
    return NextResponse.json(
      {
        success: false,
        error:
          'Defina TEST_EMAIL_TO no .env ou envie POST com { "to": "..." }.',
      },
      { status: 400 }
    );
  }
  if (!isZeptoMailConfigured()) {
    return NextResponse.json(
      {
        success: false,
        error:
          'ZeptoMail não configurado. Defina ZEPTOMAIL_SMTP_* e MAIL_FROM.',
      },
      { status: 500 }
    );
  }

  const result = await sendEmail({
    to,
    subject: SUBJECT,
    html: HTML,
    text: 'Teste ZeptoMail. Se você recebeu isso, está funcionando.',
  });

  if (!result.success) {
    return NextResponse.json(
      {
        success: false,
        error: result.error,
        code: result.code,
        provider: 'ZeptoMail',
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    message: 'E-mail de teste enviado.',
    messageId: result.messageId,
    to,
    provider: 'ZeptoMail',
  });
}

export async function POST(request: NextRequest) {
  let body: { to?: string } = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  const to = resolveTo(body);
  if (!to) {
    return NextResponse.json(
      {
        success: false,
        error:
          'Informe "to" no JSON ou defina TEST_EMAIL_TO no ambiente.',
      },
      { status: 400 }
    );
  }
  if (!isZeptoMailConfigured()) {
    return NextResponse.json(
      {
        success: false,
        error:
          'ZeptoMail não configurado. Defina ZEPTOMAIL_SMTP_* e MAIL_FROM.',
      },
      { status: 500 }
    );
  }

  const result = await sendEmail({
    to,
    subject: SUBJECT,
    html: HTML,
    text: 'Teste ZeptoMail. Se você recebeu isso, está funcionando.',
  });

  if (!result.success) {
    return NextResponse.json(
      {
        success: false,
        error: result.error,
        code: result.code,
        provider: 'ZeptoMail',
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    message: 'E-mail de teste enviado.',
    messageId: result.messageId,
    to,
    provider: 'ZeptoMail',
  });
}
