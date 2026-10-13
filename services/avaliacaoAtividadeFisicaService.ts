/**
 * Persistência da Avaliação de Atividade Física (documento ativo por paciente).
 */

import { db } from '@/lib/firebase';
import { shadowOrganizationFields } from '@/lib/organization/shadowOrganizationId';
import {
  buildCompletedAssessment,
  mergeAssessmentStepAnswers,
  normalizeAssessmentSafety,
} from '@/lib/avaliacaoAtividadeFisica/assessmentPersistenceCore';
import { buildPhysicalActivityAssessmentSummary } from '@/lib/avaliacaoAtividadeFisica/buildAssessmentSummary';
import { buildTrainingPersonalizationIndex } from '@/lib/avaliacaoAtividadeFisica/buildTrainingPersonalizationIndex';
import {
  AVALIACAO_COMPLETED_STEP,
  COL_AVALIACAO_ATIVIDADE_FISICA,
  type AvaliacaoAtividadeFisica,
  type AvaliacaoAtividadeFisicaBasicAnswers,
  type AvaliacaoAtividadeFisicaSafety,
} from '@/types/avaliacaoAtividadeFisica';
import type { TrainingPersonalizationIndex } from '@/types/trainingPersonalizationIndex';
import { doc, getDoc, serverTimestamp, setDoc, Timestamp } from 'firebase/firestore';

function toDate(value: unknown): Date {
  if (value instanceof Timestamp) return value.toDate();
  if (value instanceof Date) return value;
  if (typeof value === 'string' || typeof value === 'number') {
    const d = new Date(value);
    if (!isNaN(d.getTime())) return d;
  }
  return new Date();
}

function mapDoc(
  id: string,
  data: Record<string, unknown>
): AvaliacaoAtividadeFisica {
  return {
    id,
    patientId: String(data.patientId || id),
    userId: (data.userId as string | null | undefined) ?? null,
    organizationId: (data.organizationId as string | null | undefined) ?? null,
    status: (data.status as AvaliacaoAtividadeFisica['status']) || 'draft',
    version: typeof data.version === 'number' ? data.version : 1,
    currentStep: (data.currentStep as string | null | undefined) ?? null,
    progressPercent: typeof data.progressPercent === 'number' ? data.progressPercent : 0,
    answers: (data.answers as AvaliacaoAtividadeFisicaBasicAnswers) || {},
    safety: {
      requiresProfessionalAttention: Boolean(
        (data.safety as AvaliacaoAtividadeFisica['safety'] | undefined)
          ?.requiresProfessionalAttention
      ),
      reasons: Array.isArray((data.safety as AvaliacaoAtividadeFisica['safety'] | undefined)?.reasons)
        ? ((data.safety as AvaliacaoAtividadeFisica['safety']).reasons as string[])
        : [],
    },
    summary: (data.summary as AvaliacaoAtividadeFisica['summary'] | null | undefined) ?? null,
    trainingPersonalizationIndex:
      (data.trainingPersonalizationIndex as TrainingPersonalizationIndex | null | undefined) ??
      null,
    patientPlanCalendar: (data.patientPlanCalendar as AvaliacaoAtividadeFisica['patientPlanCalendar']) ?? null,
    patientPlanDismissedAt: data.patientPlanDismissedAt
      ? toDate(data.patientPlanDismissedAt)
      : null,
    startedAt: toDate(data.startedAt),
    updatedAt: toDate(data.updatedAt),
    completedAt: data.completedAt ? toDate(data.completedAt) : null,
    createdBy: 'patient',
    lastUpdatedBy: 'patient',
  };
}

