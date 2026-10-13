import { describe, expect, it } from 'vitest';
import { normalizeNomeAlimento } from '@/lib/metaadmingeral/alimentosGlobais/normalizeNomeAlimento';
import {
  alimentoMatchesFilters,
  parseNullableNumber,
  serializeAlimentoGlobalPayload,
} from '@/lib/metaadmingeral/alimentosGlobais/parseAlimentoGlobal';
import type { AlimentoGlobal } from '@/lib/metaadmingeral/alimentosGlobais/types';

describe('normalizeNomeAlimento', () => {
  it('normaliza banana prata madura', () => {
    expect(normalizeNomeAlimento('Banana, Prata, Madura')).toBe('banana prata madura');
  });

  it('remove acentos e espaços duplicados', () => {
    expect(normalizeNomeAlimento('  Açúcar   cristal  ')).toBe('acucar cristal');
  });
});

describe('parseNullableNumber', () => {
  it('preserva zero e trata ausência como null', () => {
    expect(parseNullableNumber(0)).toBe(0);
    expect(parseNullableNumber('0')).toBe(0);
    expect(parseNullableNumber('')).toBe(null);
    expect(parseNullableNumber(null)).toBe(null);
    expect(parseNullableNumber(undefined)).toBe(null);
  });
});

describe('serializeAlimentoGlobalPayload', () => {
  it('exige nome e segmento na criação', () => {
    expect(() =>
      serializeAlimentoGlobalPayload({ nome: '', segmento: 'FRUTAS_E_DERIVADOS', status: 'draft' }, {
        forCreate: true,
      })
    ).toThrow(/Nome/);
  });

  it('grava nutrientes ausentes como null (não zero)', () => {
    const payload = serializeAlimentoGlobalPayload(
      {
        nome: 'Banana, prata, madura',
        segmento: 'FRUTAS_E_DERIVADOS',
        status: 'draft',
        energiaKcal: null,
        proteinasG: 0,
      },
      { forCreate: true }
    );
    expect(payload.energiaKcal).toBeNull();
    expect(payload.proteinasG).toBe(0);
    expect(payload.nomeNormalizado).toBe('banana prata madura');
  });
});

describe('alimentoMatchesFilters', () => {
  const base: AlimentoGlobal = {
    id: '1',
    nome: 'Banana, prata, madura',
    nomeNormalizado: 'banana prata madura',
    segmento: 'FRUTAS_E_DERIVADOS',
    baseQuantidade: 100,
    baseUnidade: 'g',
    status: 'published',
    criadoEm: new Date(),
    atualizadoEm: new Date(),
  };

  it('filtra por segmento e busca', () => {
    expect(alimentoMatchesFilters(base, { segmento: 'FRUTAS_E_DERIVADOS', q: 'banana' })).toBe(true);
    expect(alimentoMatchesFilters(base, { segmento: 'CARNES_E_DERIVADOS' })).toBe(false);
    expect(alimentoMatchesFilters(base, { status: 'draft' })).toBe(false);
  });
});
