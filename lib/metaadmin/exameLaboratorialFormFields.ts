/**
 * Campos do formulário de exames laboratoriais (metaadmin desktop + mobile).
 * Deve permanecer alinhado a labOrderBySection + inputs do modal.
 * A extração por IA só preenche chaves listadas em EXAME_LABORATORIAL_ALLOWED_INTERNAL_FIELDS.
 */

/** Chaves de labRanges (todosOsCampos) → nome do campo no estado novoExameData / Firestore plano. */
export const EXAME_LABORATORIAL_KEY_TO_FIELD: Record<string, string> = {
  // Metabolismo
  fastingGlucose: 'glicemiaJejum',
  hba1c: 'hemoglobinaGlicada',
  fastingInsulin: 'insulinaJejum',
  homaIr: 'homaIr',
  leptina: 'leptina',
  adiponectina: 'adiponectina',
  // Renal / Metabólico
  urea: 'ureia',
  creatinine: 'creatinina',
  egfr: 'taxaFiltracaoGlomerular',
  uricAcid: 'acidoUrico',
  sodium: 'sodio',
  potassium: 'potassio',
  // Inflamação / Risco Cardiovascular
  pcrUltra: 'pcrUltra',
  fibrinogen: 'fibrinogenio',
  homocysteine: 'homocisteina',
  // Lipídeos
  cholTotal: 'colesterolTotal',
  hdl: 'hdl',
  ldl: 'ldl',
  vldl: 'vldl',
  tg: 'triglicerides',
  apolipoproteinA1: 'apolipoproteina1',
  apolipoproteinB: 'apolipoproteinaB',
  // Hepatobiliar
  alt: 'tgp',
  ast: 'tgo',
  ggt: 'ggt',
  alp: 'fosfataseAlcalina',
  bilirubinTotal: 'bilirrubinaTotal',
  bilirubinDirect: 'bilirrubinaDireta',
  bilirubinIndirect: 'bilirrubinaIndireta',
  totalProteins: 'proteinasTotais',
  albumin: 'albumina',
  globulins: 'globulinas',
  // Pâncreas
  amylase: 'amilase',
  lipase: 'lipase',
  // Tireoide
  tsh: 'tsh',
  ft4: 't4Livre',
  t3Livre: 't3Livre',
  antiTPO: 'antiTPO',
  antiTg: 'antiTg',
  calcitonin: 'calcitonina',
  // Hemograma
  hgb: 'hemoglobina',
  wbc: 'leucocitos',
  platelets: 'plaquetas',
  // Ferro e Vitaminas
  ferritin: 'ferritina',
  iron: 'ferroSerico',
  b12: 'vitaminaB12',
  vitaminD: 'vitaminaD',
  // Hormônios
  testosteronaTotal: 'testosteronaTotal',
  testosteronaLivre: 'testosteronaLivre',
  shbg: 'shbg',
  lh: 'lh',
  fsh: 'fsh',
  estradiol: 'estradiol',
  dheas: 'dheas',
  cortisol8h: 'cortisol8h',
  igf1: 'igf1',
  pth: 'pth',
  psa: 'psa',
  psaLivre: 'psaLivre',
  psaLivreTotalRatio: 'psaLivreTotalRelacao',
  dht: 'dht',
  prolactina: 'prolactina',
  progesterona: 'progesterona',
  oh17Progesterona: 'oh17Progesterona',
  amh: 'amh',
  cortisol16h: 'cortisol16h',
  acth: 'acth',
  // Muscular / Metabólico
  cpk: 'cpk',
  // Infecções / Triagem
  antiHcv: 'antiHcv',
  // Metais Tóxicos
  aluminumSerum: 'aluminioSerico',
  // Parasitologia
  stoolParasitologySeries: 'parasitologicoFezesSeriado',
  // Marcadores Tumorais
  cea: 'cea',
  ca125: 'ca125',
  ca199: 'ca199',
  g6pd: 'g6pd',
  vitaminC: 'vitaminaC',
};

const _allowed = new Set(Object.values(EXAME_LABORATORIAL_KEY_TO_FIELD));

export const EXAME_LABORATORIAL_ALLOWED_INTERNAL_FIELDS: readonly string[] = Object.freeze(
  Array.from(_allowed).sort()
);

export function isAllowedExameLaboratorialField(key: string): boolean {
  return _allowed.has(key);
}
