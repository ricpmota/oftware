import { FieldValue } from 'firebase-admin/firestore';
import {
  DISPAROS_WHATSAPP_OWNER,
  DISPAROS_WHATSAPP_SESSION_ID,
} from '@/lib/disparos/constants';
import {
  assertDisparosWhatsappSession,
  isDisparosWhatsappSession,
  publicDisparosWhatsappError,
} from '@/lib/disparos/disparosWhatsappGuard';
import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import { withWhatsappProviderAuth } from '@/lib/server/whatsappSessionAuth.server';
import {
  disconnectWhatsappConnection,
  getWhatsappConnectionByDoctor,
  serializeWhatsappConnection,
  upsertWhatsappConnection,
} from '@/services/whatsappConnectionService';
import { syncWhatsappConnectionWithProvider } from '@/services/whatsappConnectionSyncService';
import {
  disconnectSession,
  startSession,
  WhatsappProviderError,
} from '@/services/whatsappProviderClient';
import type { WhatsappConnection, WhatsappConnectionDto } from '@/types/whatsappConnection';

const COLLECTION = 'whatsappConnections';

export function serializeDisparosConnection(connection: WhatsappConnection): WhatsappConnectionDto {
  assertDisparosWhatsappSession(connection.sessionId);
  const dto = serializeWhatsappConnection(connection);
  return {
    ...dto,
    sessionId: DISPAROS_WHATSAPP_SESSION_ID,
    errorMessage: dto.errorMessage
      ? publicDisparosWhatsappError(new Error(dto.errorMessage), 'Erro na conexão do Disparos.')
      : undefined,
  };
}

async function clearDisparosProfile(qrCode?: string) {
  const clearPayload: Record<string, unknown> = {
    phone: FieldValue.delete(),
    profileName: FieldValue.delete(),
    connectedAt: FieldValue.delete(),
    errorMessage: FieldValue.delete(),
    qrCode: qrCode ? qrCode : FieldValue.delete(),
  };
  await getFirestoreAdmin()
    .collection(COLLECTION)
    .doc(DISPAROS_WHATSAPP_OWNER)
    .set(clearPayload, { merge: true });
}

export async function readDisparosWhatsappStatus(): Promise<{
  status: WhatsappConnectionDto['status'] | 'disconnected';
  connection: WhatsappConnectionDto | null;
  justConnected: boolean;
  error?: string;
}> {
  const existing = await getWhatsappConnectionByDoctor(DISPAROS_WHATSAPP_OWNER);
  if (!existing) {
    return { status: 'disconnected', connection: null, justConnected: false };
  }
  if (!isDisparosWhatsappSession(existing.sessionId)) {
    return {
      status: 'error',
      connection: null,
      justConnected: false,
      error: 'A conexão salva não é a sessão de Disparos. Nenhuma outra sessão foi alterada.',
    };
  }

  let connection = existing;
  let justConnected = false;
  if (
    connection.status === 'qr_pending' ||
    connection.status === 'connected' ||
    connection.status === 'error'
  ) {
    const sync = await syncWhatsappConnectionWithProvider(connection);
    connection = sync.connection;
    justConnected = sync.justConnected;
    assertDisparosWhatsappSession(connection.sessionId);
  }

  return {
    status: connection.status,
    connection: serializeDisparosConnection(connection),
    justConnected,
  };
}

