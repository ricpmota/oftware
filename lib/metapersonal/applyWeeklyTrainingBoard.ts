/**
 * Publica o WeeklyBoard da Central no contrato operacional (trainingSessions).
 * Não cria collection nova. Um recurrenceGroupId por (paciente × card do board).
 */

import { trainingSessionService } from '@/services/trainingSessionService';
import {
  clonePrescriptionWithNewIds,
  sanitizeTrainerNote,
} from '@/lib/personal/workoutDraft';
import {
  templateExerciseGifUrl,
  validatePersonalWorkoutTemplate,
  type PersonalWorkoutTemplate,
} from '@/lib/personal/planosTreino';
import {
  normalizeTrainingExercisePrescription,
  serializeTrainingPrescription,
} from '@/lib/personal/trainingExerciseSeries';
import {
  clampTrainingWeeksCount,
  createRecurrenceGroupId,
  generateSessionDates,
  todayLocalYYYYMMDD,
} from '@/lib/personal/trainingRecurrence';
import {
  TREINOS_WEEKDAYS,
  pacienteDisplayName,
  type TreinosSelectedPatient,
  type TreinosWeekday,
  type TreinosWeeklyBoard,
} from '@/components/metapersonal/treinos/treinosCentral.types';
import { shouldNotifyPatientPublish } from '@/lib/metapersonal/treinosPlannerGroup';
import type { TrainingSession, TrainingSessionExercise } from '@/types/trainingSession';

/** Mesmo valor que handleCreateSession grava no Firestore (o tipo TS ainda diz `trainer`). */
const LIVE_CREATED_BY = 'personal_trainer' as TrainingSession['createdBy'];

export const TREINOS_WEEKDAY_TO_JS_DAY: Record<TreinosWeekday, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

export type WeeklyBoardCardPlan = {
  weekday: TreinosWeekday;
  localId: string;
  templateId: string;
  template: PersonalWorkoutTemplate;
};

export type WeeklyBoardPublishSeries = {
  patientId: string;
  pacienteDocId: string;
  patientName: string;
  weekday: TreinosWeekday;
  localId: string;
  template: PersonalWorkoutTemplate;
  dates: string[];
  recurrenceGroupId: string;
};

export type ApplyWeeklyBoardInput = {
  patients: TreinosSelectedPatient[];
  board: TreinosWeeklyBoard;
  startDate: string;
  weeksCount: number;
  createdById: string;
  /** YYYY-MM-DD local. Só para testes; no app usa o dia de hoje. */
  today?: string;
};

export type ApplyWeeklyBoardPreview = {
  patientCount: number;
  dayCount: number;
  cardCount: number;
  sessionCount: number;
  errors: string[];
};

export type ApplyPatientReport = {
  pacienteDocId: string;
  patientName: string;
  planned: number;
  created: number;
  status: 'success' | 'partial' | 'failed';
  error?: string;
};

export type ApplyWeeklyBoardResult = {
  ok: boolean;
  sessionCount: number;
  notifiedPacienteIds: string[];
  errors: string[];
  reports: ApplyPatientReport[];
};

export function flattenWeeklyBoardCards(board: TreinosWeeklyBoard): WeeklyBoardCardPlan[] {
  const cards: WeeklyBoardCardPlan[] = [];
  for (const weekday of TREINOS_WEEKDAYS) {
    for (const item of board[weekday]) {
      cards.push({
        weekday,
        localId: item.localId,
        templateId: item.templateId,
        template: item.template,
      });
    }
  }
  return cards;
}

export function datesForBoardWeekday(
  startDate: string,
  weeksCount: number,
  weekday: TreinosWeekday
): string[] {
  return generateSessionDates({
    startDate,
    sessionType: 'recurring',
    recurrenceFrequency: 'custom',
    weeksCount,
    selectedDaysOfWeek: [TREINOS_WEEKDAY_TO_JS_DAY[weekday]],
  });
}

