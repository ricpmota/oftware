/**
 * Publica um treino salvo da Central como trainingSessions reais.
 * Um recurrenceGroupId por paciente. Não grava templateId na sessão.
 * Não altera planos_treino. Não copia exerciseGymMedia.
 */

import { trainingSessionService } from '@/services/trainingSessionService';
import {
  TREINOS_WEEKDAY_TO_JS_DAY,
  exercisesFromTemplate,
  type ApplyPatientReport,
  type ApplyWeeklyBoardResult,
} from '@/lib/metapersonal/applyWeeklyTrainingBoard';
import {
  endDateFromWeeks,
  generateScheduleDates,
  normalizeScheduleConfig,
  type WorkoutScheduleConfig,
} from '@/lib/metapersonal/bulkWorkoutSchedule';
import { shouldNotifyPatientPublish } from '@/lib/metapersonal/treinosPlannerGroup';
import {
  pacienteDisplayName,
  type TreinosSelectedPatient,
  type TreinosWeekday,
} from '@/components/metapersonal/treinos/treinosCentral.types';
import {
  TRAINING_RECURRENCE_DEFAULT_WEEKS,
  createRecurrenceGroupId,
  todayLocalYYYYMMDD,
} from '@/lib/personal/trainingRecurrence';
import { validatePersonalWorkoutTemplate, type PersonalWorkoutTemplate } from '@/lib/personal/planosTreino';
import type { TrainingSession, TrainingSessionExercise } from '@/types/trainingSession';

const LIVE_CREATED_BY = 'personal_trainer' as TrainingSession['createdBy'];

export type PublishTemplateScheduleInput = {
  patients: TreinosSelectedPatient[];
  template: PersonalWorkoutTemplate;
  schedule: WorkoutScheduleConfig;
  createdById: string;
  today?: string;
};

export type TemplateScheduleSeries = {
  patientId: string;
  pacienteDocId: string;
  patientName: string;
  dates: string[];
  recurrenceGroupId: string;
};

export type ExistingProgramDate = {
  pacienteId: string;
  title: string;
  scheduledDate: string;
};

export type TemplateScheduleWriters = {
  createSessionWithExercises: (
    session: Omit<TrainingSession, 'id' | 'createdAt' | 'updatedAt'>,
    exercises: Omit<TrainingSessionExercise, 'order'>[]
  ) => Promise<string>;
};

function sessionPatientId(patient: TreinosSelectedPatient): string {
  return String(patient.paciente.userId || '').trim();
}

