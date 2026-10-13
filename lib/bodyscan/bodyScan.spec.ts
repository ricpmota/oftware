import { describe, expect, it } from 'vitest';
import { evaluateBodyScanReadiness } from '@/lib/bodyscan/bodyScanReadiness';
import { calculateBodyScanMasses } from '@/lib/bodyscan/bodyScanMasses';
import { validateBodyScanGeminiResponse } from '@/lib/bodyscan/bodyScanValidate';
import { bodyScanDocIdForWeek } from '@/lib/bodyscan/bodyScanTypes';
import { sortBodyScansByWeekAsc, serializeBodyScanDoc } from '@/lib/bodyscan/bodyScanSerialize';

describe('BodyScan readiness', () => {
  const base = {
    hasConsent: true,
    hasFrontPhoto: true,
    hasSidePhoto: true,
    weightKg: 87.4,
    heightCm: 170,
    currentFrontPhotoId: 'front-1',
    currentSidePhotoId: 'side-1',
  };

  it('1) somente foto frontal → não gera', () => {
    const r = evaluateBodyScanReadiness({ ...base, hasSidePhoto: false });
    expect(r).toEqual({ ready: false, reason: 'falta perfil' });
  });

  it('2) somente foto perfil → não gera', () => {
    const r = evaluateBodyScanReadiness({ ...base, hasFrontPhoto: false });
    expect(r).toEqual({ ready: false, reason: 'falta frontal' });
  });

  it('3) duas fotos sem altura → não gera', () => {
    const r = evaluateBodyScanReadiness({ ...base, heightCm: null });
    expect(r).toEqual({ ready: false, reason: 'altura inválida' });
  });

  it('4) duas fotos + altura + peso → gera', () => {
    const r = evaluateBodyScanReadiness(base);
    expect(r).toEqual({ ready: true });
  });

  it('5) circunferência ausente → ainda pode gerar', () => {
    const r = evaluateBodyScanReadiness({ ...base, abdominalCircumferenceCm: null });
    expect(r).toEqual({ ready: true });
  });

  it('6) BodyScan já existente com mesmas fotos → não chama novamente', () => {
    const r = evaluateBodyScanReadiness({
      ...base,
      existing: {
        status: 'completed',
        frontPhotoId: 'front-1',
        sidePhotoId: 'side-1',
      },
    });
    expect(r.ready).toBe(false);
    if (!r.ready) expect(r.reason).toContain('já concluído');
  });

  it('6b) concluído sem estimativa → permite analisar de novo', () => {
    const r = evaluateBodyScanReadiness({
      ...base,
      existing: {
        status: 'completed',
        analysisAvailable: false,
        frontPhotoId: 'front-1',
        sidePhotoId: 'side-1',
      },
    });
    expect(r).toEqual({ ready: true });
  });

  it('7) foto substituída → permite nova análise', () => {
    const r = evaluateBodyScanReadiness({
      ...base,
      currentFrontPhotoId: 'front-2',
      existing: {
        status: 'completed',
        frontPhotoId: 'front-1',
        sidePhotoId: 'side-1',
      },
    });
    expect(r).toEqual({ ready: true });
  });

  it('15) BodyScan não exige consentimento separado', () => {
    const r = evaluateBodyScanReadiness({ ...base, hasConsent: false });
    expect(r).toEqual({ ready: true });
  });
});

describe('BodyScan validation', () => {
  const valid = {
    version: 'bodyscan-v1',
    imageQuality: {
      overall: 'high',
      front: { usable: true, score: 90, issues: [] },
      side: { usable: true, score: 88, issues: [] },
    },
    morphology: {
      fatDistribution: 'predominantly_central',
      abdominalProjection: 'moderate',
      waistDefinition: 'moderate',
    },
    bodyFat: {
      estimatedRange: { minPercent: 24, maxPercent: 28 },
      centralEstimatePercent: 26,
      confidence: 'moderate',
    },
    confidence: {
      overall: 'moderate',
      score: 78,
      reasons: ['ok'],
    },
    limitations: ['Estimativa baseada em fotografias e dados antropométricos'],
  };

  it('8) JSON inválido → falha controlada', () => {
    const r = validateBodyScanGeminiResponse(null);
    expect(r.ok).toBe(false);
  });

  it('9) percentual inválido → não persistir dado incorreto', () => {
    const r = validateBodyScanGeminiResponse({
      ...valid,
      bodyFat: {
        estimatedRange: { minPercent: 90, maxPercent: 95 },
        centralEstimatePercent: 92,
        confidence: 'high',
      },
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.analysisAvailable).toBe(false);
      expect(r.value.bodyFat.estimatedRange).toBeNull();
    }
  });

  it('10) qualidade inválida → não gerar percentual', () => {
    const r = validateBodyScanGeminiResponse({
      ...valid,
      imageQuality: {
        overall: 'invalid',
        front: { usable: false, score: 10, issues: ['corpo incompleto'] },
        side: { usable: false, score: 12, issues: ['rotação'] },
      },
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.analysisAvailable).toBe(false);
      expect(r.value.bodyFat.centralEstimatePercent).toBeNull();
    }
  });

  it('aceita resposta válida', () => {
    const r = validateBodyScanGeminiResponse(valid);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.analysisAvailable).toBe(true);
  });
});

describe('BodyScan masses + history', () => {
  it('calcula massa gorda e livre de gordura no backend', () => {
    const m = calculateBodyScanMasses({
      weightKg: 100,
      minPercent: 24,
      centralPercent: 26,
      maxPercent: 28,
    });
    expect(m.estimatedFatMassKg).toEqual({ min: 24, central: 26, max: 28 });
    expect(m.estimatedFatFreeMassKg).toEqual({ min: 72, central: 74, max: 76 });
  });

  it('11) duas semanas diferentes → dois BodyScans (ids distintos)', () => {
    expect(bodyScanDocIdForWeek(1)).toBe('week-1');
    expect(bodyScanDocIdForWeek(4)).toBe('week-4');
    expect(bodyScanDocIdForWeek(1)).not.toBe(bodyScanDocIdForWeek(4));
  });

  it('12) histórico ordenado corretamente', () => {
    const a = serializeBodyScanDoc('week-4', {
      week: 4,
      date: '2026-02-01',
      status: 'completed',
      analysisAvailable: true,
      input: {
        weightKg: 90,
        heightCm: 170,
        bmi: 31,
        frontPhotoId: 'f',
        sidePhotoId: 's',
      },
    });
    const b = serializeBodyScanDoc('week-1', {
      week: 1,
      date: '2026-01-01',
      status: 'completed',
      analysisAvailable: true,
      input: {
        weightKg: 98,
        heightCm: 170,
        bmi: 34,
        frontPhotoId: 'f',
        sidePhotoId: 's',
      },
    });
    const sorted = sortBodyScansByWeekAsc([a!, b!]);
    expect(sorted.map((s) => s.week)).toEqual([1, 4]);
  });
});
