import { describe, expect, it } from 'vitest';
import { isCriticalShadowMismatch } from '@/lib/email/emailQueueShadowValidation';
import { isEmailAutomationEngine, EMAIL_AUTOMATION_ENGINE_DEFAULT } from '@/types/emailAutomationEngine';

describe('emailAutomationEngine governance', () => {
  it('default engine is legacy', () => {
    expect(EMAIL_AUTOMATION_ENGINE_DEFAULT).toBe('legacy');
  });

  it('validates engine values', () => {
    expect(isEmailAutomationEngine('legacy')).toBe(true);
    expect(isEmailAutomationEngine('shadow')).toBe(true);
    expect(isEmailAutomationEngine('queue')).toBe(true);
    expect(isEmailAutomationEngine('invalid')).toBe(false);
  });

  it('identifies critical shadow mismatch', () => {
    expect(
      isCriticalShadowMismatch({
        status: 'MISMATCH',
        mismatchKind: 'queue_stale_or_missing',
        legacyDecision: 'would_send',
        queueDecision: 'would_not_send',
      }),
    ).toBe(true);

    expect(
      isCriticalShadowMismatch({
        status: 'MATCH',
        legacyDecision: 'would_send',
        queueDecision: 'would_send',
      }),
    ).toBe(false);
  });
});