function sessionPatientId(patient: TreinosSelectedPatient): string {
  return String(patient.paciente.userId || '').trim();
}

function weekdayLabel(weekday: TreinosWeekday): string {
  const labels: Record<TreinosWeekday, string> = {
    monday: 'segunda',
    tuesday: 'terça',
    wednesday: 'quarta',
    thursday: 'quinta',
    friday: 'sexta',
    saturday: 'sábado',
    sunday: 'domingo',
  };
  return labels[weekday];
}

function collectPublishErrors(input: ApplyWeeklyBoardInput): string[] {
  const cards = flattenWeeklyBoardCards(input.board);
  const errors: string[] = [];
  const startDate = String(input.startDate || '').trim();
  const today = /^\d{4}-\d{2}-\d{2}$/.test(String(input.today || ''))
    ? String(input.today)
    : todayLocalYYYYMMDD();

  if (input.patients.length === 0) {
    errors.push('Selecione pelo menos um paciente.');
  }
  if (cards.length === 0) {
    errors.push('Adicione pelo menos um treino no planejamento semanal.');
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
    errors.push('Informe a data de início.');
  } else if (startDate < today) {
    errors.push('A data de início não pode ser no passado.');
  }
  if (!String(input.createdById || '').trim()) {
    errors.push('Não foi possível identificar o personal trainer.');
  }

  for (const patient of input.patients) {
    if (!sessionPatientId(patient)) {
      errors.push(
        `${pacienteDisplayName(patient)} não possui userId válido e não pode receber o planejamento.`
      );
    }
  }

  for (const card of cards) {
    const check = validatePersonalWorkoutTemplate({
      nome: card.template.nome,
      exercicios: card.template.exercicios,
    });
    if (!check.ok) {
      errors.push(`“${card.template.nome}” (${weekdayLabel(card.weekday)}): ${check.message}`);
    }
  }

  return errors;
}

/**
 * Plano puro: uma série por (paciente × card). Mesmo template em dois dias = duas séries.
 * Se houver qualquer erro de validação, não devolve writes — publicação inteira aborta.
 */
export function buildWeeklyBoardPublishPlan(input: ApplyWeeklyBoardInput): {
  errors: string[];
  series: WeeklyBoardPublishSeries[];
} {
  const errors = collectPublishErrors(input);
  if (errors.length > 0) {
    return { errors, series: [] };
  }

  const weeksCount = clampTrainingWeeksCount(input.weeksCount);
  const cards = flattenWeeklyBoardCards(input.board);
  const series: WeeklyBoardPublishSeries[] = [];

  for (const patient of input.patients) {
    const patientId = sessionPatientId(patient);
    const pacienteDocId = String(patient.pacienteId || patient.paciente.id || '').trim();
    const patientName = pacienteDisplayName(patient);
    for (const card of cards) {
      const dates = datesForBoardWeekday(input.startDate, weeksCount, card.weekday);
      if (dates.length === 0) continue;
      series.push({
        patientId,
        pacienteDocId,
        patientName,
        weekday: card.weekday,
        localId: card.localId,
        template: card.template,
        dates,
        recurrenceGroupId: createRecurrenceGroupId('rec'),
      });
    }
  }

  return { errors: [], series };
}

export function previewWeeklyBoardApplication(input: ApplyWeeklyBoardInput): ApplyWeeklyBoardPreview {
  const plan = buildWeeklyBoardPublishPlan(input);
  const cards = flattenWeeklyBoardCards(input.board);
  const dayCount = TREINOS_WEEKDAYS.filter((day) => input.board[day].length > 0).length;
  return {
    patientCount: input.patients.length,
    dayCount,
    cardCount: cards.length,
    sessionCount: plan.series.reduce((sum, item) => sum + item.dates.length, 0),
    errors: plan.errors,
  };
}

