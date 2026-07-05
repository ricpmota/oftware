/**
 * Faixas de referência para exames laboratoriais
 * Baseado em diretrizes clínicas padronizadas
 * Suporta faixas específicas por sexo quando aplicável
 */

export type Sex = 'M' | 'F';

export interface LabRange {
  label: string;
  unit: string;
  min: number;
  max: number;
}

export type LabTargetQuartile = 'LOW' | 'HIGH' | 'MID' | 'NONE';

export interface LabIdealRange {
  min?: number;
  max?: number;
  targetQuartile?: LabTargetQuartile;
  rationale?: string;
}

export type LabScoreGroup =
  | 'glicidico'
  | 'resistenciaInsulinica'
  | 'inflamatorio'
  | 'cardiovascular'
  | 'hepatometabolico'
  | 'tireoidiano'
  | 'nutricional'
  | 'adrenal'
  | 'performance'
  | 'hormonal'
  | 'complementar';

export interface LabExamMeta {
  ideal?: LabIdealRange;
  qualitative?: boolean;
  optional?: boolean;
  scoreGroup?: LabScoreGroup;
  scoreEligible?: boolean;
}

type SexedRange = { M: LabRange; F: LabRange };

type RangeEntry = LabRange | SexedRange;

export const labRanges: Record<string, RangeEntry> = {
  // Metabolismo glicídico
  fastingGlucose: { label: 'Glicemia de jejum', unit: 'mg/dL', min: 70, max: 99 },
  hba1c:          { label: 'Hemoglobina glicada (HbA1c)', unit: '%', min: 4.0, max: 5.6 },

  // Função renal
  urea:           { label: 'Ureia', unit: 'mg/dL', min: 15, max: 40 },
  creatinine: {
    M: { label: 'Creatinina (M)', unit: 'mg/dL', min: 0.74, max: 1.35 },
    F: { label: 'Creatinina (F)', unit: 'mg/dL', min: 0.59, max: 1.04 }
  },
  egfr:           { label: 'eGFR (CKD-EPI 2021)', unit: 'mL/min/1,73m²', min: 90, max: 120 },

  // Função hepática e biliar
  alt: {
    M: { label: 'ALT/TGP (M)', unit: 'U/L', min: 7, max: 41 },
    F: { label: 'ALT/TGP (F)', unit: 'U/L', min: 7, max: 33 }
  },
  ast: {
    M: { label: 'AST/TGO (M)', unit: 'U/L', min: 7, max: 40 },
    F: { label: 'AST/TGO (F)', unit: 'U/L', min: 7, max: 32 }
  },
  ggt: {
    M: { label: 'GGT (M)', unit: 'U/L', min: 8, max: 61 },
    F: { label: 'GGT (F)', unit: 'U/L', min: 5, max: 36 }
  },
  alp:            { label: 'Fosfatase alcalina', unit: 'U/L', min: 44, max: 147 },

  // Pâncreas
  amylase:        { label: 'Amilase', unit: 'U/L', min: 30, max: 110 },
  lipase:         { label: 'Lipase', unit: 'U/L', min: 13, max: 60 },

  // Lipídeos
  cholTotal:      { label: 'Colesterol total', unit: 'mg/dL', min: 125, max: 199 },
  ldl:            { label: 'LDL-c', unit: 'mg/dL', min: 60, max: 99 },
  hdl: {
    M: { label: 'HDL-c (M)', unit: 'mg/dL', min: 40, max: 90 },
    F: { label: 'HDL-c (F)', unit: 'mg/dL', min: 50, max: 90 }
  },
  tg:             { label: 'Triglicerídeos', unit: 'mg/dL', min: 40, max: 149 },

  // Tireóide / MEN2
  tsh:            { label: 'TSH', unit: 'mIU/L', min: 0.4, max: 4.0 },
  calcitonin: {
    M: { label: 'Calcitonina (M)', unit: 'pg/mL', min: 0, max: 10 },
    F: { label: 'Calcitonina (F)', unit: 'pg/mL', min: 0, max: 5 }
  },

  // Hemograma (opcional no gráfico do MVP)
  hgb: {
    M: { label: 'Hemoglobina (M)', unit: 'g/dL', min: 13.5, max: 17.5 },
    F: { label: 'Hemoglobina (F)', unit: 'g/dL', min: 12.0, max: 15.5 }
  },
  wbc:            { label: 'Leucócitos', unit: '×10³/µL', min: 4.0, max: 11.0 },
  platelets:      { label: 'Plaquetas', unit: '×10³/µL', min: 150, max: 450 },

  // Ferro e Vitaminas
  ferritin: {
    M: { label: 'Ferritina (M)', unit: 'ng/mL', min: 30, max: 400 },
    F: { label: 'Ferritina (F)', unit: 'ng/mL', min: 13, max: 150 }
  },
  iron: {
    M: { label: 'Ferro sérico (M)', unit: 'µg/dL', min: 65, max: 175 },
    F: { label: 'Ferro sérico (F)', unit: 'µg/dL', min: 50, max: 170 }
  },
  ft4:            { label: 'T4 Livre (FT4)', unit: 'ng/dL', min: 0.8, max: 1.8 },
  b12:            { label: 'Vitamina B12', unit: 'pg/mL', min: 200, max: 900 },
  vitaminD:       { label: 'Vitamina D (25-OH)', unit: 'ng/mL', min: 30, max: 60 },

  // Metabolismo (adicionados)
  homaIr:         { label: 'HOMA-IR', unit: '', min: 0, max: 2.5 },

  // Renal/Metabólico
  uricAcid: {
    M: { label: 'Ácido úrico (M)', unit: 'mg/dL', min: 3.4, max: 7.0 },
    F: { label: 'Ácido úrico (F)', unit: 'mg/dL', min: 2.4, max: 5.7 }
  },

  // Inflamação / Risco Cardiovascular
  fibrinogen:     { label: 'Fibrinogênio', unit: 'mg/dL', min: 200, max: 400 },
  homocysteine:   { label: 'Homocisteína', unit: 'µmol/L', min: 5, max: 15 },

  // Lipídeos
  vldl:           { label: 'VLDL-c', unit: 'mg/dL', min: 2, max: 30 },
  apolipoproteinA1: {
    M: { label: 'Apolipoproteína A1 (M)', unit: 'mg/dL', min: 104, max: 202 },
    F: { label: 'Apolipoproteína A1 (F)', unit: 'mg/dL', min: 108, max: 225 }
  },
  apolipoproteinB: { label: 'Apolipoproteína B', unit: 'mg/dL', min: 55, max: 130 },

  // Hepatobiliar (adicionados)
  bilirubinTotal: { label: 'Bilirrubina total', unit: 'mg/dL', min: 0.1, max: 1.2 },
  bilirubinDirect: { label: 'Bilirrubina direta', unit: 'mg/dL', min: 0.0, max: 0.3 },
  bilirubinIndirect: { label: 'Bilirrubina indireta', unit: 'mg/dL', min: 0.1, max: 0.9 },
  totalProteins:  { label: 'Proteínas totais', unit: 'g/dL', min: 6.0, max: 8.3 },
  albumin:        { label: 'Albumina', unit: 'g/dL', min: 3.5, max: 5.0 },
  globulins:      { label: 'Globulinas', unit: 'g/dL', min: 2.0, max: 3.5 },

  // Hormônios (adicionados)
  pth:            { label: 'PTH (Paratormônio)', unit: 'pg/mL', min: 15, max: 65 },

  // Muscular/Metabólico
  cpk: {
    M: { label: 'CPK (M)', unit: 'U/L', min: 39, max: 308 },
    F: { label: 'CPK (F)', unit: 'U/L', min: 26, max: 192 }
  },

  // Infecções/Triagem
  antiHcv:        { label: 'Anti-HCV', unit: '', min: 0, max: 1 },

  // Metais Tóxicos
  aluminumSerum:  { label: 'Alumínio sérico', unit: 'µg/L', min: 0, max: 10 },

  // Marcadores Tumorais
  cea:            { label: 'CEA', unit: 'ng/mL', min: 0, max: 5 },
  ca125:          { label: 'CA-125', unit: 'U/mL', min: 0, max: 35 },
  ca199:          { label: 'CA 19-9', unit: 'U/mL', min: 0, max: 37 },
  g6pd:           { label: 'G6PD', unit: 'U/g Hb', min: 4.6, max: 13.5 },
  vitaminC:       { label: 'Vitamina C', unit: 'mg/dL', min: 0.4, max: 2.0 },
};

