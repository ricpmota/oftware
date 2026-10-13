import { NextRequest, NextResponse } from 'next/server';
import { requirePsiquiatraMetaPsi } from '@/lib/metapsi/requirePsiquiatraMetaPsi';
import { createProntuarioConsultaPsiquiatra } from '@/lib/metapsi/createProntuarioConsultaPsiquiatra.server';
import type { ProntuarioConsultaPsiPayload } from '@/lib/metapsi/prontuarioConsultaPsiquiatra';

export const runtime = 'nodejs';

/**
 * POST — registra consulta do Psiquiatra na timeline transversal.
 * Gate: requirePsiquiatraMetaPsi + hasActivePsiquiatraAccess (server).
 * Autoria (psiquiatraId/nome/CRM) derivada da sessão e do doc `psiquiatras/{uid}`.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ pacienteId: string }> }
) {
  const auth = await requirePsiquiatraMetaPsi(request);
  if (auth instanceof NextResponse) return auth;

  const pacienteId = String((await params).pacienteId || '').trim();
  if (!pacienteId) {
    return NextResponse.json({ ok: false, error: 'Paciente inválido.' }, { status: 400 });
  }

  let body: ProntuarioConsultaPsiPayload = {};
  try {
    body = (await request.json()) as ProntuarioConsultaPsiPayload;
  } catch {
    body = {};
  }

  try {
    const result = await createProntuarioConsultaPsiquiatra({
      pacienteId,
      psiquiatraId: auth.uid,
      payload: body,
    });

    return NextResponse.json({
      ok: true,
      evento: {
        eventoId: result.eventoId,
        tipo: result.tipo,
        origem: result.origem,
        titulo: result.titulo,
        descricao: result.descricao,
        data: result.data,
        hora: result.hora,
        destaque: result.destaque,
        dados: result.dados,
        psiquiatraId: result.psiquiatraId,
        psiquiatraNome: result.psiquiatraNome,
      },
    });
  } catch (error) {
    const status =
      typeof error === 'object' &&
      error &&
      'status' in error &&
      typeof (error as { status?: unknown }).status === 'number'
        ? (error as { status: number }).status
        : 500;
    console.error('[metapsi/pacientes/prontuario POST]', error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Erro ao registrar consulta.',
      },
      { status }
    );
  }
}
