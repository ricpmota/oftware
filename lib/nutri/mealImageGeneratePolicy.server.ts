/**
 * Paciente autenticado: manual só sem nutricionista; automatic só COM vínculo ativo.
 * Nutri/médico: automatic exige vínculo do paciente; manual continua permitido.
 */

import type { Firestore } from 'firebase-admin/firestore';
import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import { activeNutritionistIdForPatient } from '@/lib/nutri/ensureNutriCheckInPublicLink';
import type { MealImageAccess } from '@/lib/nutri/mealImageAccess.server';

export const PATIENT_HAS_LINKED_NUTRITIONIST = 'PATIENT_HAS_LINKED_NUTRITIONIST';
export const AUTOMATIC_REQUIRES_LINKED_NUTRITIONIST = 'AUTOMATIC_REQUIRES_LINKED_NUTRITIONIST';
export const INVALID_MEAL_IMAGE_TRIGGER = 'INVALID_MEAL_IMAGE_TRIGGER';
export const FORBIDDEN_MEAL_IMAGE_REGENERATION = 'FORBIDDEN_MEAL_IMAGE_REGENERATION';
export const INVALID_FORCE_REGENERATE_TRIGGER = 'INVALID_FORCE_REGENERATE_TRIGGER';

export type MealImageGenerateTrigger = 'manual' | 'automatic';

export type PatientMealImageGenerationPolicy =
  | { ok: true }
  | {
      ok: false;
      status: 400 | 403;
      code:
        | typeof PATIENT_HAS_LINKED_NUTRITIONIST
        | typeof AUTOMATIC_REQUIRES_LINKED_NUTRITIONIST
        | typeof INVALID_MEAL_IMAGE_TRIGGER
        | typeof FORBIDDEN_MEAL_IMAGE_REGENERATION
        | typeof INVALID_FORCE_REGENERATE_TRIGGER;
      error: string;
    };

export function parseMealImageGenerateTrigger(value: unknown): MealImageGenerateTrigger | 'invalid' {
  if (value == null || value === '') return 'manual';
  if (value === 'manual' || value === 'automatic') return value;
  return 'invalid';
}

export function parseMealImageForceRegenerate(value: unknown): boolean {
  return value === true;
}

/** forceRegenerate só para nutricionista/médico já autorizados no acesso. Automatic nunca force. */
export function assertMealImageForceRegenerate(params: {
  access: MealImageAccess;
  trigger: MealImageGenerateTrigger;
}): PatientMealImageGenerationPolicy {
  if (params.trigger === 'automatic') {
    return {
      ok: false,
      status: 400,
      code: INVALID_FORCE_REGENERATE_TRIGGER,
      error: 'A geração automática não pode forçar uma nova imagem.',
    };
  }
  if (params.access.role !== 'doctor' && params.access.role !== 'nutritionist') {
    return {
      ok: false,
      status: 403,
      code: FORBIDDEN_MEAL_IMAGE_REGENERATION,
      error: 'Apenas o nutricionista ou o médico podem gerar uma nova imagem deste prato.',
    };
  }
  return { ok: true };
}

export async function assertPatientMayRequestMealImageGeneration(params: {
  access: MealImageAccess;
  trigger?: MealImageGenerateTrigger;
  hasActiveNutritionist?: (pacienteDocId: string) => Promise<boolean>;
}): Promise<PatientMealImageGenerationPolicy> {
  const trigger = params.trigger || 'manual';
  const hasActive =
    params.hasActiveNutritionist ||
    (async (pacienteDocId: string) => {
      const id = await activeNutritionistIdForPatient(getFirestoreAdmin(), pacienteDocId);
      return Boolean(id);
    });
  const linked = await hasActive(params.access.pacienteDocId);

  if (trigger === 'automatic') {
    if (!linked) {
      return {
        ok: false,
        status: 403,
        code: AUTOMATIC_REQUIRES_LINKED_NUTRITIONIST,
        error: 'Geração automática exige nutricionista vinculada.',
      };
    }
    return { ok: true };
  }

  if (params.access.role === 'patient' && linked) {
    return {
      ok: false,
      status: 403,
      code: PATIENT_HAS_LINKED_NUTRITIONIST,
      error: 'Pacientes com nutricionista vinculada não geram a imagem manualmente.',
    };
  }
  return { ok: true };
}

export function createHasActiveNutritionistFromDb(db: Firestore) {
  return async (pacienteDocId: string) => {
    const id = await activeNutritionistIdForPatient(db, pacienteDocId);
    return Boolean(id);
  };
}
