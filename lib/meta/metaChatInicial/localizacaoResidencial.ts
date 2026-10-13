import type { PacienteCompleto } from '@/types/obesidade';
import {
  interpretPatientLocation,
  type PatientLocationValue,
} from '@/lib/localizacao/patientLocationField';

/** Localização residencial oficial já gravada no paciente, ou null. */
export function localizacaoResidencialOficial(p: PacienteCompleto): PatientLocationValue | null {
  const endereco = p.dadosIdentificacao?.endereco;
  const interpreted = interpretPatientLocation({
    estado: endereco?.estado,
    cidade: endereco?.cidade,
    codigoIbge: endereco?.codigoIbge,
  });
  return interpreted.status === 'valid' ? interpreted.value : null;
}

/**
 * Atualiza só estado, cidade e codigoIbge.
 * Rua, CEP e os demais campos de endereco permanecem.
 * `null` tira a localização do objeto (campos undefined, removidos no save).
 */
export function aplicarLocalizacaoResidencial(
  paciente: PacienteCompleto,
  location: PatientLocationValue | null
): PacienteCompleto {
  return {
    ...paciente,
    dadosIdentificacao: {
      ...paciente.dadosIdentificacao,
      endereco: {
        ...paciente.dadosIdentificacao?.endereco,
        estado: location?.estado,
        cidade: location?.cidade,
        codigoIbge: location?.codigoIbge,
      },
    },
  };
}
