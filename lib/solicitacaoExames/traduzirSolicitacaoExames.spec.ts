import { describe, expect, it } from 'vitest';
import {
  parseTraducaoSolicitacaoExames,
  TraducaoSolicitacaoExamesError,
} from '@/lib/solicitacaoExames/traduzirSolicitacaoExames';

const source = {
  exames: ['Hemograma Completo', 'Glicemia de jejum'],
  hipoteseDiagnostica: 'Investigação de diabetes.',
};

describe('parseTraducaoSolicitacaoExames', () => {
  it('aceita a mesma quantidade de exames em inglês', () => {
    const raw = JSON.stringify({
      exames: ['Complete blood count', 'Fasting glucose'],
      hipoteseDiagnostica: 'Diabetes workup.',
    });
    expect(parseTraducaoSolicitacaoExames(raw, source).exames[0]).toBe('Complete blood count');
  });

  it('recusa quando some um exame', () => {
    const raw = JSON.stringify({
      exames: ['Complete blood count'],
      hipoteseDiagnostica: 'Diabetes workup.',
    });
    expect(() => parseTraducaoSolicitacaoExames(raw, source)).toThrow(TraducaoSolicitacaoExamesError);
  });
});
