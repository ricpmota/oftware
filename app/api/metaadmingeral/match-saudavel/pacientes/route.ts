import { NextRequest, NextResponse } from 'next/server';
import { requireMetaAdminGeral } from '@/lib/metaadmin/requireMetaAdminGeral';
import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import { listBroadcastPatients } from '@/lib/server/matchBroadcastPatients';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const auth = await requireMetaAdminGeral(request);
  if (auth instanceof NextResponse) return auth;
  try {
    const patients = await listBroadcastPatients(getFirestoreAdmin());
    return NextResponse.json({ ok: true, total: patients.length, patients });
  } catch (error) {
    console.error('[metaadmingeral/match-saudavel/pacientes GET]', error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Não foi possível listar os pacientes.' },
      { status: 500 },
    );
  }
}
