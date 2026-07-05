import { describe, expect, it } from 'vitest';
import {
  indicesNivelPorBloco,
  montarDosesComDesmame,
  montarEscadinhaDose,
  montarPiramideCentral,
} from '@/lib/planoTerapeutico/escadinhaDose';

function indiceSemanaPicoMedio(doses: number[]): number {
  const max = Math.max(...doses);
  const idxs = doses.map((d, i) => (d === max ? i : -1)).filter((i) => i >= 0);
  return (Math.min(...idxs) + Math.max(...idxs)) / 2;
}

describe('indicesNivelPorBloco', () => {
  it('3 blocos: pico central único', () => {
    expect(indicesNivelPorBloco(3)).toEqual([0, 1, 0]);
  });

  it('6 blocos: pico em par central', () => {
    expect(indicesNivelPorBloco(6)).toEqual([0, 1, 2, 2, 1, 0]);
  });
});

describe('montarEscadinhaDose', () => {
  it('lento 12 sem: pico no mês 2 (semanas 5–8)', () => {
    const doses = montarEscadinhaDose(5, 12, 4);
    expect(doses).toHaveLength(12);
    expect(doses.slice(0, 4)).toEqual([5, 5, 5, 5]);
    expect(doses.slice(4, 8)).toEqual([7.5, 7.5, 7.5, 7.5]);
    expect(doses.slice(8, 12)).toEqual([5, 5, 5, 5]);
    expect(indiceSemanaPicoMedio(doses)).toBeCloseTo(5.5, 0);
  });

  it('agressivo 12 sem: pico central e retorno à dose inicial', () => {
    const doses = montarEscadinhaDose(2.5, 12, 2);
    expect(doses).toHaveLength(12);
    expect(doses[0]).toBe(2.5);
    expect(doses[11]).toBe(2.5);
    expect(Math.max(...doses)).toBe(7.5);
    expect(indiceSemanaPicoMedio(doses)).toBeCloseTo(5.5, 0);
  });

  it('não ultrapassa 15 mg', () => {
    const doses = montarEscadinhaDose(10, 24, 4);
    expect(doses.every((d) => d <= 15)).toBe(true);
  });
});

describe('montarDosesComDesmame / pirâmide centrada', () => {
  it('semestral lento 24 sem: pico nos meses 3–4', () => {
    const doses = montarDosesComDesmame(2.5, 24, 12, 4);
    expect(doses).toHaveLength(24);
    expect(doses.slice(0, 4)).toEqual([2.5, 2.5, 2.5, 2.5]);
    expect(doses.slice(4, 8)).toEqual([5, 5, 5, 5]);
    expect(doses.slice(8, 16)).toEqual([
      7.5, 7.5, 7.5, 7.5, 7.5, 7.5, 7.5, 7.5,
    ]);
    expect(doses.slice(16, 20)).toEqual([5, 5, 5, 5]);
    expect(doses.slice(20, 24)).toEqual([2.5, 2.5, 2.5, 2.5]);
    expect(indiceSemanaPicoMedio(doses)).toBeCloseTo(11.5, 0);
  });

  it('semestral agressivo 24 sem: pico central', () => {
    const doses = montarDosesComDesmame(2.5, 24, 12, 2);
    expect(doses).toHaveLength(24);
    expect(indiceSemanaPicoMedio(doses)).toBeCloseTo(11.5, 0);
    expect(doses[0]).toBe(2.5);
    expect(doses[23]).toBe(2.5);
  });

  it('personalizado 8 meses lento: pico no centro do prazo', () => {
    const doses = montarDosesComDesmame(2.5, 32, 16, 4);
    expect(doses).toHaveLength(32);
    expect(indiceSemanaPicoMedio(doses)).toBeCloseTo(15.5, 0);
    expect(doses[0]).toBe(2.5);
    expect(doses[31]).toBe(2.5);
  });
});

describe('montarPiramideCentral', () => {
  it('equivale a montarEscadinhaDose', () => {
    expect(montarPiramideCentral(2.5, 12, 4)).toEqual(montarEscadinhaDose(2.5, 12, 4));
  });
});
