import { describe, expect, it } from 'vitest';
import {
  coletarSlotsPreenchidosParaImpressao,
  devePromoverSlotSalvoComoAtual,
  mesclarSlotsAposAnamnese,
  planoTemEdicaoDeNutricionista,
  resolverOpcaoAtualComPrecedenciaNutri,
  slotFoiEditadoPorNutricionista,
  type SlotCardapioLike,
} from '@/lib/nutri/cardapioPrecedenciaNutri';

const auto01 = (refeicao: string): SlotCardapioLike => ({
  id: `slot_${refeicao}_1`,
  titulo: 'Opção 01',
  descricao: 'Ovos + pão padrão',
  proteina_g: 20,
  calorias_kcal: 300,
  itensSelecionados: ['prot_ovos_2un'],
  origem: 'automatica',
});

const nutri02 = (refeicao: string): SlotCardapioLike => ({
  id: `slot_${refeicao}_2`,
  titulo: 'Dieta da nutri',
  descricao: 'Iogurte + banana + aveia',
  proteina_g: 28,
  calorias_kcal: 320,
  itensSelecionados: ['metanutri_iogurte', 'metanutri_banana'],
  origem: 'manual',
});

describe('precedência do nutricionista no cardápio', () => {
  it('detecta slot manual/taco/metanutri', () => {
    expect(slotFoiEditadoPorNutricionista({ origem: 'manual' })).toBe(true);
    expect(slotFoiEditadoPorNutricionista({ origem: 'taco' })).toBe(true);
    expect(
      slotFoiEditadoPorNutricionista({
        origem: 'automatica',
        itensSelecionados: ['metanutri_x'],
      })
    ).toBe(true);
    expect(
      slotFoiEditadoPorNutricionista({
        origem: 'automatica',
        itensSelecionados: ['prot_ovos_2un'],
      })
    ).toBe(false);
    expect(
      slotFoiEditadoPorNutricionista({
        origem: 'paciente',
        itensSelecionados: ['metanutri_iogurte'],
      })
    ).toBe(false);
  });

  it('plano com opções 02–05 preenchidas conta como edição da nutri', () => {
    expect(
      planoTemEdicaoDeNutricionista({
        opcoesSlots: {
          cafe: [auto01('cafe'), nutri02('cafe'), { id: 'slot_cafe_3' }],
        },
      })
    ).toBe(true);
    expect(
      planoTemEdicaoDeNutricionista({
        opcoesSlots: { cafe: [auto01('cafe')] },
      })
    ).toBe(false);
  });

  it('remove opção 02 clonada da 01 (mesmo conteúdo, título padrão)', () => {
    const clone01: SlotCardapioLike = {
      id: 'slot_cafe_2',
      titulo: 'Opção 02',
      descricao: auto01('cafe').descricao,
      itensSelecionados: auto01('cafe').itensSelecionados,
      origem: 'automatica',
    };
    const slots = coletarSlotsPreenchidosParaImpressao([auto01('cafe'), clone01, nutri02('cafe')], 'cafe');
    expect(slots.map((s) => s.id)).toEqual(['slot_cafe_1', 'slot_cafe_2']);
    expect(slots[1]?.titulo).toBe('Dieta da nutri');
  });

  it('promove slot da nutri quando a Atual está vazia', () => {
    const vazia01: SlotCardapioLike = { id: 'slot_almoco_1', titulo: 'Opção 01' };
    const atual = resolverOpcaoAtualComPrecedenciaNutri(
      [vazia01, nutri02('almoco')],
      'slot_almoco_1',
      'almoco'
    );
    expect(atual).toBe('slot_almoco_2');
  });

  it('mantém a Atual escolhida mesmo se existir opção da nutri', () => {
    const atual = resolverOpcaoAtualComPrecedenciaNutri(
      [auto01('almoco'), nutri02('almoco')],
      'slot_almoco_1',
      'almoco'
    );
    expect(atual).toBe('slot_almoco_1');
  });

  it('não promove opção montada pelo paciente no lugar da Atual', () => {
    const paciente02: SlotCardapioLike = {
      id: 'slot_almoco_2',
      titulo: 'Minha opção',
      descricao: 'Ovos mexidos',
      itensSelecionados: ['prot_ovos_2un'],
      origem: 'paciente',
    };
    const atual = resolverOpcaoAtualComPrecedenciaNutri(
      [auto01('almoco'), paciente02],
      'slot_almoco_1',
      'almoco'
    );
    expect(atual).toBe('slot_almoco_1');
    expect(
      planoTemEdicaoDeNutricionista({
        opcoesSlots: { almoco: [auto01('almoco'), paciente02] },
      })
    ).toBe(false);
  });

  it('mantém Atual se a nutri já editou a Opção 01', () => {
    const editada: SlotCardapioLike = { ...auto01('almoco'), origem: 'manual' };
    const atual = resolverOpcaoAtualComPrecedenciaNutri(
      [editada, nutri02('almoco')],
      'slot_almoco_1',
      'almoco'
    );
    expect(atual).toBe('slot_almoco_1');
  });

  it('ao salvar, promove se Atual for automática', () => {
    expect(
      devePromoverSlotSalvoComoAtual({
        slotSalvoId: 'slot_cafe_2',
        opcaoAtualId: 'slot_cafe_1',
        slotAtual: auto01('cafe'),
      })
    ).toBe(true);
    expect(
      devePromoverSlotSalvoComoAtual({
        slotSalvoId: 'slot_cafe_2',
        opcaoAtualId: 'slot_cafe_1',
        slotAtual: { ...auto01('cafe'), origem: 'manual' },
      })
    ).toBe(false);
  });

  it('anamnese não sobrescreve slots da nutri', () => {
    const novos = {
      cafe: [auto01('cafe'), { id: 'slot_cafe_2' }, { id: 'slot_cafe_3' }, { id: 'slot_cafe_4' }, { id: 'slot_cafe_5' }],
      lanche1: [auto01('lanche1'), { id: 'slot_lanche1_2' }, { id: 'slot_lanche1_3' }, { id: 'slot_lanche1_4' }, { id: 'slot_lanche1_5' }],
      almoco: [auto01('almoco'), { id: 'slot_almoco_2' }, { id: 'slot_almoco_3' }, { id: 'slot_almoco_4' }, { id: 'slot_almoco_5' }],
      lanche2: [auto01('lanche2'), { id: 'slot_lanche2_2' }, { id: 'slot_lanche2_3' }, { id: 'slot_lanche2_4' }, { id: 'slot_lanche2_5' }],
      jantar: [auto01('jantar'), { id: 'slot_jantar_2' }, { id: 'slot_jantar_3' }, { id: 'slot_jantar_4' }, { id: 'slot_jantar_5' }],
    };
    const mesclado = mesclarSlotsAposAnamnese(novos, {
      cafe: [
        {
          ...auto01('cafe'),
          origem: 'manual',
          descricao: 'Prato da nutri',
          mealImage: { gcsPath: 'cardapio/p/cafe/1/x.jpg', status: 'ready' },
        },
        nutri02('cafe'),
      ],
    });
    expect(mesclado.cafe[0]?.descricao).toBe('Prato da nutri');
    expect(mesclado.cafe[0]?.origem).toBe('manual');
    expect(mesclado.cafe[0]?.mealImage?.gcsPath).toBe('cardapio/p/cafe/1/x.jpg');
    expect(mesclado.cafe[1]?.titulo).toBe('Dieta da nutri');
    expect(mesclado.almoco[0]?.origem).toBe('automatica');
    expect(mesclado.almoco[0]?.mealImage).toBeUndefined();
  });
});
