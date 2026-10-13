import { FieldValue, type Timestamp } from 'firebase-admin/firestore';
import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import { emptyMentorCategoryCounts, isMentorCategory } from '@/lib/mentorados/categories';
import { isMentorContentNew, isMentorContentUpdated, compareMentorContents } from '@/lib/mentorados/sort';
import { nextUniqueMentorSlug, slugifyMentorTitle } from '@/lib/mentorados/slug';
import { createMentorSignedReadUrl } from '@/lib/mentorados/storage.server';
import type {
  MentorActor,
  MentorCategory,
  MentorContentDto,
  MentorContentStatus,
  MentorContentType,
} from '@/types/mentorContent';
import { MENTOR_CONTENT_STATUSES } from '@/types/mentorContent';

export const MENTOR_CONTENTS_COLLECTION = 'mentorContents';

type MentorContentDoc = {
  type?: MentorContentType;
  title?: string;
  slug?: string;
  description?: string;
  category?: MentorCategory;
  tags?: string[];
  videoUrl?: string;
  videoStoragePath?: string;
  thumbnailUrl?: string;
  thumbnailStoragePath?: string;
  durationSeconds?: number;
  order?: number;
  status?: MentorContentStatus;
  featured?: boolean;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  createdBy?: MentorActor;
  updatedBy?: MentorActor;
  version?: number;
  lastReviewedAt?: Timestamp;
};

function timestampToIso(value?: Timestamp | null): string | undefined {
  if (!value) return undefined;
  if (typeof value.toDate === 'function') return value.toDate().toISOString();
  return undefined;
}

function timestampToDate(value?: Timestamp | null): Date | undefined {
  if (!value || typeof value.toDate !== 'function') return undefined;
  return value.toDate();
}

export function isMentorContentStatus(value: unknown): value is MentorContentStatus {
  return typeof value === 'string' && (MENTOR_CONTENT_STATUSES as readonly string[]).includes(value);
}

function visibleForViewer(status: MentorContentStatus | undefined, canManage: boolean): boolean {
  if (status === 'archived') return false;
  if (status === 'draft') return canManage;
  return status === 'published';
}

export async function listExistingMentorSlugs(excludeId?: string): Promise<Set<string>> {
  const db = getFirestoreAdmin();
  const snap = await db.collection(MENTOR_CONTENTS_COLLECTION).select('slug').get();
  const slugs = new Set<string>();
  for (const doc of snap.docs) {
    if (excludeId && doc.id === excludeId) continue;
    const slug = String(doc.data().slug || '').trim();
    if (slug) slugs.add(slug);
  }
  return slugs;
}

export const MENTOR_RESERVED_SLUGS = new Set(['trilhas', 'gerenciar', 'admin', 'aulas']);

export async function allocateMentorSlug(title: string, excludeId?: string): Promise<string> {
  const existing = await listExistingMentorSlugs(excludeId);
  for (const reserved of MENTOR_RESERVED_SLUGS) existing.add(reserved);
  return nextUniqueMentorSlug(slugifyMentorTitle(title), existing);
}

export async function toMentorContentDto(
  id: string,
  data: MentorContentDoc,
  options: { includeVideoUrl: boolean; includeAudit: boolean }
): Promise<MentorContentDto> {
  const createdAt = timestampToIso(data.createdAt) || new Date(0).toISOString();
  const thumbnailUrl = await createMentorSignedReadUrl(data.thumbnailStoragePath);
  const videoUrl = options.includeVideoUrl
    ? await createMentorSignedReadUrl(data.videoStoragePath)
    : undefined;

  const dto: MentorContentDto = {
    id,
    type: data.type === 'video' ? 'video' : (data.type || 'video'),
    title: String(data.title || ''),
    slug: String(data.slug || ''),
    description: data.description ? String(data.description) : undefined,
    category: isMentorCategory(data.category) ? data.category : 'sistema',
    tags: Array.isArray(data.tags) ? data.tags.map((t) => String(t)).filter(Boolean) : [],
    thumbnailUrl,
    durationSeconds: typeof data.durationSeconds === 'number' ? data.durationSeconds : undefined,
    order: typeof data.order === 'number' ? data.order : undefined,
    status: isMentorContentStatus(data.status) ? data.status : 'draft',
    featured: data.featured === true,
    createdAt,
    updatedAt: timestampToIso(data.updatedAt) || createdAt,
    version: typeof data.version === 'number' ? data.version : 1,
    lastReviewedAt: timestampToIso(data.lastReviewedAt) || null,
    isNew: isMentorContentNew(timestampToDate(data.createdAt)),
    isUpdated: isMentorContentUpdated(
      timestampToDate(data.createdAt),
      timestampToDate(data.updatedAt)
    ),
  };

  if (videoUrl) dto.videoUrl = videoUrl;
  if (options.includeAudit) {
    dto.createdBy = data.createdBy;
    dto.updatedBy = data.updatedBy;
  }
  return dto;
}

