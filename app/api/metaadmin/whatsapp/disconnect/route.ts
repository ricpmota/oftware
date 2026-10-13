import { NextRequest, NextResponse } from 'next/server';
import { requireMedicoMetaadmin } from '@/lib/server/metaadminExamesImagemGate';
import { getWhatsappMedicoContext } from '@/lib/server/whatsappMedicoContext.server';
import { withWhatsappProviderAuth } from '@/lib/server/whatsappSessionAuth.server';
import {
  disconnectWhatsappConnection,
  getWhatsappConnectionByDoctor,
  serializeWhatsappConnection,
} from '@/services/whatsappConnectionService';
import { disconnectSession } from '@/services/whatsappProviderClient';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * POST /api/metaadmin/whatsapp/disconnect
 * Logout real no WPP (desvincula no celular) + limpa dados da sessão + marca disconnected.
 */
export async function POST(request: NextRequest) {
  const auth = await requireMedicoMetaadmin(request);
  if (!auth.ok) return auth.res;

  try {
    const doctorId = auth.medicoDocId;
    const existing = await getWhatsappConnectionByDoctor(doctorId);
    const sessionId = existing?.sessionId ?? (await getWhatsappMedicoContext(doctorId)).sessionId;

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
      console.warn('[metaadmin/whatsapp/disconnect] provider logout:', providerError);
      providerWarning =
        'Não foi possível encerrar a sessão no servidor WhatsApp. No celular, remova o dispositivo em Aparelhos conectados e use Conectar novamente.';
    }

    const connection = await disconnectWhatsappConnection(doctorId);

    return NextResponse.json({
      ok: true,
      connection: serializeWhatsappConnection(connection),
      loggedOut: providerResult.loggedOut,
      clearedData: providerResult.clearedData,
      warning: providerWarning,
      message: providerResult.loggedOut
        ? 'WhatsApp desconectado. Use Conectar para gerar um novo QR Code.'
        : providerWarning,
    });
  } catch (error) {
    console.error('[metaadmin/whatsapp/disconnect]', error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Erro ao desconectar WhatsApp.' },
      { status: 500 },
    );
  }
}
