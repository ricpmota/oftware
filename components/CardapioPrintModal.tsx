'use client';

import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Loader2, Printer, X } from 'lucide-react';
import type { CardapioPdfContext } from '@/types/cardapioPrint';
import { downloadCardapioPdfComoImpressao } from '@/utils/cardapioPdfDownload';

export type CardapioPrintModalProps = {
  open: boolean;
  contexto: CardapioPdfContext | null;
  onClose: () => void;
  zIndexClass?: string;
};

/**
 * Modal de impressão do cardápio (fluxo alinhado a PrescricaoLeituraModal: preview + botão verde Imprimir).
 * PDF sem assinatura ao final.
 */
export default function CardapioPrintModal({
  open,
  contexto,
  onClose,
  zIndexClass = 'z-[10050]',
}: CardapioPrintModalProps) {
  const [imprimindo, setImprimindo] = useState(false);

  const fecharModal = useCallback(() => onClose(), [onClose]);

  useEffect(() => {
    if (!open) return;
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
  }, [open, fecharModal]);

  const handleImprimir = async () => {
    if (!contexto) return;
    setImprimindo(true);
    try {
      await downloadCardapioPdfComoImpressao(contexto);
    } catch (e) {
      console.error(e);
      const msg = e instanceof Error ? e.message : 'Erro ao gerar PDF.';
      alert(msg);
    } finally {
      setImprimindo(false);
    }
  };

  if (!open || !contexto || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className={`fixed inset-0 ${zIndexClass} flex items-stretch justify-center sm:items-center sm:p-4 bg-black/50`}
      role="presentation"
      onClick={fecharModal}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="cardapio-print-titulo"
        className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 flex flex-col overflow-hidden border-gray-200 dark:border-gray-700
          h-[100dvh] max-h-[100dvh] w-full min-h-0 sm:h-auto sm:max-h-[min(90vh,800px)] sm:max-w-2xl sm:rounded-xl shadow-2xl sm:border"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex-shrink-0 flex flex-wrap items-start justify-between gap-2 sm:gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-800/80
            pt-[max(0.75rem,env(safe-area-inset-top))]"
        >
          <div className="min-w-0 flex-1">
            <h3 id="cardapio-print-titulo" className="text-base sm:text-lg font-bold text-black dark:text-white line-clamp-2 pr-2">
              Imprimir cardápio
            </h3>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
              Gerado em {contexto.dataImpressao}
            </p>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              type="button"
              onClick={handleImprimir}
              disabled={imprimindo}
              className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-2 text-xs sm:text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-60"
            >
              {imprimindo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4 shrink-0" />}
              Imprimir
            </button>
            <button
              type="button"
              onClick={fecharModal}
              className="p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
              aria-label="Fechar"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div className="cardapio-preview-print border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-black dark:text-gray-100">
            <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex justify-between items-start gap-4">
                <div>
                  <div className="text-lg font-bold text-[#2c3e50] dark:text-gray-100 leading-tight">CARDÁPIO</div>
                  <div className="text-[9px] sm:text-xs text-[#2c3e50] dark:text-gray-300 mt-1">Plano alimentar</div>
                </div>
                <img
                  src="/icones/logotipo-metodo-28.png"
                  alt=""
                  className="h-8 sm:h-10 w-auto object-contain shrink-0"
                />
              </div>
            </div>

            <div className="p-4 sm:p-6 space-y-4">
              <div className="text-sm space-y-1">
                <p>Paciente: {contexto.pacienteNome}</p>
                {contexto.pacienteCpf ? <p>CPF: {contexto.pacienteCpf}</p> : null}
              </div>

              {contexto.refeicoes.map((ref) => (
                <div key={ref.nomeRefeicao} className="border-t border-gray-200 dark:border-gray-700 pt-4 first:border-t-0 first:pt-0">
                  <div className="text-sm font-bold text-[#2c3e50] dark:text-gray-100">{ref.nomeRefeicao}</div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5 italic">Escolha: {ref.tituloOpcao}</p>
                  {ref.itens.length > 0 ? (
                    <div className="mt-2 overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
                      <table className="w-full text-xs sm:text-sm">
                        <thead className="bg-gray-50 dark:bg-gray-800/80 text-gray-600 dark:text-gray-300">
                          <tr>
                            <th className="px-2 py-2 text-left font-semibold">Item</th>
                            <th className="px-2 py-2 text-right font-semibold w-20">Prot.</th>
                            <th className="px-2 py-2 text-right font-semibold w-24">Kcal</th>
                          </tr>
                        </thead>
                        <tbody>
                          {ref.itens.map((row, idx) => (
                            <tr key={`${ref.nomeRefeicao}-${idx}`} className="border-t border-gray-100 dark:border-gray-700">
                              <td className="px-2 py-2 text-gray-800 dark:text-gray-200">{row.descricao}</td>
                              <td className="px-2 py-2 text-right whitespace-nowrap">
                                {row.proteinaG > 0 ? `${row.proteinaG.toFixed(1)} g` : '-'}
                              </td>
                              <td className="px-2 py-2 text-right whitespace-nowrap">
                                {row.kcal > 0 ? `${Math.round(row.kcal)}` : '-'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500 mt-2">Sem itens detalhados nesta refeição.</p>
                  )}
                </div>
              ))}

              <div>
                <div className="text-sm font-bold text-[#2c3e50] dark:text-gray-100 mb-2">Resumo total do dia</div>
                <div className="overflow-x-auto rounded-xl border border-slate-300 dark:border-slate-600 shadow-sm">
                  <table className="w-full text-xs sm:text-sm border-collapse">
                    <thead className="bg-slate-100 dark:bg-slate-800/90">
                      <tr className="border-b border-slate-300 dark:border-slate-600">
                        <th className="px-2 py-2 text-left font-bold uppercase tracking-wide text-[11px] text-slate-700 dark:text-slate-200">Refeição</th>
                        <th className="px-2 py-2 text-right font-bold uppercase tracking-wide text-[11px] text-slate-700 dark:text-slate-200">Prot. atual/prev.</th>
                        <th className="px-2 py-2 text-right font-bold uppercase tracking-wide text-[11px] text-slate-700 dark:text-slate-200">Kcal atual/prev.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {contexto.resumoDia.map((linha, index) => (
                        <tr
                          key={linha.nome}
                          className={`border-t border-slate-200 dark:border-slate-700 ${
                            index % 2 === 1 ? 'bg-slate-50/70 dark:bg-slate-800/30' : 'bg-white dark:bg-transparent'
                          }`}
                        >
                          <td className="px-2 py-2 font-medium text-slate-800 dark:text-slate-100">{linha.nome}</td>
                          <td className="px-2 py-2 text-right whitespace-nowrap text-slate-700 dark:text-slate-200">
                            {linha.protAtual.toFixed(1)}/{linha.protPrev.toFixed(1)} g
                          </td>
                          <td className="px-2 py-2 text-right whitespace-nowrap text-slate-700 dark:text-slate-200">
                            {Math.round(linha.kcalAtual)}/{linha.kcalPrev}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="border-t-2 border-slate-300 dark:border-slate-600 bg-slate-200/70 dark:bg-slate-700/60">
                      <tr>
                        <td className="px-2 py-2 font-bold text-slate-900 dark:text-white">Totais</td>
                        <td className="px-2 py-2 text-right font-bold whitespace-nowrap text-slate-900 dark:text-white">
                          {contexto.totais.protAtual.toFixed(1)}/{contexto.totais.protPrev.toFixed(1)} g
                        </td>
                        <td className="px-2 py-2 text-right font-bold whitespace-nowrap text-slate-900 dark:text-white">
                          {Math.round(contexto.totais.kcalAtual)}/{contexto.totais.kcalPrev}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              <p className="text-xs text-black dark:text-gray-300 pt-2">Data: {contexto.dataImpressao}</p>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
