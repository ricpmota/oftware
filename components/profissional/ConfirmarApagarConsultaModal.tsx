'use client';

import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

function primeiroNome(nome: string): string {
  const first = nome.trim().split(/\s+/).find((part) => part.length > 0);
  return first || 'o paciente';
}

type ModalProps = {
  pacienteNome: string;
  onNao: () => void;
  onSim: () => void;
};

export default function ConfirmarApagarConsultaModal({ pacienteNome, onNao, onSim }: ModalProps) {
  const nome = primeiroNome(pacienteNome);

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
        aria-labelledby="apagar-consulta-title"
        className="relative w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-5 shadow-xl"
      >
        <h3 id="apagar-consulta-title" className="text-center text-base font-semibold leading-snug text-gray-900">
          Tem certeza que deseja apagar a Consulta com {nome}?
        </h3>
        <p className="mt-2 text-center text-sm text-gray-500">
          Isso apaga o agendamento. A disponibilidade do dia não será removida.
        </p>
        <div className="mt-5 flex items-center gap-3">
          <button
            type="button"
            onClick={onSim}
            className="flex-1 rounded-xl bg-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-300"
          >
            Sim
          </button>
          <button
            type="button"
            autoFocus
            onClick={onNao}
            className="flex-1 rounded-xl bg-green-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-700"
          >
            Não
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export function useConfirmarApagarConsulta() {
  const [pending, setPending] = useState<{ nome: string; run: () => void } | null>(null);

  const confirmarApagarConsulta = useCallback((pacienteNome: string, onConfirm: () => void) => {
    setPending({ nome: pacienteNome, run: onConfirm });
  }, []);

  const fechar = useCallback(() => setPending(null), []);

  const confirmarApagarConsultaModal = pending ? (
    <ConfirmarApagarConsultaModal
      pacienteNome={pending.nome}
      onNao={fechar}
      onSim={() => {
        const run = pending.run;
        setPending(null);
        run();
      }}
    />
  ) : null;

  return {
    confirmarApagarConsulta,
    confirmarApagarConsultaModal,
    apagarConsultaPendente: Boolean(pending),
  };
}
