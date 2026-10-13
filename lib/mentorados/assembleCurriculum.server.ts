import { compareMentorContents } from '@/lib/mentorados/sort';
import { countPublishedByCategory, listMentorContents } from '@/lib/mentorados/mentorContent.server';
import {
  getMentorTrailBySlug,
  listMentorModuleDocs,
  listMentorTrailDocs,
  listMentorTrailLessonDocs,
  timestampToIso,
  trailCoverUrl,
  visibleCurriculum,
} from '@/lib/mentorados/curriculum.server';
import { listProgressForUser } from '@/lib/mentorados/progress.server';
import {
  formatMentorHoursMinutes,
  mentorFirstName,
  resumePositionSeconds,
  trailProgressPercent,
} from '@/lib/mentorados/progressMath';
import type { MentorContentDto } from '@/types/mentorContent';
import type {
  MentorContinueWatchingDto,
  MentorHomeResponse,
  MentorLessonNavDto,
  MentorLessonPlacement,
  MentorModuleDto,
  MentorProgressDto,
  MentorTrailCardDto,
  MentorTrailContextDto,
  MentorTrailDetailDto,
} from '@/types/mentorTrail';

function contentMap(contents: MentorContentDto[]) {
  return new Map(contents.map((item) => [item.id, item]));
}

function progressMap(rows: MentorProgressDto[]) {
  return new Map(rows.map((row) => [row.contentId, row]));
}

function lastActivityMs(row: MentorProgressDto): number {
  return Date.parse(row.lastWatchedAt || '') || 0;
}

export function publishedLessonContents(
  contents: MentorContentDto[],
  canManage: boolean
): MentorContentDto[] {
  return contents.filter((item) => item.status === 'published' || (canManage && item.status === 'draft'));
}

function lessonNav(
  content: MentorContentDto,
  module: { id: string; title: string },
  progress?: MentorProgressDto,
  trailLessonId?: string
): MentorLessonNavDto {
  return {
    id: content.id,
    trailLessonId,
    slug: content.slug,
    title: content.title,
    durationSeconds: content.durationSeconds,
    thumbnailUrl: content.thumbnailUrl,
    type: content.type,
    category: content.category,
    status: progress?.status || 'not_started',
    watchedPercentage: progress?.watchedPercentage || 0,
    moduleId: module.id,
    moduleTitle: module.title,
  };
}

