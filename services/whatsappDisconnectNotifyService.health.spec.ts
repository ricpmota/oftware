import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getWhatsappSessionHealthStrikes,
  markWhatsappSessionHealthy,
  registerWhatsappSessionTransientFailure,
  resetWhatsappSessionHealthStrikes,
  WHATSAPP_SESSION_HEALTH_STRIKES_NEEDED,
} from '@/lib/whatsapp/whatsappSessionHealthGuard';

const DOCTOR_ID = 'Au6SK95emuUNj6qXadWv';
const SESSION_ID = 'org_metodo_doctor_Au6SK95emuUNj6qXadWv';

const connectedDoc = {
  doctorId: DOCTOR_ID,
  sessionId: SESSION_ID,
  status: 'connected' as const,
  provider: 'wppconnect' as const,
  organizationId: 'metodo',
  phone: '5583999999999',
  profileName: 'Dr Test',
  createdAt: new Date(),
  updatedAt: new Date(),
};

vi.mock('@/lib/server/firebaseAdminOftware', () => ({
  getFirestoreAdmin: vi.fn(() => ({
    collection: vi.fn(() => ({
      doc: vi.fn(() => ({
        get: vi.fn(async () => ({ exists: false, data: () => undefined })),
        set: vi.fn(async () => undefined),
      })),
      where: vi.fn(() => ({ get: vi.fn(async () => ({ docs: [] })) })),
    })),
  })),
}));

vi.mock('@/lib/email/transporter', () => ({
  sendEmail: vi.fn(async () => ({ success: false })),
  isZeptoMailConfigured: vi.fn(() => false),
}));

vi.mock('@/lib/server/whatsappSessionAuth.server', () => ({
  withWhatsappProviderAuth: vi.fn(async (_doctorId: string, _sessionId: string, fn: (token: string) => Promise<unknown>) => ({
    result: await fn('test-token'),
    accessToken: 'test-token',
  })),
}));

vi.mock('@/services/whatsappConnectionService', () => ({
  getWhatsappConnectionByDoctor: vi.fn(),
  updateWhatsappConnectionStatus: vi.fn(async (doctorId: string, status: string, partial: Record<string, unknown> = {}) => ({
    ...connectedDoc,
    doctorId,
    status,
    errorMessage: partial.errorMessage === null ? undefined : partial.errorMessage,
    lastCheckAt: partial.lastCheckAt ?? connectedDoc.updatedAt,
  })),
}));

vi.mock('@/services/whatsappProviderClient', () => ({
  recheckProviderSessionHealth: vi.fn(),
}));

import { getWhatsappConnectionByDoctor, updateWhatsappConnectionStatus } from '@/services/whatsappConnectionService';
import { recheckProviderSessionHealth } from '@/services/whatsappProviderClient';
import { flagWhatsappSessionBrokenFromSendFailure } from '@/services/whatsappDisconnectNotifyService';

describe('whatsappSessionHealthGuard', () => {
  afterEach(() => {
    resetWhatsappSessionHealthStrikes();
  });

  it('E. leitura saudável zera strikes', () => {
    registerWhatsappSessionTransientFailure(DOCTOR_ID);
    registerWhatsappSessionTransientFailure(DOCTOR_ID);
    expect(getWhatsappSessionHealthStrikes(DOCTOR_ID)).toBe(2);
    const { previousStrikes } = markWhatsappSessionHealthy(DOCTOR_ID);
    expect(previousStrikes).toBe(2);
    expect(getWhatsappSessionHealthStrikes(DOCTOR_ID)).toBe(0);
  });

  it('atinge threshold em N falhas consecutivas', () => {
    let last = { shouldMarkError: false, strike: 0, threshold: 0 };
    for (let i = 0; i < WHATSAPP_SESSION_HEALTH_STRIKES_NEEDED; i += 1) {
      last = registerWhatsappSessionTransientFailure(DOCTOR_ID);
    }
    expect(last.shouldMarkError).toBe(true);
    expect(last.strike).toBe(WHATSAPP_SESSION_HEALTH_STRIKES_NEEDED);
  });
});

