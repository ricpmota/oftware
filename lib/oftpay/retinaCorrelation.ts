import type { ClinicalFollowUpAnswer } from '@/lib/oftpay/clinicalFollowUpQuestions';
import type { OftalmoEye } from '@/lib/oftpay/laudoOftalmoEye';

export type RetinaAnatomicalClinicalCorrelation =
  | 'coherent'
  | 'partially_coherent'
  | 'discordant'
  | 'insufficient_data';

export type RetinaCorrelation = {
  isApplicable: boolean;
  applicableExamTypes: string[];
  anatomicalClinicalCorrelation: RetinaAnatomicalClinicalCorrelation;
  dominantEye: OftalmoEye;
  interEyeRetinaAsymmetry: string;
  mainMacularFinding: string;
  mainFindings: string[];
  conflictsOrGaps: string[];
  retinaInterpretation: string;
  temporalSignals: string[];
  recommendedRetinaChecks: string[];
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

export function hasMeaningfulRetinaCorrelation(
  value: RetinaCorrelation | null | undefined
): boolean {
  return !!value && value.isApplicable;
}

export function buildRetinaCorrelation(params: {
  extractions?: Array<{ examType?: unknown; eye?: unknown; fileName?: unknown; data?: unknown }>;
  qualityContext?: string;
  binocularContext?: string;
  temporalContext?: string;
  followUpAnswers?: ClinicalFollowUpAnswer[];
}): RetinaCorrelation {
  const relevantTypes = new Set<string>();
  const mainFindings: string[] = [];
  const conflictsOrGaps: string[] = [];
  const limitations: string[] = [];
  const temporalSignals: string[] = [];
  const checks: string[] = [];
  const eyeBurden: Record<OftalmoEye, number> = { od: 0, oe: 0, ao: 0, nao_informado: 0 };

  let hasOctMacula = false;
  let hasRetinografia = false;
  let hasStructuralEvidence = false;
  let hasSymptomContext = false;
  let hasRiskContext = false;
  let symptomLateralEye: OftalmoEye = 'nao_informado';
  let lowQualityContext = false;
  let mainMacularFinding = 'Sem achado macular dominante claramente definido.';

  for (const answer of params.followUpAnswers ?? []) {
    const text = typeof answer.answer === 'string' ? answer.answer.toLowerCase() : '';
    if (!text.trim()) continue;
    if (
      hasPattern(
        text,
        /(baixa visual|metamorfops|distor[cç][aã]o|escotom|vis[aã]o emba[cç]ada|borrada|sintoma visual)/i
      )
    ) {
      hasSymptomContext = true;
    }
    if (hasPattern(text, /(diabet|hiperten|laser|inje[cç][aã]o|anti-vegf|tratamento retin)/i)) {
      hasRiskContext = true;
    }
    const hasOD = hasPattern(text, /(od|olho direito|direito|unilateral direito)/i);
    const hasOE = hasPattern(text, /(oe|olho esquerdo|esquerdo|unilateral esquerdo)/i);
    const hasAO = hasPattern(text, /(bilateral|ambos|ao|ou)/i);
    if (hasAO) symptomLateralEye = 'ao';
    else if (hasOD && !hasOE) symptomLateralEye = 'od';
    else if (hasOE && !hasOD) symptomLateralEye = 'oe';
  }

  for (const extraction of params.extractions ?? []) {
    const examType = normalizeExamType(extraction.examType);
    if (!examType || !['oct_macula', 'retinografia'].includes(examType)) continue;

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

    if (examType === 'oct_macula') {
      hasOctMacula = true;
      const centralThickness = parseLooseNumber(ce.espessura_central);
      const hasFluidOrTraction = [
        ce.fluido_intrarretiniano,
        ce.fluido_subrretiniano,
        ce.cistos,
        ce.ped,
        ce.membrana_epirretiniana,
        ce.tracao_vitreo_macular,
      ].some((v) => hasPattern(String(v ?? ''), /(sim|presente|positivo|detectad|alterad|trac)/i));
      const thicknessAbnormal =
        (centralThickness !== null && centralThickness > 320) ||
        (centralThickness !== null && centralThickness < 220);
      const textualMacular =
        hasPattern(
          rawSummary,
          /(fluido|cisto|ped|membrana epirretiniana|tra[cç][aã]o|edema macular|m[aá]cula)/
        ) ||
        hasPattern(String(ce.observacoes ?? ''), /(fluido|cisto|edema|m[aá]cula|trac)/i);

      if (hasFluidOrTraction || thicknessAbnormal || textualMacular) {
        hasStructuralEvidence = true;
        eyeBurden[eye] += 2;
        mainMacularFinding = hasFluidOrTraction
          ? 'Predomínio de alteração macular estrutural no OCT Mácula.'
          : 'Alteração de espessura/arquitetura macular no OCT Mácula.';
        pushUnique(mainFindings, 'OCT Mácula com achados estruturais relevantes à correlação clínica.');
      }
    }

    if (examType === 'retinografia') {
      hasRetinografia = true;
      const maculaText = String(ce.macula ?? '').toLowerCase();
      const supportsMacularChange =
        hasPattern(
          maculaText,
          /(alterad|edema|hemorrag|exsud|drusa|les[aã]o|irregular|membrana|suspeit|cicatriz)/
        ) ||
        hasPattern(String(ce.exsudatos ?? ''), /(sim|presente|detectad|alterad|focal)/i) ||
        hasPattern(String(ce.hemorragias ?? ''), /(sim|presente|detectad|alterad|pontilh)/i) ||
        hasPattern(rawSummary, /(m[aá]cula|retina|exsud|hemorrag|drusa|edema)/i);
      if (supportsMacularChange) {
        hasStructuralEvidence = true;
        eyeBurden[eye] += 1;
        pushUnique(
          mainFindings,
          'Retinografia com elementos que reforçam alteração retiniana/macular.'
        );
      }
    }
  }

  if (
    hasPattern(params.temporalContext ?? '', /(oct m[áa]cula|retinografia)/i) &&
    hasPattern(params.temporalContext ?? '', /possible_progression/i)
  ) {
    pushUnique(
      temporalSignals,
      'Comparação temporal sugere possível piora em eixo retina/mácula, a correlacionar clinicamente.'
    );
  } else if (
    hasPattern(params.temporalContext ?? '', /(oct m[áa]cula|retinografia)/i) &&
    hasPattern(params.temporalContext ?? '', /possible_improvement/i)
  ) {
    pushUnique(
      temporalSignals,
      'Comparação temporal sugere possível melhora em eixo retina/mácula.'
    );
  } else if (
    hasPattern(params.temporalContext ?? '', /(oct m[áa]cula|retinografia)/i) &&
    hasPattern(params.temporalContext ?? '', /status:\s*stable/i)
  ) {
    pushUnique(
      temporalSignals,
      'Comparação temporal sem mudança relevante em retina/mácula até o momento.'
    );
  } else if (
    hasPattern(params.temporalContext ?? '', /(oct m[áa]cula|retinografia)/i) &&
    hasPattern(params.temporalContext ?? '', /insufficient_data/i)
  ) {
    pushUnique(temporalSignals, 'Temporalidade retiniana limitada por dados insuficientes.');
  }

  const applicable =
    relevantTypes.size > 0 ||
    hasSymptomContext ||
    hasRiskContext ||
    hasPattern(params.binocularContext ?? '', /(retinografia|oct m[áa]cula|m[aá]cula)/i) ||
    hasPattern(params.temporalContext ?? '', /(retinografia|oct m[áa]cula|m[aá]cula)/i);

  if (!applicable) {
    return {
      isApplicable: false,
      applicableExamTypes: [],
      anatomicalClinicalCorrelation: 'insufficient_data',
      dominantEye: 'nao_informado',
      interEyeRetinaAsymmetry: 'Correlação retiniana não aplicável no contexto atual.',
      mainMacularFinding: 'Não aplicável.',
      mainFindings: [],
      conflictsOrGaps: [],
      retinaInterpretation:
        'Sem conjunto mínimo de dados para correlação especializada em retina/mácula nesta análise.',
      temporalSignals: [],
      recommendedRetinaChecks: [],
      limitations: [],
    };
  }

  let dominantEye: OftalmoEye = 'nao_informado';
  if (eyeBurden.od > eyeBurden.oe && eyeBurden.od > 0) dominantEye = 'od';
  else if (eyeBurden.oe > eyeBurden.od && eyeBurden.oe > 0) dominantEye = 'oe';
  else if (eyeBurden.od > 0 && eyeBurden.oe > 0) dominantEye = 'ao';

  let anatomicalClinicalCorrelation: RetinaAnatomicalClinicalCorrelation = 'insufficient_data';
  if (hasStructuralEvidence && hasSymptomContext) {
    anatomicalClinicalCorrelation = lowQualityContext ? 'partially_coherent' : 'coherent';
  } else if (hasStructuralEvidence && !hasSymptomContext) {
    anatomicalClinicalCorrelation = 'partially_coherent';
    pushUnique(
      conflictsOrGaps,
      'Achado estrutural macular sem sintoma visual claramente documentado até o momento.'
    );
  } else if (!hasStructuralEvidence && hasSymptomContext && (hasOctMacula || hasRetinografia)) {
    anatomicalClinicalCorrelation = lowQualityContext ? 'insufficient_data' : 'discordant';
    pushUnique(
      conflictsOrGaps,
      'Sintoma visual relevante sem suporte imagético macular robusto na sessão atual.'
    );
  }

  if (symptomLateralEye !== 'nao_informado' && dominantEye !== 'nao_informado') {
    if (symptomLateralEye !== 'ao' && dominantEye !== 'ao' && symptomLateralEye !== dominantEye) {
      pushUnique(
        conflictsOrGaps,
        'Lateralidade dos sintomas não coincide claramente com o olho de maior alteração estrutural.'
      );
    } else {
      pushUnique(
        mainFindings,
        'Lateralidade dos sintomas está compatível com o lado de maior carga de achados.'
      );
    }
  }

  let interEyeRetinaAsymmetry = 'Sem diferença binocular relevante para retina/mácula.';
  if (hasPattern(params.binocularContext ?? '', /marked_asymmetry/i)) {
    interEyeRetinaAsymmetry =
      'Assimetria binocular marcada reforça necessidade de correlação clínica retiniana dirigida.';
  } else if (hasPattern(params.binocularContext ?? '', /mild_asymmetry/i)) {
    interEyeRetinaAsymmetry =
      'Assimetria binocular leve/moderada sugere revisão comparativa mais próxima entre OD e OE.';
  } else if (hasPattern(params.binocularContext ?? '', /insufficient_data/i)) {
    interEyeRetinaAsymmetry = 'Binocularidade limitada para inferência retiniana robusta.';
  }

  if (!hasOctMacula) pushUnique(limitations, 'Ausência de OCT Mácula no contexto atual.');
  if (!hasRetinografia) {
    pushUnique(limitations, 'Ausência de retinografia para reforço morfológico complementar.');
  }
  if (!hasSymptomContext) {
    pushUnique(limitations, 'Sintomas visuais adicionais pouco detalhados para correlação anatômica.');
  }
  if (hasPattern(params.qualityContext ?? '', /checklist_status:\s*weak|status_revisao:\s*review/i)) {
    lowQualityContext = true;
  }
  if (lowQualityContext) {
    pushUnique(limitations, 'Qualidade/cobertura dos exames limita conclusão retiniana mais segura.');
  }

  if (dominantEye === 'od') {
    pushUnique(mainFindings, 'OD concentra o principal achado macular nesta sessão.');
  } else if (dominantEye === 'oe') {
    pushUnique(mainFindings, 'OE concentra o principal achado macular nesta sessão.');
  } else if (dominantEye === 'ao') {
    pushUnique(mainFindings, 'Achados retinianos/maculares com distribuição bilateral.');
  }

  if (hasRiskContext) {
    pushUnique(
      mainFindings,
      'Contexto clínico adicional (diabetes/hipertensão/tratamento prévio) aumenta relevância interpretativa.'
    );
  }

  let retinaInterpretation =
    'Persistem lacunas para interpretação retiniana mais segura, mantendo necessidade de correlação clínica.';
  if (anatomicalClinicalCorrelation === 'coherent') {
    retinaInterpretation =
      'Achados maculares estruturalmente compatíveis com o contexto clínico referido, a correlacionar com sintomas e avaliação oftalmológica.';
  } else if (anatomicalClinicalCorrelation === 'partially_coherent') {
    retinaInterpretation =
      'Há suporte parcial entre imagem e contexto clínico, com necessidade de revisão dirigida de lacunas.';
  } else if (anatomicalClinicalCorrelation === 'discordant') {
    retinaInterpretation =
      'Há possível discordância entre sintomas e imagem disponível, recomendando reavaliação de qualidade e contexto clínico.';
  }

  pushUnique(checks, 'Correlacionar achados com baixa visual, metamorfopsia e lateralidade dos sintomas.');
  pushUnique(checks, 'Revisar histórico clínico de diabetes, hipertensão e tempo de sintomas.');
  pushUnique(checks, 'Comparar com exames anteriores da mesma modalidade e mesmo olho.');
  pushUnique(checks, 'Considerar revisão especializada em retina conforme contexto clínico.');
  pushUnique(checks, 'Revisar histórico de tratamento retiniano prévio quando aplicável.');

  return {
    isApplicable: true,
    applicableExamTypes: Array.from(relevantTypes),
    anatomicalClinicalCorrelation,
    dominantEye,
    interEyeRetinaAsymmetry,
    mainMacularFinding,
    mainFindings: mainFindings.slice(0, 5),
    conflictsOrGaps: conflictsOrGaps.slice(0, 4),
    retinaInterpretation,
    temporalSignals: temporalSignals.slice(0, 3),
    recommendedRetinaChecks: checks.slice(0, 5),
    limitations: limitations.slice(0, 4),
  };
}
