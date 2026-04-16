/**
 * Campos do formulário de exames laboratoriais (metaadmin desktop + mobile).
 * Deve permanecer alinhado a labOrderBySection + inputs do modal.
 * A extração por IA só preenche chaves listadas em EXAME_LABORATORIAL_ALLOWED_INTERNAL_FIELDS.
 */

/** Chaves de labRanges (todosOsCampos) → nome do campo no estado novoExameData / Firestore plano. */
export const EXAME_LABORATORIAL_KEY_TO_FIELD: Record<string, string> = {
  fastingGlucose: 'glicemiaJejum',
  hba1c: 'hemoglobinaGlicada',
  fastingInsulin: 'insulinaJejum',
  urea: 'ureia',
  creatinine: 'creatinina',
  egfr: 'taxaFiltracaoGlomerular',
  sodium: 'sodio',
  potassium: 'potassio',
  alt: 'tgp',
  ast: 'tgo',
  ggt: 'ggt',
  alp: 'fosfataseAlcalina',
  amylase: 'amilase',
  lipase: 'lipase',
  cholTotal: 'colesterolTotal',
  ldl: 'ldl',
  hdl: 'hdl',
  tg: 'triglicerides',
  tsh: 'tsh',
  calcitonin: 'calcitonina',
  ft4: 't4Livre',
  t3Livre: 't3Livre',
  antiTPO: 'antiTPO',
  antiTg: 'antiTg',
  hgb: 'hemoglobina',
  wbc: 'leucocitos',
  platelets: 'plaquetas',
  ferritin: 'ferritina',
  iron: 'ferroSerico',
  b12: 'vitaminaB12',
  vitaminD: 'vitaminaD',
  albumin: 'albumina',
  testosteronaTotal: 'testosteronaTotal',
  testosteronaLivre: 'testosteronaLivre',
  shbg: 'shbg',
  lh: 'lh',
  fsh: 'fsh',
  estradiol: 'estradiol',
  dht: 'dht',
  dheas: 'dheas',
  prolactina: 'prolactina',
  psa: 'psa',
  progesterona: 'progesterona',
  oh17Progesterona: 'oh17Progesterona',
  amh: 'amh',
  cortisol8h: 'cortisol8h',
  cortisol16h: 'cortisol16h',
  acth: 'acth',
  homaIr: 'homaIr',
  leptina: 'leptina',
  adiponectina: 'adiponectina',
  igf1: 'igf1',
  pcrUltra: 'pcrUltra',
};

const _allowed = new Set(Object.values(EXAME_LABORATORIAL_KEY_TO_FIELD));

export const EXAME_LABORATORIAL_ALLOWED_INTERNAL_FIELDS: readonly string[] = Object.freeze(
  Array.from(_allowed).sort()
);

export function isAllowedExameLaboratorialField(key: string): boolean {
  return _allowed.has(key);
}
