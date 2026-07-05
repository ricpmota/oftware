import { describe, expect, it } from 'vitest';
import {
  buildArchivedLaudoCaseSnapshot,
  buildLearningImpactRecordFromCase,
  buildLearningRecordFromCase,
} from '@/lib/oftpay/laudoCaseArchive';
import { buildStableLearningInsightKey } from '@/lib/oftpay/learningInsightKeys';
import { buildLearningInsightPatternId } from '@/lib/oftpay/learningInsightPattern';

describe('laudoCaseArchive helpers', () => {
  it('gera snapshot privado completo com feedback mínimo', () => {
    const snap = buildArchivedLaudoCaseSnapshot({
      caseId: 'case_1',
      userId: 'user_1',
      files: [
        {
          fileName: 'oct.pdf',
          examType: 'oct_disco',
          eye: 'od',
          camposEstruturados: { rnfl_global: '82' },
          qualityFlags: ['missing_key_fields'],
          reviewStatus: 'attention',
          checklistStatus: 'partial',
        },
      ],
      aiOutput: {
        initialAnalysis: 'Texto inicial',
        followUpQuestions: [],
        followUpAnswers: [],
      },
      feedback: { doctorAgreement: 'agree' },
      createdAt: 123,
    });
    expect(snap.caseId).toBe('case_1');
    expect(snap.feedback?.doctorAgreement).toBe('agree');
    expect(snap.aiOutput.initialAnalysis).toBeTruthy();
  });

  it('gera learning record anonimizado sem textos livres', () => {
    const snap = buildArchivedLaudoCaseSnapshot({
      caseId: 'case_2',
      userId: 'user_1',
      files: [
        {
          fileName: 'retino.pdf',
          examType: 'retinografia',
          qualityFlags: ['possible_ocr_issue'],
          reviewStatus: 'review',
          checklistStatus: 'weak',
        },
      ],
      aiOutput: {
        initialAnalysis: 'texto clínico livre que não deve ir para learning record',
        followUpQuestions: [],
        followUpAnswers: [{ questionId: 'q1', answer: 'comentário clínico livre' }],
        clinicalPriorityAssessment: {
          level: 'attention',
          label: 'Atenção',
          summary: 's',
          mainReasons: [],
          recommendedAction: 'a',
          limitations: [],
        },
        multiDomainCorrelation: {
          isApplicable: true,
          activeDomains: [{ domain: 'retina', status: 'strong', reason: 'x' }],
          primaryDomain: 'retina',
          secondaryDomains: [],
          domainConvergences: [],
          domainConflicts: ['c1'],
          overallClinicalAxis: 'ax',
          harmonizedInterpretation: 'h',
          remainingAmbiguities: ['a1'],
          recommendedCrossChecks: [],
          limitations: [],
        },
      },
      feedback: {
        doctorAgreement: 'partial',
        doctorComment: 'texto sensível',
        doctorFinalInterpretation: 'texto sensível',
      },
      createdAt: 456,
    });
    const lr = buildLearningRecordFromCase(snap);
    expect(lr.examTypes).toEqual(['retinografia']);
    expect(lr.doctorAgreement).toBe('partial');
    expect(lr.hasAmbiguity).toBe(true);
    expect(lr.hasDomainConflict).toBe(true);
    expect((lr as unknown as Record<string, unknown>).doctorComment).toBeUndefined();
    expect((lr as unknown as Record<string, unknown>).doctorFinalInterpretation).toBeUndefined();
    expect((lr as unknown as Record<string, unknown>).initialAnalysis).toBeUndefined();
  });

  it('gera learning impact record associado ao agreement sem textos livres', () => {
    const snap = buildArchivedLaudoCaseSnapshot({
      caseId: 'case_3',
      userId: 'user_1',
      files: [{ fileName: 'topo.pdf', examType: 'topografia' }],
      aiOutput: {
        initialAnalysis: 'texto livre não deve ir para impact',
        followUpQuestions: [],
        followUpAnswers: [],
        learningInsightsApplied: [
          {
            type: 'uncertainty_pattern',
            condition: 'x',
            recommendation: 'y',
            relatedDomain: 'cornea',
          },
        ],
        corneaCorrelation: {
          isApplicable: true,
          applicableExamTypes: ['topografia'],
          cornealStructuralCorrelation: 'partially_coherent',
          dominantEye: 'od',
          interEyeCornealAsymmetry: 'a',
          mainCornealFinding: 'b',
          mainFindings: [],
          progressionSignals: [],
          conflictsOrGaps: [],
          corneaInterpretation: 'c',
          recommendedCorneaChecks: [],
          limitations: [],
        },
      },
      feedback: {
        doctorAgreement: 'disagree',
        doctorComment: 'não deve aparecer',
        doctorFinalInterpretation: 'não deve aparecer',
      },
      createdAt: 789,
    });
    const impact = buildLearningImpactRecordFromCase(snap);
    expect(impact).not.toBeNull();
    expect(impact?.doctorAgreement).toBe('disagree');
    expect(impact?.domainsActive).toContain('cornea');
    expect(impact?.insightsUsed[0]?.type).toBe('uncertainty_pattern');
    expect(impact?.insightsUsed[0]?.stableKey).toBe(
      buildStableLearningInsightKey({
        type: 'uncertainty_pattern',
        relatedExamType: null,
        relatedDomain: 'cornea',
        condition: 'x',
      })
    );
    expect(impact?.insightsUsed[0]?.patternId).toBe(
      buildLearningInsightPatternId({
        type: 'uncertainty_pattern',
        relatedExamType: null,
        relatedDomain: 'cornea',
        condition: 'x',
      })
    );
    expect((impact as unknown as Record<string, unknown>)?.doctorComment).toBeUndefined();
    expect((impact as unknown as Record<string, unknown>)?.initialAnalysis).toBeUndefined();
  });
});
