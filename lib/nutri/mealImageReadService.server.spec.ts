import { describe, expect, it, vi } from 'vitest';
import { buildMealImageSourceHash } from '@/lib/nutri/mealImageSource';
import { readMealImageFile, readMealImageSignedUrl } from '@/lib/nutri/mealImageReadService.server';

const prato = {
  id: 'slot_almoco_1',
  itensDetalhe: [{ nome: 'Frango grelhado', peso_g: 120 }],
};
const sourceHash = buildMealImageSourceHash(prato);

describe('readMealImageSignedUrl', () => {
  it('10. slot sem imagem → ok sem imageUrl', async () => {
    const result = await readMealImageSignedUrl(
      { patientId: 'pac-1', refeicaoKey: 'almoco', slotId: 'slot_almoco_1' },
      {
        loadPlano: async () => ({ opcoesSlots: { almoco: [prato] } }),
        signPath: vi.fn(async () => 'https://should-not-sign'),
      }
    );
    expect(result).toEqual({ ok: true, imageUrl: null, status: null });
  });

  it('ready + hash atual → assina o gcsPath do Firestore', async () => {
    const gcsPath = `cardapio/pac-1/almoco/slot_almoco_1/${sourceHash}.webp`;
    const signPath = vi.fn(async (path: string, patientId: string) => {
      expect(path).toBe(gcsPath);
      expect(patientId).toBe('pac-1');
      return 'https://signed.example/foto.webp';
    });
    const result = await readMealImageSignedUrl(
      { patientId: 'pac-1', refeicaoKey: 'almoco', slotId: 'slot_almoco_1' },
      {
        loadPlano: async () => ({
          opcoesSlots: {
            almoco: [
              {
                ...prato,
                mealImage: { gcsPath, sourceHash, status: 'ready' },
              },
            ],
          },
        }),
        signPath,
      }
    );
    expect(result).toMatchObject({
      ok: true,
      imageUrl: 'https://signed.example/foto.webp',
      status: 'ready',
      sourceHash,
    });
    expect(signPath).toHaveBeenCalledTimes(1);
  });

  it('pending/failed/hash antigo → não assina', async () => {
    const signPath = vi.fn(async () => 'https://nope');
    const pending = await readMealImageSignedUrl(
      { patientId: 'pac-1', refeicaoKey: 'almoco', slotId: 'slot_almoco_1' },
      {
        loadPlano: async () => ({
          opcoesSlots: {
            almoco: [{ ...prato, mealImage: { status: 'pending', sourceHash } }],
          },
        }),
        signPath,
      }
    );
    expect(pending).toMatchObject({ ok: true, imageUrl: null, status: 'pending' });

    const stale = await readMealImageSignedUrl(
      { patientId: 'pac-1', refeicaoKey: 'almoco', slotId: 'slot_almoco_1' },
      {
        loadPlano: async () => ({
          opcoesSlots: {
            almoco: [
              {
                ...prato,
                mealImage: {
                  gcsPath: 'cardapio/pac-1/almoco/slot_almoco_1/old.webp',
                  sourceHash: '0000000000000000',
                  status: 'ready',
                },
              },
            ],
          },
        }),
        signPath,
      }
    );
    expect(stale).toMatchObject({ ok: true, imageUrl: null });
    expect(signPath).not.toHaveBeenCalled();
  });

  it('16. pending com gcsPath atual → assina a foto anterior', async () => {
    const gcsPath = `cardapio/pac-1/almoco/slot_almoco_1/${sourceHash}.webp`;
    const signPath = vi.fn(async () => 'https://signed.example/antiga.webp');
    const result = await readMealImageSignedUrl(
      { patientId: 'pac-1', refeicaoKey: 'almoco', slotId: 'slot_almoco_1' },
      {
        loadPlano: async () => ({
          opcoesSlots: {
            almoco: [
              {
                ...prato,
                mealImage: {
                  gcsPath,
                  sourceHash,
                  status: 'pending',
                  generationStartedAt: '2026-09-04T12:00:00.000Z',
                },
              },
            ],
          },
        }),
        signPath,
      }
    );
    expect(result).toMatchObject({
      ok: true,
      imageUrl: 'https://signed.example/antiga.webp',
      status: 'pending',
    });
    expect(signPath).toHaveBeenCalledWith(gcsPath, 'pac-1');
  });

  it('21. path legado ready continua assinável', async () => {
    const gcsPath = `cardapio/pac-1/almoco/slot_almoco_1/${sourceHash}.webp`;
    const signPath = vi.fn(async () => 'https://signed.example/legado.webp');
    const result = await readMealImageSignedUrl(
      { patientId: 'pac-1', refeicaoKey: 'almoco', slotId: 'slot_almoco_1' },
      {
        loadPlano: async () => ({
          opcoesSlots: {
            almoco: [{ ...prato, mealImage: { gcsPath, sourceHash, status: 'ready' } }],
          },
        }),
        signPath,
      }
    );
    expect(result.ok && 'imageUrl' in result && result.imageUrl).toBe('https://signed.example/legado.webp');
  });

  it('recusa slot de outra refeição e path traversal', async () => {
    const signPath = vi.fn(async () => 'https://nope');
    const mismatch = await readMealImageSignedUrl(
      { patientId: 'pac-1', refeicaoKey: 'almoco', slotId: 'slot_jantar_1' },
      { loadPlano: async () => ({ opcoesSlots: { almoco: [prato] } }), signPath }
    );
    expect(mismatch).toMatchObject({ ok: false, code: 'INVALID_INPUT' });
    expect(signPath).not.toHaveBeenCalled();

    const traversal = await readMealImageSignedUrl(
      { patientId: '../pac-1', refeicaoKey: 'almoco', slotId: 'slot_almoco_1' },
      { loadPlano: async () => ({ opcoesSlots: { almoco: [prato] } }), signPath }
    );
    expect(traversal).toMatchObject({ ok: false, code: 'INVALID_INPUT' });
  });
});

describe('readMealImageFile', () => {
  it('baixa bytes do gcsPath do Firestore e ignora path arbitrário', async () => {
    const gcsPath = `cardapio/pac-1/almoco/slot_almoco_1/${sourceHash}.webp`;
    const downloadBytes = vi.fn(async (path: string, patientId: string) => {
      expect(path).toBe(gcsPath);
      expect(patientId).toBe('pac-1');
      return { buffer: Buffer.from([1, 2, 3]), contentType: 'image/webp' };
    });
    const result = await readMealImageFile(
      { patientId: 'pac-1', refeicaoKey: 'almoco', slotId: 'slot_almoco_1' },
      {
        loadPlano: async () => ({
          opcoesSlots: {
            almoco: [{ ...prato, mealImage: { gcsPath, sourceHash, status: 'ready' } }],
          },
        }),
        signPath: vi.fn(async () => 'https://nope'),
        downloadBytes,
      }
    );
    expect(result).toMatchObject({ ok: true, contentType: 'image/webp' });
    if (result.ok && result.buffer) expect(result.buffer.equals(Buffer.from([1, 2, 3]))).toBe(true);
    expect(downloadBytes).toHaveBeenCalledTimes(1);
  });
});
