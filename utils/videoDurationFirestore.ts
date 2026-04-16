/**
 * Persistência de duração de vídeos (GCS) no Firestore.
 * Coleção: videoDurations — cache global por (libraryId, videoId).
 * Estrutura do documento: title, storagePath, durationSeconds, durationFormatted, updatedAt.
 */

import { getFirestore, FieldPath } from 'firebase-admin/firestore';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { formatDuration } from './formatDuration';

const COLLECTION = 'videoDurations';

function getAdminFirestore() {
  const existingApps = getApps();
  let adminApp = existingApps[0];
  if (!adminApp) {
    const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'oftware-9201e';
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL || process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY || process.env.FIREBASE_ADMIN_PRIVATE_KEY;
    if (!privateKey || !clientEmail) throw new Error('Firebase Admin: variáveis de ambiente não configuradas');
    const processedKey = privateKey.replace(/\\n/g, '\n');
    adminApp = initializeApp({
      credential: cert({ projectId, clientEmail, privateKey: processedKey }),
    });
  }
  return getFirestore(adminApp);
}

/** ID do documento: libraryId e videoId sanitizados (sem /) */
function docId(libraryId: string, videoId: string): string {
  return `${libraryId.replace(/\//g, '_')}_${videoId.replace(/\//g, '_')}`;
}

export interface VideoDurationRecord {
  title: string;
  storagePath: string;
  durationSeconds: number;
  durationFormatted: string;
  updatedAt: number;
}

/**
 * Busca durações salvas para vários vídeos de uma vez.
 * Retorna um Map videoId -> { durationSeconds, durationFormatted }.
 */
export async function getVideoDurationsBatch(
  libraryId: string,
  videoIds: string[]
): Promise<Map<string, { durationSeconds: number; durationFormatted: string }>> {
  const db = getAdminFirestore();
  const result = new Map<string, { durationSeconds: number; durationFormatted: string }>();
  if (videoIds.length === 0) return result;
  const ids = [...new Set(videoIds)];
  const refs = ids.map((videoId) => db.collection(COLLECTION).doc(docId(libraryId, videoId)));
  const snapshots = await db.getAll(...refs);
  snapshots.forEach((snap, i) => {
    if (!snap.exists) return;
    const data = snap.data() as VideoDurationRecord;
    const sec = data?.durationSeconds;
    if (typeof sec === 'number' && Number.isFinite(sec) && sec >= 0) {
      result.set(ids[i], {
        durationSeconds: sec,
        durationFormatted: typeof data?.durationFormatted === 'string' ? data.durationFormatted : formatDuration(sec),
      });
    }
  });
  return result;
}

/**
 * Retorna totais de duração por vídeo para uma biblioteca (para cálculo de % de progresso).
 * Chave do Map = videoId (extraído do docId removendo o prefixo libraryId_).
 */
export async function getDurationsByLibrary(
  libraryId: string
): Promise<Map<string, { durationSeconds: number }>> {
  const db = getAdminFirestore();
  const prefix = `${libraryId.replace(/\//g, '_')}_`;
  const prefixEnd = prefix + '\uf8ff';
  const snap = await db
    .collection(COLLECTION)
    .where(FieldPath.documentId(), '>=', prefix)
    .where(FieldPath.documentId(), '<=', prefixEnd)
    .get();
  const result = new Map<string, { durationSeconds: number }>();
  snap.docs.forEach((d) => {
    const videoId = d.id.slice(prefix.length);
    if (!videoId) return;
    const data = d.data() as VideoDurationRecord;
    const sec = data?.durationSeconds;
    if (typeof sec === 'number' && Number.isFinite(sec) && sec >= 0) {
      result.set(videoId, { durationSeconds: sec });
    }
  });
  return result;
}

/**
 * Salva a duração de um vídeo (após extração no cliente ou no servidor).
 */
export async function saveVideoDuration(
  libraryId: string,
  videoId: string,
  payload: { title: string; storagePath: string; durationSeconds: number }
): Promise<void> {
  const db = getAdminFirestore();
  const sec = Math.round(payload.durationSeconds);
  if (!Number.isFinite(sec) || sec < 0) throw new Error('durationSeconds inválido');
  const docRef = db.collection(COLLECTION).doc(docId(libraryId, videoId));
  await docRef.set(
    {
      title: payload.title,
      storagePath: payload.storagePath,
      durationSeconds: sec,
      durationFormatted: formatDuration(sec),
      updatedAt: Date.now(),
    },
    { merge: true }
  );
}
