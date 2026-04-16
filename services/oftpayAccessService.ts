/**
 * Serviço de acesso OftPay: usuários que fizeram login e quais cursos podem acessar.
 * Coleção Firestore: oftpay_users. Document ID = email normalizado (lowercase).
 */

import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import type { OftPayUserDoc } from '@/types/oftpayAccess';

const COLLECTION = 'oftpay_users';

function getAdminFirestore() {
  const existingApps = getApps();
  const adminApp = existingApps[0];
  if (!adminApp) {
    const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'oftware-9201e';
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL || process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY || process.env.FIREBASE_ADMIN_PRIVATE_KEY;
    if (!privateKey || !clientEmail) throw new Error('Firebase Admin: variáveis de ambiente não configuradas');
    const processedKey = privateKey.replace(/\\n/g, '\n');
    initializeApp({
      credential: cert({ projectId, clientEmail, privateKey: processedKey }),
    });
  }
  return getFirestore(getApps()[0]);
}

function normalizeEmail(email: string): string {
  return (email || '').trim().toLowerCase();
}

function toMillis(v: OftPayUserDoc['lastLoginAt'] | OftPayUserDoc['updatedAt'] | OftPayUserDoc['accessStartAt'] | OftPayUserDoc['accessEndAt']): number | undefined {
  if (v == null) return undefined;
  if (typeof v === 'number') return v;
  if (typeof (v as { toMillis?: () => number }).toMillis === 'function') return (v as { toMillis: () => number }).toMillis();
  return undefined;
}

/** Lista todos os usuários OftPay (quem já fez login ou foi adicionado pelo admin). */
export async function listOftPayUsers(): Promise<OftPayUserDoc[]> {
  const db = getAdminFirestore();
  const snapshot = await db.collection(COLLECTION).get();
  const list = snapshot.docs.map((doc) => {
    const d = doc.data() as Record<string, unknown>;
    return {
      email: (d.email as string) || doc.id,
      uid: d.uid as string | undefined,
      displayName: d.displayName as string | null | undefined,
      lastLoginAt: d.lastLoginAt != null ? toMillis(d.lastLoginAt as number | { toMillis: () => number }) : undefined,
      lastLoginUserAgent: typeof d.lastLoginUserAgent === 'string' ? d.lastLoginUserAgent : null,
      courseIds: Array.isArray(d.courseIds) ? (d.courseIds as string[]) : [],
      accessStartAt: d.accessStartAt != null ? toMillis(d.accessStartAt as number | { toMillis: () => number }) ?? null : undefined,
      accessEndAt: d.accessEndAt != null ? toMillis(d.accessEndAt as number | { toMillis: () => number }) ?? null : undefined,
      updatedAt: d.updatedAt != null ? toMillis(d.updatedAt as number | { toMillis: () => number }) : undefined,
    };
  });
  list.sort((a, b) => (b.lastLoginAt ?? 0) - (a.lastLoginAt ?? 0));
  return list;
}

/** Registra ou atualiza login: cria doc se não existir, atualiza lastLoginAt e dados do perfil. Mantém courseIds existentes. */
export async function upsertOftPayLogin(params: {
  email: string;
  uid?: string;
  displayName?: string | null;
  userAgent?: string | null;
  authTime?: number | null;
}): Promise<void> {
  const db = getAdminFirestore();
  const id = normalizeEmail(params.email);
  if (!id) return;
  const ref = db.collection(COLLECTION).doc(id);
  const now = Date.now();
  const snap = await ref.get();
  const existingCourseIds = snap.exists && Array.isArray((snap.data() as Record<string, unknown>)?.courseIds)
    ? ((snap.data() as Record<string, unknown>).courseIds as string[])
    : [];
  await ref.set(
    {
      email: params.email.trim(),
      uid: params.uid ?? null,
      displayName: params.displayName ?? null,
      lastLoginAt: now,
      lastLoginUserAgent: params.userAgent ?? null,
      lastAuthTime: params.authTime ?? null,
      courseIds: existingCourseIds,
      updatedAt: now,
    },
    { merge: true }
  );
}

/** Retorna o lastAuthTime do usuário (para validar sessão única). null = aceita qualquer sessão (compatibilidade). */
export async function getOftPayLastAuthTime(email: string): Promise<number | null> {
  const db = getAdminFirestore();
  const id = normalizeEmail(email);
  if (!id) return null;
  const snap = await db.collection(COLLECTION).doc(id).get();
  if (!snap.exists) return null;
  const data = snap.data() as Record<string, unknown>;
  const v = data?.lastAuthTime;
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  return null;
}

const nowMs = () => Date.now();

/** Retorna os IDs dos cursos permitidos para o email e vigência. Proprietário tem acesso a todos sem limite. */
export async function getOftPayUserAccessInfo(
  email: string,
  allCourseIds: string[]
): Promise<{ allowedCourseIds: string[]; accessStartAt: number | null; accessEndAt: number | null }> {
  const { OFTPAY_OWNER_EMAIL } = await import('@/types/oftpayAccess');
  if (normalizeEmail(email) === normalizeEmail(OFTPAY_OWNER_EMAIL)) {
    return { allowedCourseIds: allCourseIds, accessStartAt: null, accessEndAt: null };
  }
  const db = getAdminFirestore();
  const id = normalizeEmail(email);
  if (!id) return { allowedCourseIds: [], accessStartAt: null, accessEndAt: null };
  const snap = await db.collection(COLLECTION).doc(id).get();
  if (!snap.exists) return { allowedCourseIds: [], accessStartAt: null, accessEndAt: null };
  const data = snap.data() as Record<string, unknown>;
  const courseIds = Array.isArray(data.courseIds) ? (data.courseIds as string[]) : [];
  const filtered = courseIds.filter((c) => allCourseIds.includes(c));
  const accessStartAt = data.accessStartAt != null ? toMillis(data.accessStartAt as number | { toMillis: () => number }) ?? null : null;
  const accessEndAt = data.accessEndAt != null ? toMillis(data.accessEndAt as number | { toMillis: () => number }) ?? null : null;
  const now = nowMs();
  if (accessStartAt != null && now < accessStartAt) return { allowedCourseIds: [], accessStartAt, accessEndAt };
  if (accessEndAt != null && now > accessEndAt) return { allowedCourseIds: [], accessStartAt, accessEndAt };
  return { allowedCourseIds: filtered, accessStartAt, accessEndAt };
}

