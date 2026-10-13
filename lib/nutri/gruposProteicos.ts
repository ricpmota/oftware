/**
 * Grupos proteicos do paciente — normalização, mapa de IDs e restrições.
 * Semântica da anamnese: "Preferências de proteína (selecione todas que você consome)"
 * → universo preferencial permitido da geração automática (não mera preferência fraca).
 */

export type GrupoProteinaPaciente =
  | 'frango'
  | 'peixe'
  | 'carne'
  | 'ovos'
  | 'laticinios'
  | 'whey'
  | 'tofu'
  | 'leguminosas'
  | 'proteina_vegetal'
  | 'peru';

/** Opções exibidas no wizard (passo 9). */
export const OPCOES_UI_PREFERENCIAS_PROTEINA = [
  'Carne',
  'Frango',
  'Peixe',
  'Ovos',
  'Laticínios',
  'Leguminosas',
] as const;

export type AlertaGrupoProteico =
  | 'PREFERENCIA_PROTEICA_DESCONHECIDA'
  | 'PREFERENCIAS_PROTEICAS_AUSENTES';

const MAPA_LABEL_UI: Record<string, GrupoProteinaPaciente> = {
  carne: 'carne',
  frango: 'frango',
  peixe: 'peixe',
  ovos: 'ovos',
  ovo: 'ovos',
  laticinios: 'laticinios',
  laticínios: 'laticinios',
  lacteos: 'laticinios',
  leguminosas: 'leguminosas',
  leguminosa: 'leguminosas',
  // aliases internos / legado
  whey: 'whey',
  tofu: 'tofu',
  proteina_vegetal: 'proteina_vegetal',
  'proteina vegetal': 'proteina_vegetal',
  peru: 'peru',
};

function stripAcentos(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

export function normalizarLabelPreferenciaProteina(
  valor: string
): GrupoProteinaPaciente | null {
  const key = stripAcentos(valor.trim().toLowerCase());
  return MAPA_LABEL_UI[key] ?? null;
}

export function normalizarPreferenciasProteina(valores: string[]): {
  grupos: GrupoProteinaPaciente[];
  desconhecidos: string[];
  alertas: AlertaGrupoProteico[];
} {
  const grupos: GrupoProteinaPaciente[] = [];
  const desconhecidos: string[] = [];
  const alertas: AlertaGrupoProteico[] = [];
  for (const v of valores || []) {
    const g = normalizarLabelPreferenciaProteina(v);
    if (!g) {
      desconhecidos.push(v);
      continue;
    }
    if (!grupos.includes(g)) grupos.push(g);
  }
  if (desconhecidos.length > 0) {
    alertas.push('PREFERENCIA_PROTEICA_DESCONHECIDA');
  }
  if (grupos.length === 0) {
    alertas.push('PREFERENCIAS_PROTEICAS_AUSENTES');
  }
  return { grupos, desconhecidos, alertas };
}

/** Mapa centralizado ID → grupo (sem parse de nome). */
export const GRUPO_PROTEICO_POR_ITEM_ID: Record<string, GrupoProteinaPaciente> = {
  prot_frango_100g: 'frango',
  prot_frango_120g: 'frango',
  prot_frango_150g: 'frango',
  prot_peixe_100g: 'peixe',
  prot_peixe_150g: 'peixe',
  prot_carne_magra_100g: 'carne',
  prot_ovos_1un: 'ovos',
  prot_ovos_2un: 'ovos',
  prot_ovos_3un: 'ovos',
  prot_claras_2un: 'ovos',
  prot_claras_4un: 'ovos',
  prot_iogurte_proteico: 'laticinios',
  prot_iogurte_sem_lactose: 'laticinios',
  prot_queijo_cottage: 'laticinios',
  prot_whey_1dose: 'whey',
  prot_whey_isolado_sl: 'whey',
  prot_tofu_100g: 'tofu',
  prot_tofu_150g: 'tofu',
  prot_tofu_200g: 'tofu',
  prot_feijao_1concha: 'leguminosas',
  prot_lentilha_1concha: 'leguminosas',
  prot_grao_bico_1concha: 'leguminosas',
  prot_proteina_vegetal: 'proteina_vegetal',
  prot_peito_peru: 'peru',
};

export function grupoProteicoDeItemId(itemId: string): GrupoProteinaPaciente | null {
  return GRUPO_PROTEICO_POR_ITEM_ID[itemId] ?? null;
}

export function grupoProteicoPermitidoPorRestricoes(
  grupo: GrupoProteinaPaciente,
  restricoes: string[]
): boolean {
  const r = (restricoes || []).map((x) => stripAcentos(x.trim().toLowerCase()));
  const tem = (s: string) => r.some((x) => x.includes(s));
  const vegano = tem('vegano');
  const vegetariano = tem('vegetariano') && !vegano;
  const lactose = tem('lactose');

  if (vegano) {
    return (
      grupo === 'tofu' ||
      grupo === 'leguminosas' ||
      grupo === 'proteina_vegetal'
    );
  }
  if (vegetariano) {
    if (grupo === 'frango' || grupo === 'peixe' || grupo === 'carne' || grupo === 'peru') {
      return false;
    }
  }
  if (lactose) {
    // Intolerância ≠ alergia: não exclui ovos/carnes/tofu.
    // Laticínios comuns ficam a cargo do filtro de atributos do catálogo
    // (iogurte SL / whey isolado permanecem disponíveis).
  }
  return true;
}

export function filtrarGruposPorRestricoes(
  grupos: GrupoProteinaPaciente[],
  restricoes: string[]
): GrupoProteinaPaciente[] {
  return grupos.filter((g) => grupoProteicoPermitidoPorRestricoes(g, restricoes));
}

/** Ordem padrão quando preferências ausentes. */
export const GRUPOS_PADRAO_SEM_PREFERENCIA: GrupoProteinaPaciente[] = [
  'frango',
  'peixe',
  'carne',
  'ovos',
  'laticinios',
  'whey',
  'tofu',
  'leguminosas',
];

export function rotuloGrupoProteina(grupo: GrupoProteinaPaciente): string {
  const mapa: Record<GrupoProteinaPaciente, string> = {
    frango: 'Frango',
    peixe: 'Peixe',
    carne: 'Carne',
    ovos: 'Ovos',
    laticinios: 'Laticínios',
    whey: 'Whey',
    tofu: 'Tofu',
    leguminosas: 'Leguminosas',
    proteina_vegetal: 'Proteína vegetal',
    peru: 'Peito de peru',
  };
  return mapa[grupo];
}
