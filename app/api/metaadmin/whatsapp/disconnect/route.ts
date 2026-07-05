import { NextRequest, NextResponse } from 'next/server';
import { requireMedicoMetaadmin } from '@/lib/server/metaadminExamesImagemGate';
import { getWhatsappMedicoContext } from '@/lib/server/whatsappMedicoContext.server';
import {
  disconnectWhatsappConnection,
  getWhatsappConnectionByDoctor,
  serializeWhatsappConnection,
} from '@/services/whatsappConnectionService';
import { disconnectSession } from '@/services/whatsappProviderClient';

export const runtime = 'nodejs';

/**
 * POST /api/metaadmin/whatsapp/disconnect
 * Etapa 4 — encerra sessão no WPPConnect central e marca disconnected.
 */
export async function POST(request: NextRequest) {
  const auth = await requireMedicoMetaadmin(request);
  if (!auth.ok) return auth.res;

  try {
    const doctorId = auth.medicoDocId;
    const existing = await getWhatsappConnectionByDoctor(doctorId);
    const sessionId = existing?.sessionId ?? (await getWhatsappMedicoContext(doctorId)).sessionId;
    try {
      await disconnectSession(sessionId);
    } catch (providerError) {
      console.warn('[metaadmin/whatsapp/disconnect] provider logout:', providerError);
    }

    const connection = await disconnectWhatsappConnection(doctorId);

    return NextResponse.json({
      ok: true,
      connection: serializeWhatsappConnection(connection),
    });
  } catch (error) {
    console.error('[metaadmin/whatsapp/disconnect]', error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Erro ao desconectar WhatsApp.' },
      { status: 500 },
    );
  }
}
