import { NextRequest, NextResponse } from 'next/server';
import { requireMedicoMetaadmin } from '@/lib/server/metaadminExamesImagemGate';
import {
  getBrasilDateTimeParts,
  horarioConfiguradoJaPassou,
  DEFAULT_AUTO_APLICACAO_HORARIO,
} from '@/lib/time/brasilTimezone';
import { syncWhatsappConnectionWithProvider } from '@/services/whatsappConnectionSyncService';
import { maybeNotifyDoctorWhatsappDisconnected } from '@/services/whatsappDisconnectNotifyService';
import {
  getWhatsappConnectionByDoctor,
  serializeWhatsappConnection,
} from '@/services/whatsappConnectionService';
import { countTodayUnsentWhatsappItemsForDoctor } from '@/services/whatsappTodayResendService';

export const runtime = 'nodejs';

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

/**
 * GET /api/metaadmin/whatsapp/status
 * Retorna status da conexão do médico logado (sem conversas/contatos).
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
        brasilClock: buildBrasilClock(),
      });
    }

    const previousStatus = connection.status;
    let justConnected = false;
    let unsentTodayCount = 0;

    if (
      connection.status === 'qr_pending' ||
      connection.status === 'connected' ||
      connection.status === 'error'
    ) {
      const sync = await syncWhatsappConnectionWithProvider(connection);
      connection = sync.connection;
      justConnected = sync.justConnected;

      if (previousStatus === 'connected' && connection.status !== 'connected') {
        void maybeNotifyDoctorWhatsappDisconnected({
          doctorId: auth.medicoDocId,
          previousStatus,
          currentStatus: connection.status,
        }).catch((error) => {
          console.warn('[metaadmin/whatsapp/status] disconnect notify:', error);
        });
      }

      if (justConnected) {
        const counts = await countTodayUnsentWhatsappItemsForDoctor(auth.medicoDocId);
        unsentTodayCount = counts.total;
      }
    }

    return NextResponse.json({
      ok: true,
      status: connection.status,
      connection: serializeWhatsappConnection(connection),
      brasilClock: buildBrasilClock(connection.autoAplicacaoHorario),
      justConnected,
      unsentTodayCount,
    });
  } catch (error) {
    console.error('[metaadmin/whatsapp/status]', error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Erro ao consultar status WhatsApp.' },
      { status: 500 },
    );
  }
}
