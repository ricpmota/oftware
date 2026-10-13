import { NextRequest, NextResponse } from 'next/server';
import { requireMetaAdminGeral } from '@/lib/metaadmin/requireMetaAdminGeral';
import { CINQUENTA_KG_DEPOIS_DEFAULT_PARTICIPANT } from '@/lib/50kgdepois/constants';
import { resetCinquentaKgDepoisParticipant } from '@/services/cinquentaKgDepoisService';

export async function POST(request: NextRequest) {
  const auth = await requireMetaAdminGeral(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = (await request.json().catch(() => null)) as {
      participantId?: string;
      confirmPhrase?: string;
    } | null;

    if (body?.confirmPhrase?.trim() !== 'ZERAR') {
      return NextResponse.json(
        { error: 'Confirme digitando ZERAR para apagar todas as respostas.' },
        { status: 400 }
      );
    }

    const participantId = body.participantId?.trim() || CINQUENTA_KG_DEPOIS_DEFAULT_PARTICIPANT.id;
    await resetCinquentaKgDepoisParticipant(participantId);

    return NextResponse.json({ success: true, participantId });
  } catch (error) {
    console.error('[API metaadmingeral/50kg-depois/reset] POST:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao zerar entrevista.' },
      { status: 500 }
    );
  }
}
