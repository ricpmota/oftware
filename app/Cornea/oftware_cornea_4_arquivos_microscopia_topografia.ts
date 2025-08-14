// ==========================
// Arquivo principal: oftware_cornea_4_arquivos_microscopia_topografia.ts
// Lógica principal para MICROSCOPIA ESPECULAR e TOPOGRAFIA/TOMOGRAFIA (OD/OE)
// ==========================

export type Eye = "OD" | "OE";

import type { MicroscopyInput } from "./microscopyInputs";
import type { TopographyInput, FerraraPattern } from "./topoInputs";

export const defaultMicroscopyInput = (eye: Eye): MicroscopyInput => ({
  eye,
  endothelialDensity: null,
  coefVariationPct: null,
  hexagonalityPct: null,
  centralCCTum: null,
  guttata: false,
  beatenMetalAspect: false,
  qualityScore: null,
  sampledCellsCount: null,
  examDate: undefined,
  device: undefined,
  operator: undefined,
});

/** Validação simples de faixas plausíveis para evitar digitação absurda. */
export function validateMicroscopyInput(i: MicroscopyInput): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  if (i.endothelialDensity == null || Number.isNaN(i.endothelialDensity)) errors.push("Densidade endotelial obrigatória.");
  if (i.endothelialDensity != null && (i.endothelialDensity < 300 || i.endothelialDensity > 5000)) errors.push("Densidade fora da faixa plausível (300–5000 cél/mm²).");
  if (i.coefVariationPct != null && (i.coefVariationPct < 0 || i.coefVariationPct > 100)) errors.push("CV% deve estar entre 0 e 100.");
  if (i.hexagonalityPct != null && (i.hexagonalityPct < 0 || i.hexagonalityPct > 100)) errors.push("Hexagonalidade% deve estar entre 0 e 100.");
  if (i.centralCCTum != null && (i.centralCCTum < 350 || i.centralCCTum > 800)) errors.push("CCT fora da faixa plausível (350–800 µm).");
  if (i.qualityScore != null && (i.qualityScore < 0 || i.qualityScore > 5)) errors.push("QualityScore deve ser 0–5.");
  if (i.sampledCellsCount != null && (i.sampledCellsCount < 20 || i.sampledCellsCount > 2000)) errors.push("Contagem de células fora da faixa plausível (20–2000).");
  return { ok: errors.length === 0, errors };
}


// ==========================
// Arquivo 2: microscopyRules.ts
// Regras -> Resultado a partir das entradas de MICROCOPIA (OD/OE)
// ==========================

// Import já movido para o topo do arquivo

export interface MicroscopyResult {
  eye: "OD" | "OE";
  summary: string; // frase curta para cards
  lines: string[]; // linhas para o laudo
  flags: string[]; // badges (ex.: "Fuchs suspeita", "Alerta cirúrgico")
  grades: { polymeg: "0/4+"|"1/4+"|"2/4+"|"3/4+"|"4/4+"; pleomorf: "0/4+"|"1/4+"|"2/4+"|"3/4+"|"4/4+" };
}

// Limiares clínicos (ajustáveis no futuro por config):
const DENSITY_LOW = 1500; // adulto ~ faixa esperada
const DENSITY_VERY_LOW = 1000; // risco aumentado de descompensação
const CCT_RISK = 650; // risco se combinado com densidade muito baixa

/**
 * Conversão aproximada de CV% em grau de POLIMEGATISMO (0/4+ a 4/4+).
 * Referência prática: <30 normal, 30–40 leve, 41–50 moderado, 51–60 acentuado, >60 severo.
 */
function gradePolymeg(cv?: number | null): MicroscopyResult["grades"]["polymeg"] {
  if (cv == null) return "0/4+";
  if (cv < 30) return "0/4+";
  if (cv < 41) return "1/4+";
  if (cv < 51) return "2/4+";
  if (cv < 61) return "3/4+";
  return "4/4+";
}

/**
 * Conversão aproximada de hexagonalidade% em grau de PLEOMORFISMO (quanto menor hex, maior grau).
 * Referência prática: ≥50 normal, 40–49 leve, 30–39 moderado, 20–29 acentuado, <20 severo.
 */
function gradePleomorf(hex?: number | null): MicroscopyResult["grades"]["pleomorf"] {
  if (hex == null) return "0/4+";
  if (hex >= 50) return "0/4+";
  if (hex >= 40) return "1/4+";
  if (hex >= 30) return "2/4+";
  if (hex >= 20) return "3/4+";
  return "4/4+";
}

