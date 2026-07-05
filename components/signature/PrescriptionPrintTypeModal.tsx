'use client';

import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import type { PrescriptionPrintType } from '@/types/prescriptionPrintType';

export const PRESCRIPTION_PRINT_TYPE_PORTAL_Z_INDEX = 10350;

export type PrescriptionPrintTypeModalProps = {
  open: boolean;
  onClose: () => void;
  onSelect: (type: PrescriptionPrintType) => void;
  portalZIndex?: number;
};

export default function PrescriptionPrintTypeModal({
  open,
  onClose,
  onSelect,
  portalZIndex = PRESCRIPTION_PRINT_TYPE_PORTAL_Z_INDEX,
}: PrescriptionPrintTypeModalProps) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center p-4 bg-black/50"
      style={{ zIndex: portalZIndex }}
      role="presentation"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl max-w-md w-full p-6"
        role="dialog"
        aria-modal="true"
        aria-labelledby="prescription-print-type-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 mb-4">
          <h2 id="prescription-print-type-title" className="text-lg font-semibold text-gray-900">
            Tipo de receituário
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1"
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="text-sm text-gray-600 mb-4">
          Deseja gerar como Receituário de Controle Especial?
        </p>

        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => onSelect('simple')}
            className="w-full px-4 py-2.5 text-sm font-medium text-gray-800 bg-gray-100 rounded-lg hover:bg-gray-200 text-left"
          >
            Prescrição simples
            <span className="block text-xs font-normal text-gray-500 mt-0.5">
              Formato atual de prescrição médica.
            </span>
          </button>

          <button
            type="button"
            onClick={() => onSelect('controle_especial')}
            className="w-full px-4 py-2.5 text-sm font-medium text-white bg-teal-700 rounded-lg hover:bg-teal-800 text-left"
          >
            Receituário de Controle Especial
            <span className="block text-xs font-normal text-teal-100 mt-0.5">
              PDF em 2 vias — 1ª Farmácia e 2ª Paciente.
            </span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="w-full px-4 py-2 text-sm text-gray-600 hover:text-gray-800 mt-1"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
