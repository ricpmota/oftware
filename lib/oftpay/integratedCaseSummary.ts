import type { ClinicalFollowUpAnswer } from '@/lib/oftpay/clinicalFollowUpQuestions';
import type { RefinementDelta } from '@/lib/oftpay/refinementDelta';

export type IntegratedCaseSummary = {
  headline: string;
  mainClinicalImpression: string;
  mostRelevantFactors: string[];
  recommendedNextSteps: string[];
  remainingUncertainties: string[];
  basedOn: string[];
};

function collectBulletLikeLines(text: string): string[] {
  return text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .filter((l) => l.length >= 25)
    .map((l) => l.replace(/^[-*]\s*/, ''));
}

function pickHeadlineFromAnswer(answer: string): string {
  const lines = collectBulletLikeLines(answer);
  const candidate =
    lines.find((l) => /(compat[ií]vel|sugestivo|assimetr|progress|macul|glaucom|corne|retin)/i.test(l)) ??
    lines[0] ??
    '';
  if (!candidate) {
    return 'Síntese clínica inicial com necessidade de correlação adicional.';
  }
  return candidate.length > 120 ? `${candidate.slice(0, 117)}...` : candidate;
}

function uniqueNormalized(lines: string[], max: number): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const line of lines) {
    const normalized = line.toLowerCase().replace(/\s+/g, ' ').trim();
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    out.push(line);
    if (out.length >= max) break;
  }
  return out;
}

export function hasMeaningfulIntegratedSummary(
  summary: IntegratedCaseSummary | null | undefined
): boolean {
  if (!summary) return false;
  return (
    summary.headline.trim().length > 0 ||
    summary.mostRelevantFactors.length > 0 ||
    summary.recommendedNextSteps.length > 0
  );
}

export function buildIntegratedCaseSummary(params: {
  analysisAnswer: string;
  initialAnswer?: string;
  qualityContext?: string;
  binocularContext?: string;
  temporalContext?: string;
  refinementDelta?: RefinementDelta | null;
  followUpAnswers?: ClinicalFollowUpAnswer[];
}): IntegratedCaseSummary {
  const {
    analysisAnswer,
    initialAnswer = '',
    qualityContext = '',
    binocularContext = '',
    temporalContext = '',
    refinementDelta = null,
    followUpAnswers = [],
  } = params;

  const isRefined = Boolean(initialAnswer.trim());
  const answeredCount = followUpAnswers.filter((a) => a.answer && a.answer.trim()).length;

  const headline = pickHeadlineFromAnswer(analysisAnswer);

  const analysisLines = collectBulletLikeLines(analysisAnswer);
  const mainClinicalImpression =
    analysisLines.find((l) => /(compat[ií]vel|sugestivo|hip[oó]tese|correlacionar)/i.test(l)) ??
    'Achados sugestivos, a correlacionar com contexto clínico e exame oftalmológico completo.';

  const factors: string[] = [];
  if (refinementDelta?.keyChanges?.length) {
    factors.push(...refinementDelta.keyChanges.slice(0, 2));
  }
  if (binocularContext.trim()) {
    factors.push('Correlação binocular considerada para qualificar simetria/assimetria entre OD e OE.');
  }
  if (temporalContext.trim()) {
    factors.push('Comparação temporal da mesma modalidade e olho foi incorporada à síntese.');
  }
  if (qualityContext.trim()) {
    factors.push('Qualidade da extração e cobertura de campos-chave foram ponderadas na interpretação.');
  }
  if (answeredCount > 0) {
    factors.push(`${answeredCount} resposta(s) clínica(s) adicional(is) contribuíram para o refinamento.`);
  }
  if (factors.length === 0 && analysisLines.length > 0) {
    factors.push(...analysisLines.slice(0, 2));
  }

  const nextSteps: string[] = [];
  if (analysisLines.some((l) => /(pio|press[aã]o intraocular|glaucom)/i.test(l))) {
    nextSteps.push('Correlacionar com PIO, disco óptico e histórico de glaucoma.');
  }
  if (analysisLines.some((l) => /(macul|retin|fluido|drusa|hemorrag|exsud)/i.test(l))) {
    nextSteps.push('Correlacionar com exame de fundo e sintomas visuais atuais.');
  }
  if (temporalContext.trim()) {
    nextSteps.push('Revisar progressão com exames sequenciais e contexto clínico atual.');
  }
  if (nextSteps.length === 0) {
    nextSteps.push('Manter correlação com exame clínico completo antes de qualquer conclusão definitiva.');
  }

  const uncertainties: string[] = [];
  if (refinementDelta?.remainingLimitations?.length) {
    uncertainties.push(...refinementDelta.remainingLimitations.slice(0, 2));
  }
  if (qualityContext.trim()) {
    uncertainties.push('Persistem limitações de qualidade/cobertura que podem restringir a interpretação.');
  }
  if (!binocularContext.trim()) {
    uncertainties.push('Correlação binocular indisponível ou limitada para esta sessão.');
  }
  if (!temporalContext.trim()) {
    uncertainties.push('Comparação temporal indisponível ou insuficiente com os arquivos atuais.');
  }

  const basedOn = uniqueNormalized(
    [
      'análise inicial/refinada',
      qualityContext.trim() ? 'qualidade da extração e checklist' : '',
      binocularContext.trim() ? 'correlação binocular' : '',
      temporalContext.trim() ? 'comparação temporal' : '',
      answeredCount > 0 ? 'respostas clínicas complementares' : '',
      isRefined ? 'delta do refinamento' : '',
    ].filter(Boolean),
    5
  );

  return {
    headline,
    mainClinicalImpression,
    mostRelevantFactors: uniqueNormalized(factors, 5),
    recommendedNextSteps: uniqueNormalized(nextSteps, 5),
    remainingUncertainties: uniqueNormalized(uncertainties, 4),
    basedOn,
  };
}
