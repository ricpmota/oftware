/**
 * Monta OperationalFlowMatch a partir da definição canônica (índice).
 */

import type { OperationalFlowDefinition } from './operationalFlowIndex';
import { OPERATIONAL_FLOW_SOURCE_PATH } from './operationalFlowIndex';
import type { OperationalConfidenceBand, OperationalFlowMatch } from './operationalFlowTypes';

export function matchFromFlowDefinition(
  def: OperationalFlowDefinition,
  confidence: number,
  confidenceBand: OperationalConfidenceBand | undefined,
  resolution: NonNullable<OperationalFlowMatch['resolution']>
): OperationalFlowMatch {
  const steps = [...def.steps];
  const instructions = steps.map((s, i) => `${i + 1}. ${s}`).join('\n');
  return {
    matched: true,
    confidence: Math.min(1, Math.max(0, confidence)),
    profile: def.profile,
    surface: def.surface,
    objective: def.objective,
    title: def.title,
    instructions,
    steps,
    sourcePath: OPERATIONAL_FLOW_SOURCE_PATH,
    fallbackLeadIn: def.fallbackLeadIn,
    flowId: def.id,
    confidenceBand,
    resolution,
  };
}
