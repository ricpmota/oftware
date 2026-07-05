import { NextRequest, NextResponse } from 'next/server';
import {
  buildArchivedLaudoCaseSnapshot,
  buildLearningImpactRecordFromCase,
  buildLearningRecordFromCase,
} from '@/lib/oftpay/laudoCaseArchive';
import { validateArchivePayload } from '@/lib/oftpay/laudo-exames/archiveValidation';
import { getAuthAdmin, getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';

export const runtime = 'nodejs';

const PRIVATE_ROOT_COLLECTION = 'oftpay_laudo_cases_private';
const PRIVATE_CASES_SUBCOLLECTION = 'cases';
const GLOBAL_LEARNING_COLLECTION = 'oftpay_laudo_learning_records';
const LEARNING_IMPACT_COLLECTION = 'oftpay_learning_impact_records';

function generateCaseId() {
  return `laudo_case_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

async function getUserFromToken(request: NextRequest): Promise<{ uid: string; email?: string }> {
  const authHeader = request.headers.get('authorization') ?? request.headers.get('Authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) throw new Error('Token obrigatório para arquivar caso.');
  const auth = getAuthAdmin();
  const decoded = await auth.verifyIdToken(token);
  if (!decoded.uid) throw new Error('Token inválido sem uid.');
  return { uid: decoded.uid, email: decoded.email };
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromToken(request);
    const body = (await request.json().catch(() => ({}))) as Parameters<
      typeof validateArchivePayload
    >[0];
    const validation = validateArchivePayload(body);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const caseId = generateCaseId();
    const snapshot = buildArchivedLaudoCaseSnapshot({
      caseId,
      userId: user.uid,
      patientId: body.patientId ?? null,
      analysisVersion: body.analysisVersion ?? null,
      files: body.files ?? [],
      binocularContext: body.binocularContext ?? null,
      temporalContext: body.temporalContext ?? null,
      aiOutput: body.aiOutput!,
      feedback: body.feedback ?? {},
    });
    const learningRecord = buildLearningRecordFromCase(snapshot);
    const learningImpactRecord = buildLearningImpactRecordFromCase(snapshot);
    const db = getFirestoreAdmin();

    await db
      .collection(PRIVATE_ROOT_COLLECTION)
      .doc(user.uid)
      .collection(PRIVATE_CASES_SUBCOLLECTION)
      .doc(caseId)
      .set(snapshot);

    await db.collection(GLOBAL_LEARNING_COLLECTION).doc(caseId).set(learningRecord);
    if (learningImpactRecord) {
      await db.collection(LEARNING_IMPACT_COLLECTION).doc(caseId).set(learningImpactRecord);
    }

    return NextResponse.json({ ok: true, caseId });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const status = /token/i.test(message) ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
