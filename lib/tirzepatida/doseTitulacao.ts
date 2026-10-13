/** Degraus comerciais usados na titulação automática (snap). */
export const DOSES_MG_TIRZEPATIDA = [1.25, 2.5, 5, 7.5, 10, 12.5, 15] as const;

export type DoseMgTirzepatida = (typeof DOSES_MG_TIRZEPATIDA)[number];

export const DOSE_MG_MIN_TIRZEPATIDA = 1.25;
export const DOSE_MG_MAX_TIRZEPATIDA = 15;

/** Passo do seletor manual (esquema / aplicação). Não altera a titulação automática. */
export const PASSO_DOSE_MG_TIRZEPATIDA = 1.25;

/** Incremento automático a cada 4 semanas (titulação). */
export const DOSE_TITULACAO_INCREMENTO_MG = 2.5;

export const DOSE_INICIAL_PADRAO_MG = 2.5;

export function formatarDoseMgNumero(mg: number): string {
  const rounded = Math.round(mg * 100) / 100;
  if (Number.isInteger(rounded)) return String(rounded);
  return rounded.toFixed(2).replace(/\.?0+$/, '').replace('.', ',');
}

export function formatarDoseMgLabel(mg: number): string {
  return `${formatarDoseMgNumero(mg)} mg`;
}

/** Arredonda para o múltiplo de 1,25 mg mais próximo. */
export function arredondarDoseMgPasso(mg: number): number {
  if (!Number.isFinite(mg)) return DOSE_INICIAL_PADRAO_MG;
  const steps = Math.round(mg / PASSO_DOSE_MG_TIRZEPATIDA);
  return Math.round(steps * PASSO_DOSE_MG_TIRZEPATIDA * 100) / 100;
}

/** Dose escolhível no stepper: 1,25 … 15, de 1,25 em 1,25. */
export function clampDoseMgTirzepatidaCustom(mg: number): number {
  if (!Number.isFinite(mg)) return DOSE_INICIAL_PADRAO_MG;
  const rounded = arredondarDoseMgPasso(mg);
  return Math.min(DOSE_MG_MAX_TIRZEPATIDA, Math.max(DOSE_MG_MIN_TIRZEPATIDA, rounded));
}

export function ajustarDoseMgTirzepatidaCustom(mg: number, direction: 1 | -1): number {
  return clampDoseMgTirzepatidaCustom(mg + direction * PASSO_DOSE_MG_TIRZEPATIDA);
}

export function listarDosesMgTirzepatidaPasso(): number[] {
  const n =
    Math.round((DOSE_MG_MAX_TIRZEPATIDA - DOSE_MG_MIN_TIRZEPATIDA) / PASSO_DOSE_MG_TIRZEPATIDA) + 1;
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    out.push(Math.round((DOSE_MG_MIN_TIRZEPATIDA + i * PASSO_DOSE_MG_TIRZEPATIDA) * 100) / 100);
  }
  return out;
}

export function parseDoseMgInput(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) return value;
  if (typeof value === 'string') {
    const parsed = parseFloat(value.trim().replace(',', '.'));
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }
  return null;
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
