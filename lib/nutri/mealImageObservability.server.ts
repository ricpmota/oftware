/**
 * Logs estruturados da geração de foto do prato.
 * Sem PII (nome, email, telefone, diagnóstico), sem prompt, sem base64, sem signed URL.
 */

export type MealImageLogResult =
  | 'generated'
  | 'already_current'
  | 'already_pending'
  | 'failed_vertex'
  | 'failed_vertex_configuration'
  | 'failed_storage'
  | 'source_changed'
  | 'forbidden'
  | 'invalid_source'
  | 'feature_disabled'
  | 'rate_limited'
  | 'invalid_input';

export type MealImageObservabilityActor = 'patient' | 'nutritionist' | 'doctor';

export function mealImageHashPrefix(value: string | undefined | null): string {
  const v = String(value || '').trim();
  return v.slice(0, 8);
}

export type MealImageGenerationLog = {
  event?: 'meal_image_generation';
  generationId?: string;
  actorKind?: MealImageObservabilityActor | string;
  trigger?: 'manual' | 'automatic' | string;
  forceRegenerate?: boolean;
  refeicaoKey?: string;
  slotId?: string;
  sourceHashPrefix?: string;
  result: MealImageLogResult;
  durationMs?: number;
  vertexMs?: number;
  uploadMs?: number;
  patientKey?: string;
};

export type MealImageVertexCallLog = {
  event?: 'meal_image_vertex_call';
  generationId: string;
  trigger?: 'manual' | 'automatic' | string;
  actorKind?: MealImageObservabilityActor | string;
  forceRegenerate?: boolean;
};

export function logMealImageGeneration(payload: MealImageGenerationLog): void {
  console.info('[meal_image_generation]', {
    event: 'meal_image_generation',
    ...payload,
  });
}

export function logMealImageVertexCall(payload: MealImageVertexCallLog): void {
  console.info('[meal_image_vertex_call]', {
    event: 'meal_image_vertex_call',
    ...payload,
  });
}
