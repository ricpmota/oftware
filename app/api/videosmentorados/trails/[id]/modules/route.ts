import { NextRequest, NextResponse } from 'next/server';
import {
  createMentorModuleDoc,
  getMentorTrailDoc,
  listMentorModuleDocs,
} from '@/lib/mentorados/curriculum.server';
import { isMentorContentStatus } from '@/lib/mentorados/mentorContent.server';
import { isNextResponse, requireMentorManager } from '@/lib/mentorados/requireMentorAccess.server';

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, ctx: Ctx) {
  const access = await requireMentorManager(request);
  if (isNextResponse(access)) return access;
  const { id } = await ctx.params;
  const trail = await getMentorTrailDoc(id);
  if (!trail) return NextResponse.json({ error: 'Trilha não encontrada.' }, { status: 404 });
  try {
    const body = (await request.json()) as { title?: string; description?: string; status?: string };
    const title = String(body.title || '').trim();
    if (!title) return NextResponse.json({ error: 'Título do módulo é obrigatório.' }, { status: 400 });
    const existing = (await listMentorModuleDocs()).filter((row) => row.data.trailId === id);
    const order = existing.reduce((max, row) => Math.max(max, row.data.order || 0), 0) + 1;
    const moduleId = await createMentorModuleDoc({
      trailId: id,
      title,
      description: String(body.description || '').trim() || undefined,
      order,
      status: isMentorContentStatus(body.status) ? body.status : 'published',
    });
    return NextResponse.json({ ok: true, id: moduleId }, { status: 201 });
  } catch (error) {
    console.error('[videosmentorados/trails modules POST]', error);
    return NextResponse.json({ error: 'Falha ao criar o módulo.' }, { status: 500 });
  }
}
