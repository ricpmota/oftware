import { NextRequest, NextResponse } from 'next/server';
import {
  requireCinquentaKgDepoisAuth,
  resolveParticipantId,
} from '@/lib/50kgdepois/apiAuth.server';
import { loadParticipantSession } from '@/services/cinquentaKgDepoisService';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireCinquentaKgDepoisAuth(request);
    if (auth instanceof NextResponse) return auth;

    const participantId = resolveParticipantId(request);
    const session = await loadParticipantSession(participantId);

    return NextResponse.json({ session });
  } catch (error) {
    console.error('[API 50kgdepois/load] GET:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao carregar entrevista.' },
      { status: 500 }
    );
  }
}
