'use client';

import type { PacienteCompleto, SeguimentoSemanal } from '@/types/obesidade';
import type { MarcoZero } from '@/types/obesidade';
import { MetaAplicacaoCheckInSection } from '@/components/meta/MetaAplicacaoCheckInSection';
import { MarcoZeroResumoSection } from '@/components/meta/MarcoZeroResumoSection';

type Props = {
  paciente: PacienteCompleto;
  registro: SeguimentoSemanal | null;
  semana: number;
};

function obterMarcoZero(
  paciente: PacienteCompleto,
  registro: SeguimentoSemanal | null
): MarcoZero | null {
  if (paciente.marcoZero) return paciente.marcoZero;
  if (registro?.marcoZero) return registro.marcoZero;
  return null;
}

export function MetaAplicacaoResumoSection({ paciente, registro, semana }: Props) {
  if (semana === 1) {
    const marco = obterMarcoZero(paciente, registro);
    if (marco) {
      return <MarcoZeroResumoSection marcoZero={marco} />;
    }
    return null;
  }

  return <MetaAplicacaoCheckInSection paciente={paciente} registro={registro} />;
}
