import { describe, expect, it } from 'vitest';
import {
  GRUPO_PROTEICO_POR_ITEM_ID,
  grupoProteicoPermitidoPorRestricoes,
  normalizarPreferenciasProteina,
} from '@/lib/nutri/gruposProteicos';

describe('gruposProteicos', () => {
  it('normaliza Frango/Peixe/Carne/Ovos/Laticínios/Leguminosas', () => {
    const r = normalizarPreferenciasProteina([
      'Frango',
      'Peixe',
      'Carne',
      'Ovos',
      'Laticínios',
      'Leguminosas',
    ]);
    expect(r.grupos).toEqual([
      'frango',
      'peixe',
      'carne',
      'ovos',
      'laticinios',
      'leguminosas',
    ]);
    expect(r.desconhecidos).toEqual([]);
  });

  it('não muta o array original e remove duplicados', () => {
    const orig = ['Frango', 'frango', 'Ovos'];
    const r = normalizarPreferenciasProteina(orig);
    expect(orig).toEqual(['Frango', 'frango', 'Ovos']);
    expect(r.grupos).toEqual(['frango', 'ovos']);
  });

  it('valor desconhecido gera alerta', () => {
    const r = normalizarPreferenciasProteina(['XYZ']);
    expect(r.alertas).toContain('PREFERENCIA_PROTEICA_DESCONHECIDA');
    expect(r.desconhecidos).toContain('XYZ');
  });

  it('vazio gera PREFERENCIAS_PROTEICAS_AUSENTES', () => {
    const r = normalizarPreferenciasProteina([]);
    expect(r.alertas).toContain('PREFERENCIAS_PROTEICAS_AUSENTES');
  });

  it('mapeia IDs reais sem parse de nome', () => {
    expect(GRUPO_PROTEICO_POR_ITEM_ID.prot_frango_100g).toBe('frango');
    expect(GRUPO_PROTEICO_POR_ITEM_ID.prot_peixe_100g).toBe('peixe');
    expect(GRUPO_PROTEICO_POR_ITEM_ID.prot_ovos_2un).toBe('ovos');
  });

  it('vegano elimina animal/ovos/laticínios/whey', () => {
    expect(grupoProteicoPermitidoPorRestricoes('ovos', ['vegano'])).toBe(false);
    expect(grupoProteicoPermitidoPorRestricoes('frango', ['vegano'])).toBe(false);
    expect(grupoProteicoPermitidoPorRestricoes('whey', ['vegano'])).toBe(false);
    expect(grupoProteicoPermitidoPorRestricoes('tofu', ['vegano'])).toBe(true);
    expect(grupoProteicoPermitidoPorRestricoes('leguminosas', ['vegano'])).toBe(true);
  });

  it('vegetariano elimina carne/peixe/frango', () => {
    expect(grupoProteicoPermitidoPorRestricoes('carne', ['vegetariano'])).toBe(false);
    expect(grupoProteicoPermitidoPorRestricoes('ovos', ['vegetariano'])).toBe(true);
  });

  it('lactose não elimina ovos', () => {
    expect(
      grupoProteicoPermitidoPorRestricoes('ovos', ['intolerância lactose'])
    ).toBe(true);
    expect(
      grupoProteicoPermitidoPorRestricoes('frango', ['intolerância lactose'])
    ).toBe(true);
  });

  it('sem glúten não elimina frango/peixe', () => {
    expect(grupoProteicoPermitidoPorRestricoes('frango', ['sem glúten'])).toBe(true);
    expect(grupoProteicoPermitidoPorRestricoes('peixe', ['sem glúten'])).toBe(true);
  });
});
