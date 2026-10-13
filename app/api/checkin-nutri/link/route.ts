import { NextRequest, NextResponse } from 'next/server';
import { getAuthAdmin, getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import { getNutritionWeek } from '@/lib/nutri/checkInSemanalNutriWeek';
import {
  activeNutritionistIdForPatient,
  doctorOwnsPatient,
  ensureNutriCheckInPublicLink,
  nutritionistHasActivePatientLink,
} from '@/lib/nutri/ensureNutriCheckInPublicLink';
import { canCreateNutriCheckInPublicLink } from '@/lib/nutri/checkInSemanalNutriPublicLink';

function getBearerToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('Authorization');
  return authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
}

/**
 * POST /api/checkin-nutri/link
 * Body: { patientId, weekKey }
 * Gera ou reutiliza token idempotente. Não cria checkinsSemanais.
 */
export async function POST(request: NextRequest) {
  try {
    const bearer = getBearerToken(request);
    if (!bearer) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }

    let uid: string;
    try {
      const decoded = await getAuthAdmin().verifyIdToken(bearer);
      uid = decoded.uid;
    } catch {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }

    const body = (await request.json().catch(() => null)) as {
      patientId?: string;
      weekKey?: string;
      nutritionistId?: string;
    } | null;

    const patientId = String(body?.patientId || '').trim();
    const weekKeyRaw = String(body?.weekKey || '').trim();
    if (!patientId || !weekKeyRaw) {
      return NextResponse.json({ error: 'patientId e weekKey são obrigatórios.' }, { status: 400 });
    }

    let weekKey: string;
    try {
      weekKey = getNutritionWeek(weekKeyRaw).weekKey;
    } catch {
      return NextResponse.json({ error: 'weekKey inválida.' }, { status: 400 });
    }

    const db = getFirestoreAdmin();
    const hasLink = await nutritionistHasActivePatientLink(db, uid, patientId);
    const isResponsibleDoctor = hasLink ? false : await doctorOwnsPatient(db, uid, patientId);
    if (
      !canCreateNutriCheckInPublicLink({
        authenticatedNutritionistId: uid,
        requestedNutritionistId: isResponsibleDoctor ? undefined : body?.nutritionistId,
        hasActiveVinculo: hasLink,
        isResponsibleDoctor,
      })
    ) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 403 });
    }

    const nutritionistId = hasLink
      ? uid
      : (await activeNutritionistIdForPatient(db, patientId)) || uid;

    const { url, token } = await ensureNutriCheckInPublicLink(db, {
      nutritionistId,
      patientId,
      weekKey,
      createdBy: uid,
    });

    return NextResponse.json({ url, token, weekKey });
  } catch (error) {
    console.error('[checkin-nutri/link] erro ao garantir link', {
      message: error instanceof Error ? error.message : 'unknown',
    });
    return NextResponse.json({ error: 'Erro ao obter link.' }, { status: 500 });
  }
}