export function evaluateMicroscopy(i: MicroscopyInput): MicroscopyResult {
  const flags: string[] = [];
  const lines: string[] = [];

  const polymeg = gradePolymeg(i.coefVariationPct);
  const pleomorf = gradePleomorf(i.hexagonalityPct);

  // Aspecto morfológico
  lines.push(`Aspecto morfológico: Polimegatismo ${polymeg} e Pleomorfismo ${pleomorf}.`);

  // Densidade
  if (i.endothelialDensity != null) {
    lines.push(`Densidade endotelial: ${i.endothelialDensity.toLocaleString("pt-BR")} células/mm².`);
    if (i.endothelialDensity < DENSITY_VERY_LOW) flags.push("Densidade muito baixa");
    else if (i.endothelialDensity < DENSITY_LOW) flags.push("Densidade baixa");
  }

  // Achados adicionais
  if (i.guttata) { lines.push("Guttata: presente."); flags.push("Fuchs suspeita"); }
  if (i.beatenMetalAspect) lines.push("Aspecto metal-batido: presente.");

  if (i.centralCCTum != null) lines.push(`Paquimetria simulada: ≈ ${i.centralCCTum} µm.`);

  // Alertas cirúrgicos
  if ((i.endothelialDensity ?? 9999) < DENSITY_VERY_LOW && (i.centralCCTum ?? 0) > CCT_RISK) {
    flags.push("ALERTA cirúrgico");
    lines.push("Alerta: risco aumentado de descompensação corneana em cirurgias do segmento anterior.");
  }

  // Qualidade & amostra
  if (i.qualityScore != null) lines.push(`Qualidade da imagem: ${i.qualityScore}/5.`);
  if (i.sampledCellsCount != null) lines.push(`Células amostradas: ${i.sampledCellsCount}.`);

  // Conclusão
  const conclusionParts: string[] = [];
  if ((i.endothelialDensity ?? 9999) >= DENSITY_LOW && polymeg === "0/4+" && pleomorf === "0/4+") {
    conclusionParts.push("Morfologia e densidade preservadas");
  } else {
    if ((i.endothelialDensity ?? 9999) < DENSITY_LOW) conclusionParts.push("baixa densidade");
    if (polymeg !== "0/4+") conclusionParts.push("alteração de tamanho celular (polimegatismo)");
    if (pleomorf !== "0/4+") conclusionParts.push("alteração de forma/hexagonalidade (pleomorfismo)");
  }
  if (i.guttata) conclusionParts.push("achados compatíveis com distrofia endotelial (avaliar Fuchs)");

  const summary = `Microscopia ${i.eye}: ` + (conclusionParts.length ? conclusionParts.join("; ") : "sem alterações relevantes");

  return { eye: i.eye, summary, lines, flags, grades: { polymeg, pleomorf } };
}

export function renderMicroscopyReport(od: MicroscopyInput | null, oe: MicroscopyInput | null): string[] {
  const out: string[] = [];
  if (od) {
    const r = evaluateMicroscopy(od);
    out.push(`🦠 MICROCOPIA ESPECULAR – OD`);
    out.push(...r.lines);
    if (r.flags.length) out.push(`Flags: ${r.flags.join(", ")}.`);
    out.push("—");
  }
  if (oe) {
    const r = evaluateMicroscopy(oe);
    out.push(`🦠 MICROCOPIA ESPECULAR – OE`);
    out.push(...r.lines);
    if (r.flags.length) out.push(`Flags: ${r.flags.join(", ")}.`);
  }
  return out;
}


// ==========================
// Arquivo 3: topoInputs.ts
// Entradas e lógica estrutural para TOPOGRAFIA/TOMOGRAFIA (Ferrara)
// ==========================

// Tipo FerraraPattern movido para topoInputs.ts

// Interface TopographyInput movida para topoInputs.ts

export const defaultTopographyInput = (eye: Eye): TopographyInput => ({
  eye,
  equipment: null,
  KmaxD: null,
  KsD: null,
  KfD: null,
  pachyMinUm: null,
  apexLocation: null,
  posteriorElevUm: null,
  anteriorElevUm: null,
  ferraraPattern: "indefinido",
  KcentralD: null,
  ISvalue: null,
  SRAXdeg: null,
  roushDeltaPachyUm: null,
  epithelialPattern: null,
  notes: null,
  examDate: null,
  operator: null,
});

export function validateTopographyInput(t: TopographyInput): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  if (t.KmaxD == null || Number.isNaN(t.KmaxD)) errors.push("Kmax obrigatório.");
  if (t.KmaxD != null && (t.KmaxD < 36 || t.KmaxD > 75)) errors.push("Kmax fora de faixa plausível (36–75 D).");
  if (t.pachyMinUm != null && (t.pachyMinUm < 300 || t.pachyMinUm > 800)) errors.push("Paquimetria mínima fora de faixa plausível (300–800 µm).");
  if (t.posteriorElevUm != null && (t.posteriorElevUm < -20 || t.posteriorElevUm > 200)) errors.push("Elevação posterior fora de faixa plausível.");
  if (t.anteriorElevUm != null && (t.anteriorElevUm < -20 || t.anteriorElevUm > 200)) errors.push("Elevação anterior fora de faixa plausível.");
  if (t.ISvalue != null && (t.ISvalue < -5 || t.ISvalue > 10)) errors.push("I-S fora de faixa plausível.");
  if (t.SRAXdeg != null && (t.SRAXdeg < 0 || t.SRAXdeg > 180)) errors.push("SRAX fora de faixa plausível (0–180°).");
  if (t.roushDeltaPachyUm != null && (t.roushDeltaPachyUm < 0 || t.roushDeltaPachyUm > 400)) errors.push("ΔPaqui (Roush) fora de faixa plausível (0–400 µm).");
  return { ok: errors.length === 0, errors };
}


