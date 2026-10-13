import { describe, expect, it } from 'vitest';
import { deltaLabelsNaSemanaAnterior } from '@/utils/evolucaoTratamentoDeltaLabel';

describe('deltaLabelsNaSemanaAnterior', () => {
  it('coloca a diferença na semana anterior e deixa a conclusão sem rótulo', () => {
    const labels = deltaLabelsNaSemanaAnterior([
      { peso: 80 },
      { peso: 78 },
      { peso: 75 },
      { peso: 74 },
    ]);

    expect(labels).toEqual(['-2.0', '-3.0', '-1.0', '']);
  });

  it('mostra ganho com sinal positivo na semana de referência', () => {
    expect(deltaLabelsNaSemanaAnterior([{ peso: 80 }, { peso: 82 }])).toEqual(['+2.0', '']);
  });

  it('não rotula quando a semana seguinte não tem peso', () => {
    expect(deltaLabelsNaSemanaAnterior([{ peso: 80 }, { peso: null }, { peso: 77 }])).toEqual(['', '', '']);
  });
});
