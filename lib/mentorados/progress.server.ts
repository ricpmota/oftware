import { FieldValue, type Timestamp } from 'firebase-admin/firestore';
import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import { MENTOR_USER_PROGRESS_COLLECTION } from '@/lib/mentorados/curriculum.server';
import {
  mergeWatchedSeconds,
  progressDocId,
  shouldAutoComplete,
  watchedPercentageFromSeconds,
} from '@/lib/mentorados/progressMath';
import type { LessonProgressStatus, MentorProgressDto } from '@/types/mentorTrail';

type ProgressDoc = {
  userId?: string;
  contentId?: string;
  trailId?: string;
  moduleId?: string;
  status?: LessonProgressStatus;
  watchedSeconds?: number;
  lastPositionSeconds?: number;
  watchedPercentage?: number;
  firstStartedAt?: Timestamp;
  lastWatchedAt?: Timestamp;
  completedAt?: Timestamp;
  updatedAt?: Timestamp;
};

function toIso(value?: Timestamp): string | null {
  if (!value || typeof value.toDate !== 'function') return null;
  return value.toDate().toISOString();
}

export function toProgressDto(contentId: string, data: ProgressDoc): MentorProgressDto {
  return {
    contentId,
    trailId: data.trailId,
    moduleId: data.moduleId,
    status: data.status || 'not_started',
    watchedSeconds: data.watchedSeconds || 0,
    lastPositionSeconds: data.lastPositionSeconds || 0,
    watchedPercentage: data.watchedPercentage || 0,
    firstStartedAt: toIso(data.firstStartedAt),
    lastWatchedAt: toIso(data.lastWatchedAt),
    completedAt: toIso(data.completedAt),
  };
}

export async function listProgressForUser(userId: string): Promise<MentorProgressDto[]> {
  const db = getFirestoreAdmin();
  const snap = await db
    .collection(MENTOR_USER_PROGRESS_COLLECTION)
    .where('userId', '==', userId)
    .get();
  return snap.docs.map((doc) => {
    const data = doc.data() as ProgressDoc;
    return toProgressDto(String(data.contentId || doc.id), data);
  });
}

export async function getProgressForUserContent(userId: string, contentId: string) {
  const db = getFirestoreAdmin();
  const id = progressDocId(userId, contentId);
  const snap = await db.collection(MENTOR_USER_PROGRESS_COLLECTION).doc(id).get();
  if (!snap.exists) return null;
  return toProgressDto(contentId, snap.data() as ProgressDoc);
}

export async function upsertLessonProgress(params: {
  userId: string;
  contentId: string;
  trailId?: string;
  moduleId?: string;
  lastPositionSeconds: number;
  watchedSeconds: number;
  durationSeconds?: number;
  complete?: boolean;
  uncomplete?: boolean;
}): Promise<MentorProgressDto> {
  const db = getFirestoreAdmin();
  const id = progressDocId(params.userId, params.contentId);
  const ref = db.collection(MENTOR_USER_PROGRESS_COLLECTION).doc(id);
  const snap = await ref.get();
  const existing = (snap.exists ? snap.data() : {}) as ProgressDoc;
  const now = FieldValue.serverTimestamp();

  const watchedSeconds = mergeWatchedSeconds(
    existing.watchedSeconds || 0,
    params.watchedSeconds || 0,
    params.durationSeconds
  );
  const lastPositionSeconds = Math.max(0, params.lastPositionSeconds || 0);
  const watchedPercentage = watchedPercentageFromSeconds(
    watchedSeconds,
    params.durationSeconds || 0
  );

  let status: LessonProgressStatus = existing.status || 'not_started';
  let completedAt: unknown = existing.completedAt || null;

  if (params.uncomplete) {
    status = watchedSeconds > 0 ? 'in_progress' : 'not_started';
    completedAt = null;
  } else if (params.complete || (shouldAutoComplete(watchedPercentage) && status !== 'completed')) {
    status = 'completed';
    completedAt = existing.status === 'completed' ? existing.completedAt || now : now;
  } else if (status !== 'completed') {
    status = 'in_progress';
  }

  const payload: Record<string, unknown> = {
    userId: params.userId,
    contentId: params.contentId,
    trailId: params.trailId || existing.trailId || null,
    moduleId: params.moduleId || existing.moduleId || null,
    status,
    watchedSeconds,
    lastPositionSeconds,
    watchedPercentage,
    lastWatchedAt: now,
    updatedAt: now,
    completedAt,
  };
  if (!existing.firstStartedAt) payload.firstStartedAt = now;

  await ref.set(payload, { merge: true });
  const next = await ref.get();
  return toProgressDto(params.contentId, next.data() as ProgressDoc);
}
