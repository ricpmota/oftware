import { FieldValue, type Timestamp } from 'firebase-admin/firestore';
import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import { nextUniqueMentorSlug, slugifyMentorTitle } from '@/lib/mentorados/slug';
import { trailLessonDocId } from '@/lib/mentorados/progressMath';
import { createMentorSignedReadUrl } from '@/lib/mentorados/storage.server';
import type { MentorActor, MentorContentStatus } from '@/types/mentorContent';
import type { MentorTrailStatus } from '@/types/mentorTrail';

export const MENTOR_TRAILS_COLLECTION = 'mentorTrails';
export const MENTOR_MODULES_COLLECTION = 'mentorModules';
export const MENTOR_TRAIL_LESSONS_COLLECTION = 'mentorTrailLessons';
export const MENTOR_USER_PROGRESS_COLLECTION = 'mentorUserProgress';

export type MentorTrailDoc = {
  title?: string;
  slug?: string;
  description?: string;
  shortDescription?: string;
  coverUrl?: string;
  coverStoragePath?: string;
  status?: MentorTrailStatus;
  order?: number;
  featured?: boolean;
  estimatedDurationMinutes?: number;
  requiresPreviousCompletion?: boolean;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  createdBy?: MentorActor;
  updatedBy?: MentorActor;
};

export type MentorModuleDoc = {
  trailId?: string;
  title?: string;
  description?: string;
  order?: number;
  status?: MentorTrailStatus;
  requiresPreviousCompletion?: boolean;
  required?: boolean;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
};

export type MentorTrailLessonDoc = {
  trailId?: string;
  moduleId?: string;
  contentId?: string;
  order?: number;
  createdAt?: Timestamp;
};

export function timestampToIso(value?: Timestamp | null): string | undefined {
  if (!value || typeof value.toDate !== 'function') return undefined;
  return value.toDate().toISOString();
}

export function timestampToMs(value?: Timestamp | null): number {
  if (!value || typeof value.toDate !== 'function') return 0;
  return value.toDate().getTime();
}

export function visibleCurriculum(
  status: MentorContentStatus | MentorTrailStatus | undefined,
  canManage: boolean,
  options?: { includeArchived?: boolean }
): boolean {
  if (status === 'published') return true;
  if (status === 'draft') return canManage;
  if (status === 'archived') return canManage && options?.includeArchived === true;
  return false;
}

export async function listMentorTrailDocs() {
  const db = getFirestoreAdmin();
  const snap = await db.collection(MENTOR_TRAILS_COLLECTION).get();
  return snap.docs.map((doc) => ({ id: doc.id, data: doc.data() as MentorTrailDoc }));
}

export async function listMentorModuleDocs() {
  const db = getFirestoreAdmin();
  const snap = await db.collection(MENTOR_MODULES_COLLECTION).get();
  return snap.docs.map((doc) => ({ id: doc.id, data: doc.data() as MentorModuleDoc }));
}

export async function listMentorTrailLessonDocs() {
  const db = getFirestoreAdmin();
  const snap = await db.collection(MENTOR_TRAIL_LESSONS_COLLECTION).get();
  return snap.docs.map((doc) => ({ id: doc.id, data: doc.data() as MentorTrailLessonDoc }));
}

export async function getMentorTrailBySlug(slug: string) {
  const db = getFirestoreAdmin();
  const snap = await db.collection(MENTOR_TRAILS_COLLECTION).where('slug', '==', slug).limit(1).get();
  if (snap.empty) return null;
  return { id: snap.docs[0].id, data: snap.docs[0].data() as MentorTrailDoc };
}

export async function getMentorTrailDoc(id: string) {
  const db = getFirestoreAdmin();
  const snap = await db.collection(MENTOR_TRAILS_COLLECTION).doc(id).get();
  if (!snap.exists) return null;
  return { id: snap.id, data: snap.data() as MentorTrailDoc };
}

export async function getMentorModuleDoc(id: string) {
  const db = getFirestoreAdmin();
  const snap = await db.collection(MENTOR_MODULES_COLLECTION).doc(id).get();
  if (!snap.exists) return null;
  return { id: snap.id, data: snap.data() as MentorModuleDoc };
}

export async function allocateTrailSlug(title: string, excludeId?: string): Promise<string> {
  const rows = await listMentorTrailDocs();
  const existing = new Set(
    rows.filter((row) => row.id !== excludeId).map((row) => String(row.data.slug || '').trim())
  );
  existing.add('trilhas');
  existing.add('gerenciar');
  return nextUniqueMentorSlug(slugifyMentorTitle(title), existing);
}

export async function trailCoverUrl(storagePath?: string): Promise<string | undefined> {
  return createMentorSignedReadUrl(storagePath);
}

export async function createMentorTrailDoc(params: {
  title: string;
  slug: string;
  description?: string;
  shortDescription?: string;
  status: MentorTrailStatus;
  order?: number;
  featured?: boolean;
  actor: MentorActor;
}) {
  const db = getFirestoreAdmin();
  const now = FieldValue.serverTimestamp();
  const ref = db.collection(MENTOR_TRAILS_COLLECTION).doc();
  await ref.set({
    title: params.title,
    slug: params.slug,
    description: params.description || '',
    shortDescription: params.shortDescription || '',
    coverUrl: '',
    coverStoragePath: '',
    status: params.status,
    order: typeof params.order === 'number' ? params.order : null,
    featured: params.featured === true,
    estimatedDurationMinutes: null,
    requiresPreviousCompletion: false,
    createdAt: now,
    updatedAt: now,
    createdBy: params.actor,
    updatedBy: params.actor,
  });
  return ref.id;
}

