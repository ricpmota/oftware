'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import type { PacienteCompleto } from '@/types/obesidade';
import PerfilMetabolicoV3ChatUI from '@/components/meta/PerfilMetabolicoV3ChatUI';
import { getPerfilMetabolicoStepForCard } from '@/lib/meta/perfilMetabolicoCardSteps';

/** Acima dos modais de paciente mobile/desktop no metaadmin (z-[9999]). */
const MODAL_Z_INDEX_CLASS = 'z-[10050]';

type Props = {
  open: boolean;
  cardId: string;
  cardTitle: string;
  paciente: PacienteCompleto;
  onClose: () => void;
  onSave: (paciente: PacienteCompleto) => void;
};

export function PerfilMetabolicoCardEditModal({
  open,
  cardId,
  cardTitle,
  paciente,
  onClose,
  onSave,
}: Props) {
  const [draft, setDraft] = useState<PacienteCompleto>(paciente);
  const [mounted, setMounted] = useState(false);
  const step = getPerfilMetabolicoStepForCard(cardId);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (open) {
      setDraft(paciente);
    }
  }, [open, paciente, cardId]);

  useEffect(() => {
    if (!open || typeof document === 'undefined') return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open || step == null || !mounted || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className={`fixed inset-0 ${MODAL_Z_INDEX_CLASS} flex items-stretch justify-center bg-black/50 sm:items-center sm:p-4`}
      role="presentation"
      onClick={onClose}
    >
      <div
        className="flex h-[100dvh] max-h-[100dvh] w-full min-h-0 flex-col overflow-hidden bg-white shadow-2xl dark:bg-gray-900 sm:h-auto sm:max-h-[min(90vh,720px)] sm:max-w-lg sm:rounded-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="perfil-metabolico-edit-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-gray-200 px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] dark:border-gray-700">
          <h3 id="perfil-metabolico-edit-title" className="min-w-0 text-base font-semibold text-gray-900 dark:text-white">
            Editar — {cardTitle}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800"
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">
          <PerfilMetabolicoV3ChatUI step={step} paciente={draft} setPaciente={setDraft} wizardMode />
        </div>

        <div className="flex shrink-0 justify-end gap-2 border-t border-gray-200 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] dark:border-gray-700">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => onSave(draft)}
            className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700"
          >
            Salvar
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
