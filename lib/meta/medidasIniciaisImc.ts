import type { PacienteCompleto } from '@/types/obesidade';

export type MedidasIniciaisLike = {
  peso?: number;
  altura?: number;
  imc?: number;
  circunferenciaAbdominal?: number;
  circunferenciaNaoInformada?: boolean;
};

/** IMC (kg/m²) a partir de peso (kg) e altura (cm). */
export function calcularImcFromPesoAlturaCm(peso: number, alturaCm: number): number | null {
  const p = Number(peso);
  const a = Number(alturaCm);
  if (!Number.isFinite(p) || !Number.isFinite(a) || p <= 0 || a <= 0) return null;
  const alturaMetros = a / 100;
  const imc = p / (alturaMetros * alturaMetros);
  if (!Number.isFinite(imc) || imc <= 0) return null;
  return Math.round(imc * 100) / 100;
}

/** Preenche `imc` quando peso e altura estão disponíveis (fonte única para chat e Firestore). */
export function ensureImcOnMedidasIniciais<T extends MedidasIniciaisLike>(medidas: T): T {
  const imcCalc = calcularImcFromPesoAlturaCm(medidas.peso ?? 0, medidas.altura ?? 0);
  if (imcCalc == null) return medidas;
  return { ...medidas, imc: imcCalc };
}

export function ensureImcOnPaciente(paciente: PacienteCompleto): PacienteCompleto {
  const mi = paciente.dadosClinicos?.medidasIniciais;
  if (!mi) return paciente;
  const nextMi = ensureImcOnMedidasIniciais(mi);
  if (nextMi.imc === mi.imc) return paciente;
  return {
    ...paciente,
    dadosClinicos: {
      ...paciente.dadosClinicos,
      medidasIniciais: nextMi,
    },
  };
}