/**
 * Utilitário: resolve o range correto (considera sexo quando houver)
 */
export function getLabRange(key: keyof typeof labRanges, sex?: Sex): LabRange | null {
  const entry = labRanges[key];
  
  if (!entry) return null;
  
  if ('min' in entry) return entry as LabRange;
  
  if (!sex) return null;
  
  return (entry as SexedRange)[sex] ?? null;
}

/**
 * Utilitário: testa se o valor está dentro do intervalo
 */
export function isInRange(value: number | null | undefined, range: LabRange | null): boolean | null {
  if (value == null || range == null) return null;
  return value >= range.min && value <= range.max;
}

/**
 * Exemplo de mapeamento para labels amigáveis no form (opcional)
 */
/** Chaves alinhadas a `data/limites_exames_atual_v2_idade.json` (via `getLabRange` em labRangesFromJson). */
export const labOrderBySection: Record<string, string[]> = {
  metabolismoBasico: ['fastingGlucose', 'hba1c'],
  metabolismoAvancado: ['fastingInsulin', 'homaIr', 'leptina', 'adiponectina'],
  renalMetabolico: ['urea', 'creatinine', 'egfr', 'uricAcid', 'sodium', 'potassium'],
  inflamacaoRiscoCardio: ['pcrUltra', 'fibrinogen', 'homocysteine', 'apolipoproteinB'],
  lipideos: ['cholTotal', 'hdl', 'ldl', 'vldl', 'tg', 'apolipoproteinA1'],
  hepatobiliar: ['alt', 'ast', 'ggt', 'alp', 'bilirubinTotal', 'bilirubinDirect', 'bilirubinIndirect'],
  gastroPancreatico: ['amylase', 'lipase'],
  tireoide: ['tsh', 'ft4', 't3Livre', 'antiTPO', 'antiTg', 'calcitonin'],
  hormoniosSexuais: [
    'testosteronaTotal', 'testosteronaLivre', 'shbg',
    'lh', 'fsh', 'estradiol',
    'psa', 'psaLivre', 'psaLivreTotalRatio',
    'dht', 'prolactina', 'progesterona', 'oh17Progesterona', 'amh',
  ],
  eixoAdrenalEstresse: ['cortisol8h', 'cortisol16h', 'acth', 'dheas'],
  performanceRecuperacao: ['igf1', 'cpk', 'pth'],
  estadoNutricionalInflamatorio: ['totalProteins', 'albumin', 'globulins', 'ferritin', 'iron', 'b12', 'vitaminD'],
  hemograma: ['hgb', 'wbc', 'platelets'],
  infeccoesTriagem: ['antiHcv'],
  metaisToxicos: ['aluminumSerum'],
  parasitologia: ['stoolParasitologySeries'],
  marcadoresTumorais: ['cea', 'ca125', 'ca199'],
  estresseOxidativo: ['g6pd', 'vitaminC'],
};