describe('flagWhatsappSessionBrokenFromSendFailure', () => {
  beforeEach(() => {
    resetWhatsappSessionHealthStrikes();
    vi.mocked(getWhatsappConnectionByDoctor).mockResolvedValue({ ...connectedDoc });
    vi.mocked(updateWhatsappConnectionStatus).mockClear();
    vi.mocked(recheckProviderSessionHealth).mockReset();
  });

  afterEach(() => {
    resetWhatsappSessionHealthStrikes();
  });

  it('A. SERVER_ERROR + recheck connected → NÃO grava error', async () => {
    vi.mocked(recheckProviderSessionHealth).mockResolvedValue({
      healthy: true,
      rawStatus: 'CONNECTED',
    });

    const result = await flagWhatsappSessionBrokenFromSendFailure({
      doctorId: DOCTOR_ID,
      errorMessage: 'Erro ao enviar a mensagem.',
      errorCode: 'SERVER_ERROR',
    });

    expect(result.flagged).toBe(false);
    expect(updateWhatsappConnectionStatus).not.toHaveBeenCalled();
    expect(getWhatsappSessionHealthStrikes(DOCTOR_ID)).toBe(0);
  });

  it('B. SESSION_NOT_FOUND + recheck connected → NÃO grava error', async () => {
    vi.mocked(recheckProviderSessionHealth).mockResolvedValue({
      healthy: true,
      rawStatus: 'CONNECTED',
    });

    const result = await flagWhatsappSessionBrokenFromSendFailure({
      doctorId: DOCTOR_ID,
      errorMessage: 'Sessão não encontrada no servidor WPPConnect.',
      errorCode: 'SESSION_NOT_FOUND',
    });

    expect(result.flagged).toBe(false);
    expect(updateWhatsappConnectionStatus).not.toHaveBeenCalled();
  });

  it('C. send falha + recheck falha uma vez → NÃO grava error', async () => {
    vi.mocked(recheckProviderSessionHealth).mockResolvedValue({
      healthy: false,
      errorCode: 'SESSION_NOT_FOUND',
      rawStatus: 'SESSION_NOT_FOUND',
    });

    const result = await flagWhatsappSessionBrokenFromSendFailure({
      doctorId: DOCTOR_ID,
      errorMessage: 'Sessão não encontrada no servidor WPPConnect.',
      errorCode: 'SESSION_NOT_FOUND',
    });

    expect(result.flagged).toBe(false);
    expect(updateWhatsappConnectionStatus).not.toHaveBeenCalled();
    expect(getWhatsappSessionHealthStrikes(DOCTOR_ID)).toBe(1);
  });

  it('D. falhas consecutivas no threshold → grava error', async () => {
    vi.mocked(recheckProviderSessionHealth).mockResolvedValue({
      healthy: false,
      errorCode: 'SERVER_ERROR',
      rawStatus: 'SERVER_ERROR',
    });

    for (let i = 0; i < WHATSAPP_SESSION_HEALTH_STRIKES_NEEDED - 1; i += 1) {
      const mid = await flagWhatsappSessionBrokenFromSendFailure({
        doctorId: DOCTOR_ID,
        errorMessage: 'WAPI is not defined',
        errorCode: 'SERVER_ERROR',
      });
      expect(mid.flagged).toBe(false);
    }

    const result = await flagWhatsappSessionBrokenFromSendFailure({
      doctorId: DOCTOR_ID,
      errorMessage: 'WAPI is not defined',
      errorCode: 'SERVER_ERROR',
    });

    expect(result.flagged).toBe(true);
    expect(updateWhatsappConnectionStatus).toHaveBeenCalledTimes(1);
    expect(updateWhatsappConnectionStatus).toHaveBeenCalledWith(
      DOCTOR_ID,
      'error',
      expect.objectContaining({
        sessionId: SESSION_ID,
        errorMessage: 'WAPI is not defined',
      }),
    );
    expect(vi.mocked(updateWhatsappConnectionStatus).mock.calls[0]?.[2]).not.toHaveProperty(
      'wppSessionToken',
    );
  });

  it('E. recheck saudável no meio zera strikes', async () => {
    vi.mocked(recheckProviderSessionHealth)
      .mockResolvedValueOnce({ healthy: false, errorCode: 'SERVER_ERROR', rawStatus: 'SERVER_ERROR' })
      .mockResolvedValueOnce({ healthy: false, errorCode: 'SERVER_ERROR', rawStatus: 'SERVER_ERROR' })
      .mockResolvedValueOnce({ healthy: true, rawStatus: 'CONNECTED' })
      .mockResolvedValueOnce({ healthy: false, errorCode: 'SERVER_ERROR', rawStatus: 'SERVER_ERROR' });

    await flagWhatsappSessionBrokenFromSendFailure({
      doctorId: DOCTOR_ID,
      errorCode: 'SERVER_ERROR',
      errorMessage: 'fail',
    });
    await flagWhatsappSessionBrokenFromSendFailure({
      doctorId: DOCTOR_ID,
      errorCode: 'SERVER_ERROR',
      errorMessage: 'fail',
    });
    expect(getWhatsappSessionHealthStrikes(DOCTOR_ID)).toBe(2);

    await flagWhatsappSessionBrokenFromSendFailure({
      doctorId: DOCTOR_ID,
      errorCode: 'SERVER_ERROR',
      errorMessage: 'fail',
    });
    expect(getWhatsappSessionHealthStrikes(DOCTOR_ID)).toBe(0);

    const afterReset = await flagWhatsappSessionBrokenFromSendFailure({
      doctorId: DOCTOR_ID,
      errorCode: 'SERVER_ERROR',
      errorMessage: 'fail',
    });
    expect(afterReset.flagged).toBe(false);
    expect(getWhatsappSessionHealthStrikes(DOCTOR_ID)).toBe(1);
    expect(updateWhatsappConnectionStatus).not.toHaveBeenCalled();
  });

  it('TIMEOUT não grava error nem chama recheck', async () => {
    const result = await flagWhatsappSessionBrokenFromSendFailure({
      doctorId: DOCTOR_ID,
      errorMessage: 'Tempo esgotado ao comunicar com o servidor WPPConnect.',
      errorCode: 'TIMEOUT',
    });
    expect(result.flagged).toBe(false);
    expect(recheckProviderSessionHealth).not.toHaveBeenCalled();
    expect(updateWhatsappConnectionStatus).not.toHaveBeenCalled();
  });
});
