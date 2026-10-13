import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  clearMealImageGenerateInflight,
  MEAL_IMAGE_GENERATE_API_PATH,
  requestMealImageGeneration,
} from '@/lib/nutri/mealImageGenerateClient';
import { patchSlotMealImage } from '@/lib/nutri/mealImageSlotPatch';

afterEach(() => {
  clearMealImageGenerateInflight();
});

const req = {
  patientId: 'pac-1',
  refeicaoKey: 'almoco',
  slotId: 'slot_almoco_1',
};

describe('requestMealImageGeneration', () => {
  it('8. clique → exatamente um POST no endpoint de generate', async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        ok: true,
        generated: true,
        mealImage: {
          gcsPath: 'cardapio/pac-1/almoco/slot_almoco_1/h.webp',
          sourceHash: 'h',
          status: 'ready',
        },
      }),
    })) as unknown as typeof fetch;

    const result = await requestMealImageGeneration(req, {
      fetchImpl,
      getToken: async () => 'token',
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.generated).toBe(true);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = vi.mocked(fetchImpl).mock.calls[0];
    expect(String(url)).toBe(MEAL_IMAGE_GENERATE_API_PATH);
    expect((init as RequestInit).method).toBe('POST');
    const body = JSON.parse(String((init as RequestInit).body));
    expect(body.trigger).toBe('manual');
    expect(body).not.toHaveProperty('forceRegenerate');
  });

  it('envia trigger automatic quando a fila pede', async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        ok: true,
        generated: true,
        mealImage: { gcsPath: 'x.webp', status: 'ready', sourceHash: 'h' },
      }),
    })) as unknown as typeof fetch;
    await requestMealImageGeneration(
      { ...req, trigger: 'automatic' },
      { fetchImpl, getToken: async () => 'token' }
    );
    const body = JSON.parse(String((vi.mocked(fetchImpl).mock.calls[0][1] as RequestInit).body));
    expect(body.trigger).toBe('automatic');
    expect(body).not.toHaveProperty('forceRegenerate');
  });

  it('5–6. profissional envia forceRegenerate true', async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        ok: true,
        generated: true,
        mealImage: { gcsPath: 'new.webp', status: 'ready', sourceHash: 'h' },
      }),
    })) as unknown as typeof fetch;
    await requestMealImageGeneration(
      { ...req, trigger: 'manual', forceRegenerate: true },
      { fetchImpl, getToken: async () => 'token' }
    );
    const body = JSON.parse(String((vi.mocked(fetchImpl).mock.calls[0][1] as RequestInit).body));
    expect(body.trigger).toBe('manual');
    expect(body.forceRegenerate).toBe(true);
  });

  it('12. duplo clique com force → um POST', async () => {
    let calls = 0;
    const fetchImpl = vi.fn(
      () =>
        new Promise<Response>((resolve) => {
          calls += 1;
          setTimeout(
            () =>
              resolve({
                ok: true,
                json: async () => ({
                  ok: true,
                  generated: true,
                  mealImage: { gcsPath: 'p.webp', status: 'ready', sourceHash: 'h' },
                }),
              } as Response),
            25
          );
        })
    );
    const forceReq = { ...req, forceRegenerate: true as const };
    await Promise.all([
      requestMealImageGeneration(forceReq, { fetchImpl, getToken: async () => 'token' }),
      requestMealImageGeneration(forceReq, { fetchImpl, getToken: async () => 'token' }),
    ]);
    expect(calls).toBe(1);
  });

  it('9. duplo clique durante loading → um POST', async () => {
    let calls = 0;
    const fetchImpl = vi.fn(
      () =>
        new Promise<Response>((resolve) => {
          calls += 1;
          setTimeout(
            () =>
              resolve({
                ok: true,
                json: async () => ({
                  ok: true,
                  generated: true,
                  mealImage: { gcsPath: 'p.webp', status: 'ready', sourceHash: 'h' },
                }),
              } as Response),
            25
          );
        })
    );
    const [a, b] = await Promise.all([
      requestMealImageGeneration(req, { fetchImpl, getToken: async () => 'token' }),
      requestMealImageGeneration(req, { fetchImpl, getToken: async () => 'token' }),
    ]);
    expect(a.ok && b.ok).toBe(true);
    expect(calls).toBe(1);
  });

  it('10. generated true → slot local fica ready', async () => {
    const mealImage = {
      gcsPath: 'cardapio/pac-1/almoco/slot_almoco_1/h.webp',
      sourceHash: 'h',
      status: 'ready' as const,
    };
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      json: async () => ({ ok: true, generated: true, mealImage }),
    })) as unknown as typeof fetch;
    const result = await requestMealImageGeneration(req, {
      fetchImpl,
      getToken: async () => 'token',
    });
    expect(result.ok && result.mealImage.status).toBe('ready');
    const slots = patchSlotMealImage(
      [{ id: 'slot_almoco_1' }, { id: 'slot_almoco_2' }],
      'slot_almoco_1',
      result.ok ? result.mealImage : {}
    );
    expect(slots[0].mealImage).toMatchObject(mealImage);
    expect(slots[1].mealImage).toBeUndefined();
  });

  it('11. already_current → foto passa a aparecer (ready local)', async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        ok: true,
        generated: false,
        reason: 'already_current',
        mealImage: { gcsPath: 'x.webp', status: 'ready', sourceHash: 'h' },
      }),
    })) as unknown as typeof fetch;
    const result = await requestMealImageGeneration(req, {
      fetchImpl,
      getToken: async () => 'token',
    });
    expect(result).toMatchObject({ ok: true, generated: false, reason: 'already_current' });
    if (result.ok) expect(result.mealImage.status).toBe('ready');
  });

  it('12. already_pending → pending, sem novo POST na mesma chave', async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        ok: true,
        generated: false,
        reason: 'already_pending',
        mealImage: { status: 'pending', sourceHash: 'h' },
      }),
    })) as unknown as typeof fetch;
    const result = await requestMealImageGeneration(req, {
      fetchImpl,
      getToken: async () => 'token',
    });
    expect(result).toMatchObject({ ok: true, reason: 'already_pending' });
    if (result.ok) expect(result.mealImage.status).toBe('pending');
  });

  it('13. source_changed → ação pode voltar (não ready atual)', async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        ok: true,
        generated: false,
        reason: 'source_changed_during_generation',
        mealImage: { status: 'failed', sourceHash: 'old' },
      }),
    })) as unknown as typeof fetch;
    const result = await requestMealImageGeneration(req, {
      fetchImpl,
      getToken: async () => 'token',
    });
    expect(result).toMatchObject({
      ok: true,
      reason: 'source_changed_during_generation',
    });
  });

  it('14. erro → mensagem amigável, sem detalhe técnico', async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: false,
      status: 502,
      json: async () => ({
        ok: false,
        code: 'GENERATION_FAILED',
        error: 'Vertex 429 quota',
      }),
    })) as unknown as typeof fetch;
    const result = await requestMealImageGeneration(req, {
      fetchImpl,
      getToken: async () => 'token',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toBe('Não foi possível gerar a imagem agora. Tente novamente.');
      expect(result.message).not.toMatch(/Vertex|GCS|Firestore/i);
    }
  });

  it('erro de configuração Vertex não vaza no toast e sinaliza parar a fila', async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: false,
      status: 502,
      json: async () => ({
        ok: false,
        code: 'MEAL_IMAGE_PROVIDER_CONFIGURATION_ERROR',
        error: "Invalid value at 'generation_config.image_config.person_generation'",
        stopAutomaticQueue: true,
        retryable: false,
      }),
    })) as unknown as typeof fetch;
    const result = await requestMealImageGeneration(req, {
      fetchImpl,
      getToken: async () => 'token',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('MEAL_IMAGE_PROVIDER_CONFIGURATION_ERROR');
      expect(result.stopAutomaticQueue).toBe(true);
      expect(result.retryable).toBe(false);
      expect(result.message).toBe('Não foi possível gerar a imagem agora. Tente novamente.');
      expect(result.message).not.toMatch(/generation_config|person_generation|dontAllow|Vertex|Google/i);
    }
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('após erro sistêmico, geração manual posterior ainda pode ser tentada', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 502,
        json: async () => ({
          ok: false,
          code: 'MEAL_IMAGE_PROVIDER_CONFIGURATION_ERROR',
          error: 'Invalid value at generation_config',
          stopAutomaticQueue: true,
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ok: true,
          generated: true,
          mealImage: { gcsPath: 'x.webp', status: 'ready', sourceHash: 'h' },
        }),
      });
    const first = await requestMealImageGeneration(req, {
      fetchImpl: fetchImpl as unknown as typeof fetch,
      getToken: async () => 'token',
    });
    const second = await requestMealImageGeneration(req, {
      fetchImpl: fetchImpl as unknown as typeof fetch,
      getToken: async () => 'token',
    });
    expect(first.ok).toBe(false);
    expect(second.ok).toBe(true);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('15. troca de opção durante geração → patch só no slot pedido', () => {
    const slots = [
      { id: 'slot_almoco_1', mealImage: undefined as { status?: string } | undefined },
      { id: 'slot_almoco_2', mealImage: undefined as { status?: string } | undefined },
    ];
    const next = patchSlotMealImage(slots, 'slot_almoco_1', {
      gcsPath: 'a.webp',
      status: 'ready',
      sourceHash: 'h1',
    });
    expect(next[0].mealImage?.status).toBe('ready');
    expect(next[1].mealImage).toBeUndefined();
  });
});
