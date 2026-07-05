import { describe, expect, it } from 'vitest';
import {
  buildAnsweredFollowUpContext,
  buildFollowUpQuestions,
  hasMeaningfulFollowUpAnswers,
} from '@/lib/oftpay/clinicalFollowUpQuestions';

describe('buildFollowUpQuestions', () => {
  it('gera perguntas úteis entre 3 e 7 itens', () => {
    const questions = buildFollowUpQuestions([
      {
        fileName: 'cv-od.pdf',
        examType: 'campimetria',
        eye: 'od',
        data: {
          camposEstruturados: { md: '-6.2', psd: '5.1', vfi: '82' },
          qualityFlags: ['low_confidence_extraction', 'possible_exam_type_mismatch'],
          checklistStatus: 'weak',
          examTypeMismatch: true,
        },
      },
      {
        fileName: 'cv-oe.pdf',
        examType: 'campimetria',
        eye: 'oe',
        data: {
          camposEstruturados: { md: '-1.2', psd: '2.2', vfi: '96' },
          checklistStatus: 'partial',
        },
      },
    ]);

    expect(questions.length).toBeGreaterThanOrEqual(3);
    expect(questions.length).toBeLessThanOrEqual(7);
    expect(
      questions.some((q) => /modalidade selecionada corresponde/i.test(q.question))
    ).toBe(true);
    expect(questions.some((q) => /predominam em um olho/i.test(q.question))).toBe(true);
  });

  it('evita redundância de perguntas duplicadas', () => {
    const questions = buildFollowUpQuestions([
      { examType: 'oct_disco', data: { camposEstruturados: { rnfl_global: '80' } } },
      { examType: 'oct_disco', data: { camposEstruturados: { rnfl_global: '79' } } },
    ]);

    const normalized = questions.map((q) => q.question.toLowerCase().trim());
    const unique = new Set(normalized);
    expect(unique.size).toBe(normalized.length);
  });
});

describe('follow-up answers helpers', () => {
  it('identifica quando há respostas preenchidas', () => {
    expect(
      hasMeaningfulFollowUpAnswers([
        { questionId: 'q1', question: 'Q1', answer: '   ' },
        { questionId: 'q2', question: 'Q2', answer: 'Sim, piora no OD.' },
      ])
    ).toBe(true);
    expect(
      hasMeaningfulFollowUpAnswers([{ questionId: 'q1', question: 'Q1', answer: '   ' }])
    ).toBe(false);
  });

  it('gera contexto apenas com respostas não vazias', () => {
    const ctx = buildAnsweredFollowUpContext(
      [
        { id: 'q1', question: 'Há dor?', reason: '', priority: 'high' },
        { id: 'q2', question: 'Há glaucoma?', reason: '', priority: 'high' },
      ],
      [
        { questionId: 'q1', answer: 'Não.' },
        { questionId: 'q2', answer: '   ' },
      ]
    );
    expect(ctx.answeredCount).toBe(1);
    expect(ctx.answeredLines[0]).toContain('Há dor?');
    expect(ctx.answeredLines[0]).toContain('Resposta: Não.');
  });
});
