import { NextRequest, NextResponse } from 'next/server';
import {
  addTrailLessonDoc,
  getMentorModuleDoc,
  listMentorTrailLessonDocs,
} from '@/lib/mentorados/curriculum.server';
import { getMentorContentDoc } from '@/lib/mentorados/mentorContent.server';
import { isNextResponse, requireMentorManager } from '@/lib/mentorados/requireMentorAccess.server';

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, ctx: Ctx) {
  const access = await requireMentorManager(request);
  if (isNextResponse(access)) return access;
  const { id } = await ctx.params;
  const mod = await getMentorModuleDoc(id);
  if (!mod) return NextResponse.json({ error: 'Módulo não encontrado.' }, { status: 404 });
  try {
    const body = (await request.json()) as { contentId?: string };
    const contentId = String(body.contentId || '').trim();
    if (!contentId) return NextResponse.json({ error: 'contentId obrigatório.' }, { status: 400 });
    const content = await getMentorContentDoc(contentId);
    if (!content) return NextResponse.json({ error: 'Aula não encontrada.' }, { status: 404 });
    const existing = (await listMentorTrailLessonDocs()).filter(
      (row) => row.data.moduleId === id
    );
    const order = existing.reduce((max, row) => Math.max(max, row.data.order || 0), 0) + 1;
    const lessonId = await addTrailLessonDoc({
      trailId: String(mod.data.trailId || ''),
      moduleId: id,
      contentId,
      order,
    });
    return NextResponse.json({ ok: true, id: lessonId }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha ao adicionar a aula.';
    const status = message.includes('já pertence') ? 409 : 500;
    console.error('[videosmentorados/modules lessons POST]', error);
    return NextResponse.json({ error: message }, { status });
  }
}
