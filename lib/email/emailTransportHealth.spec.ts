import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import {
  buildEmailTransportHealthFromRecord,
  isEmailTransportBlockingCutover,
  EMAIL_TRANSPORT_AUTH_BLOCK_MS,
} from '@/lib/email/emailTransportHealth';

describe('emailTransportHealth', () => {
  const envBackup: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const key of [
      'ZEPTOMAIL_SMTP_HOST',
      'ZEPTOMAIL_SMTP_USER',
      'ZEPTOMAIL_SMTP_PASSWORD',
      'MAIL_FROM',
    ]) {
      envBackup[key] = process.env[key];
    }
    process.env.ZEPTOMAIL_SMTP_HOST = 'smtp.zeptomail.com';
    process.env.ZEPTOMAIL_SMTP_USER = 'emailapikey';
    process.env.ZEPTOMAIL_SMTP_PASSWORD = 'secret';
    process.env.MAIL_FROM = 'noreply@example.com';
  });

  afterEach(() => {
    for (const [key, value] of Object.entries(envBackup)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });
  it('marks critical when EAUTH is recent and no success after', () => {
    const now = new Date('2026-07-13T12:00:00.000Z');
    const health = buildEmailTransportHealthFromRecord(
      {
        lastAuthErrorAt: '2026-07-13T11:00:00.000Z',
        lastSuccessAt: null,
      },
      now,
    );

    expect(health.lastKnownStatus).toBe('critical');
    expect(isEmailTransportBlockingCutover(health, now)).toBe(true);
  });

  it('allows cutover when success happened after last auth error', () => {
    const now = new Date('2026-07-13T12:00:00.000Z');
    const health = buildEmailTransportHealthFromRecord(
      {
        lastAuthErrorAt: '2026-07-13T10:00:00.000Z',
        lastSuccessAt: '2026-07-13T11:00:00.000Z',
      },
      now,
    );

    expect(health.lastKnownStatus).toBe('healthy');
    expect(isEmailTransportBlockingCutover(health, now)).toBe(false);
  });

  it('warning when auth error is older than block window', () => {
    const now = new Date('2026-07-15T12:00:00.000Z');
    const health = buildEmailTransportHealthFromRecord(
      {
        lastAuthErrorAt: '2026-07-13T11:00:00.000Z',
        lastSuccessAt: null,
      },
      now,
    );

    expect(health.lastKnownStatus).toBe('warning');
    expect(now.getTime() - new Date(health.lastAuthErrorAt!).getTime()).toBeGreaterThan(
      EMAIL_TRANSPORT_AUTH_BLOCK_MS,
    );
    expect(isEmailTransportBlockingCutover(health, now)).toBe(false);
  });
});
