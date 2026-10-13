/**
 * Grava WorkoutPlanDraft no calendário Personal (trainingSessions),
 * mesmo contrato da aba Criar.
 *
 * Cada sessão do plano = uma série recorrente com título e recurrenceGroupId próprios.
 */

import { avaliacaoAtividadeFisicaService } from '@/services/avaliacaoAtividadeFisicaService';
import { trainingSessionService } from '@/services/trainingSessionService';
import { workoutPlanDraftService } from '@/services/workoutPlanDraftService';
import {
  buildMaterializedSessionsFromDraft,
  countMaterializedSessionDocs,
  getDraftWorkingPlan,
} from '@/lib/trainingEngine/materializeDraftToTrainingSessions';
import type { ReviewedWorkoutPlanDraft } from '@/types/reviewedWorkoutPlanDraft';

export const patientTrainingCalendarService = {
  async saveDraftToPersonalCalendar(params: {
    /** pacientes_completos id — avaliação / draft */
    assessmentPatientId: string;
    /** Auth UID — chave de trainingSessions (igual ao Criar) */
    sessionPatientId: string;
    userId: string;
    reviewed: ReviewedWorkoutPlanDraft;
    weeksCount?: number;
    titleOverrides?: Record<string | number, string>;
  }): Promise<{
    sessionCount: number;
    sessionIds: string[];
    recurrenceGroupIds: string[];
  }> {
    const {
      assessmentPatientId,
      sessionPatientId,
      userId,
      reviewed,
      weeksCount = 4,
      titleOverrides,
    } = params;

    if (!sessionPatientId) throw new Error('sessionPatientId é obrigatório.');
    if (!reviewed?.id) throw new Error('Draft sem id.');

    const draft = getDraftWorkingPlan(reviewed);
    if (!draft.sessions?.length) {
      throw new Error('O plano não tem sessões para gravar.');
    }

    const plans = buildMaterializedSessionsFromDraft({
      draft,
      weeksCount,
      titleOverrides,
    });
    const stamp = Date.now().toString(36);
    const sessionIds: string[] = [];
    const recurrenceGroupIds: string[] = [];

    for (const plan of plans) {
      // Um grupo por série nomeada (ex.: Superior seg+qui ≠ Inferior ter+sex).
      const safeKey = plan.seriesKey.replace(/[^a-zA-Z0-9_-]/g, '_');
      const recurrenceGroupId = `rec_plan_${reviewed.id}_${safeKey}_${stamp}`;
      recurrenceGroupIds.push(recurrenceGroupId);
      const multi = plan.dates.length > 1;

      for (const date of plan.dates) {
        const id = await trainingSessionService.createSessionWithExercises(
          {
            patientId: sessionPatientId,
            createdBy: 'patient',
            createdById: userId,
            scheduledDate: date,
            title: plan.title,
            status: 'scheduled',
            published: true,
            active: true,
            ...(multi ? { recurrenceGroupId } : {}),
          },
          plan.exercises
        );
        sessionIds.push(id);
      }
    }

    const now = new Date().toISOString();
    await workoutPlanDraftService.saveReviewed({
      ...reviewed,
      review: {
        ...reviewed.review,
        status: 'approved',
        reviewedBy: userId,
        reviewerRole: 'personal_trainer',
        approvedAt: now,
        notes: reviewed.review.notes || 'saved_to_personal_calendar',
      },
      updatedAt: now,
    });

    await avaliacaoAtividadeFisicaService.markPatientPlanCalendarSaved({
      patientId: assessmentPatientId,
      draftId: reviewed.id,
      sessionCount: sessionIds.length,
      recurrenceGroupIds,
      sessionIds,
    });

    return {
      sessionCount: countMaterializedSessionDocs(plans),
      sessionIds,
      recurrenceGroupIds,
    };
  },

  /**
   * True se ainda existe ao menos uma sessão do plano gerado no calendário.
   */
  async hasGeneratedSessionsRemaining(params: {
    sessionPatientId: string;
    recurrenceGroupIds?: string[] | null;
    sessionIds?: string[] | null;
  }): Promise<boolean> {
    const { sessionPatientId, recurrenceGroupIds, sessionIds } = params;
    if (!sessionPatientId) return false;

    const groups = Array.isArray(recurrenceGroupIds)
      ? recurrenceGroupIds.filter(Boolean)
      : [];
    const ids = Array.isArray(sessionIds) ? sessionIds.filter(Boolean) : [];

    if (groups.length === 0 && ids.length === 0) {
      // Legado sem IDs: considera “ainda existe” se houver qualquer sessão futura/agendada.
      const sessions = await trainingSessionService.getPatientSessions(sessionPatientId);
      return sessions.some((s) => s.status === 'scheduled' || s.status === 'done');
    }

    const sessions = await trainingSessionService.getPatientSessions(sessionPatientId);
    const groupSet = new Set(groups);
    const idSet = new Set(ids);
    return sessions.some(
      (s) =>
        (s.recurrenceGroupId && groupSet.has(s.recurrenceGroupId)) ||
        (s.id && idSet.has(s.id))
    );
  },
};
