import { NextRequest, NextResponse } from 'next/server';
import { requireNutricionistaWhatsapp } from '@/lib/server/profissionalWhatsappGate';
import { nutritionistHasActivePatientLink } from '@/lib/nutri/ensureNutriCheckInPublicLink';
import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import { rebuildNutriCheckInWhatsAppQueueForPatient } from '@/services/whatsappNutriCheckInQueue';

export const runtime = 'nodejs';
export const maxDuration = 30;

/**
 * POST /api/metanutri/automacoes/whatsapp-queue/rebuild-patient
 * Body: { pacienteId: string }
 * Reconstrói a fila do Check-in Semanal Nutri para um paciente do nutricionista autenticado.
 */
export async function POST(request: NextRequest) {
  const auth = await requireNutricionistaWhatsapp(request);
  if (!auth.ok) return auth.res;

  try {
    const body = (await request.json().catch(() => null)) as { pacienteId?: string } | null;
    const pacienteId = body?.pacienteId?.trim();
    if (!pacienteId) {
      return NextResponse.json({ ok: false, error: 'pacienteId é obrigatório.' }, { status: 400 });
    }

    const hasLink = await nutritionistHasActivePatientLink(
      getFirestoreAdmin(),
      auth.owner.uid,
      pacienteId
    );
    if (!hasLink) {
      return NextResponse.json({ ok: false, error: 'Paciente não vinculado.' }, { status: 403 });
    }

    const result = await rebuildNutriCheckInWhatsAppQueueForPatient({
      nutritionistId: auth.owner.uid,
      patientId: pacienteId,
    });

    return NextResponse.json({ ok: true, result });
  } catch (error) {
    console.error('[metanutri/automacoes/whatsapp-queue/rebuild-patient POST]', error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Erro ao reconstruir a fila.',
      },
      { status: 500 }
    );
  }
}
