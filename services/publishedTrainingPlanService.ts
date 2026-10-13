/**
 * Publicação controlada de planos de treino (Etapa 12).
 * NÃO cria trainingSessions nem eventos de calendário.
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  where,
  type Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  buildPublishedTrainingPlan,
  buildPublishKey,
  PublishPlanError,
} from '@/lib/trainingEngine/buildPublishedTrainingPlan';
import { loadCatalogForTrainingEngine } from '@/lib/trainingEngine/loadCatalogForTrainingEngine';
import { workoutPlanDraftService } from '@/services/workoutPlanDraftService';
import { PacientePersonalTrainerService } from '@/services/pacientePersonalTrainerService';
import { avaliacaoAtividadeFisicaService } from '@/services/avaliacaoAtividadeFisicaService';
import type { ReviewedWorkoutPlanDraft } from '@/types/reviewedWorkoutPlanDraft';
import type {
  ExerciseSnapshotInput,
  PublishedTrainingPlan,
} from '@/types/publishedTrainingPlan';
import { COL_PUBLISHED_TRAINING_PLANS } from '@/types/publishedTrainingPlan';

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
  return `plan_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function mapPlan(id: string, data: Record<string, unknown>): PublishedTrainingPlan {
  const source = (data.source || {}) as PublishedTrainingPlan['source'];
  const professional = (data.professional || {}) as PublishedTrainingPlan['professional'];
  const lifecycle = (data.lifecycle || {}) as PublishedTrainingPlan['lifecycle'];
  const structure = (data.structure || {}) as PublishedTrainingPlan['structure'];
  return {
    version: 1,
    id,
    patientId: String(data.patientId || ''),
    patientUserId: String(data.patientUserId || ''),
    organizationId: (data.organizationId as string | null) ?? null,
    source: {
      reviewedDraftId: String(source.reviewedDraftId || ''),
      assessmentId: String(source.assessmentId || ''),
      assessmentVersion: Number(source.assessmentVersion || 1),
      personalizationIndexVersion: Number(source.personalizationIndexVersion || 1),
      engineVersion: String(source.engineVersion || ''),
      catalogVersion: String(source.catalogVersion || ''),
      draftFingerprint: String(source.draftFingerprint || ''),
      publishKey: String(source.publishKey || ''),
    },
    status: (data.status as PublishedTrainingPlan['status']) || 'active',
    planVersion: Number(data.planVersion || 1),
    title: String(data.title || 'Plano de treino'),
    description: (data.description as string | null) ?? null,
    structure: {
      weeklyFrequency: Number(structure.weeklyFrequency || 0),
      splitStrategy: String(structure.splitStrategy || ''),
      sessionDurationMinutes: Number(structure.sessionDurationMinutes || 0),
    },
    sessions: Array.isArray(data.sessions)
      ? (data.sessions as PublishedTrainingPlan['sessions'])
      : [],
    professional: {
      publishedBy: String(professional.publishedBy || ''),
      publishedByRole:
        (professional.publishedByRole as 'doctor' | 'personal_trainer') || 'doctor',
      approvedBy: professional.approvedBy ?? null,
      approvedByRole: professional.approvedByRole ?? null,
    },
    lifecycle: {
      startsAt: lifecycle.startsAt ? toDate(lifecycle.startsAt) : null,
      endsAt: lifecycle.endsAt ? toDate(lifecycle.endsAt) : null,
      publishedAt: lifecycle.publishedAt ? toDate(lifecycle.publishedAt) : toDate(data.createdAt),
      supersededAt: lifecycle.supersededAt ? toDate(lifecycle.supersededAt) : null,
      cancelledAt: lifecycle.cancelledAt ? toDate(lifecycle.cancelledAt) : null,
      completedAt: lifecycle.completedAt ? toDate(lifecycle.completedAt) : null,
      cancelReason: (lifecycle.cancelReason as string | null) ?? null,
    },
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  };
}

function serializePlan(plan: PublishedTrainingPlan) {
  return {
    version: 1,
    patientId: plan.patientId,
    patientUserId: plan.patientUserId,
    organizationId: plan.organizationId,
    source: plan.source,
    status: plan.status,
    planVersion: plan.planVersion,
    title: plan.title,
    description: plan.description,
    structure: plan.structure,
    sessions: plan.sessions,
    professional: plan.professional,
    lifecycle: {
      ...plan.lifecycle,
      publishedAt: plan.lifecycle.publishedAt || null,
      startsAt: plan.lifecycle.startsAt || null,
      endsAt: plan.lifecycle.endsAt || null,
      supersededAt: plan.lifecycle.supersededAt || null,
      cancelledAt: plan.lifecycle.cancelledAt || null,
      completedAt: plan.lifecycle.completedAt || null,
      cancelReason: plan.lifecycle.cancelReason || null,
    },
    createdAt: plan.createdAt,
    updatedAt: serverTimestamp(),
  };
}

async function assertPublisherAccess(params: {
  patientId: string;
  userId: string;
  role: 'doctor' | 'personal_trainer';
}): Promise<void> {
  const { patientId, userId, role } = params;
  if (role === 'doctor') {
    const snap = await getDoc(doc(db, 'pacientes_completos', patientId));
    if (!snap.exists()) throw new Error('Paciente não encontrado.');
    const medicoId = String(snap.data()?.medicoResponsavelId || '');
    if (medicoId !== userId) {
      throw new Error('Médico sem vínculo ativo com este paciente.');
    }
    return;
  }
  const ok = await PacientePersonalTrainerService.hasAccessToPaciente(userId, patientId);
  if (!ok) {
    throw new Error('Personal trainer sem vínculo ativo com este paciente.');
  }
}

async function buildExerciseSnapshots(
  review: ReviewedWorkoutPlanDraft
): Promise<Record<string, ExerciseSnapshotInput>> {
  const ids = new Set<string>();
  for (const s of review.workingDraft.sessions) {
    for (const e of s.exercises) {
      ids.add(e.sourceId || e.exerciseId);
    }
  }
  const snapshots: Record<string, ExerciseSnapshotInput> = {};
  try {
    const { exercises } = await loadCatalogForTrainingEngine();
    for (const ex of exercises) {
      if (!ids.has(ex.id)) continue;
      snapshots[ex.id] = {
        instructions: Array.isArray(ex.instructions) ? [...ex.instructions] : [],
        imageUrl: `/api/exercisedb/image?exerciseId=${encodeURIComponent(ex.id)}&resolution=360`,
        videoUrl: null,
      };
    }
  } catch {
    // snapshot mínimo mesmo sem catálogo
  }
  for (const id of ids) {
    if (!snapshots[id]) {
      snapshots[id] = {
        instructions: [],
        imageUrl: `/api/exercisedb/image?exerciseId=${encodeURIComponent(id)}&resolution=360`,
        videoUrl: null,
      };
    }
  }
  return snapshots;
}

export const publishedTrainingPlanService = {
  async getById(planId: string): Promise<PublishedTrainingPlan | null> {
    const snap = await getDoc(doc(db, COL_PUBLISHED_TRAINING_PLANS, planId));
    if (!snap.exists()) return null;
    return mapPlan(snap.id, snap.data() as Record<string, unknown>);
  },

  async getActiveByPatientId(patientId: string): Promise<PublishedTrainingPlan | null> {
    if (!patientId) return null;
    const q = query(
      collection(db, COL_PUBLISHED_TRAINING_PLANS),
      where('patientId', '==', patientId),
      where('status', '==', 'active'),
      limit(1)
    );
    const snap = await getDocs(q);
    if (snap.empty) return null;
    return mapPlan(snap.docs[0].id, snap.docs[0].data() as Record<string, unknown>);
  },

  async listVersionsByPatientId(patientId: string, max = 20): Promise<PublishedTrainingPlan[]> {
    if (!patientId) return [];
    try {
      const q = query(
        collection(db, COL_PUBLISHED_TRAINING_PLANS),
        where('patientId', '==', patientId),
        orderBy('planVersion', 'desc'),
        limit(max)
      );
      const snap = await getDocs(q);
      return snap.docs.map((d) => mapPlan(d.id, d.data() as Record<string, unknown>));
    } catch {
      const q = query(
        collection(db, COL_PUBLISHED_TRAINING_PLANS),
        where('patientId', '==', patientId),
        limit(max)
      );
      const snap = await getDocs(q);
      return snap.docs
        .map((d) => mapPlan(d.id, d.data() as Record<string, unknown>))
        .sort((a, b) => b.planVersion - a.planVersion);
    }
  },

  async findByPublishKey(publishKey: string): Promise<PublishedTrainingPlan | null> {
    const q = query(
      collection(db, COL_PUBLISHED_TRAINING_PLANS),
      where('source.publishKey', '==', publishKey),
      limit(1)
    );
    const snap = await getDocs(q);
    if (snap.empty) return null;
    return mapPlan(snap.docs[0].id, snap.docs[0].data() as Record<string, unknown>);
  },

  async publishApprovedWorkoutPlan(params: {
    reviewedDraftId: string;
    userId: string;
    viewerRole: 'doctor' | 'personal_trainer';
    startsAt?: Date | string | null;
    endsAt?: Date | string | null;
    title?: string | null;
    description?: string | null;
  }): Promise<PublishedTrainingPlan> {
    const {
      reviewedDraftId,
      userId,
      viewerRole,
      startsAt = null,
      endsAt = null,
      title = null,
      description = null,
    } = params;

    if (!reviewedDraftId) throw new Error('reviewedDraftId é obrigatório.');
    if (!userId) throw new Error('Usuário não autenticado.');

    const review = await workoutPlanDraftService.getById(reviewedDraftId);
    if (!review) throw new Error('Prévia não encontrada.');

    await assertPublisherAccess({
      patientId: review.patientId,
      userId,
      role: viewerRole,
    });

    if (review.review.status !== 'approved') {
      throw new PublishPlanError('Somente prévia aprovada pode ser publicada.', 'not_approved');
    }

    const assessment = await avaliacaoAtividadeFisicaService.getByPatientId(review.patientId);
    if (!assessment || assessment.status !== 'completed') {
      throw new Error('Avaliação do paciente inválida ou incompleta.');
    }

    const stale = workoutPlanDraftService.isStale(review, assessment);
    if (stale.stale) {
      throw new Error('Prévia desatualizada. Gere e aprove uma nova versão antes de publicar.');
    }

    const patientUserId = assessment.userId;
    if (!patientUserId) {
      throw new PublishPlanError(
        'Não foi possível identificar o usuário do paciente.',
        'missing_patient_user'
      );
    }

    const publishKey = buildPublishKey(reviewedDraftId, review.fingerprint);
    const existing = await this.findByPublishKey(publishKey);
    if (existing) {
      return existing;
    }

    const snapshots = await buildExerciseSnapshots(review);
    const versions = await this.listVersionsByPatientId(review.patientId, 50);
    const nextVersion =
      versions.length > 0 ? Math.max(...versions.map((v) => v.planVersion)) + 1 : 1;

    const activeBefore = await this.getActiveByPatientId(review.patientId);

    const plan = buildPublishedTrainingPlan({
      review,
      planVersion: nextVersion,
      publishedBy: userId,
      publishedByRole: viewerRole,
      patientUserId,
      title,
      description,
      startsAt,
      endsAt,
      exerciseSnapshots: snapshots,
    });

    const planId = newId();
    plan.id = planId;

    await runTransaction(db, async (tx) => {
      if (activeBefore?.id) {
        const activeRef = doc(db, COL_PUBLISHED_TRAINING_PLANS, activeBefore.id);
        const activeSnap = await tx.get(activeRef);
        if (activeSnap.exists() && activeSnap.data()?.status === 'active') {
          tx.update(activeRef, {
            status: 'superseded',
            'lifecycle.supersededAt': new Date().toISOString(),
            updatedAt: serverTimestamp(),
          });
        }
      }

      const planRef = doc(db, COL_PUBLISHED_TRAINING_PLANS, planId);
      tx.set(planRef, {
        ...serializePlan(plan),
        createdAt: serverTimestamp(),
      });

      const draftRef = doc(db, 'workoutPlanDrafts', reviewedDraftId);
      tx.set(
        draftRef,
        {
          publication: {
            publishedPlanId: planId,
            publishedAt: new Date().toISOString(),
            publishKey,
          },
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    });

    return plan;
  },

  async cancelPlan(params: {
    planId: string;
    userId: string;
    viewerRole: 'doctor' | 'personal_trainer';
    reason?: string | null;
  }): Promise<PublishedTrainingPlan> {
    const { planId, userId, viewerRole, reason = null } = params;
    const plan = await this.getById(planId);
    if (!plan) throw new Error('Plano não encontrado.');
    if (plan.status !== 'active') {
      throw new Error('Somente planos ativos podem ser cancelados.');
    }

    await assertPublisherAccess({
      patientId: plan.patientId,
      userId,
      role: viewerRole,
    });

    const ref = doc(db, COL_PUBLISHED_TRAINING_PLANS, planId);
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists()) throw new Error('Plano não encontrado.');
      if (snap.data()?.status !== 'active') {
        throw new Error('Plano não está mais ativo.');
      }
      tx.update(ref, {
        status: 'cancelled',
        'lifecycle.cancelledAt': new Date().toISOString(),
        'lifecycle.cancelReason': reason ? String(reason).slice(0, 500) : null,
        updatedAt: serverTimestamp(),
      });
    });

    return {
      ...plan,
      status: 'cancelled',
      lifecycle: {
        ...plan.lifecycle,
        cancelledAt: new Date().toISOString(),
        cancelReason: reason ? String(reason).slice(0, 500) : null,
      },
      updatedAt: new Date().toISOString(),
    };
  },
};
