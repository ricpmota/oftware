/**
 * Motor determinístico — monta WorkoutPlanDraft (não publicado).
 */

import { buildWeeklyStructure } from '@/lib/trainingEngine/buildWeeklyStructure';
import { evaluateExerciseCompatibility } from '@/lib/trainingEngine/evaluateCompatibility';
import { normalizeExerciseCatalog } from '@/lib/trainingEngine/normalizeExercise';
import { selectExerciseForSlot } from '@/lib/trainingEngine/selectExerciseForSlot';
import { UNSUPPORTED_MODALITIES } from '@/lib/trainingEngine/scoringConstants';
import { validateWorkoutPlanDraft } from '@/lib/trainingEngine/validateWorkoutPlanDraft';
import { validateTrainingPersonalizationIndex } from '@/lib/avaliacaoAtividadeFisica/validateTrainingPersonalizationIndex';
import type { Exercise } from '@/types/exercise';
import type { TrainingPersonalizationIndex } from '@/types/trainingPersonalizationIndex';
import type {
  ExerciseCompatibilityResult,
  NormalizedExercise,
  SelectedWorkoutExercise,
  WorkoutCardioBlock,
  WorkoutPlanDraft,
  WorkoutPlanDraftSession,
} from '@/types/workoutPlanDraft';
import { TRAINING_ENGINE_VERSION as ENGINE_VERSION } from '@/types/workoutPlanDraft';

function emptyDiagnostics(total = 0) {
  return {
    totalExercises: total,
    normalizedExercises: 0,
    eligibleExercises: 0,
    excludedExercises: 0,
    missingSlots: [] as string[],
  };
}

function baseDraft(params: {
  index: TrainingPersonalizationIndex;
  patientId?: string;
  status: WorkoutPlanDraft['status'];
  diagnostics?: WorkoutPlanDraft['catalogDiagnostics'];
  sessions?: WorkoutPlanDraftSession[];
  extraWarnings?: string[];
  splitStrategy?: string;
}): WorkoutPlanDraft {
  const { index } = params;
  const draft: WorkoutPlanDraft = {
    version: 1,
    status: params.status,
    source: {
      patientId: params.patientId || index.source.assessmentId || '',
      assessmentId: index.source.assessmentId || '',
      personalizationIndexVersion: index.version,
      engineVersion: ENGINE_VERSION,
      generatedAt: null,
    },
    eligibility: {
      generationAllowed: index.eligibility.generationAllowed,
      blockers: [...index.eligibility.blockers],
      warnings: [
        ...index.eligibility.warnings,
        ...(params.extraWarnings || []),
      ],
    },
    structure: {
      weeklyFrequency: index.routine.weeklyFrequency || 0,
      splitStrategy:
        params.splitStrategy ||
        index.generationParameters.recommendedSplitStrategy ||
        'unknown',
      sessionDurationMinutes: index.routine.sessionDurationMinutes || 0,
    },
    sessions: params.sessions || [],
    catalogDiagnostics: params.diagnostics || emptyDiagnostics(),
    validation: { valid: false, errors: [], warnings: [] },
  };
  draft.validation = validateWorkoutPlanDraft(draft);
  return draft;
}

function isUnsupportedProfile(index: TrainingPersonalizationIndex): boolean {
  const strategy = index.goals.priorityStrategy;
  if (strategy === 'mobility_bias') {
    // só suportamos se houver catálogo de mobility; marcado depois se insuficiente
  }
  const modalities = index.trainingPreferences.preferredModalities || [];
  const strengthLike = modalities.some((m) =>
    ['machines', 'free_weights', 'bodyweight', 'functional', 'no_preference'].includes(m)
  );
  const onlyUnsupported =
    modalities.length > 0 &&
    modalities.every((m) => UNSUPPORTED_MODALITIES.has(m) || m === 'pilates');
  if (onlyUnsupported && !strengthLike) return true;
  return false;
}

function buildCardioBlock(
  index: TrainingPersonalizationIndex
): WorkoutCardioBlock | null {
  if (index.constraints.requiresCardiorespiratoryCaution) return null;
  const pref = index.trainingPreferences.cardioPreference;
  if (pref === 'dislike') return null;
  const min = index.generationParameters.cardioDurationMinutesMin;
  const max = index.generationParameters.cardioDurationMinutesMax;
  if (min == null || max == null || max <= 0) return null;

  const activities = index.trainingPreferences.preferredCardioActivities || [];
  let activityCode = 'general_cardio';
  if (activities.includes('walk') || activities.includes('walking')) activityCode = 'walk';
  else if (activities.includes('bike') || activities.includes('cycling')) activityCode = 'bike';
  else if (activities.includes('run') || activities.includes('running')) activityCode = 'run';
  else if (activities.includes('elliptical')) activityCode = 'elliptical';

  const duration = Math.round((min + max) / 2);
  return {
    activityCode,
    durationMinutes: duration,
    intensity: {
      rpeMin: index.generationParameters.targetRpeMin ?? 4,
      rpeMax: Math.min(index.generationParameters.targetRpeMax ?? 6, 6),
    },
  };
}

