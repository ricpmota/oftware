import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import type { PlannerSettings, ProgressMap, Schedule, VideoProgress } from '@/types/videoLibrary';
import { getDurationsByLibrary } from '@/utils/videoDurationFirestore';

function db() {
  const existing = getApps()[0];
  if (existing) return getFirestore(existing);
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'oftware-9201e';
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL || process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY || process.env.FIREBASE_ADMIN_PRIVATE_KEY;
  if (!privateKey || !clientEmail) throw new Error('Firebase Admin: variáveis de ambiente não configuradas');
  const app = initializeApp({
    credential: cert({ projectId, clientEmail, privateKey: privateKey.replace(/\\n/g, '\n') }),
  });
  return getFirestore(app);
}

function toMillis(v: unknown): number | undefined {
  if (v == null) return undefined;
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof (v as { toMillis?: () => number }).toMillis === 'function') {
    return (v as { toMillis: () => number }).toMillis();
  }
  if (typeof (v as { toDate?: () => Date }).toDate === 'function') {
    return (v as { toDate: () => Date }).toDate().getTime();
  }
  return undefined;
}

function toIso(v: unknown): string {
  const ms = toMillis(v);
  return new Date(ms ?? Date.now()).toISOString();
}

async function uidForEmail(email: string): Promise<string | null> {
  const id = email.trim().toLowerCase();
  const ref = db().collection('oftpay_users').doc(id);
  const snap = await ref.get();
  const stored = snap.data()?.uid;
  if (typeof stored === 'string' && stored.trim()) return stored.trim();
  try {
    const record = await getAuth().getUserByEmail(id);
    if (snap.exists) await ref.set({ uid: record.uid }, { merge: true });
    return record.uid;
  } catch {
    return null;
  }
}

function withoutUndefined(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(withoutUndefined);
  if (value && typeof value === 'object' && !(value instanceof Timestamp)) {
    const out: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      if (item !== undefined) out[key] = withoutUndefined(item);
    }
    return out;
  }
  return value;
}

function progressFromDoc(data: Record<string, unknown> | undefined): ProgressMap {
  const raw = data?.progressMap as Record<string, Record<string, unknown>> | undefined;
  if (!raw || typeof raw !== 'object') return {};
  const progressMap: ProgressMap = {};
  for (const [videoId, entry] of Object.entries(raw)) {
    if (!entry || typeof entry !== 'object') continue;
    const ratingVal = entry.rating != null ? Number(entry.rating) : undefined;
    const item: VideoProgress = {
      watched: Boolean(entry.watched),
      lastPosition: Number(entry.lastPosition) || 0,
      watchedSeconds: Number(entry.watchedSeconds) || 0,
      duration: entry.duration != null ? Number(entry.duration) : null,
      comments: entry.comments != null ? String(entry.comments) : undefined,
      rating: ratingVal != null && ratingVal >= 1 && ratingVal <= 5 ? Math.round(ratingVal) : undefined,
      updatedAt: toMillis(entry.updatedAt) ?? Date.now(),
    };
    progressMap[videoId] = item;
  }
  return progressMap;
}

function plannerFromDoc(id: string, data: Record<string, unknown>): PlannerSettings {
  const { createdAt, updatedAt, ...rest } = data;
  return {
    ...(rest as Omit<PlannerSettings, 'id' | 'createdAt' | 'updatedAt'>),
    id,
    createdAt: toIso(createdAt),
    updatedAt: toIso(updatedAt),
  };
}

function scheduleFromDoc(data: Record<string, unknown>): Schedule {
  return {
    plannerId: String(data.plannerId ?? ''),
    planInput: data.planInput as Schedule['planInput'],
    settings: data.settings as Schedule['settings'],
    days: Array.isArray(data.days) ? (data.days as Schedule['days']) : [],
    generatedAt: toIso(data.generatedAt),
    version: typeof data.version === 'string' ? data.version : '1.0',
  };
}

export type CarplayCourseLibrary = {
  progressMap: ProgressMap;
  planners: PlannerSettings[];
  favoritePlannerId: string | null;
  schedules: Record<string, Schedule>;
};

export async function loadCarplayCourseLibrary(email: string, courseId: string): Promise<CarplayCourseLibrary> {
  const empty: CarplayCourseLibrary = {
    progressMap: {},
    planners: [],
    favoritePlannerId: null,
    schedules: {},
  };
  const uid = await uidForEmail(email);
  if (!uid) return empty;

  const libraryId = `oftpay_${courseId}`;
  const userRef = db().collection('users').doc(uid);
  const [progressSnap, librarySnap, plannersSnap] = await Promise.all([
    userRef.collection('oftpay_progress').doc(courseId).get(),
    userRef.collection('libraries').doc(libraryId).get(),
    userRef.collection('libraries').doc(libraryId).collection('planners').get(),
  ]);

  const planners = plannersSnap.docs
    .map((doc) => plannerFromDoc(doc.id, doc.data() as Record<string, unknown>))
    .sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));

  const favoriteRaw = librarySnap.data()?.favoritePlannerId;
  const favoritePlannerId = typeof favoriteRaw === 'string' && favoriteRaw.trim() ? favoriteRaw : null;

  const scheduleSnaps = await Promise.all(
    planners.map(async (planner) => {
      if (!planner.id) return null;
      const snap = await userRef
        .collection('libraries')
        .doc(libraryId)
        .collection('planners')
        .doc(planner.id)
        .collection('schedule')
        .doc('current')
        .get();
      if (!snap.exists) return null;
      return [planner.id, scheduleFromDoc(snap.data() as Record<string, unknown>)] as const;
    })
  );

  const schedules: Record<string, Schedule> = {};
  for (const row of scheduleSnaps) {
    if (row) schedules[row[0]] = row[1];
  }

  return {
    progressMap: progressFromDoc(progressSnap.data() as Record<string, unknown> | undefined),
    planners,
    favoritePlannerId,
    schedules,
  };
}

