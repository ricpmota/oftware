import { NextRequest, NextResponse } from 'next/server';
import { requireMetaAdminGeral } from '@/lib/metaadmin/requireMetaAdminGeral';
import {
  DEFAULT_AUTO_APLICACAO_HORARIO,
  getBrasilDateTimeParts,
  horarioConfiguradoJaPassou,
} from '@/lib/time/brasilTimezone';
import { CANAL_CHAT_OWNER_ID } from '@/lib/whatsapp/canalChatOwner';
import { syncWhatsappConnectionWithProvider } from '@/services/whatsappConnectionSyncService';
import { maybeNotifyDoctorWhatsappDisconnected } from '@/services/whatsappDisconnectNotifyService';
import {
  getWhatsappConnectionByDoctor,
  serializeWhatsappConnection,
} from '@/services/whatsappConnectionService';
import { ensureCanalChatInboundWebhook } from '@/services/canalChatWebhookEnsureService';

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
 * GET /api/metaadmingeral/canal-chat/whatsapp/status
 * Status da conexão WhatsApp do Canal Chat (sistema).
 */
export async function GET(request: NextRequest) {
  const auth = await requireMetaAdminGeral(request);
  if (auth instanceof NextResponse) return auth;

  try {
    let connection = await getWhatsappConnectionByDoctor(CANAL_CHAT_OWNER_ID);

    if (!connection) {
      return NextResponse.json({
        ok: true,
        status: 'disconnected' as const,
        connection: null,
        brasilClock: buildBrasilClock(),
        justConnected: false,
        unsentTodayCount: 0,
      });
    }

    let justConnected = false;
    const previousStatus = connection.status;

    if (connection.status === 'qr_pending' || connection.status === 'connected') {
      const sync = await syncWhatsappConnectionWithProvider(connection);
      connection = sync.connection;
      justConnected = sync.justConnected;

      if (previousStatus === 'connected' && connection.status !== 'connected') {
        void maybeNotifyDoctorWhatsappDisconnected({
          doctorId: CANAL_CHAT_OWNER_ID,
          previousStatus,
          currentStatus: connection.status,
        }).catch((error) => {
          console.warn('[metaadmingeral/canal-chat/whatsapp/status] disconnect notify:', error);
        });
      }
    }

    if (connection.status === 'connected') {
      void ensureCanalChatInboundWebhook();
    }

    return NextResponse.json({
      ok: true,
      status: connection.status,
      connection: serializeWhatsappConnection(connection),
      brasilClock: buildBrasilClock(connection.autoAplicacaoHorario),
      justConnected,
      unsentTodayCount: 0,
    });
  } catch (error) {
    console.error('[metaadmingeral/canal-chat/whatsapp/status]', error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Erro ao consultar status WhatsApp.' },
      { status: 500 },
    );
  }
}
