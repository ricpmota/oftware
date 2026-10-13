import { NextRequest, NextResponse } from 'next/server';
import { FieldPath } from 'firebase-admin/firestore';
import { assertCronProductionEnvironment } from '@/lib/email/cronProductionGate';
import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import { HYDRATION_TREATMENT_STATUS } from '@/lib/nutri/hidratacao/hydrationCheckInAutomation';
import { reevaluateHydrationAdherenceForPatient } from '@/lib/nutri/hidratacao/hydrationAdherence.server';

export const runtime = 'nodejs';
export const maxDuration = 60;

const BATCH_SIZE = 80;
const TIME_BUDGET_MS = 45_000;

async function handle(request: NextRequest) {
  const envGate = assertCronProductionEnvironment(request);
  if (!envGate.ok) {
    return NextResponse.json(envGate.body, { status: envGate.status });
  }

  try {
    const db = getFirestoreAdmin();
    const started = Date.now();
    let cursor: string | null = request.nextUrl.searchParams.get('cursor');
    let processed = 0;
    let alertCount = 0;
    let resolvedCount = 0;
    let truncated = false;
    let lastId: string | null = cursor;

    while (Date.now() - started < TIME_BUDGET_MS) {
      let query = db
        .collection('pacientes_completos')
        .where('statusTratamento', '==', HYDRATION_TREATMENT_STATUS)
        .orderBy(FieldPath.documentId())
        .limit(BATCH_SIZE);
      if (cursor) query = query.startAfter(cursor);

      const snap = await query.get();
      if (snap.empty) break;

      for (const docSnap of snap.docs) {
        if (Date.now() - started >= TIME_BUDGET_MS) {
          truncated = true;
          break;
        }
        lastId = docSnap.id;
        processed += 1;
        try {
          const result = await reevaluateHydrationAdherenceForPatient(db, docSnap.id);
          alertCount += result.sync.activated.length + result.sync.kept.length;
          resolvedCount += result.sync.resolved.length;
        } catch (error) {
          console.error('[cron/hidratacao-adesao] patient_error', {
            patientId: docSnap.id,
            error: error instanceof Error ? error.message : 'erro',
          });
        }
      }

      cursor = lastId;
      if (truncated) break;
      if (snap.size < BATCH_SIZE) {
        lastId = null;
        break;
      }
    }

    console.info('[cron/hidratacao-adesao]', { processed, alertCount, resolvedCount, truncated });
    return NextResponse.json({
      ok: true,
      processed,
      alertCount,
      resolvedCount,
      truncated,
      cursor: truncated ? lastId : null,
    });
  } catch (error) {
    console.error('[cron/hidratacao-adesao]', error instanceof Error ? error.message : 'erro');
    return NextResponse.json({ ok: false, error: 'Erro no cron de adesão de hidratação.' }, { status: 500 });
  }
}

/** Vercel Cron usa GET, no mesmo padrão dos demais jobs. */
export async function GET(request: NextRequest) {
  return handle(request);
}

export async function POST(request: NextRequest) {
  return handle(request);
}
