import { afterEach, describe, expect, it, vi } from 'vitest';
import { MEAL_IMAGE_URL_API_PATH } from '@/lib/nutri/mealImageDisplay';
import {
  clearMealDishImageUrlCache,
  fetchMealDishImageUrl,
} from '@/lib/nutri/mealImageUrlClient';

afterEach(() => {
  clearMealDishImageUrlCache();
});

describe('fetchMealDishImageUrl', () => {
  it('1. ready atual busca GET /api/nutri/meal-image e não chama generate', async () => {
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      expect(url).toContain(MEAL_IMAGE_URL_API_PATH);
      expect(url).not.toContain('/api/nutri/meal-image/generate');
      expect(url).not.toContain('gcsPath=');
      return {
        ok: true,
        json: async () => ({
          ok: true,
          imageUrl: 'https://signed.example/a.webp',
          status: 'ready',
          sourceHash: 'h1',
        }),
      } as Response;
    });

    const url = await fetchMealDishImageUrl(
      { patientId: 'pac-1', refeicaoKey: 'almoco', slotId: 'slot_almoco_1', sourceHash: 'h1' },
      { fetchImpl, getToken: async () => 'token' }
    );
    expect(url).toBe('https://signed.example/a.webp');
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('6. troca Opção 01 → 02 busca URL nova e não reutiliza a anterior', async () => {
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      const slot = url.includes('slot_almoco_2') ? '2' : '1';
      return {
        ok: true,
        json: async () => ({
          ok: true,
          imageUrl: `https://signed.example/op${slot}.webp`,
          status: 'ready',
        }),
      } as Response;
    });

    const a = await fetchMealDishImageUrl(
      { patientId: 'pac-1', refeicaoKey: 'almoco', slotId: 'slot_almoco_1', sourceHash: 'h1' },
      { fetchImpl, getToken: async () => 'token' }
    );
    const b = await fetchMealDishImageUrl(
      { patientId: 'pac-1', refeicaoKey: 'almoco', slotId: 'slot_almoco_2', sourceHash: 'h2' },
      { fetchImpl, getToken: async () => 'token' }
    );
    expect(a).toBe('https://signed.example/op1.webp');
    expect(b).toBe('https://signed.example/op2.webp');
    expect(a).not.toBe(b);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('15. gcsPath diferente busca signed URL de novo', async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      json: async () => ({ ok: true, imageUrl: `https://signed.example/${fetchImpl.mock.calls.length}.webp` }),
    })) as unknown as typeof fetch;
    const base = {
      patientId: 'pac-1',
      refeicaoKey: 'almoco',
      slotId: 'slot_almoco_1',
      sourceHash: 'h1',
    };
    const first = await fetchMealDishImageUrl(
      { ...base, gcsPath: 'cardapio/pac-1/almoco/slot_almoco_1/h1/old.webp' },
      { fetchImpl, getToken: async () => 'token' }
    );
    const second = await fetchMealDishImageUrl(
      { ...base, gcsPath: 'cardapio/pac-1/almoco/slot_almoco_1/h1/new.webp' },
      { fetchImpl, getToken: async () => 'token' }
    );
    expect(first).not.toBe(second);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('Strict Mode: duas chamadas simultâneas da mesma chave fazem um fetch', async () => {
    let calls = 0;
    const fetchImpl = vi.fn(
      () =>
        new Promise<Response>((resolve) => {
          calls += 1;
          setTimeout(
            () =>
              resolve({
                ok: true,
                json: async () => ({ ok: true, imageUrl: 'https://signed.example/once.webp' }),
              } as Response),
            20
          );
        })
    );
    const req = {
      patientId: 'pac-1',
      refeicaoKey: 'almoco',
      slotId: 'slot_almoco_1',
      sourceHash: 'h1',
    };
    const [a, b] = await Promise.all([
      fetchMealDishImageUrl(req, { fetchImpl, getToken: async () => 'token' }),
      fetchMealDishImageUrl(req, { fetchImpl, getToken: async () => 'token' }),
    ]);
    expect(a).toBe(b);
    expect(calls).toBe(1);
  });

  it('abort não propaga erro visual — retorna null', async () => {
    const fetchImpl = vi.fn(async (_url: RequestInfo | URL, init?: RequestInit) => {
      const err = new Error('Aborted');
      err.name = 'AbortError';
      if (init?.signal?.aborted) throw err;
      throw err;
    });
    const url = await fetchMealDishImageUrl(
      { patientId: 'pac-1', refeicaoKey: 'almoco', slotId: 'slot_almoco_1', sourceHash: 'h1' },
      { fetchImpl, getToken: async () => 'token', signal: AbortSignal.abort() }
    );
    expect(url).toBeNull();
  });
});
