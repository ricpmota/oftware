import { NextRequest, NextResponse } from 'next/server';
import {
  isZeptoMailConfigured,
  sendEmail,
  verifyZeptoMailConnection,
} from '@/lib/email/transporter';

/**
 * Testa SMTP ZeptoMail (verificação + envio opcional para o próprio MAIL_FROM).
 * Preferência: use GET /api/test-email com TEST_EMAIL_TO ou POST com { "to" }.
 */
export async function GET(request: NextRequest) {
  try {
    if (!isZeptoMailConfigured()) {
      return NextResponse.json(
        {
          success: false,
          error: 'ZeptoMail não configurado',
          provider: 'ZeptoMail',
          hasHost: !!process.env.ZEPTOMAIL_SMTP_HOST,
          hasUser: !!process.env.ZEPTOMAIL_SMTP_USER,
          hasPassword: !!process.env.ZEPTOMAIL_SMTP_PASSWORD,
          hasMailFrom: !!process.env.MAIL_FROM,
        },
        { status: 400 }
      );
    }

    console.log('[test-smtp] Provider: ZeptoMail — verificando SMTP...');
    const verify = await verifyZeptoMailConnection();
    if (!verify.success) {
      return NextResponse.json(
        {
          success: false,
          error: verify.error,
          code: verify.code,
          provider: 'ZeptoMail',
        },
        { status: 500 }
      );
    }

    const testTo =
      request.nextUrl.searchParams.get('to')?.trim() ||
      process.env.MAIL_FROM?.replace(/^[^<]*<([^>]+)>$/, '$1')?.trim() ||
      process.env.MAIL_FROM?.trim();

    if (!testTo || !testTo.includes('@')) {
      return NextResponse.json({
        success: true,
        message: 'Conexão SMTP ZeptoMail verificada. Passe ?to=email para enviar teste.',
        provider: 'ZeptoMail',
      });
    }

    const sent = await sendEmail({
      to: testTo,
      subject: 'Teste SMTP ZeptoMail - Oftware',
      html: '<p>Teste de envio via ZeptoMail (rota legada test-smtp-connection).</p>',
      text: 'Teste de envio via ZeptoMail.',
    });

    if (!sent.success) {
      return NextResponse.json(
        {
          success: false,
          error: sent.error,
          code: sent.code,
          provider: 'ZeptoMail',
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'SMTP ZeptoMail verificado e e-mail de teste enviado.',
      messageId: sent.messageId,
      to: testTo,
      provider: 'ZeptoMail',
    });
  } catch (error: unknown) {
    const e = error as { message?: string; code?: string };
    console.error('[test-smtp] ZeptoMail erro:', e);
    return NextResponse.json(
      {
        success: false,
        error: e.message || 'Erro desconhecido',
        code: e.code,
        provider: 'ZeptoMail',
      },
      { status: 500 }
    );
  }
}
