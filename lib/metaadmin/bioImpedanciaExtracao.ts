import type {
  BioImpedanciaRegistro,
  ComposicaoCorporal,
  AnaliseMusculoGordura,
  AnaliseObesidade,
  MassaMagraSegmentar,
  GorduraSegmentar,
  SegmentoBioImpedancia,
} from '@/types/bioImpedancia';
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
};

const MUSC_ALIASES: Record<string, keyof AnaliseMusculoGordura> = {
  massamuscularkg: 'massaMuscularKg',
  smm: 'massaMuscularKg',
  skeletalmusclemass: 'massaMuscularKg',
  musclemass: 'massaMuscularKg',
  massamuscular: 'massaMuscularKg',
  slm: 'massaMuscularKg',
  massagordurakg: 'massaGorduraKg',
  massadegordura: 'massaGorduraKg',
};

const PGC_ALIASES = new Set(['percentualgordura', 'pbf', 'percentbodyfat', 'bodyfatpercent', 'bfpercent', 'bf', 'gorduracorporal']);

function normKey(k: string): string {
  return k
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[\s._-]/g, '')
    .toLowerCase();
}

/** Replica chaves alternativas (InBody/misto PT-EN) para o formato esperado pelo app */
function canonicalizeBioIaRoot(o: Record<string, unknown>): Record<string, unknown> {
  const next: Record<string, unknown> = { ...o };

  const comp: Record<string, unknown> =
    o.composicaoCorporal && typeof o.composicaoCorporal === 'object' && !Array.isArray(o.composicaoCorporal)
      ? { ...(o.composicaoCorporal as Record<string, unknown>) }
      : {};

  const assignComp = (key: keyof ComposicaoCorporal, val: unknown) => {
    if (val === undefined || val === null) return;
    if (comp[key] === undefined || comp[key] === null) comp[key] = val;
  };

  for (const [rawK, val] of Object.entries(o)) {
    if (rawK === 'composicaoCorporal' || rawK === 'analiseMusculoGordura' || rawK === 'analiseObesidade') continue;
    const nk = normKey(rawK);
    const c = COMP_ALIASES[nk];
    if (c) assignComp(c, val);
  }

  for (const [rawK, val] of Object.entries(comp)) {
    const nk = normKey(rawK);
    const c = COMP_ALIASES[nk] ?? (['aguaTotalLitros', 'proteinasKg', 'mineraisKg', 'massaGorduraKg'].includes(rawK) ? (rawK as keyof ComposicaoCorporal) : null);
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

  for (const [rawK, val] of Object.entries(amg)) {
    const nk = normKey(rawK);
    const m = MUSC_ALIASES[nk] ?? (['massaMuscularKg', 'massaGorduraKg'].includes(rawK) ? (rawK as keyof AnaliseMusculoGordura) : null);
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

  if (typeof ao.percentualGordura === 'number' || typeof ao.percentualGordura === 'string') {
    next.analiseObesidade = ao;
  }

  const normSegBlock = (raw: unknown): Record<string, unknown> | undefined => {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined;
    const src = raw as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(src)) {
      const nk = normKey(k);
      const canon = SEG_ALIASES[nk] ?? (['arm_r', 'arm_l', 'trunk', 'leg_r', 'leg_l'].includes(k) ? (k as string) : null);
      if (canon) out[canon] = v;
    }
    return Object.keys(out).length ? out : undefined;
  };

  const mm = normSegBlock(o.massaMagraSegmentar);
  if (mm) next.massaMagraSegmentar = mm;

  const gs = normSegBlock(o.gorduraSegmentar);
  if (gs) next.gorduraSegmentar = gs;

  if (o.peso === undefined || o.peso === null || o.peso === '') {
    for (const [rawK, val] of Object.entries(o)) {
      const nk = normKey(rawK);
      if (nk === 'weight' || nk === 'peso' || nk === 'bodyweight' || nk === 'pesocorporal') {
        next.peso = val;
        break;
      }
    }
  }

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
    if (seg) {
      (out as Record<string, SegmentoBioImpedancia>)[k] = seg;
      any = true;
    }
  }
  return any ? out : null;
}

export interface BioImpedanciaExtracaoNormalizada {
  dataRegistro: string | null;
  peso: number | null;
  composicaoCorporal: Partial<ComposicaoCorporal> | null;
  analiseMusculoGordura: Partial<AnaliseMusculoGordura> | null;
  analiseObesidade: Partial<AnaliseObesidade> | null;
  massaMagraSegmentar: Partial<MassaMagraSegmentar> | null;
  gorduraSegmentar: Partial<GorduraSegmentar> | null;
  avisos: string[];
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

  const dr = o.dataRegistro;
  const drNorm = parseDataRegistroIA(dr);
  if (drNorm) out.dataRegistro = drNorm;

  const peso = numOk(o.peso, 0.1);
  if (peso !== null) out.peso = peso;

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
    const pg = numOk(c.percentualGordura, 0);
    if (pg !== null) out.analiseObesidade = { percentualGordura: pg };
  }

  const mm = parseMassaMagra(o.massaMagraSegmentar);
  if (mm) out.massaMagraSegmentar = mm;

  const gs = parseMassaMagra(o.gorduraSegmentar);
  if (gs) out.gorduraSegmentar = gs;

  const av = o.avisos;
  if (Array.isArray(av)) {
    out.avisos = av.map((x) => String(x).trim()).filter(Boolean);
  }

  return out;
}

function mergeSegmento(
  base: SegmentoBioImpedancia,
  ext?: Partial<SegmentoBioImpedancia>
): SegmentoBioImpedancia {
  if (!ext) return base;
  return {
    kg: ext.kg !== undefined && ext.kg !== null ? ext.kg : base.kg,
    percentual: ext.percentual !== undefined && ext.percentual !== null ? ext.percentual : base.percentual,
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

  if (ext.peso !== null) {
    next.peso = ext.peso;
  }

  if (ext.composicaoCorporal && Object.keys(ext.composicaoCorporal).length) {
    next.composicaoCorporal = {
      aguaTotalLitros: 0,
      proteinasKg: 0,
      mineraisKg: 0,
      massaGorduraKg: 0,
      ...prev.composicaoCorporal,
      ...ext.composicaoCorporal,
    };
  }

  if (ext.analiseMusculoGordura && Object.keys(ext.analiseMusculoGordura).length) {
    next.analiseMusculoGordura = {
      massaMuscularKg: 0,
      massaGorduraKg: 0,
      ...prev.analiseMusculoGordura,
      ...ext.analiseMusculoGordura,
    };
  }

  if (ext.analiseObesidade?.percentualGordura != null) {
    next.analiseObesidade = {
      ...prev.analiseObesidade,
      percentualGordura: ext.analiseObesidade.percentualGordura,
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

  return next;
}
