import { NextRequest, NextResponse } from 'next/server';
import { requirePersonalTrainerWhatsapp } from '@/lib/server/profissionalWhatsappGate';
import { listWhatsappDailyAgendaForDoctor } from '@/services/whatsappDailyAgendaService';
import { listWhatsappMessageLogs } from '@/services/whatsappMessageLogService';
import {
  getWhatsappCronHeartbeat,
  toWhatsappCronHeartbeatDto,
} from '@/services/whatsappCronHeartbeatService';
import { toWhatsappDailyAgendaItemDto } from '@/types/whatsappDailyAgenda';
import { toWhatsappMessageLogDto } from '@/types/whatsappMessageLog';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * GET /api/metapersonal/whatsapp/logs?limit=50&date=YYYY-MM-DD
 */
export async function GET(request: NextRequest) {
  const auth = await requirePersonalTrainerWhatsapp(request);
  if (!auth.ok) return auth.res;

  const limitRaw = request.nextUrl.searchParams.get('limit');
  const limit = limitRaw ? Number.parseInt(limitRaw, 10) : 50;
  const dateParam = request.nextUrl.searchParams.get('date')?.trim();

  try {
    const ownerId = auth.owner.doctorId;
    const [logs, agenda, cronHeartbeat] = await Promise.all([
      listWhatsappMessageLogs(ownerId, {
        limit: Number.isFinite(limit) ? limit : 50,
      }),
      listWhatsappDailyAgendaForDoctor(ownerId, dateParam || undefined),
      getWhatsappCronHeartbeat(),
    ]);

    return NextResponse.json({
      ok: true,
      logs: logs.map(toWhatsappMessageLogDto),
      agenda: {
        dateKey: agenda.dateKey,
        brasilDateKey: agenda.brasilDateKey,
        brasilHhmm: agenda.brasilHhmm,
        whatsappConnected: agenda.whatsappConnected,
        autoAplicacaoEnabled: agenda.autoAplicacaoEnabled,
        activatedKinds: agenda.activatedKinds,
        items: agenda.items.map(toWhatsappDailyAgendaItemDto),
        queueRebuild: agenda.queueRebuild,
      },
      cron: toWhatsappCronHeartbeatDto(cronHeartbeat),
    });
  } catch (error) {
    console.error('[metapersonal/whatsapp/logs]', error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Erro ao carregar logs do WhatsApp.',
      },
      { status: 500 },
    );
  }
}
