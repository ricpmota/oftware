import type { BioImpedanciaRegistro } from '@/types/bioImpedancia';
import { parseBioDataRegistro } from '@/utils/bioImpedanciaDate';

export type BioTrendDir = 'up' | 'down' | 'same' | 'none';

export function formatBioMetricDisplay(v: number, unit: string): string {
  const dec = unit === '%' ? 1 : Math.abs(v) >= 100 ? 1 : Math.abs(v) >= 10 ? 1 : 2;
  return `${v.toFixed(dec)} ${unit}`;
}

export function bioTrendDir(atual: number, anterior: number): BioTrendDir {
  const d = atual - anterior;
  const tol = Math.max(0.005, Math.abs(atual) * 1e-6);
  if (Math.abs(d) <= tol) return 'same';
  return d > 0 ? 'up' : 'down';
}

export function bioFieldTrend(
  anteriorRec: BioImpedanciaRegistro | null,
  atualRec: BioImpedanciaRegistro,
  getVal: (r: BioImpedanciaRegistro) => number | undefined | null
): BioTrendDir {
  if (!anteriorRec) return 'none';
  const a = getVal(atualRec);
  const b = getVal(anteriorRec);
  if (a == null || b == null) return 'none';
  if (typeof a !== 'number' || typeof b !== 'number') return 'none';
  if (!Number.isFinite(a) || !Number.isFinite(b)) return 'none';
  return bioTrendDir(a, b);
}

export function findRegistroAnteriorCronologico(
  todos: BioImpedanciaRegistro[],
  atual: BioImpedanciaRegistro
): BioImpedanciaRegistro | null {
  if (todos.length < 2) return null;
  const tAtual = parseBioDataRegistro(atual.dataRegistro).getTime();
  let melhor: BioImpedanciaRegistro | null = null;
  let melhorT = -Infinity;
  for (const r of todos) {
    const t = parseBioDataRegistro(r.dataRegistro).getTime();
    if (t < tAtual && t > melhorT) {
      melhorT = t;
      melhor = r;
    }
  }
  return melhor;
}
