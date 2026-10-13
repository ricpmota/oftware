import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import { withWhatsappProviderAuth } from '@/lib/server/whatsappSessionAuth.server';
import type { WhatsappOwnerResolution } from '@/lib/server/whatsappProfessionalOwner.server';
import {
  DEFAULT_AUTO_APLICACAO_HORARIO,
  getBrasilDateTimeParts,
  horarioConfiguradoJaPassou,
} from '@/lib/time/brasilTimezone';
import { syncWhatsappConnectionWithProvider } from '@/services/whatsappConnectionSyncService';
import { maybeNotifyDoctorWhatsappDisconnected } from '@/services/whatsappDisconnectNotifyService';
import {
  disconnectWhatsappConnection,
  getWhatsappConnectionByDoctor,
  serializeWhatsappConnection,
  upsertWhatsappConnection,
} from '@/services/whatsappConnectionService';
import { disconnectSession, startSession, WhatsappProviderError } from '@/services/whatsappProviderClient';

const COLLECTION = 'whatsappConnections';

function buildBrasilClock(configuredHorario?: string) {
  const brasil = getBrasilDateTimeParts();
  const horario = configuredHorario?.trim() || DEFAULT_AUTO_APLICACAO_HORARIO;
  return {
    timezone: 'America/Sao_Paulo',
    timezoneLabel: 'Horário de Brasília',
    dateKey: brasil.dateKey,
    hhmm: brasil.hhmm,
    configuredHorario: horario,
    envioLiberado: horarioConfiguradoJaPassou(brasil.hhmm, horario),
    cronVerifica: 'a cada 1 minuto (produção)',
  };
}

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

export async function handleProfessionalWhatsappStatus(
  owner: WhatsappOwnerResolution,
  logPrefix: string,
): Promise<NextResponse> {
  try {
    const doctorId = owner.doctorId;
    let connection = await getWhatsappConnectionByDoctor(doctorId);

    if (!connection) {
      return NextResponse.json({
        ok: true,
        status: 'disconnected' as const,
        connection: null,
        sharedWithMedico: owner.sharedWithMedico,
        brasilClock: buildBrasilClock(),
        justConnected: false,
        unsentTodayCount: 0,
      });
    }

    const previousStatus = connection.status;
    let justConnected = false;

    if (
      connection.status === 'qr_pending' ||
      connection.status === 'connected' ||
      connection.status === 'error'
    ) {
      const sync = await syncWhatsappConnectionWithProvider(connection);
      connection = sync.connection;
      justConnected = sync.justConnected;

      if (owner.sharedWithMedico && previousStatus === 'connected' && connection.status !== 'connected') {
        void maybeNotifyDoctorWhatsappDisconnected({
          doctorId,
          previousStatus,
          currentStatus: connection.status,
        }).catch((error) => {
          console.warn(`[${logPrefix}/status] disconnect notify:`, error);
        });
      }
    }

    return NextResponse.json({
      ok: true,
      status: connection.status,
      connection: serializeWhatsappConnection(connection),
      sharedWithMedico: owner.sharedWithMedico,
      brasilClock: buildBrasilClock(connection.autoAplicacaoHorario),
      justConnected,
      unsentTodayCount: 0,
    });
  } catch (error) {
    console.error(`[${logPrefix}/status]`, error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Erro ao consultar status WhatsApp.' },
      { status: 500 },
    );
  }
}

export async function handleProfessionalWhatsappStartSession(
  owner: WhatsappOwnerResolution,
  logPrefix: string,
): Promise<NextResponse> {
  try {
    const { doctorId, organizationId, sessionId } = owner;
    const now = new Date();

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
      const isTimeout =
        providerError instanceof WhatsappProviderError &&
        (providerError.code === 'TIMEOUT' || /tempo esgotado|timeout|504/i.test(providerError.message));

      console.warn(`[${logPrefix}/start-session] provider:`, providerError);

      if (isTimeout) {
        const pending = (await getWhatsappConnectionByDoctor(doctorId))!;
        return NextResponse.json({
          ok: true,
          status: 'qr_pending',
          sessionId: pending.sessionId,
          qrCode: pending.qrCode,
          connection: serializeWhatsappConnection(pending),
          sharedWithMedico: owner.sharedWithMedico,
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
          sharedWithMedico: owner.sharedWithMedico,
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
      sharedWithMedico: owner.sharedWithMedico,
    });
  } catch (error) {
    console.error(`[${logPrefix}/start-session]`, error);

    try {
      await upsertWhatsappConnection({
        doctorId: owner.doctorId,
        organizationId: owner.organizationId,
        status: 'error',
        provider: 'wppconnect',
        sessionId: owner.sessionId,
        errorMessage: error instanceof Error ? error.message : 'Erro ao iniciar sessão WhatsApp.',
        lastCheckAt: new Date(),
      });
    } catch (persistError) {
      console.error(`[${logPrefix}/start-session] persist error:`, persistError);
    }

    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Erro ao iniciar sessão WhatsApp.' },
      { status: 500 },
    );
  }
}

export async function handleProfessionalWhatsappDisconnect(
  owner: WhatsappOwnerResolution,
  logPrefix: string,
): Promise<NextResponse> {
  try {
    const doctorId = owner.doctorId;
    const existing = await getWhatsappConnectionByDoctor(doctorId);
    const sessionId = existing?.sessionId ?? owner.sessionId;

    let providerResult = { loggedOut: false, closed: false, clearedData: false };
    let providerWarning: string | undefined;

    try {
      const authResult = await withWhatsappProviderAuth(doctorId, sessionId, (token) =>
        disconnectSession(sessionId, token),
      );
      providerResult = authResult.result;
      if (!providerResult.loggedOut) {
        providerWarning =
          'A Oftware desconectou aqui, mas o WhatsApp do celular pode ainda listar este dispositivo. Remova em WhatsApp → Aparelhos conectados, depois use Conectar.';
      }
    } catch (providerError) {
      console.warn(`[${logPrefix}/disconnect] provider logout:`, providerError);
      providerWarning =
        'Não foi possível encerrar a sessão no servidor WhatsApp. No celular, remova o dispositivo em Aparelhos conectados e use Conectar novamente.';
    }

    const connection = await disconnectWhatsappConnection(doctorId);

    return NextResponse.json({
      ok: true,
      connection: serializeWhatsappConnection(connection),
      sharedWithMedico: owner.sharedWithMedico,
      loggedOut: providerResult.loggedOut,
      clearedData: providerResult.clearedData,
      warning: providerWarning,
      message: providerResult.loggedOut
        ? 'WhatsApp desconectado. Use Conectar para gerar um novo QR Code.'
        : providerWarning,
    });
  } catch (error) {
    console.error(`[${logPrefix}/disconnect]`, error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Erro ao desconectar WhatsApp.' },
      { status: 500 },
    );
  }
}
