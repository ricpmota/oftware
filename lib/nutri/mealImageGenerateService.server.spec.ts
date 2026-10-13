import { describe, expect, it, vi } from 'vitest';
import { buildMealImageSourceHash } from '@/lib/nutri/mealImageSource';
import {
  generateMealImageForOption,
  type MealImageGenerateDeps,
} from '@/lib/nutri/mealImageGenerateService.server';
import type { MealImageRecord } from '@/lib/nutri/mealImageSource';
import { MealImageVertexError } from '@/lib/gcp/mealImageVertexClient.server';
import { MEAL_IMAGE_PROVIDER_CONFIGURATION_ERROR } from '@/lib/nutri/mealImageGenerateFailure';

const SLOT_ID = 'slot_almoco_1';
const PATIENT = 'pac-1';

const prato = {
  id: SLOT_ID,
  titulo: 'Opção 01 da Maria Silva',
  itensDetalhe: [
    { nome: 'Frango grelhado', peso_g: 120 },
    { nome: 'Arroz integral', quantidade: 4, unidade: 'colheres de sopa' },
  ],
};

const sourceHash = buildMealImageSourceHash(prato);

function planoCom(slot: Record<string, unknown>) {
  return {
    opcoesSlots: {
      almoco: [slot],
    },
  };
}

function baseDeps(overrides: Partial<MealImageGenerateDeps> = {}): MealImageGenerateDeps & {
  generateImage: ReturnType<typeof vi.fn>;
  uploadImage: ReturnType<typeof vi.fn>;
  acquireLock: ReturnType<typeof vi.fn>;
  markFailed: ReturnType<typeof vi.fn>;
  finalizeReady: ReturnType<typeof vi.fn>;
  logVertexCall: ReturnType<typeof vi.fn>;
  logGeneration: ReturnType<typeof vi.fn>;
} {
  const generateImage = vi.fn(async () => ({
    buffer: Buffer.from('img'),
    mimeType: 'image/png',
  }));
  const uploadImage = vi.fn(async () => ({
    gcsPath: `cardapio/${PATIENT}/almoco/${SLOT_ID}/${sourceHash}.png`,
  }));
  const acquireLock = vi.fn(async () => ({
    kind: 'acquired' as const,
    generationStartedAt: '2026-09-04T12:00:00.000Z',
  }));
  const markFailed = vi.fn(async (): Promise<MealImageRecord> => ({
    sourceHash,
    status: 'failed',
  }));
  const finalizeReady = vi.fn(async () => ({
    kind: 'ready' as const,
    mealImage: {
      gcsPath: `cardapio/${PATIENT}/almoco/${SLOT_ID}/${sourceHash}.png`,
      generatedAt: '2026-09-04T12:00:01.000Z',
      sourceHash,
      status: 'ready' as const,
    },
  }));

  return {
    now: () => new Date('2026-09-04T12:00:00.000Z'),
    loadPlano: async () => planoCom(prato),
    acquireLock,
    generateImage,
    uploadImage,
    finalizeReady,
    markFailed,
    isRateLimited: overrides.isRateLimited ?? (() => false),
    createGenerationId: overrides.createGenerationId ?? (() => 'gen-test-1'),
    ...overrides,
    generateImage: overrides.generateImage ?? generateImage,
    uploadImage: overrides.uploadImage ?? uploadImage,
    acquireLock: overrides.acquireLock ?? acquireLock,
    markFailed: overrides.markFailed ?? markFailed,
    finalizeReady: overrides.finalizeReady ?? finalizeReady,
    logGeneration: (overrides.logGeneration as ReturnType<typeof vi.fn>) ?? vi.fn(),
    logVertexCall: (overrides.logVertexCall as ReturnType<typeof vi.fn>) ?? vi.fn(),
  };
}

