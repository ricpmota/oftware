'use client';

import { X } from 'lucide-react';
import { MarcoZeroTimelineCard } from '@/app/metaadmin/components/paciente-modal/prontuario/MarcoZeroTimelineCard';
import type { MarcoZeroDetalhe } from '@/lib/aplicacao/resolveMarcoZeroDetalhe';

type Props = {
  open: boolean;
  onClose: () => void;
  pacienteNome: string;
  detalhe: MarcoZeroDetalhe;
};

function formatarDataRegistro(value: unknown): string | null {
  if (!value) return null;
  const date =
    value instanceof Date
      ? value
      : typeof (value as { toDate?: () => Date }).toDate === 'function'
        ? (value as { toDate: () => Date }).toDate()
        : new Date(value as string | number);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function MarcoZeroDetalheModal({ open, onClose, pacienteNome, detalhe }: Props) {
  if (!open) return null;

  const dataRegistro = formatarDataRegistro(detalhe.registro.dataRegistro);

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col sm:items-center sm:justify-center sm:bg-black/50 sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="marco-zero-modal-title"
    >
      <div
        className="flex flex-col flex-1 min-h-0 w-full h-full sm:flex-initial sm:h-auto sm:max-w-lg sm:max-h-[88vh] overflow-hidden rounded-none sm:rounded-2xl bg-white dark:bg-gray-900 sm:shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex-shrink-0 flex items-start justify-between gap-3 px-4 sm:px-5 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="min-w-0">
            <h3
              id="marco-zero-modal-title"
              className="text-base sm:text-lg font-bold text-gray-900 dark:text-white leading-snug"
            >
              Marco Zero do Tratamento
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5 truncate">
              {pacienteNome}
              {detalhe.semana > 0 ? ` · Semana ${detalhe.semana}` : ''}
              {dataRegistro ? ` · ${dataRegistro}` : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 dark:hover:text-gray-200 transition-colors"
            aria-label="Fechar"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-4">
          <MarcoZeroTimelineCard marcoZero={detalhe.marcoZero} dataInicio={dataRegistro ?? undefined} />
        </div>
      </div>
    </div>
  );
}
