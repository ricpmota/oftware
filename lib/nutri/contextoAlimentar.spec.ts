import { describe, expect, it } from 'vitest';
import {
  CONTEXTO_ALIMENTAR_CATALOGO_V1,
  itemPermitidoNaRefeicaoAutomatica,
  obterAdequacaoItemParaRefeicao,
} from '@/lib/nutri/contextoAlimentar';
import { CATALOGO_OPCAO_01_ATUAL } from '@/lib/nutri/catalogoOpcao01';

describe('contextoAlimentar', () => {
  it('todos os IDs do catálogo atual têm contexto explícito', () => {
    for (const item of CATALOGO_OPCAO_01_ATUAL) {
      expect(CONTEXTO_ALIMENTAR_CATALOGO_V1[item.id], item.id).toBeDefined();
    }
  });

  it('arroz tem adequação 0 no café e lanches', () => {
    for (const id of [
      'carb_arroz_branco_3col',
      'carb_arroz_integral_3col',
      'carb_arroz_branco_2col',
      'carb_arroz_integral_2col',
    ]) {
      expect(obterAdequacaoItemParaRefeicao(id, 'cafe')).toBe(0);
      expect(obterAdequacaoItemParaRefeicao(id, 'lanche1')).toBe(0);
      expect(obterAdequacaoItemParaRefeicao(id, 'lanche2')).toBe(0);
      expect(itemPermitidoNaRefeicaoAutomatica(id, 'cafe')).toBe(false);
    }
  });

  it('frango/carne/peixe proibidos no café automático', () => {
    expect(itemPermitidoNaRefeicaoAutomatica('prot_frango_100g', 'cafe')).toBe(false);
    expect(itemPermitidoNaRefeicaoAutomatica('prot_carne_magra_100g', 'cafe')).toBe(false);
    expect(itemPermitidoNaRefeicaoAutomatica('prot_peixe_100g', 'cafe')).toBe(false);
  });

  it('whey e iogurte proibidos no almoço', () => {
    expect(itemPermitidoNaRefeicaoAutomatica('prot_whey_1dose', 'almoco')).toBe(false);
    expect(itemPermitidoNaRefeicaoAutomatica('prot_iogurte_proteico', 'almoco')).toBe(false);
  });

  it('item sem contexto retorna adequação 0', () => {
    expect(obterAdequacaoItemParaRefeicao('id_inexistente_xyz', 'cafe')).toBe(0);
  });

  it('peito de peru marcado ultraprocessado', () => {
    expect(CONTEXTO_ALIMENTAR_CATALOGO_V1.prot_peito_peru.ultraprocessado).toBe(true);
  });
});
