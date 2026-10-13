'use client';

import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Loader2, Printer, X } from 'lucide-react';
import { WorkoutPrintDocument } from '@/components/personal/print/WorkoutPrintDocument';
import type { WorkoutPrintData } from '@/lib/personal/workoutPrint';
import { downloadWorkoutPdfComoImpressao } from '@/utils/workoutPdfDownload';

export function WorkoutPrintModal({
  open,
  data,
  onClose,
  zIndexClass = 'z-[10050]',
}: {
  open: boolean;
  data: WorkoutPrintData | null;
  onClose: () => void;
  zIndexClass?: string;
}) {
  const [imprimindo, setImprimindo] = useState(false);

  const fecharModal = useCallback(() => onClose(), [onClose]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') fecharModal();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, fecharModal]);

  const handleImprimir = async () => {
    if (!data) return;
    setImprimindo(true);
    try {
      await downloadWorkoutPdfComoImpressao(data);
    } catch (e) {
      console.error(e);
      const msg = e instanceof Error ? e.message : 'Erro ao gerar o treino para impressão.';
      alert(msg);
    } finally {
      setImprimindo(false);
    }
  };

  if (!open || !data || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className={`fixed inset-0 ${zIndexClass} flex items-stretch justify-center sm:items-center sm:p-4 bg-black/50`}
      role="presentation"
      onClick={fecharModal}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="treino-print-titulo"
        className="bg-white text-gray-900 flex flex-col overflow-hidden border-gray-200
          h-[100dvh] max-h-[100dvh] w-full min-h-0 sm:h-auto sm:max-h-[min(90vh,800px)] sm:max-w-2xl sm:rounded-xl shadow-2xl sm:border"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex-shrink-0 flex flex-wrap items-start justify-between gap-2 sm:gap-3 px-4 py-3 border-b border-gray-200 bg-gray-50/80 pt-[max(0.75rem,env(safe-area-inset-top))]">
          <div className="min-w-0 flex-1">
            <h3 id="treino-print-titulo" className="text-base sm:text-lg font-bold text-black line-clamp-2 pr-2">
              Imprimir treino
            </h3>
            <p className="text-xs text-gray-600 mt-0.5">Data de impressão: {data.printedAt}</p>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              type="button"
              onClick={() => void handleImprimir()}
              disabled={imprimindo}
              className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-2 text-xs sm:text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-60"
            >
              {imprimindo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4 shrink-0" />}
              Imprimir
            </button>
            <button
              type="button"
              onClick={fecharModal}
              className="p-2 rounded-lg text-gray-600 hover:bg-gray-200"
              aria-label="Fechar"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <WorkoutPrintDocument data={data} />
        </div>
      </div>
    </div>,
    document.body
  );
}

export default WorkoutPrintModal;
