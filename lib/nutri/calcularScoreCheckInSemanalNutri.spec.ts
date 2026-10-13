import { describe, expect, it } from 'vitest';
import { calcularScoreCheckInSemanalNutri } from '@/lib/nutri/calcularScoreCheckInSemanalNutri';
import type { CheckInSemanalNutriAnswers } from '@/lib/nutri/checkInSemanalNutriTypes';

function answersIdeais(overrides: Partial<CheckInSemanalNutriAnswers> = {}): CheckInSemanalNutriAnswers {
  return {
    aderenciaPlano: 100,
    diasProteinaMeta: 7,
    diasFrutasVegetais: 7,
    alimentacaoForaPlano: 'nenhuma',
    diasMetaAgua: 7,
    nauseas: 'nenhum',
    constipacao: 'nenhum',
    diarreia: 'nenhum',
    energiaSemana: 5,
    sessoesAtividadeFisica: 7,
    ...overrides,
  };
}

describe('calcularScoreCheckInSemanalNutri V2', () => {
  it('semana ideal chega a 100', () => {
    expect(calcularScoreCheckInSemanalNutri(answersIdeais()).score).toBe(100);
  });

  it('aderência 0 reduz 35 pontos (peso 35%)', () => {
    const r = calcularScoreCheckInSemanalNutri(answersIdeais({ aderenciaPlano: 0 }));
    expect(r.score).toBe(65);
    expect(r.pesosUsados.aderenciaPlano).toBe(35);
  });

  it('sintomas graves reduzem o bloco de tolerabilidade', () => {
    const grave = calcularScoreCheckInSemanalNutri(
      answersIdeais({ nauseas: 'grave', constipacao: 'grave', diarreia: 'grave' })
    );
    expect(grave.pontos.sintomas).toBe(25);
    expect(grave.score).toBe(92.5);
  });

  it('ignora suplementos e sono mesmo se o registro V1 tiver esses campos', () => {
    const r = calcularScoreCheckInSemanalNutri(
      answersIdeais({
        probioticoDias: 0,
        wheyDias: 0,
        creatinaDias: 0,
        mediaSono: 'menos_6h',
      })
    );
    expect(r.pesosUsados.suplementacao).toBe(0);
    expect(r.pesosUsados.sonoEnergia).toBe(0);
    expect(r.score).toBe(100);
  });

  it('dificuldade e conquista não entram no score', () => {
    const base = calcularScoreCheckInSemanalNutri(answersIdeais());
    const comTexto = calcularScoreCheckInSemanalNutri(
      answersIdeais({
        principalDificuldadeTipo: 'eventos_sociais',
        principalConquistaTipo: 'organizacao',
      })
    );
    expect(comTexto.score).toBe(base.score);
  });

  it('energia e atividade ausentes redistribuem o restante', () => {
    const r = calcularScoreCheckInSemanalNutri(
      answersIdeais({
        energiaSemana: undefined,
        sessoesAtividadeFisica: undefined,
      })
    );
    expect(r.pesosUsados.energia).toBe(0);
    expect(r.pesosUsados.atividadeFisica).toBe(0);
    expect(r.score).toBe(100);
  });

  it('retorna uma casa decimal', () => {
    const r = calcularScoreCheckInSemanalNutri(
      answersIdeais({
        aderenciaPlano: 50,
        diasProteinaMeta: 3,
      })
    );
    expect(Number.isInteger(r.score * 10)).toBe(true);
  });
});
