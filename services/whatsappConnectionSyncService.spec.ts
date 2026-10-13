import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getWhatsappSessionHealthStrikes,
  resetWhatsappSessionHealthStrikes,
  WHATSAPP_SESSION_HEALTH_STRIKES_NEEDED,
} from '@/lib/whatsapp/whatsappSessionHealthGuard';
import type { WhatsappConnection } from '@/types/whatsappConnection';

const DOCTOR_ID = 'Au6SK95emuUNj6qXadWv';
const SESSION_ID = 'org_metodo_doctor_Au6SK95emuUNj6qXadWv';

function connection(status: WhatsappConnection['status'], extra?: Partial<WhatsappConnection>): WhatsappConnection {
  const now = new Date('2026-01-01T12:00:00.000Z');
  return {
    doctorId: DOCTOR_ID,
    sessionId: SESSION_ID,
    status,
    provider: 'wppconnect',
    organizationId: 'metodo',
    phone: '5583999999999',
    profileName: 'Dr Test',
    createdAt: now,
    updatedAt: now,
    lastCheckAt: new Date('2020-01-01T00:00:00.000Z'),
    ...extra,
  };
}

vi.mock('@/lib/server/whatsappSessionAuth.server', () => ({
  withWhatsappProviderAuth: vi.fn(async (_doctorId: string, _sessionId: string, fn: (token: string) => Promise<unknown>) => ({
    result: await fn('test-token'),
    accessToken: 'test-token',
  })),
}));

vi.mock('@/services/whatsappProviderClient', () => ({
  getSessionStatus: vi.fn(),
  isWhatsappMockMode: vi.fn(() => false),
  getMockConnectedProfile: vi.fn(),
  MOCK_QR_AUTO_CONNECT_MS: 8_000,
}));

vi.mock('@/services/whatsappConnectionService', () => ({
  updateWhatsappConnectionStatus: vi.fn(
    async (doctorId: string, status: string, partial: Record<string, unknown> = {}) =>
      connection(status as WhatsappConnection['status'], {
        doctorId,
        errorMessage:
          partial.errorMessage === null
            ? undefined
            : typeof partial.errorMessage === 'string'
              ? partial.errorMessage
              : undefined,
        phone: typeof partial.phone === 'string' ? partial.phone : '5583999999999',
      }),
  ),
  disconnectWhatsappConnection: vi.fn(async () => connection('disconnected')),
}));

import { getSessionStatus } from '@/services/whatsappProviderClient';
import { updateWhatsappConnectionStatus } from '@/services/whatsappConnectionService';
import { syncWhatsappConnectionWithProvider } from '@/services/whatsappConnectionSyncService';

describe('syncWhatsappConnectionWithProvider — reconciliação error', () => {
  beforeEach(() => {
    resetWhatsappSessionHealthStrikes();
    vi.mocked(updateWhatsappConnectionStatus).mockClear();
    vi.mocked(getSessionStatus).mockReset();
  });

  afterEach(() => {
    resetWhatsappSessionHealthStrikes();
  });

  it('F. Firestore error + WPP CONNECTED → volta connected e limpa errorMessage', async () => {
    vi.mocked(getSessionStatus).mockResolvedValue({
      status: 'connected',
      phone: '5583999999999',
      profileName: 'Dr Test',
    });

    const result = await syncWhatsappConnectionWithProvider(
      connection('error', { errorMessage: 'Sessão não encontrada no servidor WPPConnect.' }),
    );

    expect(result.connection.status).toBe('connected');
    expect(result.justConnected).toBe(true);
    expect(updateWhatsappConnectionStatus).toHaveBeenCalledWith(
      DOCTOR_ID,
      'connected',
      expect.objectContaining({
        errorMessage: null,
        sessionId: SESSION_ID,
      }),
    );
  });

  it('G. Firestore error + WPP continua indisponível → permanece error', async () => {
    vi.mocked(getSessionStatus).mockResolvedValue({
      status: 'error',
      errorMessage: 'Sessão não encontrada no servidor WPPConnect.',
    });

    const result = await syncWhatsappConnectionWithProvider(
      connection('error', { errorMessage: 'Sessão não encontrada no servidor WPPConnect.' }),
    );

    expect(result.connection.status).toBe('error');
    expect(result.justConnected).toBe(false);
    expect(updateWhatsappConnectionStatus).toHaveBeenCalledWith(
      DOCTOR_ID,
      'error',
      expect.objectContaining({
        sessionId: SESSION_ID,
      }),
    );
  });

  it('UNLAUNCHED/qr_pending isolado com Firestore connected NÃO grava error', async () => {
    vi.mocked(getSessionStatus).mockResolvedValue({ status: 'qr_pending' });

    const result = await syncWhatsappConnectionWithProvider(connection('connected'));

    expect(result.connection.status).toBe('connected');
    expect(getWhatsappSessionHealthStrikes(DOCTOR_ID)).toBe(1);
    expect(updateWhatsappConnectionStatus).toHaveBeenCalledWith(
      DOCTOR_ID,
      'connected',
      expect.objectContaining({ sessionId: SESSION_ID }),
    );
  });

  it('check-connection error isolado com Firestore connected NÃO grava error', async () => {
    vi.mocked(getSessionStatus).mockResolvedValue({
      status: 'error',
      errorMessage: 'Pareamento incompleto',
    });

    const result = await syncWhatsappConnectionWithProvider(connection('connected'));
    expect(result.connection.status).toBe('connected');
    expect(getWhatsappSessionHealthStrikes(DOCTOR_ID)).toBe(1);
  });

  it('N falhas transitórias no sync gravam error sem disconnect/wipe', async () => {
    vi.mocked(getSessionStatus).mockResolvedValue({
      status: 'error',
      errorMessage: 'WAPI is not defined',
    });

    for (let i = 0; i < WHATSAPP_SESSION_HEALTH_STRIKES_NEEDED - 1; i += 1) {
      const mid = await syncWhatsappConnectionWithProvider(connection('connected'));
      expect(mid.connection.status).toBe('connected');
    }

    const result = await syncWhatsappConnectionWithProvider(connection('connected'));
    expect(result.connection.status).toBe('error');
    expect(updateWhatsappConnectionStatus).toHaveBeenLastCalledWith(
      DOCTOR_ID,
      'error',
      expect.objectContaining({
        sessionId: SESSION_ID,
        errorMessage: 'WAPI is not defined',
      }),
    );
    const lastPartial = vi.mocked(updateWhatsappConnectionStatus).mock.calls.at(-1)?.[2] as
      | Record<string, unknown>
      | undefined;
    expect(lastPartial).not.toHaveProperty('wppSessionToken');
    expect(lastPartial).not.toHaveProperty('phone');
  });
});
