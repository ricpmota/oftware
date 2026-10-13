import { NextRequest, NextResponse } from 'next/server';
import {
  deleteLessonsForModule,
  getMentorModuleDoc,
  updateMentorModuleDoc,
} from '@/lib/mentorados/curriculum.server';
import { isMentorContentStatus } from '@/lib/mentorados/mentorContent.server';
import { isNextResponse, requireMentorManager } from '@/lib/mentorados/requireMentorAccess.server';

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, ctx: Ctx) {
  const access = await requireMentorManager(request);
  if (isNextResponse(access)) return access;
  const { id } = await ctx.params;
  const found = await getMentorModuleDoc(id);
  if (!found) return NextResponse.json({ error: 'Módulo não encontrado.' }, { status: 404 });
  try {
    const body = (await request.json()) as {
      title?: string;
      description?: string;
      status?: string;
      order?: number;
    };
    const patch: Record<string, unknown> = {};
    if (typeof body.title === 'string') {
      const title = body.title.trim();
      if (!title) return NextResponse.json({ error: 'Título obrigatório.' }, { status: 400 });
      patch.title = title;
    }
    if (typeof body.description === 'string') patch.description = body.description.trim();
    if (body.status !== undefined) {
      if (!isMentorContentStatus(body.status)) {
        return NextResponse.json({ error: 'Status inválido.' }, { status: 400 });
      }
      patch.status = body.status;
    }
    if (typeof body.order === 'number') patch.order = Math.round(body.order);
    await updateMentorModuleDoc(id, patch);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[videosmentorados/modules PATCH]', error);
    return NextResponse.json({ error: 'Falha ao atualizar o módulo.' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, ctx: Ctx) {
  const access = await requireMentorManager(request);
  if (isNextResponse(access)) return access;
  const { id } = await ctx.params;
  const found = await getMentorModuleDoc(id);
  if (!found) return NextResponse.json({ error: 'Módulo não encontrado.' }, { status: 404 });
  await deleteLessonsForModule(id);
  return NextResponse.json({ ok: true });
}
