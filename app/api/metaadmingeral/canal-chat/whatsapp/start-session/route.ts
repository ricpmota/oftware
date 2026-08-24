import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { requireMetaAdminGeral } from '@/lib/metaadmin/requireMetaAdminGeral';
import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import { withWhatsappProviderAuth } from '@/lib/server/whatsappSessionAuth.server';
import {
  CANAL_CHAT_OWNER_ID,
  CANAL_CHAT_SESSION_ID,
  getCanalChatWhatsappContext,
} from '@/lib/whatsapp/canalChatOwner';
import {
  getWhatsappConnectionByDoctor,
  serializeWhatsappConnection,
  upsertWhatsappConnection,
} from '@/services/whatsappConnectionService';
import { startSession, WhatsappProviderError } from '@/services/whatsappProviderClient';
import { buildCanalChatInboundWebhookUrl } from '@/lib/whatsapp/webhookSecret';
import { ensureCanalChatInboundWebhook } from '@/services/canalChatWebhookEnsureService';

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
 * POST /api/metaadmingeral/canal-chat/whatsapp/start-session
 * Conecta o WhatsApp do sistema (Canal Chat).
 */
export async function POST(request: NextRequest) {
  const auth = await requireMetaAdminGeral(request);
  if (auth instanceof NextResponse) return auth;

  const { doctorId, sessionId } = getCanalChatWhatsappContext();
  const now = new Date();

  try {
    await upsertWhatsappConnection({
      doctorId,
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
        startSession(sessionId, token, {
          forceFreshQr: true,
          webhookUrl: buildCanalChatInboundWebhookUrl(),
        }),
      );
      providerResult = authResult.result;
      accessToken = authResult.accessToken;
    } catch (providerError) {
      const isTimeout =
        providerError instanceof WhatsappProviderError &&
        (providerError.code === 'TIMEOUT' || /tempo esgotado|timeout|504/i.test(providerError.message));

      console.warn('[metaadmingeral/canal-chat/whatsapp/start-session] provider:', providerError);

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
      status: resolvedStatus,
      provider: 'wppconnect',
      sessionId: providerResult.sessionId || CANAL_CHAT_SESSION_ID,
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
      void ensureCanalChatInboundWebhook({ force: true });
    }

    const fresh = (await getWhatsappConnectionByDoctor(doctorId))!;

    if (resolvedStatus === 'error') {
      return NextResponse.json(
        {
          ok: false,
          error: providerResult.errorMessage ?? 'Erro ao iniciar sessão WhatsApp do Canal Chat.',
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
    console.error('[metaadmingeral/canal-chat/whatsapp/start-session]', error);

    try {
      await upsertWhatsappConnection({
        doctorId: CANAL_CHAT_OWNER_ID,
        status: 'error',
        provider: 'wppconnect',
        sessionId: CANAL_CHAT_SESSION_ID,
        errorMessage: error instanceof Error ? error.message : 'Erro ao iniciar sessão WhatsApp.',
        lastCheckAt: new Date(),
      });
    } catch (persistError) {
      console.error('[metaadmingeral/canal-chat/whatsapp/start-session] persist error:', persistError);
    }

    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Erro ao iniciar sessão WhatsApp.' },
      { status: 500 },
    );
  }
}
