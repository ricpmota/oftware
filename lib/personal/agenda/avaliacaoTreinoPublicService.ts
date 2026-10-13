import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import { shadowOrganizationFields } from '@/lib/organization/shadowOrganizationId';
import {
  buildCompletedAssessment,
  mergeAssessmentStepAnswers,
  normalizeAssessmentSafety,
} from '@/lib/avaliacaoAtividadeFisica/assessmentPersistenceCore';
import {
  AVALIACAO_COMPLETED_STEP,
  COL_AVALIACAO_ATIVIDADE_FISICA,
  type AvaliacaoAtividadeFisicaBasicAnswers,
  type AvaliacaoAtividadeFisicaSafety,
} from '@/types/avaliacaoAtividadeFisica';

/** Recorte da avaliação exposto ao link público (o suficiente para retomar o questionário). */
export type AvaliacaoTreinoPublicSnapshot = {
  status: 'draft' | 'completed';
  currentStep: string | null;
  progressPercent: number;
  answers: AvaliacaoAtividadeFisicaBasicAnswers;
};

function avaliacaoRef(pacienteId: string) {
  return getFirestoreAdmin().collection(COL_AVALIACAO_ATIVIDADE_FISICA).doc(pacienteId);
}

function toDate(value: unknown): Date | null {
  if (value instanceof Timestamp) return value.toDate();
  if (value instanceof Date) return value;
  return null;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

/** Firestore admin rejeita `undefined`; Date/Timestamp/FieldValue passam intactos. */
function omitUndefinedDeep<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.filter((item) => item !== undefined).map((item) => omitUndefinedDeep(item)) as T;
  }
  if (isPlainObject(value)) {
    const out: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      if (nested === undefined) continue;
      out[key] = omitUndefinedDeep(nested);
    }
    return out as T;
  }
  return value;
}

export async function loadAvaliacaoTreinoPublic(
  pacienteId: string
): Promise<AvaliacaoTreinoPublicSnapshot | null> {
  const snap = await avaliacaoRef(pacienteId).get();
  if (!snap.exists) return null;
  const data = snap.data() || {};
  return {
    status: data.status === 'completed' ? 'completed' : 'draft',
    currentStep: typeof data.currentStep === 'string' ? data.currentStep : null,
    progressPercent: typeof data.progressPercent === 'number' ? data.progressPercent : 0,
    answers: (data.answers as AvaliacaoAtividadeFisicaBasicAnswers) || {},
  };
}

export async function pacienteTemAvaliacaoTreinoCompleta(pacienteId: string): Promise<boolean> {
  const snap = await avaliacaoRef(pacienteId).get();
  return snap.exists && snap.data()?.status === 'completed';
}

export async function startAvaliacaoTreinoPublic(pacienteId: string): Promise<void> {
  const ref = avaliacaoRef(pacienteId);
  const existing = await ref.get();
  if (existing.exists) return;

  const pacienteSnap = await getFirestoreAdmin().collection('pacientes_completos').doc(pacienteId).get();
  const userId = String(pacienteSnap.data()?.userId || '').trim() || null;

  await ref.set({
    id: pacienteId,
    patientId: pacienteId,
    userId,
    ...shadowOrganizationFields(),
    status: 'draft',
    version: 1,
    currentStep: 'primary_goal',
    progressPercent: 0,
    answers: {},
    safety: { requiresProfessionalAttention: false, reasons: [] },
    summary: null,
    completedAt: null,
    createdBy: 'patient',
    lastUpdatedBy: 'patient',
    startedAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
}

export async function saveAvaliacaoTreinoStepPublic(params: {
  pacienteId: string;
  stepId: string;
  partialAnswers: Partial<AvaliacaoAtividadeFisicaBasicAnswers>;
  progressPercent: number;
  nextStepId: string;
  safety?: AvaliacaoAtividadeFisicaSafety | null;
}): Promise<void> {
  const ref = avaliacaoRef(params.pacienteId);
  const snap = await ref.get();
  if (!snap.exists) {
    throw new Error('Avaliação não encontrada. Reinicie o questionário.');
  }
  const data = snap.data() || {};
  if (data.status === 'completed') return;

  const prevAnswers = (data.answers as AvaliacaoAtividadeFisicaBasicAnswers) || {};
  const mergedAnswers = mergeAssessmentStepAnswers(prevAnswers, params.stepId, params.partialAnswers);

  await ref.set(
    omitUndefinedDeep({
      answers: mergedAnswers,
      currentStep: params.nextStepId || params.stepId,
      progressPercent: params.progressPercent,
      lastUpdatedBy: 'patient',
      updatedAt: FieldValue.serverTimestamp(),
      ...(params.safety ? { safety: normalizeAssessmentSafety(params.safety) } : {}),
    }),
    { merge: true }
  );
}

export async function completeAvaliacaoTreinoPublic(params: {
  pacienteId: string;
  answers: AvaliacaoAtividadeFisicaBasicAnswers;
}): Promise<void> {
  const ref = avaliacaoRef(params.pacienteId);
  const snap = await ref.get();
  if (!snap.exists) {
    throw new Error('Avaliação não encontrada. Reinicie o questionário.');
  }
  const data = snap.data() || {};
  if (data.status === 'completed') return;

  const { mergedAnswers, safety, summary, trainingPersonalizationIndex } = buildCompletedAssessment({
    patientId: params.pacienteId,
    existing: data,
    answers: params.answers,
    startedAt: toDate(data.startedAt) ?? new Date(),
    completedAt: toDate(data.completedAt),
  });

  await ref.set(
    omitUndefinedDeep({
      answers: mergedAnswers,
      safety,
      summary,
      trainingPersonalizationIndex,
      status: 'completed',
      currentStep: AVALIACAO_COMPLETED_STEP,
      progressPercent: 100,
      completedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      lastUpdatedBy: 'patient',
    }),
    { merge: true }
  );
}

function iso(value: unknown): string | null {
  const date = toDate(value);
  return date ? date.toISOString() : null;
}

function toJsonSafe(value: unknown): unknown {
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map((item) => toJsonSafe(item));
  if (isPlainObject(value)) {
    const out: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value)) out[key] = toJsonSafe(nested);
    return out;
  }
  return value ?? null;
}

