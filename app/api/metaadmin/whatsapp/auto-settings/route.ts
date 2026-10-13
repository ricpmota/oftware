import { NextRequest, NextResponse } from 'next/server';
import { requireMedicoMetaadmin } from '@/lib/server/metaadminExamesImagemGate';
import { parseHorarioBrasil } from '@/lib/time/brasilTimezone';
import {
  getWhatsappConnectionByDoctor,
  serializeWhatsappConnection,
  updateWhatsappAutoAplicacaoSettings,
} from '@/services/whatsappConnectionService';

export const runtime = 'nodejs';

/**
 * PATCH /api/metaadmin/whatsapp/auto-settings
 * Horário (Brasília) e switch de envio automático de aplicação.
 */
export async function PATCH(request: NextRequest) {
  const auth = await requireMedicoMetaadmin(request);
  if (!auth.ok) return auth.res;

  try {
    const body = (await request.json().catch(() => null)) as {
      autoAplicacaoEnabled?: boolean;
      autoAplicacaoHorario?: string;
    } | null;

    if (
      body?.autoAplicacaoEnabled === undefined &&
      body?.autoAplicacaoHorario === undefined
    ) {
      return NextResponse.json(
        { ok: false, error: 'Informe autoAplicacaoEnabled e/ou autoAplicacaoHorario.' },
        { status: 400 },
      );
    }

    if (body?.autoAplicacaoHorario !== undefined && !parseHorarioBrasil(body.autoAplicacaoHorario)) {
      return NextResponse.json(
        { ok: false, error: 'Horário inválido. Use HH:mm no fuso de Brasília (ex.: 08:00).' },
        { status: 400 },
      );
    }

    const connection = await updateWhatsappAutoAplicacaoSettings(auth.medicoDocId, {
      autoAplicacaoEnabled: body?.autoAplicacaoEnabled,
      autoAplicacaoHorario: body?.autoAplicacaoHorario,
    });

    if (body?.autoAplicacaoEnabled && connection.status !== 'connected') {
      return NextResponse.json({
        ok: true,
        warning: 'Envio automático ativado, mas o WhatsApp precisa estar conectado para funcionar.',
        connection: serializeWhatsappConnection(connection),
      });
    }

    return NextResponse.json({
      ok: true,
      connection: serializeWhatsappConnection(connection),
    });
  } catch (error) {
    console.error('[metaadmin/whatsapp/auto-settings]', error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Erro ao salvar configurações.' },
      { status: 500 },
    );
  }
}

/**
 * GET /api/metaadmin/whatsapp/auto-settings
 */
export async function GET(request: NextRequest) {
  const auth = await requireMedicoMetaadmin(request);
  if (!auth.ok) return auth.res;

  const connection = await getWhatsappConnectionByDoctor(auth.medicoDocId);

  return NextResponse.json({
    ok: true,
    connection: connection ? serializeWhatsappConnection(connection) : null,
  });
}
