import { describe, expect, it } from 'vitest';
import {
  CHECK_IN_SEMANAL_NUTRI_QUESTIONS,
  visibleCheckInSemanalNutriQuestions,
} from '@/lib/nutri/checkInSemanalNutriQuestions';
import { CHECK_IN_SEMANAL_NUTRI_QUESTIONNAIRE_VERSION } from '@/lib/nutri/checkInSemanalNutriTypes';

describe('CHECK_IN_SEMANAL_NUTRI_QUESTIONS V2', () => {
  it('lista V2 permanece intacta para leitura histórica', () => {
    expect(CHECK_IN_SEMANAL_NUTRI_QUESTIONS.some((q) => q.id === 'aderenciaPlano')).toBe(true);
  });

  it('versão corrente do instrumento é nutri_weekly_v3', () => {
    expect(CHECK_IN_SEMANAL_NUTRI_QUESTIONNAIRE_VERSION).toBe('nutri_weekly_v3');
  });

  it('não pergunta suplementos nem sono', () => {
    const ids = CHECK_IN_SEMANAL_NUTRI_QUESTIONS.map((q) => q.id);
    const blob = CHECK_IN_SEMANAL_NUTRI_QUESTIONS.map((q) => `${q.id} ${q.title}`).join(' ').toLowerCase();
    expect(ids).not.toContain('probioticoDias');
    expect(ids).not.toContain('wheyDias');
    expect(ids).not.toContain('creatinaDias');
    expect(ids).not.toContain('mediaSono');
    expect(blob).not.toMatch(/probiótico|whey|creatina|sono/);
  });

  it('mantém energia/disposição 1–5', () => {
    const energia = CHECK_IN_SEMANAL_NUTRI_QUESTIONS.find((q) => q.id === 'energiaSemana');
    expect(energia).toBeTruthy();
    expect(energia?.min).toBe(1);
    expect(energia?.max).toBe(5);
  });

  it('dificuldade usa opções e Outra abre campo extra', () => {
    const tipo = CHECK_IN_SEMANAL_NUTRI_QUESTIONS.find((q) => q.id === 'principalDificuldadeTipo');
    expect(tipo?.options?.some((o) => o.value === 'outra')).toBe(true);
    const visibleSem = visibleCheckInSemanalNutriQuestions({ answers: { principalDificuldadeTipo: 'falta_tempo' } });
    const visibleOutra = visibleCheckInSemanalNutriQuestions({ answers: { principalDificuldadeTipo: 'outra' } });
    expect(visibleSem.map((q) => q.id)).not.toContain('principalDificuldadeOutra');
    expect(visibleOutra.map((q) => q.id)).toContain('principalDificuldadeOutra');
  });

  it('conquista usa opções e Outra abre campo extra', () => {
    const tipo = CHECK_IN_SEMANAL_NUTRI_QUESTIONS.find((q) => q.id === 'principalConquistaTipo');
    expect(tipo?.options?.some((o) => o.value === 'outra')).toBe(true);
    const visibleSem = visibleCheckInSemanalNutriQuestions({ answers: { principalConquistaTipo: 'organizacao' } });
    const visibleOutra = visibleCheckInSemanalNutriQuestions({ answers: { principalConquistaTipo: 'outra' } });
    expect(visibleSem.map((q) => q.id)).not.toContain('principalConquistaOutra');
    expect(visibleOutra.map((q) => q.id)).toContain('principalConquistaOutra');
  });

  it('não inclui perguntas de aplicação / Tirzepatida', () => {
    const blob = CHECK_IN_SEMANAL_NUTRI_QUESTIONS.map((q) => `${q.id} ${q.title}`).join(' ').toLowerCase();
    expect(blob).not.toMatch(/tirzepatida|aplicou|aplicação|dose|local da aplicação/);
  });
});
