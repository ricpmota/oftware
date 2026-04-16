import { isZeptoMailConfigured } from '@/lib/email/transporter';

/**
 * Limita quantos e-mails ZeptoMail cada execução de cron tenta enviar.
 * Evita pico único (limite diário / rate limit). Com cron a cada poucos minutos, o restante envia na próxima rodada.
 *
 * Env (opcional):
 * - CRON_ZEPTO_MAX_SENDS_PER_RUN — padrão 25, máx. 200
 * - CRON_EMAIL_DELAY_MS — pausa entre envios na mesma execução (padrão 1200 ms), máx. 30000
 */
export function getCronZeptoMaxSendsPerRun(): number {
  const raw = process.env.CRON_ZEPTO_MAX_SENDS_PER_RUN;
  const n = raw != null && raw !== '' ? parseInt(raw, 10) : 25;
  if (!Number.isFinite(n) || n < 1) return 25;
  return Math.min(200, n);
}

export function getCronEmailDelayMs(): number {
  const raw = process.env.CRON_EMAIL_DELAY_MS;
  const n = raw != null && raw !== '' ? parseInt(raw, 10) : 1200;
  if (!Number.isFinite(n) || n < 0) return 1200;
  return Math.min(30000, n);
}

export async function cronEmailThrottle(): Promise<void> {
  const ms = getCronEmailDelayMs();
  if (ms <= 0) return;
  await new Promise((r) => setTimeout(r, ms));
}

export type CronZeptoGate =
  | { ok: true }
  | {
      ok: false;
      status: number;
      body: {
        success: false;
        erro: string;
      };
    };

/** Crons de e-mail exigem Zepto configurado — sem envio “falso” em produção. */
export function assertCronZeptoConfigured(): CronZeptoGate {
  if (!isZeptoMailConfigured()) {
    return {
      ok: false,
      status: 503,
      body: {
        success: false,
        erro:
          'ZeptoMail não configurado. Defina ZEPTOMAIL_SMTP_HOST, ZEPTOMAIL_SMTP_USER, ZEPTOMAIL_SMTP_PASSWORD e MAIL_FROM.',
      },
    };
  }
  return { ok: true };
}
