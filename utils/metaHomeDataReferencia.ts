import type { BioImpedanciaRegistro } from '@/types/bioImpedancia';
import type { PacienteCompleto } from '@/types/obesidade';
import { parseBioDataRegistro, formatBioRegistroPtBr } from '@/utils/bioImpedanciaDate';

export function metaHomeDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function endOfDay(d: Date): number {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x.getTime();
}

function parseEvolucaoDate(raw: unknown): Date | null {
  if (!raw) return null;
  const d = raw instanceof Date ? raw : new Date(raw as string | number);
  return Number.isNaN(d.getTime()) ? null : d;
}

export interface MetaHomeReferenciaOption {
  key: string;
  date: Date;
  label: string;
}

export function buildMetaHomeReferenciaOptions(paciente: PacienteCompleto | null): MetaHomeReferenciaOption[] {
  const byKey = new Map<string, Date>();
  const evolucao = paciente?.evolucaoSeguimento || [];

  for (const e of evolucao) {
    const d = parseEvolucaoDate(e.dataRegistro);
    if (!d) continue;
    const key = metaHomeDateKey(d);
    if (!byKey.has(key)) byKey.set(key, d);
  }

  const bios = (paciente as { bioimpedanciaRegistros?: BioImpedanciaRegistro[] })?.bioimpedanciaRegistros || [];
  for (const b of bios) {
    const d = parseBioDataRegistro(b.dataRegistro);
    const key = metaHomeDateKey(d);
    if (!byKey.has(key)) byKey.set(key, d);
  }

  return Array.from(byKey.entries())
    .map(([key, date]) => ({ key, date, label: formatBioRegistroPtBr(date) }))
    .sort((a, b) => b.date.getTime() - a.date.getTime());
}

export function resolveMetaHomeReferenciaDate(
  options: MetaHomeReferenciaOption[],
  selectedKey: string | null
): Date | null {
  if (!options.length) return null;
  if (selectedKey) {
    const hit = options.find((o) => o.key === selectedKey);
    if (hit) return hit.date;
  }
  return options[0].date;
}

type EvolucaoItem = {
  dataRegistro?: Date | string | number;
  peso?: number | null;
  circunferenciaAbdominal?: number | null;
  weekIndex?: number;
  numeroSemana?: number;
};

export function getEvolucaoAteData(evolucao: EvolucaoItem[], refDate: Date): EvolucaoItem | null {
  const limit = endOfDay(refDate);
  const sorted = [...evolucao]
    .filter((e) => parseEvolucaoDate(e.dataRegistro))
    .sort((a, b) => parseEvolucaoDate(a.dataRegistro)!.getTime() - parseEvolucaoDate(b.dataRegistro)!.getTime());

  let last: EvolucaoItem | null = null;
  for (const e of sorted) {
    const t = parseEvolucaoDate(e.dataRegistro)!.getTime();
    if (t <= limit) last = e;
    else break;
  }
  return last;
}

export function getEvolucaoAnterior(evolucao: EvolucaoItem[], atual: EvolucaoItem | null): EvolucaoItem | null {
  if (!atual?.dataRegistro) return null;
  const tAtual = parseEvolucaoDate(atual.dataRegistro)!.getTime();
  const sorted = [...evolucao]
    .filter((e) => parseEvolucaoDate(e.dataRegistro))
    .sort((a, b) => parseEvolucaoDate(b.dataRegistro)!.getTime() - parseEvolucaoDate(a.dataRegistro)!.getTime());

  return sorted.find((e) => parseEvolucaoDate(e.dataRegistro)!.getTime() < tAtual) ?? null;
}

export function getBioAteData(registros: BioImpedanciaRegistro[], refDate: Date): BioImpedanciaRegistro | null {
  const limit = endOfDay(refDate);
  const sorted = [...registros].sort(
    (a, b) => parseBioDataRegistro(a.dataRegistro).getTime() - parseBioDataRegistro(b.dataRegistro).getTime()
  );

  let last: BioImpedanciaRegistro | null = null;
  for (const r of sorted) {
    const t = parseBioDataRegistro(r.dataRegistro).getTime();
    if (t <= limit) last = r;
    else break;
  }
  return last;
}

export function getBioAnterior(registros: BioImpedanciaRegistro[], atual: BioImpedanciaRegistro | null): BioImpedanciaRegistro | null {
  if (!atual) return null;
  const tAtual = parseBioDataRegistro(atual.dataRegistro).getTime();
  const sorted = [...registros].sort(
    (a, b) => parseBioDataRegistro(b.dataRegistro).getTime() - parseBioDataRegistro(a.dataRegistro).getTime()
  );
  return sorted.find((r) => parseBioDataRegistro(r.dataRegistro).getTime() < tAtual) ?? null;
}

export function getPesoNaDataReferencia(
  evolucao: EvolucaoItem[],
  bios: BioImpedanciaRegistro[],
  refDate: Date,
  pesoInicial: number | null | undefined
): number | null {
  const ev = getEvolucaoAteData(evolucao, refDate);
  if (ev?.peso && ev.peso > 0) return ev.peso;
  const bio = getBioAteData(bios, refDate);
  if (bio?.peso && bio.peso > 0) return bio.peso;
  if (pesoInicial != null && pesoInicial > 0) return pesoInicial;
  return null;
}
