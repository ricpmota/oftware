import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { requireMedicoMetaadmin } from '@/lib/server/metaadminExamesImagemGate';
import { getWhatsappMedicoContext } from '@/lib/server/whatsappMedicoContext.server';
import { withWhatsappProviderAuth } from '@/lib/server/whatsappSessionAuth.server';
import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import {
  getWhatsappConnectionByDoctor,
  serializeWhatsappConnection,
  upsertWhatsappConnection,
} from '@/services/whatsappConnectionService';
import { startSession, WhatsappProviderError } from '@/services/whatsappProviderClient';

export const runtime = 'nodejs';
export const maxDuration = 60;

const COLLECTION = 'whatsappConnections';

async function clearStaleProfile(doctorId: string, qrCode?: string) {
  const clearPayload: Record<string, unknown> = {
    phone: FieldValue.delete(),
    profileName: FieldValue.delete(),
    connectedAt: FieldValue.delete(),
    errorMessage: FieldValue.delete(),
  };
  if (qrCode) {
    clearPayload.qrCode = qrCode;
  } else {
    clearPayload.qrCode = FieldValue.delete();
  }
  await getFirestoreAdmin().collection(COLLECTION).doc(doctorId).set(clearPayload, { merge: true });
}

/**
 * POST /api/metaadmin/whatsapp/start-session
 * Encerra sessão antiga e inicia nova. Responde rápido; o QR chega via polling de /status.
 */
export async function POST(request: NextRequest) {
  const auth = await requireMedicoMetaadmin(request);
  if (!auth.ok) return auth.res;

  try {
    const { doctorId, organizationId, sessionId } = await getWhatsappMedicoContext(auth.medicoDocId);
    const now = new Date();

    // Marca qr_pending imediatamente — se o WPP demorar, o cliente já pode fazer poll.
    await upsertWhatsappConnection({
      doctorId,
      organizationId,
      status: 'qr_pending',
      provider: 'wppconnect',
      sessionId,
      lastCheckAt: now,
    });
    await clearStaleProfile(doctorId);

    let providerResult: Awaited<ReturnType<typeof startSession>>;
    let accessToken: string;

    try {
      const authResult = await withWhatsappProviderAuth(doctorId, sessionId, (token) =>
        startSession(sessionId, token, { forceFreshQr: true }),
      );
      providerResult = authResult.result;
      accessToken = authResult.accessToken;
    } catch (providerError) {
      // Timeout / 504 do WPP: sessão pode ter iniciado — devolve qr_pending para o poll do cliente.
      const isTimeout =
        providerError instanceof WhatsappProviderError &&
        (providerError.code === 'TIMEOUT' || /tempo esgotado|timeout|504/i.test(providerError.message));

      console.warn('[metaadmin/whatsapp/start-session] provider:', providerError);

      if (isTimeout) {
        const pending = (await getWhatsappConnectionByDoctor(doctorId))!;
        return NextResponse.json({
          ok: true,
          status: 'qr_pending',
          sessionId: pending.sessionId,
          qrCode: pending.qrCode,
          connection: serializeWhatsappConnection(pending),
          deferred: true,
        });
      }

      throw providerError;
    }

    const resolvedStatus =
      providerResult.status === 'connected'
        ? 'connected'
        : providerResult.status === 'error'
          ? 'error'
          : 'qr_pending';

    await upsertWhatsappConnection({
      doctorId,
      organizationId,
      status: resolvedStatus,
      provider: 'wppconnect',
      sessionId: providerResult.sessionId,
      wppSessionToken: accessToken,
      qrCode: resolvedStatus === 'qr_pending' ? providerResult.qrCode : undefined,
      phone: resolvedStatus === 'connected' ? providerResult.phone : undefined,
      profileName: resolvedStatus === 'connected' ? providerResult.profileName : undefined,
      errorMessage: resolvedStatus === 'error' ? providerResult.errorMessage : undefined,
      connectedAt: resolvedStatus === 'connected' ? now : undefined,
      lastCheckAt: new Date(),
    });

    if (resolvedStatus === 'qr_pending') {
      await clearStaleProfile(doctorId, providerResult.qrCode);
    } else if (resolvedStatus === 'connected') {
      await getFirestoreAdmin().collection(COLLECTION).doc(doctorId).set(
        { qrCode: FieldValue.delete(), errorMessage: FieldValue.delete() },
        { merge: true },
      );
    }

    const fresh = (await getWhatsappConnectionByDoctor(doctorId))!;

    if (resolvedStatus === 'error') {
      return NextResponse.json(
        {
          ok: false,
          error: providerResult.errorMessage ?? 'Erro ao iniciar sessão WhatsApp.',
          connection: serializeWhatsappConnection(fresh),
        },
        { status: 502 },
      );
    }

    return NextResponse.json({
      ok: true,
      status: fresh.status,
      sessionId: fresh.sessionId,
      qrCode: fresh.qrCode,
      connection: serializeWhatsappConnection(fresh),
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
