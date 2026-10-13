'use client';

import { useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Download, FileText, FlaskConical, X } from 'lucide-react';
import { openSolicitacaoExamesPdfUrl } from '@/utils/solicitacaoExamesPdfGenerate';
import type { SolicitacaoExamesSalva } from '@/utils/solicitacaoExamesPdfDownload';

function formatarDataHora(d: Date): string {
  try {
    return d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return '';
  }
}

function resumoExames(exames: string[]): string {
  if (!exames.length) return 'Nenhum exame';
  return exames.join(', ');
}

type SolicitacaoExamesLeituraModalProps = {
  solicitacao: SolicitacaoExamesSalva | null;
  onClose?: () => void;
  variant?: 'modal' | 'panel';
};

function SolicitacaoExamesDocumento({ solicitacao }: { solicitacao: SolicitacaoExamesSalva }) {
  return (
    <div className="border-b border-gray-200 bg-white p-4 text-black dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 sm:p-6">
      <div className="mb-4 flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
        <FlaskConical className="h-5 w-5 shrink-0" />
        <p className="text-sm font-semibold">Requisição de exames laboratoriais</p>
      </div>
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
        Exames solicitados
      </p>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-gray-800 dark:text-gray-200">
        {solicitacao.exames.length > 0 ? (
          solicitacao.exames.map((exame) => <li key={exame}>{exame}</li>)
        ) : (
          <li>Nenhum exame listado</li>
        )}
      </ul>
      {solicitacao.hipoteseDiagnostica.trim() ? (
        <>
          <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Hipótese diagnóstica
          </p>
          <p className="mt-1 whitespace-pre-wrap text-sm text-gray-800 dark:text-gray-200">
            {solicitacao.hipoteseDiagnostica}
          </p>
        </>
      ) : null}
      <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">
        PDF assinado pelo médico — use para realizar os exames.
      </p>
    </div>
  );
}

export default function SolicitacaoExamesLeituraModal({
  solicitacao,
  onClose,
  variant = 'modal',
}: SolicitacaoExamesLeituraModalProps) {
  const fecharModal = useCallback(() => onClose?.(), [onClose]);

  useEffect(() => {
    if (!solicitacao || variant === 'panel') return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') fecharModal();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [solicitacao, fecharModal, variant]);

  const handleBaixar = () => {
    if (solicitacao?.signedPdfUrl) openSolicitacaoExamesPdfUrl(solicitacao.signedPdfUrl);
  };

  if (variant === 'panel') {
    if (!solicitacao) {
      return (
        <div className="flex h-full min-h-[28rem] w-full flex-col items-center justify-center rounded-2xl border border-gray-200 bg-white px-6 text-center shadow-sm dark:border-gray-600 dark:bg-gray-900/40">
          <FileText className="mb-3 h-12 w-12 text-gray-300" />
          <p className="text-sm font-medium text-gray-700 dark:text-gray-200">Selecione um registro</p>
          <p className="mt-1 text-xs text-gray-500">O arquivo aparece nesta coluna.</p>
        </div>
      );
    }

    return (
      <div className="flex h-full min-h-0 w-full flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-600 dark:bg-gray-900/40">
        <div className="shrink-0 border-b border-gray-200 bg-gradient-to-r from-sky-50/50 via-white to-emerald-50/40 px-4 py-3 dark:border-gray-600 dark:from-sky-950/20 dark:via-gray-900 dark:to-emerald-950/20">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Arquivo
              </p>
              <h3 className="mt-0.5 line-clamp-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
                Requisição de exames
              </h3>
              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                {formatarDataHora(solicitacao.criadoEm)}
                {solicitacao.exames.length
                  ? ` · ${solicitacao.exames.length} ${solicitacao.exames.length === 1 ? 'exame' : 'exames'}`
                  : ''}
              </p>
            </div>
            <button
              type="button"
              onClick={handleBaixar}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-green-600 px-3 py-2 text-xs font-medium text-white hover:bg-green-700"
            >
              <Download className="h-4 w-4 shrink-0" />
              Baixar
            </button>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {solicitacao.signedPdfUrl ? (
            <iframe
              title="Requisição de exames"
              src={solicitacao.signedPdfUrl}
              className="h-full min-h-[28rem] w-full border-0 bg-white"
            />
          ) : (
            <SolicitacaoExamesDocumento solicitacao={solicitacao} />
          )}
        </div>
      </div>
    );
  }

  if (!solicitacao || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[10050] flex items-stretch justify-center bg-black/50 sm:items-center sm:p-4"
      role="presentation"
      onClick={fecharModal}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="solicitacao-exames-leitura-titulo"
        className="flex h-[100dvh] max-h-[100dvh] w-full min-h-0 flex-col overflow-hidden border-gray-200 bg-white text-gray-900 shadow-2xl dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 sm:h-auto sm:max-h-[min(90vh,800px)] sm:max-w-2xl sm:rounded-xl sm:border"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-shrink-0 flex-wrap items-start justify-between gap-2 border-b border-gray-200 bg-gray-50/80 px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] dark:border-gray-700 dark:bg-gray-800/80 sm:gap-3">
          <div className="min-w-0 flex-1">
            <h3
              id="solicitacao-exames-leitura-titulo"
              className="pr-2 text-base font-bold text-black line-clamp-2 dark:text-white sm:text-lg"
            >
              Requisição de exames
            </h3>
            <p className="mt-0.5 text-xs text-gray-600 dark:text-gray-400">
              {formatarDataHora(solicitacao.criadoEm)}
            </p>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
              {resumoExames(solicitacao.exames)}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={handleBaixar}
              className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-2.5 py-2 text-xs font-medium text-white hover:bg-green-700 sm:gap-2 sm:px-3 sm:text-sm"
            >
              <Download className="h-4 w-4 shrink-0" />
              Baixar
            </button>
            <button
              type="button"
              onClick={fecharModal}
              className="rounded-lg p-2 text-gray-600 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-700"
              aria-label="Fechar"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          {solicitacao.signedPdfUrl ? (
            <iframe
              title="Requisição de exames"
              src={solicitacao.signedPdfUrl}
              className="h-full min-h-[60vh] w-full border-0 bg-white"
            />
          ) : (
            <SolicitacaoExamesDocumento solicitacao={solicitacao} />
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
