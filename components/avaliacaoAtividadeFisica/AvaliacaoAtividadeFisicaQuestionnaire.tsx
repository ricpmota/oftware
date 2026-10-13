'use client';

import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, Loader2 } from 'lucide-react';
import {
  BARRIER_NONE_VALUE,
  BARRIER_OPTIONS,
  BALANCE_FALL_OPTIONS,
  BODY_PRIORITY_FULL_BODY,
  BODY_PRIORITY_OPTIONS,
  BP_ADVICE_OPTIONS,
  CARDIO_ACTIVITY_OPTIONS,
  CARDIO_PREFERENCE_OPTIONS,
  CHEST_SYMPTOM_OPTIONS,
  CURRENT_ACTIVITY_OPTIONS,
  CURRENT_PAIN_OPTIONS,
  DIZZINESS_OPTIONS,
  DURATION_CONSISTENCY_OPTIONS,
  DURATION_OPTIONS,
  ENVIRONMENT_NOISE_OPTIONS,
  EQUIPMENT_ACCESS_OPTIONS,
  EQUIPMENT_NONE,
  EQUIPMENT_OPTIONS,
  EQUIPMENT_UNKNOWN,
  EXPERIENCE_OPTIONS,
  FLOOR_EXERCISE_OPTIONS,
  GYM_AREA_OPTIONS,
  GYM_AREA_UNKNOWN,
  GYM_STRUCTURE_OPTIONS,
  HOME_SPACE_OPTIONS,
  INJURY_LIMITS_OPTIONS,
  INJURY_STATUS_OPTIONS,
  INTENSITY_OPTIONS,
  MODALITY_NO_PREFERENCE,
  MODALITY_OPTIONS,
  MOVEMENT_LIMITATION_NONE,
  MOVEMENT_LIMITATION_OPTIONS,
  OUTDOOR_SPACE_OPTIONS,
  PAIN_IMPACT_OPTIONS,
  PAIN_REGION_OPTIONS,
  PAIN_TRIGGER_OPTIONS,
  PALPITATION_OPTIONS,
  PRIMARY_GOAL_OPTIONS,
  PROFESSIONAL_RESTRICTION_OPTIONS,
  SAFETY_CONFIRMATION_OPTIONS,
  SECONDARY_NONE_VALUE,
  SHORTNESS_OF_BREATH_OPTIONS,
  STEP_META,
  SURGERY_STATUS_OPTIONS,
  SURGERY_TIMING_OPTIONS,
  TRAINING_LOCATION_OPTIONS,
  TRAINING_PERIOD_OPTIONS,
  WEEKDAY_OPTIONS,
  bodyPriorityLabel,
  firstNameFromFullName,
  getReviewBlockEntryStep,
  getReviewBlockSteps,
  getVisibleSteps,
  progressPercentForStep,
  validateStep,
  type AvaliacaoReviewEditBlock,
  type AvaliacaoStepId,
} from '@/lib/avaliacaoAtividadeFisica/questionsBasic';
import {
  buildSafetyAssessment,
  needsReinforcedSafetyMessage,
} from '@/lib/avaliacaoAtividadeFisica/buildSafetyAssessment';
import { AvaliacaoAtividadeFisicaReview } from '@/components/avaliacaoAtividadeFisica/AvaliacaoAtividadeFisicaReview';
import { avaliacaoAtividadeFisicaService } from '@/services/avaliacaoAtividadeFisicaService';
import {
  AVALIACAO_BASIC_COMPLETE_STEP,
  AVALIACAO_ENVIRONMENT_COMPLETE_STEP,
  AVALIACAO_SAFETY_COMPLETE_STEP,
  AVALIACAO_TRAINING_PROFILE_COMPLETE_STEP,
  type AvaliacaoAtividadeFisica,
  type AvaliacaoAtividadeFisicaBasicAnswers,
  type AvaliacaoAtividadeFisicaSafety,
} from '@/types/avaliacaoAtividadeFisica';
import { ChoiceButton, inputClassName } from '@/components/whitelabel/cadastroMedico/CadastroMedicoFormUi';

/** Onde o questionário lê e grava a avaliação (app logado ou link público). */
export type AvaliacaoAtividadeFisicaPersistence = Pick<
  typeof avaliacaoAtividadeFisicaService,
  'getByPatientId' | 'createDraft' | 'saveStep' | 'completeAssessment'
>;

export type AvaliacaoAtividadeFisicaQuestionnaireProps = {
  patientId: string;
  userId: string;
  patientFullName?: string | null;
  initialAssessment: AvaliacaoAtividadeFisica | null;
  /** Chamado após conclusão definitiva (status completed). */
  onAssessmentComplete: () => void;
  /** Volta para a página inicial do Meta sem concluir a avaliação. */
  onDefer?: () => void;
  /** Default: Firestore do paciente logado. */
  persistence?: AvaliacaoAtividadeFisicaPersistence;
  /** Texto do botão na tela de sucesso. */
  completeButtonLabel?: string;
  /** Profissional abre a anamnese respondida e salva sem o fluxo do paciente. */
  audience?: 'patient' | 'professional';
  /** Dentro de um modal: fundo branco, sem altura de página. */
  embedded?: boolean;
};

type Screen =
  | 'welcome'
  | 'resume'
  | 'steps'
  | 'final_review'
  | 'completion_confirmation'
  | 'success';

const MILESTONE_STEPS = new Set([
  AVALIACAO_BASIC_COMPLETE_STEP,
  AVALIACAO_TRAINING_PROFILE_COMPLETE_STEP,
  AVALIACAO_ENVIRONMENT_COMPLETE_STEP,
  AVALIACAO_SAFETY_COMPLETE_STEP,
]);

function resolveInitialStep(
  savedStep: string | null | undefined,
  answers: AvaliacaoAtividadeFisicaBasicAnswers
): AvaliacaoStepId {
  // Marcos legados (Etapas 03–06): retomar no próximo bloco real — nunca em STEP_META.
  if (savedStep === AVALIACAO_BASIC_COMPLETE_STEP) {
    return 'body_priorities';
  }
  if (savedStep === AVALIACAO_TRAINING_PROFILE_COMPLETE_STEP) {
    return 'environment_overview';
  }
  if (savedStep === AVALIACAO_ENVIRONMENT_COMPLETE_STEP) {
    return 'safety_overview';
  }
  if (savedStep === AVALIACAO_SAFETY_COMPLETE_STEP || savedStep === 'final_review') {
    return 'final_review';
  }
  if (savedStep === 'completion_confirmation') {
    return 'completion_confirmation';
  }
  if (!savedStep) {
    return 'primary_goal';
  }
  if (STEP_META[savedStep as AvaliacaoStepId]) {
    const visible = getVisibleSteps(answers);
    if (visible.includes(savedStep as AvaliacaoStepId)) {
      return savedStep as AvaliacaoStepId;
    }
    const envish = [
      'environment_overview',
      'gym_structure',
      'gym_areas',
      'home_space',
      'available_equipment',
      'equipment_access',
      'outdoor_spaces',
      'floor_exercises',
      'environment_noise',
      'environment_notes',
    ];
    if (envish.includes(String(savedStep))) {
      return 'environment_overview';
    }
    if (
      String(savedStep).startsWith('safety') ||
      String(savedStep).includes('pain') ||
      String(savedStep).includes('injury') ||
      String(savedStep).includes('surgery') ||
      String(savedStep).includes('chest') ||
      String(savedStep).includes('breath') ||
      String(savedStep).includes('dizziness') ||
      String(savedStep).includes('palpitation') ||
      String(savedStep).includes('balance') ||
      String(savedStep).includes('blood') ||
      String(savedStep).includes('professional') ||
      String(savedStep).includes('movement_limitation')
    ) {
      return 'safety_overview';
    }
    // Step condicional sumiu (ex.: cardio_activities): avançar ao próximo visível.
    const basic = getVisibleSteps(answers);
    const approxIdx = Object.keys(STEP_META).indexOf(savedStep);
    if (approxIdx >= 0) {
      const next = basic.find((s) => Object.keys(STEP_META).indexOf(s) > approxIdx);
      if (next) return next;
    }
  }
  return 'primary_goal';
}

function ChoiceList({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string }[];
  value: string | null | undefined;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-2.5">
      {options.map((opt) => (
        <ChoiceButton key={opt.value} selected={value === opt.value} onClick={() => onChange(opt.value)}>
          {opt.label}
        </ChoiceButton>
      ))}
    </div>
  );
}