export function defaultProgramStartDate(clickedDate: string | undefined, today: string): string {
  const day = String(clickedDate || '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(day) && day >= today) return day;
  return today;
}

export function initialProgramSchedule(input: {
  weekday: TreinosWeekday;
  weekdayDate?: string;
  today?: string;
}): WorkoutScheduleConfig {
  const today = /^\d{4}-\d{2}-\d{2}$/.test(String(input.today || ''))
    ? String(input.today)
    : todayLocalYYYYMMDD();
  const startDate = defaultProgramStartDate(input.weekdayDate, today);
  const weeksCount = TRAINING_RECURRENCE_DEFAULT_WEEKS;
  return normalizeScheduleConfig({
    selectedDaysOfWeek: [TREINOS_WEEKDAY_TO_JS_DAY[input.weekday]],
    startDate,
    weeksCount,
    endDate: endDateFromWeeks(startDate, weeksCount),
  });
}

export function coincidingProgramDates(
  patients: Array<{ pacienteId: string; name: string }>,
  title: string,
  dates: string[],
  existing: ExistingProgramDate[]
): Array<{ pacienteId: string; name: string; dates: string[] }> {
  const wantedTitle = String(title || '').trim().toLowerCase();
  const dateSet = new Set(dates);
  const hits: Array<{ pacienteId: string; name: string; dates: string[] }> = [];
  for (const patient of patients) {
    const match = existing
      .filter(
        (item) =>
          item.pacienteId === patient.pacienteId &&
          String(item.title || '').trim().toLowerCase() === wantedTitle &&
          dateSet.has(item.scheduledDate)
      )
      .map((item) => item.scheduledDate);
    const unique = Array.from(new Set(match)).sort();
    if (unique.length) hits.push({ ...patient, dates: unique });
  }
  return hits;
}

export function collectTemplateScheduleErrors(input: PublishTemplateScheduleInput): string[] {
  const errors: string[] = [];
  const today = /^\d{4}-\d{2}-\d{2}$/.test(String(input.today || ''))
    ? String(input.today)
    : todayLocalYYYYMMDD();
  const schedule = normalizeScheduleConfig(input.schedule || ({} as WorkoutScheduleConfig));
  const startDate = schedule.startDate;
  const endDate = schedule.endDate;

  if (input.patients.length === 0) {
    errors.push('Selecione pelo menos um paciente para programar este treino.');
  }
  if (!String(input.createdById || '').trim()) {
    errors.push('Não foi possível identificar o personal trainer.');
  }
  if (!schedule.selectedDaysOfWeek.length) {
    errors.push('Selecione pelo menos um dia da semana.');
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
    errors.push('Informe a data de início.');
  } else if (startDate < today) {
    errors.push('A data de início não pode ser no passado.');
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
    errors.push('Informe a data final.');
  } else if (/^\d{4}-\d{2}-\d{2}$/.test(startDate) && endDate < startDate) {
    errors.push('A data final não pode ser anterior ao início.');
  }
  if (!schedule.weeksCount || schedule.weeksCount < 1) {
    errors.push('Informe a duração em semanas.');
  }

  for (const patient of input.patients) {
    if (!sessionPatientId(patient)) {
      errors.push(
        `${pacienteDisplayName(patient)} não possui userId válido e não pode receber o treino.`
      );
    }
  }

  const template = input.template;
  if (!template || !String(template.nome || '').trim()) {
    errors.push('Treino inválido.');
  } else {
    const check = validatePersonalWorkoutTemplate({
      nome: template.nome,
      exercicios: template.exercicios,
    });
    if (!check.ok) errors.push(`“${template.nome}”: ${check.message}`);
  }

  if (errors.length === 0 && generateScheduleDates(schedule).length === 0) {
    errors.push('Nenhuma data de sessão foi gerada para este agendamento.');
  }

  return errors;
}

export function buildTemplateSchedulePublishPlan(input: PublishTemplateScheduleInput): {
  errors: string[];
  schedule: WorkoutScheduleConfig;
  dates: string[];
  series: TemplateScheduleSeries[];
} {
  const schedule = normalizeScheduleConfig(input.schedule);
  const errors = collectTemplateScheduleErrors({ ...input, schedule });
  if (errors.length > 0) {
    return { errors, schedule, dates: [], series: [] };
  }
  const dates = generateScheduleDates(schedule);
  const series = input.patients.map((patient) => ({
    patientId: sessionPatientId(patient),
    pacienteDocId: String(patient.pacienteId || patient.paciente.id || '').trim(),
    patientName: pacienteDisplayName(patient),
    dates: [...dates],
    recurrenceGroupId: createRecurrenceGroupId('rec'),
  }));
  return { errors: [], schedule, dates, series };
}

export function previewTemplateSchedulePublish(input: PublishTemplateScheduleInput): {
  patientCount: number;
  dayCount: number;
  sessionCount: number;
  dates: string[];
  errors: string[];
} {
  const plan = buildTemplateSchedulePublishPlan(input);
  return {
    patientCount: input.patients.length,
    dayCount: plan.schedule.selectedDaysOfWeek.length,
    sessionCount: plan.series.reduce((sum, item) => sum + item.dates.length, 0),
    dates: plan.dates,
    errors: plan.errors,
  };
}

export async function publishTemplateSchedule(
  input: PublishTemplateScheduleInput,
  options?: {
    writers?: TemplateScheduleWriters;
    onProgress?: (done: number, total: number) => void;
    onPatientPublished?: (pacienteDocId: string) => void;
  }
): Promise<ApplyWeeklyBoardResult> {
  const plan = buildTemplateSchedulePublishPlan(input);
  if (plan.errors.length > 0) {
    return {
      ok: false,
      sessionCount: 0,
      notifiedPacienteIds: [],
      errors: plan.errors,
      reports: [],
    };
  }

  const writers = options?.writers || {
    createSessionWithExercises: (session, exercises) =>
      trainingSessionService.createSessionWithExercises(session, exercises),
  };
  const exercises = exercisesFromTemplate(input.template);
  const reports: ApplyPatientReport[] = [];
  const notifiedPacienteIds: string[] = [];
  let sessionCount = 0;
  const total = plan.series.reduce((sum, item) => sum + item.dates.length, 0);

  for (const series of plan.series) {
    let created = 0;
    let failedError: string | undefined;
    for (const scheduledDate of series.dates) {
      try {
        await writers.createSessionWithExercises(
          {
            patientId: series.patientId,
            createdBy: LIVE_CREATED_BY,
            createdById: input.createdById,
            scheduledDate,
            title: input.template.nome,
            status: 'scheduled',
            published: true,
            active: true,
            recurrenceGroupId: series.recurrenceGroupId,
          },
          exercises
        );
        created += 1;
        sessionCount += 1;
        options?.onProgress?.(sessionCount, total);
      } catch (error) {
        failedError = `Falha ao publicar “${input.template.nome}” em ${scheduledDate}. ${
          error instanceof Error ? error.message : ''
        }`.trim();
        break;
      }
    }
    const planned = series.dates.length;
    const status: ApplyPatientReport['status'] =
      created <= 0 ? 'failed' : created < planned ? 'partial' : 'success';
    reports.push({
      pacienteDocId: series.pacienteDocId,
      patientName: series.patientName,
      planned,
      created,
      status,
      ...(failedError ? { error: failedError } : {}),
    });
    if (shouldNotifyPatientPublish(created) && series.pacienteDocId) {
      options?.onPatientPublished?.(series.pacienteDocId);
      notifiedPacienteIds.push(series.pacienteDocId);
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
