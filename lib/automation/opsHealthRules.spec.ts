import { describe, expect, it } from 'vitest';
import { deriveQueueHealth, mergeHealth, percentile } from '@/lib/automation/opsHealthRules';

describe('deriveQueueHealth', () => {
  it('healthy quando fila pequena', () => {
    const h = deriveQueueHealth({
      pending: 5,
      dueNow: 0,
      processing: 1,
      oldestProcessingAgeMs: 1000,
      avgRetryCountFailed: 0,
    });
    expect(h.status).toBe('healthy');
  });

  it('critical quando pending alto', () => {
    const h = deriveQueueHealth({
      pending: 300,
      dueNow: 0,
      processing: 0,
      oldestProcessingAgeMs: null,
      avgRetryCountFailed: 0,
    });
    expect(h.status).toBe('critical');
  });
});

describe('mergeHealth', () => {
  it('critical prevalece', () => {
    expect(mergeHealth('healthy', 'warning', 'critical')).toBe('critical');
  });
});

describe('percentile', () => {
  it('calcula p50', () => {
    expect(percentile([10, 20, 30, 40], 50)).toBe(20);
  });
});
