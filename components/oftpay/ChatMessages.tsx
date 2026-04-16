'use client';

import { useRef, useEffect } from 'react';
import { FileText, X, ExternalLink } from 'lucide-react';
import type { ChatMessage as ChatMessageType, ChatConversationSource } from '@/types/chatConversation';
import { renderInlineBold } from '@/lib/format/renderInlineBold';

/** Uma linha parseada: texto sem refs + ids citados + se é bullet */
interface ParsedLine {
  text: string;
  refs: number[];
  isBullet: boolean;
}

const REFS_REGEX = /\[(\d+(?:\s*,\s*\d+)*)\]/g;

function parseRefsFromLine(line: string): number[] {
  const ids: number[] = [];
  let m: RegExpExecArray | null;
  REFS_REGEX.lastIndex = 0;
  while ((m = REFS_REGEX.exec(line)) !== null) {
    const part = m[1];
    part.split(',').forEach((s) => {
      const n = parseInt(s.trim(), 10);
      if (Number.isFinite(n)) ids.push(n);
    });
  }
  return ids;
}

function removeRefsFromText(line: string): string {
  return line
    .replace(/\[\d+(?:\s*,\s*\d+)*\]/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function isBulletLine(trimmed: string): boolean {
  return /^[-*•]\s/.test(trimmed) || /^\d+\.\s/.test(trimmed);
}

function parseAnswerLines(content: string): ParsedLine[] {
  const lines = content.split(/\r?\n/);
  return lines.map((raw) => {
    const refs = parseRefsFromLine(raw);
    const text = removeRefsFromText(raw);
    const isBullet = isBulletLine(raw.trim());
    return { text, refs, isBullet };
  });
}

function getSourcesByIds(sources: ChatConversationSource[], ids: number[]): ChatConversationSource[] {
  const set = new Set(ids);
  return sources.filter((s) => s.id != null && set.has(s.id));
}

/** Cores por referência: ícone PDF colorido por ref. */
const REF_COLOR_CLASSES = [
  'text-blue-600 hover:bg-blue-50 hover:text-blue-700',
  'text-green-600 hover:bg-green-50 hover:text-green-700',
  'text-amber-600 hover:bg-amber-50 hover:text-amber-700',
  'text-violet-600 hover:bg-violet-50 hover:text-violet-700',
  'text-rose-600 hover:bg-rose-50 hover:text-rose-700',
  'text-cyan-600 hover:bg-cyan-50 hover:text-cyan-700',
] as const;

function getRefColorClasses(id: number): string {
  return REF_COLOR_CLASSES[(id - 1) % REF_COLOR_CLASSES.length] ?? REF_COLOR_CLASSES[0];
}

function cleanSnippet(snippet: string): string {
  if (!snippet || !snippet.trim()) return snippet;
  const lines = snippet.split(/\r?\n/);
  const out: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const t = line.trim();
    if (!t) {
      if (out.length > 0 && out[out.length - 1] !== '') out.push('');
      continue;
    }
    if (/Licensed to\s/i.test(t) || /OFT-REVIEW\s*[-|]\s*EXTENSIVE/i.test(t)) continue;
    if (/APOSTILA\s*\d{4}\s*\|/i.test(t) && /\d{2,3}\s*$/.test(t)) continue;
    if (/^Fonte:\s*.+/i.test(t) || /Disponível em:\s*https?:\/\//i.test(t)) continue;
    if (/Imagem gentilmente cedida\s+(por|pela|pelo)\s+/i.test(t)) continue;
    const withoutFonte = t.replace(/\s*Fonte:\s*[^.]+\.?\s*Disponível em:\s*https?:\S+/gi, '').trim();
    const withoutCedida = withoutFonte.replace(/\s*Imagem gentilmente cedida[^.]+\./gi, '').trim();
    if (!withoutCedida) continue;
    out.push(withoutCedida);
  }
  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

/** Modal de fontes: título, trecho, link Abrir PDF (quando courseId informado). */
function SourcesModal({
  sources,
  courseId,
  onClose,
}: {
  sources: ChatConversationSource[];
  courseId?: string;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex-shrink-0 flex items-center justify-end px-3 py-2 border-b border-gray-100">
          <button type="button" onClick={onClose} className="p-2 rounded-lg text-gray-500 hover:bg-gray-100" aria-label="Fechar">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          {sources.map((src, i) => (
            <div key={i} className="py-3 scroll-mt-4 first:pt-2 border-b border-gray-100 last:border-0">
              <p className="text-sm font-medium text-gray-900">{src.title.replace(/\.(cdr|pdf)$/i, '')}</p>
              {src.page != null && <p className="text-xs text-gray-500 mt-0.5">Pág. {src.page}</p>}
              {src.snippet && (
                <p className="text-sm text-gray-700 whitespace-pre-wrap break-words mt-2 text-justify">
                  {cleanSnippet(src.snippet)}
                </p>
              )}
              {courseId && (
                <a
                  href={`/api/oftpay/apostila-signed-url?title=${encodeURIComponent(src.title.replace(/\.(cdr|pdf)$/i, ''))}&courseId=${encodeURIComponent(courseId)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:underline mt-3"
                >
                  <ExternalLink className="w-4 h-4" />
                  Abrir PDF em outra página
                </a>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

interface ChatMessagesProps {
  messages: ChatMessageType[];
  sourcesModalFor: ChatConversationSource[] | null;
  onOpenSources: (sources: ChatConversationSource[]) => void;
  onCloseSources: () => void;
  typing?: boolean;
  error?: string | null;
  emptyMessage?: string;
  ThinkingIndicator?: React.ComponentType;
  /** courseId para link "Abrir PDF" no modal de fontes (ex: oftreview, propedeutics) */
  courseId?: string;
}

/** Renderiza resposta do assistant por linhas: remove [n] e coloca ícone PDF colorido no lugar; negrito com **texto**. */
function renderAnswerByLines(
  content: string,
  sources: ChatConversationSource[] | undefined,
  onOpenSource: (sources: ChatConversationSource[]) => void
): React.ReactNode {
  if (!sources || sources.length === 0) return renderInlineBold(content);
  const parsed = parseAnswerLines(content);
  return (
    <div className="space-y-1.5">
      {parsed.map((line, i) => {
        if (!line.text && line.refs.length === 0) return <br key={i} />;
        const lineSources = getSourcesByIds(sources, line.refs);
        const displayText = line.isBullet
          ? line.text.replace(/^[-*•]\s*/, '').replace(/^\d+\.\s*/, '')
          : line.text;
        return (
          <div key={i} className="flex flex-wrap items-start gap-1 gap-y-0.5">
            <span className={line.isBullet ? 'flex items-start gap-1.5' : ''}>
              {line.isBullet && <span className="text-gray-500 flex-shrink-0">•</span>}
              <span className="whitespace-pre-wrap break-words">{renderInlineBold(displayText)}</span>
            </span>
            {line.refs.length > 0 && lineSources.length > 0 && (
              <span className="inline-flex items-center gap-0.5 flex-shrink-0">
                {line.refs.map((id) => {
                  const src = sources.find((s) => s.id === id);
                  if (!src) return null;
                  return (
                    <button
                      key={`${i}-${id}`}
                      type="button"
                      onClick={() => onOpenSource([src])}
                      className={`p-0.5 rounded ${getRefColorClasses(id)}`}
                      title={`${src.title.replace(/\.(cdr|pdf)$/i, '')}${src.page != null ? ` — Pág. ${src.page}` : ''}`}
                      aria-label={`Referência ${id}: ${src.title}`}
                    >
                      <FileText className="w-3.5 h-3.5" />
                    </button>
                  );
                })}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function ChatMessages({
  messages,
  sourcesModalFor,
  onOpenSources,
  onCloseSources,
  typing,
  error,
  emptyMessage,
  ThinkingIndicator,
  courseId = 'oftreview',
}: ChatMessagesProps) {
  const listEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typing]);

  return (
    <div className="flex-1 overflow-y-auto py-4 space-y-4 min-h-0 px-2 sm:px-4">
      {messages.length === 0 && !typing && emptyMessage && (
        <p className="text-sm text-gray-500 text-center py-6">{emptyMessage}</p>
      )}
      {messages.map((msg) => (
        <div
          key={msg.id}
          className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
        >
          <div
            className={`rounded-lg px-3 py-2 text-sm ${
              msg.role === 'user'
                ? 'bg-blue-600 text-white max-w-[85%]'
                : 'bg-gray-100 text-gray-900 border border-gray-200 w-full md:max-w-[85%]'
            }`}
          >
            {msg.role === 'assistant' && msg.sources && msg.sources.length > 0 && (
              <div className="flex items-center gap-2 mb-2 pb-2 border-b border-gray-200">
                <span className="text-xs font-medium text-gray-500">Baseado nas apostilas</span>
                <button
                  type="button"
                  onClick={() => onOpenSources(msg.sources!)}
                  className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium"
                  title="Ver todas as fontes"
                >
                  <FileText className="w-3.5 h-3.5" />
                  Fontes ({msg.sources.length})
                </button>
              </div>
            )}
            {msg.content ? (
              <div className="break-words">
                {msg.role === 'assistant' && msg.sources && msg.sources.length > 0
                  ? renderAnswerByLines(msg.content, msg.sources, onOpenSources)
                  : renderInlineBold(msg.content)}
              </div>
            ) : (
              <span className="text-gray-400">—</span>
            )}
          </div>
        </div>
      ))}
      {typing && ThinkingIndicator && <ThinkingIndicator />}
      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-800">
          <span>{error}</span>
        </div>
      )}
      <div ref={listEndRef} />
      {sourcesModalFor && (
        <SourcesModal sources={sourcesModalFor} courseId={courseId} onClose={onCloseSources} />
      )}
    </div>
  );
}
