import { describe, expect, it } from 'vitest';
import { buildEmailAutomationQueueId } from '@/types/emailAutomationQueue';
import { scheduledForLeadsMedicoEmail, LEADS_MEDICO_EMAIL_OFFSET_MS } from '@/lib/email/leadsMedicoEmailSchedule';

describe('emailAutomationQueue', () => {
  it('buildEmailAutomationQueueId é determinístico', () => {
    expect(buildEmailAutomationQueueId('uid-abc', 'email1')).toBe('lead_uid-abc_email1');
    expect(buildEmailAutomationQueueId('uid-abc', 'email3')).toBe('lead_uid-abc_email3');
  });

  it('scheduledFor espelha offsets do cron legado', () => {
    const created = new Date('2026-01-01T12:00:00.000Z');
    expect(scheduledForLeadsMedicoEmail(created, 'email1').getTime()).toBe(
      created.getTime() + LEADS_MEDICO_EMAIL_OFFSET_MS.email1,
    );
    expect(scheduledForLeadsMedicoEmail(created, 'email5').getTime()).toBe(
      created.getTime() + LEADS_MEDICO_EMAIL_OFFSET_MS.email5,
    );
  });
});
