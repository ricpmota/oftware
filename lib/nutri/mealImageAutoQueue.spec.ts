import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildMealImageSourceHash } from '@/lib/nutri/mealImageSource';
import {
  cancelMealImageAutoAttemptedClear,
  clearMealImageAutoAttemptedSession,
  collectMealImageAutoJobs,
  mealImageAutoAttemptedSessionFor,
  mealImageAutoAttemptKey,
  MEAL_IMAGE_AUTO_ATTEMPTED_CLEAR_DELAY_MS,
  MEAL_IMAGE_AUTO_CONCURRENCY,
  runMealImageAutoQueue,
  scheduleMealImageAutoAttemptedClear,
  shouldApplyMealImageClientUpdate,
  shouldRunMealImageAutoGeneration,
} from '@/lib/nutri/mealImageAutoQueue';
import { patchSlotMealImage } from '@/lib/nutri/mealImageSlotPatch';
import type { MealImageGenerateClientResult } from '@/lib/nutri/mealImageGenerateClient';

const prato = (id: string, extra?: Record<string, unknown>) => ({
  id,
  descricao: 'Frango grelhado',
  itensDetalhe: [{ nome: 'Frango grelhado', peso_g: 120 }],
  ...extra,
});

const hash = buildMealImageSourceHash(prato('slot_almoco_1'));

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

afterEach(() => {
  cancelMealImageAutoAttemptedClear();
  clearMealImageAutoAttemptedSession();
  vi.useRealTimers();
});

describe('shouldRunMealImageAutoGeneration', () => {
  it('1. paciente com nutricionista no Cardápio → inicia', () => {
    expect(
      shouldRunMealImageAutoGeneration({
        hasLinkedNutritionist: true,
        activeTab: 'cardapio',
        patientId: 'p1',
        hasPlano: true,
      })
    ).toBe(true);
  });

  it('2. paciente sem nutricionista → nenhuma geração automática', () => {
    expect(
      shouldRunMealImageAutoGeneration({
        hasLinkedNutritionist: false,
        activeTab: 'cardapio',
        patientId: 'p1',
        hasPlano: true,
      })
    ).toBe(false);
  });

  it('3–4. nutri e médico usam a mesma fila quando há vínculo', () => {
    expect(
      shouldRunMealImageAutoGeneration({
        hasLinkedNutritionist: true,
        activeTab: 'cardapio',
        patientId: 'p1',
        hasPlano: true,
      })
    ).toBe(true);
  });
});

describe('collectMealImageAutoJobs', () => {
  it('5. ready/hash atual → não entra na fila', () => {
    const jobs = collectMealImageAutoJobs({
      opcoesSlots: {
        almoco: [
          prato('slot_almoco_1', {
            mealImage: { gcsPath: 'x.webp', sourceHash: hash, status: 'ready' },
          }),
        ],
      },
    });
    expect(jobs).toEqual([]);
  });

  it('6. slot vazio → não entra na fila', () => {
    const jobs = collectMealImageAutoJobs({
      opcoesSlots: {
        almoco: [{ id: 'slot_almoco_1', titulo: 'Opção 01' }],
      },
    });
    expect(jobs).toEqual([]);
  });

  it('7. hash antigo → entra na fila', () => {
    const jobs = collectMealImageAutoJobs({
      opcoesSlots: {
        almoco: [
          prato('slot_almoco_1', {
            mealImage: { gcsPath: 'old.webp', sourceHash: '0000000000000000', status: 'ready' },
          }),
        ],
      },
    });
    expect(jobs).toEqual([{ refeicaoKey: 'almoco', slotId: 'slot_almoco_1', sourceHash: hash }]);
  });

  it('prioriza o slot visível e só opções preenchidas', () => {
    const jobs = collectMealImageAutoJobs({
      opcoesSlots: {
        cafe: [prato('slot_cafe_1')],
        almoco: [prato('slot_almoco_1'), { id: 'slot_almoco_2', titulo: 'Opção 02' }, prato('slot_almoco_3')],
      },
      priority: { refeicaoKey: 'almoco', slotId: 'slot_almoco_3' },
    });
    expect(jobs.map((j) => j.slotId)).toEqual(['slot_almoco_3', 'slot_almoco_1', 'slot_cafe_1']);
  });
});

