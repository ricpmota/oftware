'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, MessageCircle, AlertCircle, FileText, X, ExternalLink, ChevronLeft, ChevronRight } from 'lucide-react';
import AIThinkingIndicator from './AIThinkingIndicator';
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

/** Quebra answer em linhas; cada linha tem texto (sem [n]), refs e se é bullet. */
function parseAnswerLines(content: string): ParsedLine[] {
  const lines = content.split(/\r?\n/);
  return lines.map((raw) => {
    const refs = parseRefsFromLine(raw);
    const text = removeRefsFromText(raw);
    const isBullet = isBulletLine(raw.trim());
    return { text, refs, isBullet };
  });
}

function getSourcesByIds(sources: ChatSource[], ids: number[]): ChatSource[] {
  const set = new Set(ids);
  return sources.filter((s) => set.has(s.id));
}

/** Remove ruído do trecho extraído do PDF: licenças, rodapés, legendas de figura e atribuições. */
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

/** Cores por referência: mesma ref = mesma cor; refs diferentes = cores diferentes (azul, verde, etc.). */
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

/** Modal: apenas nome da apostila e página (e botão Abrir PDF se houver). Uma ou mais fontes (com nav se >1). */
function SourcesModal({
  sources,
  courseId = 'oftreview',
  initialFocusIndex = 0,
  onClose,
}: {
  sources: ChatSource[];
  courseId?: string;
  initialFocusIndex?: number;
  onClose: () => void;
}) {
  const [currentIndex, setCurrentIndex] = useState(initialFocusIndex);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    cardRefs.current = cardRefs.current.slice(0, sources.length);
  }, [sources.length]);

  useEffect(() => {
    const el = cardRefs.current[currentIndex];
    if (el) {
      const t = setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 80);
      return () => clearTimeout(t);
    }
  }, [currentIndex]);

  const hasNav = sources.length > 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex-shrink-0 flex items-center justify-end px-3 py-2 border-b border-gray-100">
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          {sources.map((src, i) => (
            <div
              key={src.id}
              ref={(el) => { cardRefs.current[i] = el; }}
              className="py-3 scroll-mt-4 first:pt-2"
            >
              <p className="text-sm font-medium text-gray-900">{src.title.replace(/\.(cdr|pdf)$/i, '')}</p>
              {src.page != null && <p className="text-xs text-gray-500 mt-0.5">Pág. {src.page}</p>}
              <p className="text-sm text-gray-700 whitespace-pre-wrap break-words mt-2 text-justify">
                {cleanSnippet(src.snippet)}
              </p>
              <a
                href={`/api/oftpay/apostila-signed-url?title=${encodeURIComponent(src.title.replace(/\.(cdr|pdf)$/i, ''))}&courseId=${encodeURIComponent(courseId ?? 'oftreview')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:underline mt-3"
              >
                <ExternalLink className="w-4 h-4" />
                Abrir PDF em outra página
              </a>
            </div>
          ))}
        </div>
        {hasNav && (
          <div className="flex-shrink-0 flex items-center justify-between gap-2 px-4 py-2 border-t border-gray-100 bg-gray-50 rounded-b-xl">
            <button
              type="button"
              onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
              disabled={currentIndex === 0}
              className="flex items-center gap-1 text-sm text-gray-700 hover:text-gray-900 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
              Anterior
            </button>
            <span className="text-xs text-gray-500">
              {currentIndex + 1} / {sources.length}
            </span>
            <button
              type="button"
              onClick={() => setCurrentIndex((i) => Math.min(sources.length - 1, i + 1))}
              disabled={currentIndex === sources.length - 1}
              className="flex items-center gap-1 text-sm text-gray-700 hover:text-gray-900 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Próxima
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export interface ChatSource {
  id: number;
  title: string;
  snippet: string;
  page?: number;
  uri?: string;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: ChatSource[];
}

export type OftwareChatbotSurface = 'general' | 'chatnutri';

interface OftwareChatbotProps {
  /** courseId para links de apostila (oftreview, propedeutics) */
  courseId?: string;
  surface?: OftwareChatbotSurface;
  nutriPatientId?: string;
  nutriDateKey?: string;
}

export default function OftwareChatbot({
  courseId = 'oftreview',
  surface = 'general',
  nutriPatientId,
  nutriDateKey,
}: OftwareChatbotProps = {}) {
  const isPropedeutics = courseId?.toLowerCase() === 'propedeutics';
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sessionId, setSessionId] = useState<string>('-');
  const [typing, setTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [relatedQuestions, setRelatedQuestions] = useState<string[]>([]);
  const [sourcesModalFor, setSourcesModalFor] = useState<ChatSource[] | null>(null);
  const listEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typing]);

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || typing || isPropedeutics) return;
    if (surface === 'chatnutri' && (!nutriPatientId?.trim() || !nutriDateKey?.trim())) return;

    setInput('');
    setError(null);
    setRelatedQuestions([]);
    setMessages((prev) => [...prev, { id: String(Date.now()), role: 'user', content: trimmed }]);
    setTyping(true);

    try {
      const payload: Record<string, unknown> = { message: trimmed, sessionId, surface };
      if (surface === 'chatnutri' && nutriPatientId && nutriDateKey) {
        payload.patientId = nutriPatientId;
        payload.dateKey = nutriDateKey;
      }
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const errMsg = typeof data.error === 'string' ? data.error : 'Não foi possível obter resposta. Tente novamente.';
        setError(errMsg);
        return;
      }

      const answer = typeof data.answer === 'string' ? data.answer : 'Resposta indisponível.';
      const nextSession = typeof data.sessionId === 'string' ? data.sessionId : sessionId;
      const related = Array.isArray(data.relatedQuestions) ? data.relatedQuestions : [];
      const sourcesRaw = Array.isArray(data.sources) ? data.sources : [];
      const sources: ChatSource[] = sourcesRaw
        .filter((s: unknown) => s && typeof s === 'object' && 'id' in s && 'title' in s && 'snippet' in s)
        .map((s: { id?: number; title: string; snippet: string; page?: number; uri?: string }) => ({
          id: typeof s.id === 'number' ? s.id : 0,
          title: String(s.title),
          snippet: String(s.snippet),
          ...(typeof s.page === 'number' && { page: s.page }),
          ...(typeof s.uri === 'string' && s.uri && { uri: s.uri }),
        }))
        .filter((s) => s.id >= 1);

      setSessionId(nextSession);
      setRelatedQuestions(related);
      setMessages((prev) => [
        ...prev,
        { id: String(Date.now() + 1), role: 'assistant', content: answer, sources: sources.length ? sources : undefined },
      ]);
    } catch (e) {
      setError('Erro de conexão. Verifique sua internet e tente novamente.');
    } finally {
      setTyping(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const openSourcesModal = (sources: ChatSource[]) => {
    setSourcesModalFor(sources);
  };

  const closeSourcesModal = () => {
    setSourcesModalFor(null);
  };

  /** Renderiza a resposta por linhas: remove [n] do texto e coloca ícone PDF no lugar; clique abre modal com esse trecho. */
  function renderAnswerByLines(content: string, sources: ChatSource[] | undefined) {
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
                        onClick={() => openSourcesModal([src])}
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

  return (
    <div className="flex flex-col h-[min(70vh,600px)] rounded-lg border border-gray-200 bg-white overflow-hidden">
      <div className="flex-shrink-0 flex items-center gap-2 px-4 py-3 border-b border-gray-200 bg-gray-50">
        <MessageCircle className="w-5 h-5 text-blue-600" />
        <span className="font-medium text-gray-900">Chatbot Oftware</span>
      </div>

      <div className="flex-1 overflow-y-auto py-4 space-y-4 min-h-0 px-2 sm:px-4">
        {isPropedeutics && (
          <div className="flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-3 text-sm text-amber-800">
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-amber-600" />
            <p>
              O chatbot do Propedeutics está <strong>em andamento</strong>. Em breve você poderá fazer perguntas aqui.
            </p>
          </div>
        )}
        {messages.length === 0 && !typing && !isPropedeutics && (
          <p className="text-sm text-gray-500 text-center py-6">
            Faça uma pergunta sobre o conteúdo das apostilas. O assistente responde com base nos PDFs indexados.
          </p>
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
                    onClick={() => openSourcesModal(msg.sources!)}
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
                    ? renderAnswerByLines(msg.content, msg.sources)
                    : renderInlineBold(msg.content)}
                </div>
              ) : (
                <span className="text-gray-400">—</span>
              )}
            </div>
          </div>
        ))}
        {typing && <AIThinkingIndicator />}
        {error && (
          <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-800">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}
        {relatedQuestions.length > 0 && !typing && !isPropedeutics && (
          <div className="pt-2">
            <p className="text-xs font-medium text-gray-500 mb-2">Perguntas relacionadas:</p>
            <div className="flex flex-wrap gap-2">
              {relatedQuestions.map((q, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => sendMessage(q)}
                  className="text-left text-xs px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}
        <div ref={listEndRef} />
      </div>

      {/* Modal: um trecho (clique no ícone PDF) ou todas as fontes (botão "Fontes (N)") */}
      {sourcesModalFor && (
        <SourcesModal sources={sourcesModalFor} courseId={courseId} onClose={closeSourcesModal} />
      )}

      <form onSubmit={handleSubmit} className="flex-shrink-0 p-3 border-t border-gray-200 bg-gray-50">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => !isPropedeutics && setInput(e.target.value)}
            placeholder={isPropedeutics ? 'Chat em andamento...' : 'Digite sua pergunta...'}
            className="flex-1 min-w-0 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
            disabled={typing || isPropedeutics}
          />
          <button
            type="submit"
            disabled={typing || !input.trim() || isPropedeutics}
            className="flex-shrink-0 p-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Enviar"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </form>
    </div>
  );
}
