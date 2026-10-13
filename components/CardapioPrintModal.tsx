'use client';

import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Loader2, Printer, X } from 'lucide-react';
import type { CardapioPdfContext, CardapioPdfOpcao } from '@/types/cardapioPrint';
import { downloadCardapioPdfComoImpressao } from '@/utils/cardapioPdfDownload';
import { hydrateCardapioPdfMealImages } from '@/lib/nutri/cardapioPdfMealImages';
import { formatCardapioPdfItemCells, macrosDaOpcao } from '@/utils/cardapioPdfLayout';
import { auth } from '@/lib/firebase';

export type CardapioPrintModalProps = {
  open: boolean;
  contexto: CardapioPdfContext | null;
  onClose: () => void;
  zIndexClass?: string;
};

function CardapioPrintOpcaoPreview({
  nomeRefeicao,
  opcao,
  opcaoIdx,
  carregandoFoto,
}: {
  nomeRefeicao: string;
  opcao: CardapioPdfOpcao;
  opcaoIdx: number;
  carregandoFoto: boolean;
}) {
  const totais = macrosDaOpcao(opcao.itens || []);
  const aguardandoFoto = Boolean(opcao.mealImageRef) && !opcao.imageUrl && carregandoFoto;

  return (
    <div className={opcaoIdx > 0 ? 'mt-3' : ''}>
      <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5 italic">Escolha: {opcao.tituloOpcao}</p>
      <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-start">
        {opcao.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={opcao.imageUrl}
            alt={`Imagem ilustrativa de ${nomeRefeicao}`}
            className="h-32 w-32 sm:h-36 sm:w-36 shrink-0 rounded-xl border border-gray-200 object-cover dark:border-gray-700"
          />
        ) : aguardandoFoto ? (
          <div
            className="flex h-32 w-32 sm:h-36 sm:w-36 shrink-0 items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50 text-[11px] text-gray-400 dark:border-gray-600 dark:bg-gray-800/60"
            aria-hidden
          >
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : null}
        <div className="min-w-0 flex-1">
          {opcao.itens.length > 0 ? (
            <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
              <table className="w-full text-xs sm:text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800/80 text-gray-600 dark:text-gray-300">
                  <tr>
                    <th className="px-2 py-2 text-left font-semibold">Item</th>
                    <th className="px-2 py-2 text-right font-semibold whitespace-nowrap">Qtd</th>
                    <th className="px-2 py-2 text-right font-semibold whitespace-nowrap">Prot.</th>
                    <th className="px-2 py-2 text-right font-semibold whitespace-nowrap">kcal</th>
                  </tr>
                </thead>
                <tbody>
                  {opcao.itens.map((row, idx) => {
                    const cells = formatCardapioPdfItemCells(row);
                    return (
                      <tr
                        key={`${nomeRefeicao}-${opcaoIdx}-${idx}`}
                        className="border-t border-gray-100 dark:border-gray-700"
                      >
                        <td className="px-2 py-2 text-gray-800 dark:text-gray-200 align-top">{cells.alimento}</td>
                        <td className="px-2 py-2 text-right whitespace-nowrap text-gray-800 dark:text-gray-200">
                          {cells.quantidade}
                        </td>
                        <td className="px-2 py-2 text-right whitespace-nowrap">{cells.proteina}</td>
                        <td className="px-2 py-2 text-right whitespace-nowrap">{cells.kcal}</td>
                      </tr>
                    );
                  })}
                </tbody>
                {typeof totais.proteina === 'number' || typeof totais.kcal === 'number' ? (
                  <tfoot className="border-t-2 border-gray-200 bg-gray-50 dark:border-gray-600 dark:bg-gray-800/70">
                    <tr>
                      <td className="px-2 py-2 font-semibold text-gray-800 dark:text-gray-100" colSpan={2}>
                        Total da opção
                      </td>
                      <td className="px-2 py-2 text-right font-bold whitespace-nowrap">
                        {typeof totais.proteina === 'number' ? `${totais.proteina.toFixed(1)} g` : '—'}
                      </td>
                      <td className="px-2 py-2 text-right font-bold whitespace-nowrap">
                        {typeof totais.kcal === 'number' ? `${Math.round(totais.kcal)}` : '—'}
                      </td>
                    </tr>
                  </tfoot>
                ) : null}
              </table>
            </div>
          ) : (
            <p className="text-xs text-gray-500">Sem itens detalhados nesta opção.</p>
          )}
        </div>
      </div>
      {opcao.observacao?.trim() ? (
        <div className="mt-2 rounded-lg border border-teal-200 dark:border-teal-800 bg-teal-50/70 dark:bg-teal-950/30 px-3 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-teal-800 dark:text-teal-300">
            Observação da nutri
          </p>
          <p className="text-xs text-gray-800 dark:text-gray-100 whitespace-pre-wrap mt-0.5 leading-relaxed">
            {opcao.observacao.trim()}
          </p>
        </div>
      ) : null}
    </div>
  );
}

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
  const [contextoExibicao, setContextoExibicao] = useState<CardapioPdfContext | null>(contexto);
  const [hidratandoFotos, setHidratandoFotos] = useState(false);

  const getToken = useCallback(async () => (await auth.currentUser?.getIdToken()) || null, []);

  const fecharModal = useCallback(() => onClose(), [onClose]);

  useEffect(() => {
    if (!open) {
      setContextoExibicao(null);
      setHidratandoFotos(false);
      return;
    }
    if (!contexto) return;
    setContextoExibicao(contexto);
    setHidratandoFotos(true);
    let cancelled = false;
    void hydrateCardapioPdfMealImages(contexto, getToken)
      .then((next) => {
        if (!cancelled) setContextoExibicao(next);
      })
      .catch(() => {
        /* preview segue sem fotos */
      })
      .finally(() => {
        if (!cancelled) setHidratandoFotos(false);
      });
    return () => {
      cancelled = true;
    };
    // contexto é recriado a cada render do pai; hidrata na abertura do modal.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, getToken]);

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
      await downloadCardapioPdfComoImpressao(contextoExibicao || contexto, { getToken });
    } catch (e) {
      console.error(e);
      const msg = e instanceof Error ? e.message : 'Erro ao gerar PDF.';
      alert(msg);
    } finally {
      setImprimindo(false);
    }
  };

  if (!open || !contexto || typeof document === 'undefined') return null;
  const preview = contextoExibicao || contexto;

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
          h-[100dvh] max-h-[100dvh] w-full min-h-0 sm:h-auto sm:max-h-[min(90vh,800px)] sm:max-w-3xl sm:rounded-xl shadow-2xl sm:border"
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
              Gerado em {preview.dataImpressao}
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
                <p>Paciente: {preview.pacienteNome}</p>
                {preview.pacienteCpf ? <p>CPF: {preview.pacienteCpf}</p> : null}
                {preview.medicoNome ? <p>Médico: {preview.medicoNome}</p> : null}
                {preview.nutricionistaNome ? (
                  <p>
                    Nutricionista: {preview.nutricionistaNome}
                    {preview.nutricionistaCrn ? ` · CRN ${preview.nutricionistaCrn}` : ''}
                  </p>
                ) : null}
              </div>

              {preview.refeicoes.map((ref) => {
                const opcoes =
                  ref.opcoes?.length > 0
                    ? ref.opcoes
                    : [
                        {
                          tituloOpcao: ref.tituloOpcao,
                          itens: ref.itens,
                          observacao: ref.observacao,
                        },
                      ];
                return (
                <div key={ref.nomeRefeicao} className="border-t border-gray-200 dark:border-gray-700 pt-4 first:border-t-0 first:pt-0">
                  <div className="text-sm font-bold text-[#2c3e50] dark:text-gray-100">{ref.nomeRefeicao}</div>
                  {opcoes.map((opcao, opcaoIdx) => (
                    <CardapioPrintOpcaoPreview
                      key={`${ref.nomeRefeicao}-${opcao.tituloOpcao}-${opcaoIdx}`}
                      nomeRefeicao={ref.nomeRefeicao}
                      opcao={opcao}
                      opcaoIdx={opcaoIdx}
                      carregandoFoto={hidratandoFotos}
                    />
                  ))}
                </div>
                );
              })}

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
                      {preview.resumoDia.map((linha, index) => (
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
                          {preview.totais.protAtual.toFixed(1)}/{preview.totais.protPrev.toFixed(1)} g
                        </td>
                        <td className="px-2 py-2 text-right font-bold whitespace-nowrap text-slate-900 dark:text-white">
                          {Math.round(preview.totais.kcalAtual)}/{preview.totais.kcalPrev}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              <p className="text-xs text-black dark:text-gray-300 pt-2">Data: {preview.dataImpressao}</p>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
