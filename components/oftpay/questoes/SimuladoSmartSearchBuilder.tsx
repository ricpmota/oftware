'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { OftpayQuestaoDoc } from '@/services/oftpayQuestoesService';
import {
  buildPublishedTopicIndex,
  countConfiguredSmartRows,
  createSmartSearchRowFromTopic,
  getAvailableForTopicDifficulty,
  getPublishedTopicKey,
  searchPublishedTopics,
  type PublishedTopicMatch,
  type SmartSearchRow,
} from '@/lib/oftpay/simuladoTopicSearch';
import { maxSimuladoQuantidade, parseQuantidadeInput } from '@/lib/oftpay/simuladoSubjectListPicker';
import { DIFICULDADE_LABEL } from '@/types/oftpaySimulados';
import type { QuestaoDificuldade } from '@/types/oftpayQuestoes';
import { Check, Search, X } from 'lucide-react';

const DIFFICULTIES: QuestaoDificuldade[] = ['facil', 'medio', 'dificil'];

interface SimuladoSmartSearchBuilderProps {
  publicadas: OftpayQuestaoDoc[];
  rows: SmartSearchRow[];
  onRowsChange: (rows: SmartSearchRow[]) => void;
}

function ConfiguredTopicRow({
  row,
  onChange,
  onRemove,
}: {
  row: SmartSearchRow;
  onChange: (patch: Partial<SmartSearchRow>) => void;
  onRemove: () => void;
}) {
  if (!row.selectedTopic) return null;

  const topic = row.selectedTopic;
  const disponiveis = getAvailableForTopicDifficulty(topic, row.dificuldade);
  const maxQty = maxSimuladoQuantidade(disponiveis);

  return (
    <div className="rounded-xl border border-violet-200 bg-violet-50/30 p-4 shadow-sm space-y-3">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-gray-900">{topic.topicLabel}</p>
          <p className="text-xs text-gray-500">{topic.subjectLabel}</p>
          <p className="text-[11px] text-violet-700 mt-0.5">
            {topic.totalPublicadas} questão(ões) publicada(s)
          </p>
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="shrink-0 rounded-lg border border-gray-200 p-2 text-gray-400 hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-colors"
          aria-label="Remover tópico"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex flex-wrap items-end gap-3 pt-1 border-t border-violet-100">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wide text-gray-500 mb-1.5">
            Dificuldade
          </p>
          <div className="flex flex-wrap gap-1.5">
            {DIFFICULTIES.map((diff) => {
              const count = getAvailableForTopicDifficulty(topic, diff);
              const active = row.dificuldade === diff;
              const disabled = count === 0;
              return (
                <button
                  key={diff}
                  type="button"
                  disabled={disabled}
                  onClick={() => {
                    const disp = getAvailableForTopicDifficulty(topic, diff);
                    onChange({
                      dificuldade: diff,
                      quantidade: Math.min(row.quantidade || 5, maxSimuladoQuantidade(disp)) || 1,
                    });
                  }}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium border transition-colors ${
                    active
                      ? 'border-violet-500 bg-violet-600 text-white shadow-sm'
                      : disabled
                        ? 'border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed'
                        : 'border-gray-200 bg-white text-gray-700 hover:border-violet-300 hover:bg-violet-50'
                  }`}
                  title={
                    disabled
                      ? `Sem questões ${DIFICULDADE_LABEL[diff].toLowerCase()} neste tópico`
                      : `${count} disponível(is)`
                  }
                >
                  {DIFICULDADE_LABEL[diff]}
                  <span className={`ml-1 tabular-nums ${active ? 'text-violet-100' : 'text-gray-400'}`}>
                    ({count})
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-medium uppercase tracking-wide text-gray-500 mb-1">
            Quantidade
          </label>
          <input
            type="number"
            min={0}
            max={maxQty}
            value={row.quantidade === 0 ? '' : row.quantidade}
            onChange={(e) =>
              onChange({
                quantidade: parseQuantidadeInput(e.target.value, maxQty),
              })
            }
            className="w-20 rounded-lg border border-gray-200 px-2 py-1.5 text-sm bg-white"
          />
        </div>

        <span className="text-xs text-gray-500 pb-1.5">
          {disponiveis} disponível(is)
          {disponiveis > 0 && row.quantidade < maxQty && (
            <button
              type="button"
              onClick={() => onChange({ quantidade: maxQty })}
              className="ml-2 text-[10px] font-medium text-violet-600 hover:text-violet-800"
            >
              Todas
            </button>
          )}
        </span>
      </div>
    </div>
  );
}

export default function SimuladoSmartSearchBuilder({
  publicadas,
  rows,
  onRowsChange,
}: SimuladoSmartSearchBuilderProps) {
  const topicIndex = useMemo(() => buildPublishedTopicIndex(publicadas), [publicadas]);

  const configuredRows = useMemo(
    () => rows.filter((row) => row.selectedTopic != null),
    [rows]
  );

  const usedTopicKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const row of configuredRows) {
      if (row.selectedTopic) keys.add(getPublishedTopicKey(row.selectedTopic));
    }
    return keys;
  }, [configuredRows]);

  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [pendingKeys, setPendingKeys] = useState<Set<string>>(new Set());
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(searchQuery), 150);
    return () => window.clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    if (!dropdownOpen) return;
    const onPointerDown = (e: MouseEvent) => {
      if (!searchRef.current?.contains(e.target as Node)) setDropdownOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [dropdownOpen]);

  const suggestions = useMemo(() => {
    if (debouncedQuery.trim().length < 2) return [];
    return searchPublishedTopics(topicIndex, debouncedQuery, {
      limit: 30,
      excludeTopicKeys: usedTopicKeys,
    });
  }, [debouncedQuery, topicIndex, usedTopicKeys]);

  useEffect(() => {
    setPendingKeys((prev) => {
      const valid = new Set(suggestions.map(getPublishedTopicKey));
      const next = new Set<string>();
      for (const key of prev) {
        if (valid.has(key)) next.add(key);
      }
      return next.size === prev.size ? prev : next;
    });
  }, [suggestions]);

  const pendingTopics = useMemo(
    () => suggestions.filter((topic) => pendingKeys.has(getPublishedTopicKey(topic))),
    [suggestions, pendingKeys]
  );

  const allSuggestionsSelected =
    suggestions.length > 0 && suggestions.every((t) => pendingKeys.has(getPublishedTopicKey(t)));

  const togglePending = (topic: PublishedTopicMatch) => {
    const key = getPublishedTopicKey(topic);
    setPendingKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const selectAllSuggestions = () => {
    setPendingKeys(new Set(suggestions.map(getPublishedTopicKey)));
  };

  const clearPending = () => setPendingKeys(new Set());

  const addPendingTopics = () => {
    if (pendingTopics.length === 0) return;
    const newRows = pendingTopics.map((topic, index) =>
      createSmartSearchRowFromTopic(topic, index)
    );
    onRowsChange([...configuredRows, ...newRows]);
    setPendingKeys(new Set());
    setSearchQuery('');
    setDropdownOpen(false);
  };

  const updateRow = (id: string, patch: Partial<SmartSearchRow>) => {
    onRowsChange(rows.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  };

  const removeRow = (id: string) => {
    onRowsChange(rows.filter((row) => row.id !== id));
  };

  const configuredCount = countConfiguredSmartRows(rows);

  if (topicIndex.length === 0) {
    return <p className="text-sm text-gray-500">Nenhum tópico com questões publicadas ainda.</p>;
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">
          Busca inteligente de tópicos
        </p>
        <p className="text-sm text-gray-500 mt-0.5">
          Digite para buscar, marque um ou vários tópicos (ou selecione todos) e adicione ao simulado.
        </p>
      </div>

      <div ref={searchRef} className="relative z-10">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setDropdownOpen(true);
            }}
            onFocus={() => setDropdownOpen(true)}
            placeholder="Digite um assunto ou tópico (ex.: glaucoma, córnea, retina…)"
            className="w-full rounded-xl border border-gray-200 bg-white pl-9 pr-3 py-3 text-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100 shadow-sm"
            autoComplete="off"
          />
        </div>

        {searchQuery.trim().length > 0 && searchQuery.trim().length < 2 && (
          <p className="mt-1 text-xs text-gray-400">Digite pelo menos 2 caracteres para buscar.</p>
        )}

        {dropdownOpen && debouncedQuery.trim().length >= 2 && (
          <div className="absolute z-[60] mt-1 w-full rounded-xl border border-gray-200 bg-white shadow-xl flex flex-col max-h-[min(20rem,70vh)]">
            {suggestions.length === 0 ? (
              <p className="px-4 py-3 text-sm text-gray-500 shrink-0">
                Nenhum tópico publicado encontrado para &quot;{debouncedQuery.trim()}&quot;.
              </p>
            ) : (
              <>
                <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 px-3 py-2 border-b border-gray-100 bg-gray-50/80">
                  <span className="text-xs text-gray-500">
                    {suggestions.length} resultado(s)
                    {pendingKeys.size > 0 && (
                      <span className="ml-1 font-medium text-violet-700">
                        · {pendingKeys.size} selecionado(s)
                      </span>
                    )}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={allSuggestionsSelected ? clearPending : selectAllSuggestions}
                      className="text-xs font-medium text-violet-700 hover:text-violet-900"
                    >
                      {allSuggestionsSelected ? 'Desmarcar todos' : 'Selecionar todos'}
                    </button>
                  </div>
                </div>

                <div
                  className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain touch-pan-y [scrollbar-gutter:stable]"
                  onWheel={(e) => e.stopPropagation()}
                >
                  <ul className="py-1">
                    {suggestions.map((topic) => {
                      const key = getPublishedTopicKey(topic);
                      const checked = pendingKeys.has(key);
                      return (
                        <li key={key}>
                          <button
                            type="button"
                            onClick={() => togglePending(topic)}
                            className={`w-full text-left px-3 py-2.5 flex items-start gap-3 transition-colors ${
                              checked ? 'bg-violet-50' : 'hover:bg-gray-50'
                            }`}
                          >
                            <span
                              className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                                checked
                                  ? 'border-violet-600 bg-violet-600 text-white'
                                  : 'border-gray-300 bg-white'
                              }`}
                              aria-hidden
                            >
                              {checked ? <Check className="w-3 h-3" strokeWidth={3} /> : null}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block text-sm font-medium text-gray-900">
                                {topic.topicLabel}
                              </span>
                              <span className="block text-xs text-gray-500">{topic.subjectLabel}</span>
                              <span className="block text-[11px] text-gray-400 mt-0.5">
                                {topic.totalPublicadas} publicada(s) · F {topic.facil} · M{' '}
                                {topic.medio} · D {topic.dificil}
                              </span>
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>

                <div className="shrink-0 border-t border-gray-100 px-3 py-2.5 bg-white">
                  <button
                    type="button"
                    disabled={pendingKeys.size === 0}
                    onClick={addPendingTopics}
                    className="w-full rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    {pendingKeys.size === 0
                      ? 'Adicionar tópicos ao simulado'
                      : pendingKeys.size === 1
                        ? 'Adicionar 1 tópico ao simulado'
                        : `Adicionar ${pendingKeys.size} tópicos ao simulado`}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {configuredRows.length > 0 ? (
        <div className="space-y-3">
          <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">
            Tópicos no simulado ({configuredCount})
          </p>
          <ul className="space-y-3">
            {configuredRows.map((row) => (
              <li key={row.id}>
                <ConfiguredTopicRow
                  row={row}
                  onChange={(patch) => updateRow(row.id, patch)}
                  onRemove={() => removeRow(row.id)}
                />
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="text-sm text-gray-400 text-center py-4 rounded-xl border border-dashed border-gray-200 bg-gray-50/50">
          Nenhum tópico adicionado ainda. Use a busca acima para selecionar.
        </p>
      )}
    </div>
  );
}
