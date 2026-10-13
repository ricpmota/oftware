import { NextRequest, NextResponse } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/nutri/mealImageAccess.server', () => ({
  requireMealImageAccess: vi.fn(),
}));

vi.mock('@/lib/nutri/mealImageReadService.server', () => ({
  readMealImageSignedUrl: vi.fn(),
}));

import { requireMealImageAccess } from '@/lib/nutri/mealImageAccess.server';
import { readMealImageSignedUrl } from '@/lib/nutri/mealImageReadService.server';
import { GET } from '@/app/api/nutri/meal-image/route';

function getUrl(query: Record<string, string>) {
  const params = new URLSearchParams(query);
  return new NextRequest(`http://localhost/api/nutri/meal-image?${params.toString()}`, {
    method: 'GET',
  });
}

describe('GET /api/nutri/meal-image', () => {
  const originalFlag = process.env.MEAL_IMAGE_GENERATION_ENABLED;

  beforeEach(() => {
    vi.mocked(requireMealImageAccess).mockReset();
    vi.mocked(readMealImageSignedUrl).mockReset();
  });

  afterEach(() => {
    if (originalFlag === undefined) delete process.env.MEAL_IMAGE_GENERATION_ENABLED;
    else process.env.MEAL_IMAGE_GENERATION_ENABLED = originalFlag;
  });

  it('7. sem autenticação → 401', async () => {
    vi.mocked(requireMealImageAccess).mockResolvedValue(
      NextResponse.json({ ok: false, error: 'Não autenticado. Faça login novamente.' }, { status: 401 })
    );
    const res = await GET(getUrl({ patientId: 'pac-1', refeicaoKey: 'almoco', slotId: 'slot_almoco_1' }));
    expect(res.status).toBe(401);
    expect(vi.mocked(readMealImageSignedUrl)).not.toHaveBeenCalled();
  });

  it('8. usuário sem acesso → 403', async () => {
    vi.mocked(requireMealImageAccess).mockResolvedValue(
      NextResponse.json({ ok: false, error: 'Você não tem permissão para este paciente.' }, { status: 403 })
    );
    const res = await GET(getUrl({ patientId: 'pac-1', refeicaoKey: 'almoco', slotId: 'slot_almoco_1' }));
    expect(res.status).toBe(403);
    expect(vi.mocked(readMealImageSignedUrl)).not.toHaveBeenCalled();
  });

  it('9. gcsPath arbitrário no query é ignorado', async () => {
    vi.mocked(requireMealImageAccess).mockResolvedValue({
      uid: 'user-pac',
      role: 'patient',
      pacienteDocId: 'pac-doc',
    });
    vi.mocked(readMealImageSignedUrl).mockResolvedValue({
      ok: true,
      imageUrl: 'https://signed.example/from-firestore.webp',
      status: 'ready',
      sourceHash: 'h1',
    });

    const res = await GET(
      getUrl({
        patientId: 'pac-1',
        refeicaoKey: 'almoco',
        slotId: 'slot_almoco_1',
        gcsPath: 'chatnutri/outro-paciente/secreto.jpg',
      })
    );
    expect(res.status).toBe(200);
    expect(vi.mocked(readMealImageSignedUrl)).toHaveBeenCalledWith({
      patientId: 'pac-doc',
      refeicaoKey: 'almoco',
      slotId: 'slot_almoco_1',
      slotIndex: null,
    });
    const json = await res.json();
    expect(json.imageUrl).toBe('https://signed.example/from-firestore.webp');
  });

  it('10. slot sem imagem → 200 com imageUrl null', async () => {
    vi.mocked(requireMealImageAccess).mockResolvedValue({
      uid: 'user-pac',
      role: 'patient',
      pacienteDocId: 'pac-doc',
    });
    vi.mocked(readMealImageSignedUrl).mockResolvedValue({
      ok: true,
      imageUrl: null,
      status: null,
    });
    const res = await GET(
      getUrl({ patientId: 'pac-1', refeicaoKey: 'almoco', slotId: 'slot_almoco_1' })
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ ok: true, imageUrl: null, status: null });
  });

  it('feature flag off não bloqueia GET de imagens existentes', async () => {
    process.env.MEAL_IMAGE_GENERATION_ENABLED = 'false';
    vi.mocked(requireMealImageAccess).mockResolvedValue({
      uid: 'user-pac',
      role: 'patient',
      pacienteDocId: 'pac-doc',
    });
    vi.mocked(readMealImageSignedUrl).mockResolvedValue({
      ok: true,
      imageUrl: 'https://signed.example/kept.webp',
      status: 'ready',
      sourceHash: 'h1',
    });
    const res = await GET(
      getUrl({ patientId: 'pac-1', refeicaoKey: 'almoco', slotId: 'slot_almoco_1' })
    );
    expect(res.status).toBe(200);
    expect(vi.mocked(readMealImageSignedUrl)).toHaveBeenCalled();
    const json = await res.json();
    expect(json.imageUrl).toBe('https://signed.example/kept.webp');
  });
});
