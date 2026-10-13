import { NextRequest, NextResponse } from 'next/server';
import { requireNutricionistaMetaNutri } from '@/lib/metanutri/requireNutricionistaMetaNutri';
import { notifyMedicoNovaConsultaProntuario } from '@/lib/nutri/prontuario/prontuarioConsultaMedicoNotifyService';

export const runtime = 'nodejs';
export const maxDuration = 60;

type Body = {
  data?: string;
  hora?: string;
  titulo?: string;
};

/**
 * POST — avisa o médico responsável que a nutricionista salvou uma consulta no prontuário.
 * Canal Chat e, se conectado, também o WhatsApp da nutricionista.
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

  let body: Body = {};
  try {
    body = (await request.json()) as Body;
  } catch {
    body = {};
  }

  const data = typeof body.data === 'string' ? body.data.trim() : '';
  const hora = typeof body.hora === 'string' ? body.hora.trim() : '';
  const titulo = typeof body.titulo === 'string' ? body.titulo.trim() : undefined;
  if (!data || !hora) {
    return NextResponse.json(
      { ok: false, error: 'Informe data e hora da consulta.' },
      { status: 400 }
    );
  }

  try {
    const result = await notifyMedicoNovaConsultaProntuario({
      profissionalId: auth.uid,
      papel: 'nutricionista',
      pacienteId,
      data,
      hora,
      titulo,
    });
    return NextResponse.json(result);
  } catch (error) {
    console.error('[metanutri/prontuario-consulta-notify]', error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Erro ao avisar o médico.' },
      { status: 500 }
    );
  }
}
