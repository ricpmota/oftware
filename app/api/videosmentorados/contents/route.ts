import { NextRequest, NextResponse } from 'next/server';
import { isMentorCategory } from '@/lib/mentorados/categories';
import { buildLessonTrailContext } from '@/lib/mentorados/assembleCurriculum.server';
import {
  allocateMentorSlug,
  countPublishedByCategory,
  createMentorContentDoc,
  getMentorContentBySlug,
  listMentorContents,
  isMentorContentStatus,
} from '@/lib/mentorados/mentorContent.server';
import {
  isNextResponse,
  mentorActorFromAccess,
  requireMentorAccess,
  requireMentorManager,
} from '@/lib/mentorados/requireMentorAccess.server';
import { getProgressForUserContent } from '@/lib/mentorados/progress.server';
import { resumePositionSeconds } from '@/lib/mentorados/progressMath';
import { deleteMentorContentFiles, isMentorOwnedStoragePath } from '@/lib/mentorados/storage.server';

export async function GET(request: NextRequest) {
  const access = await requireMentorAccess(request);
  if (isNextResponse(access)) return access;

  const slug = request.nextUrl.searchParams.get('slug')?.trim();
  if (slug) {
    const content = await getMentorContentBySlug(slug, access.canManage);
    if (!content) {
      return NextResponse.json({ error: 'Aula não encontrada.' }, { status: 404 });
    }
    const trailSlug = request.nextUrl.searchParams.get('trailSlug')?.trim() || undefined;
    const [trailContext, progress] = await Promise.all([
      buildLessonTrailContext({
        contentId: content.id,
        trailSlug,
        uid: access.uid,
        canManage: access.canManage,
      }),
      getProgressForUserContent(access.uid, content.id),
    ]);
    return NextResponse.json({
      content,
      canAccess: true,
      canManage: access.canManage,
      progress,
      resumeAtSeconds: resumePositionSeconds(progress?.lastPositionSeconds || 0),
      trailContext,
    });
  }

  const contents = await listMentorContents(access.canManage);
  return NextResponse.json({
    contents,
    countsByCategory: countPublishedByCategory(contents),
    canAccess: true,
    canManage: access.canManage,
  });
}

export async function POST(request: NextRequest) {
  const access = await requireMentorManager(request);
  if (isNextResponse(access)) return access;

  try {
    const body = (await request.json()) as {
      id?: string;
      title?: string;
      description?: string;
      category?: string;
      tags?: unknown;
      videoStoragePath?: string;
      thumbnailStoragePath?: string;
      durationSeconds?: number;
      order?: number;
      featured?: boolean;
      status?: string;
    };

    const title = String(body.title || '').trim();
    if (!title) {
      return NextResponse.json({ error: 'Título obrigatório.' }, { status: 400 });
    }
    if (!isMentorCategory(body.category)) {
      return NextResponse.json({ error: 'Categoria inválida.' }, { status: 400 });
    }
    const contentId = String(body.id || '').trim();
    const videoStoragePath = String(body.videoStoragePath || '').trim();
    if (!contentId || !videoStoragePath) {
      return NextResponse.json({ error: 'Upload do vídeo é obrigatório.' }, { status: 400 });
    }
    if (!isMentorOwnedStoragePath('video', contentId, videoStoragePath)) {
      return NextResponse.json({ error: 'Caminho de vídeo inválido.' }, { status: 400 });
    }

    const thumbnailStoragePath = String(body.thumbnailStoragePath || '').trim() || undefined;
    if (
      thumbnailStoragePath &&
      !isMentorOwnedStoragePath('thumbnail', contentId, thumbnailStoragePath)
    ) {
      return NextResponse.json({ error: 'Caminho de thumbnail inválido.' }, { status: 400 });
    }

    const status = isMentorContentStatus(body.status) && body.status !== 'archived'
      ? body.status
      : 'draft';
    const tags = Array.isArray(body.tags)
      ? body.tags.map((t) => String(t).trim()).filter(Boolean).slice(0, 20)
      : [];

    const slug = await allocateMentorSlug(title);
    try {
      await createMentorContentDoc({
        id: contentId,
        title,
        slug,
        description: String(body.description || '').trim() || undefined,
        category: body.category,
        tags,
        videoStoragePath,
        thumbnailStoragePath,
        durationSeconds:
          typeof body.durationSeconds === 'number' && Number.isFinite(body.durationSeconds)
            ? Math.max(0, Math.round(body.durationSeconds))
            : undefined,
        order:
          typeof body.order === 'number' && Number.isFinite(body.order)
            ? Math.round(body.order)
            : undefined,
        featured: body.featured === true,
        status,
        actor: mentorActorFromAccess(access),
      });
    } catch (error) {
      await deleteMentorContentFiles({ videoStoragePath, thumbnailStoragePath });
      throw error;
    }

    const content = await getMentorContentBySlug(slug, true);
    return NextResponse.json({ ok: true, content }, { status: 201 });
  } catch (error) {
    console.error('[videosmentorados/contents POST]', error);
    return NextResponse.json({ error: 'Falha ao criar o conteúdo.' }, { status: 500 });
  }
}
