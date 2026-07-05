import type { ClinicalFollowUpAnswer } from '@/lib/oftpay/clinicalFollowUpQuestions';
import type { OftalmoEye } from '@/lib/oftpay/laudoOftalmoEye';

export type GlaucomaStructureFunctionCorrelation =
  | 'coherent'
  | 'partially_coherent'
  | 'discordant'
  | 'insufficient_data';

export type GlaucomaCorrelation = {
  isApplicable: boolean;
  applicableExamTypes: string[];
  structureFunctionCorrelation: GlaucomaStructureFunctionCorrelation;
  dominantEye: OftalmoEye;
  interEyeGlaucomaAsymmetry: string;
  mainFindings: string[];
  conflictsOrGaps: string[];
  glaucomaInterpretation: string;
  progressionSignals: string[];
  recommendedGlaucomaChecks: string[];
  limitations: string[];
};

function normalizeExamType(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const v = raw.trim().toLowerCase();
  return v || null;
}

function normalizeEye(raw: unknown): OftalmoEye {
  const t = typeof raw === 'string' ? raw.trim().toLowerCase() : '';
  if (t === 'od') return 'od';
  if (t === 'oe') return 'oe';
  if (t === 'ao' || t === 'ou' || t === 'ambos') return 'ao';
  return 'nao_informado';
}

function hasPattern(text: string, regex: RegExp): boolean {
  return regex.test(text);
}

function parseLooseNumber(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v !== 'string') return null;
  const match = v.replace(',', '.').match(/-?\d+(\.\d+)?/);
  if (!match) return null;
  const n = Number(match[0]);
  return Number.isFinite(n) ? n : null;
}

function pushUnique(list: string[], value: string, max = 6) {
  if (!value.trim() || list.includes(value) || list.length >= max) return;
  list.push(value);
}

export function hasMeaningfulGlaucomaCorrelation(
  value: GlaucomaCorrelation | null | undefined
): boolean {
  return !!value && value.isApplicable;
}