export type CarplayCourseSummary = {
  courseId: string;
  progressPercent: number;
  plannerName: string | null;
};

export async function loadCarplayOverview(email: string, courseIds: string[]): Promise<CarplayCourseSummary[]> {
  const uid = await uidForEmail(email);
  if (!uid) {
    return courseIds.map((courseId) => ({ courseId, progressPercent: 0, plannerName: null }));
  }
  const userRef = db().collection('users').doc(uid);
  return Promise.all(
    courseIds.map(async (courseId) => {
      const libraryId = `oftpay_${courseId}`;
      const [durationsMap, progressSnap, librarySnap] = await Promise.all([
        getDurationsByLibrary(libraryId),
        userRef.collection('oftpay_progress').doc(courseId).get(),
        userRef.collection('libraries').doc(libraryId).get(),
      ]);
      const progressMap = progressFromDoc(progressSnap.data() as Record<string, unknown> | undefined);
      let totalSeconds = 0;
      let watchedSeconds = 0;
      for (const [videoId, dur] of durationsMap) {
        const totalDur = dur.durationSeconds;
        totalSeconds += totalDur;
        const prog = progressMap[videoId];
        if (prog && totalDur > 0) watchedSeconds += Math.min(prog.watchedSeconds, totalDur);
      }
      const favoriteRaw = librarySnap.data()?.favoritePlannerId;
      let plannerName: string | null = null;
      if (typeof favoriteRaw === 'string' && favoriteRaw.trim()) {
        const plannerSnap = await userRef
          .collection('libraries')
          .doc(libraryId)
          .collection('planners')
          .doc(favoriteRaw)
          .get();
        const name = plannerSnap.data()?.name;
        plannerName = typeof name === 'string' && name.trim() ? name : null;
      }
      return {
        courseId,
        progressPercent: totalSeconds > 0 ? Math.round((watchedSeconds / totalSeconds) * 100) : 0,
        plannerName,
      };
    })
  );
}

async function userLibrary(email: string, courseId: string) {
  const uid = await uidForEmail(email);
  if (!uid) throw new Error('Não foi possível gravar: esta conta não tem um perfil salvo.');
  const libraryId = `oftpay_${courseId}`;
  const userRef = db().collection('users').doc(uid);
  return { uid, libraryId, userRef };
}

export async function saveCarplayProgress(email: string, courseId: string, progressMap: ProgressMap): Promise<void> {
  const { userRef } = await userLibrary(email, courseId);
  const serialized: Record<string, Record<string, unknown>> = {};
  for (const [videoId, progress] of Object.entries(progressMap)) {
    serialized[videoId] = {
      watched: Boolean(progress.watched),
      lastPosition: Number(progress.lastPosition) || 0,
      watchedSeconds: Number(progress.watchedSeconds) || 0,
      duration: progress.duration ?? null,
      comments: progress.comments ?? null,
      rating: progress.rating ?? null,
      updatedAt: Timestamp.fromMillis(progress.updatedAt || Date.now()),
    };
  }
  await userRef.collection('oftpay_progress').doc(courseId).set({ progressMap: serialized }, { merge: true });
}

export async function saveCarplayPlanner(
  email: string,
  courseId: string,
  settings: PlannerSettings,
  schedule: Schedule | null
): Promise<string> {
  const { libraryId, userRef } = await userLibrary(email, courseId);
  const planners = userRef.collection('libraries').doc(libraryId).collection('planners');
  const plannerId = settings.id?.trim() || planners.doc().id;
  const now = Timestamp.now();
  const payload = withoutUndefined({
    libraryId,
    name: settings.name || '',
    startDateISO: settings.startDateISO,
    endDateISO: settings.endDateISO,
    allowedWeekdays: settings.allowedWeekdays || [],
    hoursPerWeekday: settings.hoursPerWeekday || {},
    selectedSubjects: settings.selectedSubjects || [],
    subjectOrder: settings.subjectOrder || [],
    blockedDates: settings.blockedDates || [],
    createdAt: settings.createdAt ? Timestamp.fromDate(new Date(settings.createdAt)) : now,
    updatedAt: now,
  });
  await planners.doc(plannerId).set(payload as Record<string, unknown>, { merge: true });
  if (schedule) {
    await planners.doc(plannerId).collection('schedule').doc('current').set(
      withoutUndefined({
        plannerId,
        planInput: schedule.planInput,
        settings: schedule.settings,
        days: schedule.days,
        generatedAt: Timestamp.fromDate(new Date(schedule.generatedAt || Date.now())),
        version: schedule.version || '1.0',
      }) as Record<string, unknown>
    );
  }
  return plannerId;
}
