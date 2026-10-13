/**
 * Persistência técnica de WorkoutPlanDrafts (Etapa 11).
 * NÃO escreve em trainingSessions / calendário.
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
  type Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { buildDeterministicWorkoutPlan } from '@/lib/trainingEngine/buildDeterministicWorkoutPlan';
import { buildDraftFingerprint } from '@/lib/trainingEngine/buildDraftFingerprint';
import { loadCatalogForTrainingEngine } from '@/lib/trainingEngine/loadCatalogForTrainingEngine';
import {
  replaceWorkoutDraftExercise,
  undoWorkoutDraftExerciseReplacement,
} from '@/lib/trainingEngine/replaceWorkoutDraftExercise';
import { validateWorkoutPlanDraft } from '@/lib/trainingEngine/validateWorkoutPlanDraft';
import { buildTrainingPersonalizationIndex } from '@/lib/avaliacaoAtividadeFisica/buildTrainingPersonalizationIndex';
import { avaliacaoAtividadeFisicaService } from '@/services/avaliacaoAtividadeFisicaService';
import type { AvaliacaoAtividadeFisica } from '@/types/avaliacaoAtividadeFisica';
import type {
  ReviewedWorkoutPlanDraft,
  WorkoutDraftManualAdjustment,
  WorkoutPlanDraftReviewStatus,
} from '@/types/reviewedWorkoutPlanDraft';
import {
  COL_WORKOUT_PLAN_DRAFTS,
  TRAINING_ENGINE_PREVIEW_CATALOG_VERSION,
} from '@/types/reviewedWorkoutPlanDraft';
import type { SelectedWorkoutExercise, WorkoutPlanDraft } from '@/types/workoutPlanDraft';
import { TRAINING_ENGINE_VERSION } from '@/types/workoutPlanDraft';

function toDate(v: unknown): Date {
  if (v instanceof Date) return v;
  if (v && typeof v === 'object' && 'toDate' in v && typeof (v as Timestamp).toDate === 'function') {
    return (v as Timestamp).toDate();
  }
  if (typeof v === 'string' || typeof v === 'number') {
    const d = new Date(v);
    if (!isNaN(d.getTime())) return d;
  }
  return new Date();
}

function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `draft_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function mapDoc(id: string, data: Record<string, unknown>): ReviewedWorkoutPlanDraft {
  const review = (data.review || {}) as ReviewedWorkoutPlanDraft['review'];
  return {
    version: 1,
    id,
    patientId: String(data.patientId || ''),
    organizationId: (data.organizationId as string | null) ?? null,
    assessmentId: String(data.assessmentId || ''),
    assessmentVersion: typeof data.assessmentVersion === 'number' ? data.assessmentVersion : 1,
    indexVersion: typeof data.indexVersion === 'number' ? data.indexVersion : 1,
    engineVersion: String(data.engineVersion || TRAINING_ENGINE_VERSION),
    catalogVersion: String(data.catalogVersion || TRAINING_ENGINE_PREVIEW_CATALOG_VERSION),
    fingerprint: String(data.fingerprint || ''),
    baseDraft: data.baseDraft as WorkoutPlanDraft,
    workingDraft: data.workingDraft as WorkoutPlanDraft,
    review: {
      status: (review.status as WorkoutPlanDraftReviewStatus) || 'not_reviewed',
      reviewedBy: review.reviewedBy ?? null,
      reviewerRole: review.reviewerRole ?? null,
      startedAt: review.startedAt ? toDate(review.startedAt) : null,
      approvedAt: review.approvedAt ? toDate(review.approvedAt) : null,
      discardedAt: review.discardedAt ? toDate(review.discardedAt) : null,
      notes: review.notes ?? null,
    },
    manualAdjustments: Array.isArray(data.manualAdjustments)
      ? (data.manualAdjustments as WorkoutDraftManualAdjustment[])
      : [],
    validation: (data.validation as ReviewedWorkoutPlanDraft['validation']) || {
      valid: false,
      errors: [],
      warnings: [],
    },
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
    createdBy: String(data.createdBy || ''),
    createdByRole: (data.createdByRole as 'doctor' | 'personal_trainer') || 'doctor',
  };
}

function serializeForFirestore(reviewed: ReviewedWorkoutPlanDraft) {
  return {
    version: 1,
    patientId: reviewed.patientId,
    organizationId: reviewed.organizationId ?? null,
    assessmentId: reviewed.assessmentId,
    assessmentVersion: reviewed.assessmentVersion,
    indexVersion: reviewed.indexVersion,
    engineVersion: reviewed.engineVersion,
    catalogVersion: reviewed.catalogVersion,
    fingerprint: reviewed.fingerprint,
    baseDraft: reviewed.baseDraft,
    workingDraft: reviewed.workingDraft,
    review: {
      ...reviewed.review,
      startedAt: reviewed.review.startedAt || null,
      approvedAt: reviewed.review.approvedAt || null,
      discardedAt: reviewed.review.discardedAt || null,
    },
    manualAdjustments: reviewed.manualAdjustments,
    validation: reviewed.validation,
    createdBy: reviewed.createdBy,
    createdByRole: reviewed.createdByRole,
    updatedAt: serverTimestamp(),
  };
}

export type GeneratePreviewResult =
  | {
      ok: true;
      reviewed: ReviewedWorkoutPlanDraft;
      assessment: AvaliacaoAtividadeFisica;
      reused: boolean;
    }
  | {
      ok: false;
      reason:
        | 'no_assessment'
        | 'assessment_draft'
        | 'index_missing'
        | 'generation_failed'
        | 'catalog_failed';
      message: string;
      assessment?: AvaliacaoAtividadeFisica | null;
      draft?: WorkoutPlanDraft | null;
    };

export const workoutPlanDraftService = {
  async getById(draftId: string): Promise<ReviewedWorkoutPlanDraft | null> {
    const snap = await getDoc(doc(db, COL_WORKOUT_PLAN_DRAFTS, draftId));
    if (!snap.exists()) return null;
    return mapDoc(snap.id, snap.data() as Record<string, unknown>);
  },

  /** Últimos drafts do paciente (consulta direta, sem full scan). */
  async listByPatientId(patientId: string, max = 10): Promise<ReviewedWorkoutPlanDraft[]> {
    if (!patientId) return [];
    try {
      const q = query(
        collection(db, COL_WORKOUT_PLAN_DRAFTS),
        where('patientId', '==', patientId),
        orderBy('createdAt', 'desc'),
        limit(max)
      );
      const snap = await getDocs(q);
      return snap.docs.map((d) => mapDoc(d.id, d.data() as Record<string, unknown>));
    } catch {
      // Fallback sem orderBy (índice composto ainda não criado).
      const q = query(
        collection(db, COL_WORKOUT_PLAN_DRAFTS),
        where('patientId', '==', patientId),
        limit(max)
      );
      const snap = await getDocs(q);
      return snap.docs
        .map((d) => mapDoc(d.id, d.data() as Record<string, unknown>))
        .sort((a, b) => toDate(b.createdAt).getTime() - toDate(a.createdAt).getTime());
    }
  },

  async getLatestActiveByPatientId(
    patientId: string
  ): Promise<ReviewedWorkoutPlanDraft | null> {
    const list = await this.listByPatientId(patientId, 5);
    return (
      list.find((d) => d.review.status === 'in_review' || d.review.status === 'not_reviewed') ||
      list.find((d) => d.review.status === 'approved') ||
      list[0] ||
      null
    );
  },

  isStale(
    reviewed: ReviewedWorkoutPlanDraft,
    assessment: AvaliacaoAtividadeFisica
  ): { stale: boolean; reasons: string[] } {
    const reasons: string[] = [];
    if (assessment.version !== reviewed.assessmentVersion) {
      reasons.push('assessment_version_changed');
    }
    const indexVersion = assessment.trainingPersonalizationIndex?.version ?? null;
    if (indexVersion != null && indexVersion !== reviewed.indexVersion) {
      reasons.push('index_version_changed');
    }
    if (reviewed.engineVersion !== TRAINING_ENGINE_VERSION) {
      reasons.push('engine_version_changed');
    }
    if (assessment.updatedAt) {
      const updated = toDate(assessment.updatedAt).getTime();
      const created = toDate(reviewed.createdAt).getTime();
      if (updated > created + 1000) {
        reasons.push('assessment_updated_after_draft');
      }
    }
    return { stale: reasons.length > 0, reasons };
  },

  async generatePreview(params: {
    patientId: string;
    userId: string;
    viewerRole: 'doctor' | 'personal_trainer' | 'patient';
    organizationId?: string | null;
    forceNew?: boolean;
  }): Promise<GeneratePreviewResult> {
    const { patientId, userId, viewerRole, organizationId, forceNew } = params;
    const assessment = await avaliacaoAtividadeFisicaService.getByPatientId(patientId);
    if (!assessment) {
      return {
        ok: false,
        reason: 'no_assessment',
        message: 'O paciente ainda não iniciou a avaliação de atividade física.',
      };
    }
    if (assessment.status !== 'completed') {
      return {
        ok: false,
        reason: 'assessment_draft',
        message: 'A avaliação ainda está em preenchimento.',
        assessment,
      };
    }

    let index = assessment.trainingPersonalizationIndex;
    if (!index || index.version !== 1) {
      try {
        await avaliacaoAtividadeFisicaService.rebuildTrainingPersonalizationIndex(patientId);
        const refreshed = await avaliacaoAtividadeFisicaService.getByPatientId(patientId);
        index = refreshed?.trainingPersonalizationIndex ?? null;
      } catch {
        index = buildTrainingPersonalizationIndex(assessment);
      }
    }
    if (!index) {
      return {
        ok: false,
        reason: 'index_missing',
        message: 'Não foi possível obter o índice de personalização.',
        assessment,
      };
    }

    let catalog;
    try {
      catalog = await loadCatalogForTrainingEngine();
    } catch (e) {
      return {
        ok: false,
        reason: 'catalog_failed',
        message:
          e instanceof Error
            ? e.message
            : 'Não foi possível carregar o catálogo de exercícios.',
        assessment,
      };
    }

    const fingerprint = buildDraftFingerprint({
      patientId,
      assessmentVersion: assessment.version,
      indexVersion: index.version,
      engineVersion: TRAINING_ENGINE_VERSION,
      catalogVersion: catalog.catalogVersion,
    });

    if (!forceNew) {
      try {
        const existing = await this.listByPatientId(patientId, 5);
        const reusable = existing.find(
          (d) =>
            d.fingerprint === fingerprint &&
            (d.review.status === 'not_reviewed' || d.review.status === 'in_review')
        );
        if (reusable) {
          return { ok: true, reviewed: reusable, assessment, reused: true };
        }
      } catch {
        // índice Firestore pode não existir ainda — segue gerando
      }
    }

    const draft = buildDeterministicWorkoutPlan({
      index,
      exercises: catalog.exercises,
      patientId,
    });
    draft.source.generatedAt = new Date().toISOString();

    const validation = validateWorkoutPlanDraft(draft);
    const id = newId();
    const now = new Date();
    const roleForStore: 'doctor' | 'personal_trainer' =
      viewerRole === 'patient' ? 'personal_trainer' : viewerRole;
    const reviewed: ReviewedWorkoutPlanDraft = {
      version: 1,
      id,
      patientId,
      organizationId: organizationId ?? assessment.organizationId ?? null,
      assessmentId: assessment.id || patientId,
      assessmentVersion: assessment.version,
      indexVersion: index.version,
      engineVersion: TRAINING_ENGINE_VERSION,
      catalogVersion: catalog.catalogVersion,
      fingerprint,
      baseDraft: draft,
      workingDraft: draft,
      review: {
        status: 'not_reviewed',
        reviewedBy: null,
        reviewerRole: null,
        startedAt: now.toISOString(),
        approvedAt: null,
        discardedAt: null,
        notes: viewerRole === 'patient' ? 'patient_flow' : null,
      },
      manualAdjustments: [],
      validation,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      createdBy: userId,
      createdByRole: roleForStore,
    };

    await setDoc(doc(db, COL_WORKOUT_PLAN_DRAFTS, id), {
      ...serializeForFirestore(reviewed),
      createdAt: serverTimestamp(),
    });

    return { ok: true, reviewed, assessment, reused: false };
  },

  async saveReviewed(reviewed: ReviewedWorkoutPlanDraft): Promise<void> {
    if (!reviewed.id) throw new Error('draft id obrigatório');
    await setDoc(
      doc(db, COL_WORKOUT_PLAN_DRAFTS, reviewed.id),
      serializeForFirestore(reviewed),
      { merge: true }
    );
  },

  async applyReplacement(params: {
    reviewed: ReviewedWorkoutPlanDraft;
    sessionIndex: number;
    exerciseIndex: number;
    replacement: SelectedWorkoutExercise;
    changedBy: string;
  }): Promise<ReviewedWorkoutPlanDraft> {
    const { reviewed, sessionIndex, exerciseIndex, replacement, changedBy } = params;
    if (reviewed.review.status === 'approved' || reviewed.review.status === 'discarded') {
      throw new Error('Não é possível alterar um draft aprovado ou descartado.');
    }
    const prev = reviewed.workingDraft.sessions[sessionIndex]?.exercises[exerciseIndex];
    if (!prev) throw new Error('Exercício não encontrado.');

    const workingDraft = replaceWorkoutDraftExercise({
      draft: reviewed.workingDraft,
      sessionIndex,
      exerciseIndex,
      replacement,
    });

    const adjustment: WorkoutDraftManualAdjustment = {
      adjustmentId: newId(),
      type: 'exercise_replacement',
      sessionDayIndex: reviewed.workingDraft.sessions[sessionIndex].dayIndex,
      slotId: prev.slotId,
      previousExerciseId: prev.exerciseId,
      previousExerciseName: prev.exerciseName,
      replacementExerciseId: replacement.exerciseId,
      replacementExerciseName: replacement.exerciseName,
      changedAt: new Date().toISOString(),
      changedBy,
    };

    const next: ReviewedWorkoutPlanDraft = {
      ...reviewed,
      workingDraft,
      manualAdjustments: [...reviewed.manualAdjustments, adjustment],
      review: {
        ...reviewed.review,
        status: 'in_review',
      },
      validation: workingDraft.validation,
      updatedAt: new Date().toISOString(),
    };
    await this.saveReviewed(next);
    return next;
  },

  async undoLastReplacementForSlot(params: {
    reviewed: ReviewedWorkoutPlanDraft;
    sessionDayIndex: number;
    slotId: string;
  }): Promise<ReviewedWorkoutPlanDraft> {
    const { reviewed, sessionDayIndex, slotId } = params;
    if (reviewed.review.status === 'approved' || reviewed.review.status === 'discarded') {
      throw new Error('Não é possível alterar um draft aprovado ou descartado.');
    }
    const workingDraft = undoWorkoutDraftExerciseReplacement({
      workingDraft: reviewed.workingDraft,
      baseDraft: reviewed.baseDraft,
      sessionDayIndex,
      slotId,
    });
    const next: ReviewedWorkoutPlanDraft = {
      ...reviewed,
      workingDraft,
      manualAdjustments: reviewed.manualAdjustments.filter(
        (a) => !(a.sessionDayIndex === sessionDayIndex && a.slotId === slotId)
      ),
      validation: workingDraft.validation,
      updatedAt: new Date().toISOString(),
    };
    await this.saveReviewed(next);
    return next;
  },

  async updateNotes(
    reviewed: ReviewedWorkoutPlanDraft,
    notes: string
  ): Promise<ReviewedWorkoutPlanDraft> {
    const trimmed = notes.slice(0, 2000);
    const next = {
      ...reviewed,
      review: { ...reviewed.review, notes: trimmed || null },
      updatedAt: new Date().toISOString(),
    };
    await this.saveReviewed(next);
    return next;
  },

  async approve(params: {
    reviewed: ReviewedWorkoutPlanDraft;
    userId: string;
    viewerRole: 'doctor' | 'personal_trainer';
    stale: boolean;
  }): Promise<ReviewedWorkoutPlanDraft> {
    const { reviewed, userId, viewerRole, stale } = params;
    if (stale) throw new Error('Prévia desatualizada. Gere uma nova versão antes de aprovar.');
    if (reviewed.workingDraft.status !== 'generated') {
      throw new Error('Só é possível aprovar uma prévia gerada com sucesso.');
    }
    const validation = validateWorkoutPlanDraft(reviewed.workingDraft);
    if (!validation.valid) throw new Error('A prévia possui erros de validação.');
    const missing = reviewed.workingDraft.sessions.some(
      (s) => s.missingRequiredSlots.length > 0
    );
    if (missing) throw new Error('Há componentes obrigatórios sem exercício.');
    if (reviewed.review.status === 'approved') return reviewed;
    if (reviewed.review.status === 'discarded') {
      throw new Error('Prévia descartada. Gere uma nova versão.');
    }

    const next: ReviewedWorkoutPlanDraft = {
      ...reviewed,
      workingDraft: { ...reviewed.workingDraft, validation },
      validation,
      review: {
        ...reviewed.review,
        status: 'approved',
        reviewedBy: userId,
        reviewerRole: viewerRole,
        approvedAt: new Date().toISOString(),
      },
      updatedAt: new Date().toISOString(),
    };
    await this.saveReviewed(next);
    return next;
  },

  async discard(params: {
    reviewed: ReviewedWorkoutPlanDraft;
    userId: string;
    viewerRole: 'doctor' | 'personal_trainer';
  }): Promise<ReviewedWorkoutPlanDraft> {
    const { reviewed, userId, viewerRole } = params;
    const next: ReviewedWorkoutPlanDraft = {
      ...reviewed,
      review: {
        ...reviewed.review,
        status: 'discarded',
        reviewedBy: userId,
        reviewerRole: viewerRole,
        discardedAt: new Date().toISOString(),
      },
      updatedAt: new Date().toISOString(),
    };
    await this.saveReviewed(next);
    return next;
  },
};
