import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import { parseCheckInSemanalNutriPublicAnswers } from '@/lib/nutri/checkInSemanalNutriAnswersSchema';
import { loadCheckInMenuContextAdmin } from '@/lib/nutri/checkInSemanalNutriMenuContext.server';
import { saveCheckInSemanalNutriFromPublicLink } from '@/lib/nutri/checkInSemanalNutriPersist.server';
import {
  deserializeNutriCheckInPublicLink,
  isValidNutriCheckInPublicToken,
  NUTRI_CHECKIN_LINKS_COLLECTION,
  normalizeNutriCheckInPublicToken,
} from '@/lib/nutri/checkInSemanalNutriPublicLink';
import { skipPendingNutriCheckInWhatsAppItems } from '@/services/whatsappNutriCheckInQueue';

function publicError(status: number, message: string, extra?: Record<string, unknown>) {
  return NextResponse.json({ error: message, ...extra }, { status });
}

/**
 * POST /api/checkin-nutri/[token]/atualizar
 * Identidade clínica vem do token. Score recalculado no backend.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const token = normalizeNutriCheckInPublicToken((await params).token);
    if (!isValidNutriCheckInPublicToken(token)) {
      return publicError(400, 'Este link não é válido.');
    }

    const body = await request.json().catch(() => null);

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

    const menu = await loadCheckInMenuContextAdmin(db, link.patientId);
    let answers;
    try {
      answers = parseCheckInSemanalNutriPublicAnswers(body, { menuContext: menu });
    } catch (error) {
      if (error instanceof ZodError) {
        return publicError(400, 'Respostas inválidas.', { details: error.flatten().fieldErrors });
      }
      return publicError(400, error instanceof Error ? error.message : 'Respostas inválidas.');
    }

    const { record, created } = await saveCheckInSemanalNutriFromPublicLink({ db, link, answers });
    if (!created) {
      return publicError(409, 'Check-in já enviado.', {
        alreadyCompleted: true,
        score: record.score ?? null,
      });
    }

    if (link.status !== 'completed') {
      await linkSnap.ref.update({
        status: 'completed',
        updatedAt: new Date(),
      });
    }

    await skipPendingNutriCheckInWhatsAppItems(
      link.patientId,
      record.weekKey,
      'Check-in Semanal já respondido.'
    ).catch((error) => {
      console.warn('[checkin-nutri/atualizar] skip fila WhatsApp', error);
    });

    return NextResponse.json({
      ok: true,
      alreadyCompleted: true,
      score: record.score ?? null,
      weekKey: record.weekKey,
    });
  } catch (error) {
    console.error('[checkin-nutri/atualizar] erro', {
      message: error instanceof Error ? error.message : 'unknown',
    });
    return publicError(500, 'Não foi possível enviar o check-in.');
  }
}
