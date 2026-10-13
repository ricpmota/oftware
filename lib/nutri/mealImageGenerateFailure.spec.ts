import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
  MEAL_IMAGE_PROVIDER_CONFIGURATION_ERROR,
  shouldStopMealImageAutoQueue,
} from '@/lib/nutri/mealImageGenerateFailure';

const ROOT = path.resolve(__dirname, '../..');

function readSrc(rel: string): string {
  return readFileSync(path.join(ROOT, rel), 'utf8');
}

describe('falha sistêmica da geração de imagem', () => {
  it('erro de configuração interrompe a fila; erro de slot não', () => {
    expect(
      shouldStopMealImageAutoQueue({
        ok: false,
        code: MEAL_IMAGE_PROVIDER_CONFIGURATION_ERROR,
        stopAutomaticQueue: true,
      })
    ).toBe(true);
    expect(shouldStopMealImageAutoQueue({ ok: false, code: 'GENERATION_FAILED' })).toBe(false);
    expect(shouldStopMealImageAutoQueue({ ok: false, code: 'MEAL_COMPOSITION_INSUFFICIENT' })).toBe(false);
    expect(shouldStopMealImageAutoQueue({ ok: false, code: 'SLOT_NOT_FOUND' })).toBe(false);
    expect(
      shouldStopMealImageAutoQueue({
        ok: true,
        code: undefined,
      })
    ).toBe(false);
  });

  it('payload Vertex usa ALLOW_NONE e o client não envia dontAllow', () => {
    const vertex = readSrc('lib/gcp/mealImageVertexClient.server.ts');
    expect(vertex).toContain("personGeneration: 'ALLOW_NONE'");
    expect(vertex).not.toContain('dontAllow');
    expect(vertex).not.toContain('retries');
  });

  it('toast manual permanece genérico', () => {
    const nutri = readSrc('components/NutriContent.tsx');
    expect(nutri).toContain('Não foi possível gerar a imagem agora. Tente novamente.');
    expect(nutri).not.toContain('generation_config');
    expect(nutri).not.toContain('person_generation');
    expect(readSrc('lib/nutri/mealImageGenerateClient.ts')).toContain(
      'Não foi possível gerar a imagem agora. Tente novamente.'
    );
    expect(readSrc('lib/nutri/useMealImageAutoGeneration.ts')).not.toContain('forceRegenerate:');
  });
});
