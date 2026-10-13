'use client';

import PsiquiatriaContent from '@/components/psiquiatria/PsiquiatriaContent';

type Props = {
  pacienteId: string;
};

/**
 * Tab Psiquiatria no /metapsi — owner do módulo clínico.
 * Delega ao componente compartilhado (sem persistência nesta etapa).
 */
export default function MetaPsiPsiquiatriaTab({ pacienteId }: Props) {
  return <PsiquiatriaContent pacienteId={pacienteId} mode="owner" />;
}
