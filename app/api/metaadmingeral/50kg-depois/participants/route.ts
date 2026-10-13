import { NextRequest, NextResponse } from 'next/server';
import { requireMetaAdminGeral } from '@/lib/metaadmin/requireMetaAdminGeral';
import { listCinquentaKgDepoisParticipants } from '@/services/cinquentaKgDepoisService';

export async function GET(request: NextRequest) {
  const auth = await requireMetaAdminGeral(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const participants = await listCinquentaKgDepoisParticipants();
    return NextResponse.json({ participants });
  } catch (error) {
    console.error('[API metaadmingeral/50kg-depois/participants] GET:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao listar participantes.' },
      { status: 500 }
    );
  }
}