/** Leitura completa para o personal ou o médico. Não altera o documento. */
export async function loadAvaliacaoTreinoProfessional(pacienteId: string) {
  const snap = await avaliacaoRef(pacienteId).get();
  if (!snap.exists) return null;
  const data = snap.data() || {};
  return toJsonSafe({
    id: snap.id,
    patientId: String(data.patientId || snap.id),
    userId: typeof data.userId === 'string' ? data.userId : null,
    status: data.status === 'completed' ? 'completed' : 'draft',
    version: typeof data.version === 'number' ? data.version : 1,
    currentStep: typeof data.currentStep === 'string' ? data.currentStep : null,
    progressPercent: typeof data.progressPercent === 'number' ? data.progressPercent : 0,
    answers: data.answers || {},
    safety: data.safety || { requiresProfessionalAttention: false, reasons: [] },
    summary: data.summary ?? null,
    startedAt: iso(data.startedAt) || new Date().toISOString(),
    updatedAt: iso(data.updatedAt) || new Date().toISOString(),
    completedAt: iso(data.completedAt),
    createdBy: 'patient',
    lastUpdatedBy: 'patient',
  });
}

/** Grava uma etapa mesmo quando a anamnese já foi concluída, sem reabrir o status. */
export async function saveAvaliacaoTreinoProfessionalStep(params: {
  pacienteId: string;
  stepId: string;
  partialAnswers: Partial<AvaliacaoAtividadeFisicaBasicAnswers>;
  progressPercent: number;
  nextStepId: string;
  safety?: AvaliacaoAtividadeFisicaSafety | null;
}): Promise<void> {
  const ref = avaliacaoRef(params.pacienteId);
  const snap = await ref.get();
  if (!snap.exists) {
    throw new Error('Avaliação não encontrada. Reinicie o questionário.');
  }
  const data = snap.data() || {};
  if (data.status !== 'completed') {
    await saveAvaliacaoTreinoStepPublic(params);
    return;
  }
  const prevAnswers = (data.answers as AvaliacaoAtividadeFisicaBasicAnswers) || {};
  const mergedAnswers = mergeAssessmentStepAnswers(prevAnswers, params.stepId, params.partialAnswers);
  await reviseAvaliacaoTreinoProfessional({
    pacienteId: params.pacienteId,
    answers: mergedAnswers,
  });
}

/** Atualiza as respostas concluídas e preserva a data original de conclusão. */
export async function reviseAvaliacaoTreinoProfessional(params: {
  pacienteId: string;
  answers: AvaliacaoAtividadeFisicaBasicAnswers;
}): Promise<void> {
  const ref = avaliacaoRef(params.pacienteId);
  const snap = await ref.get();
  if (!snap.exists) {
    throw new Error('Avaliação não encontrada. Reinicie o questionário.');
  }
  const data = snap.data() || {};
  const alreadyCompleted = data.status === 'completed' && Boolean(data.completedAt);
  const { mergedAnswers, safety, summary, trainingPersonalizationIndex } = buildCompletedAssessment({
    patientId: params.pacienteId,
    existing: data,
    answers: params.answers,
    startedAt: toDate(data.startedAt) ?? new Date(),
    completedAt: toDate(data.completedAt),
  });

  await ref.set(
    omitUndefinedDeep({
      answers: mergedAnswers,
      safety,
      summary,
      trainingPersonalizationIndex,
      status: 'completed',
      currentStep: AVALIACAO_COMPLETED_STEP,
      progressPercent: 100,
      completedAt: alreadyCompleted ? data.completedAt : FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      lastUpdatedBy: 'patient',
    }),
    { merge: true }
  );
}
