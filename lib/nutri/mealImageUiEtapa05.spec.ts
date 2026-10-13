import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');

function readSrc(rel: string): string {
  return readFileSync(path.join(ROOT, rel), 'utf8');
}

describe('ETAPA 05 — geração só no clique', () => {
  it('17. nenhum POST automático em mount/useEffect', () => {
    const nutri = readSrc('components/NutriContent.tsx');
    const dish = readSrc('components/nutri/MealDishImage.tsx');
    const urlClient = readSrc('lib/nutri/mealImageUrlClient.ts');

    expect(dish).not.toContain('/api/nutri/meal-image/generate');
    expect(urlClient).not.toContain('/api/nutri/meal-image/generate');

    const effects = [...nutri.matchAll(/useEffect\(\(\) => \{[\s\S]*?\n  \}, \[/g)].map((m) => m[0]);
    for (const effect of effects) {
      expect(effect).not.toContain('requestMealImageGeneration');
      expect(effect).not.toContain('/api/nutri/meal-image/generate');
      expect(effect).not.toContain('gerarImagemDoPrato');
    }
    expect(nutri).toContain('onGenerate=');
    expect(nutri).toContain('requestMealImageGeneration');
  });

  it('seletor superior do cardápio permanece 28×28', () => {
    const src = readSrc('components/NutriContent.tsx');
    expect(src).toContain('flex h-7 w-7 items-center justify-center rounded-lg');
    expect(src).toContain('<Icon className="h-3.5 w-3.5" />');
  });

  it('tamanho da miniatura da ETAPA 04 permanece', () => {
    const src = readSrc('components/nutri/MealDishImage.tsx');
    expect(src).toContain(
      'relative h-[76px] w-[76px] shrink-0 overflow-hidden rounded-xl border sm:h-[88px] sm:w-[88px] lg:h-24 lg:w-24'
    );
  });

  it('18. GET de signed URL continua no cliente de leitura', () => {
    const urlClient = readSrc('lib/nutri/mealImageUrlClient.ts');
    const dish = readSrc('components/nutri/MealDishImage.tsx');
    expect(urlClient).toContain("MEAL_IMAGE_URL_API_PATH");
    expect(dish).toContain('fetchMealDishImageUrl');
    expect(dish).not.toContain('requestMealImageGeneration');
  });
});
