import { describe, expect, it } from 'vitest';
import { avaliarAfinidadeEntreItens } from '@/lib/nutri/afinidadeAlimentos';

describe('afinidadeAlimentos', () => {
  it('ovo + arroz no café é proibido', () => {
    expect(
      avaliarAfinidadeEntreItens('prot_ovos_2un', 'carb_arroz_branco_3col', 'cafe')
    ).toBe('proibida');
  });

  it('peixe + whey é proibido', () => {
    expect(avaliarAfinidadeEntreItens('prot_peixe_100g', 'prot_whey_1dose', 'almoco')).toBe(
      'proibida'
    );
  });

  it('carne + whey é proibido', () => {
    expect(
      avaliarAfinidadeEntreItens('prot_carne_magra_100g', 'prot_whey_1dose', 'jantar')
    ).toBe('proibida');
  });

  it('iogurte + arroz é proibido', () => {
    expect(
      avaliarAfinidadeEntreItens('prot_iogurte_proteico', 'carb_arroz_branco_3col', 'almoco')
    ).toBe('proibida');
  });

  it('azeite + castanhas é proibido', () => {
    expect(
      avaliarAfinidadeEntreItens('gord_azeite_1col', 'gord_castanhas_porcao', 'almoco')
    ).toBe('proibida');
  });

  it('ovo + pão é preferida no café', () => {
    expect(
      avaliarAfinidadeEntreItens('prot_ovos_2un', 'carb_pao_integral_1fat', 'cafe')
    ).toBe('preferida');
  });

  it('frango + arroz é preferida no almoço', () => {
    expect(
      avaliarAfinidadeEntreItens('prot_frango_100g', 'carb_arroz_branco_3col', 'almoco')
    ).toBe('preferida');
  });

  it('peixe + legumes é preferida no jantar', () => {
    expect(
      avaliarAfinidadeEntreItens('prot_peixe_100g', 'leg_legumes_cozidos', 'jantar')
    ).toBe('preferida');
  });
});
