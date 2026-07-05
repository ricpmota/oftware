import type { ClinicalFollowUpAnswer } from '@/lib/oftpay/clinicalFollowUpQuestions';

export type RefinementDelta = {
  summary: string;
  keyChanges: string[];
  reducedLikelihoods: string[];
  unchangedPoints: string[];
  remainingLimitations: string[];
};

function normalizeLine(s: string): string {
  return s
    .toLowerCase()
    .replace(/^[-*\d\.\)\s]+/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractCandidateLines(text: string): string[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => line.length >= 20);
}

function uniqueByNormalized(lines: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const line of lines) {
    const n = normalizeLine(line);
    if (!n || seen.has(n)) continue;
    seen.add(n);
    out.push(line);
  }
  return out;
}

function isLimitationLine(line: string): boolean {
  return /(limita|incerte|cautela|revis[aã]o|correlacionar|insuficien|n[aã]o conclusiv)/i.test(
    line
  );
}

function toBullet(line: string): string {
  return line.replace(/^[-*]\s*/, '').trim();
}

export function hasMeaningfulRefinementDelta(delta: RefinementDelta | null | undefined): boolean {
  if (!delta) return false;
  return (
    delta.keyChanges.length > 0 ||
    delta.reducedLikelihoods.length > 0 ||
    delta.remainingLimitations.length > 0
  );
}

export function buildRefinementDelta(params: {
  initialAnswer: string;
  refinedAnswer: string;
  answersUsed: ClinicalFollowUpAnswer[];
}): RefinementDelta {
  const initialLines = uniqueByNormalized(extractCandidateLines(params.initialAnswer));
  const refinedLines = uniqueByNormalized(extractCandidateLines(params.refinedAnswer));

  const initialNorm = new Set(initialLines.map(normalizeLine));
  const refinedNorm = new Set(refinedLines.map(normalizeLine));

  const added = refinedLines.filter((l) => !initialNorm.has(normalizeLine(l))).slice(0, 4);
  const removed = initialLines.filter((l) => !refinedNorm.has(normalizeLine(l))).slice(0, 3);
  const overlap = refinedLines.filter((l) => initialNorm.has(normalizeLine(l))).slice(0, 3);
  const limitations = refinedLines.filter((l) => isLimitationLine(l)).slice(0, 3);

  const summaryParts: string[] = [];
  if (added.length > 0) {
    summaryParts.push(
      `As respostas clínicas adicionaram ${added.length} ponto(s) de refinamento na interpretação.`
    );
  } else {
    summaryParts.push('As respostas clínicas trouxeram refinamento discreto, sem mudança ampla de direção.');
  }
  if (removed.length > 0) {
    summaryParts.push(`${removed.length} ponto(s) iniciais perderam força relativa.`);
  }
  if (limitations.length > 0) {
    summaryParts.push('Persistem limitações que exigem correlação clínica adicional.');
  }
  if (params.answersUsed.length > 0) {
    summaryParts.push(`Foram consideradas ${params.answersUsed.length} resposta(s) clínica(s).`);
  }

  return {
    summary: summaryParts.join(' '),
    keyChanges: added.map(toBullet),
    reducedLikelihoods: removed.map(toBullet),
    unchangedPoints: overlap.map(toBullet),
    remainingLimitations: limitations.map(toBullet),
  };
}
