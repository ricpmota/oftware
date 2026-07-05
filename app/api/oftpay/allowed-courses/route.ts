import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getOftPayUserAccessInfo, getOftPayLastAuthTime } from '@/services/oftpayAccessService';
import { OFTPAY_COURSES } from '@/app/oftpay/coursesConfig';
import { OFTPAY_OWNER_EMAIL } from '@/types/oftpayAccess';

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
 * GET /api/oftpay/allowed-courses
 * Header: Authorization: Bearer <Firebase ID token>
 * Retorna { allowedCourseIds, accessStartAt, accessEndAt }. Proprietário recebe todos os cursos e vigência null.
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) {
      return NextResponse.json({ error: 'Token obrigatório.' }, { status: 401 });
    }
    const auth = getAuthAdmin();
    const decoded = await auth.verifyIdToken(token);
    const email = decoded.email?.trim();
    if (!email) {
      return NextResponse.json({ error: 'Token sem email.' }, { status: 400 });
    }
    // Sessão única: só aceita token com auth_time >= lastAuthTime (último login registrado). Proprietário não é afetado.
    const isOwner = email.trim().toLowerCase() === OFTPAY_OWNER_EMAIL.trim().toLowerCase();
    const lastAuthTime = isOwner ? null : await getOftPayLastAuthTime(email);
    if (lastAuthTime != null) {
      const tokenAuthTime = typeof decoded.auth_time === 'number' ? decoded.auth_time : 0;
      if (tokenAuthTime < lastAuthTime) {
        return NextResponse.json(
          { error: 'Sessão encerrada. Você entrou em outro dispositivo. Faça login novamente.' },
          { status: 401 }
        );
      }
    }
    const allCourseIds = OFTPAY_COURSES.map((c) => c.id);
    const { allowedCourseIds, accessStartAt, accessEndAt, questoesEnabled } =
      await getOftPayUserAccessInfo(email, allCourseIds);
    return NextResponse.json({ allowedCourseIds, accessStartAt, accessEndAt, questoesEnabled });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Erro ao obter cursos permitidos OftPay:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
