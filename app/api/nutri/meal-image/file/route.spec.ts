import { NextRequest, NextResponse } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/nutri/mealImageAccess.server', () => ({
  requireMealImageAccess: vi.fn(),
}));

vi.mock('@/lib/nutri/mealImageReadService.server', () => ({
  readMealImageFile: vi.fn(),
}));

import { requireMealImageAccess } from '@/lib/nutri/mealImageAccess.server';
import { readMealImageFile } from '@/lib/nutri/mealImageReadService.server';
import { GET } from '@/app/api/nutri/meal-image/file/route';

function getUrl(query: Record<string, string>) {
  const params = new URLSearchParams(query);
  return new NextRequest(`http://localhost/api/nutri/meal-image/file?${params.toString()}`, {
    method: 'GET',
  });
}

describe('GET /api/nutri/meal-image/file', () => {
  beforeEach(() => {
    vi.mocked(requireMealImageAccess).mockReset();
    vi.mocked(readMealImageFile).mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('sem autenticação → 401 e não baixa arquivo', async () => {
    vi.mocked(requireMealImageAccess).mockResolvedValue(
      NextResponse.json({ ok: false, error: 'Não autenticado. Faça login novamente.' }, { status: 401 })
    );
    const res = await GET(getUrl({ patientId: 'pac-1', refeicaoKey: 'almoco', slotId: 'slot_almoco_1' }));
    expect(res.status).toBe(401);
    expect(vi.mocked(readMealImageFile)).not.toHaveBeenCalled();
  });

  it('ignora gcsPath do query', async () => {
    vi.mocked(requireMealImageAccess).mockResolvedValue({
      uid: 'user-pac',
      role: 'patient',
      pacienteDocId: 'pac-doc',
    });
    vi.mocked(readMealImageFile).mockResolvedValue({
      ok: true,
      buffer: Buffer.from([1, 2, 3]),
      contentType: 'image/webp',
    });
    const res = await GET(
      getUrl({
        patientId: 'pac-1',
        refeicaoKey: 'almoco',
        slotId: 'slot_almoco_1',
        gcsPath: 'cardapio/outro/secreto.webp',
      })
    );
    expect(res.status).toBe(200);
    expect(vi.mocked(readMealImageFile)).toHaveBeenCalledWith({
      patientId: 'pac-doc',
      refeicaoKey: 'almoco',
      slotId: 'slot_almoco_1',
      slotIndex: null,
    });
    expect(res.headers.get('Content-Type')).toBe('image/webp');
  });
});
