import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { resolveMealDishGenerateAction } from '@/lib/nutri/mealImageGenerateEligibility';
import { buildMealImageSourceHash } from '@/lib/nutri/mealImageSource';

const ROOT = path.resolve(__dirname, '../..');

function readSrc(rel: string): string {
  return readFileSync(path.join(ROOT, rel), 'utf8');
}

const hash = buildMealImageSourceHash({
  itensDetalhe: [{ nome: 'Frango grelhado', peso_g: 120 }],
});

describe('ETAPA 06 — auto vs manual', () => {
  it('18. paciente com nutri não vê botão manual', () => {
    expect(
      resolveMealDishGenerateAction({
        isPatientViewer: true,
        hasLinkedNutritionist: true,
        slotExists: true,
        currentSourceHash: hash,
      })
    ).toBe(null);
  });

  it('19. paciente sem nutri mantém botão manual', () => {
    expect(
      resolveMealDishGenerateAction({
        isPatientViewer: true,
        hasLinkedNutritionist: false,
        slotExists: true,
        currentSourceHash: hash,
      })
    ).toBe('generate');
  });

  it('19. auto queue nunca envia forceRegenerate', () => {
    expect(readSrc('lib/nutri/useMealImageAutoGeneration.ts')).not.toContain('forceRegenerate:');
    expect(readSrc('lib/nutri/mealImageAutoQueue.ts')).not.toContain('forceRegenerate:');
  });

  it('fila automática só no hook central, não no MealDishImage', () => {
    expect(readSrc('components/nutri/MealDishImage.tsx')).not.toContain('useMealImageAutoGeneration');
    expect(readSrc('components/NutriContent.tsx')).toContain('useMealImageAutoGeneration');
    expect(readSrc('lib/nutri/useMealImageAutoGeneration.ts')).toContain("trigger: 'automatic'");
    expect(readSrc('components/NutriContent.tsx')).toContain("trigger: 'manual'");
  });
});