function MultiChoiceList({
  options,
  values,
  onToggle,
  disabledValues,
  priorityBadges,
}: {
  options: { value: string; label: string }[];
  values: string[];
  onToggle: (v: string) => void;
  disabledValues?: string[];
  priorityBadges?: boolean;
}) {
  return (
    <div className="space-y-2.5">
      {options.map((opt) => {
        const disabled = disabledValues?.includes(opt.value);
        const selected = values.includes(opt.value);
        const rank = priorityBadges && selected ? values.indexOf(opt.value) + 1 : null;
        return (
          <button
            key={opt.value}
            type="button"
            disabled={disabled}
            onClick={() => onToggle(opt.value)}
            className={`w-full text-left px-4 py-3.5 rounded-xl border text-sm sm:text-base transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-between gap-3 ${
              selected
                ? 'border-emerald-500 bg-emerald-50 text-emerald-900 shadow-sm ring-1 ring-emerald-500/30'
                : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
            }`}
          >
            <span>{opt.label}</span>
            {rank != null && (
              <span className="shrink-0 text-xs font-semibold uppercase tracking-wide text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-md">
                {rank === 1 ? '1ª prioridade' : rank === 2 ? '2ª prioridade' : '3ª prioridade'}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function AvaliacaoAtividadeFisicaQuestionnaire({
  patientId,
  userId,
  patientFullName,
  initialAssessment,
  onAssessmentComplete,
  onDefer,
  persistence = avaliacaoAtividadeFisicaService,
  completeButtonLabel = 'Continuar para o treino',
  audience = 'patient',
  embedded = false,
}: AvaliacaoAtividadeFisicaQuestionnaireProps) {
  const firstName = firstNameFromFullName(patientFullName);

  const initialAnswers = initialAssessment?.answers || {};
  const savedStep = initialAssessment?.currentStep;

  const isAlreadyCompleted = initialAssessment?.status === 'completed';

  const startsAtReview =
    savedStep === AVALIACAO_SAFETY_COMPLETE_STEP ||
    savedStep === 'final_review' ||
    savedStep === 'completion_confirmation';

  const hasExistingDraft =
    !!initialAssessment &&
    initialAssessment.status !== 'completed' &&
    !startsAtReview;

  const hasProgress =
    hasExistingDraft &&
    (Object.keys(initialAnswers).length > 0 ||
      Boolean(savedStep && savedStep !== 'primary_goal') ||
      MILESTONE_STEPS.has(String(savedStep || '')));

  const [screen, setScreen] = useState<Screen>(() => {
    if (audience === 'professional') {
      if (!initialAssessment) return 'welcome';
      if (isAlreadyCompleted) return 'final_review';
      if (hasProgress || hasExistingDraft) return 'resume';
      return 'welcome';
    }
    if (!initialAssessment) return 'welcome';
    if (isAlreadyCompleted) return 'success';
    if (savedStep === 'completion_confirmation') return 'completion_confirmation';
    if (startsAtReview) return 'final_review';
    // Marcos legados: ir direto aos steps do próximo bloco (evita ficar preso só na capa).
    if (MILESTONE_STEPS.has(String(savedStep || ''))) return 'steps';
    if (hasProgress) return 'resume';
    if (hasExistingDraft) return 'resume';
    return 'welcome';
  });

  const [answers, setAnswers] = useState<AvaliacaoAtividadeFisicaBasicAnswers>(initialAnswers);
  const [stepId, setStepId] = useState<AvaliacaoStepId>(() =>
    resolveInitialStep(savedStep, initialAnswers)
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [bootstrapping, setBootstrapping] = useState(false);
  const [safetyConfirmChoice, setSafetyConfirmChoice] = useState<'confirmed' | 'review' | null>(
    null
  );
  const [completedSafety, setCompletedSafety] = useState<AvaliacaoAtividadeFisicaSafety | null>(
    () => buildSafetyAssessment(initialAnswers)
  );
  const [reviewBlock, setReviewBlock] = useState<AvaliacaoReviewEditBlock | null>(null);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);
  const [finalConfirmChecked, setFinalConfirmChecked] = useState(
    Boolean(initialAnswers.finalConfirmationAccepted)
  );

  const visibleSteps = useMemo(() => getVisibleSteps(answers), [answers]);
  const stepIndex = Math.max(0, visibleSteps.indexOf(stepId));
  const progress = progressPercentForStep(stepId, answers);
  const meta = STEP_META[stepId];

  // Evita tela em branco se stepId for marco legado ou id inválido.
  useEffect(() => {
    if (screen !== 'steps') return;
    if (STEP_META[stepId]) return;
    const fixed = resolveInitialStep(stepId, answers);
    setStepId(fixed);
    if (fixed === 'final_review') setScreen('final_review');
  }, [screen, stepId, answers]);

  const patchAnswers = (partial: Partial<AvaliacaoAtividadeFisicaBasicAnswers>) => {
    setAnswers((prev) => ({ ...prev, ...partial }));
    setError(null);
  };

  const handleStart = async () => {
    setBootstrapping(true);
    setError(null);
    try {
      const existing = await persistence.getByPatientId(patientId);
      if (existing && existing.status !== 'completed') {
        // Draft já existe: retomar sem apagar respostas.
        const nextStep = resolveInitialStep(existing.currentStep, existing.answers || {});
        setAnswers(existing.answers || {});
        setStepId(nextStep);
        if (
          existing.currentStep === AVALIACAO_SAFETY_COMPLETE_STEP ||
          existing.currentStep === 'final_review'
        ) {
          setScreen('final_review');
        } else if (existing.currentStep === 'completion_confirmation') {
          setScreen('completion_confirmation');
        } else if (
          MILESTONE_STEPS.has(String(existing.currentStep || '')) ||
          Object.keys(existing.answers || {}).length > 0
        ) {
          setScreen('steps');
        } else {
          setScreen('steps');
          setStepId('primary_goal');
        }
        return;
      }
      await persistence.createDraft({ patientId, userId });
      setAnswers({});
      setStepId('primary_goal');
      setScreen('steps');
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : 'Não foi possível iniciar a avaliação. Tente novamente.');
    } finally {
      setBootstrapping(false);
    }
  };

  const handleContinueResume = () => {
    setError(null);
    if (savedStep === AVALIACAO_BASIC_COMPLETE_STEP) {
      setStepId('body_priorities');
    } else if (savedStep === AVALIACAO_TRAINING_PROFILE_COMPLETE_STEP) {
      setStepId('environment_overview');
    } else if (savedStep === AVALIACAO_ENVIRONMENT_COMPLETE_STEP) {
      setStepId('safety_overview');
    } else if (savedStep === AVALIACAO_SAFETY_COMPLETE_STEP) {
      setScreen('final_review');
      return;
    }
    setScreen('steps');
  };

  const handleEditBlock = (block: AvaliacaoReviewEditBlock) => {
    setError(null);
    setSaveNotice(null);
    setReviewBlock(block);
    setStepId(getReviewBlockEntryStep(block, answers));
    setScreen('steps');
  };

  const handleBackToReview = () => {
    setReviewBlock(null);
    setError(null);
    setScreen('final_review');
    setStepId('final_review');
  };

  const handleBack = () => {
    setError(null);
    if (reviewBlock) {
      const blockSteps = getReviewBlockSteps(reviewBlock, answers);
      const idx = blockSteps.indexOf(stepId);
      if (idx <= 0) {
        handleBackToReview();
        return;
      }
      setStepId(blockSteps[idx - 1]);
      return;
    }
    const idx = visibleSteps.indexOf(stepId);
    if (idx <= 0) {
      setScreen(hasProgress || hasExistingDraft ? 'resume' : 'welcome');
      return;
    }
    if (savedStep === AVALIACAO_BASIC_COMPLETE_STEP && stepId === 'body_priorities') {
      setScreen('resume');
      return;
    }
    if (savedStep === AVALIACAO_TRAINING_PROFILE_COMPLETE_STEP && stepId === 'environment_overview') {
      setScreen('resume');
      return;
    }
    if (savedStep === AVALIACAO_ENVIRONMENT_COMPLETE_STEP && stepId === 'safety_overview') {
      setScreen('resume');
      return;
    }
    const prev = visibleSteps[idx - 1];
    if (prev === 'final_review' || prev === 'completion_confirmation') {
      setScreen('final_review');
      setStepId('final_review');
      return;
    }
    setStepId(prev);
  };

  const answersSliceForStep = (id: AvaliacaoStepId): Partial<AvaliacaoAtividadeFisicaBasicAnswers> => {
    switch (id) {
      case 'primary_goal':
        return {
          primaryGoal: answers.primaryGoal ?? null,
          primaryGoalOther: answers.primaryGoal === 'other' ? answers.primaryGoalOther ?? null : null,
        };
      case 'secondary_goals':
        return { secondaryGoals: answers.secondaryGoals || [] };
      case 'experience':
        return { experienceLevel: answers.experienceLevel ?? null };
      case 'current_activity':
        return { currentlyActive: answers.currentlyActive ?? null };
      case 'current_activity_details':
        return {
          currentActivities: answers.currentActivities || [],
          currentActivityOther: (answers.currentActivities || []).includes('other')
            ? answers.currentActivityOther ?? null
            : null,
        };
      case 'current_frequency':
        return { currentFrequencyPerWeek: answers.currentFrequencyPerWeek ?? null };
      case 'available_days':
        return { availableDaysPerWeek: answers.availableDaysPerWeek ?? null };
      case 'preferred_days':
        return {
          preferredWeekdays: answers.variableSchedule ? [] : answers.preferredWeekdays || [],
          variableSchedule: Boolean(answers.variableSchedule),
        };
      case 'session_duration':
        return { sessionDurationMinutes: answers.sessionDurationMinutes ?? null };
      case 'duration_consistency':
        return { durationConsistency: answers.durationConsistency ?? null };
      case 'preferred_time':
        return {
          preferredTrainingPeriod: answers.preferredTrainingPeriod ?? null,
          approximateTrainingTime: answers.approximateTrainingTime ?? null,
        };
      case 'training_location':
        return {
          trainingLocation: answers.trainingLocation ?? null,
          trainingLocationOther:
            answers.trainingLocation === 'other' ? answers.trainingLocationOther ?? null : null,
        };
      case 'body_priorities':
        return { bodyPriorities: answers.bodyPriorities || [] };
      case 'preferred_modalities':
        return { preferredModalities: answers.preferredModalities || [] };
      case 'preferred_intensity':
        return { preferredIntensity: answers.preferredIntensity ?? null };
      case 'cardio_preference':
        return { cardioPreference: answers.cardioPreference ?? null };
      case 'cardio_activities':
        return {
          preferredCardioActivities: answers.preferredCardioActivities || [],
          preferredCardioOther: (answers.preferredCardioActivities || []).includes('other')
            ? answers.preferredCardioOther ?? null
            : null,
        };
      case 'favorite_exercises':
        return { favoriteExercisesText: answers.favoriteExercisesText?.trim() || null };
      case 'avoided_exercises':
        return { avoidedExercisesText: answers.avoidedExercisesText?.trim() || null };
      case 'training_barriers':
        return {
          trainingBarriers: answers.trainingBarriers || [],
          trainingBarrierOther: (answers.trainingBarriers || []).includes('other')
            ? answers.trainingBarrierOther ?? null
            : null,
        };
      case 'environment_overview':
        return {};
      case 'gym_structure':
        return { gymStructureLevel: answers.gymStructureLevel ?? null };
      case 'gym_areas':
        return { gymAvailableAreas: answers.gymAvailableAreas || [] };
      case 'home_space':
        return { homeTrainingSpace: answers.homeTrainingSpace ?? null };
      case 'available_equipment':
        return {
          availableEquipment: answers.availableEquipment || [],
          availableEquipmentOther: (answers.availableEquipment || []).includes('other')
            ? answers.availableEquipmentOther ?? null
            : null,
          // limpa frequência se não houver equipamentos concretos
          equipmentAccessFrequency:
            (answers.availableEquipment || []).includes(EQUIPMENT_NONE) ||
            (answers.availableEquipment || []).includes(EQUIPMENT_UNKNOWN) ||
            (answers.availableEquipment || []).length === 0
              ? null
              : answers.equipmentAccessFrequency ?? null,
        };
      case 'equipment_access':
        return { equipmentAccessFrequency: answers.equipmentAccessFrequency ?? null };
      case 'outdoor_spaces':
        return {
          outdoorEnvironment: answers.outdoorEnvironment || [],
          outdoorEnvironmentOther: (answers.outdoorEnvironment || []).includes('other')
            ? answers.outdoorEnvironmentOther ?? null
            : null,
        };
      case 'floor_exercises':
        return { floorExerciseAvailability: answers.floorExerciseAvailability ?? null };
      case 'environment_noise':
        return {
          environmentImpactNoiseRestriction: answers.environmentImpactNoiseRestriction ?? null,
        };
      case 'environment_notes':
        return { environmentNotes: answers.environmentNotes?.trim() || null };
      case 'safety_overview':
        return {};
      case 'current_pain':
        return {
          currentPainLevel: answers.currentPainLevel ?? null,
          ...(answers.currentPainLevel === 'none'
            ? {
                painRegions: [],
                painRegionOther: null,
                painTriggers: [],
                painTriggerOther: null,
                painFunctionalImpact: null,
              }
            : {}),
        };
      case 'pain_regions':
        return {
          painRegions: answers.painRegions || [],
          painRegionOther: (answers.painRegions || []).includes('other')
            ? answers.painRegionOther ?? null
            : null,
        };
      case 'pain_triggers':
        return {
          painTriggers: answers.painTriggers || [],
          painTriggerOther: (answers.painTriggers || []).includes('other')
            ? answers.painTriggerOther ?? null
            : null,
        };
      case 'pain_functional_impact':
        return { painFunctionalImpact: answers.painFunctionalImpact ?? null };
      case 'relevant_injury':
        return {
          hasRelevantInjury: answers.hasRelevantInjury ?? null,
          ...(answers.hasRelevantInjury === 'no' || answers.hasRelevantInjury === 'unsure'
            ? { injuryDetails: null, injuryCurrentlyLimitsMovement: null }
            : {}),
        };
      case 'injury_details':
        return { injuryDetails: answers.injuryDetails?.trim() || null };
      case 'injury_movement_limitation':
        return {
          injuryCurrentlyLimitsMovement: answers.injuryCurrentlyLimitsMovement ?? null,
        };
      case 'relevant_surgery':
        return {
          hasRelevantSurgery: answers.hasRelevantSurgery ?? null,
          ...(answers.hasRelevantSurgery === 'no'
            ? { surgeryDetails: null, surgeryTiming: null }
            : {}),
        };
      case 'surgery_details':
        return { surgeryDetails: answers.surgeryDetails?.trim() || null };
      case 'surgery_timing':
        return { surgeryTiming: answers.surgeryTiming ?? null };
      case 'movement_limitations':
        return {
          movementLimitations: answers.movementLimitations || [],
          movementLimitationOther: (answers.movementLimitations || []).includes('other')
            ? answers.movementLimitationOther ?? null
            : null,
        };
      case 'balance_falls':
        return { balanceFallHistory: answers.balanceFallHistory ?? null };
      case 'shortness_of_breath':
        return {
          shortnessOfBreathOnLightEffort: answers.shortnessOfBreathOnLightEffort ?? null,
        };
      case 'chest_symptoms':
        return { chestSymptomsDuringEffort: answers.chestSymptomsDuringEffort ?? null };
      case 'dizziness_fainting':
        return {
          dizzinessOrFaintingDuringEffort: answers.dizzinessOrFaintingDuringEffort ?? null,
        };
      case 'palpitations':
        return { palpitationsDuringExercise: answers.palpitationsDuringExercise ?? null };
      case 'blood_pressure_advice':
        return {
          uncontrolledBloodPressureAdvice: answers.uncontrolledBloodPressureAdvice ?? null,
        };
      case 'professional_restriction':
        return {
          hasProfessionalExerciseRestriction: answers.hasProfessionalExerciseRestriction ?? null,
          ...(answers.hasProfessionalExerciseRestriction === 'no'
            ? { professionalExerciseRestrictionDetails: null }
            : {}),
        };
      case 'professional_restriction_details':
        return {
          professionalExerciseRestrictionDetails:
            answers.professionalExerciseRestrictionDetails?.trim() || null,
        };
      case 'additional_safety_notes':
        return { additionalSafetyNotes: answers.additionalSafetyNotes?.trim() || null };
      case 'safety_confirmation':
        return { safetyAnswersConfirmed: true };
      case 'final_review':
        return {};
      case 'completion_confirmation':
        return { finalConfirmationAccepted: true };
      default:
        return {};
    }
  };

  const handleContinue = async () => {
    if (stepId === 'safety_confirmation') {
      if (!safetyConfirmChoice) {
        setError('Confirme se as informações estão corretas ou se deseja revisar.');
        return;
      }
      if (safetyConfirmChoice === 'review') {
        setError(null);
        setSafetyConfirmChoice(null);
        patchAnswers({ safetyAnswersConfirmed: null });
        setStepId('safety_overview');
        return;
      }
    }

    const validationAnswers =
      stepId === 'safety_confirmation'
        ? { ...answers, safetyAnswersConfirmed: true as boolean }
        : stepId === 'completion_confirmation'
          ? { ...answers, finalConfirmationAccepted: true as boolean }
          : answers;
    const validationError = validateStep(stepId, validationAnswers);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const partial = answersSliceForStep(stepId);
      const mergedForSafety: AvaliacaoAtividadeFisicaBasicAnswers = { ...answers, ...partial };
      const safety = buildSafetyAssessment(mergedForSafety);

      // Edição a partir da revisão: ao terminar o bloco, volta para final_review.
      if (reviewBlock) {
        const blockSteps = getReviewBlockSteps(reviewBlock, mergedForSafety);
        const bIdx = blockSteps.indexOf(stepId);
        const finishedBlock = bIdx < 0 || bIdx >= blockSteps.length - 1;
        if (finishedBlock) {
          await persistence.saveStep({
            patientId,
            stepId,
            partialAnswers: partial,
            progressPercent: progressPercentForStep('final_review', mergedForSafety),
            nextStepId: 'final_review',
            safety: reviewBlock === 'safety' ? safety : null,
          });
          setAnswers(mergedForSafety);
          setCompletedSafety(safety);
          setReviewBlock(null);
          setScreen('final_review');
          setStepId('final_review');
          return;
        }
        const nextInBlock = blockSteps[bIdx + 1];
        await persistence.saveStep({
          patientId,
          stepId,
          partialAnswers: partial,
          progressPercent: progressPercentForStep(nextInBlock, mergedForSafety),
          nextStepId: nextInBlock,
          safety: reviewBlock === 'safety' ? safety : null,
        });
        setAnswers(mergedForSafety);
        setStepId(nextInBlock);
        return;
      }

      const nextVisible = getVisibleSteps(mergedForSafety);
      const isSafetyBlock =
        stepId.startsWith('safety') ||
        stepId.includes('pain') ||
        stepId.includes('injury') ||
        stepId.includes('surgery') ||
        stepId === 'movement_limitations' ||
        stepId === 'balance_falls' ||
        stepId === 'shortness_of_breath' ||
        stepId === 'chest_symptoms' ||
        stepId === 'dizziness_fainting' ||
        stepId === 'palpitations' ||
        stepId === 'blood_pressure_advice' ||
        stepId === 'professional_restriction' ||
        stepId === 'professional_restriction_details' ||
        stepId === 'additional_safety_notes';

      let idx = nextVisible.indexOf(stepId);
      // Step atual sumiu da lista visível (condicional) ou é marco legado: remapeia
      // para o step real e PARA nele (não pula para o seguinte).
      if (idx < 0) {
        const remapped = resolveInitialStep(stepId, mergedForSafety);
        const remappedIdx = nextVisible.indexOf(remapped);
        const target =
          remappedIdx >= 0
            ? remapped
            : nextVisible.find((s) => s !== 'final_review' && s !== 'completion_confirmation') ||
              'body_priorities';
        await persistence.saveStep({
          patientId,
          stepId,
          partialAnswers: partial,
          progressPercent: progressPercentForStep(target as AvaliacaoStepId, mergedForSafety),
          nextStepId: target,
          safety: isSafetyBlock ? safety : null,
        });
        setAnswers(mergedForSafety);
        setCompletedSafety(safety);
        if (target === 'final_review') {
          setScreen('final_review');
          setStepId('final_review');
        } else {
          setStepId(target as AvaliacaoStepId);
          setScreen('steps');
        }
        return;
      }

      let nextStepId: string =
        idx < nextVisible.length - 1 ? nextVisible[idx + 1] : 'final_review';

      // Após safety_confirmation → final_review (marco safety_complete compatível).
      if (stepId === 'safety_confirmation') {
        nextStepId = 'final_review';
      }

      // Nunca tratar marcos legados como destino de UI de steps.
      if (MILESTONE_STEPS.has(nextStepId)) {
        nextStepId = resolveInitialStep(nextStepId, mergedForSafety);
      }

      const progressForSave = progressPercentForStep(
        nextStepId as AvaliacaoStepId,
        mergedForSafety
      );

      await persistence.saveStep({
        patientId,
        stepId,
        partialAnswers: partial,
        progressPercent: progressForSave,
        nextStepId: stepId === 'safety_confirmation' ? 'final_review' : nextStepId,
        safety: isSafetyBlock || stepId === 'safety_confirmation' ? safety : null,
      });

      setAnswers(mergedForSafety);
      setCompletedSafety(safety);

      if (stepId === 'safety_confirmation' || nextStepId === 'final_review') {
        setScreen('final_review');
        setStepId('final_review');
        return;
      }
      if (nextStepId === 'completion_confirmation') {
        setScreen('completion_confirmation');
        setStepId('completion_confirmation');
        return;
      }
      setStepId(nextStepId as AvaliacaoStepId);
      setScreen('steps');
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : 'Erro ao salvar. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  const handleGoToCompletion = async () => {
    if (audience === 'professional') {
      setSaving(true);
      setError(null);
      setSaveNotice(null);
      try {
        await persistence.completeAssessment({
          patientId,
          answers: { ...answers, finalConfirmationAccepted: true },
        });
        setSaveNotice('Anamnese salva.');
        setScreen('final_review');
        setStepId('final_review');
        setReviewBlock(null);
      } catch (e) {
        console.error(e);
        setError(e instanceof Error ? e.message : 'Erro ao salvar. Tente novamente.');
      } finally {
        setSaving(false);
      }
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await persistence.saveStep({
        patientId,
        stepId: 'final_review',
        partialAnswers: {},
        progressPercent: progressPercentForStep('completion_confirmation', answers),
        nextStepId: 'completion_confirmation',
        safety: buildSafetyAssessment(answers),
      });
      setScreen('completion_confirmation');
      setStepId('completion_confirmation');
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : 'Erro ao avançar. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  const handleCompleteAssessment = async () => {
    if (!finalConfirmChecked) {
      setError('Confirme que revisou as informações antes de concluir.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const withConfirm = { ...answers, finalConfirmationAccepted: true };
      await persistence.completeAssessment({
        patientId,
        answers: withConfirm,
      });
      setAnswers(withConfirm);
      setCompletedSafety(buildSafetyAssessment(withConfirm));
      setScreen('success');
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : 'Erro ao concluir. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  const toggleSecondary = (value: string) => {
    const current = answers.secondaryGoals || [];
    if (value === SECONDARY_NONE_VALUE) {
      patchAnswers({ secondaryGoals: current.includes(SECONDARY_NONE_VALUE) ? [] : [SECONDARY_NONE_VALUE] });
      return;
    }
    let next = current.filter((v) => v !== SECONDARY_NONE_VALUE);
    if (next.includes(value)) {
      next = next.filter((v) => v !== value);
    } else {
      if (next.length >= 3) return;
      next = [...next, value];
    }
    patchAnswers({ secondaryGoals: next });
  };

  const toggleActivity = (value: string) => {
    const current = answers.currentActivities || [];
    const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
    patchAnswers({
      currentActivities: next,
      currentActivityOther: next.includes('other') ? answers.currentActivityOther : null,
    });
  };

  const toggleWeekday = (value: string) => {
    const max = answers.availableDaysPerWeek ?? 7;
    const current = answers.preferredWeekdays || [];
    if (current.includes(value)) {
      patchAnswers({ preferredWeekdays: current.filter((v) => v !== value), variableSchedule: false });
      return;
    }
    if (current.length >= max) return;
    patchAnswers({
      preferredWeekdays: [...current, value],
      variableSchedule: false,
    });
  };

  const toggleBodyPriority = (value: string) => {
    const current = answers.bodyPriorities || [];
    if (value === BODY_PRIORITY_FULL_BODY) {
      patchAnswers({
        bodyPriorities: current.includes(BODY_PRIORITY_FULL_BODY) ? [] : [BODY_PRIORITY_FULL_BODY],
      });
      return;
    }
    let next = current.filter((v) => v !== BODY_PRIORITY_FULL_BODY);
    if (next.includes(value)) {
      next = next.filter((v) => v !== value);
    } else {
      if (next.length >= 3) return;
      next = [...next, value];
    }
    patchAnswers({ bodyPriorities: next });
  };

  const toggleModality = (value: string) => {
    const current = answers.preferredModalities || [];
    if (value === MODALITY_NO_PREFERENCE) {
      patchAnswers({
        preferredModalities: current.includes(MODALITY_NO_PREFERENCE) ? [] : [MODALITY_NO_PREFERENCE],
      });
      return;
    }
    let next = current.filter((v) => v !== MODALITY_NO_PREFERENCE);
    if (next.includes(value)) {
      next = next.filter((v) => v !== value);
    } else {
      next = [...next, value];
    }
    patchAnswers({ preferredModalities: next });
  };

  const toggleCardioActivity = (value: string) => {
    const current = answers.preferredCardioActivities || [];
    const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
    patchAnswers({
      preferredCardioActivities: next,
      preferredCardioOther: next.includes('other') ? answers.preferredCardioOther : null,
    });
  };

  const toggleBarrier = (value: string) => {
    const current = answers.trainingBarriers || [];
    if (value === BARRIER_NONE_VALUE) {
      patchAnswers({
        trainingBarriers: current.includes(BARRIER_NONE_VALUE) ? [] : [BARRIER_NONE_VALUE],
        trainingBarrierOther: null,
      });
      return;
    }
    let next = current.filter((v) => v !== BARRIER_NONE_VALUE);
    if (next.includes(value)) {
      next = next.filter((v) => v !== value);
    } else {
      next = [...next, value];
    }
    patchAnswers({
      trainingBarriers: next,
      trainingBarrierOther: next.includes('other') ? answers.trainingBarrierOther : null,
    });
  };

  const toggleGymArea = (value: string) => {
    const current = answers.gymAvailableAreas || [];
    if (value === GYM_AREA_UNKNOWN) {
      patchAnswers({
        gymAvailableAreas: current.includes(GYM_AREA_UNKNOWN) ? [] : [GYM_AREA_UNKNOWN],
      });
      return;
    }
    let next = current.filter((v) => v !== GYM_AREA_UNKNOWN);
    if (next.includes(value)) {
      next = next.filter((v) => v !== value);
    } else {
      next = [...next, value];
    }
    patchAnswers({ gymAvailableAreas: next });
  };

  const toggleEquipment = (value: string) => {
    const current = answers.availableEquipment || [];
    if (value === EQUIPMENT_NONE) {
      patchAnswers({
        availableEquipment: current.includes(EQUIPMENT_NONE) ? [] : [EQUIPMENT_NONE],
        availableEquipmentOther: null,
        equipmentAccessFrequency: null,
      });
      return;
    }
    if (value === EQUIPMENT_UNKNOWN) {
      patchAnswers({
        availableEquipment: current.includes(EQUIPMENT_UNKNOWN) ? [] : [EQUIPMENT_UNKNOWN],
        availableEquipmentOther: null,
        equipmentAccessFrequency: null,
      });
      return;
    }
    let next = current.filter((v) => v !== EQUIPMENT_NONE && v !== EQUIPMENT_UNKNOWN);
    if (next.includes(value)) {
      next = next.filter((v) => v !== value);
    } else {
      next = [...next, value];
    }
    patchAnswers({
      availableEquipment: next,
      availableEquipmentOther: next.includes('other') ? answers.availableEquipmentOther : null,
      equipmentAccessFrequency: next.length === 0 ? null : answers.equipmentAccessFrequency,
    });
  };

  const toggleOutdoor = (value: string) => {
    const current = answers.outdoorEnvironment || [];
    const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
    patchAnswers({
      outdoorEnvironment: next,
      outdoorEnvironmentOther: next.includes('other') ? answers.outdoorEnvironmentOther : null,
    });
  };

  const toggleMulti = (
    field: 'painRegions' | 'painTriggers' | 'movementLimitations',
    value: string,
    exclusiveValue?: string
  ) => {
    const current = (answers[field] as string[] | undefined) || [];
    if (exclusiveValue && value === exclusiveValue) {
      patchAnswers({
        [field]: current.includes(exclusiveValue) ? [] : [exclusiveValue],
        ...(field === 'movementLimitations' ? { movementLimitationOther: null } : {}),
        ...(field === 'painRegions' ? { painRegionOther: null } : {}),
        ...(field === 'painTriggers' ? { painTriggerOther: null } : {}),
      } as Partial<AvaliacaoAtividadeFisicaBasicAnswers>);
      return;
    }
    let next = exclusiveValue ? current.filter((v) => v !== exclusiveValue) : [...current];
    if (next.includes(value)) {
      next = next.filter((v) => v !== value);
    } else {
      next = [...next, value];
    }
    const patch: Partial<AvaliacaoAtividadeFisicaBasicAnswers> = { [field]: next };
    if (field === 'painRegions') {
      patch.painRegionOther = next.includes('other') ? answers.painRegionOther : null;
    }
    if (field === 'painTriggers') {
      patch.painTriggerOther = next.includes('other') ? answers.painTriggerOther : null;
    }
    if (field === 'movementLimitations') {
      patch.movementLimitationOther = next.includes('other') ? answers.movementLimitationOther : null;
    }
    patchAnswers(patch);
  };

  const greetingName = firstName ? `${firstName}` : null;
  const bodyOrderPreview = (answers.bodyPriorities || []).filter((v) => v !== BODY_PRIORITY_FULL_BODY);

  const resumeCopy =
    savedStep === AVALIACAO_SAFETY_COMPLETE_STEP
      ? {
          lead: 'Suas respostas de segurança já estão salvas.',
          follow: 'Agora revise o resumo e conclua sua avaliação.',
        }
      : savedStep === AVALIACAO_ENVIRONMENT_COMPLETE_STEP
        ? {
            lead: 'Suas informações de ambiente e equipamentos já estão salvas.',
            follow: 'Agora vamos entender se há alguma dor, limitação ou condição a considerar.',
          }
        : savedStep === AVALIACAO_TRAINING_PROFILE_COMPLETE_STEP
          ? {
              lead: 'Suas preferências de treino já estão salvas.',
              follow: 'Agora vamos entender o que você terá disponível para treinar.',
            }
          : savedStep === AVALIACAO_BASIC_COMPLETE_STEP
            ? {
                lead: 'Ótimo — suas respostas iniciais já estão salvas.',
                follow: 'Agora vamos entender como você gosta de treinar.',
              }
            : {
                lead: 'Você já começou a criar seu perfil de treino.',
                follow: 'Vamos continuar de onde parou?',
              };

  const headerProgress =
    screen === 'final_review'
      ? progressPercentForStep('final_review', answers)
      : screen === 'completion_confirmation'
        ? progressPercentForStep('completion_confirmation', answers)
        : progress;

  const deferButtonClass =
    'w-full py-2.5 text-sm font-medium text-slate-500 hover:text-slate-700 underline underline-offset-2';

  return (
    <div className={embedded ? 'flex flex-col bg-white' : 'min-h-dvh bg-gradient-to-b from-slate-50 via-white to-emerald-50/40 flex flex-col'}>
      <header className="sticky top-0 z-20 bg-white/90 backdrop-blur border-b border-slate-200/80 px-4 py-3">
        <div className="max-w-lg mx-auto">
          <div className="flex items-start justify-between gap-3 mb-1">
            <p className="text-xs font-medium text-emerald-700">
              {audience === 'professional' ? 'Anamnese de atividade física' : 'Vamos criar seu treino personalizado'}
            </p>
            {onDefer && screen !== 'success' && (
              <button
                type="button"
                onClick={onDefer}
                className="text-xs font-medium text-slate-500 hover:text-slate-700 whitespace-nowrap shrink-0"
              >
                Fazer depois
              </button>
            )}
          </div>
          {(screen === 'steps' ||
            screen === 'final_review' ||
            screen === 'completion_confirmation') && (
            <>
              <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
                <span>
                  {screen === 'steps'
                    ? `Etapa ${stepIndex + 1} de ${visibleSteps.length}`
                    : screen === 'final_review'
                      ? 'Revisão'
                      : 'Confirmação'}
                </span>
                <span>{headerProgress}%</span>
              </div>
              <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500"
                  initial={false}
                  animate={{ width: `${headerProgress}%` }}
                  transition={{ duration: 0.35 }}
                />
              </div>
            </>
          )}
        </div>
      </header>

      <main className="flex-1 flex items-start justify-center px-4 py-6 sm:py-10">
        <div className="w-full max-w-lg">
          <AnimatePresence mode="wait">
            {screen === 'welcome' && (
              <motion.div
                key="welcome"
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
                className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6 sm:p-8 space-y-4"
              >
                <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900 tracking-tight">
                  {greetingName ? `Olá, ${greetingName}! 👋` : 'Olá! 👋'}
                </h1>
                <p className="text-lg text-slate-800 font-medium">
                  Vamos criar um treino que combine com você.
                </p>
                <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
                  Já conhecemos algumas informações importantes do seu acompanhamento.
                </p>
                <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
                  Agora precisamos entender seus objetivos, sua rotina, como você gosta de treinar e o
                  que terá disponível.
                </p>
                <p className="text-slate-500 text-sm">Leva apenas alguns minutos.</p>
                {error && (
                  <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                    {error}
                  </p>
                )}
                <button
                  type="button"
                  onClick={handleStart}
                  disabled={bootstrapping}
                  className="w-full mt-2 py-3.5 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {bootstrapping ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                  Começar
                </button>
                {onDefer && (
                  <button type="button" onClick={onDefer} className={deferButtonClass}>
                    Fazer depois
                  </button>
                )}
              </motion.div>
            )}

            {screen === 'resume' && (
              <motion.div
                key="resume"
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
                className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6 sm:p-8 space-y-4"
              >
                <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900 tracking-tight">
                  {greetingName ? `Olá, ${greetingName}! 👋` : 'Olá! 👋'}
                </h1>
                <p className="text-slate-700 leading-relaxed">{resumeCopy.lead}</p>
                <p className="text-slate-600 text-sm sm:text-base">{resumeCopy.follow}</p>
                {error && (
                  <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                    {error}
                  </p>
                )}
                <button
                  type="button"
                  onClick={handleContinueResume}
                  className="w-full py-3.5 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700"
                >
                  Continuar avaliação
                </button>
                {onDefer && (
                  <button type="button" onClick={onDefer} className={deferButtonClass}>
                    Fazer depois
                  </button>
                )}
              </motion.div>
            )}

            {screen === 'final_review' && (
              <motion.div
                key="final_review"
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
              >
                {error && (
                  <p className="mb-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                    {error}
                  </p>
                )}
                {saveNotice ? (
                  <p className="mb-3 rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                    {saveNotice}
                  </p>
                ) : null}
                <AvaliacaoAtividadeFisicaReview
                  answers={answers}
                  onEditBlock={handleEditBlock}
                  onContinue={() => void handleGoToCompletion()}
                  title={audience === 'professional' ? 'Anamnese respondida' : undefined}
                  description={
                    audience === 'professional'
                      ? 'Estas são as respostas do paciente. Abra um bloco para corrigir e salve em seguida.'
                      : undefined
                  }
                  continueLabel={audience === 'professional' ? (saving ? 'Salvando…' : 'Salvar alterações') : undefined}
                />
              </motion.div>
            )}

            {screen === 'completion_confirmation' && (
              <motion.div
                key="completion_confirmation"
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
                className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6 sm:p-8 space-y-4"
              >
                <h2 className="text-xl sm:text-2xl font-semibold text-slate-900">
                  Confirmar conclusão
                </h2>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Ao concluir, suas respostas vão para o seu personal, que vai usá-las para montar o
                  seu treino.
                </p>
                <p className="text-sm text-slate-500 leading-relaxed">
                  Você poderá atualizar a avaliação posteriormente quando essa funcionalidade estiver
                  disponível.
                </p>
                <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 cursor-pointer">
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    checked={finalConfirmChecked}
                    onChange={(e) => {
                      setFinalConfirmChecked(e.target.checked);
                      setError(null);
                    }}
                  />
                  <span className="text-sm text-slate-700">
                    Confirmo que revisei as informações e que elas estão corretas.
                  </span>
                </label>
                {error && (
                  <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                    {error}
                  </p>
                )}
                <div className="flex flex-col sm:flex-row gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setError(null);
                      setScreen('final_review');
                      setStepId('final_review');
                    }}
                    disabled={saving}
                    className="px-4 py-3 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  >
                    Voltar para revisar
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleCompleteAssessment()}
                    disabled={saving}
                    className="flex-1 py-3 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                    Concluir avaliação
                  </button>
                </div>
              </motion.div>
            )}

            {screen === 'success' && (
              <motion.div
                key="success"
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
                className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6 sm:p-8 space-y-4"
              >
                <h1 className="text-2xl font-semibold text-slate-900">Avaliação concluída</h1>
                <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
                  Pronto! Suas informações foram salvas.
                </p>
                <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
                  Agora o seu personal vai usar essas respostas para montar o seu treino.
                </p>
                {completedSafety?.requiresProfessionalAttention && (
                  <p className="text-sm text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 leading-relaxed">
                    Algumas informações poderão precisar de revisão profissional antes da criação ou
                    do ajuste do treino.
                  </p>
                )}
                {needsReinforcedSafetyMessage(answers) && (
                  <p className="text-sm text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 leading-relaxed">
                    Caso esses sintomas estejam acontecendo agora ou sejam intensos, procure
                    atendimento médico.
                  </p>
                )}
                <button
                  type="button"
                  onClick={onAssessmentComplete}
                  className="w-full py-3.5 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700"
                >
                  {completeButtonLabel}
                </button>
              </motion.div>
            )}

            {screen === 'steps' && meta && (
              <motion.div
                key={stepId}
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
                className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6 sm:p-8 space-y-5"
              >
                <div>
                  <h2 className="text-xl sm:text-2xl font-semibold text-slate-900">{meta.title}</h2>
                  {meta.subtitle && (
                    <p className="mt-2 text-sm text-slate-500">{meta.subtitle}</p>
                  )}
                  {savedStep === AVALIACAO_BASIC_COMPLETE_STEP && stepId === 'body_priorities' && (
                    <p className="mt-3 text-sm text-emerald-800 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">
                      Suas respostas iniciais já estão salvas. Agora vamos entender como você gosta de
                      treinar.
                    </p>
                  )}
                </div>

                {stepId === 'primary_goal' && (
                  <>
                    <ChoiceList
                      options={PRIMARY_GOAL_OPTIONS}
                      value={answers.primaryGoal}
                      onChange={(v) =>
                        patchAnswers({
                          primaryGoal: v,
                          primaryGoalOther: v === 'other' ? answers.primaryGoalOther : null,
                          secondaryGoals: (answers.secondaryGoals || []).filter((g) => g !== v),
                        })
                      }
                    />
                    {answers.primaryGoal === 'other' && (
                      <input
                        className={inputClassName}
                        placeholder="Conte brevemente qual é o seu objetivo"
                        value={answers.primaryGoalOther || ''}
                        onChange={(e) => patchAnswers({ primaryGoalOther: e.target.value })}
                      />
                    )}
                  </>
                )}

                {stepId === 'secondary_goals' && (
                  <MultiChoiceList
                    options={[
                      ...PRIMARY_GOAL_OPTIONS.filter((o) => o.value !== answers.primaryGoal),
                      { value: SECONDARY_NONE_VALUE, label: 'Nenhum objetivo adicional' },
                    ]}
                    values={answers.secondaryGoals || []}
                    onToggle={toggleSecondary}
                  />
                )}

                {stepId === 'experience' && (
                  <ChoiceList
                    options={EXPERIENCE_OPTIONS}
                    value={answers.experienceLevel}
                    onChange={(v) => patchAnswers({ experienceLevel: v })}
                  />
                )}

                {stepId === 'current_activity' && (
                  <div className="space-y-2.5">
                    <ChoiceButton
                      selected={answers.currentlyActive === true}
                      onClick={() => patchAnswers({ currentlyActive: true })}
                    >
                      Sim
                    </ChoiceButton>
                    <ChoiceButton
                      selected={answers.currentlyActive === false}
                      onClick={() =>
                        patchAnswers({
                          currentlyActive: false,
                          currentActivities: [],
                          currentActivityOther: null,
                          currentFrequencyPerWeek: null,
                        })
                      }
                    >
                      Não
                    </ChoiceButton>
                  </div>
                )}

                {stepId === 'current_activity_details' && (
                  <>
                    <MultiChoiceList
                      options={CURRENT_ACTIVITY_OPTIONS}
                      values={answers.currentActivities || []}
                      onToggle={toggleActivity}
                    />
                    {(answers.currentActivities || []).includes('other') && (
                      <input
                        className={inputClassName}
                        placeholder="Descreva a atividade"
                        value={answers.currentActivityOther || ''}
                        onChange={(e) => patchAnswers({ currentActivityOther: e.target.value })}
                      />
                    )}
                  </>
                )}

                {stepId === 'current_frequency' && (
                  <ChoiceList
                    options={[1, 2, 3, 4, 5, 6, 7].map((n) => ({
                      value: String(n),
                      label: `${n} dia${n === 1 ? '' : 's'}`,
                    }))}
                    value={
                      answers.currentFrequencyPerWeek != null
                        ? String(answers.currentFrequencyPerWeek)
                        : null
                    }
                    onChange={(v) => patchAnswers({ currentFrequencyPerWeek: Number(v) })}
                  />
                )}

                {stepId === 'available_days' && (
                  <ChoiceList
                    options={[1, 2, 3, 4, 5, 6, 7].map((n) => ({
                      value: String(n),
                      label: `${n} dia${n === 1 ? '' : 's'}`,
                    }))}
                    value={
                      answers.availableDaysPerWeek != null
                        ? String(answers.availableDaysPerWeek)
                        : null
                    }
                    onChange={(v) => {
                      const n = Number(v);
                      const days = answers.preferredWeekdays || [];
                      patchAnswers({
                        availableDaysPerWeek: n,
                        preferredWeekdays: days.slice(0, n),
                      });
                    }}
                  />
                )}

                {stepId === 'preferred_days' && (
                  <div className="space-y-2.5">
                    <MultiChoiceList
                      options={WEEKDAY_OPTIONS}
                      values={answers.variableSchedule ? [] : answers.preferredWeekdays || []}
                      onToggle={toggleWeekday}
                      disabledValues={answers.variableSchedule ? WEEKDAY_OPTIONS.map((o) => o.value) : []}
                    />
                    <ChoiceButton
                      selected={Boolean(answers.variableSchedule)}
                      onClick={() =>
                        patchAnswers({
                          variableSchedule: !answers.variableSchedule,
                          preferredWeekdays: !answers.variableSchedule ? [] : answers.preferredWeekdays,
                        })
                      }
                    >
                      Minha rotina varia
                    </ChoiceButton>
                    {answers.availableDaysPerWeek != null && !answers.variableSchedule && (
                      <p className="text-xs text-slate-500">
                        Disponibilidade: {answers.availableDaysPerWeek} dia
                        {answers.availableDaysPerWeek === 1 ? '' : 's'} — selecione no máximo essa
                        quantidade.
                      </p>
                    )}
                  </div>
                )}

                {stepId === 'session_duration' && (
                  <ChoiceList
                    options={DURATION_OPTIONS}
                    value={
                      answers.sessionDurationMinutes != null
                        ? String(answers.sessionDurationMinutes)
                        : null
                    }
                    onChange={(v) => patchAnswers({ sessionDurationMinutes: Number(v) })}
                  />
                )}

                {stepId === 'duration_consistency' && (
                  <ChoiceList
                    options={DURATION_CONSISTENCY_OPTIONS}
                    value={answers.durationConsistency}
                    onChange={(v) => patchAnswers({ durationConsistency: v })}
                  />
                )}

                {stepId === 'preferred_time' && (
                  <>
                    <ChoiceList
                      options={TRAINING_PERIOD_OPTIONS}
                      value={answers.preferredTrainingPeriod}
                      onChange={(v) => patchAnswers({ preferredTrainingPeriod: v })}
                    />
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">
                        Quer informar um horário aproximado? (opcional)
                      </label>
                      <input
                        type="time"
                        className={inputClassName}
                        value={answers.approximateTrainingTime || ''}
                        onChange={(e) => patchAnswers({ approximateTrainingTime: e.target.value || null })}
                      />
                    </div>
                  </>
                )}

                {stepId === 'training_location' && (
                  <>
                    <ChoiceList
                      options={TRAINING_LOCATION_OPTIONS}
                      value={answers.trainingLocation}
                      onChange={(v) =>
                        patchAnswers({
                          trainingLocation: v,
                          trainingLocationOther: v === 'other' ? answers.trainingLocationOther : null,
                        })
                      }
                    />
                    {answers.trainingLocation === 'other' && (
                      <input
                        className={inputClassName}
                        placeholder="Descreva o local"
                        value={answers.trainingLocationOther || ''}
                        onChange={(e) => patchAnswers({ trainingLocationOther: e.target.value })}
                      />
                    )}
                  </>
                )}

                {stepId === 'body_priorities' && (
                  <div className="space-y-3">
                    <MultiChoiceList
                      options={BODY_PRIORITY_OPTIONS}
                      values={answers.bodyPriorities || []}
                      onToggle={toggleBodyPriority}
                      priorityBadges
                    />
                    {bodyOrderPreview.length > 0 && (
                      <p className="text-xs text-slate-500">
                        Ordem: {bodyOrderPreview.map((v, i) => `${i + 1}ª ${bodyPriorityLabel(v)}`).join(' · ')}
                      </p>
                    )}
                  </div>
                )}

                {stepId === 'preferred_modalities' && (
                  <MultiChoiceList
                    options={MODALITY_OPTIONS}
                    values={answers.preferredModalities || []}
                    onToggle={toggleModality}
                  />
                )}

                {stepId === 'preferred_intensity' && (
                  <ChoiceList
                    options={INTENSITY_OPTIONS}
                    value={answers.preferredIntensity}
                    onChange={(v) => patchAnswers({ preferredIntensity: v })}
                  />
                )}

                {stepId === 'cardio_preference' && (
                  <ChoiceList
                    options={CARDIO_PREFERENCE_OPTIONS}
                    value={answers.cardioPreference}
                    onChange={(v) =>
                      patchAnswers({
                        cardioPreference: v,
                        preferredCardioActivities:
                          v === 'dislike' || v === 'no_preference'
                            ? []
                            : answers.preferredCardioActivities,
                        preferredCardioOther:
                          v === 'dislike' || v === 'no_preference' ? null : answers.preferredCardioOther,
                      })
                    }
                  />
                )}

                {stepId === 'cardio_activities' && (
                  <>
                    <MultiChoiceList
                      options={CARDIO_ACTIVITY_OPTIONS}
                      values={answers.preferredCardioActivities || []}
                      onToggle={toggleCardioActivity}
                    />
                    {(answers.preferredCardioActivities || []).includes('other') && (
                      <input
                        className={inputClassName}
                        placeholder="Descreva a atividade aeróbica"
                        value={answers.preferredCardioOther || ''}
                        onChange={(e) => patchAnswers({ preferredCardioOther: e.target.value })}
                      />
                    )}
                  </>
                )}

                {stepId === 'favorite_exercises' && (
                  <textarea
                    className={`${inputClassName} min-h-[120px] resize-y`}
                    placeholder="Ex.: agachamento, remada, caminhada…"
                    value={answers.favoriteExercisesText || ''}
                    onChange={(e) => patchAnswers({ favoriteExercisesText: e.target.value })}
                  />
                )}

                {stepId === 'avoided_exercises' && (
                  <textarea
                    className={`${inputClassName} min-h-[120px] resize-y`}
                    placeholder="Ex.: burpee, afundo, corrida…"
                    value={answers.avoidedExercisesText || ''}
                    onChange={(e) => patchAnswers({ avoidedExercisesText: e.target.value })}
                  />
                )}

                {stepId === 'training_barriers' && (
                  <>
                    <MultiChoiceList
                      options={BARRIER_OPTIONS}
                      values={answers.trainingBarriers || []}
                      onToggle={toggleBarrier}
                    />
                    {(answers.trainingBarriers || []).includes('other') && (
                      <input
                        className={inputClassName}
                        placeholder="Descreva o que costuma atrapalhar"
                        value={answers.trainingBarrierOther || ''}
                        onChange={(e) => patchAnswers({ trainingBarrierOther: e.target.value })}
                      />
                    )}
                  </>
                )}

                {stepId === 'environment_overview' && (
                  <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
                    Toque em Continuar para informar a estrutura e os equipamentos que você terá
                    disponíveis.
                  </p>
                )}

                {stepId === 'gym_structure' && (
                  <ChoiceList
                    options={GYM_STRUCTURE_OPTIONS}
                    value={answers.gymStructureLevel}
                    onChange={(v) => patchAnswers({ gymStructureLevel: v })}
                  />
                )}

                {stepId === 'gym_areas' && (
                  <MultiChoiceList
                    options={GYM_AREA_OPTIONS}
                    values={answers.gymAvailableAreas || []}
                    onToggle={toggleGymArea}
                  />
                )}

                {stepId === 'home_space' && (
                  <ChoiceList
                    options={HOME_SPACE_OPTIONS}
                    value={answers.homeTrainingSpace}
                    onChange={(v) => patchAnswers({ homeTrainingSpace: v })}
                  />
                )}

                {stepId === 'available_equipment' && (
                  <>
                    <MultiChoiceList
                      options={EQUIPMENT_OPTIONS}
                      values={answers.availableEquipment || []}
                      onToggle={toggleEquipment}
                    />
                    {(answers.availableEquipment || []).includes('other') && (
                      <input
                        className={inputClassName}
                        placeholder="Descreva o equipamento"
                        value={answers.availableEquipmentOther || ''}
                        onChange={(e) => patchAnswers({ availableEquipmentOther: e.target.value })}
                      />
                    )}
                  </>
                )}

                {stepId === 'equipment_access' && (
                  <ChoiceList
                    options={EQUIPMENT_ACCESS_OPTIONS}
                    value={answers.equipmentAccessFrequency}
                    onChange={(v) => patchAnswers({ equipmentAccessFrequency: v })}
                  />
                )}

                {stepId === 'outdoor_spaces' && (
                  <>
                    <MultiChoiceList
                      options={OUTDOOR_SPACE_OPTIONS}
                      values={answers.outdoorEnvironment || []}
                      onToggle={toggleOutdoor}
                    />
                    {(answers.outdoorEnvironment || []).includes('other') && (
                      <input
                        className={inputClassName}
                        placeholder="Descreva o espaço"
                        value={answers.outdoorEnvironmentOther || ''}
                        onChange={(e) => patchAnswers({ outdoorEnvironmentOther: e.target.value })}
                      />
                    )}
                  </>
                )}

                {stepId === 'floor_exercises' && (
                  <ChoiceList
                    options={FLOOR_EXERCISE_OPTIONS}
                    value={answers.floorExerciseAvailability}
                    onChange={(v) => patchAnswers({ floorExerciseAvailability: v })}
                  />
                )}

                {stepId === 'environment_noise' && (
                  <ChoiceList
                    options={ENVIRONMENT_NOISE_OPTIONS}
                    value={answers.environmentImpactNoiseRestriction}
                    onChange={(v) => patchAnswers({ environmentImpactNoiseRestriction: v })}
                  />
                )}

                {stepId === 'environment_notes' && (
                  <textarea
                    className={`${inputClassName} min-h-[120px] resize-y`}
                    placeholder="Ex.: academia muito cheia, pouco espaço em casa, só consigo treinar na área externa..."
                    value={answers.environmentNotes || ''}
                    onChange={(e) => patchAnswers({ environmentNotes: e.target.value })}
                  />
                )}

                {stepId === 'safety_overview' && (
                  <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
                    Toque em Continuar para responder às perguntas de segurança. Suas respostas ajudam a
                    personalizar o treino — sem substituir avaliação presencial.
                  </p>
                )}

                {stepId === 'current_pain' && (
                  <ChoiceList
                    options={CURRENT_PAIN_OPTIONS}
                    value={answers.currentPainLevel}
                    onChange={(v) =>
                      patchAnswers({
                        currentPainLevel: v,
                        ...(v === 'none'
                          ? {
                              painRegions: [],
                              painRegionOther: null,
                              painTriggers: [],
                              painTriggerOther: null,
                              painFunctionalImpact: null,
                            }
                          : {}),
                      })
                    }
                  />
                )}

                {stepId === 'pain_regions' && (
                  <>
                    <MultiChoiceList
                      options={PAIN_REGION_OPTIONS}
                      values={answers.painRegions || []}
                      onToggle={(v) => toggleMulti('painRegions', v)}
                    />
                    {(answers.painRegions || []).includes('other') && (
                      <input
                        className={inputClassName}
                        placeholder="Descreva a região"
                        value={answers.painRegionOther || ''}
                        onChange={(e) => patchAnswers({ painRegionOther: e.target.value })}
                      />
                    )}
                  </>
                )}

                {stepId === 'pain_triggers' && (
                  <>
                    <MultiChoiceList
                      options={PAIN_TRIGGER_OPTIONS}
                      values={answers.painTriggers || []}
                      onToggle={(v) => toggleMulti('painTriggers', v)}
                    />
                    {(answers.painTriggers || []).includes('other') && (
                      <input
                        className={inputClassName}
                        placeholder="Descreva quando a dor aparece"
                        value={answers.painTriggerOther || ''}
                        onChange={(e) => patchAnswers({ painTriggerOther: e.target.value })}
                      />
                    )}
                  </>
                )}

                {stepId === 'pain_functional_impact' && (
                  <ChoiceList
                    options={PAIN_IMPACT_OPTIONS}
                    value={answers.painFunctionalImpact}
                    onChange={(v) => patchAnswers({ painFunctionalImpact: v })}
                  />
                )}

                {stepId === 'relevant_injury' && (
                  <ChoiceList
                    options={INJURY_STATUS_OPTIONS}
                    value={answers.hasRelevantInjury}
                    onChange={(v) =>
                      patchAnswers({
                        hasRelevantInjury: v,
                        ...(v === 'no' || v === 'unsure'
                          ? { injuryDetails: null, injuryCurrentlyLimitsMovement: null }
                          : {}),
                      })
                    }
                  />
                )}

                {stepId === 'injury_details' && (
                  <textarea
                    className={`${inputClassName} min-h-[120px] resize-y`}
                    placeholder="Descreva brevemente a lesão"
                    value={answers.injuryDetails || ''}
                    onChange={(e) => patchAnswers({ injuryDetails: e.target.value })}
                  />
                )}

                {stepId === 'injury_movement_limitation' && (
                  <ChoiceList
                    options={INJURY_LIMITS_OPTIONS}
                    value={answers.injuryCurrentlyLimitsMovement}
                    onChange={(v) => patchAnswers({ injuryCurrentlyLimitsMovement: v })}
                  />
                )}

                {stepId === 'relevant_surgery' && (
                  <ChoiceList
                    options={SURGERY_STATUS_OPTIONS}
                    value={answers.hasRelevantSurgery}
                    onChange={(v) =>
                      patchAnswers({
                        hasRelevantSurgery: v,
                        ...(v === 'no' ? { surgeryDetails: null, surgeryTiming: null } : {}),
                      })
                    }
                  />
                )}

                {stepId === 'surgery_details' && (
                  <textarea
                    className={`${inputClassName} min-h-[120px] resize-y`}
                    placeholder="Descreva a cirurgia"
                    value={answers.surgeryDetails || ''}
                    onChange={(e) => patchAnswers({ surgeryDetails: e.target.value })}
                  />
                )}

                {stepId === 'surgery_timing' && (
                  <ChoiceList
                    options={SURGERY_TIMING_OPTIONS}
                    value={answers.surgeryTiming}
                    onChange={(v) => patchAnswers({ surgeryTiming: v })}
                  />
                )}

                {stepId === 'movement_limitations' && (
                  <>
                    <MultiChoiceList
                      options={MOVEMENT_LIMITATION_OPTIONS}
                      values={answers.movementLimitations || []}
                      onToggle={(v) => toggleMulti('movementLimitations', v, MOVEMENT_LIMITATION_NONE)}
                    />
                    {(answers.movementLimitations || []).includes('other') && (
                      <input
                        className={inputClassName}
                        placeholder="Descreva a limitação"
                        value={answers.movementLimitationOther || ''}
                        onChange={(e) => patchAnswers({ movementLimitationOther: e.target.value })}
                      />
                    )}
                  </>
                )}

                {stepId === 'balance_falls' && (
                  <ChoiceList
                    options={BALANCE_FALL_OPTIONS}
                    value={answers.balanceFallHistory}
                    onChange={(v) => patchAnswers({ balanceFallHistory: v })}
                  />
                )}

                {stepId === 'shortness_of_breath' && (
                  <ChoiceList
                    options={SHORTNESS_OF_BREATH_OPTIONS}
                    value={answers.shortnessOfBreathOnLightEffort}
                    onChange={(v) => patchAnswers({ shortnessOfBreathOnLightEffort: v })}
                  />
                )}

                {stepId === 'chest_symptoms' && (
                  <ChoiceList
                    options={CHEST_SYMPTOM_OPTIONS}
                    value={answers.chestSymptomsDuringEffort}
                    onChange={(v) => patchAnswers({ chestSymptomsDuringEffort: v })}
                  />
                )}

                {stepId === 'dizziness_fainting' && (
                  <ChoiceList
                    options={DIZZINESS_OPTIONS}
                    value={answers.dizzinessOrFaintingDuringEffort}
                    onChange={(v) => patchAnswers({ dizzinessOrFaintingDuringEffort: v })}
                  />
                )}

                {stepId === 'palpitations' && (
                  <ChoiceList
                    options={PALPITATION_OPTIONS}
                    value={answers.palpitationsDuringExercise}
                    onChange={(v) => patchAnswers({ palpitationsDuringExercise: v })}
                  />
                )}

                {stepId === 'blood_pressure_advice' && (
                  <ChoiceList
                    options={BP_ADVICE_OPTIONS}
                    value={answers.uncontrolledBloodPressureAdvice}
                    onChange={(v) => patchAnswers({ uncontrolledBloodPressureAdvice: v })}
                  />
                )}

                {stepId === 'professional_restriction' && (
                  <ChoiceList
                    options={PROFESSIONAL_RESTRICTION_OPTIONS}
                    value={answers.hasProfessionalExerciseRestriction}
                    onChange={(v) =>
                      patchAnswers({
                        hasProfessionalExerciseRestriction: v,
                        ...(v === 'no' ? { professionalExerciseRestrictionDetails: null } : {}),
                      })
                    }
                  />
                )}

                {stepId === 'professional_restriction_details' && (
                  <textarea
                    className={`${inputClassName} min-h-[120px] resize-y`}
                    placeholder="Descreva a orientação ou restrição"
                    value={answers.professionalExerciseRestrictionDetails || ''}
                    onChange={(e) =>
                      patchAnswers({ professionalExerciseRestrictionDetails: e.target.value })
                    }
                  />
                )}

                {stepId === 'additional_safety_notes' && (
                  <textarea
                    className={`${inputClassName} min-h-[120px] resize-y`}
                    placeholder="Ex.: hérnia, limitação visual, problema de equilíbrio, recuperação recente, orientação médica..."
                    value={answers.additionalSafetyNotes || ''}
                    onChange={(e) => patchAnswers({ additionalSafetyNotes: e.target.value })}
                  />
                )}

                {stepId === 'safety_confirmation' && (
                  <ChoiceList
                    options={SAFETY_CONFIRMATION_OPTIONS}
                    value={safetyConfirmChoice}
                    onChange={(v) => {
                      setSafetyConfirmChoice(v as 'confirmed' | 'review');
                      setError(null);
                    }}
                  />
                )}

                {error && (
                  <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                    {error}
                  </p>
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleBack}
                    disabled={saving}
                    className="px-4 py-3 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Voltar
                  </button>
                  <button
                    type="button"
                    onClick={handleContinue}
                    disabled={saving}
                    className="flex-1 py-3 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                    Continuar
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

export default AvaliacaoAtividadeFisicaQuestionnaire;
