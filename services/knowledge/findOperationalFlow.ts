/**
 * Resolver híbrido: embeddings (semântico) + heurística por keywords.
 * Conteúdo alinhado a docs/conhecimento/oftware_fluxos_operacionais.md
 */

import { OPERATIONAL_FLOW_DEFINITIONS } from './operationalFlowIndex';
import type { OperationalFlowDefinition } from './operationalFlowIndex';
import { rankOperationalFlowsByEmbedding } from './findOperationalFlowSemantic';
import { matchFromFlowDefinition } from './operationalMatchShared';
import type {
  FindOperationalFlowOptions,
  OperationalConfidenceBand,
  OperationalFlowMatch,
  OperationalProfile,
} from './operationalFlowTypes';

const STRONG_SEM = 0.75;
const WEAK_SEM = 0.55;
/** Piso legado do score bruto (evita ruído). */
const HEURISTIC_SCORE_FLOOR = 0.45;

function stripAccents(s: string): string {
  return s.normalize('NFD').replace(/\p{M}/gu, '');
}

function normalize(s: string): string {
  return stripAccents(s.toLowerCase());
}

function inferProfileFromText(t: string): OperationalProfile | undefined {
  if (/\b(metaadmin|meus pacientes|meu paciente cadastr|paciente na lista|plano terapêutico.*paciente|crm\b)\b/i.test(t)) return 'medico';
  if (/\b(metanutri|nutricionista)\b/i.test(t)) return 'nutricionista';
  if (/\b(metapersonal|personal trainer)\b/i.test(t)) return 'personal';
  if (/\b(\/meta\b|meus tratamentos|buscar médico|solicitação|paciente\b.*\b(app|plataforma))\b/i.test(t)) return 'paciente';
  return undefined;
}

function scoreFlow(
  def: OperationalFlowDefinition,
  t: string,
  inferred: OperationalProfile | undefined,
  hint?: OperationalProfile
): number {
  const profile = hint ?? inferred;
  let score = 0;
  let groupsHit = 0;
  def.heuristicKeywordGroups.forEach((group, i) => {
    const w = def.heuristicWeights?.[i] ?? 1;
    const hit = group.some((k) => t.includes(normalize(k)));
    if (hit) {
      groupsHit += 1;
      score += w;
    }
  });
  if (profile && profile === def.profile) score += 0.35;
  if (profile && profile !== def.profile) score -= 0.25;
  if (groupsHit >= 2) score += 0.2;
  return Math.max(0, score);
}

type HeuristicBest = { def: OperationalFlowDefinition; score: number; conf: number };

function computeHeuristicBest(userText: string, options?: FindOperationalFlowOptions): HeuristicBest | null {
  const raw = userText.trim();
  if (!raw) return null;
  const t = normalize(raw);
  const inferred = options?.profileHint ?? inferProfileFromText(raw);
  let best: { def: OperationalFlowDefinition; score: number } | null = null;
  for (const def of OPERATIONAL_FLOW_DEFINITIONS) {
    const s = scoreFlow(def, t, inferred, options?.profileHint);
    if (!best || s > best.score) best = { def, score: s };
  }
  if (!best || best.score < HEURISTIC_SCORE_FLOOR) return null;
  const conf = Math.min(1, best.score / 2.5);
  return { def: best.def, score: best.score, conf };
}

function emptyMatch(extra?: Partial<OperationalFlowMatch>): OperationalFlowMatch {
  return {
    matched: false,
    confidence: 0,
    title: '',
    instructions: '',
    steps: [],
    ...extra,
  };
}

function bandFromConf(c: number): OperationalConfidenceBand | undefined {
  if (c >= STRONG_SEM) return 'strong';
  if (c >= WEAK_SEM) return 'moderate';
  return undefined;
}

/**
 * Heurística síncrona (keywords). `matched` somente se confiança ≥ 0,55.
 * Útil para testes e caminhos sem embeddings.
 */
