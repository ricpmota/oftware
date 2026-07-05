import { describe, expect, it } from 'vitest';
import {
  buildBinocularContext,
  buildAdaptiveLearningForAnalyze,
  buildPromptForAnalyze,
  buildClinicalFollowUpActionsForAnalyze,
  buildLearningContextForAnalyze,
  buildLearningInsightsForAnalyze,
  buildClinicalPriorityForAnalyze,
  buildClinicalPriorityExplainabilityForAnalyze,
  buildCorneaCorrelationForAnalyze,
  buildDomainLongitudinalCorrelationForAnalyze,
  buildGlaucomaCorrelationForAnalyze,
  buildMultiDomainCorrelationForAnalyze,
  buildRetinaCorrelationForAnalyze,
  buildExtractionQualityContext,
  buildIntegratedSummaryForAnalyze,
  buildTemporalContext,
  extractionSummary,
  type LaudoExtractionInput,
} from '@/lib/oftpay/laudo-exames/analyzeService';

describe('laudo-exames analyze helpers', () => {
  const baseExtractions: LaudoExtractionInput[] = [
    {
      fileName: 'campo-visual.pdf',
      examType: 'campimetria',
      eye: 'od',
      data: {
        dataExame: '2026-04-21',
        camposMapeados: {},
        camposEstruturados: { md: '-2.1', psd: '2.0', vfi: '95%' },
        avisos: [],
        examesNaoMapeados: [],
        qualityFlags: ['missing_key_fields'],
        reviewStatus: 'attention',
        checklistStatus: 'partial',
        checklistFilledCount: 2,
        checklistTotal: 4,
        missingKeyFields: ['confiabilidade', 'ght'],
        eye: 'od',
      },
    },
  ];

  it('serializa dados de checklist no resumo de extração', () => {
    const summary = extractionSummary(baseExtractions);
    expect(summary).toContain('"checklistStatus": "partial"');
    expect(summary).toContain('"checklistFilledCount": 2');
    expect(summary).toContain('"missingKeyFields"');
  });

  it('inclui checklist e faltantes no contexto de qualidade', () => {
    const context = buildExtractionQualityContext(baseExtractions);
    expect(context).toContain('checklist_status: partial');
    expect(context).toContain('checklist_cobertura: 2/4');
    expect(context).toContain('campos_chave_faltantes: confiabilidade, ght');
    expect(context).toContain('olho: OD');
  });

  it('gera contexto binocular quando há par OD/OE', () => {
    const context = buildBinocularContext([
      {
        fileName: 'topo-od.pdf',
        examType: 'topografia',
        eye: 'od',
        data: {
          camposEstruturados: { k1: '42.1', k2: '43.0', km: '42.5', astigmatismo: '0.9' },
        },
      },
      {
        fileName: 'topo-oe.pdf',
        examType: 'topografia',
        eye: 'oe',
        data: {
          camposEstruturados: { k1: '44.2', k2: '45.1', km: '44.6', astigmatismo: '0.7' },
        },
      },
    ]);
    expect(context).toContain('Modalidade: Topografia');
    expect(context).toContain('resumo:');
  });

  it('gera contexto temporal quando há exames do mesmo tipo e olho em datas distintas', () => {
    const context = buildTemporalContext([
      {
        fileName: 'oct-od-2025.pdf',
        examType: 'oct_disco',
        eye: 'od',
        data: {
          dataExame: '2025-04-10',
          camposEstruturados: {
            rnfl_global: '95',
            rnfl_superior: '98',
            rnfl_inferior: '96',
            escavacao: '0.35',
          },
        },
      },
      {
        fileName: 'oct-od-2026.pdf',
        examType: 'oct_disco',
        eye: 'od',
        data: {
          dataExame: '2026-04-10',
          camposEstruturados: {
            rnfl_global: '82',
            rnfl_superior: '85',
            rnfl_inferior: '80',
            escavacao: '0.52',
          },
        },
      },
    ]);
    expect(context).toContain('Modalidade: OCT Disco');
    expect(context).toContain('status:');
    expect(context).toContain('datas: 2025-04-10 -> 2026-04-10');
  });

  it('gera síntese integradora com base em contexto mínimo e rico', () => {
    const summary = buildIntegratedSummaryForAnalyze({
      analysisAnswer:
        'Achado sugestivo de dano glaucomatoso em OD, a correlacionar com PIO e exame clínico.',
      qualityContext: 'status_revisao: attention',
      binocularContext: 'status: mild_asymmetry',
      temporalContext: 'status: possible_progression',
      followUpAnswers: [{ questionId: 'q1', question: 'Q1', answer: 'Há histórico familiar.' }],
    });
    expect(summary.headline.length).toBeGreaterThan(0);
    expect(summary.basedOn.length).toBeGreaterThan(0);
    expect(summary.recommendedNextSteps.length).toBeGreaterThan(0);
  });

  it('gera prioridade clínica sugerida pelo helper da rota', () => {
    const priority = buildClinicalPriorityForAnalyze({
      qualityContext: 'status_revisao: attention | checklist_status: partial',
      binocularContext: 'status: mild_asymmetry',
      temporalContext: 'status: stable',
      followUpAnswers: [{ questionId: 'q1', answer: 'Sintoma no OD.' }],
    });
    expect(priority.label).toBeTruthy();
    expect(
      priority.level === 'attention' ||
        priority.level === 'priority' ||
        priority.level === 'routine' ||
        priority.level === 'indeterminate'
    ).toBe(true);
  });

  it('gera explicabilidade de prioridade com direção de impacto', () => {
    const explainability = buildClinicalPriorityExplainabilityForAnalyze({
      qualityContext: 'status_revisao: attention | checklist_status: partial',
      binocularContext: 'status: marked_asymmetry',
      temporalContext: 'status: possible_progression',
      followUpAnswers: [{ questionId: 'q1', answer: 'Piora visual referida.' }],
      clinicalPriorityAssessment: {
        level: 'priority',
        label: 'Prioritário',
        summary: 'Sugestão prioritária.',
        mainReasons: [],
        recommendedAction: 'Avaliar.',
        limitations: [],
      },
    });
    expect(explainability.topDrivers.length).toBeGreaterThan(0);
    expect(explainability.increasedPriorityFactors.length).toBeGreaterThan(0);
    expect(explainability.dominantContexts.length).toBeGreaterThan(0);
  });

  it('serializa ações sugeridas de seguimento na camada da rota', () => {
    const actions = buildClinicalFollowUpActionsForAnalyze({
      clinicalPriorityAssessment: {
        level: 'priority',
        label: 'Prioritário',
        summary: 'Sugestão prioritária.',
        mainReasons: [],
        recommendedAction: '',
        limitations: [],
      },
      temporalContext: 'status: possible_progression',
      binocularContext: 'status: marked_asymmetry',
      qualityContext: 'status_revisao: attention',
      followUpAnswers: [{ questionId: 'q1', answer: 'Piora visual recente.' }],
      extractions: [{ examType: 'oct_disco' }],
    });
    expect(actions.actions.length).toBeGreaterThan(0);
    expect(actions.actions.length).toBeLessThanOrEqual(5);
    expect(actions.actions[0]).toHaveProperty('text');
  });

  it('serializa correlação glaucomatosa quando contexto é aplicável', () => {
    const glaucoma = buildGlaucomaCorrelationForAnalyze({
      extractions: [
        {
          fileName: 'oct-od.pdf',
          examType: 'oct_disco',
          eye: 'od',
          data: { camposEstruturados: { rnfl_global: '79', escavacao: '0.67' } },
        },
        {
          fileName: 'cv-od.pdf',
          examType: 'campimetria',
          eye: 'od',
          data: { camposEstruturados: { md: '-6.2', psd: '4.0', vfi: '84', confiabilidade: 'boa' } },
        },
      ],
      temporalContext:
        '- Modalidade: OCT Disco | Olho: OD | status: possible_progression (Possível progressão)',
      followUpAnswers: [{ questionId: 'q1', answer: 'Uso de colírio hipotensor.' }],
    });
    expect(glaucoma.isApplicable).toBe(true);
    expect(glaucoma.structureFunctionCorrelation).not.toBe('insufficient_data');
    expect(glaucoma.recommendedGlaucomaChecks.length).toBeGreaterThan(0);
  });

  it('serializa correlação retiniana/macular quando contexto é aplicável', () => {
    const retina = buildRetinaCorrelationForAnalyze({
      extractions: [
        {
          fileName: 'oct-macula-od.pdf',
          examType: 'oct_macula',
          eye: 'od',
          data: {
            camposEstruturados: { fluido_intrarretiniano: 'presente', espessura_central: '346' },
          },
        },
        {
          fileName: 'retino-od.pdf',
          examType: 'retinografia',
          eye: 'od',
          data: { camposEstruturados: { macula: 'alterada', exsudatos: 'sim' } },
        },
      ],
      temporalContext:
        '- Modalidade: OCT Mácula | Olho: OD | status: possible_progression (Possível progressão)',
      followUpAnswers: [{ questionId: 'q1', answer: 'Baixa visual e metamorfopsia no OD.' }],
    });
    expect(retina.isApplicable).toBe(true);
    expect(retina.anatomicalClinicalCorrelation).not.toBe('insufficient_data');
    expect(retina.recommendedRetinaChecks.length).toBeGreaterThan(0);
  });

  it('serializa correlação corneana quando contexto é aplicável', () => {
    const cornea = buildCorneaCorrelationForAnalyze({
      extractions: [
        {
          fileName: 'topo-od.pdf',
          examType: 'topografia',
          eye: 'od',
          data: { camposEstruturados: { km: '48.1', astigmatismo: '2.6' } },
        },
        {
          fileName: 'galilei-od.pdf',
          examType: 'galilei',
          eye: 'od',
          data: { camposEstruturados: { elevacao_posterior: '24', indices_ectasia: 'alterado' } },
        },
        {
          fileName: 'pachi-od.pdf',
          examType: 'paquimetria',
          eye: 'od',
          data: { camposEstruturados: { espessura_central: '495', menor_espessura: '482' } },
        },
      ],
      temporalContext:
        '- Modalidade: Topografia | Olho: OD | status: possible_progression (Possível progressão)',
      followUpAnswers: [{ questionId: 'q1', answer: 'Piora visual e hábito de coçar os olhos.' }],
    });
    expect(cornea.isApplicable).toBe(true);
    expect(cornea.cornealStructuralCorrelation).not.toBe('insufficient_data');
    expect(cornea.recommendedCorneaChecks.length).toBeGreaterThan(0);
  });

  it('serializa harmonização multi-domínio quando há eixos ativos', () => {
    const multi = buildMultiDomainCorrelationForAnalyze({
      glaucomaCorrelation: {
        isApplicable: true,
        applicableExamTypes: ['oct_disco', 'campimetria'],
        structureFunctionCorrelation: 'coherent',
        dominantEye: 'od',
        interEyeGlaucomaAsymmetry: 'Assimetria.',
        mainFindings: ['g1', 'g2'],
        conflictsOrGaps: [],
        glaucomaInterpretation: 'Interp.',
        progressionSignals: ['p'],
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
      corneaCorrelation: {
        isApplicable: true,
        applicableExamTypes: ['topografia'],
        cornealStructuralCorrelation: 'partially_coherent',
        dominantEye: 'nao_informado',
        interEyeCornealAsymmetry: 'Sem diferença.',
        mainCornealFinding: 'f',
        mainFindings: ['c1'],
        progressionSignals: [],
        conflictsOrGaps: ['cg1'],
        corneaInterpretation: 'Interp',
        recommendedCorneaChecks: ['x'],
        limitations: ['l1', 'l2'],
      },
    });
    expect(multi.isApplicable).toBe(true);
    expect(multi.activeDomains.length).toBeGreaterThan(0);
    expect(multi.recommendedCrossChecks.length).toBeGreaterThan(0);
  });

  it('serializa longitudinal especializado por domínio quando aplicável', () => {
    const longitudinal = buildDomainLongitudinalCorrelationForAnalyze({
      extractions: [
        {
          fileName: 'octd-2025.pdf',
          examType: 'oct_disco',
          eye: 'od',
          data: { dataExame: '2025-01-10', camposEstruturados: { rnfl_global: '95', escavacao: '0.42' } },
        },
        {
          fileName: 'octd-2026.pdf',
          examType: 'oct_disco',
          eye: 'od',
          data: { dataExame: '2026-01-10', camposEstruturados: { rnfl_global: '80', escavacao: '0.58' } },
        },
        {
          fileName: 'octm-2025.pdf',
          examType: 'oct_macula',
          eye: 'oe',
          data: { dataExame: '2025-02-10', camposEstruturados: { fluido_intrarretiniano: 'ausente' } },
        },
        {
          fileName: 'octm-2026.pdf',
          examType: 'oct_macula',
          eye: 'oe',
          data: { dataExame: '2026-02-10', camposEstruturados: { fluido_intrarretiniano: 'presente' } },
        },
      ],
      followUpAnswers: [{ questionId: 'q1', answer: 'Piora visual recente.' }],
    });
    expect(longitudinal.glaucomaLongitudinal.isApplicable).toBe(true);
    expect(longitudinal.retinaLongitudinal.isApplicable).toBe(true);
  });

  it('gera learning context com limite de insights', () => {
    const records = Array.from({ length: 20 }).map((_, idx) => ({
      createdAt: Date.now() - idx,
      examTypes: ['campimetria'],
      domainsActive: ['glaucoma', 'retina'],
      primaryDomain: 'indeterminate' as const,
      clinicalPriorityLevel: 'attention',
      doctorAgreement: idx % 2 === 0 ? 'disagree' : 'partial',
      qualityFlags: ['possible_ocr_issue'],
      reviewStatus: 'review' as const,
      checklistStatus: 'weak' as const,
      hasRefinement: false,
      hasDelta: false,
      hasAmbiguity: true,
      hasDomainConflict: true,
      longitudinalStatus: { glaucoma: null, retina: null, cornea: null },
    }));
    const text = buildLearningContextForAnalyze(records);
    expect(text).toContain('APRENDIZADO_DO_SISTEMA');
    expect(text.split('\n').filter((l) => l.startsWith('- ')).length).toBeLessThanOrEqual(5);
  });

  it('retorna learningInsightsApplied já filtrados e limitados', () => {
    const records = Array.from({ length: 20 }).map((_, idx) => ({
      createdAt: Date.now() - idx,
      examTypes: ['campimetria'],
      domainsActive: ['glaucoma', 'retina'],
      primaryDomain: 'indeterminate' as const,
      clinicalPriorityLevel: 'attention',
      doctorAgreement: idx % 2 === 0 ? 'disagree' : 'partial',
      qualityFlags: ['possible_ocr_issue'],
      reviewStatus: 'review' as const,
      checklistStatus: 'weak' as const,
      hasRefinement: false,
      hasDelta: false,
      hasAmbiguity: true,
      hasDomainConflict: true,
      longitudinalStatus: { glaucoma: null, retina: null, cornea: null },
    }));
    const insights = buildLearningInsightsForAnalyze(records);
    expect(insights.length).toBeGreaterThan(0);
    expect(insights.length).toBeLessThanOrEqual(5);
    expect(insights.every((x) => typeof x.recommendation === 'string' && x.recommendation.length > 0)).toBe(
      true
    );
  });

  it('aplica fallback adaptativo sem effectiveness disponível', () => {
    const records = Array.from({ length: 20 }).map((_, idx) => ({
      createdAt: Date.now() - idx,
      examTypes: ['campimetria'],
      domainsActive: ['glaucoma'],
      primaryDomain: 'glaucoma' as const,
      clinicalPriorityLevel: 'attention',
      doctorAgreement: idx % 2 === 0 ? 'disagree' : 'partial',
      qualityFlags: ['possible_ocr_issue'],
      reviewStatus: 'review' as const,
      checklistStatus: 'weak' as const,
      hasRefinement: false,
      hasDelta: false,
      hasAmbiguity: true,
      hasDomainConflict: false,
      longitudinalStatus: { glaucoma: null, retina: null, cornea: null },
    }));
    const out = buildAdaptiveLearningForAnalyze({
      records,
      effectiveness: [],
      extractions: [{ fileName: 'campo.pdf', examType: 'campimetria', eye: 'od', data: {} }],
    });
    expect(out.learningInsightsApplied.length).toBeGreaterThan(0);
    expect(out.learningInsightsApplied.length).toBeLessThanOrEqual(5);
    expect(out.learningContext).toContain('APRENDIZADO_DO_SISTEMA');
  });

  it('injeta LEARNING_CONTEXT no prompt da análise', () => {
    const prompt = buildPromptForAnalyze({
      knowledgeSection: 'CONHECIMENTO_BASE:\nbase',
      evidenceText: 'evidência',
      orientacaoSection: 'ORIENTACAO_POR_TIPO_DE_EXAME:\nfoo',
      learningSection: 'LEARNING_CONTEXT:\nAPRENDIZADO_DO_SISTEMA:\n- regra',
      laudoSection: 'DADOS_EXTRAIDOS_DO_LAUDO:\n{}',
      userSection: 'PERGUNTA_DO_USUARIO:\nTeste',
    });
    expect(prompt).toContain('LEARNING_CONTEXT:');
    expect(prompt).toContain('APRENDIZADO_DO_SISTEMA');
  });
});
