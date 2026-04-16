/**
 * Faixas amplas só para barrar erros grosseiros da IA (alucinação numérica / coluna trocada).
 * Valores fora da faixa são removidos de camposMapeados e viram aviso — o médico ainda pode digitar manualmente.
 */

type Range = { min: number; max: number };

/** Limites relaxados (unidades típicas de laudos BR / sistema atual). */
const LAB_PLAUSIBLE: Partial<Record<string, Range>> = {
  hemoglobinaGlicada: { min: 2.5, max: 22 },
  glicemiaJejum: { min: 20, max: 800 },
  insulinaJejum: { min: 0.2, max: 350 },
  ureia: { min: 3, max: 600 },
  creatinina: { min: 0.1, max: 35 },
  taxaFiltracaoGlomerular: { min: 3, max: 200 },
  sodio: { min: 110, max: 190 },
  potassio: { min: 1.5, max: 9 },
  tgo: { min: 1, max: 20000 },
  tgp: { min: 1, max: 20000 },
  ggt: { min: 1, max: 20000 },
  fosfataseAlcalina: { min: 1, max: 20000 },
  amilase: { min: 5, max: 5000 },
  lipase: { min: 5, max: 50000 },
  colesterolTotal: { min: 40, max: 600 },
  hdl: { min: 5, max: 200 },
  ldl: { min: 5, max: 500 },
  triglicerides: { min: 15, max: 8000 },
  tsh: { min: 0.001, max: 150 },
  t4Livre: { min: 0.05, max: 80 },
  t3Livre: { min: 0.5, max: 25 },
  calcitonina: { min: 0.1, max: 5000 },
  ferritina: { min: 1, max: 20000 },
  ferroSerico: { min: 5, max: 800 },
  vitaminaB12: { min: 30, max: 50000 },
  vitaminaD: { min: 2, max: 600 },
  albumina: { min: 1, max: 7 },
  hemoglobina: { min: 3, max: 25 },
  /** No app: ×10³/µL (ex. 8,5 ou 256), não contagem absoluta /µL */
  leucocitos: { min: 0.5, max: 800 },
  plaquetas: { min: 5, max: 4000 },
  testosteronaTotal: { min: 5, max: 5000 },
  testosteronaLivre: { min: 0.01, max: 200 },
  shbg: { min: 1, max: 500 },
  lh: { min: 0.05, max: 250 },
  fsh: { min: 0.05, max: 250 },
  estradiol: { min: 1, max: 5000 },
  dht: { min: 1, max: 2000 },
  dheas: { min: 5, max: 20000 },
  prolactina: { min: 0.1, max: 50000 },
  psa: { min: 0.001, max: 5000 },
  progesterona: { min: 0.01, max: 500 },
  oh17Progesterona: { min: 0.01, max: 200 },
  amh: { min: 0.01, max: 50 },
  cortisol8h: { min: 0.5, max: 200 },
  cortisol16h: { min: 0.5, max: 200 },
  acth: { min: 0.1, max: 2000 },
  homaIr: { min: 0.05, max: 50 },
  leptina: { min: 0.1, max: 200 },
  adiponectina: { min: 0.1, max: 200 },
  igf1: { min: 5, max: 2000 },
  pcrUltra: { min: 0.001, max: 500 },
  antiTPO: { min: 0.1, max: 200000 },
  antiTg: { min: 0.1, max: 200000 },
};

const DEFAULT_RANGE: Range = { min: 1e-9, max: 1e12 };

/**
 * Remove valores fora de faixa plausível e acrescenta avisos curtos.
 */
export function filtrarCamposPorPlausibilidade(
  campos: Record<string, number>,
  avisosExistentes: string[]
): { campos: Record<string, number>; avisos: string[] } {
  const out: Record<string, number> = {};
  const avisos = [...avisosExistentes];
  for (const [k, v] of Object.entries(campos)) {
    if (!Number.isFinite(v)) continue;
    const r = LAB_PLAUSIBLE[k] ?? DEFAULT_RANGE;
    if (v < r.min || v > r.max) {
      avisos.push(`Valor atípico para "${k}" (${v}) foi ignorado; confira no laudo e preencha manualmente se necessário.`);
      continue;
    }
    out[k] = v;
  }
  return { campos: out, avisos };
}
