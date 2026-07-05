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
