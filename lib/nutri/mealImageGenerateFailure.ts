/**
 * Classificação de falha da geração de foto do prato.
 * Sem UI. Usado pelo endpoint, client e fila automática.
 */

export const MEAL_IMAGE_PROVIDER_CONFIGURATION_ERROR = 'MEAL_IMAGE_PROVIDER_CONFIGURATION_ERROR';

export function shouldStopMealImageAutoQueue(result: {
  ok: boolean;
  code?: string;
  stopAutomaticQueue?: boolean;
}): boolean {
  if (result.ok) return false;
  if (result.stopAutomaticQueue === true) return true;
  return result.code === MEAL_IMAGE_PROVIDER_CONFIGURATION_ERROR;
}