export function buildGlaucomaCorrelation(params: {
  extractions?: Array<{ examType?: unknown; eye?: unknown; fileName?: unknown; data?: unknown }>;
  qualityContext?: string;
  binocularContext?: string;
  temporalContext?: string;
  followUpAnswers?: ClinicalFollowUpAnswer[];
}): GlaucomaCorrelation {
  const relevantTypes = new Set<string>();
  const mainFindings: string[] = [];
  const conflictsOrGaps: string[] = [];
  const limitations: string[] = [];
  const progressionSignals: string[] = [];
  const checks: string[] = [];
  const eyeBurden: Record<OftalmoEye, number> = { od: 0, oe: 0, ao: 0, nao_informado: 0 };

  let hasStructuralEvidence = false;
  let hasFunctionalEvidence = false;
  let hasOCTDisco = false;
  let hasCampimetria = false;
  let hasRetinografia = false;
  let lowCampReliability = false;
  let hasGlaucomaClinicalContext = false;

  for (const answer of params.followUpAnswers ?? []) {
    const text = typeof answer.answer === 'string' ? answer.answer.toLowerCase() : '';
    if (!text.trim()) continue;
    if (/(glaucoma|pio|press[aã]o intra|hipotensor|col[ií]rio|hist[oó]ria familiar)/i.test(text)) {
      hasGlaucomaClinicalContext = true;
    }
  }

  for (const extraction of params.extractions ?? []) {
    const examType = normalizeExamType(extraction.examType);
    if (!examType) continue;
    const eye = normalizeEye(extraction.eye);
    const data =
      extraction.data && typeof extraction.data === 'object'
        ? (extraction.data as Record<string, unknown>)
        : {};
    const ce =
      data.camposEstruturados && typeof data.camposEstruturados === 'object'
        ? (data.camposEstruturados as Record<string, unknown>)
        : {};
    const rawSummary =
      typeof data.rawSummary === 'string' ? data.rawSummary.toLowerCase() : '';

    if (!['oct_disco', 'campimetria', 'retinografia'].includes(examType)) continue;
    relevantTypes.add(examType);

    if (examType === 'oct_disco') {
      hasOCTDisco = true;
      const rnflGlobal = parseLooseNumber(ce.rnfl_global);
      const rnflSup = parseLooseNumber(ce.rnfl_superior);
      const rnflInf = parseLooseNumber(ce.rnfl_inferior);
      const escavacao = parseLooseNumber(ce.escavacao);
      const hasThinRNFL =
        (rnflGlobal !== null && rnflGlobal < 90) ||
        (rnflSup !== null && rnflSup < 95) ||
        (rnflInf !== null && rnflInf < 95);
      const hasHighCup = escavacao !== null && escavacao >= 0.6;
      const textualSuspicious =
        hasPattern(String(ce.rnfl_global ?? ''), /(reduz|afinad|borderline|alterad)/i) ||
        hasPattern(String(ce.escavacao ?? ''), /(aumentad|suspeit|excavad)/i) ||
        hasPattern(rawSummary, /(rnfl|escava[cç][aã]o|glaucoma|disco)/i);

      if (hasThinRNFL || hasHighCup || textualSuspicious) {
        hasStructuralEvidence = true;
        eyeBurden[eye] += 2;
        pushUnique(
          mainFindings,
          'OCT Disco com achados estruturais sugestivos, a correlacionar com contexto clínico.'
        );
      }
    }

    if (examType === 'retinografia') {
      hasRetinografia = true;
      const discoText = String(ce.disco_optico ?? '').toLowerCase();
      const suspiciousDisc =
        hasPattern(discoText, /(escava[cç][aã]o|rela[cç][aã]o c\/d|notch|assimetria|palidez|suspeit)/i) ||
        hasPattern(rawSummary, /(disco [oó]ptico|escava[cç][aã]o|glaucoma)/i);
      if (suspiciousDisc) {
        hasStructuralEvidence = true;
        eyeBurden[eye] += 1;
        pushUnique(
          mainFindings,
          'Retinografia com descrição de disco óptico que pode reforçar suspeita estrutural.'
        );
      }
    }

    if (examType === 'campimetria') {
      hasCampimetria = true;
      const md = parseLooseNumber(ce.md);
      const psd = parseLooseNumber(ce.psd);
      const vfi = parseLooseNumber(ce.vfi);
      const confiabilidadeText = String(ce.confiabilidade ?? '').toLowerCase();
      const hasDefect =
        (md !== null && md <= -3) ||
        (psd !== null && psd >= 3) ||
        (vfi !== null && vfi < 90) ||
        hasPattern(String(ce.defeito ?? ''), /(arqueado|nasal|escotom|glaucom)/i) ||
        hasPattern(rawSummary, /(defeito|escotom|campo visual alterado|glaucom)/i);
      const lowReliabilityByText = hasPattern(
        confiabilidadeText,
        /(baixa|ruim|inadequad|falso positivo|falso negativo|perda de fixa[cç][aã]o)/
      );
      const lowReliabilityByQuality =
        data.reviewStatus === 'review' ||
        (Array.isArray(data.qualityFlags) &&
          data.qualityFlags.some((f) =>
            ['possible_ocr_issue', 'limited_interpretability', 'low_confidence_extraction'].includes(
              String(f)
            )
          ));
      lowCampReliability = lowCampReliability || lowReliabilityByText || lowReliabilityByQuality;

      if (hasDefect) {
        hasFunctionalEvidence = true;
        eyeBurden[eye] += 2;
        pushUnique(
          mainFindings,
          'Campimetria com possível repercussão funcional, exigindo correlação clínica.'
        );
      }
    }
  }

  if (
    hasPattern(params.temporalContext ?? '', /(oct disco|campimetria)/i) &&
    hasPattern(params.temporalContext ?? '', /possible_progression/i)
  ) {
    pushUnique(
      progressionSignals,
      'Comparação temporal sugere possível progressão estrutural/funcional glaucomatosa.'
    );
  } else if (
    hasPattern(params.temporalContext ?? '', /(oct disco|campimetria)/i) &&
    hasPattern(params.temporalContext ?? '', /status:\s*stable/i)
  ) {
    pushUnique(
      progressionSignals,
      'Comparação temporal sem mudança relevante em linha glaucomatosa até o momento.'
    );
  } else if (
    hasPattern(params.temporalContext ?? '', /(oct disco|campimetria)/i) &&
    hasPattern(params.temporalContext ?? '', /insufficient_data/i)
  ) {
    pushUnique(progressionSignals, 'Temporalidade glaucomatosa limitada por dados insuficientes.');
  }

  const applicable =
    relevantTypes.size > 0 ||
    hasGlaucomaClinicalContext ||
    hasPattern(params.binocularContext ?? '', /(oct disco|campimetria|glaucom)/i) ||
    hasPattern(params.temporalContext ?? '', /(oct disco|campimetria|glaucom)/i);

  if (!applicable) {
    return {
      isApplicable: false,
      applicableExamTypes: [],
      structureFunctionCorrelation: 'insufficient_data',
      dominantEye: 'nao_informado',
      interEyeGlaucomaAsymmetry: 'Correlação glaucomatosa não aplicável no contexto atual.',
      mainFindings: [],
      conflictsOrGaps: [],
      glaucomaInterpretation:
        'Sem conjunto mínimo de dados para correlação especializada em glaucoma nesta análise.',
      progressionSignals: [],
      recommendedGlaucomaChecks: [],
      limitations: [],
    };
  }

  let structureFunctionCorrelation: GlaucomaStructureFunctionCorrelation = 'insufficient_data';
  if (hasStructuralEvidence && hasFunctionalEvidence) {
    structureFunctionCorrelation = lowCampReliability ? 'partially_coherent' : 'coherent';
  } else if (hasStructuralEvidence && hasCampimetria && !hasFunctionalEvidence) {
    structureFunctionCorrelation = 'partially_coherent';
    pushUnique(
      conflictsOrGaps,
      'Predomínio estrutural sem suporte funcional robusto na campimetria disponível.'
    );
  } else if (!hasStructuralEvidence && hasFunctionalEvidence && hasOCTDisco) {
    structureFunctionCorrelation = lowCampReliability ? 'insufficient_data' : 'discordant';
    pushUnique(
      conflictsOrGaps,
      'Alteração funcional sem confirmação estrutural clara no OCT Disco disponível.'
    );
  } else if (hasStructuralEvidence || hasFunctionalEvidence) {
    structureFunctionCorrelation = 'partially_coherent';
  }

  if (lowCampReliability) {
    pushUnique(
      conflictsOrGaps,
      'Confiabilidade da campimetria reduz a força da correlação estrutura-função.'
    );
    pushUnique(limitations, 'Campimetria com confiabilidade limitada.');
  }

  if (!hasCampimetria) {
    pushUnique(limitations, 'Ausência de campimetria no contexto atual.');
  }
  if (!hasOCTDisco) {
    pushUnique(limitations, 'Ausência de OCT Disco no contexto atual.');
  }
  if (!hasRetinografia) {
    pushUnique(
      limitations,
      'Retinografia/disco óptico não disponível para reforço morfológico adicional.'
    );
  }
  if (hasPattern(params.qualityContext ?? '', /checklist_status:\s*weak|status_revisao:\s*review/i)) {
    pushUnique(limitations, 'Qualidade/cobertura parcial limita inferência glaucomatosa.');
  }

  let dominantEye: OftalmoEye = 'nao_informado';
  if (eyeBurden.od > eyeBurden.oe && eyeBurden.od > 0) dominantEye = 'od';
  else if (eyeBurden.oe > eyeBurden.od && eyeBurden.oe > 0) dominantEye = 'oe';
  else if (eyeBurden.od > 0 && eyeBurden.oe > 0) dominantEye = 'ao';

  let interEyeGlaucomaAsymmetry = 'Sem diferença binocular relevante na linha glaucomatosa.';
  if (hasPattern(params.binocularContext ?? '', /marked_asymmetry/i)) {
    interEyeGlaucomaAsymmetry =
      'Assimetria binocular marcada reforça necessidade de correlação clínica dirigida.';
  } else if (hasPattern(params.binocularContext ?? '', /mild_asymmetry/i)) {
    interEyeGlaucomaAsymmetry =
      'Assimetria binocular leve/moderada sugere revisão mais próxima entre OD e OE.';
  } else if (hasPattern(params.binocularContext ?? '', /insufficient_data/i)) {
    interEyeGlaucomaAsymmetry = 'Binocularidade limitada para inferência glaucomatosa robusta.';
  }

  if (dominantEye === 'od') {
    pushUnique(mainFindings, 'OD concentra maior carga de achados estruturais/funcionais suspeitos.');
  } else if (dominantEye === 'oe') {
    pushUnique(mainFindings, 'OE concentra maior carga de achados estruturais/funcionais suspeitos.');
  } else if (dominantEye === 'ao') {
    pushUnique(mainFindings, 'Achados glaucomatosos distribuídos bilateralmente.');
  }

  if (hasGlaucomaClinicalContext) {
    pushUnique(
      mainFindings,
      'Respostas clínicas adicionais (PIO/história familiar/tratamento) aumentam o peso contextual.'
    );
  } else {
    pushUnique(
      limitations,
      'Contexto clínico complementar específico de glaucoma ainda limitado nesta sessão.'
    );
  }

  let glaucomaInterpretation =
    'Correlação glaucomatosa limitada, mantendo necessidade de integração clínica presencial.';
  if (structureFunctionCorrelation === 'coherent') {
    glaucomaInterpretation =
      'Achados estruturais e funcionais coerentes com suspeita glaucomatosa, a correlacionar com PIO, fundoscopia e contexto clínico.';
  } else if (structureFunctionCorrelation === 'partially_coherent') {
    glaucomaInterpretation =
      'Achados parcialmente coerentes na linha glaucomatosa, com lacunas que exigem revisão clínica e documental.';
  } else if (structureFunctionCorrelation === 'discordant') {
    glaucomaInterpretation =
      'Há possível discordância entre estrutura e função, recomendando revisão de confiabilidade, contexto e exames complementares.';
  }

  pushUnique(checks, 'Correlacionar achados com pressão intraocular (PIO) recente.');
  pushUnique(checks, 'Revisar confiabilidade da campimetria antes de inferências conclusivas.');
  pushUnique(checks, 'Comparar com avaliação de disco óptico/fundo de olho quando disponível.');
  pushUnique(checks, 'Revisar exames anteriores para avaliar tendência temporal do mesmo olho.');
  if (hasGlaucomaClinicalContext) {
    pushUnique(checks, 'Correlacionar com história familiar e tratamento hipotensor em uso.');
  } else {
    pushUnique(checks, 'Buscar contexto clínico adicional (história familiar, tratamento e sintomas).');
  }

  return {
    isApplicable: true,
    applicableExamTypes: Array.from(relevantTypes),
    structureFunctionCorrelation,
    dominantEye,
    interEyeGlaucomaAsymmetry,
    mainFindings: mainFindings.slice(0, 5),
    conflictsOrGaps: conflictsOrGaps.slice(0, 4),
    glaucomaInterpretation,
    progressionSignals: progressionSignals.slice(0, 3),
    recommendedGlaucomaChecks: checks.slice(0, 5),
    limitations: limitations.slice(0, 4),
  };
}
