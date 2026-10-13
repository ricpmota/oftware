import { NextRequest, NextResponse } from 'next/server';
import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import { COL_NUTRICIONISTAS } from '@/features/metaNutri/metaNutri.constants';
import { buildNutriCheckInPublicDados } from '@/lib/nutri/checkInSemanalNutriPublicDados';
import { loadCheckInSemanalNutriAdmin } from '@/lib/nutri/checkInSemanalNutriPersist.server';
import {
  deserializeNutriCheckInPublicLink,
  isValidNutriCheckInPublicToken,
  NUTRI_CHECKIN_LINKS_COLLECTION,
  normalizeNutriCheckInPublicToken,
} from '@/lib/nutri/checkInSemanalNutriPublicLink';
import { loadCheckInMenuContextAdmin } from '@/lib/nutri/checkInSemanalNutriMenuContext.server';
import { getNutritionWeek } from '@/lib/nutri/checkInSemanalNutriWeek';

function publicError(status: number, message: string) {
  return NextResponse.json({ valid: false, error: message }, { status });
}

/**
 * GET /api/checkin-nutri/[token]/dados
 * Contexto mínimo para o wizard público. Sem login.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const token = normalizeNutriCheckInPublicToken((await params).token);
    if (!isValidNutriCheckInPublicToken(token)) {
      return publicError(400, 'Este link não é válido.');
    }

    const db = getFirestoreAdmin();
    const linkSnap = await db.collection(NUTRI_CHECKIN_LINKS_COLLECTION).doc(token).get();
    if (!linkSnap.exists) {
      return publicError(404, 'Este link não é válido.');
    }

    const link = deserializeNutriCheckInPublicLink(token, (linkSnap.data() || {}) as Record<string, unknown>);
    if (!link) {
      return publicError(404, 'Este link não é válido.');
    }
    if (link.status === 'revoked') {
      return publicError(410, 'Este link não está mais disponível. Entre em contato com seu nutricionista.');
    }

    const week = getNutritionWeek(link.weekKey);
    const [pacienteSnap, nutriSnap, existing, menu] = await Promise.all([
      db.collection('pacientes_completos').doc(link.patientId).get(),
      db.collection(COL_NUTRICIONISTAS).doc(link.nutritionistId).get(),
      loadCheckInSemanalNutriAdmin(db, link.patientId, week.weekKey),
      loadCheckInMenuContextAdmin(db, link.patientId),
    ]);

    if (!pacienteSnap.exists) {
      return publicError(404, 'Este link não é válido.');
    }

    const paciente = pacienteSnap.data() as {
      nome?: string;
      dadosIdentificacao?: { nomeCompleto?: string };
    };
    const patientName = paciente?.dadosIdentificacao?.nomeCompleto || paciente?.nome || '';
    const nutritionistName = String(nutriSnap.data()?.nome || '').trim();

    const alreadyCompleted = Boolean(existing) || link.status === 'completed';
    const payload = buildNutriCheckInPublicDados({
      week,
      patientName,
      nutritionistName,
      aguaDia_ml: menu.aguaDia_ml,
      menu,
      alreadyCompleted,
      score: existing?.score,
    });

    return NextResponse.json(payload);
  } catch (error) {
    console.error('[checkin-nutri/dados] erro', {
      message: error instanceof Error ? error.message : 'unknown',
    });
    return publicError(500, 'Este link não é válido.');
  }
}
