import { NextRequest, NextResponse } from 'next/server';
import { requirePersonalMetaPersonal } from '@/lib/metapersonal/requirePersonalMetaPersonal';
import { notifyPacienteTreinoPersonal } from '@/lib/personal/treinoPacienteNotifyService';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * POST — Canal Chat → paciente: o personal atualizou o treino.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ pacienteId: string }> }
) {
  const auth = await requirePersonalMetaPersonal(request);
  if (auth instanceof NextResponse) return auth;

  const pacienteId = String((await params).pacienteId || '').trim();
  if (!pacienteId) {
    return NextResponse.json({ ok: false, error: 'Paciente inválido.' }, { status: 400 });
  }

  try {
    const result = await notifyPacienteTreinoPersonal({
      personalTrainerId: auth.uid,
      pacienteId,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error('[metapersonal/treino-notify]', error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Erro ao avisar o paciente.',
      },
      { status: 500 }
    );
  }
}
