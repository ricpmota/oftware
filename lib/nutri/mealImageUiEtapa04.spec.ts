import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');

function readSrc(rel: string): string {
  return readFileSync(path.join(ROOT, rel), 'utf8');
}

describe('ETAPA 04 — GET de signed URL sem geração no display', () => {
  it('MealDishImage e url client não chamam generate', () => {
    for (const file of [
      'components/nutri/MealDishImage.tsx',
      'lib/nutri/mealImageUrlClient.ts',
      'lib/nutri/mealImageDisplay.ts',
    ]) {
      const src = readSrc(file);
      expect(src, file).not.toContain('/api/nutri/meal-image/generate');
    }
  });

  it('seletor superior do cardápio permanece 28×28 (h-7 w-7)', () => {
    const src = readSrc('components/NutriContent.tsx');
    expect(src).toContain('flex h-7 w-7 items-center justify-center rounded-lg');
    expect(src).toContain("<Icon className=\"h-3.5 w-3.5\" />");
  });
});
