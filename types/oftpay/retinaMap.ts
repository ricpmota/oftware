/**
 * Tipos do Retina Map Editor — Laudo Guiado OftPay (Mapeamento de Retina).
 */

export type EyeSide = 'OD' | 'OE';

export type RetinaFindingType =
  | 'drusa'
  | 'hemorragia'
  | 'exsudato'
  | 'microaneurisma'
  | 'lattice'
  | 'rotura'
  | 'buraco'
  | 'cicatriz'
  | 'atrofia_epr'
  | 'descolamento_retina'
  | 'nevo'
  | 'membrana_epirretiniana'
  | 'edema_macular'
  | 'papiledema'
  | 'outros';

export type RetinaRegion =
  | 'macula'
  | 'disco'
  | 'polo_posterior'
  | 'periferia';

export type RetinaQuadrant =
  | 'superior'
  | 'inferior'
  | 'nasal'
  | 'temporal'
  | 'temporal_superior'
  | 'temporal_inferior'
  | 'nasal_superior'
  | 'nasal_inferior';

export type RetinaFindingSeverity = 'leve' | 'moderado' | 'intenso';

export type RetinaFindingQuantity = 'poucas' | 'moderadas' | 'numerosas';

/** Opacidade dos meios ópticos / vítreo — primeiro passo do laudo. */
export type RetinaMeiosOpticos =
  | 'transparentes'
  | 'opacidades_leves'
  | 'opacidades_moderadas'
  | 'opacidades_densas'
  | 'hemorragia_vitrea_leve'
  | 'hemorragia_vitrea_moderada'
  | 'hemorragia_vitrea_densa'
  | 'catarata_incipiente'
  | 'catarata_moderada'
  | 'catarata_densa';

export const RETINA_MEIOS_OPTICOS_OPTIONS: RetinaMeiosOpticos[] = [
  'transparentes',
  'opacidades_leves',
  'opacidades_moderadas',
  'opacidades_densas',
  'hemorragia_vitrea_leve',
  'hemorragia_vitrea_moderada',
  'hemorragia_vitrea_densa',
  'catarata_incipiente',
  'catarata_moderada',
  'catarata_densa',
];

export const RETINA_MEIOS_OPTICOS_LABELS: Record<RetinaMeiosOpticos, string> = {
  transparentes: 'Transparentes',
  opacidades_leves: 'Opacidades leves',
  opacidades_moderadas: 'Opacidades moderadas',
  opacidades_densas: 'Opacidades densas',
  hemorragia_vitrea_leve: 'Hemorragia vítrea leve',
  hemorragia_vitrea_moderada: 'Hemorragia vítrea moderada',
  hemorragia_vitrea_densa: 'Hemorragia vítrea densa',
  catarata_incipiente: 'Catarata incipiente',
  catarata_moderada: 'Catarata moderada',
  catarata_densa: 'Catarata densa',
};

export interface RetinaMeiosOpticosByEye {
  OD: RetinaMeiosOpticos | null;
  OE: RetinaMeiosOpticos | null;
}

/** Etapas do fluxo guiado de mapeamento de retina. */
export type RetinaSection =
  | 'vitreo'
  | 'disco'
  | 'macula'
  | 'vasos'
  | 'periferia'
  | 'achados_especificos'
  | 'conclusao'
  | 'conduta';

export const RETINA_SECTION_ORDER: RetinaSection[] = [
  'vitreo',
  'disco',
  'macula',
  'vasos',
  'periferia',
  'achados_especificos',
  'conclusao',
  'conduta',
];

export const RETINA_SECTION_LABELS: Record<RetinaSection, string> = {
  vitreo: 'Vítreo',
  disco: 'Disco óptico',
  macula: 'Mácula',
  vasos: 'Vasos',
  periferia: 'Periferia',
  achados_especificos: 'Achados específicos',
  conclusao: 'Conclusão',
  conduta: 'Conduta',
};

/** Seções em que o mapa aceita marcação de achados localizados. */
export const RETINA_MAP_SECTIONS: RetinaSection[] = [
  'vitreo',
  'disco',
  'macula',
  'vasos',
  'periferia',
  'achados_especificos',
];

