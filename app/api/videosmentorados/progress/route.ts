import { NextRequest, NextResponse } from 'next/server';
import { getMentorContentDoc } from '@/lib/mentorados/mentorContent.server';
import { upsertLessonProgress } from '@/lib/mentorados/progress.server';
import { isNextResponse, requireMentorAccess } from '@/lib/mentorados/requireMentorAccess.server';

export async function POST(request: NextRequest) {
  const access = await requireMentorAccess(request);
  if (isNextResponse(access)) return access;
  try {
    const body = (await request.json()) as {
      contentId?: string;
      trailId?: string;
      moduleId?: string;
      lastPositionSeconds?: number;
      watchedSeconds?: number;
      durationSeconds?: number;
      complete?: boolean;
      uncomplete?: boolean;
    };
    const contentId = String(body.contentId || '').trim();
    if (!contentId) {
      return NextResponse.json({ error: 'contentId obrigatório.' }, { status: 400 });
    }
    const content = await getMentorContentDoc(contentId);
    if (!content) {
      return NextResponse.json({ error: 'Aula não encontrada.' }, { status: 404 });
    }
    const progress = await upsertLessonProgress({
      userId: access.uid,
      contentId,
      trailId: body.trailId,
      moduleId: body.moduleId,
      lastPositionSeconds: Number(body.lastPositionSeconds) || 0,
      watchedSeconds: Number(body.watchedSeconds) || 0,
      durationSeconds:
        typeof body.durationSeconds === 'number'
          ? body.durationSeconds
          : typeof content.data.durationSeconds === 'number'
            ? content.data.durationSeconds
            : undefined,
      complete: body.complete === true,
      uncomplete: body.uncomplete === true,
    });
    return NextResponse.json({ ok: true, progress });
  } catch (error) {
    console.error('[videosmentorados/progress POST]', error);
    return NextResponse.json({ error: 'Falha ao salvar o progresso.' }, { status: 500 });
  }
}
