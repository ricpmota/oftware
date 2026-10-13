import { NextRequest, NextResponse } from 'next/server';
import { buildTrailDetail } from '@/lib/mentorados/assembleCurriculum.server';
import {
  allocateTrailSlug,
  deleteModulesAndLessonsForTrail,
  getMentorTrailDoc,
  updateMentorTrailDoc,
} from '@/lib/mentorados/curriculum.server';
import { isMentorContentStatus } from '@/lib/mentorados/mentorContent.server';
import {
  isNextResponse,
  mentorActorFromAccess,
  requireMentorAccess,
  requireMentorManager,
} from '@/lib/mentorados/requireMentorAccess.server';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, ctx: Ctx) {
  const access = await requireMentorAccess(request);
  if (isNextResponse(access)) return access;
  const { id } = await ctx.params;
  const found = await getMentorTrailDoc(id);
  if (!found) return NextResponse.json({ error: 'Trilha não encontrada.' }, { status: 404 });
  const detail = await buildTrailDetail({
    slug: String(found.data.slug || ''),
    uid: access.uid,
    canManage: access.canManage,
  });
  if (!detail) return NextResponse.json({ error: 'Trilha não encontrada.' }, { status: 404 });
  return NextResponse.json({ ...detail, canManage: access.canManage });
}

export async function PATCH(request: NextRequest, ctx: Ctx) {
  const access = await requireMentorManager(request);
  if (isNextResponse(access)) return access;
  const { id } = await ctx.params;
  const found = await getMentorTrailDoc(id);
  if (!found) return NextResponse.json({ error: 'Trilha não encontrada.' }, { status: 404 });
  try {
    const body = (await request.json()) as {
      title?: string;
      description?: string;
      shortDescription?: string;
      status?: string;
      order?: number | null;
      featured?: boolean;
    };
    const patch: Record<string, unknown> = {
      updatedBy: mentorActorFromAccess(access),
    };
    if (typeof body.title === 'string') {
      const title = body.title.trim();
      if (!title) return NextResponse.json({ error: 'Título obrigatório.' }, { status: 400 });
      patch.title = title;
      if (title !== found.data.title) patch.slug = await allocateTrailSlug(title, id);
    }
    if (typeof body.description === 'string') patch.description = body.description.trim();
    if (typeof body.shortDescription === 'string') patch.shortDescription = body.shortDescription.trim();
    if (body.status !== undefined) {
      if (!isMentorContentStatus(body.status)) {
        return NextResponse.json({ error: 'Status inválido.' }, { status: 400 });
      }
      patch.status = body.status;
    }
    if (typeof body.featured === 'boolean') patch.featured = body.featured;
    if (body.order !== undefined) {
      patch.order =
        typeof body.order === 'number' && Number.isFinite(body.order) ? Math.round(body.order) : null;
    }
    await updateMentorTrailDoc(id, patch);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[videosmentorados/trails PATCH]', error);
    return NextResponse.json({ error: 'Falha ao atualizar a trilha.' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, ctx: Ctx) {
  const access = await requireMentorManager(request);
  if (isNextResponse(access)) return access;
  const { id } = await ctx.params;
  const found = await getMentorTrailDoc(id);
  if (!found) return NextResponse.json({ error: 'Trilha não encontrada.' }, { status: 404 });
  await deleteModulesAndLessonsForTrail(id);
  return NextResponse.json({ ok: true });
}
