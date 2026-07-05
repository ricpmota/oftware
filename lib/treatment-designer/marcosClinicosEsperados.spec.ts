import { describe, expect, it } from 'vitest';
import {
  calcularSemanaMarcoPercentual,
  calcularTabelaMarcosClinicosEsperados,
  resolverMetaPercentual,
} from '@/lib/treatment-designer/marcosClinicosEsperados';

describe('marcosClinicosEsperados', () => {
  const peso = 100;

  it('resolve meta percentual efetiva (teto 22%) a partir de kg ou percentual', () => {
    expect(resolverMetaPercentual({ pesoInicialKg: 100, metaKg: 24.5 })).toBe(22);
    expect(resolverMetaPercentual({ pesoInicialKg: 100, metaPercentual: 18 })).toBe(18);
    expect(resolverMetaPercentual({ pesoInicialKg: 100, metaPercentual: 24.5 })).toBe(22);
  });

  it('calcula semanas por percentual com ritmos distintos', () => {
    expect(calcularSemanaMarcoPercentual(peso, 5, 'lento')).toBe(8);
    expect(calcularSemanaMarcoPercentual(peso, 5, 'agressivo')).toBe(4);
    expect(calcularSemanaMarcoPercentual(peso, 5, 'agressivo')).toBeLessThan(
      calcularSemanaMarcoPercentual(peso, 5, 'lento')
    );
  });

  it('monta tabela com marcos percentuais e consolidação', () => {
    const tabela = calcularTabelaMarcosClinicosEsperados({
      pesoInicialKg: peso,
      metaKg: 24.5,
    });

    expect(tabela.metaPercentual).toBe(22);
    expect(tabela.linhas).toHaveLength(6);
    expect(tabela.linhas[0].rotulo).toContain('5,0%');
    expect(tabela.linhas[0].gradual).toBe('Semana 8');
    expect(tabela.linhas[tabela.linhas.length - 1]).toMatchObject({
      rotulo: 'Início da consolidação',
      gradual: 'Após atingir a meta',
      acelerado: 'Após atingir a meta',
    });
  });

  it('oculta marcos acima da meta personalizada', () => {
    const tabela = calcularTabelaMarcosClinicosEsperados({
      pesoInicialKg: peso,
      metaKg: 12,
    });

    const linha15 = tabela.linhas.find((l) => l.id === 'perda_15');
    const linha20 = tabela.linhas.find((l) => l.id === 'perda_20');
    expect(linha15?.gradual).toBe('—');
    expect(linha20?.acelerado).toBe('—');
  });
});
