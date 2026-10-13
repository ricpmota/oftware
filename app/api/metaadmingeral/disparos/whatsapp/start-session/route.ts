import { NextRequest, NextResponse } from 'next/server';
import { requireMetaAdminGeral } from '@/lib/metaadmin/requireMetaAdminGeral';
import { publicDisparosWhatsappError } from '@/lib/disparos/disparosWhatsappGuard';
import { startDisparosWhatsappSession } from '@/lib/server/disparosWhatsapp.server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * POST /api/metaadmingeral/disparos/whatsapp/start-session
 * Abre somente a sessão exclusiva do Disparos. Não registra webhook de outro módulo.
 */
export async function POST(request: NextRequest) {
  const auth = await requireMetaAdminGeral(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const result = await startDisparosWhatsappSession();
    return NextResponse.json(
      {
        ok: result.ok,
        status: result.status,
        deferred: result.deferred,
        connection: result.connection,
        error: result.error,
        qrCode: result.connection?.qrCode,
      },
      { status: result.httpStatus },
    );
  } catch (error) {
    console.error('[disparos/whatsapp/start-session]', error);
    return NextResponse.json(
      { ok: false, error: publicDisparosWhatsappError(error, 'Não foi possível iniciar o WhatsApp de Disparos.') },
      { status: 500 },
    );
  }
}
