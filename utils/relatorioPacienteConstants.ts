/**
 * Constantes compartilhadas para o relatório do paciente (PDF e página /relatorio/[token]).
 */

export const LISTA_EXAMES = [
  { key: 'glicemiaJejum', label: 'Glicemia jejum', group: 'Metabolismo glicêmico' },
  { key: 'hemoglobinaGlicada', label: 'Hemoglobina glicada', group: 'Metabolismo glicêmico' },
  { key: 'insulinaJejum', label: 'Insulina jejum', group: 'Metabolismo glicêmico' },
  { key: 'homaIr', label: 'HOMA-IR', group: 'Metabolismo glicêmico' },
  { key: 'ureia', label: 'Ureia', group: 'Função renal' },
  { key: 'creatinina', label: 'Creatinina', group: 'Função renal' },
  { key: 'taxaFiltracaoGlomerular', label: 'TFG', group: 'Função renal' },
  { key: 'sodio', label: 'Sódio', group: 'Função renal' },
  { key: 'potassio', label: 'Potássio', group: 'Função renal' },
  { key: 'tgo', label: 'TGO', group: 'Função hepática' },
  { key: 'tgp', label: 'TGP', group: 'Função hepática' },
  { key: 'ggt', label: 'GGT', group: 'Função hepática' },
  { key: 'fosfataseAlcalina', label: 'Fosfatase alcalina', group: 'Função hepática' },
  { key: 'amilase', label: 'Amilase', group: 'Pâncreas' },
  { key: 'lipase', label: 'Lipase', group: 'Pâncreas' },
  { key: 'colesterolTotal', label: 'Colesterol total', group: 'Lipídios' },
  { key: 'hdl', label: 'HDL', group: 'Lipídios' },
  { key: 'ldl', label: 'LDL', group: 'Lipídios' },
  { key: 'triglicerides', label: 'Triglicerídeos', group: 'Lipídios' },
  { key: 'tsh', label: 'TSH', group: 'Tireoide' },
  { key: 't4Livre', label: 'T4 livre', group: 'Tireoide' },
  { key: 't3Livre', label: 'T3 livre', group: 'Tireoide' },
  { key: 'antiTPO', label: 'Anti-TPO', group: 'Tireoide' },
  { key: 'antiTg', label: 'Anti-Tg', group: 'Tireoide' },
  { key: 'calcitonina', label: 'Calcitonina', group: 'Tireoide' },
  { key: 'ferritina', label: 'Ferritina', group: 'Vitaminas / ferro' },
  { key: 'ferroSerico', label: 'Ferro sérico', group: 'Vitaminas / ferro' },
  { key: 'vitaminaB12', label: 'Vitamina B12', group: 'Vitaminas / ferro' },
  { key: 'vitaminaD', label: 'Vitamina D', group: 'Vitaminas / ferro' },
  { key: 'albumina', label: 'Albumina', group: 'Estado nutricional' },
  { key: 'testosteronaTotal', label: 'Testosterona total', group: 'Hormônios' },
  { key: 'testosteronaLivre', label: 'Testosterona livre', group: 'Hormônios' },
  { key: 'shbg', label: 'SHBG', group: 'Hormônios' },
  { key: 'lh', label: 'LH', group: 'Hormônios' },
  { key: 'fsh', label: 'FSH', group: 'Hormônios' },
  { key: 'estradiol', label: 'Estradiol', group: 'Hormônios' },
  { key: 'dht', label: 'DHT', group: 'Hormônios' },
  { key: 'dheas', label: 'DHEA-S', group: 'Hormônios' },
  { key: 'prolactina', label: 'Prolactina', group: 'Hormônios' },
  { key: 'psa', label: 'PSA', group: 'Hormônios' },
  { key: 'progesterona', label: 'Progesterona', group: 'Hormônios' },
  { key: 'oh17Progesterona', label: '17-OH progesterona', group: 'Hormônios' },
  { key: 'amh', label: 'AMH', group: 'Hormônios' },
  { key: 'cortisol8h', label: 'Cortisol 8h', group: 'Adrenal / estresse' },
  { key: 'cortisol16h', label: 'Cortisol 16h', group: 'Adrenal / estresse' },
  { key: 'acth', label: 'ACTH', group: 'Adrenal / estresse' },
  { key: 'leptina', label: 'Leptina', group: 'Metabolismo hormonal' },
  { key: 'adiponectina', label: 'Adiponectina', group: 'Metabolismo hormonal' },
  { key: 'igf1', label: 'IGF-1', group: 'Metabolismo hormonal' },
  { key: 'pcrUltra', label: 'PCR ultrassensível', group: 'Inflamação' },
  { key: 'hemogramaCompleto', label: 'Hemograma completo', group: 'Hemograma' }
] as const;

export const EXAME_KEY_TO_LAB: Record<string, string> = {
  glicemiaJejum: 'fastingGlucose', hemoglobinaGlicada: 'hba1c', insulinaJejum: 'fastingInsulin',
  ureia: 'urea', creatinina: 'creatinine', taxaFiltracaoGlomerular: 'egfr', sodio: 'sodium', potassio: 'potassium',
  tgo: 'ast', tgp: 'alt', ggt: 'ggt', fosfataseAlcalina: 'alp', amilase: 'amylase', lipase: 'lipase',
  colesterolTotal: 'cholTotal', hdl: 'hdl', ldl: 'ldl', triglicerides: 'tg',
  tsh: 'tsh', t4Livre: 'ft4', calcitonina: 'calcitonin', ferritina: 'ferritin', ferroSerico: 'iron',
  vitaminaB12: 'b12', vitaminaD: 'vitaminD', albumina: 'albumin', t3Livre: 't3Livre', antiTPO: 'antiTPO', antiTg: 'antiTg',
  testosteronaTotal: 'testosteronaTotal', testosteronaLivre: 'testosteronaLivre', shbg: 'shbg', lh: 'lh', fsh: 'fsh',
  estradiol: 'estradiol', prolactina: 'prolactina', psa: 'psa', cortisol8h: 'cortisol8h', cortisol16h: 'cortisol16h',
  homaIr: 'homaIr', pcrUltra: 'pcrUltra'
};

export const GROUP_ORDER = [
  'Metabolismo glicêmico', 'Função renal', 'Função hepática', 'Pâncreas', 'Lipídios', 'Tireoide',
  'Vitaminas / ferro', 'Estado nutricional', 'Hormônios', 'Metabolismo hormonal', 'Adrenal / estresse', 'Inflamação',
  'Hemograma', 'Outros'
];
