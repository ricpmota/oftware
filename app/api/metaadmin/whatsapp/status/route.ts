import { NextRequest, NextResponse } from 'next/server';
import { requireMedicoMetaadmin } from '@/lib/server/metaadminExamesImagemGate';
import {
  getWhatsappConnectionByDoctor,
  serializeWhatsappConnection,
  updateWhatsappConnectionStatus,
} from '@/services/whatsappConnectionService';
import {
  getMockConnectedProfile,
  getSessionStatus,
  isWhatsappMockMode,
  MOCK_QR_AUTO_CONNECT_MS,
} from '@/services/whatsappProviderClient';
import type { WhatsappConnection } from '@/types/whatsappConnection';

export const runtime = 'nodejs';

async function syncConnectionWithProvider(connection: WhatsappConnection): Promise<WhatsappConnection> {
  const now = new Date();

  if (connection.status === 'qr_pending' && isWhatsappMockMode()) {
    const elapsed = now.getTime() - connection.updatedAt.getTime();
    if (elapsed >= MOCK_QR_AUTO_CONNECT_MS) {
      const mock = getMockConnectedProfile(connection.sessionId);
      return updateWhatsappConnectionStatus(connection.doctorId, 'connected', {
        sessionId: connection.sessionId,
        phone: mock.phone,
        profileName: mock.profileName,
        qrCode: undefined,
        connectedAt: now,
        lastCheckAt: now,
        errorMessage: undefined,
      });
    }
    return updateWhatsappConnectionStatus(connection.doctorId, 'qr_pending', {
      sessionId: connection.sessionId,
      lastCheckAt: now,
    });
  }

  if (connection.status !== 'qr_pending') {
    return updateWhatsappConnectionStatus(connection.doctorId, connection.status, {
      sessionId: connection.sessionId,
      lastCheckAt: now,
    });
  }

  try {
    const providerStatus = await getSessionStatus(connection.sessionId);

    if (providerStatus.status === 'connected') {
      return updateWhatsappConnectionStatus(connection.doctorId, 'connected', {
        sessionId: connection.sessionId,
        phone: providerStatus.phone,
        profileName: providerStatus.profileName,
        qrCode: undefined,
        connectedAt: now,
        lastCheckAt: now,
        errorMessage: undefined,
      });
    }

    if (providerStatus.status === 'error') {
      return updateWhatsappConnectionStatus(connection.doctorId, 'error', {
        sessionId: connection.sessionId,
        errorMessage: providerStatus.errorMessage ?? 'Erro na conexão WhatsApp.',
        lastCheckAt: now,
      });
    }

    if (providerStatus.status === 'disconnected') {
      return updateWhatsappConnectionStatus(connection.doctorId, 'disconnected', {
        sessionId: connection.sessionId,
        qrCode: undefined,
        lastCheckAt: now,
      });
    }

    return updateWhatsappConnectionStatus(connection.doctorId, 'qr_pending', {
      sessionId: connection.sessionId,
      qrCode: providerStatus.qrCode ?? connection.qrCode,
      lastCheckAt: now,
    });
  } catch (error) {
    console.warn('[metaadmin/whatsapp/status] provider sync:', error);
    return updateWhatsappConnectionStatus(connection.doctorId, connection.status, {
      sessionId: connection.sessionId,
      lastCheckAt: now,
    });
  }
}

/**
 * GET /api/metaadmin/whatsapp/status
 * Etapa 2 — retorna status da conexão do médico logado (sem conversas/contatos).
 */
export async function GET(request: NextRequest) {
  const auth = await requireMedicoMetaadmin(request);
  if (!auth.ok) return auth.res;

  try {
    let connection = await getWhatsappConnectionByDoctor(auth.medicoDocId);

    if (!connection) {
      return NextResponse.json({
        ok: true,
        status: 'disconnected' as const,
        connection: null,
      });
    }

    if (connection.status === 'qr_pending' || connection.status === 'connected') {
      connection = await syncConnectionWithProvider(connection);
    } else if (connection.status !== 'error') {
      connection = await updateWhatsappConnectionStatus(connection.doctorId, connection.status, {
        sessionId: connection.sessionId,
        lastCheckAt: new Date(),
      });
    }

    return NextResponse.json({
      ok: true,
      status: connection.status,
      connection: serializeWhatsappConnection(connection),
    });
  } catch (error) {
    console.error('[metaadmin/whatsapp/status]', error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Erro ao consultar status WhatsApp.' },
      { status: 500 },
    );
  }
}
