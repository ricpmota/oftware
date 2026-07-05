import type {
  BioImpedanciaRegistro,
  BioOrigemExame,
  ComposicaoCorporal,
  AnaliseMusculoGordura,
  AnaliseObesidade,
  MassaMagraSegmentar,
  GorduraSegmentar,
  SegmentoBioImpedancia,
} from '@/types/bioImpedancia';
import { BIO_ORIGEM_LABELS } from '@/types/bioImpedancia';
import { dateFromBioDateInput, formatBioDateInputLocal, isBioDateValid } from '@/utils/bioImpedanciaDate';

function calendarMatchesDate(y: number, mo: number, day: number, d: Date): boolean {
  return d.getFullYear() === y && d.getMonth() === mo - 1 && d.getDate() === day;
}

/** Aceita YYYY-MM-DD, ISO com hora, DD/MM/AAAA, timestamp em ms ou número YYYYMMDD (8 dígitos) */
function parseDataRegistroIA(dr: unknown): string | null {
  if (dr == null || dr === '') return null;
  if (typeof dr === 'number' && Number.isFinite(dr)) {
    if (dr >= 1e7 && dr < 1e8) {
      const s = String(Math.trunc(dr));
      const y = parseInt(s.slice(0, 4), 10);
      const mo = parseInt(s.slice(4, 6), 10);
      const day = parseInt(s.slice(6, 8), 10);
      const iso = `${String(y).padStart(4, '0')}-${String(mo).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const d = dateFromBioDateInput(iso);
      if (!isBioDateValid(d) || !calendarMatchesDate(y, mo, day, d)) return null;
      return iso;
    }
    let ms = dr;
    if (dr > 0 && dr < 1e12) ms = dr * 1000;
    const d = new Date(ms);
    if (!isBioDateValid(d)) return null;
    const yN = d.getFullYear();
    if (yN < 1980 || yN > 2100) return null;
    return formatBioDateInputLocal(d);
  }
  if (typeof dr !== 'string') return null;
  const t = dr.trim();
  if (!t) return null;

  const head = t.slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(head)) {
    const d = dateFromBioDateInput(head);
    if (!isBioDateValid(d)) return null;
    const [y, mo, day] = head.split('-').map((n) => parseInt(n, 10));
    if (!calendarMatchesDate(y, mo, day, d)) return null;
    return head;
  }

  const br = t.match(/^(\d{2})[./-](\d{2})[./-](\d{4})$/);
  if (br) {
    const [, dStr, moStr, yStr] = br;
    const iso = `${yStr}-${moStr}-${dStr}`;
    const d = dateFromBioDateInput(iso);
    if (!isBioDateValid(d)) return null;
    const y = parseInt(yStr, 10);
    const mo = parseInt(moStr, 10);
    const day = parseInt(dStr, 10);
    if (!calendarMatchesDate(y, mo, day, d)) return null;
    return iso;
  }
  return null;
}

const SEG_ALIASES: Record<string, keyof MassaMagraSegmentar> = {
  arm_r: 'arm_r',
  armr: 'arm_r',
  ra: 'arm_r',
  rightarm: 'arm_r',
  bracodireito: 'arm_r',
  braçodireito: 'arm_r',
  arm_l: 'arm_l',
  arml: 'arm_l',
  la: 'arm_l',
  leftarm: 'arm_l',
  bracoesquerdo: 'arm_l',
  braçoesquerdo: 'arm_l',
  trunk: 'trunk',
  tr: 'trunk',
  tronco: 'trunk',
  leg_r: 'leg_r',
  legr: 'leg_r',
  rl: 'leg_r',
  rightleg: 'leg_r',
  pernadireita: 'leg_r',
  leg_l: 'leg_l',
  legl: 'leg_l',
  ll: 'leg_l',
  leftleg: 'leg_l',
  pernaesquerda: 'leg_l',
};

const COMP_ALIASES: Record<string, keyof ComposicaoCorporal> = {
  aguatotallitros: 'aguaTotalLitros',
  aguatotal: 'aguaTotalLitros',
  tbw: 'aguaTotalLitros',
  totalbodywater: 'aguaTotalLitros',
  water: 'aguaTotalLitros',
  litrosdeagua: 'aguaTotalLitros',
  aguakg: 'aguaTotalLitros',
  pesodaagua: 'aguaTotalLitros',
  proteinaskg: 'proteinasKg',
  protein: 'proteinasKg',
  proteinas: 'proteinasKg',
  proteina: 'proteinasKg',
  solid: 'proteinasKg',
  mineraiskg: 'mineraisKg',
  minerals: 'mineraisKg',
  mineral: 'mineraisKg',
  massagordurakg: 'massaGorduraKg',
  bfm: 'massaGorduraKg',
  bodyfatmass: 'massaGorduraKg',
  fatmass: 'massaGorduraKg',
  gordurakg: 'massaGorduraKg',
  pesodagordura: 'massaGorduraKg',
};

const MUSC_ALIASES: Record<string, keyof AnaliseMusculoGordura> = {
  massamuscularkg: 'massaMuscularKg',
  smm: 'massaMuscularKg',
  skeletalmusclemass: 'massaMuscularKg',
  musclemass: 'massaMuscularKg',
  massamuscular: 'massaMuscularKg',
  slm: 'massaMuscularKg',
  massamuscularesqueleticakg: 'massaMuscularKg',
  massagordurakg: 'massaGorduraKg',
  massadegordura: 'massaGorduraKg',
};

const PGC_ALIASES = new Set([
  'percentualgordura',
  'pbf',
  'percentbodyfat',
  'bodyfatpercent',
  'bfpercent',
  'bf',
  'gorduracorporal',
  'gordura',
  'bodyfat',
]);

const ROOT_EXTENDED_ALIASES: Record<string, string> = {
  origemexame: 'origemExame',
  origem: 'origemExame',
  equipamento: 'origemExame',
  bmi: 'imc',
  percentualgordura: 'percentualGordura',
  pbf: 'percentualGordura',
  percentbodyfat: 'percentualGordura',
  bodyfatpercent: 'percentualGordura',
  massagordurakg: 'massaGorduraKg',
  fatmass: 'massaGorduraKg',
  bodyfatmass: 'massaGorduraKg',
  massamuscularkg: 'massaMuscularKg',
  musclemass: 'massaMuscularKg',
  massamuscular: 'massaMuscularKg',
  massamuscularesqueleticakg: 'massaMuscularEsqueleticaKg',
  skeletalmusclemass: 'massaMuscularEsqueleticaKg',
  smm: 'massaMuscularEsqueleticaKg',
  gorduravisceral: 'gorduraVisceral',
  visceralfat: 'gorduraVisceral',
  aguapercentual: 'aguaPercentual',
  waterpercent: 'aguaPercentual',
  bodywaterpercent: 'aguaPercentual',
  aguakg: 'aguaKg',
  pesodaagua: 'aguaKg',
  waterkg: 'aguaKg',
  metabolismobasalkcal: 'metabolismoBasalKcal',
  bmr: 'metabolismoBasalKcal',
  basalmetabolicrate: 'metabolismoBasalKcal',
  massaosseakg: 'massaOsseaKg',
  bonemass: 'massaOsseaKg',
  proteinapercentual: 'proteinaPercentual',
  proteinpercent: 'proteinaPercentual',
  idadecorporal: 'idadeCorporal',
  bodyage: 'idadeCorporal',
  alturacm: 'alturaCm',
  height: 'alturaCm',
  altura: 'alturaCm',
  circunferenciaabdominalcm: 'circunferenciaAbdominalCm',
  waist: 'circunferenciaAbdominalCm',
  weight: 'peso',
  peso: 'peso',
  bodyweight: 'peso',
};

function normKey(k: string): string {
  return k
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[\s._%-]/g, '')
    .toLowerCase();
}

function parseOrigemExame(raw: unknown): BioOrigemExame | null {
  if (raw == null || raw === '') return null;
  const t = String(raw).trim().toLowerCase();
  if (t.includes('inbody')) return 'inbody';
  if (t.includes('tanita')) return 'tanita';
  if (t.includes('omron')) return 'omron';
  if (t.includes('xiaomi') || t.includes('mibody')) return 'xiaomi';
  if (t.includes('renpho')) return 'renpho';
  if (t.includes('seca')) return 'seca';
  if (t === 'generico' || t === 'generica' || t.includes('genéric') || t.includes('generico')) return 'generica';
  if (t === 'outro' || t === 'other') return 'outro';
  return null;
}

/** Replica chaves alternativas (InBody/misto PT-EN/apps) para o formato esperado pelo app */
function canonicalizeBioIaRoot(o: Record<string, unknown>): Record<string, unknown> {
  const next: Record<string, unknown> = { ...o };

  for (const [rawK, val] of Object.entries(o)) {
    if (val === undefined || val === null || val === '') continue;
    const nk = normKey(rawK);
    const canon = ROOT_EXTENDED_ALIASES[nk];
    if (canon && next[canon] === undefined) next[canon] = val;
  }

  const comp: Record<string, unknown> =
    o.composicaoCorporal && typeof o.composicaoCorporal === 'object' && !Array.isArray(o.composicaoCorporal)
      ? { ...(o.composicaoCorporal as Record<string, unknown>) }
      : {};

  const assignComp = (key: keyof ComposicaoCorporal, val: unknown) => {
    if (val === undefined || val === null) return;
    if (comp[key] === undefined || comp[key] === null) comp[key] = val;
  };

  for (const [rawK, val] of Object.entries(o)) {
    if (['composicaoCorporal', 'analiseMusculoGordura', 'analiseObesidade'].includes(rawK)) continue;
    const nk = normKey(rawK);
    const c = COMP_ALIASES[nk];
    if (c) assignComp(c, val);
  }

  if (next.massaGorduraKg != null && comp.massaGorduraKg == null) assignComp('massaGorduraKg', next.massaGorduraKg);
  if (next.aguaKg != null && comp.aguaTotalLitros == null) assignComp('aguaTotalLitros', next.aguaKg);

  for (const [rawK, val] of Object.entries(comp)) {
    const nk = normKey(rawK);
    const c =
      COMP_ALIASES[nk] ??
      (['aguaTotalLitros', 'proteinasKg', 'mineraisKg', 'massaGorduraKg'].includes(rawK)
        ? (rawK as keyof ComposicaoCorporal)
        : null);
    if (c && c !== rawK) {
      assignComp(c, val);
      delete comp[rawK];
    }
  }

  if (Object.keys(comp).length) next.composicaoCorporal = comp;

  const amg0 = o.analiseMusculoGordura;
  const amg: Record<string, unknown> =
    amg0 && typeof amg0 === 'object' && !Array.isArray(amg0) ? { ...(amg0 as Record<string, unknown>) } : {};

  const assignAmg = (key: keyof AnaliseMusculoGordura, val: unknown) => {
    if (val === undefined || val === null) return;
    if (amg[key] === undefined || amg[key] === null) amg[key] = val;
  };

  for (const [rawK, val] of Object.entries(o)) {
    if (['composicaoCorporal', 'analiseMusculoGordura', 'analiseObesidade'].includes(rawK)) continue;
    const nk = normKey(rawK);
    const m = MUSC_ALIASES[nk];
    if (m) assignAmg(m, val);
    const c = COMP_ALIASES[nk];
    if (c === 'massaGorduraKg') assignAmg('massaGorduraKg', val);
  }

  if (next.massaMuscularKg != null) assignAmg('massaMuscularKg', next.massaMuscularKg);
  if (next.massaMuscularEsqueleticaKg != null && amg.massaMuscularKg == null) {
    assignAmg('massaMuscularKg', next.massaMuscularEsqueleticaKg);
  }
  if (next.massaGorduraKg != null) assignAmg('massaGorduraKg', next.massaGorduraKg);

  for (const [rawK, val] of Object.entries(amg)) {
    const nk = normKey(rawK);
    const m =
      MUSC_ALIASES[nk] ??
      (['massaMuscularKg', 'massaGorduraKg'].includes(rawK) ? (rawK as keyof AnaliseMusculoGordura) : null);
    if (m && m !== rawK) {
      assignAmg(m, val);
      delete amg[rawK];
    }
  }

  if (Object.keys(amg).length) next.analiseMusculoGordura = amg;

  const ao0 = o.analiseObesidade;
  const ao: Record<string, unknown> =
    ao0 && typeof ao0 === 'object' && !Array.isArray(ao0) ? { ...(ao0 as Record<string, unknown>) } : {};

  const assignPgc = (val: unknown) => {
    if (val === undefined || val === null) return;
    if (ao.percentualGordura === undefined || ao.percentualGordura === null) ao.percentualGordura = val;
  };

  if (next.percentualGordura != null) assignPgc(next.percentualGordura);

  for (const [rawK, val] of Object.entries(o)) {
    if (['composicaoCorporal', 'analiseMusculoGordura', 'analiseObesidade'].includes(rawK)) continue;
    const nk = normKey(rawK);
    if (PGC_ALIASES.has(nk)) assignPgc(val);
  }

  for (const [rawK, val] of Object.entries(ao)) {
    const nk = normKey(rawK);
    if (PGC_ALIASES.has(nk) && rawK !== 'percentualGordura') {
      assignPgc(val);
      delete ao[rawK];
    }
  }

  if (ao.percentualGordura != null) {
    next.analiseObesidade = ao;
    if (next.percentualGordura == null) next.percentualGordura = ao.percentualGordura;
  }

  const normSegBlock = (raw: unknown): Record<string, unknown> | undefined => {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined;
    const src = raw as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(src)) {
      const nk = normKey(k);
      const canon = SEG_ALIASES[nk] ?? (['arm_r', 'arm_l', 'trunk', 'leg_r', 'leg_l'].includes(k) ? k : null);
      if (canon) out[canon] = v;
    }
    return Object.keys(out).length ? out : undefined;
  };

  const mm = normSegBlock(o.massaMagraSegmentar);
  if (mm) next.massaMagraSegmentar = mm;

  const gs = normSegBlock(o.gorduraSegmentar);
  if (gs) next.gorduraSegmentar = gs;

  return next;
}

function numOk(raw: unknown, min = 0): number | null {
  if (raw === null || raw === undefined || raw === '') return null;
  if (typeof raw === 'number') {
    if (!Number.isFinite(raw) || raw < min) return null;
    return raw;
  }
  const s = String(raw).trim().replace(/\s/g, '').replace(',', '.');
  const n = parseFloat(s);
  if (!Number.isFinite(n) || n < min) return null;
  return n;
}

function numOkImc(raw: unknown): number | null {
  const n = numOk(raw, 10);
  if (n === null) return null;
  if (n > 80) return null;
  return n;
}

function numOkAltura(raw: unknown): number | null {
  const n = numOk(raw, 0);
  if (n === null) return null;
  if (n > 0 && n < 3) return Math.round(n * 100);
  if (n >= 100 && n <= 250) return n;
  return null;
}

function parseSegmento(raw: unknown): SegmentoBioImpedancia | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const kg = numOk(o.kg, 0);
  const percentual = numOk(o.percentual, 0);
  if (kg === null && percentual === null) return null;
  return {
    kg: kg ?? 0,
    percentual: percentual ?? 0,
  };
}

function parseMassaMagra(raw: unknown): Partial<MassaMagraSegmentar> | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const keys = ['arm_r', 'arm_l', 'trunk', 'leg_r', 'leg_l'] as const;
  const out: Partial<MassaMagraSegmentar> = {};
  let any = false;
  for (const k of keys) {
    const seg = parseSegmento(o[k]);
    if (seg && (seg.kg > 0 || seg.percentual > 0)) {
      (out as Record<string, SegmentoBioImpedancia>)[k] = seg;
      any = true;
    }
  }
  return any ? out : null;
}

export interface BioImpedanciaExtracaoNormalizada {
  dataRegistro: string | null;
  peso: number | null;
  origemExame?: BioOrigemExame | null;
  imc?: number | null;
  percentualGordura?: number | null;
  massaGorduraKg?: number | null;
  massaMuscularKg?: number | null;
  massaMuscularEsqueleticaKg?: number | null;
  gorduraVisceral?: number | null;
  aguaPercentual?: number | null;
  aguaKg?: number | null;
  metabolismoBasalKcal?: number | null;
  massaOsseaKg?: number | null;
  proteinaPercentual?: number | null;
  idadeCorporal?: number | null;
  alturaCm?: number | null;
  circunferenciaAbdominalCm?: number | null;
  composicaoCorporal: Partial<ComposicaoCorporal> | null;
  analiseMusculoGordura: Partial<AnaliseMusculoGordura> | null;
  analiseObesidade: Partial<AnaliseObesidade> | null;
  massaMagraSegmentar: Partial<MassaMagraSegmentar> | null;
  gorduraSegmentar: Partial<GorduraSegmentar> | null;
  avisos: string[];
}

function inferirOrigemIA(o: Record<string, unknown>, avisos: string[]): BioOrigemExame {
  const parsed = parseOrigemExame(o.origemExame ?? o.origem ?? o.equipamento);
  if (parsed) return parsed;
  const texto = [String(o.marca ?? ''), ...avisos].join(' ').toLowerCase();
  if (texto.includes('inbody')) return 'inbody';
  if (texto.includes('tanita')) return 'tanita';
  if (texto.includes('omron')) return 'omron';
  if (texto.includes('xiaomi') || texto.includes('mibody')) return 'xiaomi';
  if (texto.includes('renpho')) return 'renpho';
  if (texto.includes('seca')) return 'seca';
  return 'generica';
}

function syncLegadoFromExtended(out: BioImpedanciaExtracaoNormalizada): void {
  if (out.percentualGordura != null) {
    out.analiseObesidade = {
      ...out.analiseObesidade,
      percentualGordura: out.percentualGordura,
    };
  } else if (out.analiseObesidade?.percentualGordura != null) {
    out.percentualGordura = out.analiseObesidade.percentualGordura;
  }

  const mg =
    out.massaGorduraKg ??
    out.composicaoCorporal?.massaGorduraKg ??
    out.analiseMusculoGordura?.massaGorduraKg ??
    null;
  if (mg != null) {
    out.massaGorduraKg = mg;
    out.composicaoCorporal = { ...out.composicaoCorporal, massaGorduraKg: mg };
    out.analiseMusculoGordura = { ...out.analiseMusculoGordura, massaGorduraKg: mg };
  }

  const mm =
    out.massaMuscularKg ?? out.analiseMusculoGordura?.massaMuscularKg ?? out.massaMuscularEsqueleticaKg ?? null;
  if (mm != null) {
    out.massaMuscularKg = mm;
    out.analiseMusculoGordura = { ...out.analiseMusculoGordura, massaMuscularKg: mm };
  }

  if (out.aguaKg != null) {
    const cc = out.composicaoCorporal ?? {};
    if (cc.aguaTotalLitros == null) {
      out.composicaoCorporal = { ...cc, aguaTotalLitros: out.aguaKg };
      if (!out.avisos.some((a) => a.includes('água') && a.includes('litros'))) {
        out.avisos.push('Água corporal informada em kg foi replicada em litros (aproximação 1 kg ≈ 1 L).');
      }
    }
  } else if (out.composicaoCorporal?.aguaTotalLitros != null) {
    out.aguaKg = out.composicaoCorporal.aguaTotalLitros;
  }

  if (out.massaOsseaKg != null && out.composicaoCorporal?.mineraisKg == null) {
    out.composicaoCorporal = { ...out.composicaoCorporal, mineraisKg: out.massaOsseaKg };
  }
}

const CAMPOS_PRINCIPAIS_REVISAO: { key: string; label: string; check: (e: BioImpedanciaExtracaoNormalizada) => boolean }[] = [
  { key: 'peso', label: 'Peso', check: (e) => e.peso != null },
  { key: 'imc', label: 'IMC', check: (e) => e.imc != null },
  { key: 'gordura', label: 'Gordura %', check: (e) => e.percentualGordura != null || e.analiseObesidade?.percentualGordura != null },
  {
    key: 'massaGordura',
    label: 'Massa de gordura',
    check: (e) =>
      e.massaGorduraKg != null ||
      e.composicaoCorporal?.massaGorduraKg != null ||
      e.analiseMusculoGordura?.massaGorduraKg != null,
  },
  {
    key: 'massaMuscular',
    label: 'Massa muscular',
    check: (e) => e.massaMuscularKg != null || e.analiseMusculoGordura?.massaMuscularKg != null,
  },
  { key: 'smm', label: 'Massa muscular esquelética', check: (e) => e.massaMuscularEsqueleticaKg != null },
  { key: 'visceral', label: 'Gordura visceral', check: (e) => e.gorduraVisceral != null },
  {
    key: 'agua',
    label: 'Água corporal',
    check: (e) => e.aguaKg != null || e.aguaPercentual != null || e.composicaoCorporal?.aguaTotalLitros != null,
  },
  { key: 'bmr', label: 'Metabolismo basal', check: (e) => e.metabolismoBasalKcal != null },
  { key: 'ossea', label: 'Massa óssea', check: (e) => e.massaOsseaKg != null || e.composicaoCorporal?.mineraisKg != null },
  { key: 'proteina', label: 'Proteína', check: (e) => e.proteinaPercentual != null || e.composicaoCorporal?.proteinasKg != null },
  { key: 'altura', label: 'Altura', check: (e) => e.alturaCm != null },
  { key: 'idade', label: 'Idade corporal', check: (e) => e.idadeCorporal != null },
  {
    key: 'segmentar',
    label: 'Segmentares',
    check: (e) =>
      (e.massaMagraSegmentar != null && Object.keys(e.massaMagraSegmentar).length > 0) ||
      (e.gorduraSegmentar != null && Object.keys(e.gorduraSegmentar).length > 0),
  },
];

const CAMPOS_AUSENTES_PRINCIPAIS = ['peso', 'gordura', 'massaMuscular', 'massaGordura', 'agua', 'visceral'];

/** Lista campos encontrados e ausentes na extração IA para revisão */
export function listarCamposExtracaoIA(ext: BioImpedanciaExtracaoNormalizada): {
  encontrados: string[];
  ausentes: string[];
  origemLabel: string;
} {
  const encontrados: string[] = [];
  const ausentes: string[] = [];

  for (const campo of CAMPOS_PRINCIPAIS_REVISAO) {
    if (campo.check(ext)) encontrados.push(campo.label);
    else if (CAMPOS_AUSENTES_PRINCIPAIS.includes(campo.key)) ausentes.push(campo.label);
  }

  if (ext.dataRegistro) encontrados.unshift('Data do exame');

  const origem = ext.origemExame ?? 'generica';
  return {
    encontrados,
    ausentes: [...new Set(ausentes)],
    origemLabel: BIO_ORIGEM_LABELS[origem] ?? 'Genérica',
  };
}

export function normalizarRespostaBioImpedanciaIA(raw: unknown): BioImpedanciaExtracaoNormalizada {
  const out: BioImpedanciaExtracaoNormalizada = {
    dataRegistro: null,
    peso: null,
    composicaoCorporal: null,
    analiseMusculoGordura: null,
    analiseObesidade: null,
    massaMagraSegmentar: null,
    gorduraSegmentar: null,
    avisos: [],
  };
  if (!raw || typeof raw !== 'object') return out;
  const o = canonicalizeBioIaRoot(raw as Record<string, unknown>);

  const drNorm = parseDataRegistroIA(o.dataRegistro);
  if (drNorm) out.dataRegistro = drNorm;

  const peso = numOk(o.peso, 0.1);
  if (peso !== null) out.peso = peso;

  const imc = numOkImc(o.imc);
  if (imc !== null) out.imc = imc;

  const pg = numOk(o.percentualGordura, 0);
  if (pg !== null) out.percentualGordura = pg;

  const mgFlat = numOk(o.massaGorduraKg, 0);
  if (mgFlat !== null) out.massaGorduraKg = mgFlat;

  const mmFlat = numOk(o.massaMuscularKg, 0);
  if (mmFlat !== null) out.massaMuscularKg = mmFlat;

  const smm = numOk(o.massaMuscularEsqueleticaKg, 0);
  if (smm !== null) out.massaMuscularEsqueleticaKg = smm;

  const gv = numOk(o.gorduraVisceral, 0);
  if (gv !== null) out.gorduraVisceral = gv;

  const aguaPct = numOk(o.aguaPercentual, 0);
  if (aguaPct !== null) out.aguaPercentual = aguaPct;

  const aguaKg = numOk(o.aguaKg, 0);
  if (aguaKg !== null) out.aguaKg = aguaKg;

  const bmr = numOk(o.metabolismoBasalKcal, 0);
  if (bmr !== null) out.metabolismoBasalKcal = bmr;

  const ossea = numOk(o.massaOsseaKg, 0);
  if (ossea !== null) out.massaOsseaKg = ossea;

  const protPct = numOk(o.proteinaPercentual, 0);
  if (protPct !== null) out.proteinaPercentual = protPct;

  const idade = numOk(o.idadeCorporal, 0);
  if (idade !== null) out.idadeCorporal = idade;

  const altura = numOkAltura(o.alturaCm);
  if (altura !== null) out.alturaCm = altura;

  const circ = numOk(o.circunferenciaAbdominalCm, 0);
  if (circ !== null) out.circunferenciaAbdominalCm = circ;

  const cc = o.composicaoCorporal;
  if (cc && typeof cc === 'object' && !Array.isArray(cc)) {
    const c = cc as Record<string, unknown>;
    const partial: Partial<ComposicaoCorporal> = {};
    const a = numOk(c.aguaTotalLitros, 0);
    const p = numOk(c.proteinasKg, 0);
    const m = numOk(c.mineraisKg, 0);
    const g = numOk(c.massaGorduraKg, 0);
    if (a !== null) partial.aguaTotalLitros = a;
    if (p !== null) partial.proteinasKg = p;
    if (m !== null) partial.mineraisKg = m;
    if (g !== null) partial.massaGorduraKg = g;
    if (Object.keys(partial).length) out.composicaoCorporal = partial;
  }

  const amg = o.analiseMusculoGordura;
  if (amg && typeof amg === 'object' && !Array.isArray(amg)) {
    const c = amg as Record<string, unknown>;
    const partial: Partial<AnaliseMusculoGordura> = {};
    const mm = numOk(c.massaMuscularKg, 0);
    const mg = numOk(c.massaGorduraKg, 0);
    if (mm !== null) partial.massaMuscularKg = mm;
    if (mg !== null) partial.massaGorduraKg = mg;
    if (Object.keys(partial).length) out.analiseMusculoGordura = partial;
  }

  const ao = o.analiseObesidade;
  if (ao && typeof ao === 'object' && !Array.isArray(ao)) {
    const c = ao as Record<string, unknown>;
    const pgAo = numOk(c.percentualGordura, 0);
    if (pgAo !== null) out.analiseObesidade = { percentualGordura: pgAo };
  }

  const mmSeg = parseMassaMagra(o.massaMagraSegmentar);
  if (mmSeg) out.massaMagraSegmentar = mmSeg;

  const gs = parseMassaMagra(o.gorduraSegmentar);
  if (gs) out.gorduraSegmentar = gs;

  const av = o.avisos;
  if (Array.isArray(av)) {
    out.avisos = av.map((x) => String(x).trim()).filter(Boolean);
  }

  syncLegadoFromExtended(out);
  out.origemExame = inferirOrigemIA(o, out.avisos);

  return out;
}

function mergeSegmento(
  base: SegmentoBioImpedancia,
  ext?: Partial<SegmentoBioImpedancia>
): SegmentoBioImpedancia {
  if (!ext) return base;
  return {
    kg: ext.kg !== undefined && ext.kg !== null && ext.kg > 0 ? ext.kg : base.kg,
    percentual:
      ext.percentual !== undefined && ext.percentual !== null && ext.percentual > 0
        ? ext.percentual
        : base.percentual,
  };
}

function mergeMassaMagra(
  base: MassaMagraSegmentar,
  ext: Partial<MassaMagraSegmentar> | null | undefined
): MassaMagraSegmentar {
  if (!ext) return base;
  const keys = ['arm_r', 'arm_l', 'trunk', 'leg_r', 'leg_l'] as const;
  const next = { ...base };
  for (const k of keys) {
    if (ext[k]) next[k] = mergeSegmento(base[k], ext[k]);
  }
  return next;
}

function isPositiveNum(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v) && v > 0;
}

function applyNumField(
  next: Partial<BioImpedanciaRegistro>,
  key: keyof BioImpedanciaRegistro,
  incoming: number | null | undefined,
  prevVal?: number
): void {
  if (!isPositiveNum(incoming)) return;
  if (isPositiveNum(prevVal) && incoming === 0) return;
  (next as Record<string, unknown>)[key as string] = incoming;
}

function mergeComposicao(
  prev: Partial<ComposicaoCorporal> | undefined,
  incoming: Partial<ComposicaoCorporal> | null | undefined
): ComposicaoCorporal {
  const defaults: ComposicaoCorporal = {
    aguaTotalLitros: 0,
    proteinasKg: 0,
    mineraisKg: 0,
    massaGorduraKg: 0,
  };
  const base = { ...defaults, ...prev };
  if (!incoming) return base;
  const next = { ...base };
  (['aguaTotalLitros', 'proteinasKg', 'mineraisKg', 'massaGorduraKg'] as const).forEach((k) => {
    const v = incoming[k];
    if (isPositiveNum(v) || (v === 0 && base[k] === 0)) {
      if (!(v === 0 && base[k] > 0)) next[k] = v ?? base[k];
    }
  });
  return next;
}

function mergeAnaliseMusculo(
  prev: Partial<AnaliseMusculoGordura> | undefined,
  incoming: Partial<AnaliseMusculoGordura> | null | undefined
): AnaliseMusculoGordura {
  const defaults: AnaliseMusculoGordura = { massaMuscularKg: 0, massaGorduraKg: 0 };
  const base = { ...defaults, ...prev };
  if (!incoming) return base;
  const next = { ...base };
  (['massaMuscularKg', 'massaGorduraKg'] as const).forEach((k) => {
    const v = incoming[k];
    if (isPositiveNum(v) || (v === 0 && base[k] === 0)) {
      if (!(v === 0 && base[k] > 0)) next[k] = v ?? base[k];
    }
  });
  return next;
}

/**
 * Mescla extração IA no estado parcial do formulário (sem persistir).
 */
export function aplicarExtracaoBioAoFormulario(
  prev: Partial<BioImpedanciaRegistro>,
  ext: BioImpedanciaExtracaoNormalizada,
  opts: { aplicarData: boolean }
): Partial<BioImpedanciaRegistro> {
  const next: Partial<BioImpedanciaRegistro> = { ...prev };

  if (opts.aplicarData && ext.dataRegistro) {
    const d = dateFromBioDateInput(ext.dataRegistro);
    next.dataRegistro = isBioDateValid(d) ? d : next.dataRegistro;
  }

  applyNumField(next, 'peso', ext.peso, prev.peso);
  applyNumField(next, 'imc', ext.imc, prev.imc);
  applyNumField(next, 'percentualGordura', ext.percentualGordura, prev.percentualGordura);
  applyNumField(next, 'massaGorduraKg', ext.massaGorduraKg, prev.massaGorduraKg);
  applyNumField(next, 'massaMuscularKg', ext.massaMuscularKg, prev.massaMuscularKg);
  applyNumField(next, 'massaMuscularEsqueleticaKg', ext.massaMuscularEsqueleticaKg, prev.massaMuscularEsqueleticaKg);
  applyNumField(next, 'gorduraVisceral', ext.gorduraVisceral, prev.gorduraVisceral);
  applyNumField(next, 'aguaPercentual', ext.aguaPercentual, prev.aguaPercentual);
  applyNumField(next, 'aguaKg', ext.aguaKg, prev.aguaKg);
  applyNumField(next, 'metabolismoBasalKcal', ext.metabolismoBasalKcal, prev.metabolismoBasalKcal);
  applyNumField(next, 'massaOsseaKg', ext.massaOsseaKg, prev.massaOsseaKg);
  applyNumField(next, 'proteinaPercentual', ext.proteinaPercentual, prev.proteinaPercentual);
  applyNumField(next, 'idadeCorporal', ext.idadeCorporal, prev.idadeCorporal);
  applyNumField(next, 'alturaCm', ext.alturaCm, prev.alturaCm);
  applyNumField(next, 'circunferenciaAbdominalCm', ext.circunferenciaAbdominalCm, prev.circunferenciaAbdominalCm);

  if (ext.origemExame) next.origemExame = ext.origemExame;

  if (ext.avisos.length) {
    next.avisosIA = [...(prev.avisosIA ?? []), ...ext.avisos];
  }

  next.composicaoCorporal = mergeComposicao(prev.composicaoCorporal, ext.composicaoCorporal);

  if (isPositiveNum(ext.massaGorduraKg) && next.composicaoCorporal.massaGorduraKg === 0) {
    next.composicaoCorporal = { ...next.composicaoCorporal, massaGorduraKg: ext.massaGorduraKg };
  }
  if (isPositiveNum(ext.aguaKg) && next.composicaoCorporal.aguaTotalLitros === 0) {
    next.composicaoCorporal = { ...next.composicaoCorporal, aguaTotalLitros: ext.aguaKg };
  }

  next.analiseMusculoGordura = mergeAnaliseMusculo(prev.analiseMusculoGordura, ext.analiseMusculoGordura);

  const pgc = ext.percentualGordura ?? ext.analiseObesidade?.percentualGordura;
  if (isPositiveNum(pgc)) {
    next.analiseObesidade = {
      ...prev.analiseObesidade,
      percentualGordura: pgc,
    };
    next.percentualGordura = pgc;
  }

  const mmusc =
    ext.massaMuscularKg ??
    ext.analiseMusculoGordura?.massaMuscularKg ??
    null;
  if (isPositiveNum(mmusc)) {
    next.massaMuscularKg = mmusc;
    next.analiseMusculoGordura = {
      ...next.analiseMusculoGordura,
      massaMuscularKg: mmusc,
    };
  }

  const baseMm =
    prev.massaMagraSegmentar ||
    ({
      arm_r: { kg: 0, percentual: 0 },
      arm_l: { kg: 0, percentual: 0 },
      trunk: { kg: 0, percentual: 0 },
      leg_r: { kg: 0, percentual: 0 },
      leg_l: { kg: 0, percentual: 0 },
    } as MassaMagraSegmentar);

  if (ext.massaMagraSegmentar && Object.keys(ext.massaMagraSegmentar).length) {
    next.massaMagraSegmentar = mergeMassaMagra(baseMm, ext.massaMagraSegmentar);
  }

  const baseGs =
    prev.gorduraSegmentar ||
    ({
      arm_r: { kg: 0, percentual: 0 },
      arm_l: { kg: 0, percentual: 0 },
      trunk: { kg: 0, percentual: 0 },
      leg_r: { kg: 0, percentual: 0 },
      leg_l: { kg: 0, percentual: 0 },
    } as GorduraSegmentar);

  if (ext.gorduraSegmentar && Object.keys(ext.gorduraSegmentar).length) {
    next.gorduraSegmentar = mergeMassaMagra(baseGs, ext.gorduraSegmentar);
  }

  return sincronizarBioRegistroParaPersistencia(next);
}

/** Garante que campos estendidos e legados (aninhados) fiquem alinhados antes de salvar/exibir */
export function sincronizarBioRegistroParaPersistencia(
  state: Partial<BioImpedanciaRegistro>
): Partial<BioImpedanciaRegistro> {
  const next: Partial<BioImpedanciaRegistro> = { ...state };

  const pgc = next.percentualGordura ?? next.analiseObesidade?.percentualGordura;
  if (isPositiveNum(pgc)) {
    next.percentualGordura = pgc;
    next.analiseObesidade = { ...next.analiseObesidade, percentualGordura: pgc };
  }

  const mm = next.massaMuscularKg ?? next.analiseMusculoGordura?.massaMuscularKg;
  if (isPositiveNum(mm)) {
    next.massaMuscularKg = mm;
    next.analiseMusculoGordura = {
      ...(next.analiseMusculoGordura ?? { massaMuscularKg: 0, massaGorduraKg: 0 }),
      massaMuscularKg: mm,
    };
  }

  const mg =
    next.massaGorduraKg ??
    next.analiseMusculoGordura?.massaGorduraKg ??
    next.composicaoCorporal?.massaGorduraKg;
  if (isPositiveNum(mg)) {
    next.massaGorduraKg = mg;
    next.analiseMusculoGordura = {
      ...(next.analiseMusculoGordura ?? { massaMuscularKg: 0, massaGorduraKg: 0 }),
      massaGorduraKg: mg,
    };
    next.composicaoCorporal = {
      ...(next.composicaoCorporal ?? {
        aguaTotalLitros: 0,
        proteinasKg: 0,
        mineraisKg: 0,
        massaGorduraKg: 0,
      }),
      massaGorduraKg: mg,
    };
  }

  const agua = next.aguaKg ?? next.composicaoCorporal?.aguaTotalLitros;
  if (isPositiveNum(agua)) {
    next.aguaKg = agua;
    next.composicaoCorporal = {
      ...(next.composicaoCorporal ?? {
        aguaTotalLitros: 0,
        proteinasKg: 0,
        mineraisKg: 0,
        massaGorduraKg: 0,
      }),
      aguaTotalLitros: agua,
    };
  }

  if (isPositiveNum(next.massaOsseaKg) && !isPositiveNum(next.composicaoCorporal?.mineraisKg)) {
    next.composicaoCorporal = {
      ...(next.composicaoCorporal ?? {
        aguaTotalLitros: 0,
        proteinasKg: 0,
        mineraisKg: 0,
        massaGorduraKg: 0,
      }),
      mineraisKg: next.massaOsseaKg,
    };
  }

  return next;
}
