import { NextRequest, NextResponse } from 'next/server';
import { requireMetaAdminGeral } from '@/lib/metaadmin/requireMetaAdminGeral';
import { syncLegacyAutoAplicacaoFromDoctorSettings } from '@/lib/whatsapp/autoAplicacaoAuthorization.server';
import {
  getWhatsappConnectionByDoctor,
  serializeWhatsappConnection,
} from '@/services/whatsappConnectionService';

export const runtime = 'nodejs';

/**
 * POST /api/metaadmingeral/automacoes/whatsapp/sync-legacy-flag
 * Body: { doctorId }
 * Espelha o flap "Aplicação no dia" em autoAplicacaoEnabled na conexão WhatsApp.
 */
export async function POST(request: NextRequest) {
  const auth = await requireMetaAdminGeral(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = (await request.json().catch(() => null)) as { doctorId?: string } | null;
    const doctorId = body?.doctorId?.trim() ?? '';
    if (!doctorId) {
      return NextResponse.json({ ok: false, error: 'doctorId é obrigatório.' }, { status: 400 });
    }

    await syncLegacyAutoAplicacaoFromDoctorSettings(doctorId);
    const connection = await getWhatsappConnectionByDoctor(doctorId);

    return NextResponse.json({
      ok: true,
      connection: connection ? serializeWhatsappConnection(connection) : null,
    });
  } catch (error) {
    console.error('[metaadmingeral/automacoes/whatsapp/sync-legacy-flag]', error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Erro ao sincronizar flag legado.',
      },
      { status: 500 },
    );
  }
}
