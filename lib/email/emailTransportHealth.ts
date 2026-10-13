import { Timestamp } from 'firebase-admin/firestore';
import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';

const DOC_PATH = 'email_transport_health';
const DOC_ID = 'global';

/** Janela em que um EAUTH recente bloqueia cutover para queue. */
export const EMAIL_TRANSPORT_AUTH_BLOCK_MS = 24 * 60 * 60 * 1000;

export type EmailTransportHealthStatus = 'healthy' | 'warning' | 'critical';

export type EmailTransportHealth = {
  configured: boolean;
  host: string | null;
  port: number | null;
  authConfigured: boolean;
  lastKnownStatus: EmailTransportHealthStatus;
  lastAuthErrorAt: string | null;
  lastSuccessAt: string | null;
  lastErrorMessage: string | null;
  lastCheckAt: string;
};

function isZeptoMailConfiguredEnv(): boolean {
  return Boolean(
    process.env.ZEPTOMAIL_SMTP_HOST?.trim() &&
      process.env.ZEPTOMAIL_SMTP_USER?.trim() &&
      process.env.ZEPTOMAIL_SMTP_PASSWORD?.trim() &&
      process.env.MAIL_FROM?.trim(),
  );
}

function getSmtpPort(): number {
  const raw = process.env.ZEPTOMAIL_SMTP_PORT;
  const n = raw ? parseInt(raw, 10) : 587;
  return Number.isFinite(n) && n > 0 ? n : 587;
}

function toIso(value: unknown): string | null {
  if (!value) return null;
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string') return value;
  return null;
}

function deriveStatus(params: {
  configured: boolean;
  lastAuthErrorAt: string | null;
  lastSuccessAt: string | null;
  now: Date;
}): EmailTransportHealthStatus {
  if (!params.configured) return 'critical';

  const authAt = params.lastAuthErrorAt ? new Date(params.lastAuthErrorAt).getTime() : null;
  const successAt = params.lastSuccessAt ? new Date(params.lastSuccessAt).getTime() : null;

  if (authAt != null) {
    const authStillActive = successAt == null || authAt > successAt;
    if (authStillActive) {
      const ageMs = params.now.getTime() - authAt;
      if (ageMs <= EMAIL_TRANSPORT_AUTH_BLOCK_MS) return 'critical';
      return 'warning';
    }
  }

  return 'healthy';
}

export function buildEmailTransportHealthFromRecord(
  data: Record<string, unknown> | undefined,
  now: Date = new Date(),
): EmailTransportHealth {
  const configured = isZeptoMailConfiguredEnv();
  const host = process.env.ZEPTOMAIL_SMTP_HOST?.trim() || null;
  const port = configured ? getSmtpPort() : null;
  const authConfigured = Boolean(
    process.env.ZEPTOMAIL_SMTP_USER?.trim() && process.env.ZEPTOMAIL_SMTP_PASSWORD?.trim(),
  );

  const lastAuthErrorAt = toIso(data?.lastAuthErrorAt);
  const lastSuccessAt = toIso(data?.lastSuccessAt);

  return {
    configured,
    host,
    port,
    authConfigured,
    lastKnownStatus: deriveStatus({ configured, lastAuthErrorAt, lastSuccessAt, now }),
    lastAuthErrorAt,
    lastSuccessAt,
    lastErrorMessage: typeof data?.lastErrorMessage === 'string' ? data.lastErrorMessage : null,
    lastCheckAt: now.toISOString(),
  };
}

export async function getEmailTransportHealth(): Promise<EmailTransportHealth> {
  const now = new Date();
  try {
    const snap = await getFirestoreAdmin().collection(DOC_PATH).doc(DOC_ID).get();
    return buildEmailTransportHealthFromRecord(snap.data() as Record<string, unknown> | undefined, now);
  } catch {
    return buildEmailTransportHealthFromRecord(undefined, now);
  }
}

export async function recordEmailTransportSuccess(): Promise<void> {
  const now = Timestamp.now();
  await getFirestoreAdmin()
    .collection(DOC_PATH)
    .doc(DOC_ID)
    .set(
      {
        lastSuccessAt: now,
        lastKnownStatus: 'healthy',
        updatedAt: now,
      },
      { merge: true },
    );
}

export async function recordEmailTransportAuthError(message: string, code?: string): Promise<void> {
  const now = Timestamp.now();
  await getFirestoreAdmin()
    .collection(DOC_PATH)
    .doc(DOC_ID)
    .set(
      {
        lastAuthErrorAt: now,
        lastKnownStatus: 'critical',
        lastErrorMessage: message.slice(0, 500),
        lastErrorCode: code ?? 'EAUTH',
        updatedAt: now,
      },
      { merge: true },
    );
}

export function isEmailTransportBlockingCutover(health: EmailTransportHealth, now: Date = new Date()): boolean {
  if (!health.configured || !health.authConfigured) return true;
  if (health.lastKnownStatus === 'critical') {
    if (!health.lastAuthErrorAt) return true;
    const authAt = new Date(health.lastAuthErrorAt).getTime();
    const successAt = health.lastSuccessAt ? new Date(health.lastSuccessAt).getTime() : null;
    const authStillActive = successAt == null || authAt > successAt;
    if (authStillActive && now.getTime() - authAt <= EMAIL_TRANSPORT_AUTH_BLOCK_MS) {
      return true;
    }
  }
  return false;
}
