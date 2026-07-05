'use client';

import { useEffect, useState } from 'react';
import type { RetinaMeiosOpticos } from '@/types/oftpay/retinaMap';
import {
  RETINA_MEIOS_OPTICOS_LABELS,
  RETINA_MEIOS_OPTICOS_OPTIONS,
} from '@/types/oftpay/retinaMap';
import { X } from 'lucide-react';

interface RetinaMeiosOpticosModalProps {
  open: boolean;
  eye: 'OD' | 'OE';
  current: RetinaMeiosOpticos | null;
  onConfirm: (value: RetinaMeiosOpticos) => void;
  onCancel: () => void;
}

export default function RetinaMeiosOpticosModal({
  open,
  eye,
  current,
  onConfirm,
  onCancel,
}: RetinaMeiosOpticosModalProps) {
  const [selected, setSelected] = useState<RetinaMeiosOpticos>('transparentes');

  useEffect(() => {
    if (open) {
      setSelected(current ?? 'transparentes');
    }
  }, [open, current]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="meios-opticos-title"
    >
      <div className="w-full max-w-md rounded-xl bg-white shadow-xl border border-gray-200">
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
          <div>
            <p className="text-xs font-medium text-violet-600">Passo 1 — Vítreo / Meios ópticos</p>
            <h2 id="meios-opticos-title" className="text-sm font-semibold text-gray-900">
              Opacidade do exame — {eye}
            </h2>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg p-1 text-gray-500 hover:bg-gray-100"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto px-4 py-3">
          <p className="mb-3 text-xs text-gray-600">
            O laudo começa pela descrição do vítreo e meios ópticos. Selecione a opacidade que limita
            a visualização do fundo.
          </p>
          <div className="space-y-1.5">
            {RETINA_MEIOS_OPTICOS_OPTIONS.map((opt) => (
              <label
                key={opt}
                className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2.5 text-sm transition-colors ${
                  selected === opt
                    ? 'border-violet-400 bg-violet-50 text-violet-950'
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <input
                  type="radio"
                  name="meios-opticos"
                  value={opt}
                  checked={selected === opt}
                  onChange={() => setSelected(opt)}
                  className="text-violet-600"
                />
                {RETINA_MEIOS_OPTICOS_LABELS[opt]}
              </label>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-gray-100 px-4 py-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => onConfirm(selected)}
            className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700"
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}
