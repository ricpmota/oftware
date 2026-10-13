import { NextRequest, NextResponse } from 'next/server';
import { requireMedicoPacienteMetaadmin } from '@/lib/server/metaadminExamesImagemGate';
import { notifyPacienteExamesLaboratoriais } from '@/lib/metaadmin/examesLaboratoriaisPacienteNotifyService';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * POST /api/metaadmin/pacientes/[pacienteId]/exames-laboratoriais-notify
 * Canal Chat → paciente: o médico inseriu exames laboratoriais.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ pacienteId: string }> }
) {
  const pacienteId = String((await params).pacienteId || '').trim();
  if (!pacienteId) {
    return NextResponse.json({ ok: false, error: 'Paciente inválido.' }, { status: 400 });
  }

  const auth = await requireMedicoPacienteMetaadmin(request, pacienteId);
  if (!auth.ok) return auth.res;

  try {
    const result = await notifyPacienteExamesLaboratoriais({
      medicoId: auth.medicoDocId,
      pacienteId,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error('[metaadmin/exames-laboratoriais-notify]', error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Erro ao avisar o paciente.',
      },
      { status: 500 }
    );
  }
}
