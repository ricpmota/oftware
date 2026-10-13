import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import type { CardapioPdfContext } from '@/types/cardapioPrint';
import {
  cardapioPdfMealImageKey,
  coletarMealImageRefsDoCardapio,
  hydrateCardapioPdfMealImages,
} from '@/lib/nutri/cardapioPdfMealImages';

vi.mock('@/lib/nutri/mealImageUrlClient', () => ({
  fetchMealDishImageUrl: vi.fn(async () => 'https://signed.example/prato.webp'),
}));

import { fetchMealDishImageUrl } from '@/lib/nutri/mealImageUrlClient';

const ref = {
  patientId: 'pac-1',
  refeicaoKey: 'almoco',
  slotId: 'slot_almoco_1',
  sourceHash: 'abc',
  gcsPath: 'cardapio/pac-1/almoco/slot_almoco_1/abc.webp',
};

function ctxComFoto(): CardapioPdfContext {
  return {
    pacienteNome: 'Ana',
    dataImpressao: '05/09/2026',
    refeicoes: [
      {
        nomeRefeicao: 'Almoço',
        tituloOpcao: 'Opção 01',
        itens: [],
        opcoes: [
          {
            tituloOpcao: 'Opção 01',
            itens: [{ descricao: 'Frango', proteinaG: 30, kcal: 200 }],
            mealImageRef: ref,
          },
        ],
      },
    ],
    resumoDia: [],
    totais: { protAtual: 30, protPrev: 30, kcalAtual: 200, kcalPrev: 200 },
  };
}

describe('fotos do prato no relatório do cardápio', () => {
  it('coleta refs sem duplicar', () => {
    const refs = coletarMealImageRefsDoCardapio(ctxComFoto());
    expect(refs).toHaveLength(1);
    expect(cardapioPdfMealImageKey(refs[0]!)).toBe('pac-1:almoco:slot_almoco_1:abc');
  });

  it('hidrata signed URL na opção', async () => {
    const next = await hydrateCardapioPdfMealImages(ctxComFoto(), async () => 'token');
    expect(next.refeicoes[0]?.opcoes[0]?.imageUrl).toBe('https://signed.example/prato.webp');
    expect(vi.mocked(fetchMealDishImageUrl)).toHaveBeenCalledWith(
      expect.objectContaining({
        patientId: 'pac-1',
        refeicaoKey: 'almoco',
        slotId: 'slot_almoco_1',
      }),
      expect.anything()
    );
  });

  it('impressão só lê a foto, não gera', () => {
    const root = path.resolve(__dirname, '../..');
    for (const file of [
      'lib/nutri/cardapioPdfMealImages.ts',
      'utils/cardapioPdfMealImage.ts',
      'utils/cardapioPdfDownload.ts',
      'components/CardapioPrintModal.tsx',
      'app/api/nutri/meal-image/file/route.ts',
    ]) {
      const src = readFileSync(path.join(root, file), 'utf8');
      expect(src, file).not.toContain('/api/nutri/meal-image/generate');
    }
    const modal = readFileSync(path.join(root, 'components/CardapioPrintModal.tsx'), 'utf8');
    expect(modal).toContain('opcao.imageUrl');
    expect(modal).toContain('Qtd');
    expect(modal).toContain('Prot.');
    const nutri = readFileSync(path.join(root, 'components/NutriContent.tsx'), 'utf8');
    expect(nutri).toContain('mealImageRef');
  });
});
