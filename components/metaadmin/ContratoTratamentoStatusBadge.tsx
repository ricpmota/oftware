'use client';

import type { ContratoTratamentoStatusAssinatura } from '@/lib/documentos/contrato-tratamento/contratoTratamentoTypes';
import {
  CONTRATO_TRATAMENTO_STATUS_BADGE_LABELS,
  contratoTratamentoStatusBadgeClass,
} from '@/lib/documentos/contrato-tratamento/contratoTratamentoStatusUi';

export type ContratoTratamentoStatusBadgeProps = {
  status: ContratoTratamentoStatusAssinatura;
  className?: string;
};

export default function ContratoTratamentoStatusBadge({
  status,
  className = '',
}: ContratoTratamentoStatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold leading-tight ${contratoTratamentoStatusBadgeClass(status)} ${className}`}
    >
      {CONTRATO_TRATAMENTO_STATUS_BADGE_LABELS[status]}
    </span>
  );
}
