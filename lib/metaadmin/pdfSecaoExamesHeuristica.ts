/**
 * Classificação leve por texto bruto no PDF (sem motor de renderização).
 * Só orienta o utilizador — laudos digitalizados sem texto ficam "indefinido".
 */

export type SecaoExamesHeuristica = 'laboratorial' | 'imagem' | 'indefinido';

const SAMPLE_MAX_BYTES = 1_200_000;

function bufferToSearchableString(buf: ArrayBuffer): string {
  const u8 = new Uint8Array(buf);
  const latin1 = new TextDecoder('latin1', { fatal: false }).decode(u8);
  return latin1.toLowerCase();
}

const LAB_REGEX: RegExp[] = [
  /\bhem[oô]grama\b/,
  /\bhba1c\b/,
  /\bhemoglobina\s+glicad/,
  /\bglicemia\b/,
  /\bglicose\b/,
  /\bcolesterol\b/,
  /\bldl\b/,
  /\bhdl\b/,
  /\btriglicer[ií]deos?\b/,
  /\bcreatinina\b/,
  /\bureia\b/,
  /\btsh\b/,
  /\bvitamina\s+d\b/,
  /\bpsa\b/,
  /\bvalores?\s+de\s+refer[eê]ncia\b/,
  /\bmaterial\s+(recebido|coletado)\b/,
  /\bmg\s*\/\s*dl\b/,
  /\bmmol\s*\/\s*l\b/,
  /\bcel\s*\/\s*mm3\b/,
  /\bui\s*\/\s*ml\b/,
  /\bparasitol[oó]gico\b/,
  /\burocultura\b/,
  /\bbeta\s*-?\s*h?cg\b/,
  /\bcoagulograma\b/,
  /\beas\b/,
  /\bfun[cç][aã]o\s+renal\b/,
  /\bperfil\s+lip[ií]dico\b/,
];

const IMG_REGEX: RegExp[] = [
  /\bresson[aâ]ncia\s+magn[eé]tica\b/,
  /\bresson[aâ]ncia\b/,
  /\btomografia\s+computadorizada\b/,
  /\btomografia\b/,
  /\bultrassonografia\b/,
  /\bultrassom\b/,
  /\braio[-\s]?x\b/,
  /\blaudo\s+radiol[oó]gico\b/,
  /\blaudo\s+de\s+imagem\b/,
  /\bcontraste\s+(iodado|gadol[ií]nio)\b/,
  /\bpet[-\s]?ct\b/,
  /\bdoppler\b/,
  /\bdensitometria\b/,
  /\bmamografia\b/,
  /\barteriografia\b/,
  /\busg\b/,
];

function contarPadroes(s: string, patterns: RegExp[]): number {
  let n = 0;
  for (const p of patterns) {
    p.lastIndex = 0;
    if (p.test(s)) n += 1;
  }
  return n;
}

/**
 * Indica se o conteúdo textual embutido no PDF sugere laboratório vs imagem.
 */
export async function avaliarPdfProvavelSecaoExames(file: File): Promise<SecaoExamesHeuristica> {
  const isPdf =
    (file.type || '').toLowerCase().includes('pdf') || file.name.toLowerCase().endsWith('.pdf');
  if (!isPdf) return 'indefinido';

  const end = Math.min(file.size, SAMPLE_MAX_BYTES);
  const buf = await file.slice(0, end).arrayBuffer();
  const lower = bufferToSearchableString(buf);

  const lab = contarPadroes(lower, LAB_REGEX);
  const img = contarPadroes(lower, IMG_REGEX);

  const margin = 2;
  if (lab >= 2 && lab >= img + margin) return 'laboratorial';
  if (img >= 2 && img >= lab + margin) return 'imagem';
  if (lab >= 3 && lab > img) return 'laboratorial';
  if (img >= 3 && img > lab) return 'imagem';
  return 'indefinido';
}
