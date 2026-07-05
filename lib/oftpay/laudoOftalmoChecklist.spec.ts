import { describe, expect, it } from 'vitest';
import { buildChecklistCoverage, getChecklistStatusLabel } from '@/lib/oftpay/laudoOftalmoChecklist';

describe('buildChecklistCoverage', () => {
  it('retorna cobertura parcial coerente para campimetria com md/psd/vfi', () => {
    const result = buildChecklistCoverage('campimetria', {
      confiabilidade: null,
      md: '-3.2 dB',
      psd: '2.1 dB',
      vfi: '92%',
      ght: null,
    });

    expect(result.checklistFilledCount).toBe(3);
    expect(result.checklistTotal).toBe(4);
    expect(result.checklistStatus).toBe('good');
    expect(result.missingKeyFields).toContain('confiabilidade');
  });

  it('marca cobertura fraca para oct_disco sem RNFL', () => {
    const result = buildChecklistCoverage('oct_disco', {
      rnfl_global: null,
      rnfl_superior: null,
      rnfl_inferior: null,
      escavacao: null,
      observacoes_estruturais: null,
    });

    expect(result.checklistFilledCount).toBe(0);
    expect(result.checklistStatus).toBe('weak');
    expect(result.missingKeyFields).toEqual([
      'rnfl_global',
      'rnfl_superior',
      'rnfl_inferior',
      'escavacao',
    ]);
  });
});

describe('getChecklistStatusLabel', () => {
  it('retorna labels curtos em pt-br', () => {
    expect(getChecklistStatusLabel('good')).toBe('boa');
    expect(getChecklistStatusLabel('partial')).toBe('parcial');
    expect(getChecklistStatusLabel('weak')).toBe('fraca');
  });
});
