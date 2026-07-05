'use client';

import { CheckCircle2, XCircle, AlertCircle, Sparkles } from 'lucide-react';
import type { BioImpedanciaExtracaoNormalizada } from '@/lib/metaadmin/bioImpedanciaExtracao';
import { listarCamposExtracaoIA } from '@/lib/metaadmin/bioImpedanciaExtracao';
import { BIO_CARD, BIO_CARD_PAD } from '@/components/bodymap/bioImpedanciaTokens';

export interface BioExtractedReviewCardProps {
  extraction: BioImpedanciaExtracaoNormalizada;
  loading?: boolean;
  onApply: () => void;
  onDiscard: () => void;
}

export function BioExtractedReviewCard({
  extraction,
  loading = false,
  onApply,
  onDiscard,
}: BioExtractedReviewCardProps) {
  const { encontrados, ausentes, origemLabel } = listarCamposExtracaoIA(extraction);

  return (
    <div className={`${BIO_CARD} ${BIO_CARD_PAD} border-teal-200 bg-teal-50/30`}>
      <div className="flex items-start gap-3 mb-4">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white border border-teal-100 shadow-sm">
          <Sparkles className="h-4 w-4 text-teal-600" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-teal-700">Dados extraídos pela IA</p>
          <h4 className="text-sm font-semibold text-gray-900 mt-0.5">Dados aplicados ao formulário — revise e salve</h4>
          <span className="inline-flex mt-2 px-2.5 py-0.5 rounded-full text-xs font-medium bg-white border border-gray-200 text-gray-700">
            Origem detectada: {origemLabel}
          </span>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-3 mb-4">
        <div className="rounded-xl bg-white border border-gray-100 p-3">
          <p className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
            Campos encontrados ({encontrados.length})
          </p>
          {encontrados.length > 0 ? (
            <ul className="text-xs text-gray-600 space-y-1">
              {encontrados.map((c) => (
                <li key={c}>• {c}</li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-gray-500">Nenhum campo identificado com confiança.</p>
          )}
        </div>
        <div className="rounded-xl bg-white border border-gray-100 p-3">
          <p className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
            <XCircle className="h-3.5 w-3.5 text-gray-400" />
            Não encontrados ({ausentes.length})
          </p>
          {ausentes.length > 0 ? (
            <ul className="text-xs text-gray-500 space-y-1">
              {ausentes.slice(0, 8).map((c) => (
                <li key={c}>• {c}</li>
              ))}
              {ausentes.length > 8 && <li>• +{ausentes.length - 8} outros</li>}
            </ul>
          ) : (
            <p className="text-xs text-gray-500">Todos os campos principais foram detectados.</p>
          )}
        </div>
      </div>

      {extraction.avisos.length > 0 && (
        <div className="rounded-xl bg-amber-50 border border-amber-100 p-3 mb-4">
          <p className="text-xs font-semibold text-amber-800 flex items-center gap-1.5 mb-1.5">
            <AlertCircle className="h-3.5 w-3.5" />
            Avisos
          </p>
          <ul className="text-xs text-amber-900 space-y-1">
            {extraction.avisos.map((a, i) => (
              <li key={i}>• {a}</li>
            ))}
          </ul>
        </div>
      )}

      <p className="text-xs text-gray-500 mb-4">
        Os valores já foram preenchidos nos campos abaixo. Confira, ajuste se necessário e clique em Salvar registro.
      </p>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={loading || encontrados.length === 0}
          onClick={onApply}
          className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
        >
          Reaplicar ao formulário
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={onDiscard}
          className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
        >
          Descartar
        </button>
      </div>
    </div>
  );
}
