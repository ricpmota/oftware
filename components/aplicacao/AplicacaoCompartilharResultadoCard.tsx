'use client';

import { useState } from 'react';
import { Share2 } from 'lucide-react';
import { ModalResultadoTratamento } from '@/components/paciente/ModalResultadoTratamento';
import type { PacienteCompleto } from '@/types/obesidade';

export function AplicacaoPerguntaCompartilharResultadoModal({
  open,
  onMeuResultado,
  onNao,
}: {
  open: boolean;
  onMeuResultado: () => void;
  onNao: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-3 text-center">
          Compartilhe seu resultado
        </h3>
        <p className="text-sm text-slate-600 mb-4 text-center">
          Abra o resumo da sua evolução para tirar um print e mostrar o que você conquistou.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            type="button"
            onClick={onMeuResultado}
            className="px-6 py-3 bg-sky-700 hover:bg-sky-800 text-white rounded-lg font-medium"
          >
            Meu resultado
          </button>
          <button
            type="button"
            onClick={onNao}
            className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg font-medium"
          >
            Não
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AplicacaoCompartilharResultadoCard({
  paciente,
  open: openProp,
  onOpenChange,
}: {
  paciente: PacienteCompleto | null | undefined;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [openInterno, setOpenInterno] = useState(false);
  const controlado = openProp !== undefined;
  const open = controlado ? openProp : openInterno;
  const setOpen = (next: boolean) => {
    onOpenChange?.(next);
    if (!controlado) setOpenInterno(next);
  };

  if (!paciente?.id) return null;

  return (
    <>
      <div className="rounded-xl bg-sky-50 border border-sky-200 p-4 mt-4">
        <h3 className="text-sm font-semibold text-slate-900 mb-2">Compartilhe seu resultado</h3>
        <p className="text-xs text-slate-600 mb-3">
          Abra o resumo da sua evolução para tirar um print e mostrar o que você conquistou.
        </p>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-sky-700 hover:bg-sky-800 text-white rounded-lg text-sm font-medium"
        >
          <Share2 size={18} />
          Ver meu resultado
        </button>
      </div>
      <ModalResultadoTratamento
        open={open}
        data={null}
        paciente={paciente}
        estrelas={0}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
