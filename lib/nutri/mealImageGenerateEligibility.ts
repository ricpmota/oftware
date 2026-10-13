/**
 * Quem pode ver a ação manual de gerar foto do prato.
 * Sem I/O — decisão de UI. Segurança real fica no POST.
 */

import { parseMealImageRecord, type MealImageRecord } from '@/lib/nutri/mealImageSource';
import { isMealImageReadyAndCurrent } from '@/lib/nutri/mealImageSlot';

export type MealDishGenerateKind = 'generate' | 'update';

export function hasLinkedNutritionistFromIds(ids: unknown): boolean {
  if (!Array.isArray(ids)) return false;
  return ids.some((id) => String(id || '').trim().length > 0);
}

export function isMealImagePatientViewer(params: {
  modoNutricionista?: boolean;
  somenteVisualizacao?: boolean;
  chatNutriAuthorKind?: 'patient' | 'doctor' | 'nutritionist' | string | null;
}): boolean {
  if (params.modoNutricionista) return false;
  if (params.somenteVisualizacao) return false;
  const kind = params.chatNutriAuthorKind;
  if (kind === 'doctor' || kind === 'nutritionist') return false;
  return true;
}

export function mealImageGenerationSlotKey(refeicaoKey: string, slotId: string): string {
  return `${refeicaoKey}:${slotId}`;
}

/**
 * Ação visível no MealDishImage. null = sem botão.
 * Não conhece pathname; o caller passa isPatientViewer / hasLinkedNutritionist.
 */
export function resolveMealDishGenerateAction(params: {
  isPatientViewer: boolean;
  hasLinkedNutritionist: boolean;
  slotExists: boolean;
  currentSourceHash: string;
  mealImage?: MealImageRecord | null;
  isGenerating?: boolean;
}): MealDishGenerateKind | null {
  if (!params.isPatientViewer) return null;
  if (params.hasLinkedNutritionist) return null;
  if (!params.slotExists) return null;
  const currentHash = String(params.currentSourceHash || '').trim();
  if (!currentHash) return null;
  if (params.isGenerating) return null;

  const mealImage = parseMealImageRecord(params.mealImage) || params.mealImage || undefined;
  if (isMealImageReadyAndCurrent(mealImage, currentHash)) return null;
  if (
    mealImage?.status === 'pending' &&
    (!mealImage.sourceHash || mealImage.sourceHash === currentHash)
  ) {
    return null;
  }

  const hadImage = Boolean(mealImage?.gcsPath || mealImage?.status === 'ready');
  const stale = Boolean(
    mealImage?.sourceHash && mealImage.sourceHash !== currentHash && hadImage
  );
  return stale ? 'update' : 'generate';
}

export function mealDishGenerateLabel(kind: MealDishGenerateKind | null): string {
  if (kind === 'update') return 'Atualizar imagem do prato';
  if (kind === 'generate') return 'Gerar imagem do prato';
  return '';
}

export const MEAL_DISH_REGENERATE_LABEL = 'Gerar nova imagem do prato';
export const MEAL_DISH_REGENERATE_TITLE = 'Gerar nova imagem';

export function resolveMealImageActorKind(params: {
  chatNutriAuthorKind?: 'patient' | 'doctor' | 'nutritionist' | string | null;
  modoNutricionista?: boolean;
}): 'patient' | 'doctor' | 'nutritionist' {
  if (params.chatNutriAuthorKind === 'doctor') return 'doctor';
  if (params.chatNutriAuthorKind === 'nutritionist') return 'nutritionist';
  if (params.chatNutriAuthorKind === 'patient') return 'patient';
  if (params.modoNutricionista) return 'nutritionist';
  return 'patient';
}

/**
 * Ação profissional de regenerar. null = sem botão.
 * Não usa pathname. Paciente nunca regenera.
 */
export function resolveMealDishRegenerateAction(params: {
  actorKind?: 'patient' | 'doctor' | 'nutritionist' | string | null;
  somenteVisualizacao?: boolean;
  slotExists: boolean;
  currentSourceHash: string;
  mealImage?: MealImageRecord | null;
  isGenerating?: boolean;
}): boolean {
  if (params.somenteVisualizacao) return false;
  if (params.actorKind !== 'doctor' && params.actorKind !== 'nutritionist') return false;
  if (!params.slotExists) return false;
  const currentHash = String(params.currentSourceHash || '').trim();
  if (!currentHash) return false;
  if (params.isGenerating) return false;

  const mealImage = parseMealImageRecord(params.mealImage) || params.mealImage || undefined;
  if (!mealImage) return false;
  if (
    mealImage.status === 'pending' &&
    (!mealImage.sourceHash || mealImage.sourceHash === currentHash)
  ) {
    return false;
  }

  const hasRepresentation = Boolean(
    mealImage.status === 'ready' || mealImage.status === 'failed' || mealImage.gcsPath
  );
  return hasRepresentation;
}