// ==========================
// Arquivo 4: topoRules.ts
// Regras -> Resultado a partir das entradas de TOPOGRAFIA/TOMOGRAFIA (OD/OE)
// ==========================

// Import já movido para o topo do arquivo

export interface TopographyResult {
  eye: "OD" | "OE";
  summary: string;
  lines: string[];
  flags: string[]; // badges (ex.: "Roush+", "Rabinowitz+")
  severity: "leve" | "moderado" | "grave" | "indefinido";
  pattern: FerraraPattern;
}

function severityFromKmax(k?: number | null): TopographyResult["severity"] {
  if (k == null) return "indefinido";
  if (k < 48) return "leve";
  if (k <= 54) return "moderado";
  return "grave";
}

function suggestFerraraPattern(axialHint?: FerraraPattern, posteriorElevUm?: number | null, kmax?: number | null): FerraraPattern {
  // Mantém escolha do usuário se já definida
  if (axialHint && axialHint !== "indefinido") return axialHint;
  // Heurística simples só para sugestão inicial (pode ser refinada com mais sinais):
  if ((kmax ?? 0) >= 52 && (posteriorElevUm ?? 0) >= 50) return "nipple";
  if ((kmax ?? 0) >= 48 && (posteriorElevUm ?? 0) >= 35) return "oval";
  return "astigmatic"; // fallback
}

function rabinowitzPositive(t: TopographyInput): boolean {
  const a = (t.KcentralD ?? 0) >= 47.2;
  const b = (t.ISvalue ?? 0) >= 1.4;
  const c = (t.SRAXdeg ?? 0) > 21;
  return a || b || c;
}

function roushPositive(t: TopographyInput): boolean {
  return (t.roushDeltaPachyUm ?? 0) > 100;
}

export function evaluateTopography(t: TopographyInput): TopographyResult {
  const flags: string[] = [];
  const lines: string[] = [];

  const severity = severityFromKmax(t.KmaxD);
  const pattern = suggestFerraraPattern(t.ferraraPattern, t.posteriorElevUm, t.KmaxD);

  // Cabeçalho descritivo
  if (t.equipment) lines.push(`${t.equipment}: avaliação tomográfica/topográfica.`);

  // Padrão Ferrara
  lines.push(`Padrão topográfico (Ferrara): ${pattern}.`);

  // Métricas principais
  if (t.KmaxD != null) lines.push(`Kmax: ${t.KmaxD.toFixed(1)} D (gravidade: ${severity}).`);
  if (t.KsD != null && t.KfD != null) lines.push(`Ks/Kf: ${t.KsD?.toFixed(1)} / ${t.KfD?.toFixed(1)} D.`);
  if (t.pachyMinUm != null) lines.push(`Paquimetria mínima: ${t.pachyMinUm} µm${t.apexLocation ? `, ápice ${t.apexLocation}` : ""}.`);
  if (t.posteriorElevUm != null) lines.push(`Elevação posterior no ápice: +${t.posteriorElevUm} µm.`);
  if (t.anteriorElevUm != null) lines.push(`Elevação anterior no ápice: +${t.anteriorElevUm} µm.`);

  // Índices de suspeição
  const rabinowitz = rabinowitzPositive(t);
  const roush = roushPositive(t);
  if (rabinowitz) flags.push("Rabinowitz/McDonnell+");
  if (roush) flags.push("Roush+");
  lines.push(`Índices: Rabinowitz/McDonnell ${rabinowitz ? "+" : "-"}; Roush ${roush ? "+" : "-"}.`);

  // Mapa epitelial (diferencial de warpage)
  if (t.epithelialPattern === "warpage-espessamento-central") {
    lines.push("Mapa epitelial com espessamento central: considerar warpage (avaliar uso de lentes de contato e wash-out). ");
    flags.push("Warpage suspeita");
  } else if (t.epithelialPattern === "cone-afinamento-apical") {
    lines.push("Mapa epitelial com afinamento apical: padrão compatível com cone.");
  }

  if (t.notes) lines.push(`Obs.: ${t.notes}`);

  // Conclusão
  const summary = `Topografia ${t.eye}: ${pattern}, ${severity}${(rabinowitz||roush) ? ", índices positivos" : ""}`;

  return { eye: t.eye, summary, lines, flags, severity, pattern };
}

export function renderTopographyReport(od: TopographyInput | null, oe: TopographyInput | null): string[] {
  const out: string[] = [];
  if (od) {
    const r = evaluateTopography(od);
    out.push(`🌈 TOPOGRAFIA/TOMOGRAFIA – OD`);
    out.push(...r.lines);
    if (r.flags.length) out.push(`Flags: ${r.flags.join(", ")}.`);
    out.push("—");
  }
  if (oe) {
    const r = evaluateTopography(oe);
    out.push(`🌈 TOPOGRAFIA/TOMOGRAFIA – OE`);
    out.push(...r.lines);
    if (r.flags.length) out.push(`Flags: ${r.flags.join(", ")}.`);
  }
  return out;
}
