'use client';

import { useEffect } from 'react';
import { createPortal } from 'react-dom';

type Props = {
  pacienteNome: string;
  onNao: () => void;
  onSim: () => void;
};

export default function ConfirmarObservacaoProntuarioModal({ pacienteNome, onNao, onSim }: Props) {
  const nome = pacienteNome.trim().split(/\s+/).find((part) => part.length > 0) || 'o paciente';

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopPropagation();
      onNao();
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [onNao]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <button type="button" className="absolute inset-0 bg-black/45" aria-label="Não" onClick={onNao} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="obs-prontuario-title"
        className="relative w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-5 shadow-xl"
      >
        <h3 id="obs-prontuario-title" className="text-center text-base font-semibold leading-snug text-gray-900">
          Deseja adicionar observação da consulta no Prontuário do paciente?
        </h3>
        <p className="mt-2 text-center text-sm text-gray-500">
          A consulta com {nome} foi marcada como realizada.
        </p>
        <div className="mt-5 flex items-center gap-3">
          <button
            type="button"
            onClick={onNao}
            className="flex-1 rounded-xl bg-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-300"
          >
            Não
          </button>
          <button
            type="button"
            autoFocus
            onClick={onSim}
            className="flex-1 rounded-xl bg-green-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-700"
          >
            Sim
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