describe('runMealImageAutoQueue', () => {
  it('8–9. concurrency 1: no máximo uma request simultânea e segue após sucesso', async () => {
    const jobs = [
      { refeicaoKey: 'almoco' as const, slotId: 'slot_almoco_1', sourceHash: 'h1' },
      { refeicaoKey: 'almoco' as const, slotId: 'slot_almoco_2', sourceHash: 'h2' },
      { refeicaoKey: 'cafe' as const, slotId: 'slot_cafe_1', sourceHash: 'h3' },
    ];
    let inflight = 0;
    let maxInflight = 0;
    const order: string[] = [];
    const request = vi.fn(async (job: { slotId: string }) => {
      inflight += 1;
      maxInflight = Math.max(maxInflight, inflight);
      await delay(15);
      inflight -= 1;
      order.push(job.slotId);
      return {
        ok: true,
        generated: true,
        mealImage: { gcsPath: `${job.slotId}.webp`, status: 'ready', sourceHash: 'h' },
      } as MealImageGenerateClientResult;
    });

    await runMealImageAutoQueue({
      jobs,
      concurrency: MEAL_IMAGE_AUTO_CONCURRENCY,
      autoAttempted: new Set(),
      isCancelled: () => false,
      isGenerating: () => false,
      setGenerating: () => undefined,
      request,
      onSlotResult: () => undefined,
    });
    expect(MEAL_IMAGE_AUTO_CONCURRENCY).toBe(1);
    expect(maxInflight).toBe(1);
    expect(request).toHaveBeenCalledTimes(3);
    expect(order).toEqual(['slot_almoco_1', 'slot_almoco_2', 'slot_cafe_1']);
  });

  it('10. fila segue após erro', async () => {
    const jobs = [
      { refeicaoKey: 'almoco' as const, slotId: 'a', sourceHash: '1' },
      { refeicaoKey: 'almoco' as const, slotId: 'b', sourceHash: '2' },
    ];
    const request = vi
      .fn()
      .mockRejectedValueOnce(new Error('vertex'))
      .mockResolvedValueOnce({
        ok: true,
        generated: true,
        mealImage: { status: 'ready', gcsPath: 'b.webp' },
      });
    const results: string[] = [];
    await runMealImageAutoQueue({
      jobs,
      autoAttempted: new Set(),
      isCancelled: () => false,
      isGenerating: () => false,
      setGenerating: () => undefined,
      request,
      onSlotResult: (job) => results.push(job.slotId),
    });
    expect(results).toEqual(['a', 'b']);
  });

  it('erro sistêmico Vertex para a fila: 5 slots → 1 POST', async () => {
    const jobs = Array.from({ length: 5 }, (_, i) => ({
      refeicaoKey: 'almoco' as const,
      slotId: `slot_almoco_${i + 1}`,
      sourceHash: `h${i}`,
    }));
    const request = vi.fn(async () => ({
      ok: false as const,
      code: 'MEAL_IMAGE_PROVIDER_CONFIGURATION_ERROR',
      message: 'Não foi possível gerar a imagem agora. Tente novamente.',
      httpStatus: 502,
      stopAutomaticQueue: true,
      retryable: false,
    }));
    await runMealImageAutoQueue({
      jobs,
      concurrency: MEAL_IMAGE_AUTO_CONCURRENCY,
      autoAttempted: new Set(),
      isCancelled: () => false,
      isGenerating: () => false,
      setGenerating: () => undefined,
      request,
      onSlotResult: () => undefined,
    });
    expect(request).toHaveBeenCalledTimes(1);
    expect(MEAL_IMAGE_AUTO_CONCURRENCY).toBe(1);
  });

  it('erro isolado do slot (composição) → fila continua', async () => {
    const jobs = [
      { refeicaoKey: 'almoco' as const, slotId: 'slot_almoco_1', sourceHash: 'h1' },
      { refeicaoKey: 'almoco' as const, slotId: 'slot_almoco_2', sourceHash: 'h2' },
    ];
    const request = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        code: 'MEAL_COMPOSITION_INSUFFICIENT',
        message: 'Não foi possível gerar a imagem agora. Tente novamente.',
        httpStatus: 400,
      })
      .mockResolvedValueOnce({
        ok: true,
        generated: true,
        mealImage: { status: 'ready', gcsPath: 'b.webp' },
      });
    await runMealImageAutoQueue({
      jobs,
      autoAttempted: new Set(),
      isCancelled: () => false,
      isGenerating: () => false,
      setGenerating: () => undefined,
      request,
      onSlotResult: () => undefined,
    });
    expect(request).toHaveBeenCalledTimes(2);
  });

  it('source_changed e GENERATION_FAILED de prato não param a fila', async () => {
    const request = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        generated: false,
        reason: 'source_changed_during_generation',
        mealImage: { status: 'failed', sourceHash: 'h' },
      })
      .mockResolvedValueOnce({
        ok: false,
        code: 'GENERATION_FAILED',
        message: 'Não foi possível gerar a imagem agora. Tente novamente.',
        httpStatus: 502,
      })
      .mockResolvedValueOnce({
        ok: true,
        generated: true,
        mealImage: { status: 'ready', gcsPath: 'c.webp' },
      });
    await runMealImageAutoQueue({
      jobs: [
        { refeicaoKey: 'almoco', slotId: 's1', sourceHash: 'h1' },
        { refeicaoKey: 'almoco', slotId: 's2', sourceHash: 'h2' },
        { refeicaoKey: 'cafe', slotId: 's3', sourceHash: 'h3' },
      ],
      autoAttempted: new Set(),
      isCancelled: () => false,
      isGenerating: () => false,
      setGenerating: () => undefined,
      request,
      onSlotResult: () => undefined,
    });
    expect(request).toHaveBeenCalledTimes(3);
  });

  it('11. already_current → segue fila', async () => {
    const request = vi.fn(async () => ({
      ok: true,
      generated: false,
      reason: 'already_current',
      mealImage: { status: 'ready', gcsPath: 'x.webp', sourceHash: 'h' },
    }));
    await runMealImageAutoQueue({
      jobs: [
        { refeicaoKey: 'almoco', slotId: 's1', sourceHash: 'h' },
        { refeicaoKey: 'almoco', slotId: 's2', sourceHash: 'h2' },
      ],
      autoAttempted: new Set(),
      isCancelled: () => false,
      isGenerating: () => false,
      setGenerating: () => undefined,
      request,
      onSlotResult: () => undefined,
    });
    expect(request).toHaveBeenCalledTimes(2);
  });

  it('12. already_pending → segue fila', async () => {
    const request = vi.fn(async () => ({
      ok: true,
      generated: false,
      reason: 'already_pending',
      mealImage: { status: 'pending', sourceHash: 'h' },
    }));
    await runMealImageAutoQueue({
      jobs: [
        { refeicaoKey: 'almoco', slotId: 's1', sourceHash: 'h' },
        { refeicaoKey: 'cafe', slotId: 's2', sourceHash: 'h2' },
      ],
      autoAttempted: new Set(),
      isCancelled: () => false,
      isGenerating: () => false,
      setGenerating: () => undefined,
      request,
      onSlotResult: () => undefined,
    });
    expect(request).toHaveBeenCalledTimes(2);
  });

  it('13–14. source_changed e effect duplicado → mesma chave não gera duas vezes', async () => {
    const attempted = new Set<string>();
    const jobs = [{ refeicaoKey: 'almoco' as const, slotId: 'slot_almoco_1', sourceHash: 'abc' }];
    const request = vi.fn(async () => ({
      ok: true,
      generated: false,
      reason: 'source_changed_during_generation',
      mealImage: { status: 'failed', sourceHash: 'abc' },
    }));
    const run = () =>
      runMealImageAutoQueue({
        jobs,
        autoAttempted: attempted,
        isCancelled: () => false,
        isGenerating: () => false,
        setGenerating: () => undefined,
        request,
        onSlotResult: () => undefined,
      });
    await run();
    await run();
    expect(request).toHaveBeenCalledTimes(1);
    expect(attempted.has(mealImageAutoAttemptKey('almoco', 'slot_almoco_1', 'abc'))).toBe(true);
  });

  it('14. Strict Mode / remount: sessão compartilhada não gera a mesma chave duas vezes', async () => {
    const attempted = mealImageAutoAttemptedSessionFor('pac-1');
    const jobs = [{ refeicaoKey: 'almoco' as const, slotId: 'slot_almoco_1', sourceHash: 'abc' }];
    const request = vi.fn(async () => ({
      ok: true,
      generated: true,
      mealImage: { status: 'ready', gcsPath: 'x.webp', sourceHash: 'abc' },
    }));
    const run = () =>
      runMealImageAutoQueue({
        jobs,
        autoAttempted: attempted,
        isCancelled: () => false,
        isGenerating: () => false,
        setGenerating: () => undefined,
        request,
        onSlotResult: () => undefined,
      });
    await run();
    await run();
    expect(request).toHaveBeenCalledTimes(1);
  });

  it('15. patch after ready → collect não recria o slot', () => {
    const slot = prato('slot_almoco_1');
    const after = patchSlotMealImage([slot], 'slot_almoco_1', {
      gcsPath: 'new.webp',
      sourceHash: hash,
      status: 'ready',
    });
    const jobs = collectMealImageAutoJobs({ opcoesSlots: { almoco: after } });
    expect(jobs).toEqual([]);
  });

  it('16. troca de opção não duplica com autoAttempted', () => {
    const attempted = new Set([mealImageAutoAttemptKey('almoco', 'slot_almoco_1', hash)]);
    const jobs = collectMealImageAutoJobs({
      opcoesSlots: { almoco: [prato('slot_almoco_1')] },
      priority: { refeicaoKey: 'almoco', slotId: 'slot_almoco_2' },
      autoAttempted: attempted,
    });
    expect(jobs).toEqual([]);
  });

  it('17. unmount: não inicia o próximo slot; o resultado corrente ainda é entregue ao consumidor', async () => {
    let cancelled = false;
    const onSlotResult = vi.fn();
    const request = vi.fn(async (job: { slotId: string }) => {
      if (job.slotId === 's1') cancelled = true;
      return {
        ok: true,
        generated: true,
        mealImage: { status: 'ready', gcsPath: `${job.slotId}.webp` },
      };
    });
    await runMealImageAutoQueue({
      jobs: [
        { refeicaoKey: 'almoco', slotId: 's1', sourceHash: 'h1' },
        { refeicaoKey: 'almoco', slotId: 's2', sourceHash: 'h2' },
      ],
      autoAttempted: new Set(),
      isCancelled: () => cancelled,
      isGenerating: () => false,
      setGenerating: () => undefined,
      request,
      onSlotResult,
    });
    expect(request).toHaveBeenCalledTimes(1);
    expect(onSlotResult).toHaveBeenCalledTimes(1);
    expect(onSlotResult.mock.calls[0][0].slotId).toBe('s1');
  });

  it('concurrency continua 1 e não dispara Promise.all de todos os jobs', async () => {
    const jobs = Array.from({ length: 5 }, (_, i) => ({
      refeicaoKey: 'almoco' as const,
      slotId: `slot_almoco_${i + 1}`,
      sourceHash: `h${i}`,
    }));
    let inflight = 0;
    let maxInflight = 0;
    const request = vi.fn(async () => {
      inflight += 1;
      maxInflight = Math.max(maxInflight, inflight);
      await delay(8);
      inflight -= 1;
      return { ok: true, generated: true, mealImage: { status: 'ready' as const } };
    });
    await runMealImageAutoQueue({
      jobs,
      concurrency: MEAL_IMAGE_AUTO_CONCURRENCY,
      autoAttempted: new Set(),
      isCancelled: () => false,
      isGenerating: () => false,
      setGenerating: () => undefined,
      request,
      onSlotResult: () => undefined,
    });
    expect(maxInflight).toBe(1);
    expect(request).toHaveBeenCalledTimes(5);
  });
});

