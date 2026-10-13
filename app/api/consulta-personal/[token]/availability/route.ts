import { NextRequest, NextResponse } from 'next/server';
import { loadPersonalConsultaLinkByToken } from '@/lib/personal/agenda/consultaLinkService';
import { listPersonalAvailableSlots } from '@/lib/personal/agenda/availabilityService';
import { isValidPublicLinkToken, normalizePublicLinkToken } from '@/lib/publicLinks/publicLinkToken';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const token = normalizePublicLinkToken((await params).token);
    if (!isValidPublicLinkToken(token)) {
      return NextResponse.json({ error: 'Este link não é válido.' }, { status: 400 });
    }
    const link = await loadPersonalConsultaLinkByToken(token);
    if (!link || link.status === 'revoked') {
      return NextResponse.json({ error: 'Este link não é válido.' }, { status: 404 });
    }

    const slots = await listPersonalAvailableSlots(link.personalTrainerId);
    return NextResponse.json({ slots });
  } catch (error) {
    console.error('[consulta-personal/availability]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao listar horários.' },
      { status: 500 }
    );
  }
}
