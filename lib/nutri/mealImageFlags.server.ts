/**
 * Kill switch de novas gerações. GET de fotos existentes não usa isto.
 * Default: ligado. Só desliga com MEAL_IMAGE_GENERATION_ENABLED=false.
 */

export const MEAL_IMAGE_GENERATION_DISABLED_CODE = 'MEAL_IMAGE_GENERATION_DISABLED';

export function isMealImageGenerationEnabled(
  env: NodeJS.ProcessEnv = process.env
): boolean {
  return env.MEAL_IMAGE_GENERATION_ENABLED !== 'false';
}