describe('autoAttempted sessão vs visita real', () => {
  it('Strict Mode (clear atrasado cancelado) não perde a sessão', async () => {
    vi.useFakeTimers();
    const attempted = mealImageAutoAttemptedSessionFor('pac-1');
    attempted.add('almoco:slot_almoco_1:abc');
    scheduleMealImageAutoAttemptedClear('pac-1');
    cancelMealImageAutoAttemptedClear('pac-1');
    await vi.advanceTimersByTimeAsync(MEAL_IMAGE_AUTO_ATTEMPTED_CLEAR_DELAY_MS + 50);
    expect(mealImageAutoAttemptedSessionFor('pac-1').has('almoco:slot_almoco_1:abc')).toBe(true);
    vi.useRealTimers();
  });

  it('nova visita real limpa a sessão e permite nova tentativa', async () => {
    vi.useFakeTimers();
    const attempted = mealImageAutoAttemptedSessionFor('pac-1');
    attempted.add('almoco:slot_almoco_1:abc');
    scheduleMealImageAutoAttemptedClear('pac-1');
    await vi.advanceTimersByTimeAsync(MEAL_IMAGE_AUTO_ATTEMPTED_CLEAR_DELAY_MS + 50);
    expect(mealImageAutoAttemptedSessionFor('pac-1').has('almoco:slot_almoco_1:abc')).toBe(false);
    vi.useRealTimers();
  });

  it('paciente A → B não reutiliza autoAttempted nem aplica resultado atrasado', () => {
    mealImageAutoAttemptedSessionFor('pac-A').add('almoco:slot_almoco_1:hA');
    expect(mealImageAutoAttemptedSessionFor('pac-B').has('almoco:slot_almoco_1:hA')).toBe(false);
    expect(
      shouldApplyMealImageClientUpdate({
        boundPatientId: 'pac-A',
        currentPatientId: 'pac-B',
      })
    ).toBe(false);
    expect(
      shouldApplyMealImageClientUpdate({
        cancelled: true,
        boundPatientId: 'pac-A',
        currentPatientId: 'pac-A',
      })
    ).toBe(false);
    expect(
      shouldApplyMealImageClientUpdate({
        boundPatientId: 'pac-B',
        currentPatientId: 'pac-B',
      })
    ).toBe(true);
  });
});

describe('collect — pending expirado entra na fila', () => {
  it('pending abandonado (>8 min) volta a ser elegível', () => {
    const nowMs = Date.parse('2026-09-04T12:00:00.000Z');
    const jobs = collectMealImageAutoJobs({
      nowMs,
      opcoesSlots: {
        almoco: [
          prato('slot_almoco_1', {
            mealImage: {
              status: 'pending',
              sourceHash: hash,
              generationStartedAt: '2026-09-04T11:50:00.000Z',
            },
          }),
        ],
      },
    });
    expect(jobs).toEqual([{ refeicaoKey: 'almoco', slotId: 'slot_almoco_1', sourceHash: hash }]);
  });
});
