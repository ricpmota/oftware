'use client';

import { useMemo } from 'react';
import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import type { PacienteCompleto } from '@/types/obesidade';
import { EsquemaDosesPlanejadasChart } from '@/components/metaadmin/EsquemaDosesPlanejadasChart';
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
  readOnly?: boolean;
};

export function EsquemaDosesPorSemanaEditorMobile({
  paciente,
  setPacienteEditando,
  planoTerapeuticoMobile,
  dataAplicacaoFocoRef,
  readOnly = false,
}: Props) {
  const merged = useMemo(
    () => mergePacienteComPlanoMobileForm(paciente, planoTerapeuticoMobile),
    [paciente, planoTerapeuticoMobile]
  );

  if (!planoTerapeuticoMobile.startDate || !planoTerapeuticoMobile.numeroSemanasTratamento || !merged) {
    return null;
  }

  return (
    <div className="space-y-4">
      <EsquemaDosesPorSemanaEditor
        paciente={merged}
        setPaciente={(next) => {
          if (readOnly) return;
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
        readOnly={readOnly}
      />
      <EsquemaDosesPlanejadasChart paciente={merged} />
    </div>
  );
}
