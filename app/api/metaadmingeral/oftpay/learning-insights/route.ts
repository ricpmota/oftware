import { NextRequest, NextResponse } from 'next/server';
import { getApps, initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import type { LearningImpactRecord } from '@/lib/oftpay/laudoCaseArchive';
import {
  buildOftpayLearningInsightsAdminPayload,
  parseOftpayLearningInsightsUrlFilters,
} from '@/lib/oftpay/oftpayLearningInsightsAdmin';
import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import { OFTPAY_OWNER_EMAIL } from '@/types/oftpayAccess';

export const runtime = 'nodejs';

const LEARNING_IMPACT_COLLECTION = 'oftpay_learning_impact_records';
/** Limite de documentos globais anonimizados (mesma coleção usada no loop de análise; cap administrativo). */
const MAX_IMPACT_RECORDS_ADMIN = 800;

const METAADMINGERAL_EMAIL = OFTPAY_OWNER_EMAIL;

function getAuthAdmin() {
  if (getApps().length > 0) return getAuth(getApps()[0]);
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'oftware-9201e';
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL || process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY || process.env.FIREBASE_ADMIN_PRIVATE_KEY;
  if (!privateKey || !clientEmail) throw new Error('Firebase Admin não configurado');
  const app = initializeApp({ credential: cert({ projectId, clientEmail, privateKey: privateKey.replace(/\\n/g, '\n') }) });
  return getAuth(app);
}

async function requireAdmin(request: NextRequest): Promise<{ email: string } | NextResponse> {
  const authHeader = request.headers.get('Authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) {
    return NextResponse.json({ error: 'Token de autenticação obrigatório.' }, { status: 401 });
  }
  try {
    const auth = getAuthAdmin();
    const decoded = await auth.verifyIdToken(token);
    const email = (decoded.email || '').trim().toLowerCase();
    if (email !== METAADMINGERAL_EMAIL.trim().toLowerCase()) {
      return NextResponse.json({ error: 'Acesso negado. Apenas o proprietário do MetaAdminGeral.' }, { status: 403 });
    }
    return { email: decoded.email! };
  } catch {
    return NextResponse.json({ error: 'Token inválido ou expirado.' }, { status: 401 });
  }
}

/**
 * GET /api/metaadmingeral/oftpay/learning-insights
 * Agregações técnicas sobre a base global anonimizada de impacto de insights (sem dados de paciente ou caso).
 */
export async function GET(request: NextRequest) {
  const authResult = await requireAdmin(request);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const db = getFirestoreAdmin();
    const snap = await db
      .collection(LEARNING_IMPACT_COLLECTION)
      .orderBy('createdAt', 'desc')
      .limit(MAX_IMPACT_RECORDS_ADMIN)
      .get();

    const records = snap.docs.map((d) => d.data() as LearningImpactRecord);

    const { searchParams } = new URL(request.url);
    const { aggregation, post } = parseOftpayLearningInsightsUrlFilters(searchParams);

    const hasPost = Object.keys(post).length > 0;
    const payload = buildOftpayLearningInsightsAdminPayload(records, {
      aggregationFilters: Object.keys(aggregation).length ? aggregation : undefined,
      postFilters: hasPost ? post : undefined,
    });

    return NextResponse.json(payload);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[metaadmingeral/oftpay/learning-insights]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
