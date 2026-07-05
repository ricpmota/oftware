import type { OftalmoExamType } from '@/lib/oftpay/laudoOftalmoExtraction';

export type ChecklistStatus = 'good' | 'partial' | 'weak';

type ChecklistRule = readonly string[];

/**
 * Checklist curto para inspeção operacional por modalidade.
 * Cada item representa um "slot" obrigatório leve; quando há múltiplas chaves,
 * qualquer uma preenchida já cobre o slot.
 */
const CHECKLIST_RULES_BY_TYPE: Record<OftalmoExamType, readonly ChecklistRule[]> = {
  paquimetria: [['espessura_central'], ['menor_espessura']],
  topografia: [['k1'], ['k2'], ['km'], ['padrao_curvatura']],
  galilei: [['paquimetria_minima'], ['elevacao_posterior'], ['indices_ectasia']],
  microscopia: [['densidade_endotelial'], ['hexagonalidade', 'observacoes_endoteliais']],
  campimetria: [['confiabilidade'], ['md'], ['psd'], ['vfi', 'ght']],
  retinografia: [['disco_optico'], ['macula'], ['vasos', 'outras_alteracoes']],
  oct_disco: [
    ['rnfl_global'],
    ['rnfl_superior'],
    ['rnfl_inferior'],
    ['escavacao', 'observacoes_estruturais'],
  ],
  oct_macula: [
    ['espessura_central'],
    ['fluido_intrarretiniano', 'fluido_subrretiniano'],
    ['observacoes_maculares', 'membrana_epirretiniana'],
  ],
};

function isFilled(v: unknown): boolean {
  if (v === null || v === undefined) return false;
  if (typeof v === 'number') return Number.isFinite(v);
  return String(v).trim() !== '';
}

export function getExamTypeKeyChecklist(examType: OftalmoExamType): readonly ChecklistRule[] {
  return CHECKLIST_RULES_BY_TYPE[examType];
}

export type ChecklistCoverageResult = {
  checklistCoverage: number;
  checklistFilledCount: number;
  checklistTotal: number;
  checklistStatus: ChecklistStatus;
  filledKeyFields: string[];
  missingKeyFields: string[];
};

export function getChecklistStatusLabel(status: ChecklistStatus): string {
  if (status === 'good') return 'boa';
  if (status === 'partial') return 'parcial';
  return 'fraca';
}

export function buildChecklistCoverage(
  examType: OftalmoExamType,
  camposEstruturados: Record<string, string | number | null>
): ChecklistCoverageResult {
  const rules = getExamTypeKeyChecklist(examType);
  const checklistTotal = rules.length;
  const filledKeyFields: string[] = [];
  const missingKeyFields: string[] = [];

  for (const alternatives of rules) {
    const matched = alternatives.find((field) => isFilled(camposEstruturados[field]));
    if (matched) {
      filledKeyFields.push(matched);
      continue;
    }
    missingKeyFields.push(alternatives[0]);
  }

  const checklistFilledCount = filledKeyFields.length;
  const checklistCoverage =
    checklistTotal > 0 ? Number((checklistFilledCount / checklistTotal).toFixed(2)) : 0;

  let checklistStatus: ChecklistStatus = 'weak';
  if (checklistCoverage >= 0.75) checklistStatus = 'good';
  else if (checklistCoverage >= 0.4) checklistStatus = 'partial';

  return {
    checklistCoverage,
    checklistFilledCount,
    checklistTotal,
    checklistStatus,
    filledKeyFields,
    missingKeyFields,
  };
}