export async function buildTrailCards(params: {
  canManage: boolean;
  includeArchived?: boolean;
  contents: MentorContentDto[];
  progress: MentorProgressDto[];
}): Promise<{
  trails: MentorTrailCardDto[];
  modulesByTrail: Map<string, MentorModuleDto[]>;
  placements: Record<string, MentorLessonPlacement>;
  orderedLessonsByTrail: Map<string, MentorLessonNavDto[]>;
}> {
  const [trailRows, moduleRows, lessonRows] = await Promise.all([
    listMentorTrailDocs(),
    listMentorModuleDocs(),
    listMentorTrailLessonDocs(),
  ]);
  const contents = contentMap(params.contents);
  const progress = progressMap(params.progress);
  const placements: Record<string, MentorLessonPlacement> = {};
  const modulesByTrail = new Map<string, MentorModuleDto[]>();
  const orderedLessonsByTrail = new Map<string, MentorLessonNavDto[]>();
  const trails: MentorTrailCardDto[] = [];

  const visibleTrails = trailRows
    .filter((row) =>
      visibleCurriculum(row.data.status, params.canManage, {
        includeArchived: params.includeArchived,
      })
    )
    .sort((a, b) =>
      compareMentorContents(
        { featured: a.data.featured, order: a.data.order, createdAt: timestampToIso(a.data.createdAt) },
        { featured: b.data.featured, order: b.data.order, createdAt: timestampToIso(b.data.createdAt) }
      )
    );

  for (const trail of visibleTrails) {
    const modules = moduleRows
      .filter(
        (row) =>
          row.data.trailId === trail.id &&
          visibleCurriculum(row.data.status, params.canManage, {
            includeArchived: params.includeArchived,
          })
      )
      .sort((a, b) => (a.data.order || 0) - (b.data.order || 0));

    const moduleDtos: MentorModuleDto[] = [];
    const orderedLessons: MentorLessonNavDto[] = [];
    let durationSeconds = 0;
    let completedLessons = 0;

    for (const mod of modules) {
      const links = lessonRows
        .filter((row) => row.data.moduleId === mod.id && row.data.trailId === trail.id)
        .sort((a, b) => (a.data.order || 0) - (b.data.order || 0));

      const lessons: MentorLessonNavDto[] = [];
      for (const link of links) {
        const content = contents.get(String(link.data.contentId || ''));
        if (!content) continue;
        if (content.status !== 'published' && !(params.canManage && content.status === 'draft')) continue;
        const nav = lessonNav(
          content,
          { id: mod.id, title: String(mod.data.title || '') },
          progress.get(content.id),
          link.id
        );
        lessons.push(nav);
        orderedLessons.push(nav);
        durationSeconds += content.durationSeconds || 0;
        if (nav.status === 'completed') completedLessons += 1;
        if (!placements[content.id]) {
          placements[content.id] = {
            trailId: trail.id,
            trailSlug: String(trail.data.slug || ''),
            trailTitle: String(trail.data.title || ''),
            moduleId: mod.id,
            moduleTitle: String(mod.data.title || ''),
          };
        }
      }

      const moduleCompleted = lessons.filter((l) => l.status === 'completed').length;
      moduleDtos.push({
        id: mod.id,
        trailId: trail.id,
        title: String(mod.data.title || ''),
        description: mod.data.description || '',
        order: mod.data.order || 0,
        status: (mod.data.status as MentorModuleDto['status']) || 'draft',
        lessonCount: lessons.length,
        completedLessons: moduleCompleted,
        progressPercent: trailProgressPercent(moduleCompleted, lessons.length),
        isCompleted: lessons.length > 0 && moduleCompleted === lessons.length,
        lessons,
      });
    }

    const lessonCount = orderedLessons.length;
    const continueLesson =
      orderedLessons.find((l) => l.status === 'in_progress') ||
      orderedLessons.find((l) => l.status !== 'completed') ||
      orderedLessons[0];

    const remainingSeconds = orderedLessons
      .filter((l) => l.status !== 'completed')
      .reduce((sum, l) => sum + (l.durationSeconds || 0), 0);

    const card: MentorTrailCardDto = {
      id: trail.id,
      title: String(trail.data.title || ''),
      slug: String(trail.data.slug || ''),
      description: trail.data.description || '',
      shortDescription: trail.data.shortDescription || '',
      coverUrl: await trailCoverUrl(trail.data.coverStoragePath),
      status: (trail.data.status as MentorTrailCardDto['status']) || 'draft',
      order: trail.data.order,
      featured: trail.data.featured === true,
      moduleCount: moduleDtos.length,
      lessonCount,
      durationSeconds,
      completedLessons,
      progressPercent: trailProgressPercent(completedLessons, lessonCount),
      remainingSeconds,
      isCompleted: lessonCount > 0 && completedLessons === lessonCount,
      continueLessonSlug: continueLesson?.slug,
      continueLessonTitle: continueLesson?.title,
    };
    trails.push(card);
    modulesByTrail.set(trail.id, moduleDtos);
    orderedLessonsByTrail.set(trail.id, orderedLessons);
  }

  return { trails, modulesByTrail, placements, orderedLessonsByTrail };
}

function pickContinueWatching(params: {
  progress: MentorProgressDto[];
  contents: MentorContentDto[];
  placements: Record<string, MentorLessonPlacement>;
  trails: MentorTrailCardDto[];
  modulesByTrail: Map<string, MentorModuleDto[]>;
}): MentorContinueWatchingDto | null {
  const contentById = contentMap(params.contents);
  const trailById = new Map(params.trails.map((t) => [t.id, t]));
  const inProgress = params.progress
    .filter((row) => row.status === 'in_progress')
    .sort((a, b) => lastActivityMs(b) - lastActivityMs(a));

  const isPublishedContent = (row: MentorProgressDto) => {
    const content = contentById.get(row.contentId);
    return Boolean(content && content.status === 'published');
  };
  const isPublishedTrail = (row: MentorProgressDto) => {
    const placement = params.placements[row.contentId];
    const trail = placement ? trailById.get(placement.trailId) : undefined;
    return trail?.status === 'published';
  };
  const pick =
    inProgress.find((row) => isPublishedContent(row) && isPublishedTrail(row)) ||
    inProgress.find((row) => isPublishedContent(row));
  if (!pick) return null;
  const content = contentById.get(pick.contentId)!;
  const placement = params.placements[content.id];
  const trail = placement ? trailById.get(placement.trailId) : undefined;
  return {
    contentId: content.id,
    slug: content.slug,
    title: content.title,
    thumbnailUrl: content.thumbnailUrl,
    durationSeconds: content.durationSeconds,
    lastPositionSeconds: pick.lastPositionSeconds,
    resumeAtSeconds: resumePositionSeconds(pick.lastPositionSeconds),
    watchedPercentage: pick.watchedPercentage,
    trailId: placement?.trailId,
    trailSlug: trail?.slug,
    trailTitle: trail?.title,
    moduleId: placement?.moduleId,
    moduleTitle: placement?.moduleTitle,
  };
}