describe('generateMealImageForOption', () => {
  it('aceita slots salvos como mapa em vez de array', async () => {
    const deps = baseDeps({
      loadPlano: async () => ({
        opcoesSlots: {
          almoco: {
            0: prato,
          },
        },
      }),
    });
    const result = await generateMealImageForOption(
      { patientId: PATIENT, refeicaoKey: 'almoco', slotId: SLOT_ID },
      deps
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.generated).toBe(true);
    expect(deps.generateImage).toHaveBeenCalledTimes(1);
  });

  it('1. composição vazia → não chama IA', async () => {
    const deps = baseDeps({
      loadPlano: async () => planoCom({ id: SLOT_ID, titulo: 'Vazio', itensSelecionados: ['x'] }),
    });
    const result = await generateMealImageForOption(
      { patientId: PATIENT, refeicaoKey: 'almoco', slotId: SLOT_ID },
      deps
    );
    expect(result).toMatchObject({ ok: false, code: 'MEAL_COMPOSITION_INSUFFICIENT' });
    expect(deps.generateImage).not.toHaveBeenCalled();
    expect(deps.acquireLock).not.toHaveBeenCalled();
  });

  it('2. imagem ready + hash atual → não chama IA', async () => {
    const mealImage = {
      gcsPath: 'cardapio/pac-1/almoco/slot_almoco_1/old.webp',
      sourceHash,
      status: 'ready' as const,
      generatedAt: '2026-09-01T00:00:00.000Z',
    };
    const deps = baseDeps({
      loadPlano: async () => planoCom({ ...prato, mealImage }),
    });
    const result = await generateMealImageForOption(
      { patientId: PATIENT, refeicaoKey: 'almoco', slotId: SLOT_ID },
      deps
    );
    expect(result).toEqual({
      ok: true,
      generated: false,
      reason: 'already_current',
      mealImage,
    });
    expect(deps.generateImage).not.toHaveBeenCalled();
  });

  it('3. imagem inexistente → gera', async () => {
    const deps = baseDeps();
    const result = await generateMealImageForOption(
      { patientId: PATIENT, refeicaoKey: 'almoco', slotId: SLOT_ID },
      deps
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.generated).toBe(true);
      expect(result.mealImage.status).toBe('ready');
      expect(result.mealImage.gcsPath).toContain('cardapio/');
    }
    expect(deps.generateImage).toHaveBeenCalledTimes(1);
    expect(deps.uploadImage).toHaveBeenCalledTimes(1);
  });

  it('4. hash antigo → gera', async () => {
    const deps = baseDeps({
      loadPlano: async () =>
        planoCom({
          ...prato,
          mealImage: {
            gcsPath: 'cardapio/pac-1/almoco/slot_almoco_1/hashantigo.png',
            sourceHash: '0000000000000000',
            status: 'ready',
          },
        }),
    });
    const result = await generateMealImageForOption(
      { patientId: PATIENT, refeicaoKey: 'almoco', slotId: SLOT_ID },
      deps
    );
    expect(result.ok && result.generated).toBe(true);
    expect(deps.generateImage).toHaveBeenCalledTimes(1);
    expect(deps.acquireLock).toHaveBeenCalled();
  });

  it('5. chamada simultânea → somente uma geração', async () => {
    let acquired = false;
    const generateImage = vi.fn(
      () =>
        new Promise<{ buffer: Buffer; mimeType: string }>((resolve) => {
          setTimeout(() => resolve({ buffer: Buffer.from('img'), mimeType: 'image/png' }), 30);
        })
    );
    const deps = baseDeps({
      generateImage,
      acquireLock: async () => {
        if (acquired) {
          return {
            kind: 'already_pending' as const,
            mealImage: { status: 'pending' as const, sourceHash },
          };
        }
        acquired = true;
        return { kind: 'acquired' as const, generationStartedAt: '2026-09-04T12:00:00.000Z' };
      },
    });

    const [a, b] = await Promise.all([
      generateMealImageForOption({ patientId: PATIENT, refeicaoKey: 'almoco', slotId: SLOT_ID }, deps),
      generateMealImageForOption({ patientId: PATIENT, refeicaoKey: 'almoco', slotId: SLOT_ID }, deps),
    ]);

    const generated = [a, b].filter((r) => r.ok && r.generated);
    const pending = [a, b].filter((r) => r.ok && r.reason === 'already_pending');
    expect(generated).toHaveLength(1);
    expect(pending).toHaveLength(1);
    expect(generateImage).toHaveBeenCalledTimes(1);
  });

  it('6. geração falha → status failed', async () => {
    const deps = baseDeps({
      generateImage: vi.fn(async () => {
        throw new Error('vertex down');
      }),
    });
    const result = await generateMealImageForOption(
      { patientId: PATIENT, refeicaoKey: 'almoco', slotId: SLOT_ID },
      deps
    );
    expect(result).toMatchObject({ ok: false, code: 'GENERATION_FAILED' });
    expect(deps.markFailed).toHaveBeenCalledTimes(1);
    expect(deps.uploadImage).not.toHaveBeenCalled();
    if (!result.ok) expect(result.mealImage?.status).toBe('failed');
  });

  it('erro de configuração Vertex é sistêmico e não retryável', async () => {
    const deps = baseDeps({
      generateImage: vi.fn(async () => {
        throw new MealImageVertexError(
          "Invalid value at 'generation_config.image_config.person_generation'",
          'VERTEX_CONFIG',
          true
        );
      }),
    });
    const result = await generateMealImageForOption(
      { patientId: PATIENT, refeicaoKey: 'almoco', slotId: SLOT_ID, actorKind: 'patient', trigger: 'automatic' },
      deps
    );
    expect(result).toMatchObject({
      ok: false,
      code: MEAL_IMAGE_PROVIDER_CONFIGURATION_ERROR,
      stopAutomaticQueue: true,
      retryable: false,
      message: 'Não foi possível gerar a imagem do prato.',
    });
    if (!result.ok) {
      expect(result.message).not.toMatch(/generation_config|person_generation|dontAllow|Vertex/i);
    }
    expect(deps.generateImage).toHaveBeenCalledTimes(1);
    expect(deps.logGeneration).toHaveBeenCalledWith(
      expect.objectContaining({ result: 'failed_vertex_configuration', generationId: 'gen-test-1' })
    );
  });

  it('7. upload falha → status failed', async () => {
    const deps = baseDeps({
      uploadImage: vi.fn(async () => {
        throw new Error('gcs down');
      }),
    });
    const result = await generateMealImageForOption(
      { patientId: PATIENT, refeicaoKey: 'almoco', slotId: SLOT_ID },
      deps
    );
    expect(result).toMatchObject({ ok: false, code: 'UPLOAD_FAILED' });
    expect(deps.markFailed).toHaveBeenCalledTimes(1);
    if (!result.ok) expect(result.mealImage?.status).toBe('failed');
  });

  it('8. composição muda durante geração → não associa a imagem ao prato novo', async () => {
    const deps = baseDeps({
      finalizeReady: vi.fn(async () => ({
        kind: 'source_changed' as const,
        mealImage: {
          gcsPath: 'cardapio/pac-1/almoco/slot_almoco_1/hashantigo.png',
          sourceHash,
          status: 'failed' as const,
        },
      })),
    });
    const result = await generateMealImageForOption(
      { patientId: PATIENT, refeicaoKey: 'almoco', slotId: SLOT_ID },
      deps
    );
    expect(result).toMatchObject({
      ok: true,
      generated: false,
      reason: 'source_changed_during_generation',
    });
    if (result.ok) {
      expect(result.mealImage.status).not.toBe('ready');
      expect(result.mealImage.gcsPath).not.toBe(
        `cardapio/${PATIENT}/almoco/${SLOT_ID}/${sourceHash}.png`
      );
    }
    expect(deps.generateImage).toHaveBeenCalledTimes(1);
  });

  it('10. dados pessoais não entram no prompt', async () => {
    const deps = baseDeps();
    await generateMealImageForOption(
      { patientId: PATIENT, refeicaoKey: 'almoco', slotId: SLOT_ID },
      deps
    );
    const prompt = String(deps.generateImage.mock.calls[0]?.[0] || '');
    expect(prompt).toContain('Frango grelhado');
    expect(prompt).not.toContain('Maria Silva');
    expect(prompt).not.toContain(PATIENT);
    expect(prompt).not.toMatch(/CPF|email|anamnese|diagn[oó]stico/i);
  });

  it('10. force ready/current → chama IA, não already_current', async () => {
    const mealImage = {
      gcsPath: 'cardapio/pac-1/almoco/slot_almoco_1/old.webp',
      sourceHash,
      status: 'ready' as const,
      generatedAt: '2026-09-01T00:00:00.000Z',
    };
    const deps = baseDeps({
      loadPlano: async () => planoCom({ ...prato, mealImage }),
    });
    const result = await generateMealImageForOption(
      { patientId: PATIENT, refeicaoKey: 'almoco', slotId: SLOT_ID, forceRegenerate: true },
      deps
    );
    expect(result.ok && result.generated).toBe(true);
    expect(deps.generateImage).toHaveBeenCalledTimes(1);
    expect(deps.acquireLock).toHaveBeenCalledWith(expect.objectContaining({ forceRegenerate: true }));
    expect(deps.uploadImage).toHaveBeenCalledWith(expect.objectContaining({ generationId: expect.any(String) }));
  });

  it('11. force com pending → não gera segunda vez', async () => {
    const deps = baseDeps({
      loadPlano: async () =>
        planoCom({
          ...prato,
          mealImage: { status: 'pending', sourceHash, generationStartedAt: '2026-09-04T12:00:00.000Z' },
        }),
      acquireLock: vi.fn(async () => ({
        kind: 'already_pending' as const,
        mealImage: { status: 'pending' as const, sourceHash },
      })),
    });
    const result = await generateMealImageForOption(
      { patientId: PATIENT, refeicaoKey: 'almoco', slotId: SLOT_ID, forceRegenerate: true },
      deps
    );
    expect(result).toMatchObject({ ok: true, generated: false, reason: 'already_pending' });
    expect(deps.generateImage).not.toHaveBeenCalled();
  });

  it('17. erro de regeneração com ready anterior → restaura a foto', async () => {
    const previous = {
      gcsPath: 'cardapio/pac-1/almoco/slot_almoco_1/old.webp',
      sourceHash,
      status: 'ready' as const,
      generatedAt: '2026-09-01T00:00:00.000Z',
    };
    const deps = baseDeps({
      loadPlano: async () => planoCom({ ...prato, mealImage: previous }),
      generateImage: vi.fn(async () => {
        throw new Error('vertex down');
      }),
      acquireLock: vi.fn(async () => ({
        kind: 'acquired' as const,
        generationStartedAt: '2026-09-04T12:00:00.000Z',
        previousMealImage: previous,
        previousGcsPath: previous.gcsPath,
      })),
      markFailed: vi.fn(async () => previous),
    });
    const result = await generateMealImageForOption(
      { patientId: PATIENT, refeicaoKey: 'almoco', slotId: SLOT_ID, forceRegenerate: true },
      deps
    );
    expect(result).toMatchObject({ ok: false, code: 'GENERATION_FAILED' });
    if (!result.ok) {
      expect(result.mealImage).toMatchObject({
        status: 'ready',
        gcsPath: previous.gcsPath,
        sourceHash,
      });
    }
    expect(deps.logVertexCall).toHaveBeenCalledTimes(1);
  });

  it('pending expirado pode adquirir lock e gerar', async () => {
    const deps = baseDeps({
      loadPlano: async () =>
        planoCom({
          ...prato,
          mealImage: {
            status: 'pending',
            sourceHash,
            generationStartedAt: '2026-09-04T11:50:00.000Z',
          },
        }),
    });
    const result = await generateMealImageForOption(
      { patientId: PATIENT, refeicaoKey: 'almoco', slotId: SLOT_ID },
      deps
    );
    expect(result.ok && result.generated).toBe(true);
    expect(deps.acquireLock).toHaveBeenCalled();
    expect(deps.generateImage).toHaveBeenCalledTimes(1);
    expect(deps.logVertexCall).toHaveBeenCalledTimes(1);
  });

  it('already_current e already_pending não chamam Vertex nem logam vertex_call', async () => {
    const current = baseDeps({
      loadPlano: async () =>
        planoCom({
          ...prato,
          mealImage: {
            gcsPath: 'cardapio/pac-1/almoco/slot_almoco_1/x.webp',
            sourceHash,
            status: 'ready',
            generatedAt: '2026-09-01T00:00:00.000Z',
          },
        }),
    });
    await generateMealImageForOption(
      { patientId: PATIENT, refeicaoKey: 'almoco', slotId: SLOT_ID },
      current
    );
    expect(current.generateImage).not.toHaveBeenCalled();
    expect(current.logVertexCall).not.toHaveBeenCalled();

    const pending = baseDeps({
      loadPlano: async () =>
        planoCom({
          ...prato,
          mealImage: {
            status: 'pending',
            sourceHash,
            generationStartedAt: '2026-09-04T12:00:00.000Z',
          },
        }),
    });
    const pendingResult = await generateMealImageForOption(
      { patientId: PATIENT, refeicaoKey: 'almoco', slotId: SLOT_ID },
      pending
    );
    expect(pendingResult).toMatchObject({ ok: true, reason: 'already_pending' });
    expect(pending.generateImage).not.toHaveBeenCalled();
    expect(pending.acquireLock).not.toHaveBeenCalled();
    expect(pending.logVertexCall).not.toHaveBeenCalled();
  });

  it('force + upload falha restaura imagem anterior', async () => {
    const previous = {
      gcsPath: 'cardapio/pac-1/almoco/slot_almoco_1/old.webp',
      sourceHash,
      status: 'ready' as const,
      generatedAt: '2026-09-01T00:00:00.000Z',
    };
    const deps = baseDeps({
      loadPlano: async () => planoCom({ ...prato, mealImage: previous }),
      acquireLock: vi.fn(async () => ({
        kind: 'acquired' as const,
        generationStartedAt: '2026-09-04T12:00:00.000Z',
        previousMealImage: previous,
        previousGcsPath: previous.gcsPath,
      })),
      uploadImage: vi.fn(async () => {
        throw new Error('gcs down');
      }),
      markFailed: vi.fn(async () => previous),
    });
    const result = await generateMealImageForOption(
      { patientId: PATIENT, refeicaoKey: 'almoco', slotId: SLOT_ID, forceRegenerate: true },
      deps
    );
    expect(result).toMatchObject({ ok: false, code: 'UPLOAD_FAILED' });
    if (!result.ok) {
      expect(result.mealImage).toMatchObject({ status: 'ready', gcsPath: previous.gcsPath });
    }
    expect(deps.logVertexCall).toHaveBeenCalledTimes(1);
    expect(deps.logGeneration).toHaveBeenCalledWith(expect.objectContaining({ result: 'failed_storage' }));
  });

  it('force + source_changed não associa a imagem ao prato novo', async () => {
    const deps = baseDeps({
      acquireLock: vi.fn(async () => ({
        kind: 'source_changed' as const,
        mealImage: { status: 'failed' as const, sourceHash: 'hashnovo' },
      })),
    });
    const result = await generateMealImageForOption(
      { patientId: PATIENT, refeicaoKey: 'almoco', slotId: SLOT_ID, forceRegenerate: true },
      deps
    );
    expect(result).toMatchObject({
      ok: true,
      generated: false,
      reason: 'source_changed_during_generation',
    });
    expect(deps.generateImage).not.toHaveBeenCalled();
    expect(deps.logVertexCall).not.toHaveBeenCalled();
    if (result.ok) expect(result.mealImage.status).not.toBe('ready');
  });

  it('slot de outra refeição e path traversal são recusados', async () => {
    const deps = baseDeps();
    const mismatch = await generateMealImageForOption(
      { patientId: PATIENT, refeicaoKey: 'almoco', slotId: 'slot_jantar_1' },
      deps
    );
    expect(mismatch).toMatchObject({ ok: false, code: 'INVALID_INPUT' });
    expect(deps.generateImage).not.toHaveBeenCalled();

    const traversal = await generateMealImageForOption(
      { patientId: '../etc', refeicaoKey: 'almoco', slotId: SLOT_ID },
      deps
    );
    expect(traversal).toMatchObject({ ok: false, code: 'INVALID_INPUT' });
    expect(deps.generateImage).not.toHaveBeenCalled();
  });

  it('geração real reutiliza o mesmo generationId no upload e no log', async () => {
    const deps = baseDeps();
    await generateMealImageForOption(
      { patientId: PATIENT, refeicaoKey: 'almoco', slotId: SLOT_ID, actorKind: 'patient', trigger: 'manual' },
      deps
    );
    expect(deps.uploadImage).toHaveBeenCalledWith(expect.objectContaining({ generationId: 'gen-test-1' }));
    expect(deps.logVertexCall).toHaveBeenCalledWith(
      expect.objectContaining({ generationId: 'gen-test-1', trigger: 'manual', actorKind: 'patient' })
    );
    expect(deps.logGeneration).toHaveBeenCalledWith(
      expect.objectContaining({ result: 'generated', generationId: 'gen-test-1' })
    );
  });

  it('composição acima do limite defensivo não chama Vertex', async () => {
    const huge = {
      id: SLOT_ID,
      itensDetalhe: Array.from({ length: 41 }, (_, i) => ({ nome: `Alimento ${i}`, peso_g: 10 })),
    };
    const deps = baseDeps({
      loadPlano: async () => planoCom(huge),
    });
    const result = await generateMealImageForOption(
      { patientId: PATIENT, refeicaoKey: 'almoco', slotId: SLOT_ID },
      deps
    );
    expect(result).toMatchObject({ ok: false, code: 'MEAL_COMPOSITION_TOO_LARGE' });
    expect(deps.generateImage).not.toHaveBeenCalled();
    expect(deps.logVertexCall).not.toHaveBeenCalled();
  });
});
