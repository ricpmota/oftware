import type { ClinicalFollowUpAnswer } from '@/lib/oftpay/clinicalFollowUpQuestions';
import { buildTemporalComparisons, type TemporalComparison } from '@/lib/oftpay/laudoOftalmoTemporal';
import { normalizeEye, type OftalmoEye } from '@/lib/oftpay/laudoOftalmoEye';

type DomainTrend = 'stable' | 'possible_progression' | 'possible_improvement' | 'insufficient_data';
type LongitudinalConsistency = 'coherent' | 'partially_coherent' | 'discordant' | 'insufficient_data';

export type GlaucomaLongitudinalCorrelation = {
  isApplicable: boolean;
  structuralTrend: DomainTrend;
  functionalTrend: DomainTrend;
  longitudinalConsistency: LongitudinalConsistency;
  dominantEye: OftalmoEye;
  progressionSignals: string[];
  glaucomaLongitudinalInterpretation: string;
  limitations: string[];
};

export type RetinaLongitudinalCorrelation = {
  isApplicable: boolean;
  retinaTrend: DomainTrend;
  dominantEye: OftalmoEye;
  mainTemporalFinding: string;
  retinaLongitudinalInterpretation: string;
  progressionSignals: string[];
  limitations: string[];
};

export type CorneaLongitudinalCorrelation = {
  isApplicable: boolean;
  cornealTrend: DomainTrend;
  dominantEye: OftalmoEye;
  progressionSignals: string[];
  corneaLongitudinalInterpretation: string;
  limitations: string[];
};

export type DomainLongitudinalCorrelation = {
  glaucomaLongitudinal: GlaucomaLongitudinalCorrelation;
  retinaLongitudinal: RetinaLongitudinalCorrelation;
  corneaLongitudinal: CorneaLongitudinalCorrelation;
};

type ExtractionInput = {
  fileName?: string;
  examType?: string;
  eye?: string;
  data?: unknown;
};

function normalizeExamType(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const v = raw.trim().toLowerCase();
  return v || null;
}

function pushUnique(list: string[], value: string, max = 6) {
  if (!value.trim() || list.includes(value) || list.length >= max) return;
  list.push(value);
}

function hasPattern(text: string, regex: RegExp): boolean {
  return regex.test(text);
}