/** Retorna os IDs dos cursos permitidos para o email (respeitando vigência). Proprietário tem acesso a todos. */
export async function getAllowedCourseIds(
  email: string,
  allCourseIds: string[]
): Promise<string[]> {
  const { allowedCourseIds } = await getOftPayUserAccessInfo(email, allCourseIds);
  return allowedCourseIds;
}

/** Atualiza cursos e/ou vigência do usuário (apenas admin). */
export async function updateOftPayUser(params: {
  email: string;
  courseIds?: string[];
  accessStartAt?: number | null;
  accessEndAt?: number | null;
}): Promise<void> {
  const db = getAdminFirestore();
  const id = normalizeEmail(params.email);
  if (!id) throw new Error('Email inválido');
  const payload: Record<string, unknown> = { updatedAt: Date.now() };
  if (params.courseIds !== undefined) payload.courseIds = params.courseIds;
  if (params.accessStartAt !== undefined) payload.accessStartAt = params.accessStartAt ?? null;
  if (params.accessEndAt !== undefined) payload.accessEndAt = params.accessEndAt ?? null;
  await db.collection(COLLECTION).doc(id).set(payload, { merge: true });
}

/** Atualiza os cursos permitidos para um usuário (apenas admin). */
export async function updateUserCourseIds(email: string, courseIds: string[]): Promise<void> {
  await updateOftPayUser({ email, courseIds });
}

/** Remove um usuário OftPay (apenas admin). */
export async function deleteOftPayUser(email: string): Promise<void> {
  const db = getAdminFirestore();
  const id = normalizeEmail(email);
  if (!id) throw new Error('Email inválido');
  await db.collection(COLLECTION).doc(id).delete();
}

/** Retorna detalhes do usuário para o admin: % por curso, dispositivo, última vez que entrou. */
export async function getOftPayUserDetails(email: string): Promise<{
  lastLoginAt: number | null;
  lastLoginUserAgent: string | null;
  coursePercentages: Record<string, number>;
}> {
  const db = getAdminFirestore();
  const id = normalizeEmail(email);
  if (!id) return { lastLoginAt: null, lastLoginUserAgent: null, coursePercentages: {} };

  const userSnap = await db.collection(COLLECTION).doc(id).get();
  if (!userSnap.exists) return { lastLoginAt: null, lastLoginUserAgent: null, coursePercentages: {} };

  const userData = userSnap.data() as Record<string, unknown>;
  const uid = userData?.uid as string | undefined;
  const lastLoginAt = userData?.lastLoginAt != null ? toMillis(userData.lastLoginAt as number | { toMillis: () => number }) ?? null : null;
  const lastLoginUserAgent = typeof userData?.lastLoginUserAgent === 'string' ? userData.lastLoginUserAgent : null;

  const { OFTPAY_COURSES } = await import('@/app/oftpay/coursesConfig');
  const { getDurationsByLibrary } = await import('@/utils/videoDurationFirestore');

  const coursePercentages: Record<string, number> = {};

  if (!uid) {
    for (const c of OFTPAY_COURSES) coursePercentages[c.id] = 0;
    return { lastLoginAt, lastLoginUserAgent, coursePercentages };
  }

  for (const course of OFTPAY_COURSES) {
    const libraryId = `oftpay_${course.id}`;
    const [durationsMap, progressSnap] = await Promise.all([
      getDurationsByLibrary(libraryId),
      db.collection('users').doc(uid).collection('oftpay_progress').doc(course.id).get(),
    ]);

    let totalSeconds = 0;
    let watchedSeconds = 0;

    const progressMap = progressSnap.exists ? ((progressSnap.data() as Record<string, unknown>)?.progressMap as Record<string, { watchedSeconds?: number; duration?: number | null }>) : null;

    for (const [videoId, dur] of durationsMap) {
      const totalDur = dur.durationSeconds;
      totalSeconds += totalDur;
      const prog = progressMap?.[videoId];
      if (prog && totalDur > 0) {
        const ws = Number(prog.watchedSeconds) || 0;
        watchedSeconds += Math.min(ws, totalDur);
      }
    }

    coursePercentages[course.id] = totalSeconds > 0 ? Math.round((watchedSeconds / totalSeconds) * 100) : 0;
  }

  return { lastLoginAt, lastLoginUserAgent, coursePercentages };
}

/** Adiciona um usuário por email (sem login prévio) com lista de cursos vazia, para aparecer na lista do admin. */
export async function addOftPayUserByEmail(email: string): Promise<void> {
  const db = getAdminFirestore();
  const id = normalizeEmail(email);
  if (!id) throw new Error('Email inválido');
  const ref = db.collection(COLLECTION).doc(id);
  const snap = await ref.get();
  if (snap.exists) return;
  await ref.set({
    email: email.trim(),
    courseIds: [],
    accessStartAt: null,
    accessEndAt: null,
    lastLoginAt: null,
    updatedAt: Date.now(),
  });
}
