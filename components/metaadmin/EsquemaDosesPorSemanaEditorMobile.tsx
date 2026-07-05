'use client';

import { useMemo } from 'react';
import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import type { PacienteCompleto } from '@/types/obesidade';
import { EsquemaDosesPorSemanaEditor } from '@/components/metaadmin/EsquemaDosesPorSemanaEditor';
import {
  mergePacienteComPlanoMobileForm,
  type PlanoMobileFormSlice,
} from '@/utils/esquemaDosesSemana';

type Props = {
  paciente: PacienteCompleto;
  setPacienteEditando: Dispatch<SetStateAction<PacienteCompleto | null>>;
  planoTerapeuticoMobile: PlanoMobileFormSlice;
  dataAplicacaoFocoRef: MutableRefObject<{ semana: number; valor: string } | null>;
};

export function EsquemaDosesPorSemanaEditorMobile({
  paciente,
  setPacienteEditando,
  planoTerapeuticoMobile,
  dataAplicacaoFocoRef,
}: Props) {
  const merged = useMemo(
    () => mergePacienteComPlanoMobileForm(paciente, planoTerapeuticoMobile),
    [paciente, planoTerapeuticoMobile]
  );

  if (!planoTerapeuticoMobile.startDate || !planoTerapeuticoMobile.numeroSemanasTratamento || !merged) {
    return null;
  }

  return (
    <EsquemaDosesPorSemanaEditor
      paciente={merged}
      setPaciente={(next) => {
        setPacienteEditando((prev) => {
          if (!prev) return prev;
          const base = mergePacienteComPlanoMobileForm(prev, planoTerapeuticoMobile);
          if (!base) return prev;
          const resolved = typeof next === 'function' ? next(base) : next;
          if (!resolved?.planoTerapeutico) return prev;
          const pt = resolved.planoTerapeutico;
          return {
            ...prev,
            planoTerapeutico: {
              ...prev.planoTerapeutico,
              metas: prev.planoTerapeutico?.metas ?? pt.metas,
              esquemaDosesCustomizado: pt.esquemaDosesCustomizado,
              datasAplicacaoIndividuais: pt.datasAplicacaoIndividuais,
              semanasCanceladas: pt.semanasCanceladas,
            },
          };
        });
      }}
      dataAplicacaoFocoRef={dataAplicacaoFocoRef}
    />
  );
}
