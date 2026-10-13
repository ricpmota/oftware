import { NextRequest, NextResponse } from 'next/server';
import { buildTrailDetail } from '@/lib/mentorados/assembleCurriculum.server';
import {
  allocateTrailSlug,
  createMentorTrailDoc,
  listMentorTrailDocs,
  visibleCurriculum,
} from '@/lib/mentorados/curriculum.server';
import { isMentorContentStatus } from '@/lib/mentorados/mentorContent.server';
import {
  isNextResponse,
  mentorActorFromAccess,
  requireMentorAccess,
  requireMentorManager,
} from '@/lib/mentorados/requireMentorAccess.server';

export async function GET(request: NextRequest) {
  const access = await requireMentorAccess(request);
  if (isNextResponse(access)) return access;
  const slug = request.nextUrl.searchParams.get('slug')?.trim();
  try {
    if (slug) {
      const detail = await buildTrailDetail({
        slug,
        uid: access.uid,
        canManage: access.canManage,
      });
      if (!detail) {
        return NextResponse.json({ error: 'Trilha não encontrada.' }, { status: 404 });
      }
      return NextResponse.json({ ...detail, canManage: access.canManage });
    }

    const rows = await listMentorTrailDocs();
    const trails = rows
      .filter((row) =>
        access.canManage
          ? true
          : visibleCurriculum(row.data.status, false)
      )
      .map((row) => ({
        id: row.id,
        title: row.data.title,
        slug: row.data.slug,
        description: row.data.description,
        shortDescription: row.data.shortDescription,
        status: row.data.status,
        order: row.data.order,
        featured: row.data.featured === true,
      }));
    return NextResponse.json({ trails, canManage: access.canManage });
  } catch (error) {
    console.error('[videosmentorados/trails GET]', error);
    return NextResponse.json({ error: 'Falha ao carregar trilhas.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const access = await requireMentorManager(request);
  if (isNextResponse(access)) return access;
  try {
    const body = (await request.json()) as {
      title?: string;
      description?: string;
      shortDescription?: string;
      status?: string;
      order?: number;
      featured?: boolean;
      slug?: string;
    };
    const title = String(body.title || '').trim();
    if (!title) {
      return NextResponse.json({ error: 'Título da trilha é obrigatório.' }, { status: 400 });
    }
    const status = isMentorContentStatus(body.status) ? body.status : 'draft';
    const preferredSlug =
      String(body.slug || '').trim() ||
      (/trilha essencial/i.test(title) ? 'trilha-essencial' : title);
    const slug = await allocateTrailSlug(preferredSlug);
    const id = await createMentorTrailDoc({
      title,
      slug,
      description: String(body.description || '').trim() || undefined,
      shortDescription: String(body.shortDescription || '').trim() || undefined,
      status,
      order: typeof body.order === 'number' ? body.order : undefined,
      featured: body.featured === true,
      actor: mentorActorFromAccess(access),
    });
    return NextResponse.json({ ok: true, id, slug }, { status: 201 });
  } catch (error) {
    console.error('[videosmentorados/trails POST]', error);
    return NextResponse.json({ error: 'Falha ao criar a trilha.' }, { status: 500 });
  }
}
