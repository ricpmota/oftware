'use client';

import type { PacienteCompleto } from '@/types/obesidade';
import ProfissionalPrescricoesPacienteReadonlyTab from '@/components/profissional/prescricao/ProfissionalPrescricoesPacienteReadonlyTab';

type Props = {
  paciente: PacienteCompleto;
};

/**
 * Prescrições MetaPsi — chrome MetaNutri (busca, abas, split), somente leitura.
 */
export default function MetaPsiPrescricoesReadonlyTab({ paciente }: Props) {
  return <ProfissionalPrescricoesPacienteReadonlyTab paciente={paciente} />;
}
