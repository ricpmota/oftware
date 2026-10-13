/**
 * IDs de modelos Gemini no Vertex AI.
 * @see https://cloud.google.com/vertex-ai/generative-ai/docs/learn/model-versions
 *
 * gemini-2.0-flash / gemini-2.0-flash-001 foram descontinuados em 2026-06-01.
 */
export const DEFAULT_GEMINI_MODEL_ID = 'gemini-2.5-flash';

/** Modelo geral: GEMINI_MODEL_ID ou default estável. */
export function resolveGeminiModelId(): string {
  return process.env.GEMINI_MODEL_ID || DEFAULT_GEMINI_MODEL_ID;
}

/** Exames laboratoriais (PDF/imagem): GEMINI_EXAME_LAB_MODEL_ID > GEMINI_MODEL_ID > default. */
export function resolveExameLabGeminiModelId(): string {
  return (
    process.env.GEMINI_EXAME_LAB_MODEL_ID ||
    process.env.GEMINI_MODEL_ID ||
    DEFAULT_GEMINI_MODEL_ID
  );
}

/** BodyScan (fotos corporais multimodais): GEMINI_BODYSCAN_MODEL_ID > GEMINI_MODEL_ID > default. */
export function resolveBodyScanGeminiModelId(): string {
  return (
    process.env.GEMINI_BODYSCAN_MODEL_ID ||
    process.env.GEMINI_MODEL_ID ||
    DEFAULT_GEMINI_MODEL_ID
  );
}

/**
 * Fotos de prato do Cardápio.
 * Imagen 3/4 (`:predict`) foi descontinuado em 2026-06/08.
 * Padrão: Gemini 3.1 Flash Image (`generateContent`).
 * @see https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/gemini/3-1-flash-image
 */
export const DEFAULT_MEAL_IMAGE_MODEL_ID = 'gemini-3.1-flash-image';

export function resolveMealImageModelId(): string {
  return (
    process.env.VERTEX_MEAL_IMAGE_MODEL_ID ||
    process.env.GEMINI_MEAL_IMAGE_MODEL_ID ||
    DEFAULT_MEAL_IMAGE_MODEL_ID
  );
}
