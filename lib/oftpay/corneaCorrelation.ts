import type { ClinicalFollowUpAnswer } from '@/lib/oftpay/clinicalFollowUpQuestions';
import type { OftalmoEye } from '@/lib/oftpay/laudoOftalmoEye';

export type CornealStructuralCorrelation =
  | 'coherent'
  | 'partially_coherent'
  | 'discordant'
  | 'insufficient_data';

export type CorneaCorrelation = {
  isApplicable: boolean;
  applicableExamTypes: string[];
  cornealStructuralCorrelation: CornealStructuralCorrelation;
  dominantEye: OftalmoEye;
  interEyeCornealAsymmetry: string;
  mainCornealFinding: string;
  mainFindings: string[];
  progressionSignals: string[];
  conflictsOrGaps: string[];
  corneaInterpretation: string;
  recommendedCorneaChecks: string[];
  limitations: string[];
};

function normalizeExamType(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const value = raw.trim().toLowerCase();
  return value || null;
}

function normalizeEye(raw: unknown): OftalmoEye {
  const value = typeof raw === 'string' ? raw.trim().toLowerCase() : '';
  if (value === 'od') return 'od';
  if (value === 'oe') return 'oe';
  if (value === 'ao' || value === 'ou' || value === 'ambos') return 'ao';
  return 'nao_informado';
}

function parseLooseNumber(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v !== 'string') return null;
  const match = v.replace(',', '.').match(/-?\d+(\.\d+)?/);
  if (!match) return null;
  const n = Number(match[0]);
  return Number.isFinite(n) ? n : null;
}

function hasPattern(text: string, regex: RegExp): boolean {
  return regex.test(text);
}

function pushUnique(list: string[], value: string, max = 6) {
  if (!value.trim() || list.includes(value) || list.length >= max) return;
  list.push(value);
}

export function hasMeaningfulCorneaCorrelation(
  value: CorneaCorrelation | null | undefined
): boolean {
  return !!value && value.isApplicable;
}

