/**
 * Tipos, labels e orientação de extração para laudos oftalmológicos (OftPay).
 * Centralizado para uso na API de extração e, opcionalmente, no front.
 */

export const OFTALMO_EXAM_TYPES = [
  'paquimetria',
  'topografia',
  'galilei',
  'microscopia',
  'campimetria',
  'retinografia',
  'oct_disco',
  'oct_macula',
] as const;

export type OftalmoExamType = (typeof OFTALMO_EXAM_TYPES)[number];

const LABELS: Record<OftalmoExamType, string> = {
  paquimetria: 'Paquimetria',
  topografia: 'Topografia',
  galilei: 'Galilei',
  microscopia: 'Microscopia',
  campimetria: 'Campimetria',
  retinografia: 'Retinografia',
  oct_disco: 'OCT Disco',
  oct_macula: 'OCT Mácula',
};

/** Campos que a extração deve priorizar por modalidade (chaves em camposEstruturados). */
export const STRUCTURED_FIELDS_BY_TYPE: Record<OftalmoExamType, readonly string[]> = {
  paquimetria: [
    'espessura_central',
    'menor_espessura',
    'localizacao_ponto_mais_fino',
    'assimetria_ou_observacoes',
  ],
  topografia: [
    'k1',
    'k2',
    'km',
    'astigmatismo',
    'eixo',
    'padrao_curvatura',
    'sinais_sugestivos_ectasia',
  ],
  galilei: [
    'k1',
    'k2',
    'km',
    'paquimetria_minima',
    'elevacao_anterior',
    'elevacao_posterior',
    'indices_ectasia',
    'sinais_sugestivos_ectasia',
  ],
  microscopia: [
    'densidade_endotelial',
    'hexagonalidade',
    'polimegatismo',
    'pleomorfismo',
    'observacoes_endoteliais',
  ],
  campimetria: [
    'confiabilidade',
    'perdas_fixacao',
    'falso_positivo',
    'falso_negativo',
    'md',
    'psd',
    'vfi',
    'ght',
    'padrao_defeito',
  ],
  retinografia: [
    'disco_optico',
    'escavacao',
    'macula',
    'vasos',
    'hemorragias',
    'exsudatos',
    'drusas',
    'outras_alteracoes',
  ],
  oct_disco: [
    'rnfl_global',
    'rnfl_superior',
    'rnfl_inferior',
    'rnfl_nasal',
    'rnfl_temporal',
    'escavacao',
    'assimetria',
    'observacoes_estruturais',
  ],
  oct_macula: [
    'espessura_central',
    'fluido_intrarretiniano',
    'fluido_subrretiniano',
    'cistos',
    'ped',
    'membrana_epirretiniana',
    'tracao_vitreo_macular',
    'observacoes_maculares',
  ],
};

export function isOftalmoExamType(v: string): v is OftalmoExamType {
  return (OFTALMO_EXAM_TYPES as readonly string[]).includes(v);
}

export function normalizeOftalmoExamTypeParam(raw: string | null | undefined): OftalmoExamType | null {
  if (typeof raw !== 'string' || !raw.trim()) return null;
  const t = raw.trim().toLowerCase();
  return isOftalmoExamType(t) ? t : null;
}

export function getExamTypeLabel(examType: OftalmoExamType): string {
  return LABELS[examType];
}

/**
 * Instruções textuais para o modelo de extração (prioridades por modalidade).
 */
export function buildExtractionGuidanceByExamType(examType: OftalmoExamType): string {
  const g: Record<OftalmoExamType, string> = {
    paquimetria:
      'Priorize espessura corneal central, menor espessura, onde está o ponto mais fino e assimetria ou notas do laudo. Não interprete diagnóstico; apenas transcreva/medidas.',
    topografia:
      'Priorize K1, K2, Km, astigmatismo, eixo, padrão de curvatura e qualquer menção a ectasia ou índices. Dados numéricos como no documento.',
    galilei:
      'Priorize curvaturas, paquimetria mínima, elevações anterior/posterior, índices de ectasia e sinais sugestivos descritos no relatório.',
    microscopia:
      'Priorize densidade endotelial, hexagonalidade, polimegatismo, pleomorfismo e observações sobre endotélio. Unidades como no laudo.',
    campimetria:
      'Priorize confiabilidade (fixação, falsos positivos/negativos) ANTES de MD, PSD, VFI, GHT e descrição do padrão do defeito.',
    retinografia:
      'Descreva achados visíveis em disco, mácula, vasos, hemorragias, exsudatos, drusas e outras alterações; use texto objetivo.',
    oct_disco:
      'Priorize RNFL (global e por setor se houver), escavação, assimetria e observações estruturais explícitas no relatório.',
    oct_macula:
      'Priorize espessura central, fluidos intra/subretiniano, cistos, PED, membrana epirretiniana, tração vitreomacular e notas maculares.',
  };
  return g[examType];
}

export function structuredFieldsListForPrompt(examType: OftalmoExamType): string {
  const fields = STRUCTURED_FIELDS_BY_TYPE[examType];
  return fields.map((k) => `"${k}": string | number | null`).join(',\n  ');
}