export function buildDeterministicWorkoutPlan(params: {
  index: TrainingPersonalizationIndex;
  exercises: Exercise[];
  patientId?: string;
}): WorkoutPlanDraft {
  const { index, exercises } = params;
  const indexValidation = validateTrainingPersonalizationIndex(index);
  const extraWarnings = [...indexValidation.warnings];
  if (!indexValidation.valid) {
    extraWarnings.push(...indexValidation.errors.map((e) => `index_invalid:${e}`));
  }

  if (!index.eligibility.generationAllowed) {
    return baseDraft({
      index,
      patientId: params.patientId,
      status: 'blocked',
      diagnostics: emptyDiagnostics(exercises.length),
      sessions: [],
      extraWarnings,
    });
  }

  if (isUnsupportedProfile(index)) {
    return baseDraft({
      index,
      patientId: params.patientId,
      status: 'unsupported_profile',
      diagnostics: emptyDiagnostics(exercises.length),
      sessions: [],
      extraWarnings: [...extraWarnings, 'unsupported_modality_or_goal'],
    });
  }

  const structure = buildWeeklyStructure(index);
  if (structure.unsupportedSplit) {
    return baseDraft({
      index,
      patientId: params.patientId,
      status: 'unsupported_split',
      diagnostics: emptyDiagnostics(exercises.length),
      sessions: [],
      splitStrategy: structure.splitStrategy,
      extraWarnings: [...extraWarnings, ...structure.warnings],
    });
  }

  if (index.goals.priorityStrategy === 'mobility_bias') {
    const normalizedPeek = normalizeExerciseCatalog(exercises);
    const mobilityCount = normalizedPeek.filter((e) => e.exerciseType === 'mobility').length;
    if (mobilityCount < 3) {
      return baseDraft({
        index,
        patientId: params.patientId,
        status: 'unsupported_profile',
        diagnostics: {
          totalExercises: exercises.length,
          normalizedExercises: normalizedPeek.length,
          eligibleExercises: 0,
          excludedExercises: 0,
          missingSlots: ['mobility_catalog_gap'],
        },
        sessions: [],
        extraWarnings: [...extraWarnings, 'unsupported_goal_or_catalog_gap'],
      });
    }
  }

  const normalized = normalizeExerciseCatalog(exercises);
  const compatibilityById = new Map<string, ExerciseCompatibilityResult>();
  const eligible: NormalizedExercise[] = [];
  let excluded = 0;

  for (const ex of normalized) {
    const compat = evaluateExerciseCompatibility(ex, index);
    compatibilityById.set(ex.id, compat);
    if (compat.eligible) eligible.push(ex);
    else excluded += 1;
  }

  const strengthCandidates = eligible.filter(
    (e) => e.exerciseType === 'strength' || e.exerciseType === 'other'
  );

  const cardioBlock = buildCardioBlock(index);
  const missingSlots: string[] = [];
  const sessions: WorkoutPlanDraftSession[] = [];
  let requiredMissing = 0;
  let requiredTotal = 0;

  for (const day of structure.templates) {
    const selectedNorm: NormalizedExercise[] = [];
    const selectedExercises: SelectedWorkoutExercise[] = [];
    const missingRequired: string[] = [];

    // Limitar slots à faixa do índice
    const maxEx = index.generationParameters.maxExercisesPerSession ?? 8;
    const minEx = index.generationParameters.minExercisesPerSession ?? 3;
    const slots = day.exerciseSlots.slice(0, maxEx);

    for (const slot of slots) {
      if (slot.role === 'cardio' || slot.role === 'warmup' || slot.role === 'mobility') {
        continue;
      }
      if (slot.required) requiredTotal += 1;

      const result = selectExerciseForSlot({
        slot,
        candidates: strengthCandidates,
        compatibilityById,
        index,
        alreadySelected: selectedNorm,
      });

      if (result.ok) {
        selectedNorm.push(result.normalized);
        selectedExercises.push(result.exercise);
      } else if (slot.required) {
        missingRequired.push(slot.slotId);
        missingSlots.push(`${day.focus}:${slot.slotId}`);
        requiredMissing += 1;
      }
    }

    // Garante pelo menos minEx quando possível (já limitado pelos slots)
    if (selectedExercises.length < minEx && missingRequired.length === 0) {
      // soft warning apenas
      extraWarnings.push(`session_${day.dayIndex}_below_min_exercises`);
    }

    sessions.push({
      dayIndex: day.dayIndex,
      weekday: day.weekday,
      title: day.weekday
        ? `Sessão ${day.focus} (${day.weekday})`
        : `Sessão ${day.dayIndex + 1} — ${day.focus}`,
      focus: day.focus,
      warmup: {
        durationMinutes: 5,
        notesCode: 'general_dynamic_warmup',
      },
      exercises: selectedExercises,
      cardio: cardioBlock,
      missingRequiredSlots: missingRequired,
    });
  }

  const diagnostics = {
    totalExercises: exercises.length,
    normalizedExercises: normalized.length,
    eligibleExercises: eligible.length,
    excludedExercises: excluded,
    missingSlots,
  };

  const missingRatio = requiredTotal > 0 ? requiredMissing / requiredTotal : 0;
  let status: WorkoutPlanDraft['status'] = 'generated';
  if (requiredMissing > 0 && (missingRatio >= 0.4 || requiredMissing >= 3)) {
    status = 'insufficient_catalog';
  }

  const draft = baseDraft({
    index,
    patientId: params.patientId,
    status,
    diagnostics,
    sessions,
    splitStrategy: structure.splitStrategy,
    extraWarnings: [...extraWarnings, ...structure.warnings],
  });

  return draft;
}
