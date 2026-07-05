import { describe, expect, it } from 'vitest';
import {
  calcularSemanaMetaComDose,
  gerarCurvaPesoComManutencao,
  montarFasesVisuaisPlano,
} from '@/lib/planoTerapeutico/curvaPesoPlano';
import {
  faixaPesoAoFimPeriodo,
  perdaTotalFaixaPeriodoComLimite,
} from '@/lib/planoTerapeutico/faixaPerdaPeso';

describe('curvaPesoPlano', () => {
  it('platô após atingir a meta', () => {
    const curva = gerarCurvaPesoComManutencao(100, 10, 12, 8);
    expect(curva[0].pesoKg).toBe(100);
    expect(curva[8].pesoKg).toBe(90);
    expect(curva[12].pesoKg).toBe(90);
    expect(curva[9].pesoKg).toBe(90);
  });

  it('limita perda ao teto de 22%', () => {
    const curva = gerarCurvaPesoComManutencao(100, 30, 24, 24);
    expect(curva[curva.length - 1].pesoKg).toBe(78);
  });

  it('antecipa meta com dose maior', () => {
    const base = calcularSemanaMetaComDose(10, 14, 2.5, 2.5, 12);
    const maior = calcularSemanaMetaComDose(10, 14, 10, 2.5, 12);
    expect(maior).toBeLessThan(base);
  });

  it('monta fases após a meta', () => {
    const fases = montarFasesVisuaisPlano(12, 8);
    expect(fases.some((f) => f.id === 'consolidacao')).toBe(true);
    expect(fases.some((f) => f.id === 'perda_peso')).toBe(true);
  });
});

describe('faixaPerdaPeso com limite', () => {
  it('não ultrapassa 22% do peso', () => {
    const faixa = perdaTotalFaixaPeriodoComLimite(100, 24);
    expect(faixa.maxKg).toBe(22);
    expect(faixa.mediaKg).toBeLessThanOrEqual(22);
  });

  it('calcula faixa de peso ao fim', () => {
    const fim = faixaPesoAoFimPeriodo(100, 12);
    expect(fim.pesoMinKg).toBeLessThan(fim.pesoMaxKg);
    expect(fim.pesoMinKg).toBeGreaterThanOrEqual(78);
  });
});
