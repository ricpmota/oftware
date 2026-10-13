import { describe, expect, it } from 'vitest';
import { calcularProximoEmailCampanha } from '@/services/emailLegacyAutomationEngine';

describe('calcularProximoEmailCampanha', () => {
  it('preserves legacy schedule for email1 after 1 hour', () => {
    const createdAt = new Date('2026-07-13T10:00:00.000Z');
    const agora = new Date('2026-07-13T11:30:00.000Z');

    const result = calcularProximoEmailCampanha([], createdAt, agora);

    expect(result.proximoEmail).toBe('email1');
    expect(result.proximoEnvio?.getTime()).toBe(createdAt.getTime() + 60 * 60 * 1000);
  });
});
