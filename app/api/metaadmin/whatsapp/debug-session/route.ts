import { NextRequest, NextResponse } from 'next/server';
import { requireMedicoMetaadmin } from '@/lib/server/metaadminExamesImagemGate';
import { getWhatsappMedicoContext } from '@/lib/server/whatsappMedicoContext.server';
import { withWhatsappProviderAuth } from '@/lib/server/whatsappSessionAuth.server';
import { getWhatsappConnectionByDoctor } from '@/services/whatsappConnectionService';
import { getSessionStatus, isWhatsappMockMode } from '@/services/whatsappProviderClient';

export const runtime = 'nodejs';
export const maxDuration = 30;

/**
 * GET /api/metaadmin/whatsapp/debug-session
 * Diagnóstico: sessionId + reachability do WPP + status bruto (sem token).
 */
export async function GET(request: NextRequest) {
  const auth = await requireMedicoMetaadmin(request);
  if (!auth.ok) return auth.res;

  try {
    const { doctorId, organizationId, sessionId } = await getWhatsappMedicoContext(auth.medicoDocId);
    const connection = await getWhatsappConnectionByDoctor(doctorId);
    const wppConfigured = Boolean(process.env.WPP_SERVER_URL?.trim()) && !isWhatsappMockMode();

    let provider: {
      reachable: boolean;
      status?: string;
      hasQrCode?: boolean;
      hasPhone?: boolean;
      errorMessage?: string;
    } = { reachable: false };

    if (wppConfigured) {
      try {
        const { result } = await withWhatsappProviderAuth(doctorId, sessionId, (token) =>
          getSessionStatus(sessionId, token),
        );
        provider = {
          reachable: true,
          status: result.status,
          hasQrCode: Boolean(result.qrCode),
          hasPhone: Boolean(result.phone),
          errorMessage: result.errorMessage,
        };
      } catch (error) {
        provider = {
          reachable: false,
          errorMessage: error instanceof Error ? error.message : 'Falha ao falar com o WPP.',
        };
      }
    }

    return NextResponse.json({
      ok: true,
      doctorId,
      organizationId,
      sessionId,
      mockMode: isWhatsappMockMode(),
      wppConfigured,
      firestoreStatus: connection?.status ?? null,
      firestoreHasQr: Boolean(connection?.qrCode),
      provider,
      hint: !provider.reachable
        ? 'VM/WPP inacessível — verifique se o container está up em whatsapp.oftware.com.br'
        : provider.status === 'disconnected' && !provider.hasQrCode
          ? 'Sessão CLOSED sem QR — Chromium pode ter falhado na VM (RAM/disco/logs do Docker)'
          : provider.hasQrCode
            ? 'QR disponível no provedor'
            : undefined,
    });
  } catch (error) {
    console.error('[metaadmin/whatsapp/debug-session]', error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Erro ao diagnosticar sessão WhatsApp.' },
      { status: 500 },
    );
  }
}
