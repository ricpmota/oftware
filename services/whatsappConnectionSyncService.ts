import { withWhatsappProviderAuth } from '@/lib/server/whatsappSessionAuth.server';
import {
  disconnectWhatsappConnection,
  updateWhatsappConnectionStatus,
} from '@/services/whatsappConnectionService';
import {
  getMockConnectedProfile,
  getSessionStatus,
  isWhatsappMockMode,
  MOCK_QR_AUTO_CONNECT_MS,
} from '@/services/whatsappProviderClient';
import { CANAL_CHAT_OWNER_ID } from '@/lib/whatsapp/canalChatOwner';
import { ensureCanalChatInboundWebhook } from '@/services/canalChatWebhookEnsureService';
import type { WhatsappConnection, WhatsappConnectionStatus } from '@/types/whatsappConnection';

export type WhatsappConnectionSyncResult = {
  connection: WhatsappConnection;
  previousStatus: WhatsappConnectionStatus;
  justConnected: boolean;
};

/**
 * Sincroniza o documento Firestore com o estado real do WPPConnect.
 *
 * - Debounce: evita martelar o WPP a cada poll da UI
 * - Histerese: 2 leituras "disconnected" seguidas antes de derrubar um connected
 */
const QR_PENDING_GRACE_MS = 3 * 60 * 1000;
const SYNC_DEBOUNCE_CONNECTED_MS = 25_000;
const SYNC_DEBOUNCE_QR_MS = 4_000;
const DISCONNECT_STRIKES_NEEDED = 2;

const disconnectStrikesByDoctor = new Map<string, number>();

function shouldSkipProviderSync(connection: WhatsappConnection, force: boolean): boolean {
  if (force) return false;
  const last = connection.lastCheckAt?.getTime?.() ?? 0;
  if (!last) return false;
  const elapsed = Date.now() - last;
  if (connection.status === 'connected') return elapsed < SYNC_DEBOUNCE_CONNECTED_MS;
  if (connection.status === 'qr_pending') return elapsed < SYNC_DEBOUNCE_QR_MS;
  return false;
}

