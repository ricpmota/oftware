'use client';

import { useState } from 'react';
import { MODALIDADES_BASE_OPCOES } from '@/lib/treatment-negotiation/constants';
import type { ModalidadePlanoAutomaticoId } from '@/lib/treatment-negotiation/types';

type Props = {
  open: boolean;
  onClose: () => void;
  onConfirmar: (modalidadeBase: ModalidadePlanoAutomaticoId) => void;
};

export default function CriarPlanoPersonalizadoDialog({ open, onClose, onConfirmar }: Props) {
  const [selecionada, setSelecionada] = useState<ModalidadePlanoAutomaticoId>('trimestral');

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 p-4"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-slate-200 p-5"
        role="dialog"
        aria-modal="true"
        aria-labelledby="criar-plano-personalizado-titulo"
        onClick={(e) => e.stopPropagation()}
      >
        <h3
          id="criar-plano-personalizado-titulo"
          className="text-lg font-semibold text-slate-900"
        >
          Criar Plano Personalizado
        </h3>
        <p className="text-sm text-slate-600 mt-1">
          Deseja utilizar qual plano como base?
        </p>

        <fieldset className="mt-4 space-y-2">
          {MODALIDADES_BASE_OPCOES.map((op) => (
            <label
              key={op.id}
              className={`flex items-center gap-3 rounded-xl border px-4 py-3 cursor-pointer transition-colors ${
                selecionada === op.id
                  ? 'border-amber-400 bg-amber-50 ring-1 ring-amber-400/40'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <input
                type="radio"
                name="modalidade-base"
                value={op.id}
                checked={selecionada === op.id}
                onChange={() => setSelecionada(op.id)}
                className="text-amber-600 focus:ring-amber-500"
              />
              <span className="text-sm font-medium text-slate-900">{op.rotulo}</span>
            </label>
          ))}
        </fieldset>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => onConfirmar(selecionada)}
            className="px-4 py-2 text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 rounded-lg"
          >
            Duplicar e editar
          </button>
        </div>
      </div>
    </div>
  );
}
