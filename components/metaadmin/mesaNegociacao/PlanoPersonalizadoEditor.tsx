'use client';

import PlanoPersonalizadoEditorCompleto from '@/components/metaadmin/mesaNegociacao/PlanoPersonalizadoEditorCompleto';
import type { OrcamentoTerapeuticoConfig } from '@/types/orcamentoTerapeuticoConfig';
import type { ParametrosPlanoPersonalizadoEditavel } from '@/lib/treatment-negotiation/types';

type Props = {
  parametros: ParametrosPlanoPersonalizadoEditavel;
  configuracaoComercial: OrcamentoTerapeuticoConfig;
  medicoId?: string;
  onChange: (parametros: ParametrosPlanoPersonalizadoEditavel) => void;
};

export default function PlanoPersonalizadoEditor({
  parametros,
  configuracaoComercial,
  medicoId,
  onChange,
}: Props) {
  return (
    <PlanoPersonalizadoEditorCompleto
      parametros={parametros}
      configuracaoComercial={configuracaoComercial}
      medicoId={medicoId}
      onChange={onChange}
    />
  );
}
