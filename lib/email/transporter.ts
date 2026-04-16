import nodemailer, { Transporter } from 'nodemailer';

const EMAIL_PROVIDER = 'ZeptoMail' as const;

let transporter: Transporter | null = null;

export function isZeptoMailConfigured(): boolean {
  return Boolean(
    process.env.ZEPTOMAIL_SMTP_HOST?.trim() &&
      process.env.ZEPTOMAIL_SMTP_USER?.trim() &&
      process.env.ZEPTOMAIL_SMTP_PASSWORD?.trim() &&
      process.env.MAIL_FROM?.trim()
  );
}

function getSmtpPort(): number {
  const raw = process.env.ZEPTOMAIL_SMTP_PORT;
  const n = raw ? parseInt(raw, 10) : 587;
  return Number.isFinite(n) && n > 0 ? n : 587;
}

/**
 * Transporter singleton (ZeptoMail SMTP). Não recria a cada envio.
 */
export function getZeptoMailTransporter(): Transporter {
  if (!isZeptoMailConfigured()) {
    throw new Error(
      'ZeptoMail SMTP não configurado: defina ZEPTOMAIL_SMTP_HOST, ZEPTOMAIL_SMTP_USER, ZEPTOMAIL_SMTP_PASSWORD e MAIL_FROM'
    );
  }
  if (!transporter) {
    const port = getSmtpPort();
    const host = process.env.ZEPTOMAIL_SMTP_HOST!.trim();
    transporter = nodemailer.createTransport({
      host,
      port,
      secure: false,
      auth: {
        user: process.env.ZEPTOMAIL_SMTP_USER!.trim(),
        pass: process.env.ZEPTOMAIL_SMTP_PASSWORD!.trim(),
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 10000,
    });
    console.log(
      `[email] Provider: ${EMAIL_PROVIDER} | host=${host} | port=${port}`
    );
  }
  return transporter;
}

export type SendEmailParams = {
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
};

export type SendEmailResult =
  | { success: true; messageId?: string }
  | { success: false; error: string; code?: string };

export async function sendEmail(
  params: SendEmailParams
): Promise<SendEmailResult> {
  const { to, subject, html, text, replyTo } = params;
  const replyToFinal = replyTo?.trim() || process.env.MAIL_REPLY_TO?.trim();

  try {
    if (!isZeptoMailConfigured()) {
      console.warn(
        '[email] ZeptoMail: variáveis SMTP ou MAIL_FROM ausentes; envio não realizado'
      );
      return {
        success: false,
        error:
          'E-mail não configurado: ZEPTOMAIL_SMTP_HOST, ZEPTOMAIL_SMTP_USER, ZEPTOMAIL_SMTP_PASSWORD e MAIL_FROM são obrigatórios',
      };
    }

    const from = process.env.MAIL_FROM!.trim();
    const transport = getZeptoMailTransporter();
    const info = await transport.sendMail({
      from,
      to,
      subject,
      html,
      ...(text !== undefined && text !== '' ? { text } : {}),
      ...(replyToFinal ? { replyTo: replyToFinal } : {}),
    });

    console.log(
      `[email] ZeptoMail: enviado ok | messageId=${info.messageId ?? 'n/a'} | to=${to}`
    );
    return { success: true, messageId: info.messageId };
  } catch (err: unknown) {
    const e = err as { message?: string; code?: string; stack?: string };
    const msg = e.message || 'Erro desconhecido ao enviar e-mail';
    if (e.code === 'EAUTH' || e.code === 'EENVELOPE') {
      console.error('[email] ZeptoMail: erro de autenticação SMTP', {
        code: e.code,
        message: msg,
      });
    } else {
      console.error('[email] ZeptoMail: erro de envio', {
        code: e.code,
        message: msg,
        stack: e.stack,
      });
    }
    return { success: false, error: msg, code: e.code };
  }
}

export async function verifyZeptoMailConnection(): Promise<SendEmailResult> {
  try {
    if (!isZeptoMailConfigured()) {
      return {
        success: false,
        error:
          'Credenciais ZeptoMail não configuradas (host, user, password, MAIL_FROM)',
      };
    }
    await getZeptoMailTransporter().verify();
    console.log('[email] ZeptoMail: conexão SMTP verificada com sucesso');
    return { success: true };
  } catch (err: unknown) {
    const e = err as { message?: string; code?: string };
    const msg = e.message || 'Falha ao verificar SMTP';
    console.error('[email] ZeptoMail: falha na verificação SMTP', {
      code: e.code,
      message: msg,
    });
    return { success: false, error: msg, code: e.code };
  }
}