export function exercisesFromTemplate(
  template: PersonalWorkoutTemplate
): Omit<TrainingSessionExercise, 'order'>[] {
  return [...(template.exercicios || [])]
    .sort((a, b) => a.order - b.order)
    .map((exercise) => {
      const exerciseId = String(exercise.exerciseId || '').trim();
      const cloned = clonePrescriptionWithNewIds(
        normalizeTrainingExercisePrescription(exercise.prescription)
      );
      const trainerNote = sanitizeTrainerNote(exercise.trainerNote);
      const gifUrl = templateExerciseGifUrl(exerciseId) || exercise.gifUrl;
      return {
        source: 'exercisedb' as const,
        exerciseId,
        name: exercise.name,
        bodyPart: exercise.bodyPart || '',
        target: exercise.target || '',
        equipment: exercise.equipment || '',
        prescription: serializeTrainingPrescription(cloned),
        ...(gifUrl ? { gifUrl } : {}),
        ...(trainerNote ? { trainerNote } : {}),
      };
    });
}

export async function applyWeeklyBoardToTrainingSessions(
  input: ApplyWeeklyBoardInput,
  options?: {
    onProgress?: (done: number, total: number) => void;
    onPatientPublished?: (pacienteDocId: string) => void;
  }
): Promise<ApplyWeeklyBoardResult> {
  const plan = buildWeeklyBoardPublishPlan(input);
  if (plan.errors.length > 0) {
    return {
      ok: false,
      sessionCount: 0,
      notifiedPacienteIds: [],
      errors: plan.errors,
      reports: [],
    };
  }

  const byPatient = new Map<string, WeeklyBoardPublishSeries[]>();
  for (const series of plan.series) {
    const key = series.pacienteDocId || series.patientId;
    const list = byPatient.get(key) || [];
    list.push(series);
    byPatient.set(key, list);
  }

  const reports: ApplyPatientReport[] = [];
  const notifiedPacienteIds: string[] = [];
  let sessionCount = 0;
  const total = plan.series.reduce((sum, item) => sum + item.dates.length, 0);

  for (const seriesList of byPatient.values()) {
    const first = seriesList[0];
    const planned = seriesList.reduce((sum, item) => sum + item.dates.length, 0);
    let created = 0;
    let failedError: string | undefined;
    let stopPatient = false;
    for (const series of seriesList) {
      for (const scheduledDate of series.dates) {
        try {
          await trainingSessionService.createSessionWithExercises(
            {
              patientId: series.patientId,
              createdBy: LIVE_CREATED_BY,
              createdById: input.createdById,
              scheduledDate,
              title: series.template.nome,
              status: 'scheduled',
              published: true,
              active: true,
              recurrenceGroupId: series.recurrenceGroupId,
            },
            exercisesFromTemplate(series.template)
          );
          created += 1;
          sessionCount += 1;
          options?.onProgress?.(sessionCount, total);
        } catch (error) {
          failedError = `Falha ao publicar “${series.template.nome}” em ${scheduledDate}. ${
            error instanceof Error ? error.message : ''
          }`.trim();
          stopPatient = true;
          break;
        }
      }
      if (stopPatient) break;
    }

    const status: ApplyPatientReport['status'] =
      created <= 0 ? 'failed' : created < planned ? 'partial' : 'success';
    const report: ApplyPatientReport = {
      pacienteDocId: first.pacienteDocId,
      patientName: first.patientName,
      planned,
      created,
      status,
      ...(failedError ? { error: failedError } : {}),
    };
    reports.push(report);
    if (shouldNotifyPatientPublish(created) && first.pacienteDocId) {
      options?.onPatientPublished?.(first.pacienteDocId);
      notifiedPacienteIds.push(first.pacienteDocId);
    }
  }

  const ok = reports.length > 0 && reports.every((item) => item.status === 'success');
  return {
    ok,
    sessionCount,
    notifiedPacienteIds,
    errors: reports
      .filter((item) => item.status !== 'success')
      .map((item) =>
        item.error
          ? `${item.patientName}: ${item.error}`
          : `${item.patientName}: ${item.created}/${item.planned}`
      ),
    reports,
  };
}