export async function buildMentorHome(params: {
  uid: string;
  firstName: string;
  canManage: boolean;
}): Promise<MentorHomeResponse> {
  const [contents, progress] = await Promise.all([
    listMentorContents(params.canManage),
    listProgressForUser(params.uid),
  ]);
  const assembled = await buildTrailCards({
    canManage: params.canManage,
    contents,
    progress,
  });
  const publishedTrails = assembled.trails.filter((t) => t.status === 'published' || params.canManage);
  const journey =
    publishedTrails.find((t) => t.featured) ||
    publishedTrails.find((t) => t.slug === 'trilha-essencial') ||
    publishedTrails[0] ||
    null;

  return {
    viewer: { firstName: params.firstName, canManage: params.canManage },
    continueWatching: pickContinueWatching({
      progress,
      contents,
      placements: assembled.placements,
      trails: assembled.trails,
      modulesByTrail: assembled.modulesByTrail,
    }),
    journey,
    trails: publishedTrails,
    contents,
    countsByCategory: countPublishedByCategory(contents),
    placementsByContentId: assembled.placements,
  };
}

export async function buildTrailDetail(params: {
  slug: string;
  uid: string;
  canManage: boolean;
}): Promise<MentorTrailDetailDto | null> {
  const trail = await getMentorTrailBySlug(params.slug);
  if (!trail) return null;
  if (!visibleCurriculum(trail.data.status, params.canManage, { includeArchived: params.canManage })) {
    return null;
  }
  const [contents, progress] = await Promise.all([
    listMentorContents(params.canManage),
    listProgressForUser(params.uid),
  ]);
  const assembled = await buildTrailCards({
    canManage: params.canManage,
    includeArchived: params.canManage,
    contents,
    progress,
  });
  const card = assembled.trails.find((t) => t.id === trail.id);
  if (!card) return null;
  const modules = assembled.modulesByTrail.get(trail.id) || [];
  const ordered = assembled.orderedLessonsByTrail.get(trail.id) || [];
  const continueLesson =
    ordered.find((l) => l.status === 'in_progress') ||
    ordered.find((l) => l.status !== 'completed') ||
    ordered[0] ||
    null;
  return { trail: card, modules, continueLesson };
}

export async function buildLessonTrailContext(params: {
  contentId: string;
  trailSlug?: string;
  uid: string;
  canManage: boolean;
}): Promise<MentorTrailContextDto | null> {
  const [contents, progress] = await Promise.all([
    listMentorContents(params.canManage),
    listProgressForUser(params.uid),
  ]);
  const assembled = await buildTrailCards({ canManage: params.canManage, contents, progress });
  let trail = params.trailSlug
    ? assembled.trails.find((t) => t.slug === params.trailSlug)
    : undefined;
  if (!trail) {
    const placement = assembled.placements[params.contentId];
    trail = placement ? assembled.trails.find((t) => t.id === placement.trailId) : undefined;
  }
  if (!trail) return null;
  const modules = assembled.modulesByTrail.get(trail.id) || [];
  const ordered = assembled.orderedLessonsByTrail.get(trail.id) || [];
  const index = ordered.findIndex((l) => l.id === params.contentId);
  if (index < 0) return null;
  const current = ordered[index];
  const previous = index > 0 ? ordered[index - 1] : null;
  const next = index < ordered.length - 1 ? ordered[index + 1] : null;
  const currentModule = modules.find((m) => m.id === current.moduleId);
  const nextModuleTitle =
    next && next.moduleId !== current.moduleId
      ? modules.find((m) => m.id === next.moduleId)?.title
      : undefined;
  const progressRow = progress.find((p) => p.contentId === params.contentId);
  return {
    trail,
    modules,
    previous,
    next,
    current,
    currentModuleCompleted: currentModule?.isCompleted === true,
    nextModuleTitle,
    trailJustCompleted: trail.isCompleted,
    resumeAtSeconds: resumePositionSeconds(progressRow?.lastPositionSeconds || 0),
  };
}

export function lessonHref(slug: string, trailSlug?: string) {
  if (trailSlug) return `/videosmentorados/trilhas/${encodeURIComponent(trailSlug)}/aulas/${encodeURIComponent(slug)}`;
  return `/videosmentorados/${encodeURIComponent(slug)}`;
}

export { formatMentorHoursMinutes, mentorFirstName };
