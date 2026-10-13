'use client';

import type { PacienteCompleto } from '@/types/obesidade';
import ProfissionalExamesPacienteTab from '@/components/profissional/exames/ProfissionalExamesPacienteTab';

type Props = {
  paciente: PacienteCompleto;
  patientPhotoUrl?: string | null;
};

/**
 * Exames MetaPsi — reutiliza o chrome MetaNutri (verde, datas | resultados, lab cards).
 * Somente leitura.
 */
export default function MetaPsiExamesReadonlyTab({ paciente, patientPhotoUrl }: Props) {
  return <ProfissionalExamesPacienteTab paciente={paciente} patientPhotoUrl={patientPhotoUrl} />;
}
