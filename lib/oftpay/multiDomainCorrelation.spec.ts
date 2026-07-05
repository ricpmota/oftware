import { describe, expect, it } from 'vitest';
import { buildMultiDomainCorrelation } from '@/lib/oftpay/multiDomainCorrelation';

describe('buildMultiDomainCorrelation', () => {
  it('define glaucoma como domínio predominante quando mais forte', () => {
    const out = buildMultiDomainCorrelation({
      glaucomaCorrelation: {
        isApplicable: true,
        applicableExamTypes: ['oct_disco', 'campimetria'],
        structureFunctionCorrelation: 'coherent',
        dominantEye: 'od',
        interEyeGlaucomaAsymmetry: 'Assimetria marcada.',
        mainFindings: ['A', 'B'],
        conflictsOrGaps: [],
        glaucomaInterpretation: 'Interp.',
        progressionSignals: ['Possível progressão'],
        recommendedGlaucomaChecks: ['x'],
        limitations: [],
      },
      retinaCorrelation: {
        isApplicable: true,
        applicableExamTypes: ['oct_macula'],
        anatomicalClinicalCorrelation: 'partially_coherent',
        dominantEye: 'oe',
        interEyeRetinaAsymmetry: 'Sem diferença.',
        mainMacularFinding: 'f',
        mainFindings: ['r1'],
        conflictsOrGaps: [],
        retinaInterpretation: 'Interp',
        temporalSignals: [],
        recommendedRetinaChecks: ['x'],
        limitations: ['l1', 'l2'],
      },
    });
    expect(out.primaryDomain).toBe('glaucoma');
  });

  it('define retina como domínio predominante quando mais forte', () => {
    const out = buildMultiDomainCorrelation({
      retinaCorrelation: {
        isApplicable: true,
        applicableExamTypes: ['oct_macula', 'retinografia'],
        anatomicalClinicalCorrelation: 'coherent',
        dominantEye: 'od',
        interEyeRetinaAsymmetry: 'Assimetria.',
        mainMacularFinding: 'f',
        mainFindings: ['a', 'b'],
        conflictsOrGaps: [],
        retinaInterpretation: 'Interp',
        temporalSignals: ['piora'],
        recommendedRetinaChecks: ['x'],
        limitations: [],
      },
      glaucomaCorrelation: {
        isApplicable: true,
        applicableExamTypes: ['oct_disco'],
        structureFunctionCorrelation: 'partially_coherent',
        dominantEye: 'oe',
        interEyeGlaucomaAsymmetry: 'Sem diferença.',
        mainFindings: ['g1'],
        conflictsOrGaps: ['c1', 'c2'],
        glaucomaInterpretation: 'Interp.',
        progressionSignals: [],
        recommendedGlaucomaChecks: ['x'],
        limitations: ['l1', 'l2', 'l3'],
      },
    });
    expect(out.primaryDomain).toBe('retina');
  });

  it('define córnea como domínio predominante quando mais forte', () => {
    const out = buildMultiDomainCorrelation({
      corneaCorrelation: {
        isApplicable: true,
        applicableExamTypes: ['topografia', 'galilei', 'paquimetria'],
        cornealStructuralCorrelation: 'coherent',
        dominantEye: 'od',
        interEyeCornealAsymmetry: 'Assimetria.',
        mainCornealFinding: 'f',
        mainFindings: ['c1', 'c2'],
        progressionSignals: ['p'],
        conflictsOrGaps: [],
        corneaInterpretation: 'Interp',
        recommendedCorneaChecks: ['x'],
        limitations: [],
      },
      retinaCorrelation: {
        isApplicable: true,
        applicableExamTypes: ['retinografia'],
        anatomicalClinicalCorrelation: 'partially_coherent',
        dominantEye: 'oe',
        interEyeRetinaAsymmetry: 'Sem diferença.',
        mainMacularFinding: 'f',
        mainFindings: ['r1'],
        conflictsOrGaps: [],
        retinaInterpretation: 'Interp',
        temporalSignals: [],
        recommendedRetinaChecks: ['x'],
        limitations: ['l1', 'l2'],
      },
    });
    expect(out.primaryDomain).toBe('cornea');
  });

  it('mantém ambiguidade quando domínios ativos têm força semelhante', () => {
    const out = buildMultiDomainCorrelation({
      glaucomaCorrelation: {
        isApplicable: true,
        applicableExamTypes: ['oct_disco'],
        structureFunctionCorrelation: 'coherent',
        dominantEye: 'od',
        interEyeGlaucomaAsymmetry: 'Assimetria.',
        mainFindings: ['g1'],
        conflictsOrGaps: [],
        glaucomaInterpretation: 'Interp.',
        progressionSignals: [],
        recommendedGlaucomaChecks: ['x'],
        limitations: ['l1'],
      },
      retinaCorrelation: {
        isApplicable: true,
        applicableExamTypes: ['oct_macula'],
        anatomicalClinicalCorrelation: 'coherent',
        dominantEye: 'oe',
        interEyeRetinaAsymmetry: 'Assimetria.',
        mainMacularFinding: 'f',
        mainFindings: ['r1'],
        conflictsOrGaps: [],
        retinaInterpretation: 'Interp',
        temporalSignals: [],
        recommendedRetinaChecks: ['x'],
        limitations: ['l1'],
      },
    });
    expect(out.primaryDomain).toBe('indeterminate');
    expect(out.domainConflicts.length).toBeGreaterThan(0);
  });
});
