import { describe, expect, it } from 'vitest';
import {
  definirTipoDiabetes,
  diagnosticosLegadoSelecionados,
  removerDiabetes,
  rotuloDiabetesSelecionado,
  toggleDiagnosticoOpcao,
} from './diagnosticoCondicoes';

describe('diagnosticoCondicoes', () => {
  it('nenhuma limpa as outras marcas e um segundo clique desmarca', () => {
    expect(toggleDiagnosticoOpcao(['dm2', 'obesidade', 'pre_diabetes'], 'nenhuma')).toEqual(['nenhuma']);
    expect(toggleDiagnosticoOpcao(['nenhuma'], 'nenhuma')).toEqual([]);
  });

  it('uma condição nova tira o nenhuma e mantém o histórico antigo', () => {
    expect(toggleDiagnosticoOpcao(['nenhuma', 'obesidade'], 'pre_diabetes')).toEqual([
      'obesidade',
      'pre_diabetes',
    ]);
    expect(toggleDiagnosticoOpcao(['obesidade', 'sop_ri'], 'sop_ri')).toEqual(['obesidade']);
  });

  it('diabetes substitui o tipo anterior e remove nenhuma', () => {
    expect(definirTipoDiabetes(['dm1', 'nenhuma', 'pre_diabetes'], 'dm2')).toEqual([
      'pre_diabetes',
      'dm2',
    ]);
    expect(rotuloDiabetesSelecionado(['pre_diabetes', 'dm2'])).toBe('Tipo 2');
    expect(rotuloDiabetesSelecionado(['dm1', 'dm2'])).toBe('Tipo 1 e tipo 2');
    expect(removerDiabetes(['dm2', 'sop_ri'])).toEqual(['sop_ri']);
  });

  it('só devolve chaves antigas que já estão marcadas', () => {
    expect(diagnosticosLegadoSelecionados(['dm1', 'obesidade', 'pre_diabetes', 'outro'])).toEqual([
      'obesidade',
      'outro',
    ]);
  });
});