export function buildCorneaCorrelation(params: {
  extractions?: Array<{ examType?: unknown; eye?: unknown; fileName?: unknown; data?: unknown }>;
  qualityContext?: string;
  binocularContext?: string;
  temporalContext?: string;
  followUpAnswers?: ClinicalFollowUpAnswer[];
}): CorneaCorrelation {
  const relevantTypes = new Set<string>();
  const mainFindings: string[] = [];
  const progressionSignals: string[] = [];
  const conflictsOrGaps: string[] = [];
  const limitations: string[] = [];
  const checks: string[] = [];
  const eyeBurden: Record<OftalmoEye, number> = { od: 0, oe: 0, ao: 0, nao_informado: 0 };

  let hasTopografia = false;
  let hasGalilei = false;
  let hasPaquimetria = false;
  let hasCurvatureSignal = false;
  let hasPachySignal = false;
  let hasElevationSignal = false;
  let hasClinicalContext = false;
  let lowQualityContext = false;
  let mainCornealFinding = 'Sem achado estrutural corneano dominante claramente definido.';

  for (const answer of params.followUpAnswers ?? []) {
    const text = typeof answer.answer === 'string' ? answer.answer.toLowerCase() : '';
    if (!text.trim()) continue;
    if (
      hasPattern(
        text,
        /(piora visual|progress[aã]o|co[cç]a[r]? os olhos|lente de contato|cirurgia refrativa|assimetria refracional|ectasia)/i
      )
    ) {
      hasClinicalContext = true;
    }
  }

  for (const extraction of params.extractions ?? []) {
    const examType = normalizeExamType(extraction.examType);
    if (!examType || !['topografia', 'galilei', 'paquimetria'].includes(examType)) continue;
    relevantTypes.add(examType);

    const eye = normalizeEye(extraction.eye);
    const data =
      extraction.data && typeof extraction.data === 'object'
        ? (extraction.data as Record<string, unknown>)
        : {};
    const ce =
      data.camposEstruturados && typeof data.camposEstruturados === 'object'
        ? (data.camposEstruturados as Record<string, unknown>)
        : {};
    const rawSummary = typeof data.rawSummary === 'string' ? data.rawSummary.toLowerCase() : '';
    const qualityFlags = Array.isArray(data.qualityFlags) ? data.qualityFlags : [];
    lowQualityContext =
      lowQualityContext ||
      data.reviewStatus === 'review' ||
      qualityFlags.some((f) =>
        ['possible_ocr_issue', 'limited_interpretability', 'low_confidence_extraction'].includes(
          String(f)
        )
      );

    if (examType === 'topografia') {
      hasTopografia = true;
      const k1 = parseLooseNumber(ce.k1);
      const k2 = parseLooseNumber(ce.k2);
      const km = parseLooseNumber(ce.km);
      const ast = parseLooseNumber(ce.astigmatismo);
      const curvatureAbnormal =
        (km !== null && km >= 47) || (k2 !== null && k2 >= 47.5) || (ast !== null && ast >= 2);
      const textualCurvature = hasPattern(
        `${String(ce.padrao_curvatura ?? '')} ${rawSummary}`,
        /(assimetr|irregular|ectas|suspeit|cone|encurvamento)/i
      );
      if (curvatureAbnormal || textualCurvature) {
        hasCurvatureSignal = true;
        eyeBurden[eye] += 2;
        mainCornealFinding = 'Topografia com padrão de curvatura sugestivo de alteração estrutural.';
        pushUnique(mainFindings, 'Topografia com curvatura/astigmatismo sugestivos de instabilidade corneana.');
      }
    }

    if (examType === 'galilei') {
      hasGalilei = true;
      const pachyMin = parseLooseNumber(ce.paquimetria_minima);
      const elevPost = parseLooseNumber(ce.elevacao_posterior);
      const indexText = String(ce.indices_ectasia ?? '');
      const reinforces =
        (pachyMin !== null && pachyMin < 500) ||
        (elevPost !== null && elevPost > 20) ||
        hasPattern(`${indexText} ${rawSummary}`, /(alterad|ectas|risco|suspeit|eleva[cç][aã]o)/i);
      if (reinforces) {
        hasElevationSignal = true;
        eyeBurden[eye] += 2;
        mainCornealFinding = 'Galilei com sinais estruturais que reforçam suspeita corneana.';
        pushUnique(mainFindings, 'Galilei com elevação/índices sugestivos de alteração estrutural corneana.');
      }
    }

    if (examType === 'paquimetria') {
      hasPaquimetria = true;
      const cct = parseLooseNumber(ce.espessura_central);
      const minPachy = parseLooseNumber(ce.menor_espessura);
      const pachyLow =
        (cct !== null && cct < 510) || (minPachy !== null && minPachy < 500);
      const pachyVeryLow = (cct !== null && cct < 490) || (minPachy !== null && minPachy < 480);
      const textualThin = hasPattern(
        `${String(ce.localizacao_menor_espessura ?? '')} ${rawSummary}`,
        /(afinad|fina|ectas|suspeit)/i
      );
      if (pachyLow || textualThin) {
        hasPachySignal = true;
        eyeBurden[eye] += pachyVeryLow ? 2 : 1;
        mainCornealFinding = pachyVeryLow
          ? 'Paquimetria com afinamento relevante, reforçando fragilidade estrutural.'
          : 'Paquimetria com afinamento corneano a correlacionar com demais exames.';
        pushUnique(mainFindings, 'Paquimetria sugere afinamento corneano com valor estrutural para correlação.');
      }
    }
  }

  if (
    hasPattern(params.temporalContext ?? '', /(topografia|galilei|paquimetria)/i) &&
    hasPattern(params.temporalContext ?? '', /possible_progression/i)
  ) {
    pushUnique(
      progressionSignals,
      'Comparação temporal sugere possível progressão estrutural corneana.'
    );
  } else if (
    hasPattern(params.temporalContext ?? '', /(topografia|galilei|paquimetria)/i) &&
    hasPattern(params.temporalContext ?? '', /status:\s*stable/i)
  ) {
    pushUnique(
      progressionSignals,
      'Comparação temporal sem mudança relevante no eixo corneano até o momento.'
    );
  } else if (
    hasPattern(params.temporalContext ?? '', /(topografia|galilei|paquimetria)/i) &&
    hasPattern(params.temporalContext ?? '', /insufficient_data/i)
  ) {
    pushUnique(progressionSignals, 'Temporalidade corneana limitada por dados insuficientes.');
  }

  const applicable =
    relevantTypes.size > 0 ||
    hasClinicalContext ||
    hasPattern(params.binocularContext ?? '', /(topografia|galilei|paquimetria|corne)/i) ||
    hasPattern(params.temporalContext ?? '', /(topografia|galilei|paquimetria|corne)/i);

  if (!applicable) {
    return {
      isApplicable: false,
      applicableExamTypes: [],
      cornealStructuralCorrelation: 'insufficient_data',
      dominantEye: 'nao_informado',
      interEyeCornealAsymmetry: 'Correlação corneana não aplicável no contexto atual.',
      mainCornealFinding: 'Não aplicável.',
      mainFindings: [],
      progressionSignals: [],
      conflictsOrGaps: [],
      corneaInterpretation:
        'Sem conjunto mínimo de dados para correlação especializada em córnea/ectasia nesta análise.',
      recommendedCorneaChecks: [],
      limitations: [],
    };
  }

  let dominantEye: OftalmoEye = 'nao_informado';
  if (eyeBurden.od > eyeBurden.oe && eyeBurden.od > 0) dominantEye = 'od';
  else if (eyeBurden.oe > eyeBurden.od && eyeBurden.oe > 0) dominantEye = 'oe';
  else if (eyeBurden.od > 0 && eyeBurden.oe > 0) dominantEye = 'ao';

  let cornealStructuralCorrelation: CornealStructuralCorrelation = 'insufficient_data';
  const coherentPair = (hasCurvatureSignal && hasPachySignal) || (hasCurvatureSignal && hasElevationSignal);
  if (coherentPair) {
    cornealStructuralCorrelation = lowQualityContext ? 'partially_coherent' : 'coherent';
  } else if (hasCurvatureSignal || hasPachySignal || hasElevationSignal) {
    cornealStructuralCorrelation = 'partially_coherent';
  }

  if (hasCurvatureSignal && !hasPachySignal && hasPaquimetria) {
    pushUnique(
      conflictsOrGaps,
      'Curvatura suspeita sem reforço paquimétrico robusto na documentação disponível.'
    );
  }
  if (hasPachySignal && !hasCurvatureSignal && hasTopografia) {
    pushUnique(
      conflictsOrGaps,
      'Afinamento paquimétrico sem padrão topográfico claramente convergente.'
    );
  }
  if (hasElevationSignal && !hasCurvatureSignal && hasTopografia) {
    pushUnique(
      conflictsOrGaps,
      'Elevação posterior/índices sugestivos sem concordância topográfica plena.'
    );
  }

  if (!hasTopografia) pushUnique(limitations, 'Ausência de topografia no contexto atual.');
  if (!hasGalilei) pushUnique(limitations, 'Ausência de Galilei/tomografia corneana no contexto atual.');
  if (!hasPaquimetria) pushUnique(limitations, 'Ausência de paquimetria no contexto atual.');
  if (!hasClinicalContext) {
    pushUnique(
      limitations,
      'Contexto clínico adicional de córnea/ectasia ainda limitado (sintomas/hábitos/histórico).'
    );
  }
  if (hasPattern(params.qualityContext ?? '', /checklist_status:\s*weak|status_revisao:\s*review/i)) {
    lowQualityContext = true;
  }
  if (lowQualityContext) {
    pushUnique(limitations, 'Qualidade/cobertura parcial limita correlação estrutural corneana.');
  }

  let interEyeCornealAsymmetry = 'Sem diferença binocular relevante no eixo corneano.';
  if (hasPattern(params.binocularContext ?? '', /marked_asymmetry/i)) {
    interEyeCornealAsymmetry =
      'Assimetria interocular marcada reforça suspeita estrutural corneana.';
  } else if (hasPattern(params.binocularContext ?? '', /mild_asymmetry/i)) {
    interEyeCornealAsymmetry =
      'Assimetria interocular leve/moderada sugere revisão comparativa mais próxima.';
  } else if (hasPattern(params.binocularContext ?? '', /insufficient_data/i)) {
    interEyeCornealAsymmetry = 'Binocularidade limitada para inferência corneana robusta.';
  }

  if (dominantEye === 'od') {
    pushUnique(mainFindings, 'OD concentra a principal alteração estrutural corneana nesta sessão.');
  } else if (dominantEye === 'oe') {
    pushUnique(mainFindings, 'OE concentra a principal alteração estrutural corneana nesta sessão.');
  } else if (dominantEye === 'ao') {
    pushUnique(mainFindings, 'Achados estruturais corneanos distribuídos bilateralmente.');
  }

  if (hasClinicalContext) {
    pushUnique(
      mainFindings,
      'Respostas clínicas adicionais (piora, coçar olhos, lente/cirurgia) aumentam relevância da correlação.'
    );
  }

  let corneaInterpretation =
    'Persistem lacunas para interpretação corneana mais segura, mantendo necessidade de correlação clínica e evolutiva.';
  if (cornealStructuralCorrelation === 'coherent') {
    corneaInterpretation =
      'Achados corneanos estruturalmente compatíveis com suspeita ectásica/instabilidade estrutural, a correlacionar com contexto clínico e evolução.';
  } else if (cornealStructuralCorrelation === 'partially_coherent') {
    corneaInterpretation =
      'Há suporte parcial entre os exames corneanos, com limitação por cobertura incompleta ou contexto clínico parcial.';
  } else if (cornealStructuralCorrelation === 'discordant') {
    corneaInterpretation =
      'Há possível discordância entre medidas corneanas, recomendando revisão dirigida da qualidade e da consistência entre modalidades.';
  }

  pushUnique(checks, 'Revisar progressão temporal entre topografia/Galilei/paquimetria do mesmo olho.');
  pushUnique(checks, 'Correlacionar achados com sintomas visuais e impacto funcional relatado.');
  pushUnique(checks, 'Revisar hábito de coçar os olhos e fatores mecânicos associados.');
  pushUnique(checks, 'Revisar histórico refrativo e cirurgia refrativa prévia quando houver.');
  pushUnique(checks, 'Considerar seguimento especializado em córnea conforme contexto clínico.');

  return {
    isApplicable: true,
    applicableExamTypes: Array.from(relevantTypes),
    cornealStructuralCorrelation,
    dominantEye,
    interEyeCornealAsymmetry,
    mainCornealFinding,
    mainFindings: mainFindings.slice(0, 5),
    progressionSignals: progressionSignals.slice(0, 3),
    conflictsOrGaps: conflictsOrGaps.slice(0, 4),
    corneaInterpretation,
    recommendedCorneaChecks: checks.slice(0, 5),
    limitations: limitations.slice(0, 4),
  };
}
