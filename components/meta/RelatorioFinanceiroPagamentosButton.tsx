'use client';

import { useState } from 'react';
import { FileText, Loader2 } from 'lucide-react';
import { openRelatorioFinanceiroLink } from '@/lib/metaadmin/openRelatorioFinanceiroLink';

export type RelatorioFinanceiroPagamentosButtonProps = {
  pacienteId: string;
  className?: string;
  /** Largura total — uso no rodapé do modal de pagamentos. */
  fullWidth?: boolean;
};

export default function RelatorioFinanceiroPagamentosButton({
  pacienteId,
  className = '',
  fullWidth = false,
}: RelatorioFinanceiroPagamentosButtonProps) {
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const handleClick = async () => {
    const id = pacienteId.trim();
    if (!id) return;
    setLoading(true);
    setErro(null);
    try {
      const result = await openRelatorioFinanceiroLink(id);
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
        disabled={loading || !pacienteId.trim()}
        className={`inline-flex items-center gap-2 rounded-xl border border-teal-200 bg-teal-50 px-3 py-2.5 text-sm font-semibold text-teal-800 transition-colors hover:bg-teal-100 disabled:opacity-60 dark:border-teal-800/50 dark:bg-teal-950/40 dark:text-teal-200 dark:hover:bg-teal-900/50 ${
          fullWidth ? 'w-full justify-center' : ''
        }`}
        title="Abrir relatório financeiro do paciente"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin shrink-0" aria-hidden />
        ) : (
          <FileText className="h-4 w-4 shrink-0" aria-hidden />
        )}
        {loading ? 'Abrindo…' : 'Relatório'}
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
