'use client';

import { useId, useMemo, useState, type ReactNode, type RefObject } from 'react';
import { FileText, Loader2, Pill, Receipt, Search, X } from 'lucide-react';
import type { Prescricao } from '@/types/prescricao';
import {
  filtrarPrescricoesPorBusca,
  origemBuscaPrescricao,
  rotuloOrigemBuscaPrescricao,
  tituloBuscaPrescricao,
} from '@/lib/prescricao/prescricaoBusca';

function formatarDataHora(d: Date | undefined): string {
  if (!d) return '';
  try {
    return d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return '';
  }
}

export type PrescricaoBuscaCampoProps = {
  itensRef: RefObject<Prescricao[]>;
  loading?: boolean;
  accent?: 'green' | 'purple';
  onSelect: (prescricao: Prescricao) => void;
  actions?: ReactNode;
  className?: string;
};

export default function PrescricaoBuscaCampo({
  itensRef,
  loading = false,
  accent = 'green',
  onSelect,
  actions,
  className = '',
}: PrescricaoBuscaCampoProps) {
  const [query, setQuery] = useState('');
  const inputId = useId();
  const isPurple = accent === 'purple';
  const trimmed = query.trim();
  const mostrarLista = trimmed.length >= 2;

  const resultados = useMemo(
    () => (mostrarLista ? filtrarPrescricoesPorBusca(itensRef.current || [], trimmed) : []),
    [itensRef, mostrarLista, trimmed]
  );

  const ringFocus = isPurple
    ? 'focus:ring-purple-400 focus:border-purple-400'
    : 'focus:ring-green-400 focus:border-green-400';
  const iconColor = isPurple ? 'text-purple-500' : 'text-green-600';

  const badgeClass = (origem: ReturnType<typeof origemBuscaPrescricao>) => {
    if (origem === 'historico') return 'bg-amber-100 text-amber-800 border-amber-200';
    if (origem === 'protocolo') return 'bg-blue-100 text-blue-800 border-blue-200';
    if (origem === 'recibo') return 'bg-teal-100 text-teal-800 border-teal-200';
    return isPurple
      ? 'bg-purple-100 text-purple-800 border-purple-200'
      : 'bg-emerald-100 text-emerald-800 border-emerald-200';
  };

  return (
    <div className={`relative ${className}`}>
      <div className="flex items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <label className="sr-only" htmlFor={inputId}>
            Pesquisar prescrição, protocolo ou histórico
          </label>
          <Search
            className={`pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 ${iconColor}`}
            aria-hidden
          />
          <input
            id={inputId}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Pesquisar…"
            className={`w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-9 pr-9 text-sm text-gray-900 placeholder:text-gray-400 shadow-sm focus:outline-none focus:ring-2 ${ringFocus}`}
            autoComplete="off"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              aria-label="Limpar pesquisa"
            >
              <X size={16} />
            </button>
          ) : null}
        </div>
        {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
      </div>

      {mostrarLista ? (
        <div className="mt-2 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          {loading ? (
            <div className="flex items-center justify-center gap-2 px-4 py-6 text-sm text-gray-500">
              <Loader2 className={`h-4 w-4 animate-spin ${iconColor}`} />
              Carregando…
            </div>
          ) : resultados.length === 0 ? (
            <p className="px-4 py-5 text-center text-sm text-gray-500">
              Nenhum resultado para “{trimmed}”.
            </p>
          ) : (
            <ul className="max-h-[min(40vh,320px)] divide-y divide-gray-100 overflow-y-auto overscroll-contain">
              {resultados.map((p) => {
                const origem = origemBuscaPrescricao(p);
                const isRecibo = p.tipoDocumento === 'recibo_medico';
                return (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => {
                        onSelect(p);
                        setQuery('');
                      }}
                      className={`flex w-full items-start gap-3 px-3 py-3 text-left transition-colors ${
                        isPurple ? 'hover:bg-purple-50/70' : 'hover:bg-emerald-50/70'
                      }`}
                    >
                      <span
                        className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                          isRecibo
                            ? 'bg-teal-100 text-teal-700'
                            : origem === 'protocolo'
                              ? 'bg-blue-100 text-blue-700'
                              : isPurple
                                ? 'bg-purple-100 text-purple-700'
                                : 'bg-emerald-100 text-emerald-700'
                        }`}
                        aria-hidden
                      >
                        {isRecibo ? <Receipt className="h-4 w-4" /> : <Pill className="h-4 w-4" />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-1.5">
                          <span className="truncate text-sm font-semibold text-gray-900">
                            {tituloBuscaPrescricao(p)}
                          </span>
                          <span
                            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${badgeClass(origem)}`}
                          >
                            {rotuloOrigemBuscaPrescricao(origem)}
                          </span>
                        </span>
                        <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-gray-500">
                          {origem === 'historico' && p.pacienteNome ? (
                            <span className="truncate">{p.pacienteNome}</span>
                          ) : p.pastaNome ? (
                            <span className="truncate">{p.pastaNome}</span>
                          ) : null}
                          {p.atualizadoEm ? (
                            <span className="inline-flex items-center gap-1">
                              <FileText className="h-3 w-3 opacity-70" aria-hidden />
                              {formatarDataHora(p.atualizadoEm)}
                            </span>
                          ) : null}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
