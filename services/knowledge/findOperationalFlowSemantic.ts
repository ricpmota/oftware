/**
 * Busca semântica por embeddings (cosine) sobre operationalFlowIndex.
 */

import { cosineSimilarity, generateEmbedding, getEmbeddingForFlow } from './operationalEmbeddings';
import { OPERATIONAL_FLOW_DEFINITIONS, type OperationalFlowDefinition } from './operationalFlowIndex';
import { matchFromFlowDefinition } from './operationalMatchShared';
import type { FindOperationalFlowOptions, OperationalConfidenceBand, OperationalFlowMatch } from './operationalFlowTypes';

const STRONG = 0.75;
const WEAK = 0.55;

/**
 * Similaridade bruta (0–1) do melhor fluxo, sem limiar — para o híbrido.
 */
export async function rankOperationalFlowsByEmbedding(userText: string): Promise<{
  topSimilarity: number;
  topFlow: OperationalFlowDefinition | null;
}> {
  const raw = userText.trim();
  if (!raw) return { topSimilarity: 0, topFlow: null };
  let query: number[];
  try {
    query = await generateEmbedding(raw);
  } catch {
    return { topSimilarity: 0, topFlow: null };
  }
  let best: { def: OperationalFlowDefinition; sim: number } | null = null;
  for (const def of OPERATIONAL_FLOW_DEFINITIONS) {
    try {
      const fv = await getEmbeddingForFlow(def);
      const sim = cosineSimilarity(query, fv);
      if (!best || sim > best.sim) best = { def, sim };
    } catch {
      /* skip */
    }
  }
  if (!best) return { topSimilarity: 0, topFlow: null };
  return { topSimilarity: best.sim, topFlow: best.def };
}

function emptySemanticMatch(similarity: number): OperationalFlowMatch {
  return {
    matched: false,
    confidence: similarity,
    title: '',
    instructions: '',
    steps: [],
    resolution: {
      strategy: 'semantic_below_threshold',
      semanticScore: similarity,
    },
  };
}

/**
 * Ranqueia fluxos por similaridade de cosseno com a pergunta.
 * - confidence = similaridade (vetores L2-normalizados, tipicamente ~0–1).
 * - matched somente se similaridade ≥ 0,55.
 */
export async function findOperationalFlowSemantic(
  userText: string,
  _options?: FindOperationalFlowOptions
): Promise<OperationalFlowMatch> {
  const raw = userText.trim();
  if (!raw) {
    return {
      matched: false,
      confidence: 0,
      title: '',
      instructions: '',
      steps: [],
      resolution: { strategy: 'semantic_empty_query' },
    };
  }

  const { topSimilarity, topFlow } = await rankOperationalFlowsByEmbedding(raw);
  if (topSimilarity === 0 && !topFlow) {
    return {
      matched: false,
      confidence: 0,
      title: '',
      instructions: '',
      steps: [],
      resolution: { strategy: 'semantic_provider_error' },
    };
  }
  if (!topFlow) {
    return {
      matched: false,
      confidence: 0,
      title: '',
      instructions: '',
      steps: [],
      resolution: { strategy: 'semantic_no_flow_vectors' },
    };
  }
  if (topSimilarity < WEAK) {
    return emptySemanticMatch(topSimilarity);
  }

  const band: OperationalConfidenceBand = topSimilarity >= STRONG ? 'strong' : 'moderate';
  return matchFromFlowDefinition(topFlow, topSimilarity, band, {
    strategy: 'semantic',
    semanticScore: topSimilarity,
  });
}
