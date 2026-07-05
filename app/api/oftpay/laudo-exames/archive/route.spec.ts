import { describe, expect, it } from 'vitest';
import { validateArchivePayload } from '@/lib/oftpay/laudo-exames/archiveValidation';

describe('laudo-exames archive route validation', () => {
  it('aceita payload com feedback mínimo', () => {
    const out = validateArchivePayload({
      files: [{ fileName: 'a.pdf' }],
      aiOutput: {
        initialAnalysis: 'ok',
        followUpQuestions: [],
        followUpAnswers: [],
      },
      feedback: { doctorAgreement: 'agree' },
    });
    expect(out.valid).toBe(true);
  });

  it('aceita payload com feedback completo', () => {
    const out = validateArchivePayload({
      files: [{ fileName: 'a.pdf', examType: 'oct_disco', eye: 'od' }],
      aiOutput: {
        initialAnalysis: 'ok',
        followUpQuestions: [],
        followUpAnswers: [],
      },
      feedback: {
        doctorAgreement: 'partial',
        doctorComment: 'Comentário',
        doctorFinalInterpretation: 'Interpretação final',
      },
    });
    expect(out.valid).toBe(true);
  });

  it('rejeita payload sem arquivos', () => {
    const out = validateArchivePayload({
      files: [],
      aiOutput: {
        initialAnalysis: 'ok',
        followUpQuestions: [],
        followUpAnswers: [],
      },
    });
    expect(out.valid).toBe(false);
  });

  it('rejeita payload sem análise inicial', () => {
    const out = validateArchivePayload({
      files: [{ fileName: 'a.pdf' }],
      aiOutput: {
        initialAnalysis: '',
        followUpQuestions: [],
        followUpAnswers: [],
      },
    });
    expect(out.valid).toBe(false);
  });
});