export async function syncWhatsappConnectionWithProvider(
  connection: WhatsappConnection,
  options?: { force?: boolean },
): Promise<WhatsappConnectionSyncResult> {
  const previousStatus = connection.status;
  const now = new Date();
  const force = options?.force === true;

  if (connection.doctorId === CANAL_CHAT_OWNER_ID && connection.status === 'connected') {
    await ensureCanalChatInboundWebhook();
  }

  if (connection.status === 'qr_pending' && isWhatsappMockMode()) {
    const elapsed = now.getTime() - connection.updatedAt.getTime();
    if (elapsed >= MOCK_QR_AUTO_CONNECT_MS) {
      const mock = getMockConnectedProfile(connection.sessionId);
      const synced = await updateWhatsappConnectionStatus(connection.doctorId, 'connected', {
        sessionId: connection.sessionId,
        phone: mock.phone,
        profileName: mock.profileName,
        qrCode: undefined,
        connectedAt: now,
        lastCheckAt: now,
        errorMessage: undefined,
      });
      return {
        connection: synced,
        previousStatus,
        justConnected: previousStatus !== 'connected',
      };
    }
    const synced = await updateWhatsappConnectionStatus(connection.doctorId, 'qr_pending', {
      sessionId: connection.sessionId,
      lastCheckAt: now,
      touchUpdatedAt: false,
    });
    return { connection: synced, previousStatus, justConnected: false };
  }

  if (connection.status !== 'qr_pending' && connection.status !== 'connected') {
    const synced = await updateWhatsappConnectionStatus(connection.doctorId, connection.status, {
      sessionId: connection.sessionId,
      lastCheckAt: now,
      touchUpdatedAt: false,
    });
    return { connection: synced, previousStatus, justConnected: false };
  }

  if (shouldSkipProviderSync(connection, force)) {
    return { connection, previousStatus, justConnected: false };
  }

  try {
    const { result: providerStatus } = await withWhatsappProviderAuth(
      connection.doctorId,
      connection.sessionId,
      (token) => getSessionStatus(connection.sessionId, token),
    );

    if (providerStatus.status === 'connected') {
      disconnectStrikesByDoctor.delete(connection.doctorId);
      const synced = await updateWhatsappConnectionStatus(connection.doctorId, 'connected', {
        sessionId: connection.sessionId,
        phone: providerStatus.phone ?? connection.phone,
        profileName: providerStatus.profileName ?? connection.profileName,
        qrCode: undefined,
        connectedAt: connection.connectedAt ?? now,
        lastCheckAt: now,
        errorMessage: undefined,
      });
      return {
        connection: synced,
        previousStatus,
        justConnected: previousStatus !== 'connected',
      };
    }

    if (providerStatus.status === 'error') {
      disconnectStrikesByDoctor.delete(connection.doctorId);
      const synced = await updateWhatsappConnectionStatus(connection.doctorId, 'error', {
        sessionId: connection.sessionId,
        errorMessage: providerStatus.errorMessage ?? 'Erro na conexão WhatsApp.',
        lastCheckAt: now,
        qrCode: undefined,
      });
      return { connection: synced, previousStatus, justConnected: false };
    }

    // Já estava conectado e o provedor caiu — exige 2 leituras seguidas (evita flicker).
    if (providerStatus.status === 'disconnected' && previousStatus === 'connected') {
      const strikes = (disconnectStrikesByDoctor.get(connection.doctorId) ?? 0) + 1;
      disconnectStrikesByDoctor.set(connection.doctorId, strikes);

      if (strikes < DISCONNECT_STRIKES_NEEDED) {
        const synced = await updateWhatsappConnectionStatus(connection.doctorId, 'connected', {
          sessionId: connection.sessionId,
          phone: connection.phone,
          profileName: connection.profileName,
          lastCheckAt: now,
          touchUpdatedAt: false,
        });
        return { connection: synced, previousStatus, justConnected: false };
      }

      disconnectStrikesByDoctor.delete(connection.doctorId);
      const synced = await disconnectWhatsappConnection(connection.doctorId);
      return { connection: synced, previousStatus, justConnected: false };
    }

    // Em qr_pending, CLOSED/disconnected é transitório.
    if (providerStatus.status === 'disconnected' && previousStatus === 'qr_pending') {
      const pendingSince = connection.updatedAt?.getTime?.() ?? now.getTime();
      const elapsed = now.getTime() - pendingSince;
      const hasQr = Boolean(connection.qrCode || providerStatus.qrCode);

      if (!hasQr && elapsed >= QR_PENDING_GRACE_MS) {
        const synced = await updateWhatsappConnectionStatus(connection.doctorId, 'error', {
          sessionId: connection.sessionId,
          errorMessage:
            'QR Code não ficou disponível a tempo. Isso costuma ser problema no servidor WhatsApp (VM): Chromium sem memória, container parado ou sessão corrompida. Verifique a VM e clique em Conectar.',
          lastCheckAt: now,
          qrCode: undefined,
        });
        return { connection: synced, previousStatus, justConnected: false };
      }

      const synced = await updateWhatsappConnectionStatus(connection.doctorId, 'qr_pending', {
        sessionId: connection.sessionId,
        qrCode: providerStatus.qrCode ?? connection.qrCode,
        lastCheckAt: now,
        errorMessage: undefined,
        touchUpdatedAt: false,
      });
      return { connection: synced, previousStatus, justConnected: false };
    }

    const synced = await updateWhatsappConnectionStatus(connection.doctorId, 'qr_pending', {
      sessionId: connection.sessionId,
      qrCode: providerStatus.qrCode ?? connection.qrCode,
      lastCheckAt: now,
      errorMessage: undefined,
      touchUpdatedAt: false,
    });
    return { connection: synced, previousStatus, justConnected: false };
  } catch (error) {
    console.warn('[whatsapp-connection-sync] provider sync:', error);
    const synced = await updateWhatsappConnectionStatus(connection.doctorId, connection.status, {
      sessionId: connection.sessionId,
      lastCheckAt: now,
      touchUpdatedAt: false,
    });
    return { connection: synced, previousStatus, justConnected: false };
  }
}
