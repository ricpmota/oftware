import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { listOftPayUsers, updateOftPayUser, addOftPayUserByEmail, deleteOftPayUser } from '@/services/oftpayAccessService';
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

const ownerEmailLower = OFTPAY_OWNER_EMAIL.trim().toLowerCase();

/**
 * GET /api/metaadmingeral/oftpay/users
 * Lista todos os usuários OftPay (exceto o usuário mestre). Requer token do proprietário.
 */
export async function GET(request: NextRequest) {
  const authResult = await requireAdmin(request);
  if (authResult instanceof NextResponse) return authResult;
  try {
    const all = await listOftPayUsers();
    const users = all.filter((u) => (u.email || '').trim().toLowerCase() !== ownerEmailLower);
    return NextResponse.json({ users });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Erro ao listar usuários OftPay:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * PATCH /api/metaadmingeral/oftpay/users
 * Body: { email: string, courseIds?: string[], accessStartAt?: number | null, accessEndAt?: number | null }
 * Atualiza cursos e/ou vigência do usuário. Requer token do proprietário.
 */
export async function PATCH(request: NextRequest) {
  const authResult = await requireAdmin(request);
  if (authResult instanceof NextResponse) return authResult;
  try {
    const body = await request.json().catch(() => ({}));
    const email = typeof body.email === 'string' ? body.email.trim() : '';
    if (!email) {
      return NextResponse.json({ error: 'email é obrigatório.' }, { status: 400 });
    }
    const courseIds = Array.isArray(body.courseIds) ? body.courseIds.filter((c: unknown) => typeof c === 'string') : undefined;
    const accessStartAt = body.accessStartAt === undefined ? undefined : (typeof body.accessStartAt === 'number' ? body.accessStartAt : null);
    const accessEndAt = body.accessEndAt === undefined ? undefined : (typeof body.accessEndAt === 'number' ? body.accessEndAt : null);
    await updateOftPayUser({ email, courseIds, accessStartAt, accessEndAt });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Erro ao atualizar usuário OftPay:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * DELETE /api/metaadmingeral/oftpay/users
 * Body: { email: string }
 * Remove um usuário OftPay. Requer token do proprietário.
 */
export async function DELETE(request: NextRequest) {
  const authResult = await requireAdmin(request);
  if (authResult instanceof NextResponse) return authResult;
  try {
    const body = await request.json().catch(() => ({}));
    const email = typeof body.email === 'string' ? body.email.trim() : '';
    if (!email) {
      return NextResponse.json({ error: 'email é obrigatório.' }, { status: 400 });
    }
    const emailLower = email.trim().toLowerCase();
    if (emailLower === ownerEmailLower) {
      return NextResponse.json({ error: 'Não é permitido remover o usuário proprietário.' }, { status: 403 });
    }
    await deleteOftPayUser(email);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Erro ao remover usuário OftPay:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/metaadmingeral/oftpay/users
 * Body: { email: string }
 * Adiciona um usuário por email (sem login prévio) com nenhum curso. Requer token do proprietário.
 */
export async function POST(request: NextRequest) {
  const authResult = await requireAdmin(request);
  if (authResult instanceof NextResponse) return authResult;
  try {
    const body = await request.json().catch(() => ({}));
    const email = typeof body.email === 'string' ? body.email.trim() : '';
    if (!email) {
      return NextResponse.json({ error: 'email é obrigatório.' }, { status: 400 });
    }
    await addOftPayUserByEmail(email);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Erro ao adicionar usuário OftPay:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