function buildTemporalItems(extractions: ExtractionInput[]) {
  return extractions
    .map((item, idx) => {
      const examType = normalizeExamType(item.examType);
      if (!examType) return null;
      const data = item.data && typeof item.data === 'object' ? (item.data as Record<string, unknown>) : {};
      const ce = data.camposEstruturados;
      if (!ce || typeof ce !== 'object' || Array.isArray(ce)) return null;
      const dataExame =
        typeof data.dataExame === 'string' && data.dataExame.trim() ? data.dataExame.trim() : null;
      return {
        id: `${item.fileName ?? 'arquivo'}:${examType}:${idx}`,
        fileName: item.fileName ?? 'arquivo',
        examType: examType as
          | 'paquimetria'
          | 'topografia'
          | 'galilei'
          | 'microscopia'
          | 'campimetria'
          | 'retinografia'
          | 'oct_disco'
          | 'oct_macula',
        eye: normalizeEye(item.eye ?? data.eye),
        dataExame,
        camposEstruturados: ce as Record<string, string | number | null>,
        sourceOrder: idx,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);
}

function aggregateTrend(comparisons: TemporalComparison[]): { trend: DomainTrend; conflict: boolean } {
  if (comparisons.length === 0) return { trend: 'insufficient_data', conflict: false };
  let progression = 0;
  let improvement = 0;
  let stable = 0;
  let insufficient = 0;
  for (const c of comparisons) {
    if (c.status === 'possible_progression') progression += 1;
    else if (c.status === 'possible_improvement') improvement += 1;
    else if (c.status === 'stable') stable += 1;
    else insufficient += 1;
  }

  if (progression > 0 && improvement > 0) {
    return { trend: 'insufficient_data', conflict: true };
  }
  if (progression > 0) return { trend: 'possible_progression', conflict: false };
  if (improvement > 0) return { trend: 'possible_improvement', conflict: false };
  if (stable > 0) return { trend: 'stable', conflict: false };
  if (insufficient > 0) return { trend: 'insufficient_data', conflict: false };
  return { trend: 'insufficient_data', conflict: false };
}

function dominantEyeFrom(comparisons: TemporalComparison[]): OftalmoEye {
  const scores: Record<OftalmoEye, number> = { od: 0, oe: 0, ao: 0, nao_informado: 0 };
  for (const c of comparisons) {
    const eye = normalizeEye(c.eye);
    if (c.status === 'possible_progression') scores[eye] += 3;
    else if (c.status === 'stable') scores[eye] += 1;
    else if (c.status === 'possible_improvement') scores[eye] += 1;
  }
  if (scores.od === 0 && scores.oe === 0) return 'nao_informado';
  if (scores.od === scores.oe) return 'ao';
  return scores.od > scores.oe ? 'od' : 'oe';
}

function collectLimitations(comparisons: TemporalComparison[]): string[] {
  const out: string[] = [];
  for (const c of comparisons) {
    for (const lim of c.temporalLimitations.slice(0, 2)) {
      pushUnique(out, lim, 5);
    }
  }
  return out;
}

export function hasMeaningfulDomainLongitudinalCorrelation(
  value: DomainLongitudinalCorrelation | null | undefined
): boolean {
  if (!value) return false;
  return (
    value.glaucomaLongitudinal.isApplicable ||
    value.retinaLongitudinal.isApplicable ||
    value.corneaLongitudinal.isApplicable
  );
}

export function buildDomainLongitudinalCorrelation(params: {
  extractions?: ExtractionInput[];
  followUpAnswers?: ClinicalFollowUpAnswer[];
}): DomainLongitudinalCorrelation {
  const extractions = params.extractions ?? [];
  const temporalItems = buildTemporalItems(extractions);
  const comparisons = buildTemporalComparisons(temporalItems);
  const examTypesPresent = new Set(
    extractions
      .map((x) => normalizeExamType(x.examType))
      .filter((x): x is string => !!x)
  );
  const answersText = (params.followUpAnswers ?? [])
    .map((a) => (typeof a.answer === 'string' ? a.answer.toLowerCase() : ''))
    .join(' | ');

  const glaucomaStruct = comparisons.filter((c) => c.examType === 'oct_disco');
  const glaucomaFunc = comparisons.filter((c) => c.examType === 'campimetria');
  const glaucomaAny = [...glaucomaStruct, ...glaucomaFunc];
  const glaucomaApplicable =
    glaucomaAny.length > 0 ||
    examTypesPresent.has('oct_disco') ||
    examTypesPresent.has('campimetria') ||
    hasPattern(answersText, /(glaucoma|pio|col[ií]rio|hipotensor|hist[oó]ria familiar)/i);
  const gStructTrend = aggregateTrend(glaucomaStruct);
  const gFuncTrend = aggregateTrend(glaucomaFunc);
  let longitudinalConsistency: LongitudinalConsistency = 'insufficient_data';
  if (
    gStructTrend.trend !== 'insufficient_data' &&
    gFuncTrend.trend !== 'insufficient_data'
  ) {
    if (gStructTrend.trend === gFuncTrend.trend) longitudinalConsistency = 'coherent';
    else if (
      (gStructTrend.trend === 'possible_progression' && gFuncTrend.trend === 'possible_improvement') ||
      (gStructTrend.trend === 'possible_improvement' && gFuncTrend.trend === 'possible_progression')
    ) {
      longitudinalConsistency = 'discordant';
    } else {
      longitudinalConsistency = 'partially_coherent';
    }
  } else if (
    gStructTrend.trend !== 'insufficient_data' ||
    gFuncTrend.trend !== 'insufficient_data'
  ) {
    longitudinalConsistency = 'partially_coherent';
  }
  const glaucomaSignals: string[] = [];
  for (const c of glaucomaAny) {
    if (c.status === 'possible_progression') {
      pushUnique(glaucomaSignals, `${c.examTypeLabel} (${c.eyeLabel}) sugere possível progressão.`);
    } else if (c.status === 'stable') {
      pushUnique(glaucomaSignals, `${c.examTypeLabel} (${c.eyeLabel}) sem mudança relevante.`);
    } else if (c.status === 'possible_improvement') {
      pushUnique(glaucomaSignals, `${c.examTypeLabel} (${c.eyeLabel}) com possível melhora.`);
    }
  }
  const glaucomaLimitations = collectLimitations(glaucomaAny);
  if (glaucomaAny.length === 0 && glaucomaApplicable) {
    pushUnique(glaucomaLimitations, 'Série longitudinal glaucomatosa insuficiente para tendência segura.');
  }
  if (gStructTrend.conflict || gFuncTrend.conflict) {
    pushUnique(glaucomaLimitations, 'Séries com tendências divergentes no eixo glaucomatoso.');
  }
  const glaucomaInterpretation =
    longitudinalConsistency === 'coherent' && gStructTrend.trend === 'possible_progression'
      ? 'Tendência glaucomatosa longitudinal com possível progressão estrutural/funcional coerente, a correlacionar com contexto clínico.'
      : longitudinalConsistency === 'coherent' && gStructTrend.trend === 'stable' && gFuncTrend.trend === 'stable'
        ? 'Eixo glaucomatoso longitudinal sem mudança relevante nas séries disponíveis.'
        : longitudinalConsistency === 'partially_coherent'
          ? 'Eixo glaucomatoso longitudinal com suporte parcial entre séries, exigindo correlação clínica prudente.'
          : longitudinalConsistency === 'discordant'
            ? 'Há possível conflito longitudinal entre séries estrutural e funcional glaucomatosa.'
            : 'Dados insuficientes para tendência longitudinal glaucomatosa segura.';

  const retinaSeries = comparisons.filter(
    (c) => c.examType === 'oct_macula' || c.examType === 'retinografia'
  );
  const retinaApplicable =
    retinaSeries.length > 0 ||
    examTypesPresent.has('oct_macula') ||
    examTypesPresent.has('retinografia') ||
    hasPattern(answersText, /(baixa visual|metamorfops|retina|m[aá]cula|diabet|hiperten)/i);
  const rTrend = aggregateTrend(retinaSeries);
  const retinaSignals: string[] = [];
  for (const c of retinaSeries) {
    if (c.status === 'possible_progression') {
      pushUnique(retinaSignals, `${c.examTypeLabel} (${c.eyeLabel}) sugere possível piora.`);
    } else if (c.status === 'possible_improvement') {
      pushUnique(retinaSignals, `${c.examTypeLabel} (${c.eyeLabel}) sugere possível melhora.`);
    } else if (c.status === 'stable') {
      pushUnique(retinaSignals, `${c.examTypeLabel} (${c.eyeLabel}) sem mudança relevante.`);
    }
  }
  const retinaLimitations = collectLimitations(retinaSeries);
  if (retinaSeries.length === 0 && retinaApplicable) {
    pushUnique(retinaLimitations, 'Série longitudinal retiniana insuficiente para tendência segura.');
  }
  if (rTrend.conflict) {
    pushUnique(retinaLimitations, 'Séries retinianas com tendências divergentes no período analisado.');
  }
  const mainTemporalFinding =
    retinaSeries[0]?.progressionSummary ??
    'Sem achado temporal retiniano principal definido.';
  const retinaInterpretation =
    rTrend.trend === 'possible_progression'
      ? 'Eixo retiniano/macular com possível piora longitudinal, a correlacionar com sintomas e contexto clínico.'
      : rTrend.trend === 'possible_improvement'
        ? 'Eixo retiniano/macular com possível melhora longitudinal nas séries disponíveis.'
        : rTrend.trend === 'stable'
          ? 'Eixo retiniano/macular sem mudança relevante nas séries disponíveis.'
          : 'Dados insuficientes para tendência longitudinal retiniana segura.';

  const corneaSeries = comparisons.filter((c) =>
    ['topografia', 'galilei', 'paquimetria'].includes(c.examType)
  );
  const corneaApplicable =
    corneaSeries.length > 0 ||
    examTypesPresent.has('topografia') ||
    examTypesPresent.has('galilei') ||
    examTypesPresent.has('paquimetria') ||
    hasPattern(answersText, /(ectasia|co[cç]ar os olhos|lente de contato|cirurgia refrativa|progress[aã]o)/i);
  const cTrend = aggregateTrend(corneaSeries);
  const corneaSignals: string[] = [];
  for (const c of corneaSeries) {
    if (c.status === 'possible_progression') {
      pushUnique(corneaSignals, `${c.examTypeLabel} (${c.eyeLabel}) sugere possível progressão estrutural.`);
    } else if (c.status === 'stable') {
      pushUnique(corneaSignals, `${c.examTypeLabel} (${c.eyeLabel}) sem mudança relevante.`);
    } else if (c.status === 'possible_improvement') {
      pushUnique(corneaSignals, `${c.examTypeLabel} (${c.eyeLabel}) com possível melhora.`);
    }
  }
  const corneaLimitations = collectLimitations(corneaSeries);
  if (corneaSeries.length === 0 && corneaApplicable) {
    pushUnique(corneaLimitations, 'Série longitudinal corneana insuficiente para tendência segura.');
  }
  if (cTrend.conflict) {
    pushUnique(corneaLimitations, 'Séries corneanas com tendências divergentes entre modalidades.');
  }
  const corneaInterpretation =
    cTrend.trend === 'possible_progression'
      ? 'Eixo corneano/ectásico com possível progressão estrutural nas séries disponíveis.'
      : cTrend.trend === 'stable'
        ? 'Eixo corneano/ectásico sem mudança relevante nas séries disponíveis.'
        : cTrend.trend === 'possible_improvement'
          ? 'Eixo corneano/ectásico com possível melhora em parte das séries.'
          : 'Dados insuficientes para tendência longitudinal corneana segura.';

  return {
    glaucomaLongitudinal: {
      isApplicable: glaucomaApplicable,
      structuralTrend: gStructTrend.trend,
      functionalTrend: gFuncTrend.trend,
      longitudinalConsistency,
      dominantEye: dominantEyeFrom(glaucomaAny),
      progressionSignals: glaucomaSignals.slice(0, 4),
      glaucomaLongitudinalInterpretation: glaucomaInterpretation,
      limitations: glaucomaLimitations.slice(0, 4),
    },
    retinaLongitudinal: {
      isApplicable: retinaApplicable,
      retinaTrend: rTrend.trend,
      dominantEye: dominantEyeFrom(retinaSeries),
      mainTemporalFinding,
      retinaLongitudinalInterpretation: retinaInterpretation,
      progressionSignals: retinaSignals.slice(0, 4),
      limitations: retinaLimitations.slice(0, 4),
    },
    corneaLongitudinal: {
      isApplicable: corneaApplicable,
      cornealTrend: cTrend.trend,
      dominantEye: dominantEyeFrom(corneaSeries),
      progressionSignals: corneaSignals.slice(0, 4),
      corneaLongitudinalInterpretation: corneaInterpretation,
      limitations: corneaLimitations.slice(0, 4),
    },
  };
}
