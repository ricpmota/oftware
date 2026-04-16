import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { upsertOftPayLogin } from '@/services/oftpayAccessService';

function getAuthAdmin() {
  if (getApps().length > 0) return getAuth(getApps()[0]);
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'oftware-9201e';
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL || process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY || process.env.FIREBASE_ADMIN_PRIVATE_KEY;
  if (!privateKey || !clientEmail) throw new Error('Firebase Admin não configurado');
  const app = initializeApp({ credential: cert({ projectId, clientEmail, privateKey: privateKey.replace(/\\n/g, '\n') }) });
  return getAuth(app);
}

/**
 * POST /api/oftpay/register-login
 * Body: { idToken: string }
 * Registra ou atualiza o usuário na coleção oftpay_users (mantém courseIds existentes).
 * Chamado pelo cliente OftPay após login com Google.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const idToken = typeof body.idToken === 'string' ? body.idToken : null;
    if (!idToken) {
      return NextResponse.json({ error: 'idToken é obrigatório.' }, { status: 400 });
    }
    const auth = getAuthAdmin();
    const decoded = await auth.verifyIdToken(idToken);
    const email = decoded.email?.trim();
    if (!email) {
      return NextResponse.json({ error: 'Token sem email.' }, { status: 400 });
    }
    const userAgent = request.headers.get('user-agent') ?? null;
    const authTime = typeof decoded.auth_time === 'number' ? decoded.auth_time : null;
    await upsertOftPayLogin({
      email,
      uid: decoded.uid,
      displayName: decoded.name ?? null,
      userAgent,
      authTime,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Erro ao registrar login OftPay:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
