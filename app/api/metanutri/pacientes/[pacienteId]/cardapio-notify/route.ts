import { NextRequest, NextResponse } from 'next/server';
import { requireNutricionistaMetaNutri } from '@/lib/metanutri/requireNutricionistaMetaNutri';
import { notifyPacienteCardapioEditado } from '@/lib/nutri/cardapio/cardapioPacienteNotifyService';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * POST — Canal Chat → paciente: a nutricionista atualizou o cardápio.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ pacienteId: string }> }
) {
  const auth = await requireNutricionistaMetaNutri(request);
  if (auth instanceof NextResponse) return auth;

  const pacienteId = String((await params).pacienteId || '').trim();
  if (!pacienteId) {
    return NextResponse.json({ ok: false, error: 'Paciente inválido.' }, { status: 400 });
  }

  try {
    const result = await notifyPacienteCardapioEditado({
      nutricionistaId: auth.uid,
      pacienteId,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error('[metanutri/cardapio-notify]', error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Erro ao avisar o paciente.',
      },
      { status: 500 }
    );
  }
}
