'use client';

import { FileText } from 'lucide-react';
import { CONTRATO_TRATAMENTO_ITEM_NOME } from '@/lib/documentos/contrato-tratamento/contratoTratamentoConstants';
import type { ContratoTratamentoStatusAssinatura } from '@/lib/documentos/contrato-tratamento/contratoTratamentoTypes';
import { CONTRATO_TRATAMENTO_STATUS_BADGE_LABELS } from '@/lib/documentos/contrato-tratamento/contratoTratamentoStatusUi';
import ContratoTratamentoStatusBadge from '@/components/metaadmin/ContratoTratamentoStatusBadge';

export type ContratoTratamentoListaItemProps = {
  onClick: () => void;
  isSelected?: boolean;
  statusAssinatura?: ContratoTratamentoStatusAssinatura;
  /** desktop = lista lateral compacta; mobile = cards maiores no modal */
  variant?: 'desktop' | 'mobile';
};

/**
 * Item fixo "Contrato de Tratamento" dentro da pasta Base do Tratamento.
 * Estilo alinhado aos botões de prescrição existentes, sem alterar o layout geral.
 */
export default function ContratoTratamentoListaItem({
  onClick,
  isSelected = false,
  statusAssinatura = 'rascunho',
  variant = 'desktop',
}: ContratoTratamentoListaItemProps) {
  if (variant === 'mobile') {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`w-full text-left px-4 py-3.5 rounded-xl border shadow-sm transition-all duration-200 hover:shadow-md active:scale-[0.99] text-base ${
          isSelected
            ? 'border-amber-500 bg-amber-50 ring-2 ring-amber-200'
            : 'border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50/90 hover:border-amber-300'
        }`}
      >
        <div className="flex items-start justify-between gap-2">
          <span className="text-base font-medium text-gray-900">📄 {CONTRATO_TRATAMENTO_ITEM_NOME}</span>
          <ContratoTratamentoStatusBadge status={statusAssinatura} />
        </div>
        <span className="block text-sm text-gray-600 mt-1">
          Status: <span className="font-medium">{CONTRATO_TRATAMENTO_STATUS_BADGE_LABELS[statusAssinatura]}</span>
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left px-3 py-3 rounded-xl border shadow-sm transition-all duration-200 hover:shadow-md active:scale-[0.99] ${
        isSelected
          ? 'border-amber-500 bg-amber-50 ring-2 ring-amber-200'
          : 'border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50/90 hover:border-amber-300'
      }`}
    >
      <div className="flex items-start gap-2">
        <FileText className="w-4 h-4 text-amber-700 mt-0.5 shrink-0" aria-hidden />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className={`text-sm font-medium truncate ${isSelected ? 'text-amber-900' : 'text-gray-900'}`}>
              📄 {CONTRATO_TRATAMENTO_ITEM_NOME}
            </p>
            <ContratoTratamentoStatusBadge status={statusAssinatura} className="shrink-0" />
          </div>
          <p className="text-xs text-gray-600 mt-1">
            Status:{' '}
            <span className="font-medium text-gray-800">
              {CONTRATO_TRATAMENTO_STATUS_BADGE_LABELS[statusAssinatura]}
            </span>
          </p>
        </div>
      </div>
    </button>
  );
}
