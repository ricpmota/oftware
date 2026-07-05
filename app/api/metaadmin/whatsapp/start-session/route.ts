import { NextRequest, NextResponse } from 'next/server';
import { requireMedicoMetaadmin } from '@/lib/server/metaadminExamesImagemGate';
import { getWhatsappMedicoContext } from '@/lib/server/whatsappMedicoContext.server';
import {
  serializeWhatsappConnection,
  upsertWhatsappConnection,
} from '@/services/whatsappConnectionService';
import { startSession } from '@/services/whatsappProviderClient';

export const runtime = 'nodejs';

/**
 * POST /api/metaadmin/whatsapp/start-session
 * Etapa 4 — sessão no WPPConnect central (sessionId com org + médico).
 * Não envia mensagens nem sincroniza conversas.
 */
export async function POST(request: NextRequest) {
  const auth = await requireMedicoMetaadmin(request);
  if (!auth.ok) return auth.res;

  try {
    const { doctorId, organizationId, sessionId } = await getWhatsappMedicoContext(auth.medicoDocId);

    const providerResult = await startSession(sessionId);
    const now = new Date();

    const resolvedStatus =
      providerResult.status === 'connected'
        ? 'connected'
        : providerResult.status === 'error'
          ? 'error'
          : providerResult.status === 'disconnected'
            ? 'disconnected'
            : 'qr_pending';

    const connection = await upsertWhatsappConnection({
      doctorId,
      organizationId,
      status: resolvedStatus,
      provider: 'wppconnect',
      sessionId: providerResult.sessionId,
      qrCode: resolvedStatus === 'qr_pending' ? providerResult.qrCode : undefined,
      phone: providerResult.phone,
      profileName: providerResult.profileName,
      errorMessage: providerResult.errorMessage,
      connectedAt: resolvedStatus === 'connected' ? now : undefined,
      lastCheckAt: now,
    });

    if (resolvedStatus === 'error') {
      return NextResponse.json(
        {
          ok: false,
          error: providerResult.errorMessage ?? 'Erro ao iniciar sessão WhatsApp.',
          connection: serializeWhatsappConnection(connection),
        },
        { status: 502 },
      );
    }

    return NextResponse.json({
      ok: true,
      status: connection.status,
      sessionId: connection.sessionId,
      qrCode: connection.qrCode,
      connection: serializeWhatsappConnection(connection),
    });
  } catch (error) {
    console.error('[metaadmin/whatsapp/start-session]', error);

    try {
      const ctx = await getWhatsappMedicoContext(auth.medicoDocId);
      await upsertWhatsappConnection({
        doctorId: ctx.doctorId,
        organizationId: ctx.organizationId,
        status: 'error',
        provider: 'wppconnect',
        sessionId: ctx.sessionId,
        errorMessage: error instanceof Error ? error.message : 'Erro ao iniciar sessão WhatsApp.',
        lastCheckAt: new Date(),
      });
    } catch (persistError) {
      console.error('[metaadmin/whatsapp/start-session] persist error:', persistError);
    }

    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Erro ao iniciar sessão WhatsApp.' },
      { status: 500 },
    );
  }
}
