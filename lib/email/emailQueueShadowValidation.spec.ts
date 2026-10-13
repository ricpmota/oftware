import { describe, expect, it } from 'vitest';
import {
  compareShadowDecisions,
  computeMatchRate,
  evaluateQueueWouldSendDecision,
} from '@/lib/email/emailQueueShadowValidation';
import type { EmailAutomationQueueItem } from '@/types/emailAutomationQueue';

function mockItem(overrides: Partial<EmailAutomationQueueItem>): EmailAutomationQueueItem {
  return {
    id: 'lead_x_email2',
    organizationId: 'metodo',
    doctorId: '',
    leadId: 'x',
    leadNome: 'Test',
    leadEmail: 't@test.com',
    emailTipo: 'email2',
    scheduledFor: new Date('2026-01-02T12:00:00Z'),
    status: 'pending',
    payloadVersion: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('emailQueueShadowValidation', () => {
  const now = new Date('2026-01-02T13:00:00Z');

  it('queue pending vencido → would_send', () => {
    const r = evaluateQueueWouldSendDecision(mockItem({ status: 'pending' }), now);
    expect(r.decision).toBe('would_send');
  });

  it('item ausente → would_not_send (fila desatualizada)', () => {
    const r = evaluateQueueWouldSendDecision(null, now);
    expect(r.decision).toBe('would_not_send');
    expect(r.mismatchKind).toBe('queue_stale_or_missing');
  });

  it('pending no futuro → would_not_send', () => {
    const r = evaluateQueueWouldSendDecision(
      mockItem({ scheduledFor: new Date('2026-01-03T13:00:00Z') }),
      now,
    );
    expect(r.decision).toBe('would_not_send');
    expect(r.mismatchKind).toBe('queue_not_due_yet');
  });

  it('skipped → would_not_send com motivo', () => {
    const r = evaluateQueueWouldSendDecision(
      mockItem({ status: 'skipped', errorMessage: 'Lead convertido' }),
      now,
    );
    expect(r.decision).toBe('would_not_send');
    expect(r.reason).toContain('convertido');
  });

  it('compareShadowDecisions e matchRate', () => {
    expect(compareShadowDecisions('would_send', 'would_send')).toBe('MATCH');
    expect(compareShadowDecisions('would_send', 'would_not_send')).toBe('MISMATCH');
    expect(computeMatchRate(999, 1000)).toBe(99.9);
    expect(computeMatchRate(0, 0)).toBe(100);
  });
});
