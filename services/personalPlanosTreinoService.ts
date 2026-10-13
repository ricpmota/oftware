import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { COL_PERSONAL_TRAINERS } from '@/features/metaPersonal/metaPersonal.constants';
import {
  normalizeTrainingExercisePrescription,
  serializeTrainingPrescription,
} from '@/lib/personal/trainingExerciseSeries';
import { normalizeTreinoColorKey } from '@/lib/metapersonal/treinosPlannerTheme';
import {
  templateExerciseGifUrl,
  validatePersonalWorkoutTemplate,
  type PersonalWorkoutTemplate,
  type PersonalWorkoutTemplateExercise,
} from '@/lib/personal/planosTreino';

const SUBCOL = 'planos_treino';

function omitUndefinedDeep<T>(value: T): T {
  if (value === null || value === undefined) return value;
  if (typeof value !== 'object') return value;
  if (Array.isArray(value)) {
    return value.map((item) => omitUndefinedDeep(item)) as T;
  }
  if (Object.getPrototypeOf(value) !== Object.prototype) {
    return value;
  }
  const out: Record<string, unknown> = {};
  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    if (nested === undefined) continue;
    out[key] = omitUndefinedDeep(nested);
  }
  return out as T;
}

function toDateSafe(value: unknown): Date {
  if (value instanceof Date) return value;
  if (value && typeof value === 'object' && typeof (value as { toDate?: () => Date }).toDate === 'function') {
    return (value as { toDate: () => Date }).toDate();
  }
  if (typeof value === 'string' || typeof value === 'number') {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return new Date();
}

function serializeExercise(
  exercise: PersonalWorkoutTemplateExercise,
  order: number
): Record<string, unknown> {
  const exerciseId = String(exercise.exerciseId || '').trim();
  const gifUrl = templateExerciseGifUrl(exerciseId);
  return omitUndefinedDeep({
    id: exercise.id,
    source: 'exercisedb',
    exerciseId,
    name: exercise.name,
    bodyPart: exercise.bodyPart || '',
    target: exercise.target || '',
    equipment: exercise.equipment || '',
    gifUrl: gifUrl || undefined,
    prescription: serializeTrainingPrescription(exercise.prescription),
    trainerNote: typeof exercise.trainerNote === 'string' ? exercise.trainerNote.trim() || undefined : undefined,
    order,
  });
}

function parseExercise(raw: unknown, index: number): PersonalWorkoutTemplateExercise | null {
  if (!raw || typeof raw !== 'object') return null;
  const item = raw as Record<string, unknown>;
  const exerciseId = typeof item.exerciseId === 'string' ? item.exerciseId.trim() : '';
  const name = typeof item.name === 'string' ? item.name : '';
  if (!exerciseId || !name) return null;
  const id =
    typeof item.id === 'string' && item.id.trim()
      ? item.id.trim()
      : `tpl_ex_${index}_${exerciseId}`;
  const gifUrl = templateExerciseGifUrl(exerciseId);
  return {
    id,
    source: 'exercisedb',
    exerciseId,
    name,
    bodyPart: typeof item.bodyPart === 'string' ? item.bodyPart : '',
    target: typeof item.target === 'string' ? item.target : '',
    equipment: typeof item.equipment === 'string' ? item.equipment : '',
    ...(gifUrl ? { gifUrl } : {}),
    prescription: normalizeTrainingExercisePrescription(item.prescription as never),
    ...(typeof item.trainerNote === 'string' && item.trainerNote.trim()
      ? { trainerNote: item.trainerNote.trim() }
      : {}),
    order: typeof item.order === 'number' ? item.order : index,
  };
}

function parseTemplate(id: string, data: Record<string, unknown>): PersonalWorkoutTemplate {
  const exerciciosRaw = Array.isArray(data.exercicios) ? data.exercicios : [];
  const exercicios = exerciciosRaw
    .map((item, index) => parseExercise(item, index))
    .filter((item): item is PersonalWorkoutTemplateExercise => Boolean(item))
    .sort((a, b) => a.order - b.order)
    .map((item, order) => ({ ...item, order }));
  const descricao = typeof data.descricao === 'string' ? data.descricao.trim() : '';
  const cor = normalizeTreinoColorKey(data.cor);
  return {
    id,
    nome: typeof data.nome === 'string' && data.nome.trim() ? data.nome : 'Plano sem nome',
    ...(descricao ? { descricao } : {}),
    ...(cor ? { cor } : {}),
    exercicios,
    criadoEm: toDateSafe(data.criadoEm),
    atualizadoEm: toDateSafe(data.atualizadoEm),
  };
}

export class PersonalPlanosTreinoService {
  static collectionRef(personalTrainerId: string) {
    return collection(db, COL_PERSONAL_TRAINERS, personalTrainerId, SUBCOL);
  }

  static async listar(personalTrainerId: string): Promise<PersonalWorkoutTemplate[]> {
    const snap = await getDocs(this.collectionRef(personalTrainerId));
    return snap.docs
      .map((d) => parseTemplate(d.id, d.data() as Record<string, unknown>))
      .sort((a, b) => (b.atualizadoEm?.getTime() || 0) - (a.atualizadoEm?.getTime() || 0));
  }

  static async salvar(
    personalTrainerId: string,
    input: {
      id?: string;
      nome: string;
      descricao?: string;
      cor?: string;
      exercicios: PersonalWorkoutTemplateExercise[];
    }
  ): Promise<PersonalWorkoutTemplate> {
    const nome = input.nome.trim();
    if (!personalTrainerId) throw new Error('Personal trainer inválido.');
    const check = validatePersonalWorkoutTemplate({
      nome,
      exercicios: input.exercicios,
    });
    if (!check.ok) throw new Error(check.message);
    const id = input.id || doc(this.collectionRef(personalTrainerId)).id;
    const ref = doc(db, COL_PERSONAL_TRAINERS, personalTrainerId, SUBCOL, id);
    const agora = new Date();
    const descricao = input.descricao?.trim() || '';
    const cor = normalizeTreinoColorKey(input.cor);
    const exercicios = (input.exercicios || []).map((exercise, order) =>
      serializeExercise(exercise, order)
    );
    const payload = omitUndefinedDeep({
      nome,
      descricao,
      ...(cor ? { cor } : {}),
      exercicios,
      atualizadoEm: serverTimestamp(),
      ...(input.id ? {} : { criadoEm: serverTimestamp() }),
    });
    await setDoc(ref, payload, { merge: true });
    return {
      id,
      nome,
      ...(descricao ? { descricao } : {}),
      ...(cor ? { cor } : {}),
      exercicios: input.exercicios.map((exercise, order) => ({ ...exercise, order })),
      criadoEm: agora,
      atualizadoEm: agora,
    };
  }

  static async excluir(personalTrainerId: string, planoId: string): Promise<void> {
    await deleteDoc(doc(db, COL_PERSONAL_TRAINERS, personalTrainerId, SUBCOL, planoId));
  }
}
