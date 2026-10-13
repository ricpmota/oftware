import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildMealImageSourceHash } from '@/lib/nutri/mealImageSource';
import { resolveMealImageAfterFailedGeneration } from '@/lib/nutri/mealImagePlanoStore.server';
import {
  resolveMealDishGenerateAction,
  resolveMealDishRegenerateAction,
} from '@/lib/nutri/mealImageGenerateEligibility';
import { buildLegacyMealImageGcsPath, buildMealImageGcsPath } from '@/lib/nutri/mealImageStorage.server';

const ROOT = path.resolve(__dirname, '../..');

function readSrc(rel: string): string {
  return readFileSync(path.join(ROOT, rel), 'utf8');
}

const hash = buildMealImageSourceHash({
  itensDetalhe: [{ nome: 'Frango grelhado', peso_g: 120 }],
});

const ready = {
  gcsPath: 'cardapio/p/almoco/slot_almoco_1/x.webp',
  sourceHash: hash,
  status: 'ready' as const,
  generatedAt: '2026-09-01T00:00:00.000Z',
};

describe('ETAPA 07 — regeneração profissional', () => {
  it('19. auto queue nunca envia forceRegenerate', () => {
    expect(readSrc('lib/nutri/useMealImageAutoGeneration.ts')).not.toContain('forceRegenerate:');
    expect(readSrc('lib/nutri/mealImageAutoQueue.ts')).not.toContain('forceRegenerate:');
  });

  it('20. fluxo paciente sem nutri permanece intacto', () => {
    expect(
      resolveMealDishGenerateAction({
        isPatientViewer: true,
        hasLinkedNutritionist: false,
        slotExists: true,
        currentSourceHash: hash,
      })
    ).toBe('generate');
    expect(
      resolveMealDishGenerateAction({
        isPatientViewer: true,
        hasLinkedNutritionist: false,
        slotExists: true,
        currentSourceHash: hash,
        mealImage: ready,
      })
    ).toBe(null);
    expect(
      resolveMealDishRegenerateAction({
        actorKind: 'patient',
        slotExists: true,
        currentSourceHash: hash,
        mealImage: ready,
      })
    ).toBe(false);
  });

  it('NutriContent distingue actor e envia force só no clique profissional', () => {
    const nutri = readSrc('components/NutriContent.tsx');
    expect(nutri).toContain('resolveMealImageActorKind');
    expect(nutri).toContain('forceRegenerate: true');
    expect(nutri).toContain("trigger: 'manual'");
    expect(readSrc('components/nutri/MealDishImage.tsx')).toContain('MEAL_DISH_REGENERATE_LABEL');
    expect(readSrc('lib/nutri/mealImageGenerateEligibility.ts')).toContain(
      "export const MEAL_DISH_REGENERATE_LABEL = 'Gerar nova imagem do prato'"
    );
    expect(readSrc('components/nutri/MealDishImage.tsx')).not.toContain('requestMealImageGeneration');
  });

  it('22. nenhuma migration/backfill de path', () => {
    for (const file of [
      'lib/nutri/mealImageStorage.server.ts',
      'lib/nutri/mealImageGenerateService.server.ts',
      'lib/nutri/mealImagePlanoStore.server.ts',
    ]) {
      const src = readSrc(file);
      expect(src, file).not.toMatch(/backfill/i);
      expect(src, file).not.toMatch(/migrat/i);
    }
  });

  it('21. path legado e versionado coexistem', () => {
    const legacy = buildLegacyMealImageGcsPath({
      patientId: 'p1',
      refeicaoKey: 'almoco',
      slotId: 'slot_almoco_1',
      sourceHash: 'abcabcabcabcabca',
      mimeType: 'image/webp',
    });
    const versioned = buildMealImageGcsPath({
      patientId: 'p1',
      refeicaoKey: 'almoco',
      slotId: 'slot_almoco_1',
      sourceHash: 'abcabcabcabcabca',
      mimeType: 'image/webp',
      generationId: 'gen1',
    });
    expect(legacy).toBe('cardapio/p1/almoco/slot_almoco_1/abcabcabcabcabca.webp');
    expect(versioned).toBe('cardapio/p1/almoco/slot_almoco_1/abcabcabcabcabca/gen1.webp');
    expect(legacy).not.toBe(versioned);
  });

  it('17. falha com ready anterior restaura a foto', () => {
    const restored = resolveMealImageAfterFailedGeneration({
      currentHash: hash,
      attemptedHash: hash,
      previousMealImage: ready,
      existing: { ...ready, status: 'pending', generationStartedAt: 'now' },
      previousGcsPath: ready.gcsPath,
    });
    expect(restored).toMatchObject({
      status: 'ready',
      gcsPath: ready.gcsPath,
      sourceHash: hash,
      generatedAt: ready.generatedAt,
    });
  });

  it('falha sem ready anterior → failed', () => {
    const failed = resolveMealImageAfterFailedGeneration({
      currentHash: hash,
      attemptedHash: hash,
      existing: { status: 'pending', sourceHash: hash },
    });
    expect(failed.status).toBe('failed');
  });
});
