import { NextRequest, NextResponse } from 'next/server';
import { isMentorCategory } from '@/lib/mentorados/categories';
import { deleteLessonsForContent } from '@/lib/mentorados/curriculum.server';
import {
  allocateMentorSlug,
  deleteMentorContentDoc,
  getMentorContentBySlug,
  getMentorContentDoc,
  isMentorContentStatus,
  toMentorContentDto,
  updateMentorContentDoc,
} from '@/lib/mentorados/mentorContent.server';
import {
  isNextResponse,
  mentorActorFromAccess,
  requireMentorAccess,
  requireMentorManager,
} from '@/lib/mentorados/requireMentorAccess.server';
import {
  deleteMentorContentFiles,
  deleteMentorStoragePath,
  isMentorOwnedStoragePath,
} from '@/lib/mentorados/storage.server';

type RouteCtx = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, ctx: RouteCtx) {
  const access = await requireMentorAccess(request);
  if (isNextResponse(access)) return access;
  const { id } = await ctx.params;
  const found = await getMentorContentDoc(id);
  if (!found) {
    return NextResponse.json({ error: 'Conteúdo não encontrado.' }, { status: 404 });
  }
  const status = found.data.status;
  if (status === 'archived' && !access.canManage) {
    return NextResponse.json({ error: 'Conteúdo não encontrado.' }, { status: 404 });
  }
  if (status === 'draft' && !access.canManage) {
    return NextResponse.json({ error: 'Conteúdo não encontrado.' }, { status: 404 });
  }
  const content = await toMentorContentDto(found.id, found.data, {
    includeVideoUrl: true,
    includeAudit: access.canManage,
  });
  return NextResponse.json({ content, canManage: access.canManage });
}

export async function PATCH(request: NextRequest, ctx: RouteCtx) {
  const access = await requireMentorManager(request);
  if (isNextResponse(access)) return access;
  const { id } = await ctx.params;

  try {
    const found = await getMentorContentDoc(id);
    if (!found) {
      return NextResponse.json({ error: 'Conteúdo não encontrado.' }, { status: 404 });
    }

    const body = (await request.json()) as {
      title?: string;
      description?: string;
      category?: string;
      tags?: unknown;
      videoStoragePath?: string;
      thumbnailStoragePath?: string;
      durationSeconds?: number | null;
      order?: number | null;
      featured?: boolean;
      status?: string;
    };

    const patch: Record<string, unknown> = {
      updatedBy: mentorActorFromAccess(access),
    };

    if (typeof body.title === 'string') {
      const title = body.title.trim();
      if (!title) {
        return NextResponse.json({ error: 'Título obrigatório.' }, { status: 400 });
      }
      patch.title = title;
      if (title !== found.data.title) {
        patch.slug = await allocateMentorSlug(title, id);
      }
    }
    if (typeof body.description === 'string') {
      patch.description = body.description.trim();
    }
    if (body.category !== undefined) {
      if (!isMentorCategory(body.category)) {
        return NextResponse.json({ error: 'Categoria inválida.' }, { status: 400 });
      }
      patch.category = body.category;
    }
    if (body.tags !== undefined) {
      patch.tags = Array.isArray(body.tags)
        ? body.tags.map((t) => String(t).trim()).filter(Boolean).slice(0, 20)
        : [];
    }
    if (typeof body.featured === 'boolean') {
      patch.featured = body.featured;
    }
    if (body.status !== undefined) {
      if (!isMentorContentStatus(body.status)) {
        return NextResponse.json({ error: 'Status inválido.' }, { status: 400 });
      }
      patch.status = body.status;
    }
    if (body.order !== undefined) {
      patch.order =
        typeof body.order === 'number' && Number.isFinite(body.order)
          ? Math.round(body.order)
          : null;
    }
    if (body.durationSeconds !== undefined) {
      patch.durationSeconds =
        typeof body.durationSeconds === 'number' && Number.isFinite(body.durationSeconds)
          ? Math.max(0, Math.round(body.durationSeconds))
          : null;
    }

    if (typeof body.videoStoragePath === 'string' && body.videoStoragePath.trim()) {
      const videoStoragePath = body.videoStoragePath.trim();
      if (!isMentorOwnedStoragePath('video', id, videoStoragePath)) {
        return NextResponse.json({ error: 'Caminho de vídeo inválido.' }, { status: 400 });
      }
      if (found.data.videoStoragePath && found.data.videoStoragePath !== videoStoragePath) {
        await deleteMentorStoragePath(found.data.videoStoragePath);
      }
      patch.videoStoragePath = videoStoragePath;
      patch.videoUrl = '';
    }

    if (typeof body.thumbnailStoragePath === 'string') {
      const thumbnailStoragePath = body.thumbnailStoragePath.trim();
      if (thumbnailStoragePath) {
        if (!isMentorOwnedStoragePath('thumbnail', id, thumbnailStoragePath)) {
          return NextResponse.json({ error: 'Caminho de thumbnail inválido.' }, { status: 400 });
        }
        if (
          found.data.thumbnailStoragePath &&
          found.data.thumbnailStoragePath !== thumbnailStoragePath
        ) {
          await deleteMentorStoragePath(found.data.thumbnailStoragePath);
        }
        patch.thumbnailStoragePath = thumbnailStoragePath;
        patch.thumbnailUrl = '';
      }
    }

    await updateMentorContentDoc(id, patch);
    const slug = String((patch.slug as string | undefined) || found.data.slug || '');
    const content = slug
      ? await getMentorContentBySlug(slug, true)
      : await toMentorContentDto(
          id,
          { ...found.data, ...(patch as object) },
          { includeVideoUrl: true, includeAudit: true }
        );
    return NextResponse.json({ ok: true, content });
  } catch (error) {
    console.error('[videosmentorados/contents PATCH]', error);
    return NextResponse.json({ error: 'Falha ao atualizar o conteúdo.' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, ctx: RouteCtx) {
  const access = await requireMentorManager(request);
  if (isNextResponse(access)) return access;
  const { id } = await ctx.params;

  try {
    const found = await getMentorContentDoc(id);
    if (!found) {
      return NextResponse.json({ error: 'Conteúdo não encontrado.' }, { status: 404 });
    }
    await deleteMentorContentFiles({
      videoStoragePath: found.data.videoStoragePath,
      thumbnailStoragePath: found.data.thumbnailStoragePath,
    });
    await deleteLessonsForContent(id);
    await deleteMentorContentDoc(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[videosmentorados/contents DELETE]', error);
    return NextResponse.json({ error: 'Falha ao excluir o conteúdo.' }, { status: 500 });
  }
}