export function findOperationalFlowHeuristic(userText: string, options?: FindOperationalFlowOptions): OperationalFlowMatch {
  const best = computeHeuristicBest(userText, options);
  if (!best) return emptyMatch({ resolution: { strategy: 'heuristic_no_candidate' } });

  if (best.conf < WEAK_SEM) {
    return emptyMatch({
      confidence: best.conf,
      resolution: {
        strategy: 'heuristic_below_threshold',
        heuristicScore: best.conf,
      },
    });
  }

  return matchFromFlowDefinition(best.def, best.conf, bandFromConf(best.conf), {
    strategy: 'heuristic',
    heuristicScore: best.conf,
  });
}

/**
 * v2: semântico + heurístico. Mantém `OperationalFlowMatch` como contrato único.
 */
export async function findOperationalFlow(
  userText: string,
  options?: FindOperationalFlowOptions
): Promise<OperationalFlowMatch> {
  const raw = userText.trim();
  if (!raw) return emptyMatch({ resolution: { strategy: 'empty_query' } });

  const heurBest = computeHeuristicBest(raw, options);
  const heurMatch = heurBest && heurBest.conf >= WEAK_SEM
    ? matchFromFlowDefinition(heurBest.def, heurBest.conf, bandFromConf(heurBest.conf), {
        strategy: 'heuristic',
        heuristicScore: heurBest.conf,
      })
    : null;

  const { topSimilarity: semSim, topFlow: semDef } = await rankOperationalFlowsByEmbedding(raw);

  const heurConf = heurBest?.conf ?? 0;
  const heurId = heurBest?.def.id ?? null;

  // Semântico forte
  if (semDef && semSim >= STRONG_SEM) {
    return matchFromFlowDefinition(semDef, semSim, 'strong', {
      strategy: 'hybrid_semantic_strong',
      semanticScore: semSim,
      heuristicScore: heurConf || undefined,
    });
  }

  // Semântico médio
  if (semDef && semSim >= WEAK_SEM && semSim < STRONG_SEM) {
    if (heurId === semDef.id && heurBest) {
      const final = (semSim + heurBest.conf) / 2;
      if (final >= WEAK_SEM) {
        const band = bandFromConf(final) ?? 'moderate';
        return matchFromFlowDefinition(semDef, final, band, {
          strategy: 'hybrid_converge',
          semanticScore: semSim,
          heuristicScore: heurBest.conf,
        });
      }
      return matchFromFlowDefinition(semDef, semSim, 'moderate', {
        strategy: 'semantic_medium_same_id_weak_heuristic',
        semanticScore: semSim,
        heuristicScore: heurBest.conf,
      });
    }
    if (heurId && heurId !== semDef.id && heurBest && heurBest.conf >= WEAK_SEM) {
      const final = (semSim + heurBest.conf) / 2;
      if (final < WEAK_SEM) {
        return emptyMatch({
          confidence: final,
          resolution: {
            strategy: 'hybrid_diverge_too_low',
            semanticScore: semSim,
            heuristicScore: heurBest.conf,
          },
        });
      }
      return matchFromFlowDefinition(semDef, final, 'moderate', {
        strategy: 'hybrid_diverge_average',
        semanticScore: semSim,
        heuristicScore: heurBest.conf,
      });
    }
    return matchFromFlowDefinition(semDef, semSim, 'moderate', {
      strategy: 'semantic_medium_only',
      semanticScore: semSim,
      heuristicScore: heurConf || undefined,
    });
  }

  // Semântico fraco / indisponível → heurístico
  if (heurMatch?.matched) {
    return {
      ...heurMatch,
      resolution: {
        strategy: semSim > 0 ? 'heuristic_after_weak_semantic' : 'heuristic_only',
        semanticScore: semSim > 0 ? semSim : undefined,
        heuristicScore: heurConf,
      },
    };
  }

  return emptyMatch({
    confidence: Math.max(semSim, heurConf),
    resolution: {
      strategy: 'no_operational_match',
      semanticScore: semSim > 0 ? semSim : undefined,
      heuristicScore: heurConf > 0 ? heurConf : undefined,
    },
  });
}
