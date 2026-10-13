export { normalizeExercise, normalizeExerciseCatalog } from '@/lib/trainingEngine/normalizeExercise';
export {
  mapAssessmentEquipmentToApi,
  isExerciseEquipmentCompatible,
} from '@/lib/trainingEngine/equipmentMap';
export { evaluateExerciseCompatibility } from '@/lib/trainingEngine/evaluateCompatibility';
export { scoreExercise, compareScoredExercises } from '@/lib/trainingEngine/scoreExercise';
export { buildWeeklyStructure } from '@/lib/trainingEngine/buildWeeklyStructure';
export { selectExerciseForSlot } from '@/lib/trainingEngine/selectExerciseForSlot';
export { buildDeterministicWorkoutPlan } from '@/lib/trainingEngine/buildDeterministicWorkoutPlan';
export { validateWorkoutPlanDraft } from '@/lib/trainingEngine/validateWorkoutPlanDraft';
export { normalizeTrainingWeekday, normalizeTrainingWeekdays } from '@/lib/trainingEngine/normalizeWeekday';
export { TRAINING_ENGINE_SCORING_V1, DIVERSITY_LIMITS_V1 } from '@/lib/trainingEngine/scoringConstants';
export {
  replaceWorkoutDraftExercise,
  undoWorkoutDraftExerciseReplacement,
} from '@/lib/trainingEngine/replaceWorkoutDraftExercise';
export { listReplacementCandidates } from '@/lib/trainingEngine/listReplacementCandidates';
export { loadCatalogForTrainingEngine } from '@/lib/trainingEngine/loadCatalogForTrainingEngine';
export { buildDraftFingerprint } from '@/lib/trainingEngine/buildDraftFingerprint';
export {
  buildPublishedTrainingPlan,
  buildPublishKey,
} from '@/lib/trainingEngine/buildPublishedTrainingPlan';
export { describeRpeRange } from '@/lib/trainingEngine/rpePatientCopy';
export {
  labelBlocker,
  labelWarning,
  labelSelectionReason,
  labelExerciseRole,
  labelWeekday,
  labelSplit,
} from '@/lib/trainingEngine/draftLabels';
