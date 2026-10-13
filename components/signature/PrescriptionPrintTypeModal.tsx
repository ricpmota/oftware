'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import type { PrescriptionPrintLanguage } from '@/types/prescriptionPrintLanguage';
import type { PrescriptionPrintType } from '@/types/prescriptionPrintType';

export const PRESCRIPTION_PRINT_TYPE_PORTAL_Z_INDEX = 10350;

export type PrescriptionPrintTypeModalProps = {
  open: boolean;
  onClose: () => void;
  onSelect: (type: PrescriptionPrintType, language: PrescriptionPrintLanguage) => void;
  portalZIndex?: number;
};

export default function PrescriptionPrintTypeModal({
  open,
  onClose,
  onSelect,
  portalZIndex = PRESCRIPTION_PRINT_TYPE_PORTAL_Z_INDEX,
}: PrescriptionPrintTypeModalProps) {
  const [language, setLanguage] = useState<PrescriptionPrintLanguage>('pt');

  useEffect(() => {
    if (open) setLanguage('pt');
  }, [open]);

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

        <div className="mb-4 rounded-lg border border-gray-200 bg-gray-50 px-3 py-3">
          <div className="flex items-center justify-between gap-3">
            <span
              className={`text-sm ${language === 'pt' ? 'font-semibold text-gray-900' : 'text-gray-500'}`}
            >
              Português
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={language === 'en'}
              aria-label={language === 'en' ? 'Idioma da receita: inglês' : 'Idioma da receita: português'}
              onClick={() => setLanguage((current) => (current === 'pt' ? 'en' : 'pt'))}
              className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
                language === 'en' ? 'bg-teal-700' : 'bg-gray-300'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${
                  language === 'en' ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
            <span
              className={`text-sm ${language === 'en' ? 'font-semibold text-gray-900' : 'text-gray-500'}`}
            >
              Inglês
            </span>
          </div>
          <p className="mt-2 text-xs text-gray-500">
            {language === 'en'
              ? 'A receita será traduzida para inglês, impressa e salva nesse idioma.'
              : 'A receita será impressa em português.'}
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => onSelect('simple', language)}
            className="w-full px-4 py-2.5 text-sm font-medium text-gray-800 bg-gray-100 rounded-lg hover:bg-gray-200 text-left"
          >
            Prescrição simples
            <span className="block text-xs font-normal text-gray-500 mt-0.5">
              Formato atual de prescrição médica.
            </span>
          </button>

          <button
            type="button"
            onClick={() => onSelect('controle_especial', language)}
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
