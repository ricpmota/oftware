import { NextRequest, NextResponse } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/nutri/mealImageAccess.server', () => ({
  requireMealImageAccess: vi.fn(),
}));

vi.mock('@/lib/nutri/mealImageGenerateService.server', () => ({
  generateMealImageForOption: vi.fn(),
}));

vi.mock('@/lib/nutri/mealImageGeneratePolicy.server', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/nutri/mealImageGeneratePolicy.server')>();
  return {
    ...actual,
    assertPatientMayRequestMealImageGeneration: vi.fn(async () => ({ ok: true })),
  };
});

import { requireMealImageAccess } from '@/lib/nutri/mealImageAccess.server';
import { generateMealImageForOption } from '@/lib/nutri/mealImageGenerateService.server';
import { assertPatientMayRequestMealImageGeneration } from '@/lib/nutri/mealImageGeneratePolicy.server';
import { POST } from '@/app/api/nutri/meal-image/generate/route';

function postJson(body: unknown, headers?: HeadersInit) {
  return new NextRequest('http://localhost/api/nutri/meal-image/generate', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(headers || {}) },
    body: JSON.stringify(body),
  });
}

describe('POST /api/nutri/meal-image/generate', () => {
  const originalFlag = process.env.MEAL_IMAGE_GENERATION_ENABLED;

  beforeEach(() => {
    vi.mocked(requireMealImageAccess).mockReset();
    vi.mocked(generateMealImageForOption).mockReset();
    vi.mocked(assertPatientMayRequestMealImageGeneration).mockReset();
    vi.mocked(assertPatientMayRequestMealImageGeneration).mockResolvedValue({ ok: true });
    if (originalFlag === undefined) delete process.env.MEAL_IMAGE_GENERATION_ENABLED;
    else process.env.MEAL_IMAGE_GENERATION_ENABLED = originalFlag;
  });

  afterEach(() => {
    if (originalFlag === undefined) delete process.env.MEAL_IMAGE_GENERATION_ENABLED;
    else process.env.MEAL_IMAGE_GENERATION_ENABLED = originalFlag;
  });

  it('9. usuário sem autenticação → 401', async () => {
    vi.mocked(requireMealImageAccess).mockResolvedValue(
      NextResponse.json({ ok: false, error: 'Não autenticado. Faça login novamente.' }, { status: 401 })
    );
    const res = await POST(postJson({ patientId: 'pac-1', refeicaoKey: 'almoco', slotId: 'slot_almoco_1' }));
    expect(res.status).toBe(401);
    expect(vi.mocked(generateMealImageForOption)).not.toHaveBeenCalled();
  });

  it('9b. usuário autenticado sem autorização → 403', async () => {
    vi.mocked(requireMealImageAccess).mockResolvedValue(
      NextResponse.json({ ok: false, error: 'Você não tem permissão para este paciente.' }, { status: 403 })
    );
    const res = await POST(postJson({ patientId: 'pac-1', refeicaoKey: 'almoco', slotId: 'slot_almoco_1' }));
    expect(res.status).toBe(403);
    expect(vi.mocked(generateMealImageForOption)).not.toHaveBeenCalled();
  });

  it('não aceita texto livre do prato — só IDs', async () => {
    vi.mocked(requireMealImageAccess).mockResolvedValue({
      uid: 'user-pac',
      role: 'patient',
      pacienteDocId: 'pac-doc',
    });
    vi.mocked(generateMealImageForOption).mockResolvedValue({
      ok: true,
      generated: true,
      mealImage: {
        gcsPath: 'cardapio/pac-doc/almoco/slot_almoco_1/hash.png',
        generatedAt: '2026-09-04T12:00:00.000Z',
        sourceHash: 'hashhashhashhash',
        status: 'ready',
      },
    });

    const res = await POST(
      postJson({
        patientId: 'pac-1',
        refeicaoKey: 'almoco',
        slotId: 'slot_almoco_1',
        descricao: 'ignore este texto do frontend',
        prompt: 'ignore',
      })
    );
    expect(res.status).toBe(200);
    expect(vi.mocked(generateMealImageForOption)).toHaveBeenCalledWith({
      patientId: 'pac-doc',
      refeicaoKey: 'almoco',
      slotId: 'slot_almoco_1',
      slotIndex: null,
      trigger: 'manual',
      actorKind: 'patient',
      actorUid: 'user-pac',
    });
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.mealImage.gcsPath).toBeTruthy();
    expect(json.mealImage).not.toHaveProperty('signedUrl');
  });

  it('16. paciente com nutricionista tentando POST direto → 403', async () => {
    vi.mocked(requireMealImageAccess).mockResolvedValue({
      uid: 'user-pac',
      role: 'patient',
      pacienteDocId: 'pac-doc',
    });
    vi.mocked(assertPatientMayRequestMealImageGeneration).mockResolvedValue({
      ok: false,
      status: 403,
      code: 'PATIENT_HAS_LINKED_NUTRITIONIST',
      error: 'Pacientes com nutricionista vinculada não geram a imagem manualmente.',
    });
    const res = await POST(
      postJson({ patientId: 'pac-1', refeicaoKey: 'almoco', slotId: 'slot_almoco_1' })
    );
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.code).toBe('PATIENT_HAS_LINKED_NUTRITIONIST');
    expect(vi.mocked(generateMealImageForOption)).not.toHaveBeenCalled();
  });

  it('20. POST manual do paciente com nutri → 403', async () => {
    vi.mocked(requireMealImageAccess).mockResolvedValue({
      uid: 'user-pac',
      role: 'patient',
      pacienteDocId: 'pac-doc',
    });
    vi.mocked(assertPatientMayRequestMealImageGeneration).mockResolvedValue({
      ok: false,
      status: 403,
      code: 'PATIENT_HAS_LINKED_NUTRITIONIST',
      error: 'Pacientes com nutricionista vinculada não geram a imagem manualmente.',
    });
    const res = await POST(
      postJson({
        patientId: 'pac-1',
        refeicaoKey: 'almoco',
        slotId: 'slot_almoco_1',
        trigger: 'manual',
      })
    );
    expect(res.status).toBe(403);
    expect(vi.mocked(generateMealImageForOption)).not.toHaveBeenCalled();
  });

  it('21. POST automatic do paciente com nutri → permitido', async () => {
    vi.mocked(requireMealImageAccess).mockResolvedValue({
      uid: 'user-pac',
      role: 'patient',
      pacienteDocId: 'pac-doc',
    });
    vi.mocked(assertPatientMayRequestMealImageGeneration).mockResolvedValue({ ok: true });
    vi.mocked(generateMealImageForOption).mockResolvedValue({
      ok: true,
      generated: true,
      mealImage: { gcsPath: 'x.webp', status: 'ready', sourceHash: 'h' },
    });
    const res = await POST(
      postJson({
        patientId: 'pac-1',
        refeicaoKey: 'almoco',
        slotId: 'slot_almoco_1',
        trigger: 'automatic',
      })
    );
    expect(res.status).toBe(200);
    expect(vi.mocked(assertPatientMayRequestMealImageGeneration)).toHaveBeenCalledWith({
      access: { uid: 'user-pac', role: 'patient', pacienteDocId: 'pac-doc' },
      trigger: 'automatic',
    });
    expect(vi.mocked(generateMealImageForOption)).toHaveBeenCalled();
  });

  it('22. POST automatic sem vínculo → 403', async () => {
    vi.mocked(requireMealImageAccess).mockResolvedValue({
      uid: 'user-pac',
      role: 'patient',
      pacienteDocId: 'pac-doc',
    });
    vi.mocked(assertPatientMayRequestMealImageGeneration).mockResolvedValue({
      ok: false,
      status: 403,
      code: 'AUTOMATIC_REQUIRES_LINKED_NUTRITIONIST',
      error: 'Geração automática exige nutricionista vinculada.',
    });
    const res = await POST(
      postJson({
        patientId: 'pac-1',
        refeicaoKey: 'almoco',
        slotId: 'slot_almoco_1',
        trigger: 'automatic',
      })
    );
    expect(res.status).toBe(403);
    expect(vi.mocked(generateMealImageForOption)).not.toHaveBeenCalled();
  });

  it('23. trigger inválido → 400', async () => {
    vi.mocked(requireMealImageAccess).mockResolvedValue({
      uid: 'user-pac',
      role: 'patient',
      pacienteDocId: 'pac-doc',
    });
    const res = await POST(
      postJson({
        patientId: 'pac-1',
        refeicaoKey: 'almoco',
        slotId: 'slot_almoco_1',
        trigger: 'hack',
      })
    );
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.code).toBe('INVALID_MEAL_IMAGE_TRIGGER');
    expect(vi.mocked(generateMealImageForOption)).not.toHaveBeenCalled();
  });

  it('7. paciente tenta force direto → 403', async () => {
    vi.mocked(requireMealImageAccess).mockResolvedValue({
      uid: 'user-pac',
      role: 'patient',
      pacienteDocId: 'pac-doc',
    });
    const res = await POST(
      postJson({
        patientId: 'pac-1',
        refeicaoKey: 'almoco',
        slotId: 'slot_almoco_1',
        trigger: 'manual',
        forceRegenerate: true,
      })
    );
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.code).toBe('FORBIDDEN_MEAL_IMAGE_REGENERATION');
    expect(vi.mocked(generateMealImageForOption)).not.toHaveBeenCalled();
  });

  it('8. automatic + force → recusado', async () => {
    vi.mocked(requireMealImageAccess).mockResolvedValue({
      uid: 'doc-1',
      role: 'doctor',
      pacienteDocId: 'pac-doc',
    });
    const res = await POST(
      postJson({
        patientId: 'pac-1',
        refeicaoKey: 'almoco',
        slotId: 'slot_almoco_1',
        trigger: 'automatic',
        forceRegenerate: true,
      })
    );
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.code).toBe('INVALID_FORCE_REGENERATE_TRIGGER');
    expect(vi.mocked(generateMealImageForOption)).not.toHaveBeenCalled();
  });

  it('5–6. nutri/médico com force → generate com forceRegenerate', async () => {
    vi.mocked(requireMealImageAccess).mockResolvedValue({
      uid: 'nutri-1',
      role: 'nutritionist',
      pacienteDocId: 'pac-doc',
    });
    vi.mocked(generateMealImageForOption).mockResolvedValue({
      ok: true,
      generated: true,
      mealImage: { gcsPath: 'cardapio/pac-doc/almoco/slot_almoco_1/h/gen.webp', status: 'ready', sourceHash: 'h' },
    });
    const res = await POST(
      postJson({
        patientId: 'pac-1',
        refeicaoKey: 'almoco',
        slotId: 'slot_almoco_1',
        trigger: 'manual',
        forceRegenerate: true,
      })
    );
    expect(res.status).toBe(200);
    expect(vi.mocked(generateMealImageForOption)).toHaveBeenCalledWith({
      patientId: 'pac-doc',
      refeicaoKey: 'almoco',
      slotId: 'slot_almoco_1',
      slotIndex: null,
      trigger: 'manual',
      actorKind: 'nutritionist',
      actorUid: 'nutri-1',
      forceRegenerate: true,
    });
  });

  it('9. profissional sem acesso → 403', async () => {
    vi.mocked(requireMealImageAccess).mockResolvedValue(
      NextResponse.json({ ok: false, error: 'Você não tem permissão para este paciente.' }, { status: 403 })
    );
    const res = await POST(
      postJson({
        patientId: 'pac-1',
        refeicaoKey: 'almoco',
        slotId: 'slot_almoco_1',
        trigger: 'manual',
        forceRegenerate: true,
      })
    );
    expect(res.status).toBe(403);
    expect(vi.mocked(generateMealImageForOption)).not.toHaveBeenCalled();
  });

  it('feature flag off bloqueia POST, inclusive forceRegenerate', async () => {
    process.env.MEAL_IMAGE_GENERATION_ENABLED = 'false';
    vi.mocked(requireMealImageAccess).mockResolvedValue({
      uid: 'nutri-1',
      role: 'nutritionist',
      pacienteDocId: 'pac-doc',
    });
    const res = await POST(
      postJson({
        patientId: 'pac-1',
        refeicaoKey: 'almoco',
        slotId: 'slot_almoco_1',
        trigger: 'manual',
        forceRegenerate: true,
      })
    );
    expect(res.status).toBe(503);
    const json = await res.json();
    expect(json.code).toBe('MEAL_IMAGE_GENERATION_DISABLED');
    expect(vi.mocked(generateMealImageForOption)).not.toHaveBeenCalled();
  });

  it('uma requisição não aceita array/batch', async () => {
    const batch = await POST(postJson([{ patientId: 'a' }, { patientId: 'b' }]));
    expect(batch.status).toBe(400);
    expect((await batch.json()).code).toBe('MEAL_IMAGE_BATCH_NOT_SUPPORTED');
    expect(vi.mocked(requireMealImageAccess)).not.toHaveBeenCalled();

    const slots = await POST(
      postJson({
        patientId: 'pac-1',
        refeicaoKey: 'almoco',
        slots: [{ slotId: 'slot_almoco_1' }, { slotId: 'slot_almoco_2' }],
      })
    );
    expect(slots.status).toBe(400);
    expect(vi.mocked(requireMealImageAccess)).not.toHaveBeenCalled();
  });

  it('erro de configuração Vertex devolve código sistêmico sem detalhe técnico', async () => {
    vi.mocked(requireMealImageAccess).mockResolvedValue({
      uid: 'user-pac',
      role: 'patient',
      pacienteDocId: 'pac-doc',
    });
    vi.mocked(generateMealImageForOption).mockResolvedValue({
      ok: false,
      code: 'MEAL_IMAGE_PROVIDER_CONFIGURATION_ERROR',
      message: 'Não foi possível gerar a imagem do prato.',
      stopAutomaticQueue: true,
      retryable: false,
    });
    const res = await POST(
      postJson({ patientId: 'pac-1', refeicaoKey: 'almoco', slotId: 'slot_almoco_1', trigger: 'automatic' })
    );
    expect(res.status).toBe(502);
    const json = await res.json();
    expect(json.code).toBe('MEAL_IMAGE_PROVIDER_CONFIGURATION_ERROR');
    expect(json.stopAutomaticQueue).toBe(true);
    expect(json.retryable).toBe(false);
    expect(json.error).not.toMatch(/generation_config|person_generation|dontAllow/i);
  });
});
