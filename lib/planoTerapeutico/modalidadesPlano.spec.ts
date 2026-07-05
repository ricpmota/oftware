import { describe, expect, it } from 'vitest';
import {
  cicloDosesAgressivoSemestral,
  cicloDosesAgressivoTrimestral,
  cicloDosesLentoSemestral,
  cicloDosesLentoTrimestral,
  montarDosesSemanaisPacote,
  montarDosesSemanaisPersonalizado,
  semanasFixasPorModalidade,
} from '@/lib/planoTerapeutico/modalidadesPlano';

function indiceSemanaPicoMedio(doses: number[]): number {
  const max = Math.max(...doses);
  const idxs = doses.map((d, i) => (d === max ? i : -1)).filter((i) => i >= 0);
  return (Math.min(...idxs) + Math.max(...idxs)) / 2;
}

describe('escalonamento trimestral/semestral', () => {
  it('prazo fixo por modalidade', () => {
    expect(semanasFixasPorModalidade('mensal')).toBe(4);
    expect(semanasFixasPorModalidade('trimestral')).toBe(12);
    expect(semanasFixasPorModalidade('semestral')).toBe(24);
  });

  it('lento trimestral: pico no mês 2', () => {
    const doses = cicloDosesLentoTrimestral(5);
    expect(doses).toHaveLength(12);
    expect(doses.slice(4, 8)).toEqual([7.5, 7.5, 7.5, 7.5]);
    expect(indiceSemanaPicoMedio(doses)).toBeCloseTo(5.5, 0);
  });

  it('agressivo trimestral: pico central', () => {
    const doses = cicloDosesAgressivoTrimestral(2.5);
    expect(doses).toHaveLength(12);
    expect(indiceSemanaPicoMedio(doses)).toBeCloseTo(5.5, 0);
  });

  it('lento semestral: pico nos meses 3–4', () => {
    const doses = cicloDosesLentoSemestral(2.5);
    expect(doses).toHaveLength(24);
    expect(doses.slice(8, 16).every((d) => d === 7.5)).toBe(true);
    expect(indiceSemanaPicoMedio(doses)).toBeCloseTo(11.5, 0);
  });

  it('agressivo semestral: pico central', () => {
    const doses = cicloDosesAgressivoSemestral(2.5);
    expect(doses).toHaveLength(24);
    expect(indiceSemanaPicoMedio(doses)).toBeCloseTo(11.5, 0);
  });

  it('montarDosesSemanaisPacote semestral usa ciclo dedicado', () => {
    const doses = montarDosesSemanaisPacote('semestral', 2.5, 'lento', 4);
    expect(doses).toEqual(cicloDosesLentoSemestral(2.5));
  });

  it('personalizado 6 meses equivale ao semestral', () => {
    const sem = cicloDosesLentoSemestral(2.5);
    const pers = montarDosesSemanaisPersonalizado(6, 2.5, 'lento');
    expect(pers).toEqual(sem);
  });

  it('personalizado 8 meses lento tem pico no centro', () => {
    const doses = montarDosesSemanaisPersonalizado(8, 2.5, 'lento');
    expect(doses).toHaveLength(32);
    expect(indiceSemanaPicoMedio(doses)).toBeCloseTo(15.5, 0);
    expect(doses.slice(4, 8)).toEqual([5, 5, 5, 5]);
  });
});
