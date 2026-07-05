'use client';

import { useState } from 'react';
import { ClipboardList, Loader2 } from 'lucide-react';
import { abrirPropostaPlanoPacienteMeta } from '@/lib/planoTerapeutico/abrirPropostaPlanoPacienteMeta';
import { planoPacienteJaAssinou } from '@/lib/planoTerapeutico/planoTerapeuticoStatusUi';
import type { PlanoTerapeuticoInterativoDocumento } from '@/types/planoTerapeuticoInterativo';

export type PropostaPlanoPagamentosButtonProps = {
  pacienteId: string;
  plano: PlanoTerapeuticoInterativoDocumento | null;
  className?: string;
  /** Largura total — uso no rodapé do modal de pagamentos. */
  fullWidth?: boolean;
};

export default function PropostaPlanoPagamentosButton({
  pacienteId,
  plano,
  className = '',
  fullWidth = false,
}: PropostaPlanoPagamentosButtonProps) {
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  if (!plano) return null;

  const assinado = planoPacienteJaAssinou(plano);

  const handleClick = async () => {
    setLoading(true);
    setErro(null);
    try {
      const result = await abrirPropostaPlanoPacienteMeta({ pacienteId, plano });
      if (!result.ok) setErro(result.error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={`flex flex-col gap-1 ${fullWidth ? 'w-full items-stretch' : 'items-end'} ${className}`.trim()}
    >
      <button
        type="button"
        onClick={() => void handleClick()}
        disabled={loading}
        className={`inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm font-semibold text-emerald-800 transition-colors hover:bg-emerald-100 disabled:opacity-60 dark:border-emerald-800/50 dark:bg-emerald-950/40 dark:text-emerald-200 dark:hover:bg-emerald-900/50 ${
          fullWidth ? 'w-full justify-center' : ''
        }`}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin shrink-0" aria-hidden />
        ) : (
          <ClipboardList className="h-4 w-4 shrink-0" aria-hidden />
        )}
        {loading ? 'Abrindo…' : assinado ? 'Proposta assinada' : 'Proposta'}
      </button>
      {erro ? (
        <p
          className={`text-xs text-red-600 dark:text-red-400 leading-snug ${
            fullWidth ? 'text-center' : 'max-w-[200px] text-right'
          }`}
        >
          {erro}
        </p>
      ) : null}
    </div>
  );
}