// —— Achados estruturados por seção ——

export type RetinaHemorragiaVitreaGrau = 'leve' | 'moderada' | 'intensa';

export interface RetinaVitreoFindings {
  transparente?: boolean;
  sinereze?: boolean;
  dpv_parcial?: boolean;
  dpv_completo?: boolean;
  hemorragia_vitrea?: RetinaHemorragiaVitreaGrau | null;
  opacidades_vitreas?: boolean;
  outros?: string;
}

export interface RetinaDiscoFindings {
  corado_rosado?: boolean;
  palido?: boolean;
  contornos_nitidos?: boolean;
  contornos_borrados?: boolean;
  cd_fisiologica?: boolean;
  cd_aumentada?: boolean;
  /** 0.1 a 0.9 */
  cd_valor?: number | null;
  atrofia_peripapilar?: boolean;
  crescente_escleral?: boolean;
  outros?: string;
}

export interface RetinaMaculaFindings {
  reflexo_foveal_presente?: boolean;
  contornos_preservados?: boolean;
  alteracoes_pigmentares?: boolean;
  atrofia?: boolean;
  drusas?: boolean;
  edema_intrarretiniano?: boolean;
  liquido_sub_retiniano?: boolean;
  hemorragias?: boolean;
  exsudatos_duros?: boolean;
  membrana_epirretiniana?: boolean;
  outros?: string;
}

export interface RetinaVasosFindings {
  relacao_av_preservada?: boolean;
  calibre_arterial_preservado?: boolean;
  calibre_venoso_preservado?: boolean;
  cruzamentos_av_ausentes?: boolean;
  cruzamentos_av_presentes?: boolean;
  esclerose_arteriolar?: boolean;
  estreitamento_arteriolar?: boolean;
  tortuosidade_arteriolar?: boolean;
  hemorragias?: boolean;
  exsudatos?: boolean;
  neovascularizacao?: boolean;
  outros?: string;
}

export interface RetinaPeriferiaFindings {
  retina_aplicada_360?: boolean;
  degeneracoes_perifericas?: boolean;
  lattice?: boolean;
  buracos_roturas?: boolean;
  descolamento_retina?: boolean;
  degeneracao_vitreorretiniana?: boolean;
  atrofia_periferica?: boolean;
  outros?: string;
}

export type RetinaRetinopatiaDiabetica =
  | 'ausente'
  | 'rdnp_leve'
  | 'rdnp_moderada'
  | 'rdnp_grave'
  | 'rdp';

export type RetinaDmri =
  | 'ausente'
  | 'seca_inicial'
  | 'seca_intermediaria'
  | 'seca_avancada'
  | 'exsudativa';

export interface RetinaAchadosEspecificosFindings {
  retinopatia_diabetica?: RetinaRetinopatiaDiabetica | null;
  dmri?: RetinaDmri | null;
  outros?: string;
}

export interface RetinaConclusaoFindings {
  sem_alteracoes?: boolean;
  alteracoes_conforme_descricao?: boolean;
  comentarios?: string;
}

export interface RetinaCondutaFindings {
  acompanhamento_clinico?: boolean;
  exames_complementares?: string;
  retorno_em?: string;
  tratamento_indicado?: string;
  encaminhamento?: string;
  outras_recomendacoes?: string;
}

export interface RetinaStructuredFindings {
  vitreo: RetinaVitreoFindings;
  disco: RetinaDiscoFindings;
  macula: RetinaMaculaFindings;
  vasos: RetinaVasosFindings;
  periferia: RetinaPeriferiaFindings;
  achados_especificos: RetinaAchadosEspecificosFindings;
  conclusao: RetinaConclusaoFindings;
  conduta: RetinaCondutaFindings;
}

export type RetinaStructuredFindingsByEye = Record<EyeSide, RetinaStructuredFindings>;

export const RETINA_HEMORRAGIA_VITREA_LABELS: Record<RetinaHemorragiaVitreaGrau, string> = {
  leve: 'leve',
  moderada: 'moderada',
  intensa: 'intensa',
};