export async function startDisparosWhatsappSession(): Promise<{
  ok: boolean;
  status: string;
  deferred?: boolean;
  connection: WhatsappConnectionDto | null;
  error?: string;
  httpStatus: number;
}> {
  const now = new Date();
  assertDisparosWhatsappSession(DISPAROS_WHATSAPP_SESSION_ID);

  await upsertWhatsappConnection({
    doctorId: DISPAROS_WHATSAPP_OWNER,
    status: 'qr_pending',
    provider: 'wppconnect',
    sessionId: DISPAROS_WHATSAPP_SESSION_ID,
    lastCheckAt: now,
  });
  await clearDisparosProfile();

  try {
    const authResult = await withWhatsappProviderAuth(
      DISPAROS_WHATSAPP_OWNER,
      DISPAROS_WHATSAPP_SESSION_ID,
      (token) => startSession(DISPAROS_WHATSAPP_SESSION_ID, token, { forceFreshQr: true }),
    );
    const providerResult = authResult.result;
    const resolvedStatus =
      providerResult.status === 'connected'
        ? 'connected'
        : providerResult.status === 'error'
          ? 'error'
          : 'qr_pending';

    await upsertWhatsappConnection({
      doctorId: DISPAROS_WHATSAPP_OWNER,
      status: resolvedStatus,
      provider: 'wppconnect',
      sessionId: DISPAROS_WHATSAPP_SESSION_ID,
      wppSessionToken: authResult.accessToken,
      qrCode: resolvedStatus === 'qr_pending' ? providerResult.qrCode : undefined,
      phone: resolvedStatus === 'connected' ? providerResult.phone : undefined,
      profileName: resolvedStatus === 'connected' ? providerResult.profileName : undefined,
      errorMessage: resolvedStatus === 'error' ? providerResult.errorMessage : undefined,
      connectedAt: resolvedStatus === 'connected' ? now : undefined,
      lastCheckAt: new Date(),
    });

    if (resolvedStatus === 'qr_pending') {
      await clearDisparosProfile(providerResult.qrCode);
    } else if (resolvedStatus === 'connected') {
      await getFirestoreAdmin().collection(COLLECTION).doc(DISPAROS_WHATSAPP_OWNER).set(
        { qrCode: FieldValue.delete(), errorMessage: FieldValue.delete() },
        { merge: true },
      );
    }

    const fresh = await getWhatsappConnectionByDoctor(DISPAROS_WHATSAPP_OWNER);
    return {
      ok: resolvedStatus !== 'error',
      status: fresh?.status ?? resolvedStatus,
      connection: fresh ? serializeDisparosConnection(fresh) : null,
      error:
        resolvedStatus === 'error'
          ? publicDisparosWhatsappError(
              new Error(providerResult.errorMessage ?? ''),
              'Não foi possível iniciar o WhatsApp de Disparos.',
            )
          : undefined,
      httpStatus: resolvedStatus === 'error' ? 502 : 200,
    };
  } catch (error) {
    const isTimeout =
      error instanceof WhatsappProviderError &&
      (error.code === 'TIMEOUT' || /tempo esgotado|timeout|504/i.test(error.message));
    if (isTimeout) {
      const pending = await getWhatsappConnectionByDoctor(DISPAROS_WHATSAPP_OWNER);
      return {
        ok: true,
        status: 'qr_pending',
        deferred: true,
        connection: pending ? serializeDisparosConnection(pending) : null,
        httpStatus: 200,
      };
    }

    const message = publicDisparosWhatsappError(error, 'Não foi possível iniciar o WhatsApp de Disparos.');
    try {
      await upsertWhatsappConnection({
        doctorId: DISPAROS_WHATSAPP_OWNER,
        status: 'error',
        provider: 'wppconnect',
        sessionId: DISPAROS_WHATSAPP_SESSION_ID,
        errorMessage: message,
        lastCheckAt: new Date(),
      });
    } catch (persistError) {
      console.error('[disparos/whatsapp/start-session] persist', persistError);
    }
    const fresh = await getWhatsappConnectionByDoctor(DISPAROS_WHATSAPP_OWNER);
    return {
      ok: false,
      status: 'error',
      connection: fresh ? serializeDisparosConnection(fresh) : null,
      error: message,
      httpStatus: 500,
    };
  }
}

export async function disconnectDisparosWhatsappSession(): Promise<{
  connection: WhatsappConnectionDto;
  loggedOut: boolean;
  warning?: string;
  message: string;
}> {
  const existing = await getWhatsappConnectionByDoctor(DISPAROS_WHATSAPP_OWNER);
  if (existing && !isDisparosWhatsappSession(existing.sessionId)) {
    throw new Error('A conexão salva não é a sessão de Disparos. Nada foi desconectado.');
  }

  assertDisparosWhatsappSession(DISPAROS_WHATSAPP_SESSION_ID);
  let loggedOut = false;
  let warning: string | undefined;

  try {
    const authResult = await withWhatsappProviderAuth(
      DISPAROS_WHATSAPP_OWNER,
      DISPAROS_WHATSAPP_SESSION_ID,
      (token) => disconnectSession(DISPAROS_WHATSAPP_SESSION_ID, token),
    );
    loggedOut = authResult.result.loggedOut;
    if (!loggedOut) {
      warning =
        'O Disparos desconectou aqui, mas o celular pode ainda listar este aparelho. Remova em WhatsApp → Aparelhos conectados e use Conectar de novo.';
    }
  } catch (error) {
    console.warn('[disparos/whatsapp/disconnect] provider', error);
    warning =
      'Não foi possível encerrar a sessão no servidor do WhatsApp. No celular, remova o aparelho em Aparelhos conectados e use Conectar de novo.';
  }

  await disconnectWhatsappConnection(DISPAROS_WHATSAPP_OWNER);
  await getFirestoreAdmin().collection(COLLECTION).doc(DISPAROS_WHATSAPP_OWNER).set(
    {
      sessionId: DISPAROS_WHATSAPP_SESSION_ID,
      provider: 'wppconnect',
    },
    { merge: true },
  );
  const fresh = await getWhatsappConnectionByDoctor(DISPAROS_WHATSAPP_OWNER);
  if (!fresh || !isDisparosWhatsappSession(fresh.sessionId)) {
    throw new Error('Não foi possível salvar a desconexão do Disparos.');
  }
  return {
    connection: serializeDisparosConnection(fresh),
    loggedOut,
    warning,
    message: loggedOut
      ? 'WhatsApp de Disparos desconectado.'
      : warning || 'WhatsApp de Disparos desconectado.',
  };
}
