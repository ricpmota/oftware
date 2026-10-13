import { NextRequest, NextResponse } from 'next/server';
import { requireMetaAdminGeral } from '@/lib/metaadmin/requireMetaAdminGeral';
import { getCinquentaKgDepoisParticipantDetail } from '@/services/cinquentaKgDepoisService';

type RouteContext = { params: Promise<{ participantId: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  const auth = await requireMetaAdminGeral(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const { participantId } = await context.params;
    const session = await getCinquentaKgDepoisParticipantDetail(participantId);
    if (!session) {
      return NextResponse.json({ error: 'Participante não encontrado.' }, { status: 404 });
    }
    return NextResponse.json({ session });
  } catch (error) {
    console.error('[API metaadmingeral/50kg-depois/participants/[id]] GET:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao carregar participante.' },
      { status: 500 }
    );
  }
}
