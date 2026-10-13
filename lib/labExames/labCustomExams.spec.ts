import { describe, expect, it } from 'vitest';
import {
  extraSectionLabelsFromCustomExams,
  mergeEnabledCustomExamsIntoOrder,
  slugifyCustomExamKey,
  slugifyCustomSectionId,
  uniqueCustomExamKey,
  type LabCustomExam,
} from '@/lib/labExames/labCustomExams';

function sample(partial: Partial<LabCustomExam>): LabCustomExam {
  return {
    id: '1',
    key: 'cx_zinco',
    label: 'Zinco sérico',
    unit: 'µg/dL',
    min: 70,
    max: 120,
    sectionId: 'renalMetabolico',
    sectionLabel: 'Função Renal e Metabólica',
    enabled: true,
    createdByMedicoId: 'med1',
    createdAt: '2026-01-01T00:00:00.000Z',
    ...partial,
  };
}

describe('labCustomExams', () => {
  it('gera chave estável a partir do nome', () => {
    expect(slugifyCustomExamKey('Zinco sérico')).toBe('cx_zinco_serico');
    expect(slugifyCustomSectionId('Novo Setor X')).toBe('sec_novo_setor_x');
  });

  it('evita colisão de chave', () => {
    const keys = new Set(['cx_zinco_serico']);
    expect(uniqueCustomExamKey('Zinco sérico', keys)).toBe('cx_zinco_serico_2');
  });

  it('só mescla exames habilitados na ordem', () => {
    const order = { renalMetabolico: ['urea'] };
    const merged = mergeEnabledCustomExamsIntoOrder(order, [
      sample({ enabled: true }),
      sample({ id: '2', key: 'cx_oculto', enabled: false }),
      sample({ id: '3', key: 'cx_novo_setor', sectionId: 'sec_custom', enabled: true }),
    ]);
    expect(merged.renalMetabolico).toEqual(['urea', 'cx_zinco']);
    expect(merged.sec_custom).toEqual(['cx_novo_setor']);
    expect(order.renalMetabolico).toEqual(['urea']);
  });

  it('expõe rótulo só de setores novos habilitados', () => {
    const labels = extraSectionLabelsFromCustomExams([
      sample({ sectionId: 'sec_abc', sectionLabel: 'Setor ABC', enabled: true }),
      sample({ sectionId: 'renalMetabolico', enabled: true }),
    ]);
    expect(labels.sec_abc).toBe('Setor ABC');
    expect(labels.renalMetabolico).toBeUndefined();
  });
});
