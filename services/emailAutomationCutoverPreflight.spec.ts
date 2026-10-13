import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('@/services/emailAutomationQueueService', () => ({
  stats: vi.fn(),
}));

vi.mock('@/lib/automation/circuitBreaker', () => ({
  isOrganizationCircuitOpen: vi.fn(),
}));

vi.mock('@/lib/email/emailTransportHealth', () => ({
  getEmailTransportHealth: vi.fn(),
  isEmailTransportBlockingCutover: vi.fn(),
}));

import { stats as getEmailQueueStats } from '@/services/emailAutomationQueueService';
import { isOrganizationCircuitOpen } from '@/lib/automation/circuitBreaker';
import {
  getEmailTransportHealth,
  isEmailTransportBlockingCutover,
} from '@/lib/email/emailTransportHealth';
import { validateQueueEngineCutover } from '@/services/emailAutomationCutoverPreflightService';

describe('validateQueueEngineCutover', () => {
  beforeEach(() => {
    vi.mocked(getEmailQueueStats).mockReset();
    vi.mocked(isOrganizationCircuitOpen).mockReset();
    vi.mocked(getEmailTransportHealth).mockReset();
    vi.mocked(isEmailTransportBlockingCutover).mockReset();
  });

  it('case 4: blocks queue promotion when Zepto EAUTH is active', async () => {
    vi.mocked(getEmailQueueStats).mockResolvedValue({
      counts: { pending: 3, processing: 0, sent: 507, failed: 0, skipped: 1295, total: 1805 },
      dueNow: 0,
      nextScheduledFor: null,
      upcoming: [],
      avgRetryCountFailed: 0,
      totalRetries: 0,
    });
    vi.mocked(isOrganizationCircuitOpen).mockResolvedValue(false);
    vi.mocked(getEmailTransportHealth).mockResolvedValue({
      configured: true,
      host: 'smtp.zeptomail.com',
      port: 587,
      authConfigured: true,
      lastKnownStatus: 'critical',
      lastAuthErrorAt: '2026-07-12T12:00:00.000Z',
      lastSuccessAt: null,
      lastErrorMessage: '535 Authentication Failed',
      lastCheckAt: '2026-07-13T12:00:00.000Z',
    });
    vi.mocked(isEmailTransportBlockingCutover).mockReturnValue(true);

    const result = await validateQueueEngineCutover('metodo');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe('Cutover bloqueado: autenticação ZeptoMail inválida.');
    }
  });

  it('allows queue promotion when all checks pass', async () => {
    vi.mocked(getEmailQueueStats).mockResolvedValue({
      counts: { pending: 3, processing: 0, sent: 507, failed: 0, skipped: 1295, total: 1805 },
      dueNow: 0,
      nextScheduledFor: null,
      upcoming: [],
      avgRetryCountFailed: 0,
      totalRetries: 0,
    });
    vi.mocked(isOrganizationCircuitOpen).mockResolvedValue(false);
    vi.mocked(getEmailTransportHealth).mockResolvedValue({
      configured: true,
      host: 'smtp.zeptomail.com',
      port: 587,
      authConfigured: true,
      lastKnownStatus: 'healthy',
      lastAuthErrorAt: null,
      lastSuccessAt: '2026-07-13T12:00:00.000Z',
      lastErrorMessage: null,
      lastCheckAt: '2026-07-13T12:00:00.000Z',
    });
    vi.mocked(isEmailTransportBlockingCutover).mockReturnValue(false);

    const result = await validateQueueEngineCutover('metodo');
    expect(result.ok).toBe(true);
  });
});
