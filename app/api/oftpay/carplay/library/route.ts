import { NextRequest, NextResponse } from 'next/server';
import { OFTPAY_COURSES } from '@/app/oftpay/coursesConfig';
import { CARPLAY_COOKIE, carplaySessionSecret, verifyCarplaySession } from '@/lib/oftpay/carplaySession';
import { getOftPayUserAccessInfo } from '@/services/oftpayAccessService';
import { loadCarplayCourseLibrary, loadCarplayOverview, saveCarplayPlanner, saveCarplayProgress } from '@/services/oftpayCarplayLibrary';
import type { PlannerSettings, ProgressMap, Schedule } from '@/types/videoLibrary';

export const runtime = 'nodejs';

const COURSE_IDS = OFTPAY_COURSES.map((c) => c.id);

async function sessionEmail(request: NextRequest): Promise<string | null> {
  const session = verifyCarplaySession(request.cookies.get(CARPLAY_COOKIE)?.value, carplaySessionSecret());
  return session?.email ?? null;
}

export async function GET(request: NextRequest) {
  const email = await sessionEmail(request);
  if (!email) return NextResponse.json({ error: 'Informe o código CarPlay.' }, { status: 401 });

  const courseId = request.nextUrl.searchParams.get('courseId')?.trim() ?? '';
  try {
    const access = await getOftPayUserAccessInfo(email, COURSE_IDS);
    if (courseId) {
      if (!access.allowedCourseIds.includes(courseId)) {
        return NextResponse.json({ error: 'Curso não liberado para esta conta.' }, { status: 403 });
      }
      const library = await loadCarplayCourseLibrary(email, courseId);
      return NextResponse.json(library);
    }
    const courses = await loadCarplayOverview(email, access.allowedCourseIds);
    return NextResponse.json({ courses });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const email = await sessionEmail(request);
  if (!email) return NextResponse.json({ error: 'Informe o código CarPlay.' }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const courseId = typeof body.courseId === 'string' ? body.courseId.trim() : '';
  if (!courseId) return NextResponse.json({ error: 'courseId é obrigatório.' }, { status: 400 });
  try {
    const access = await getOftPayUserAccessInfo(email, COURSE_IDS);
    if (!access.allowedCourseIds.includes(courseId)) {
      return NextResponse.json({ error: 'Curso não liberado para esta conta.' }, { status: 403 });
    }
    if (body.kind === 'progress') {
      const progressMap = body.progressMap as ProgressMap;
      if (!progressMap || typeof progressMap !== 'object') {
        return NextResponse.json({ error: 'progressMap inválido.' }, { status: 400 });
      }
      await saveCarplayProgress(email, courseId, progressMap);
      return NextResponse.json({ ok: true });
    }
    if (body.kind === 'planner') {
      const settings = body.settings as PlannerSettings;
      if (!settings || typeof settings !== 'object') {
        return NextResponse.json({ error: 'Planejamento inválido.' }, { status: 400 });
      }
      const schedule = (body.schedule ?? null) as Schedule | null;
      const id = await saveCarplayPlanner(email, courseId, settings, schedule);
      return NextResponse.json({ ok: true, id });
    }
    return NextResponse.json({ error: 'Ação inválida.' }, { status: 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
