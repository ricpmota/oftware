import type { PacienteCompleto } from '@/types/obesidade';
import {
  interpretPatientLocation,
  isPatientLocationAcceptable,
  type PatientLocationInterpretation,
} from '@/lib/localizacao/patientLocationField';

export const LOCALIZACAO_ADMIN_INVALIDA =
  'Selecione um município oficial ou deixe o estado e a cidade em branco.';

/** Aceita localização oficial completa ou ausência completa. Texto livre não passa. */
export function mensagemLocalizacaoAdministrativa(
  paciente: PacienteCompleto,
  rascunho?: PatientLocationInterpretation | null
): string | null {
  if (rascunho && !isPatientLocationAcceptable(rascunho, false)) {
    return LOCALIZACAO_ADMIN_INVALIDA;
  }
  const gravada = interpretPatientLocation(paciente.dadosIdentificacao?.endereco);
  if (!isPatientLocationAcceptable(gravada, false)) return LOCALIZACAO_ADMIN_INVALIDA;
  return null;
}
