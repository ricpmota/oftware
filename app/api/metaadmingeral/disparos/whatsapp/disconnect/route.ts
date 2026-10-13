import { NextRequest, NextResponse } from 'next/server';
import { requireMetaAdminGeral } from '@/lib/metaadmin/requireMetaAdminGeral';
import { publicDisparosWhatsappError } from '@/lib/disparos/disparosWhatsappGuard';
import { disconnectDisparosWhatsappSession } from '@/lib/server/disparosWhatsapp.server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * POST /api/metaadmingeral/disparos/whatsapp/disconnect
 * Encerra somente a sessão exclusiva do Disparos.
 */
export async function POST(request: NextRequest) {
  const auth = await requireMetaAdminGeral(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const result = await disconnectDisparosWhatsappSession();
    return NextResponse.json({
      ok: true,
      connection: result.connection,
      loggedOut: result.loggedOut,
      warning: result.warning,
      message: result.message,
    });
  } catch (error) {
    console.error('[disparos/whatsapp/disconnect]', error);
    const message = publicDisparosWhatsappError(error, 'Não foi possível desconectar o WhatsApp de Disparos.');
    const status = /não é a sessão de Disparos/i.test(message) ? 409 : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
