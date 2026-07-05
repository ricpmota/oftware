import type { CorneaCorrelation } from '@/lib/oftpay/corneaCorrelation';
import type { GlaucomaCorrelation } from '@/lib/oftpay/glaucomaCorrelation';
import type { RetinaCorrelation } from '@/lib/oftpay/retinaCorrelation';

export type ClinicalDomain = 'glaucoma' | 'retina' | 'cornea';
export type DomainStrength = 'strong' | 'partial';

export type MultiDomainActiveDomain = {
  domain: ClinicalDomain;
  status: DomainStrength;
  reason: string;
};

export type MultiDomainCorrelation = {
  isApplicable: boolean;
  activeDomains: MultiDomainActiveDomain[];
  primaryDomain: ClinicalDomain | 'indeterminate';
  secondaryDomains: ClinicalDomain[];
  domainConvergences: string[];
  domainConflicts: string[];
  overallClinicalAxis: string;
  harmonizedInterpretation: string;
  remainingAmbiguities: string[];
  recommendedCrossChecks: string[];
  limitations: string[];
};

type DomainInput = {
  domain: ClinicalDomain;
  score: number;
  status: DomainStrength;
  reason: string;
  conflicts: string[];
  limitations: string[];
};

function pushUnique(list: string[], value: string, max = 6) {
  if (!value.trim() || list.includes(value) || list.length >= max) return;
  list.push(value);
}

function domainLabel(domain: ClinicalDomain): string {
  if (domain === 'glaucoma') return 'glaucomatoso';
  if (domain === 'retina') return 'retiniano/macular';
  return 'corneano/ectásico';
}

function scoreGlaucoma(g: GlaucomaCorrelation): DomainInput | null {
  if (!g.isApplicable) return null;
  let score = 0;
  if (g.structureFunctionCorrelation === 'coherent') score += 3;
  else if (g.structureFunctionCorrelation === 'partially_coherent') score += 2;
  else if (g.structureFunctionCorrelation === 'discordant') score += 1;
  score += Math.min(1, g.progressionSignals.length);
  score += Math.min(1, g.mainFindings.length >= 2 ? 1 : 0);
  if (g.limitations.length >= 3) score -= 1;
  if (g.conflictsOrGaps.length >= 2) score -= 1;
  const bounded = Math.max(0, score);
  if (bounded <= 0) return null;
  return {
    domain: 'glaucoma',
    score: bounded,
    status: bounded >= 3 ? 'strong' : 'partial',
    reason:
      g.structureFunctionCorrelation === 'coherent'
        ? 'Correlação estrutura-função glaucomatosa consistente.'
        : 'Eixo glaucomatoso presente com suporte parcial.',
    conflicts: g.conflictsOrGaps,
    limitations: g.limitations,
  };
}

function scoreRetina(r: RetinaCorrelation): DomainInput | null {
  if (!r.isApplicable) return null;
  let score = 0;
  if (r.anatomicalClinicalCorrelation === 'coherent') score += 3;
  else if (r.anatomicalClinicalCorrelation === 'partially_coherent') score += 2;
  else if (r.anatomicalClinicalCorrelation === 'discordant') score += 1;
  score += Math.min(1, r.temporalSignals.length);
  score += Math.min(1, r.mainFindings.length >= 2 ? 1 : 0);
  if (r.limitations.length >= 3) score -= 1;
  if (r.conflictsOrGaps.length >= 2) score -= 1;
  const bounded = Math.max(0, score);
  if (bounded <= 0) return null;
  return {
    domain: 'retina',
    score: bounded,
    status: bounded >= 3 ? 'strong' : 'partial',
    reason:
      r.anatomicalClinicalCorrelation === 'coherent'
        ? 'Coerência anatomia-sintomas retiniana/macular relevante.'
        : 'Eixo retiniano/macular presente com suporte parcial.',
    conflicts: r.conflictsOrGaps,
    limitations: r.limitations,
  };
}

function scoreCornea(c: CorneaCorrelation): DomainInput | null {
  if (!c.isApplicable) return null;
  let score = 0;
  if (c.cornealStructuralCorrelation === 'coherent') score += 3;
  else if (c.cornealStructuralCorrelation === 'partially_coherent') score += 2;
  else if (c.cornealStructuralCorrelation === 'discordant') score += 1;
  score += Math.min(1, c.progressionSignals.length);
  score += Math.min(1, c.mainFindings.length >= 2 ? 1 : 0);
  if (c.limitations.length >= 3) score -= 1;
  if (c.conflictsOrGaps.length >= 2) score -= 1;
  const bounded = Math.max(0, score);
  if (bounded <= 0) return null;
  return {
    domain: 'cornea',
    score: bounded,
    status: bounded >= 3 ? 'strong' : 'partial',
    reason:
      c.cornealStructuralCorrelation === 'coherent'
        ? 'Correlação estrutural corneana consistente.'
        : 'Eixo corneano/ectásico presente com suporte parcial.',
    conflicts: c.conflictsOrGaps,
    limitations: c.limitations,
  };
}

export function hasMeaningfulMultiDomainCorrelation(
  value: MultiDomainCorrelation | null | undefined
): boolean {
  return !!value && value.isApplicable;
}

