import type { DadosClinicos, PacienteCompleto } from '@/types/obesidade';

/**
 * Semana 1 / Marco Zero: peso (e circunferência, se informada) do registro
 * passam a ser o baseline da anamnese (`dadosClinicos.medidasIniciais`).
 * Preserva campos existentes (altura, circunferenciaNaoInformada, etc.) e recalcula IMC.
 */
export function pacienteComMedidasIniciaisAtualizadasPelaSemana1(
  paciente: PacienteCompleto,
  weekIndex: number,
  pesoRegistro: number | undefined,
  circunferenciaRegistro: number | undefined
): PacienteCompleto {
  if (weekIndex !== 1) return paciente;

  const dc = paciente.dadosClinicos || ({} as DadosClinicos);
  const prev = dc.medidasIniciais;
  const pesoNovo =
    pesoRegistro != null && !Number.isNaN(pesoRegistro) && pesoRegistro > 0
      ? pesoRegistro
      : prev?.peso ?? 0;
  const circNova =
    circunferenciaRegistro != null && !Number.isNaN(circunferenciaRegistro)
      ? circunferenciaRegistro
      : prev?.circunferenciaAbdominal ?? 0;
  const altura = prev?.altura ?? 0;
  let imc = prev?.imc ?? 0;
  if (altura > 0 && pesoNovo > 0) {
    const h = altura / 100;
    imc = Number((pesoNovo / (h * h)).toFixed(1));
  }

  return {
    ...paciente,
    dadosClinicos: {
      ...dc,
      medidasIniciais: {
        ...prev,
        peso: pesoNovo,
        altura,
        imc,
        circunferenciaAbdominal: circNova,
      },
    },
  };
}

/** Patch Firestore (dotted paths) para a mesma regra da semana 1 / Marco Zero. */
export function medidasIniciaisSemana1FirestorePatch(
  paciente: PacienteCompleto,
  weekIndex: number,
  peso: number,
  circunferenciaAbdominal: number | undefined
): Record<string, unknown> {
  if (weekIndex !== 1) return {};

  const patch: Record<string, unknown> = {
    'dadosClinicos.medidasIniciais.peso': peso,
  };

  if (circunferenciaAbdominal != null && !Number.isNaN(circunferenciaAbdominal)) {
    patch['dadosClinicos.medidasIniciais.circunferenciaAbdominal'] = circunferenciaAbdominal;
  }

  const alturaCm = paciente.dadosClinicos?.medidasIniciais?.altura;
  if (typeof alturaCm === 'number' && alturaCm > 0 && peso > 0) {
    const altM = alturaCm / 100;
    patch['dadosClinicos.medidasIniciais.imc'] = Math.round((peso / (altM * altM)) * 10) / 10;
  }

  return patch;
}
