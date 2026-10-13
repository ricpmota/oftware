import { describe, expect, it } from 'vitest';
import { buildMealImageSourceHash } from '@/lib/nutri/mealImageSource';
import {
  mealDishImageAlt,
  mealDishImageInstanceKey,
  mealDishImageMode,
  mealDishImageUrlCacheKey,
  shouldFetchMealDishImageUrl,
} from '@/lib/nutri/mealImageDisplay';

const hashAtual = buildMealImageSourceHash({
  itensDetalhe: [{ nome: 'Frango grelhado', peso_g: 120 }],
});

const readyAtual = {
  gcsPath: 'cardapio/pac-1/almoco/slot_almoco_1/abc.webp',
  sourceHash: hashAtual,
  status: 'ready' as const,
};

describe('mealDishImageDisplay', () => {
  it('1. ready + hash atual → busca signed URL (modo loading até ter URL, depois photo)', () => {
    expect(shouldFetchMealDishImageUrl({ mealImage: readyAtual, currentSourceHash: hashAtual })).toBe(
      true
    );
    expect(
      mealDishImageMode({
        mealImage: readyAtual,
        currentSourceHash: hashAtual,
        loading: true,
        imageUrl: null,
      })
    ).toBe('loading');
    expect(
      mealDishImageMode({
        mealImage: readyAtual,
        currentSourceHash: hashAtual,
        loading: false,
        imageUrl: 'https://signed.example/foto.webp',
      })
    ).toBe('photo');
  });

  it('2. sem mealImage → placeholder e não busca URL', () => {
    expect(shouldFetchMealDishImageUrl({ mealImage: undefined, currentSourceHash: hashAtual })).toBe(
      false
    );
    expect(
      mealDishImageMode({ mealImage: undefined, currentSourceHash: hashAtual, loading: false })
    ).toBe('placeholder');
  });

  it('3. pending sem foto → skeleton e não busca URL', () => {
    const pending = { status: 'pending' as const, sourceHash: hashAtual };
    expect(shouldFetchMealDishImageUrl({ mealImage: pending, currentSourceHash: hashAtual })).toBe(
      false
    );
    expect(
      mealDishImageMode({ mealImage: pending, currentSourceHash: hashAtual, loading: false })
    ).toBe('loading');
  });

  it('16. pending com gcsPath atual → mantém a foto anterior', () => {
    const pendingComFoto = {
      ...readyAtual,
      status: 'pending' as const,
      generationStartedAt: '2026-09-04T12:00:00.000Z',
    };
    expect(
      shouldFetchMealDishImageUrl({ mealImage: pendingComFoto, currentSourceHash: hashAtual })
    ).toBe(true);
    expect(
      mealDishImageMode({
        mealImage: pendingComFoto,
        currentSourceHash: hashAtual,
        imageUrl: 'https://signed.example/foto.webp',
        loading: false,
      })
    ).toBe('photo');
  });

  it('4. failed → placeholder e não busca URL', () => {
    const failed = {
      gcsPath: 'cardapio/pac-1/almoco/slot_almoco_1/old.webp',
      sourceHash: hashAtual,
      status: 'failed' as const,
    };
    expect(shouldFetchMealDishImageUrl({ mealImage: failed, currentSourceHash: hashAtual })).toBe(
      false
    );
    expect(
      mealDishImageMode({ mealImage: failed, currentSourceHash: hashAtual, loading: false })
    ).toBe('placeholder');
  });

  it('5. hash desatualizado → placeholder e não busca URL', () => {
    const stale = { ...readyAtual, sourceHash: '0000000000000000' };
    expect(shouldFetchMealDishImageUrl({ mealImage: stale, currentSourceHash: hashAtual })).toBe(
      false
    );
    expect(
      mealDishImageMode({
        mealImage: stale,
        currentSourceHash: hashAtual,
        imageUrl: 'https://signed.example/antiga.webp',
        loading: false,
      })
    ).toBe('placeholder');
  });

  it('6. troca de opção muda a instance key (foto anterior some no remount)', () => {
    const op1 = mealDishImageInstanceKey({
      patientId: 'pac-1',
      refeicaoKey: 'almoco',
      slotId: 'slot_almoco_1',
    });
    const op2 = mealDishImageInstanceKey({
      patientId: 'pac-1',
      refeicaoKey: 'almoco',
      slotId: 'slot_almoco_2',
    });
    expect(op1).not.toBe(op2);
    expect(
      mealDishImageUrlCacheKey({
        patientId: 'pac-1',
        refeicaoKey: 'almoco',
        slotId: 'slot_almoco_1',
        sourceHash: 'h1',
      })
    ).not.toBe(
      mealDishImageUrlCacheKey({
        patientId: 'pac-1',
        refeicaoKey: 'almoco',
        slotId: 'slot_almoco_2',
        sourceHash: 'h2',
      })
    );
  });

  it('15. gcsPath novo invalida a cache key da signed URL', () => {
    const a = mealDishImageUrlCacheKey({
      patientId: 'pac-1',
      refeicaoKey: 'almoco',
      slotId: 'slot_almoco_1',
      sourceHash: hashAtual,
      gcsPath: 'cardapio/pac-1/almoco/slot_almoco_1/h/old.webp',
    });
    const b = mealDishImageUrlCacheKey({
      patientId: 'pac-1',
      refeicaoKey: 'almoco',
      slotId: 'slot_almoco_1',
      sourceHash: hashAtual,
      gcsPath: 'cardapio/pac-1/almoco/slot_almoco_1/h/new.webp',
    });
    expect(a).not.toBe(b);
    expect(
      mealDishImageInstanceKey({
        patientId: 'pac-1',
        refeicaoKey: 'almoco',
        slotId: 'slot_almoco_1',
        gcsPath: 'old.webp',
      })
    ).not.toBe(
      mealDishImageInstanceKey({
        patientId: 'pac-1',
        refeicaoKey: 'almoco',
        slotId: 'slot_almoco_1',
        gcsPath: 'new.webp',
      })
    );
  });

  it('alt não inclui alimentos', () => {
    expect(mealDishImageAlt('Café da Manhã')).toBe('Imagem ilustrativa de Café da Manhã');
    expect(mealDishImageAlt('Almoço')).toBe('Imagem ilustrativa do almoço');
    expect(mealDishImageAlt('Almoço')).not.toContain('Frango');
  });
});
