/** Doses disponíveis (mg) para tirzepatida no plano / esquema. */
export const DOSES_MG_TIRZEPATIDA = [1.25, 2.5, 5, 7.5, 10, 12.5, 15] as const;

export type DoseMgTirzepatida = (typeof DOSES_MG_TIRZEPATIDA)[number];

export const DOSE_MG_MAX_TIRZEPATIDA = 15;

/** Incremento automático a cada 4 semanas (titulação). */
export const DOSE_TITULACAO_INCREMENTO_MG = 2.5;

export const DOSE_INICIAL_PADRAO_MG = 2.5;

export function formatarDoseMgLabel(mg: number): string {
  const s = Number.isInteger(mg) ? String(mg) : mg.toFixed(2).replace(/\.?0+$/, '');
  return `${s} mg`;
}

/** Arredonda para a menor opção cadastrada >= valor (teto 15 mg). */
export function snapDoseMgTirzepatida(mg: number): DoseMgTirzepatida {
  const capped = Math.min(Math.max(mg, DOSES_MG_TIRZEPATIDA[0]), DOSE_MG_MAX_TIRZEPATIDA);
  for (const d of DOSES_MG_TIRZEPATIDA) {
    if (d >= capped - 1e-6) return d;
  }
  return DOSE_MG_MAX_TIRZEPATIDA;
}

/**
 * Titulação automática: +2,5 mg a cada 4 semanas desde o último ciclo, teto 15 mg.
 */
export function calcularDoseTitulacaoMg(doseInicialMg: number, semanasDesdeUltimoCiclo: number): number {
  const base = Number.isFinite(doseInicialMg) && doseInicialMg > 0 ? doseInicialMg : DOSE_INICIAL_PADRAO_MG;
  const incrementos = Math.floor(Math.max(0, semanasDesdeUltimoCiclo) / 4);
  const raw = base + incrementos * DOSE_TITULACAO_INCREMENTO_MG;
  return snapDoseMgTirzepatida(Math.min(raw, DOSE_MG_MAX_TIRZEPATIDA));
}

export function isDoseMgTirzepatidaValida(mg: unknown): mg is DoseMgTirzepatida {
  const n = typeof mg === 'number' ? mg : parseFloat(String(mg));
  return DOSES_MG_TIRZEPATIDA.some((d) => Math.abs(d - n) < 1e-6);
}
