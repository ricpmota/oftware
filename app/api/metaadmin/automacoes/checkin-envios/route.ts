import { NextRequest, NextResponse } from 'next/server';
import { requireMedicoMetaadmin } from '@/lib/server/metaadminExamesImagemGate';
import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import { pickNutriCheckInEnvioInfo } from '@/lib/nutri/checkInSemanalNutriWhatsApp';
import { listQueueItemsByPatient } from '@/services/whatsappAutomationQueueService';

export const runtime = 'nodejs';

const MAX_PATIENT_IDS = 40;

function parsePatientIds(raw: string | null): string[] {
  if (!raw) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of raw.split(',')) {
    const id = part.trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
    if (out.length >= MAX_PATIENT_IDS) break;
  }
  return out;
}

async function doctorCanSeePatient(
  medicoDocId: string,
  patientId: string
): Promise<boolean> {
  const db = getFirestoreAdmin();
  const pacSnap = await db.collection('pacientes_completos').doc(patientId).get();
  if (!pacSnap.exists) return false;
  const medicoId = String(pacSnap.data()?.medicoResponsavelId || '').trim();
  if (medicoId && medicoId === medicoDocId) return true;
  const shareSnap = await db
    .collection('paciente_medico_compartilhado')
    .doc(`${patientId}_${medicoDocId}`)
    .get();
  if (!shareSnap.exists) return false;
  const share = shareSnap.data() as { status?: string; permissions?: string };
  return share.status === 'ativo' && (share.permissions === 'edit' || !share.permissions);
}

/**
 * GET /api/metaadmin/automacoes/checkin-envios?patientIds=id1,id2
 * Status e horário do WhatsApp do Check-in Semanal Nutri (fila do nutricionista).
 */
export async function GET(request: NextRequest) {
  const auth = await requireMedicoMetaadmin(request);
  if (!auth.ok) return auth.res;

  const patientIds = parsePatientIds(request.nextUrl.searchParams.get('patientIds'));
  if (patientIds.length === 0) {
    return NextResponse.json({ ok: true, envios: {} });
  }

  try {
    const allowed: string[] = [];
    for (const patientId of patientIds) {
      if (await doctorCanSeePatient(auth.medicoDocId, patientId)) {
        allowed.push(patientId);
      }
    }

    const queueLists = await Promise.all(allowed.map((id) => listQueueItemsByPatient(id)));
    const envios = pickNutriCheckInEnvioInfo(queueLists.flat());

    return NextResponse.json({ ok: true, envios });
  } catch (error) {
    console.error('[metaadmin/automacoes/checkin-envios GET]', error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Erro ao carregar envios do check-in.',
      },
      { status: 500 }
    );
  }
}