export const RETINA_RD_LABELS: Record<RetinaRetinopatiaDiabetica, string> = {
  ausente: 'Ausente',
  rdnp_leve: 'RDNP leve',
  rdnp_moderada: 'RDNP moderada',
  rdnp_grave: 'RDNP grave',
  rdp: 'RDP',
};

export const RETINA_DMRI_LABELS: Record<RetinaDmri, string> = {
  ausente: 'Ausente',
  seca_inicial: 'DMRI seca inicial',
  seca_intermediaria: 'DMRI seca intermediária',
  seca_avancada: 'DMRI seca avançada',
  exsudativa: 'DMRI exsudativa',
};

export interface RetinaFinding {
  id: string;
  eye: EyeSide;
  /** Etapa ativa no momento da marcação no mapa. */
  section: RetinaSection;
  type: RetinaFindingType;
  /** Posição normalizada 0–1 no eixo X do SVG. */
  x: number;
  /** Posição normalizada 0–1 no eixo Y do SVG. */
  y: number;
  region: RetinaRegion;
  quadrant: RetinaQuadrant;
  clockHour?: number;
  severity?: RetinaFindingSeverity;
  quantity?: RetinaFindingQuantity;
  size?: string;
  notes?: string;
  /** Vínculo com checkbox estruturado (ex.: macula.drusas). */
  structuredKey?: string;
  createdAt: string;
}

export interface RetinaMapClickPayload {
  x: number;
  y: number;
  region: RetinaRegion;
  quadrant: RetinaQuadrant;
  clockHour?: number;
}

export const RETINA_FINDING_TYPE_LABELS: Record<RetinaFindingType, string> = {
  drusa: 'Drusa',
  hemorragia: 'Hemorragia',
  exsudato: 'Exsudato',
  microaneurisma: 'Microaneurisma',
  lattice: 'Degeneração lattice',
  rotura: 'Rotura retiniana',
  buraco: 'Buraco atrófico',
  cicatriz: 'Cicatriz',
  atrofia_epr: 'Atrofia do EPR',
  descolamento_retina: 'Descolamento de retina',
  nevo: 'Nevo',
  membrana_epirretiniana: 'Membrana epirretiniana',
  edema_macular: 'Edema macular',
  papiledema: 'Papiledema',
  outros: 'Outros',
};

export const RETINA_REGION_LABELS: Record<RetinaRegion, string> = {
  macula: 'mácula',
  disco: 'disco óptico',
  polo_posterior: 'polo posterior',
  periferia: 'periferia',
};

export const RETINA_QUADRANT_LABELS: Record<RetinaQuadrant, string> = {
  superior: 'superior',
  inferior: 'inferior',
  nasal: 'nasal',
  temporal: 'temporal',
  temporal_superior: 'temporal superior',
  temporal_inferior: 'temporal inferior',
  nasal_superior: 'nasal superior',
  nasal_inferior: 'nasal inferior',
};

export const RETINA_SEVERITY_LABELS: Record<RetinaFindingSeverity, string> = {
  leve: 'leve',
  moderado: 'moderado',
  intenso: 'intenso',
};

export const RETINA_QUANTITY_LABELS: Record<RetinaFindingQuantity, string> = {
  poucas: 'poucas',
  moderadas: 'moderadas',
  numerosas: 'numerosas',
};

export const ALL_RETINA_FINDING_TYPES = Object.keys(
  RETINA_FINDING_TYPE_LABELS
) as RetinaFindingType[];

export const SECTION_SUGGESTED_FINDING_TYPES: Record<RetinaSection, RetinaFindingType[]> = {
  vitreo: ['hemorragia', 'outros'],
  disco: ['papiledema', 'atrofia_epr', 'outros'],
  macula: ['drusa', 'edema_macular', 'hemorragia', 'exsudato', 'membrana_epirretiniana', 'outros'],
  vasos: ['hemorragia', 'exsudato', 'microaneurisma', 'outros'],
  periferia: ['lattice', 'rotura', 'buraco', 'descolamento_retina', 'atrofia_epr', 'outros'],
  achados_especificos: ALL_RETINA_FINDING_TYPES,
  conclusao: [],
  conduta: [],
};