export async function listMentorContents(canManage: boolean): Promise<MentorContentDto[]> {
  const db = getFirestoreAdmin();
  const snap = await db.collection(MENTOR_CONTENTS_COLLECTION).get();
  const rows = snap.docs
    .map((doc) => ({ id: doc.id, data: doc.data() as MentorContentDoc }))
    .filter((row) => visibleForViewer(row.data.status, canManage));

  rows.sort((a, b) =>
    compareMentorContents(
      {
        featured: a.data.featured,
        order: a.data.order,
        createdAt: timestampToDate(a.data.createdAt),
      },
      {
        featured: b.data.featured,
        order: b.data.order,
        createdAt: timestampToDate(b.data.createdAt),
      }
    )
  );

  return Promise.all(
    rows.map((row) =>
      toMentorContentDto(row.id, row.data, { includeVideoUrl: false, includeAudit: canManage })
    )
  );
}

export function countPublishedByCategory(contents: MentorContentDto[]) {
  const counts = emptyMentorCategoryCounts();
  for (const item of contents) {
    if (item.status === 'published' && isMentorCategory(item.category)) {
      counts[item.category] += 1;
    }
  }
  return counts;
}

export async function getMentorContentBySlug(
  slug: string,
  canManage: boolean
): Promise<MentorContentDto | null> {
  const db = getFirestoreAdmin();
  const snap = await db
    .collection(MENTOR_CONTENTS_COLLECTION)
    .where('slug', '==', slug)
    .limit(1)
    .get();
  if (snap.empty) return null;
  const doc = snap.docs[0];
  const data = doc.data() as MentorContentDoc;
  if (!visibleForViewer(data.status, canManage) && data.status !== 'archived') return null;
  if (data.status === 'archived' && !canManage) return null;
  if (data.status === 'draft' && !canManage) return null;
  return toMentorContentDto(doc.id, data, {
    includeVideoUrl: true,
    includeAudit: canManage,
  });
}

export async function getMentorContentDoc(id: string) {
  const db = getFirestoreAdmin();
  const ref = db.collection(MENTOR_CONTENTS_COLLECTION).doc(id);
  const snap = await ref.get();
  if (!snap.exists) return null;
  return { ref, id: snap.id, data: snap.data() as MentorContentDoc };
}

export async function createMentorContentDoc(params: {
  id: string;
  title: string;
  slug: string;
  description?: string;
  category: MentorCategory;
  tags: string[];
  videoStoragePath: string;
  thumbnailStoragePath?: string;
  durationSeconds?: number;
  order?: number;
  featured?: boolean;
  status: MentorContentStatus;
  actor: MentorActor;
}) {
  const db = getFirestoreAdmin();
  const now = FieldValue.serverTimestamp();
  await db.collection(MENTOR_CONTENTS_COLLECTION).doc(params.id).set({
    type: 'video' as MentorContentType,
    title: params.title,
    slug: params.slug,
    description: params.description || '',
    category: params.category,
    tags: params.tags,
    videoUrl: '',
    videoStoragePath: params.videoStoragePath,
    thumbnailUrl: '',
    thumbnailStoragePath: params.thumbnailStoragePath || '',
    durationSeconds: params.durationSeconds ?? null,
    order: typeof params.order === 'number' ? params.order : null,
    status: params.status,
    featured: params.featured === true,
    createdAt: now,
    updatedAt: now,
    createdBy: params.actor,
    updatedBy: params.actor,
    version: 1,
    lastReviewedAt: now,
  });
}

export async function updateMentorContentDoc(
  id: string,
  patch: Record<string, unknown>
) {
  const db = getFirestoreAdmin();
  await db.collection(MENTOR_CONTENTS_COLLECTION).doc(id).update({
    ...patch,
    updatedAt: FieldValue.serverTimestamp(),
  });
}

export async function deleteMentorContentDoc(id: string) {
  const db = getFirestoreAdmin();
  await db.collection(MENTOR_CONTENTS_COLLECTION).doc(id).delete();
}
