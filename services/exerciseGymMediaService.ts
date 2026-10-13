import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  COL_EXERCISE_GYM_MEDIA,
  exerciseGymMediaDocId,
  type ExerciseGymMedia,
  type ExerciseGymMediaKind,
} from '@/lib/personal/exerciseGymMedia';

function parseMedia(id: string, data: Record<string, unknown>): ExerciseGymMedia | null {
  const url = String(data.url || '').trim();
  const exerciseId = String(data.exerciseId || '').trim();
  const patientUserId = String(data.patientUserId || '').trim();
  const kind: ExerciseGymMediaKind = data.kind === 'video' ? 'video' : 'image';
  if (!url || !exerciseId || !patientUserId) return null;
  return {
    id,
    patientUserId,
    patientDocId: typeof data.patientDocId === 'string' ? data.patientDocId : null,
    exerciseId,
    kind,
    url,
    storagePath: String(data.storagePath || ''),
    contentType: String(data.contentType || ''),
    createdByUid: String(data.createdByUid || ''),
    createdAt: String(data.createdAt || ''),
    updatedAt: String(data.updatedAt || ''),
  };
}

export const exerciseGymMediaService = {
  async get(patientUserId: string, exerciseId: string): Promise<ExerciseGymMedia | null> {
    const patient = patientUserId.trim();
    const exercise = exerciseId.trim();
    if (!patient || !exercise) return null;
    const id = exerciseGymMediaDocId(patient, exercise);
    const snap = await getDoc(doc(db, COL_EXERCISE_GYM_MEDIA, id));
    if (!snap.exists()) return null;
    return parseMedia(snap.id, snap.data() as Record<string, unknown>);
  },

  subscribe(
    patientUserId: string,
    exerciseId: string,
    onChange: (media: ExerciseGymMedia | null) => void
  ): () => void {
    const patient = patientUserId.trim();
    const exercise = exerciseId.trim();
    if (!patient || !exercise) {
      onChange(null);
      return () => undefined;
    }
    const id = exerciseGymMediaDocId(patient, exercise);
    return onSnapshot(
      doc(db, COL_EXERCISE_GYM_MEDIA, id),
      (snap) => {
        if (!snap.exists()) {
          onChange(null);
          return;
        }
        onChange(parseMedia(snap.id, snap.data() as Record<string, unknown>));
      },
      (error) => {
        console.error('Erro ao acompanhar foto real do exercício:', error);
        onChange(null);
      }
    );
  },
};
