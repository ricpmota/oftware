import { NextRequest, NextResponse } from 'next/server';
import { requireMetaAdminGeral } from '@/lib/metaadmin/requireMetaAdminGeral';
import { publicDisparosWhatsappError } from '@/lib/disparos/disparosWhatsappGuard';
import { readDisparosWhatsappStatus } from '@/lib/server/disparosWhatsapp.server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/metaadmingeral/disparos/whatsapp/status
 * Reconcilia somente o documento do Disparos com a sessão exclusiva desse módulo.
 */
export async function GET(request: NextRequest) {
  const auth = await requireMetaAdminGeral(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const result = await readDisparosWhatsappStatus();
    if (result.error) {
      return NextResponse.json({ ok: false, error: result.error, status: 'error', connection: null }, { status: 409 });
    }
    return NextResponse.json({
      ok: true,
      status: result.status,
      connection: result.connection,
      justConnected: result.justConnected,
    });
  } catch (error) {
    console.error('[disparos/whatsapp/status]', error);
    return NextResponse.json(
      { ok: false, error: publicDisparosWhatsappError(error, 'Erro ao consultar o WhatsApp de Disparos.') },
      { status: 500 },
    );
  }
}