export function buildMultiDomainCorrelation(params: {
  glaucomaCorrelation?: GlaucomaCorrelation | null;
  retinaCorrelation?: RetinaCorrelation | null;
  corneaCorrelation?: CorneaCorrelation | null;
}): MultiDomainCorrelation {
  const inputs: DomainInput[] = [];
  const g = params.glaucomaCorrelation ? scoreGlaucoma(params.glaucomaCorrelation) : null;
  const r = params.retinaCorrelation ? scoreRetina(params.retinaCorrelation) : null;
  const c = params.corneaCorrelation ? scoreCornea(params.corneaCorrelation) : null;
  if (g) inputs.push(g);
  if (r) inputs.push(r);
  if (c) inputs.push(c);

  if (inputs.length === 0) {
    return {
      isApplicable: false,
      activeDomains: [],
      primaryDomain: 'indeterminate',
      secondaryDomains: [],
      domainConvergences: [],
      domainConflicts: [],
      overallClinicalAxis: 'Sem eixo clínico especializado dominante.',
      harmonizedInterpretation:
        'Não há domínios especializados suficientemente ativos para harmonização clínica nesta sessão.',
      remainingAmbiguities: [],
      recommendedCrossChecks: [],
      limitations: [],
    };
  }

  inputs.sort((a, b) => b.score - a.score);
  const top = inputs[0];
  const second = inputs[1];
  const primaryDomain: ClinicalDomain | 'indeterminate' =
    top && second && top.score === second.score ? 'indeterminate' : (top?.domain ?? 'indeterminate');
  const secondaryDomains =
    primaryDomain === 'indeterminate'
      ? inputs.map((x) => x.domain)
      : inputs.filter((x) => x.domain !== primaryDomain).map((x) => x.domain);

  const activeDomains: MultiDomainActiveDomain[] = inputs.map((x) => ({
    domain: x.domain,
    status: x.status,
    reason: x.reason,
  }));

  const domainConvergences: string[] = [];
  const domainConflicts: string[] = [];
  const remainingAmbiguities: string[] = [];
  const limitations: string[] = [];

  if (primaryDomain !== 'indeterminate') {
    pushUnique(
      domainConvergences,
      `Eixo ${domainLabel(primaryDomain)} com maior peso relativo nesta integração.`
    );
    if (secondaryDomains.length > 0) {
      pushUnique(
        domainConvergences,
        `Domínios secundários ativos: ${secondaryDomains.map((d) => domainLabel(d)).join(', ')}.`
      );
    }
  } else {
    pushUnique(
      domainConflicts,
      'Dois ou mais domínios ativos com força semelhante, sem hierarquização segura neste momento.'
    );
  }

  for (const item of inputs) {
    for (const conflict of item.conflicts.slice(0, 2)) {
      pushUnique(domainConflicts, `[${domainLabel(item.domain)}] ${conflict}`, 5);
    }
    for (const limitation of item.limitations.slice(0, 2)) {
      pushUnique(remainingAmbiguities, `[${domainLabel(item.domain)}] ${limitation}`, 5);
      pushUnique(limitations, limitation, 6);
    }
  }

  if (inputs.length > 1 && inputs.every((x) => x.status === 'partial')) {
    pushUnique(
      remainingAmbiguities,
      'Domínios múltiplos ativos, porém com suporte parcial e necessidade de priorização clínica prudente.'
    );
  }

  const overallClinicalAxis =
    primaryDomain === 'indeterminate'
      ? 'Eixos coexistentes sem predominância clara.'
      : `Predomínio atual do eixo ${domainLabel(primaryDomain)}.`;

  const harmonizedInterpretation =
    primaryDomain === 'indeterminate'
      ? 'Há coexistência de eixos especializados com força semelhante, mantendo ambiguidades e necessidade de correlação clínica direcionada.'
      : secondaryDomains.length === 0
        ? `O eixo clínico predominante neste caso é ${domainLabel(
            primaryDomain
          )}, sem domínio secundário forte no momento.`
        : `O eixo clínico predominante neste caso é ${domainLabel(
            primaryDomain
          )}, com domínios secundários ainda a correlacionar quanto ao impacto clínico atual.`;

  const recommendedCrossChecks: string[] = [];
  pushUnique(
    recommendedCrossChecks,
    primaryDomain === 'indeterminate'
      ? 'Correlacionar os eixos ativos com sintomas predominantes antes de hierarquizar domínio principal.'
      : `Correlacionar o domínio principal (${domainLabel(
          primaryDomain
        )}) com sintomas e dados clínicos predominantes.`
  );
  pushUnique(
    recommendedCrossChecks,
    'Revisar se os domínios secundários têm impacto clínico real no quadro atual.'
  );
  pushUnique(
    recommendedCrossChecks,
    'Comparar com exames prévios relevantes do eixo de maior peso clínico.'
  );
  pushUnique(
    recommendedCrossChecks,
    'Reavaliar qualidade e abrangência dos dados antes da hierarquização final entre domínios.'
  );

  return {
    isApplicable: true,
    activeDomains,
    primaryDomain,
    secondaryDomains,
    domainConvergences,
    domainConflicts,
    overallClinicalAxis,
    harmonizedInterpretation,
    remainingAmbiguities,
    recommendedCrossChecks,
    limitations: limitations.slice(0, 6),
  };
}
