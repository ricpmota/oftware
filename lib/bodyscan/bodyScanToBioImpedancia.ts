/**
 * Converte um BodyScan concluído em registro de bioimpedância (estimativa por imagem).
 */

import type { BioImpedanciaRegistro, MassaMagraSegmentar } from '@/types/bioImpedancia';
import type { BodyScanPublicView } from '@/lib/bodyscan/bodyScanSerialize';
import { sincronizarBioRegistroParaPersistencia } from '@/lib/metaadmin/bioImpedanciaExtracao';
import { dateFromBioDateInput, formatBioDateInputLocal, parseBioDataRegistro } from '@/utils/bioImpedanciaDate';
import { newBioRegistroId } from '@/utils/bioImpedanciaRegistroId';

function emptySegmentar(): MassaMagraSegmentar {
  const z = { kg: 0, percentual: 0 };
  return { arm_r: z, arm_l: z, trunk: z, leg_r: z, leg_l: z };
}

/** Chave de calendário local YYYY-MM-DD. */
export function bioCalendarDayKey(value: unknown): string {
  return formatBioDateInputLocal(parseBioDataRegistro(value));
}

export function findBioRegistrosSameDay(
  registros: BioImpedanciaRegistro[],
  dayKey: string
): BioImpedanciaRegistro[] {
  return registros.filter((r) => bioCalendarDayKey(r.dataRegistro) === dayKey);
}

/**
 * Monta BioImpedanciaRegistro a partir do BodyScan (semana analisada).
 * `dataRegistroYmd` sobrescreve a data do scan (fluxo "outra data").
 */
export function buildBioRegistroFromBodyScan(
  scan: BodyScanPublicView,
  options?: { dataRegistroYmd?: string }
): BioImpedanciaRegistro | null {
  if (scan.status !== 'completed' || !scan.analysisAvailable) return null;

  const weightKg = Number(scan.input.weightKg);
  if (!Number.isFinite(weightKg) || weightKg <= 0) return null;

  const fatPct = Number(scan.bodyFat?.estimatedCentralPercent);
  const fatMass = Number(scan.estimatedFatMassKg?.central);
  const fatFree = Number(scan.estimatedFatFreeMassKg?.central);

  const dayYmd =
    (options?.dataRegistroYmd && /^\d{4}-\d{2}-\d{2}/.test(options.dataRegistroYmd)
      ? options.dataRegistroYmd.slice(0, 10)
      : null) ||
    (scan.date && /^\d{4}-\d{2}-\d{2}/.test(scan.date) ? scan.date.slice(0, 10) : null) ||
    formatBioDateInputLocal(new Date());

  const dataRegistro = dateFromBioDateInput(dayYmd);

  const partial = sincronizarBioRegistroParaPersistencia({
    origemExame: 'outro',
    dataRegistro,
    peso: weightKg,
    imc: Number.isFinite(scan.input.bmi) ? scan.input.bmi : undefined,
    alturaCm: Number.isFinite(scan.input.heightCm) ? scan.input.heightCm : undefined,
    circunferenciaAbdominalCm:
      scan.input.abdominalCircumferenceCm != null &&
      Number.isFinite(scan.input.abdominalCircumferenceCm)
        ? scan.input.abdominalCircumferenceCm
        : undefined,
    percentualGordura: Number.isFinite(fatPct) && fatPct > 0 ? fatPct : undefined,
    massaGorduraKg: Number.isFinite(fatMass) && fatMass > 0 ? fatMass : undefined,
    // Massa livre de gordura estimada → campo de massa muscular quando disponível
    // (melhor aproximação no modelo atual de bioimpedância).
    massaMuscularKg: Number.isFinite(fatFree) && fatFree > 0 ? fatFree : undefined,
    composicaoCorporal: {
      aguaTotalLitros: 0,
      proteinasKg: 0,
      mineraisKg: 0,
      massaGorduraKg: Number.isFinite(fatMass) && fatMass > 0 ? fatMass : 0,
    },
    analiseMusculoGordura: {
      massaMuscularKg: Number.isFinite(fatFree) && fatFree > 0 ? fatFree : 0,
      massaGorduraKg: Number.isFinite(fatMass) && fatMass > 0 ? fatMass : 0,
    },
    analiseObesidade: {
      percentualGordura: Number.isFinite(fatPct) && fatPct > 0 ? fatPct : 0,
    },
    massaMagraSegmentar: emptySegmentar(),
    gorduraSegmentar: emptySegmentar(),
  });

  if (
    !partial.peso ||
    !partial.composicaoCorporal ||
    !partial.analiseMusculoGordura ||
    !partial.analiseObesidade ||
    !partial.massaMagraSegmentar
  ) {
    return null;
  }

  const id = newBioRegistroId(dataRegistro);
  const reg: BioImpedanciaRegistro = {
    id,
    dataRegistro,
    peso: partial.peso,
    composicaoCorporal: partial.composicaoCorporal,
    analiseMusculoGordura: partial.analiseMusculoGordura,
    analiseObesidade: partial.analiseObesidade,
    massaMagraSegmentar: partial.massaMagraSegmentar,
    gorduraSegmentar: partial.gorduraSegmentar || emptySegmentar(),
    origemExame: 'outro',
  };

  const ext = [
    'imc',
    'percentualGordura',
    'massaGorduraKg',
    'massaMuscularKg',
    'circunferenciaAbdominalCm',
    'alturaCm',
  ] as const;
  for (const key of ext) {
    const v = partial[key];
    if (v != null) (reg as Record<string, unknown>)[key] = v;
  }

  return reg;
}
