import { NextRequest, NextResponse } from 'next/server';
import { requireMetaAdminGeral } from '@/lib/metaadmin/requireMetaAdminGeral';
import { listCanalChatVerifiedPatientsByDoctor } from '@/services/canalChatVerifiedPatientsService';

export const runtime = 'nodejs';

/**
 * GET /api/metaadmingeral/canal-chat/verificacoes
 * Pacientes com Canal Chat confirmado, agrupados por médico.
 */
export async function GET(request: NextRequest) {
  const auth = await requireMetaAdminGeral(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const result = await listCanalChatVerifiedPatientsByDoctor();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error('[metaadmingeral/canal-chat/verificacoes GET]', error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Erro ao carregar verificações do Canal Chat.',
      },
      { status: 500 },
    );
  }
}
