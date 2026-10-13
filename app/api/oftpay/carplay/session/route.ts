import { NextRequest, NextResponse } from 'next/server';
import { OFTPAY_COURSES } from '@/app/oftpay/coursesConfig';
import { isValidCarplayCode, normalizeCarplayCode } from '@/lib/oftpay/carplayCode';
import {
  CARPLAY_COOKIE,
  carplaySessionSecret,
  signCarplaySession,
  verifyCarplaySession,
} from '@/lib/oftpay/carplaySession';
import { findOftPayUserByCarplayCode, getOftPayUserAccessInfo } from '@/services/oftpayAccessService';

export const runtime = 'nodejs';

const COURSE_IDS = OFTPAY_COURSES.map((c) => c.id);

function cookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 30 * 24 * 60 * 60,
  };
}

async function accessForEmail(email: string) {
  const access = await getOftPayUserAccessInfo(email, COURSE_IDS);
  return {
    email,
    allowedCourseIds: access.allowedCourseIds,
    questoesEnabled: access.questoesEnabled,
    accessEndAt: access.accessEndAt,
  };
}

export async function GET(request: NextRequest) {
  const secret = carplaySessionSecret();
  const session = verifyCarplaySession(request.cookies.get(CARPLAY_COOKIE)?.value, secret);
  if (!session) {
    return NextResponse.json({ error: 'Informe o código CarPlay.' }, { status: 401 });
  }
  try {
    const access = await accessForEmail(session.email);
    if (access.allowedCourseIds.length === 0 && !access.questoesEnabled) {
      const res = NextResponse.json({ error: 'Esta conta não tem acesso ativo.' }, { status: 403 });
      res.cookies.set(CARPLAY_COOKIE, '', { ...cookieOptions(), maxAge: 0 });
      return res;
    }
    return NextResponse.json({ ...access, displayName: session.displayName });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const secret = carplaySessionSecret();
  if (!secret) {
    return NextResponse.json({ error: 'CarPlay não configurado no servidor.' }, { status: 500 });
  }
  const body = await request.json().catch(() => ({}));
  const code = normalizeCarplayCode(typeof body.code === 'string' ? body.code : '');
  if (!isValidCarplayCode(code)) {
    return NextResponse.json({ error: 'Código inválido.' }, { status: 401 });
  }
  try {
    const user = await findOftPayUserByCarplayCode(code);
    if (!user?.email) {
      return NextResponse.json({ error: 'Código inválido.' }, { status: 401 });
    }
    const access = await accessForEmail(user.email);
    if (access.allowedCourseIds.length === 0 && !access.questoesEnabled) {
      return NextResponse.json({ error: 'Esta conta não tem acesso ativo.' }, { status: 403 });
    }
    const res = NextResponse.json({
      ...access,
      displayName: user.displayName ?? null,
    });
    res.cookies.set(CARPLAY_COOKIE, signCarplaySession(user.email, secret, Date.now(), user.displayName), cookieOptions());
    return res;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(CARPLAY_COOKIE, '', { ...cookieOptions(), maxAge: 0 });
  return res;
}
