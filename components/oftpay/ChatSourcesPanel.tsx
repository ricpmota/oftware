'use client';

import { useEffect, useRef } from 'react';
import { BookOpen, ChevronLeft } from 'lucide-react';
import type { ChatConversationSource } from '@/types/chatConversation';
import { partitionResponseSources } from '@/lib/oftpay/chatSourceNavigation';

function displayTitle(title: string): string {
  return title.replace(/\.(cdr|pdf)$/i, '');
}

function SourceCard({
  source,
  active,
  onOpen,
}: {
  source: ChatConversationSource;
  active: boolean;
  onOpen: (source: ChatConversationSource) => void;
}) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    if (active) ref.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [active]);

  return (
    <article
      ref={ref}
      className={`rounded-[18px] border p-4 shadow-sm ${
        active ? 'border-blue-600 bg-blue-50/40' : 'border-gray-200 bg-white'
      }`}
    >
      <p className="text-[11px] font-semibold tabular-nums text-gray-400">
        {String(source.id ?? '').padStart(2, '0')}
      </p>
      <h4 className="mt-1 text-sm font-semibold leading-snug text-gray-900">{displayTitle(source.title)}</h4>
      <p className="mt-1 text-xs text-gray-500">
        {source.page != null ? `Página ${source.page}` : 'Página não identificada'}
      </p>
      {source.snippet ? (
        <p className="mt-2 line-clamp-3 text-sm leading-snug text-gray-600">{source.snippet}</p>
      ) : null}
      <div className="mt-3 flex justify-end">
        <button
          type="button"
          onClick={() => onOpen(source)}
          className="text-sm font-medium text-blue-600 hover:text-blue-700"
        >
          Abrir →
        </button>
      </div>
    </article>
  );
}

export default function ChatSourcesPanel({
  sources,
  answerContent,
  activeSourceId,
  locateError,
  onOpenSource,
  onBack,
}: {
  sources: ChatConversationSource[];
  answerContent: string;
  activeSourceId: number | null;
  locateError?: string | null;
  onOpenSource: (source: ChatConversationSource) => void;
  onBack?: () => void;
}) {
  const { cited, others } = partitionResponseSources(sources, answerContent);

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col bg-gray-50">
      <div className="shrink-0 border-b border-gray-200 bg-white px-4 py-3">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="mb-2 inline-flex items-center gap-1 text-sm font-medium text-gray-600 hover:text-gray-900"
          >
            <ChevronLeft className="h-4 w-4" />
            Voltar ao chat
          </button>
        ) : null}
        <div className="flex items-start gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <BookOpen className="h-4 w-4" />
          </span>
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Fontes da resposta</h3>
            <p className="text-xs text-gray-500">
              {sources.length} {sources.length === 1 ? 'referência encontrada' : 'referências encontradas'}
            </p>
          </div>
        </div>
        {locateError ? <p className="mt-2 text-sm text-red-600">{locateError}</p> : null}
      </div>
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {cited.map((source) => (
          <SourceCard
            key={`cited-${source.id}-${source.page ?? 'x'}`}
            source={source}
            active={activeSourceId != null && source.id === activeSourceId}
            onOpen={onOpenSource}
          />
        ))}
        {others.length > 0 ? (
          <>
            <p className="pt-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
              Outras referências encontradas
            </p>
            {others.map((source) => (
              <SourceCard
                key={`other-${source.id}-${source.page ?? 'x'}-${source.title}`}
                source={source}
                active={activeSourceId != null && source.id === activeSourceId}
                onOpen={onOpenSource}
              />
            ))}
          </>
        ) : null}
      </div>
    </div>
  );
}