export const avaliacaoAtividadeFisicaService = {
  async getByPatientId(patientId: string): Promise<AvaliacaoAtividadeFisica | null> {
    if (!patientId) return null;
    const ref = doc(db, COL_AVALIACAO_ATIVIDADE_FISICA, patientId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    return mapDoc(snap.id, snap.data() as Record<string, unknown>);
  },

  async createDraft(params: {
    patientId: string;
    userId?: string | null;
    organizationId?: string | null;
  }): Promise<void> {
    const { patientId, userId } = params;
    if (!patientId) throw new Error('patientId é obrigatório');
    if (!userId) throw new Error('userId é obrigatório para criar a avaliação');

    const existing = await this.getByPatientId(patientId);
    if (existing) return;

    const ref = doc(db, COL_AVALIACAO_ATIVIDADE_FISICA, patientId);
    await setDoc(ref, {
      id: patientId,
      patientId,
      userId,
      ...shadowOrganizationFields(),
      status: 'draft',
      version: 1,
      currentStep: 'primary_goal',
      progressPercent: 0,
      answers: {},
      safety: {
        requiresProfessionalAttention: false,
        reasons: [],
      },
      summary: null,
      completedAt: null,
      createdBy: 'patient',
      lastUpdatedBy: 'patient',
      startedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  },

  /**
   * Merge parcial de answers + metadados de etapa.
   * Opcionalmente atualiza `safety` (Etapa 06) sem substituir o documento inteiro.
   */
  async saveStep(params: {
    patientId: string;
    stepId: string;
    partialAnswers: Partial<AvaliacaoAtividadeFisicaBasicAnswers>;
    progressPercent: number;
    /** Próximo step a persistir (ex. próxima pergunta ou safety_complete). */
    nextStepId: string;
    safety?: AvaliacaoAtividadeFisicaSafety | null;
  }): Promise<void> {
    const { patientId, stepId, partialAnswers, progressPercent, nextStepId, safety } = params;
    if (!patientId) throw new Error('patientId é obrigatório');

    const ref = doc(db, COL_AVALIACAO_ATIVIDADE_FISICA, patientId);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      throw new Error('Avaliação não encontrada. Reinicie o questionário.');
    }

    const data = snap.data() as Record<string, unknown>;
    const prevAnswers = (data.answers as AvaliacaoAtividadeFisicaBasicAnswers) || {};
    const mergedAnswers = mergeAssessmentStepAnswers(prevAnswers, stepId, partialAnswers);

    await setDoc(
      ref,
      {
        answers: mergedAnswers,
        currentStep: nextStepId || stepId,
        progressPercent,
        lastUpdatedBy: 'patient',
        updatedAt: serverTimestamp(),
        ...(safety ? { safety: normalizeAssessmentSafety(safety) } : {}),
      },
      { merge: true }
    );
  },

  /**
   * Conclusão definitiva (Etapa 07).
   * Recalcula safety + summary no momento da conclusão.
   * Idempotente se já estiver completed.
   */
  async completeAssessment(params: {
    patientId: string;
    answers: AvaliacaoAtividadeFisicaBasicAnswers;
  }): Promise<void> {
    const { patientId, answers } = params;
    if (!patientId) throw new Error('patientId é obrigatório');

    const ref = doc(db, COL_AVALIACAO_ATIVIDADE_FISICA, patientId);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      throw new Error('Avaliação não encontrada. Reinicie o questionário.');
    }

    const data = snap.data() as Record<string, unknown>;
    const { mergedAnswers, safety, summary, trainingPersonalizationIndex } =
      buildCompletedAssessment({
        patientId,
        existing: data,
        answers,
        startedAt: toDate(data.startedAt),
        completedAt: data.completedAt ? toDate(data.completedAt) : null,
      });

    await setDoc(
      ref,
      {
        answers: mergedAnswers,
        safety,
        summary,
        trainingPersonalizationIndex,
        status: 'completed',
        currentStep: AVALIACAO_COMPLETED_STEP,
        progressPercent: 100,
        completedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        lastUpdatedBy: 'patient',
      },
      { merge: true }
    );
  },

  /**
   * Reprocessa o índice para avaliações já concluídas (idempotente).
   * Não altera answers, safety, summary ou status.
   */
  async rebuildTrainingPersonalizationIndex(patientId: string): Promise<void> {
    if (!patientId) throw new Error('patientId é obrigatório');

    const ref = doc(db, COL_AVALIACAO_ATIVIDADE_FISICA, patientId);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      throw new Error('Avaliação não encontrada.');
    }

    const assessment = mapDoc(snap.id, snap.data() as Record<string, unknown>);
    if (assessment.status !== 'completed') {
      throw new Error('Somente avaliações concluídas podem reprocessar o índice.');
    }

    // Garante summary em memória se legado
    const safety = assessment.safety || {
      requiresProfessionalAttention: false,
      reasons: [],
    };
    const summary =
      assessment.summary &&
      typeof assessment.summary === 'object' &&
      'version' in assessment.summary
        ? (assessment.summary as NonNullable<AvaliacaoAtividadeFisica['summary']>)
        : buildPhysicalActivityAssessmentSummary(assessment.answers || {}, safety);

    const index = buildTrainingPersonalizationIndex({
      ...assessment,
      safety,
      summary: summary as AvaliacaoAtividadeFisica['summary'],
      status: 'completed',
    });
    index.source.generatedAt = new Date();

    await setDoc(
      ref,
      {
        trainingPersonalizationIndex: index,
        updatedAt: serverTimestamp(),
        lastUpdatedBy: 'patient',
      },
      { merge: true }
    );
  },

  /**
   * Marca que o paciente gravou o plano no calendário Personal (trainingSessions).
   */
  async markPatientPlanCalendarSaved(params: {
    patientId: string;
    draftId: string | null;
    sessionCount: number;
    recurrenceGroupIds?: string[];
    sessionIds?: string[];
  }): Promise<void> {
    const { patientId, draftId, sessionCount, recurrenceGroupIds, sessionIds } = params;
    if (!patientId) throw new Error('patientId é obrigatório');
    const ref = doc(db, COL_AVALIACAO_ATIVIDADE_FISICA, patientId);
    await setDoc(
      ref,
      {
        patientPlanCalendar: {
          savedAt: serverTimestamp(),
          draftId,
          sessionCount,
          recurrenceGroupIds: Array.isArray(recurrenceGroupIds) ? recurrenceGroupIds : [],
          sessionIds: Array.isArray(sessionIds) ? sessionIds : [],
        },
        updatedAt: serverTimestamp(),
        lastUpdatedBy: 'patient',
      },
      { merge: true }
    );
  },

  /**
   * Marca que o paciente removeu as séries do plano gerado.
   * Mantém savedAt (quando existir) para o gate continuar liberando o Personal.
   */
  async markPatientPlanCalendarCleared(params: {
    patientId: string;
    draftId?: string | null;
  }): Promise<void> {
    const { patientId, draftId = null } = params;
    if (!patientId) throw new Error('patientId é obrigatório');
    const ref = doc(db, COL_AVALIACAO_ATIVIDADE_FISICA, patientId);
    const existing = await getDoc(ref);
    const prev = existing.exists()
      ? ((existing.data() as Record<string, unknown>).patientPlanCalendar as
          | Record<string, unknown>
          | null
          | undefined)
      : null;
    await setDoc(
      ref,
      {
        patientPlanCalendar: {
          savedAt: prev?.savedAt ?? serverTimestamp(),
          draftId: draftId ?? (prev?.draftId as string | null | undefined) ?? null,
          sessionCount: 0,
          recurrenceGroupIds: [],
          sessionIds: [],
          clearedAt: serverTimestamp(),
        },
        updatedAt: serverTimestamp(),
        lastUpdatedBy: 'patient',
      },
      { merge: true }
    );
  },

  /** Paciente optou por ir ao Personal sem gravar o plano gerado. */
  async markPatientPlanDismissed(patientId: string): Promise<void> {
    if (!patientId) throw new Error('patientId é obrigatório');
    const ref = doc(db, COL_AVALIACAO_ATIVIDADE_FISICA, patientId);
    await setDoc(
      ref,
      {
        patientPlanDismissedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        lastUpdatedBy: 'patient',
      },
      { merge: true }
    );
  },

  /**
   * @deprecated Preferir markPatientPlanCalendarCleared — zerar o marco reabria a revisão forçada.
   */
  async clearPatientPlanCalendar(patientId: string): Promise<void> {
    await this.markPatientPlanCalendarCleared({ patientId });
  },
};
