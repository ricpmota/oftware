import { describe, expect, it } from 'vitest';
import { applyExameExtraidoToForm, type ExameLaboratorialExtracaoNormalizada } from './exameLaboratorialExtracao';

describe('applyExameExtraidoToForm', () => {
  const extracted: ExameLaboratorialExtracaoNormalizada = {
    nomePacienteDocumento: null,
    dataExame: null,
    camposMapeados: { glicemiaJejum: 92, hemoglobinaGlicada: 5.4 },
    examesNaoMapeados: [],
    avisos: [],
  };

  it('sem replace: mantém campos laboratoriais anteriores não citados na extração', () => {
    const prev = {
      dataColeta: '2026-01-10',
      glicemiaJejum: 80,
      creatinina: 1.1,
    };
    const next = applyExameExtraidoToForm(prev, extracted, { applyDate: false });
    expect(next.creatinina).toBe(1.1);
    expect(next.glicemiaJejum).toBe(92);
    expect(next.hemoglobinaGlicada).toBe(5.4);
  });

  it('com replaceLaboratorialFieldsPrior: remove laboratoriais antigos e aplica só a extração', () => {
    const prev = {
      dataColeta: '2026-01-10',
      glicemiaJejum: 80,
      creatinina: 1.1,
    };
    const next = applyExameExtraidoToForm(prev, extracted, {
      applyDate: false,
      replaceLaboratorialFieldsPrior: true,
    });
    expect(next.creatinina).toBeUndefined();
    expect(next.glicemiaJejum).toBe(92);
    expect(next.hemoglobinaGlicada).toBe(5.4);
    expect(next.dataColeta).toBe('2026-01-10');
  });
});
