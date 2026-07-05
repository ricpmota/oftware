import { describe, expect, it } from 'vitest';
import { finalizeLaudoExtractionData } from '@/lib/oftpay/laudoOftalmoExtractionPostProcess';

describe('finalizeLaudoExtractionData', () => {
  it('mantém flags e review quando fallback + poucos campos', () => {
    const result = finalizeLaudoExtractionData({
      examType: 'campimetria',
      usedExamTypeFallback: true,
      dataExame: null,
      camposEstruturadosRaw: {
        confiabilidade: null,
        md: null,
        psd: null,
        vfi: null,
        ght: null,
      },
      examesNaoMapeados: [],
      avisos: ['imagem tremida e baixa resolução'],
      rawSummary: 'Leitura parcial.',
      qualityFlagsFromModel: ['documento_incompleto'],
    });

    expect(result.qualityFlags).toContain('exam_type_fallback_used');
    expect(result.qualityFlags).toContain('possible_ocr_issue');
    expect(result.reviewStatus).toBe('review');
    expect(result.checklistStatus).toBe('weak');
    expect(result.checklistFilledCount).toBe(0);
  });

  it('sinaliza mismatch de tipo quando pistas fortes divergem', () => {
    const result = finalizeLaudoExtractionData({
      examType: 'retinografia',
      usedExamTypeFallback: false,
      dataExame: null,
      camposEstruturadosRaw: {
        disco_optico: null,
        macula: null,
        vasos: null,
        hemorragias: null,
        exsudatos: null,
        drusas: null,
        outras_alteracoes: 'RNFL em quadrantes com clock hours preservado',
      },
      examesNaoMapeados: ['clock hours', 'RNFL superior'],
      avisos: [],
      rawSummary: 'Relatório cita RNFL e análise de quadrantes.',
      qualityFlagsFromModel: [],
    });

    expect(result.examTypeMismatch).toBe(true);
    expect(result.qualityFlags).toContain('possible_exam_type_mismatch');
    expect(result.suggestedExamType).toBe('oct_disco');
    expect(result.reviewStatus).toBe('attention');
  });
});