export async function updateMentorTrailDoc(id: string, patch: Record<string, unknown>) {
  const db = getFirestoreAdmin();
  await db.collection(MENTOR_TRAILS_COLLECTION).doc(id).update({
    ...patch,
    updatedAt: FieldValue.serverTimestamp(),
  });
}

export async function createMentorModuleDoc(params: {
  trailId: string;
  title: string;
  description?: string;
  order: number;
  status: MentorTrailStatus;
}) {
  const db = getFirestoreAdmin();
  const now = FieldValue.serverTimestamp();
  const ref = db.collection(MENTOR_MODULES_COLLECTION).doc();
  await ref.set({
    trailId: params.trailId,
    title: params.title,
    description: params.description || '',
    order: params.order,
    status: params.status,
    requiresPreviousCompletion: false,
    required: false,
    createdAt: now,
    updatedAt: now,
  });
  return ref.id;
}

export async function updateMentorModuleDoc(id: string, patch: Record<string, unknown>) {
  const db = getFirestoreAdmin();
  await db.collection(MENTOR_MODULES_COLLECTION).doc(id).update({
    ...patch,
    updatedAt: FieldValue.serverTimestamp(),
  });
}

export async function addTrailLessonDoc(params: {
  trailId: string;
  moduleId: string;
  contentId: string;
  order: number;
}) {
  const db = getFirestoreAdmin();
  const id = trailLessonDocId(params.trailId, params.contentId);
  const ref = db.collection(MENTOR_TRAIL_LESSONS_COLLECTION).doc(id);
  const existing = await ref.get();
  if (existing.exists) {
    throw new Error('Esta aula já pertence a esta trilha.');
  }
  await ref.set({
    trailId: params.trailId,
    moduleId: params.moduleId,
    contentId: params.contentId,
    order: params.order,
    createdAt: FieldValue.serverTimestamp(),
  });
  return id;
}

export async function deleteTrailLessonDoc(id: string) {
  const db = getFirestoreAdmin();
  await db.collection(MENTOR_TRAIL_LESSONS_COLLECTION).doc(id).delete();
}

export async function deleteModulesAndLessonsForTrail(trailId: string) {
  const db = getFirestoreAdmin();
  const [modules, lessons] = await Promise.all([
    db.collection(MENTOR_MODULES_COLLECTION).where('trailId', '==', trailId).get(),
    db.collection(MENTOR_TRAIL_LESSONS_COLLECTION).where('trailId', '==', trailId).get(),
  ]);
  const batch = db.batch();
  modules.docs.forEach((doc) => batch.delete(doc.ref));
  lessons.docs.forEach((doc) => batch.delete(doc.ref));
  batch.delete(db.collection(MENTOR_TRAILS_COLLECTION).doc(trailId));
  await batch.commit();
}

export async function deleteLessonsForContent(contentId: string) {
  const db = getFirestoreAdmin();
  const snap = await db
    .collection(MENTOR_TRAIL_LESSONS_COLLECTION)
    .where('contentId', '==', contentId)
    .get();
  if (snap.empty) return;
  const batch = db.batch();
  snap.docs.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();
}

export async function deleteLessonsForModule(moduleId: string) {
  const db = getFirestoreAdmin();
  const snap = await db
    .collection(MENTOR_TRAIL_LESSONS_COLLECTION)
    .where('moduleId', '==', moduleId)
    .get();
  const batch = db.batch();
  snap.docs.forEach((doc) => batch.delete(doc.ref));
  batch.delete(db.collection(MENTOR_MODULES_COLLECTION).doc(moduleId));
  await batch.commit();
}

export async function reorderTrailStructure(params: {
  trailId: string;
  modules?: { id: string; order: number }[];
  lessons?: { id: string; moduleId: string; order: number }[];
}) {
  const db = getFirestoreAdmin();
  const batch = db.batch();
  for (const mod of params.modules || []) {
    const snap = await db.collection(MENTOR_MODULES_COLLECTION).doc(mod.id).get();
    if (!snap.exists || String(snap.data()?.trailId || '') !== params.trailId) {
      throw new Error('Módulo não pertence a esta trilha.');
    }
    batch.update(snap.ref, {
      order: mod.order,
      updatedAt: FieldValue.serverTimestamp(),
    });
  }
  for (const lesson of params.lessons || []) {
    const snap = await db.collection(MENTOR_TRAIL_LESSONS_COLLECTION).doc(lesson.id).get();
    if (!snap.exists || String(snap.data()?.trailId || '') !== params.trailId) {
      throw new Error('Aula não pertence a esta trilha.');
    }
    const moduleSnap = await db.collection(MENTOR_MODULES_COLLECTION).doc(lesson.moduleId).get();
    if (!moduleSnap.exists || String(moduleSnap.data()?.trailId || '') !== params.trailId) {
      throw new Error('Módulo de destino inválido.');
    }
    batch.update(snap.ref, {
      moduleId: lesson.moduleId,
      order: lesson.order,
    });
  }
  await batch.commit();
}
