import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getOftPayUserDetails } from '@/services/oftpayAccessService';
import { OFTPAY_OWNER_EMAIL } from '@/types/oftpayAccess';

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
 * GET /api/metaadmingeral/oftpay/user-details?email=xxx
 * Retorna detalhes do usuário: % por curso, dispositivo, última vez que entrou.
 */
export async function GET(request: NextRequest) {
  const authResult = await requireAdmin(request);
  if (authResult instanceof NextResponse) return authResult;

  const email = request.nextUrl.searchParams.get('email')?.trim();
  if (!email) {
    return NextResponse.json({ error: 'email é obrigatório.' }, { status: 400 });
  }

  try {
    const details = await getOftPayUserDetails(email);
    return NextResponse.json(details);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Erro ao buscar detalhes OftPay:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
