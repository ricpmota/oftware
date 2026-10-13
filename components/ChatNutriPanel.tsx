'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Camera, Send, Loader2, ImagePlus, X, Sparkles } from 'lucide-react';
import { renderInlineBold } from '@/lib/format/renderInlineBold';
import type {
  ChatNutriMessage,
  ChatNutriDayTotals,
  ChatNutriMealType,
  ChatNutriHumanAuthorKind,
} from '@/lib/chatnutri/types';
import { prepareMealImageForUpload } from '@/utils/prepareMealImageForUpload';

const MEAL_OPTIONS: { value: ChatNutriMealType; label: string }[] = [
  { value: 'cafe', label: 'Café' },
  { value: 'lanche1', label: 'Lanche manhã' },
  { value: 'almoco', label: 'Almoço' },
  { value: 'lanche2', label: 'Lanche tarde' },
  { value: 'jantar', label: 'Jantar' },
];

function todayDateKey(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatChatDayLabel(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  if (!y || !m || !d) return dateKey;
  const date = new Date(y, m - 1, d);
  const label = date.toLocaleDateString('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  });
  return label.replace(/\./g, '').replace(/\s+/g, ' ');
}

function messageAuthorBadge(msg: ChatNutriMessage): string | null {
  if (msg.role === 'assistant') return 'Assistente IA';
  if (msg.role === 'professional') {
    const kind =
      msg.authorKind === 'doctor'
        ? 'Médico'
        : msg.authorKind === 'nutritionist'
          ? 'Nutricionista'
          : 'Profissional';
    const name = msg.authorName?.trim();
    return name ? `${kind} · ${name}` : kind;
  }
  if (msg.authorKind === 'patient' || msg.role === 'user') {
    return null; // bolha do paciente já fica alinhada à direita
  }
  return null;
}

function bubbleAlign(msg: ChatNutriMessage): 'end' | 'start' {
  if (msg.role === 'user') return 'end';
  return 'start';
}

function bubbleClass(msg: ChatNutriMessage): string {
  if (msg.role === 'user') {
    return 'bg-emerald-600 text-white';
  }
  if (msg.role === 'professional') {
    return 'bg-sky-50 dark:bg-sky-950/40 text-gray-900 dark:text-gray-100 border border-sky-200 dark:border-sky-800';
  }
  return 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-600';
}

export interface ChatNutriPanelProps {
  patientId: string;
  dateKey: string;
  onDateKeyChange?: (dateKey: string) => void;
  /** Menu lateral de datas (desktop). Default true. */
  showDaysSidebar?: boolean;
  className?: string;
  /**
   * Quem escreve no composer.
   * patient (default): bolha verde à direita.
   * doctor | nutritionist: mensagem profissional, sem Gemini no envio.
   */
  authorKind?: ChatNutriHumanAuthorKind;
  authorName?: string;
  authorId?: string;
}

/**
 * ChatNutri: histórico do dia, texto humano (/message), Analisar com IA (/chat) e foto (/meal).
 * Texto (paciente ou profissional) NÃO dispara Gemini — só foto e o botão Analisar com IA.
 */
export default function ChatNutriPanel({
  patientId,
  dateKey,
  onDateKeyChange,
  showDaysSidebar = true,
  className = '',
  authorKind = 'patient',
  authorName,
  authorId,
}: ChatNutriPanelProps) {
  const [messages, setMessages] = useState<ChatNutriMessage[]>([]);
  const [dayTotals, setDayTotals] = useState<ChatNutriDayTotals | null>(null);
  const [conversationDays, setConversationDays] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingDays, setLoadingDays] = useState(false);
  const [sending, setSending] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [uploadingMeal, setUploadingMeal] = useState(false);
  const [input, setInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [mealType, setMealType] = useState<ChatNutriMealType>('almoco');
  const [mealModalOpen, setMealModalOpen] = useState(false);
  const [modalMealType, setModalMealType] = useState<ChatNutriMealType>('almoco');

  const mealTypeForNextUploadRef = useRef<ChatNutriMealType>('almoco');
  const fileRefCamera = useRef<HTMLInputElement>(null);
  const fileRefGallery = useRef<HTMLInputElement>(null);
  const listEndRef = useRef<HTMLDivElement>(null);
  const [portalReady, setPortalReady] = useState(false);

  const isProfessional = authorKind === 'doctor' || authorKind === 'nutritionist';

  useEffect(() => {
    setPortalReady(true);
  }, []);

  useEffect(() => {
    if (!mealModalOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMealModalOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mealModalOpen]);

  const loadDays = useCallback(async () => {
    if (!patientId?.trim()) return;
    setLoadingDays(true);
    try {
      const q = new URLSearchParams({ patientId: patientId.trim() });
      const res = await fetch(`/api/chatnutri/days?${q.toString()}`);
      const data = await res.json().catch(() => ({}));
      if (data.ok && Array.isArray(data.days)) {
        setConversationDays(data.days.filter((d: unknown) => typeof d === 'string'));
      }
    } catch {
      /* lista auxiliar — não bloqueia o chat */
    } finally {
      setLoadingDays(false);
    }
  }, [patientId]);

  const loadMessages = useCallback(async () => {
    if (!patientId?.trim() || !dateKey?.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const q = new URLSearchParams({ patientId: patientId.trim(), dateKey: dateKey.trim() });
      const res = await fetch(`/api/chatnutri/messages?${q.toString()}`);
      const data = await res.json().catch(() => ({}));
      if (!data.ok) {
        setError(typeof data.error?.message === 'string' ? data.error.message : 'Não foi possível carregar o dia.');
        setMessages([]);
        setDayTotals(null);
        return;
      }
      setMessages(Array.isArray(data.messages) ? data.messages : []);
      setDayTotals(data.dayTotals ?? null);
    } catch {
      setError('Erro de conexão ao carregar mensagens.');
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, [patientId, dateKey]);

  useEffect(() => {
    loadDays();
  }, [loadDays]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  useEffect(() => {
    listEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending, analyzing, uploadingMeal]);

  const selectDate = (next: string) => {
    if (!next || next === dateKey) return;
    onDateKeyChange?.(next);
  };

  const openPhotoModal = () => {
    if (sending || analyzing || uploadingMeal) return;
    setModalMealType(mealType);
    setMealModalOpen(true);
  };

  const closePhotoModal = () => setMealModalOpen(false);

  const triggerPhotoPicker = (source: 'camera' | 'gallery') => {
    mealTypeForNextUploadRef.current = modalMealType;
    setMealType(modalMealType);
    setMealModalOpen(false);
    const ref = source === 'camera' ? fileRefCamera : fileRefGallery;
    requestAnimationFrame(() => ref.current?.click());
  };

  /** Envio humano — sem Gemini */
  const submitText = async () => {
    const t = input.trim();
    if (!t || sending || analyzing || uploadingMeal) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch('/api/chatnutri/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: patientId.trim(),
          dateKey: dateKey.trim(),
          text: t,
          authorKind,
          ...(authorName?.trim() ? { authorName: authorName.trim() } : {}),
          ...(authorId?.trim() ? { authorId: authorId.trim() } : {}),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!data.ok) {
        setError(typeof data.error?.message === 'string' ? data.error.message : 'Não foi possível enviar.');
        return;
      }
      setInput('');
      await Promise.all([loadMessages(), loadDays()]);
    } catch {
      setError('Erro de conexão.');
    } finally {
      setSending(false);
    }
  };

  /** Analisar com IA — dispara Gemini */
  const analyzeWithAi = async () => {
    const t = input.trim();
    if (!t || sending || analyzing || uploadingMeal) return;
    setAnalyzing(true);
    setError(null);
    try {
      const res = await fetch('/api/chatnutri/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: patientId.trim(),
          dateKey: dateKey.trim(),
          type: 'text',
          text: t,
          authorKind,
          ...(authorName?.trim() ? { authorName: authorName.trim() } : {}),
          ...(authorId?.trim() ? { authorId: authorId.trim() } : {}),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!data.ok) {
        setError(typeof data.error?.message === 'string' ? data.error.message : 'Não foi possível analisar.');
        return;
      }
      setInput('');
      await Promise.all([loadMessages(), loadDays()]);
    } catch {
      setError('Erro de conexão.');
    } finally {
      setAnalyzing(false);
    }
  };

  const sendText = (e: React.FormEvent) => {
    e.preventDefault();
    void submitText();
  };

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || sending || analyzing || uploadingMeal) return;
    setUploadingMeal(true);
    setError(null);
    const mealForUpload = mealTypeForNextUploadRef.current;
    try {
      const fileToSend = await prepareMealImageForUpload(file);
      const fd = new FormData();
      fd.set('patientId', patientId.trim());
      fd.set('dateKey', dateKey.trim());
      fd.set('mealType', mealForUpload);
      fd.set('file', fileToSend);
      const res = await fetch('/api/chatnutri/meal', { method: 'POST', body: fd });
      const data = await res.json().catch(() => ({}));
      if (!data.ok) {
        setError(typeof data.error?.message === 'string' ? data.error.message : 'Erro ao enviar a foto.');
        return;
      }
      await Promise.all([loadMessages(), loadDays()]);
    } catch {
      setError('Erro de conexão no envio da foto.');
    } finally {
      setUploadingMeal(false);
    }
  };

  const busy = sending || analyzing || uploadingMeal;
  const hoje = todayDateKey();
  const sidebarDays = (() => {
    const set = new Set(conversationDays);
    set.add(hoje);
    if (dateKey) set.add(dateKey);
    return [...set].sort((a, b) => b.localeCompare(a));
  })();

  const placeholder = isProfessional ? 'Escrever para o paciente…' : 'Escrever mensagem…';

  const mealModal =
    portalReady &&
    mealModalOpen &&
    createPortal(
      <div
        className="fixed inset-0 z-[200] flex items-end justify-center sm:items-center p-0 sm:p-4 bg-black/45 backdrop-blur-[2px]"
        role="presentation"
        onClick={closePhotoModal}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="chatnutri-meal-modal-title"
          className="w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl bg-white dark:bg-gray-800 shadow-xl border border-gray-200 dark:border-gray-600 overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-gray-200 dark:border-gray-600 bg-emerald-50/90 dark:bg-emerald-950/40">
            <h2 id="chatnutri-meal-modal-title" className="text-base font-semibold text-gray-900 dark:text-gray-100">
              Qual refeição é esta foto?
            </h2>
            <button
              type="button"
              onClick={closePhotoModal}
              className="p-2 rounded-lg text-gray-600 hover:bg-gray-200/80 dark:text-gray-300 dark:hover:bg-gray-700"
              aria-label="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="p-4 space-y-3 max-h-[50vh] overflow-y-auto">
            <div className="grid grid-cols-1 gap-2">
              {MEAL_OPTIONS.map((o) => (
                <label
                  key={o.value}
                  className={`flex items-center gap-3 rounded-xl border px-3 py-3 cursor-pointer transition-colors ${
                    modalMealType === o.value
                      ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/50 ring-1 ring-emerald-500/30'
                      : 'border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                  }`}
                >
                  <input
                    type="radio"
                    name="chatnutri-meal"
                    value={o.value}
                    checked={modalMealType === o.value}
                    onChange={() => setModalMealType(o.value)}
                    className="text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{o.label}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="flex flex-col-reverse sm:flex-row gap-2 p-4 pt-0 border-t border-gray-100 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-900/40">
            <button
              type="button"
              onClick={closePhotoModal}
              className="w-full sm:flex-1 py-3 rounded-xl border border-gray-300 dark:border-gray-600 text-sm font-semibold text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => triggerPhotoPicker('gallery')}
              disabled={busy}
              className="w-full sm:flex-1 inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-white dark:bg-gray-800 border-2 border-emerald-600 text-emerald-700 dark:text-emerald-400 text-sm font-semibold hover:bg-emerald-50 dark:hover:bg-emerald-950/30 disabled:opacity-50"
            >
              <ImagePlus className="w-5 h-5" />
              Arquivos / galeria
            </button>
            <button
              type="button"
              onClick={() => triggerPhotoPicker('camera')}
              disabled={busy}
              className="w-full sm:flex-1 inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50"
            >
              <Camera className="w-5 h-5" />
              Câmera
            </button>
          </div>
        </div>
      </div>,
      document.body
    );

  const datePicker = onDateKeyChange ? (
    <input
      type="date"
      value={dateKey}
      onChange={(e) => selectDate(e.target.value)}
      className="h-9 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-2 text-sm text-gray-900 dark:text-white"
      aria-label="Escolher data do chat"
    />
  ) : null;

  return (
    <div className={`flex h-full min-h-0 w-full max-w-full overflow-hidden ${className}`}>
      {mealModal}

      <input
        ref={fileRefCamera}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={onFileChange}
      />
      <input ref={fileRefGallery} type="file" accept="image/*" className="hidden" onChange={onFileChange} />

      {showDaysSidebar && onDateKeyChange ? (
        <aside className="hidden md:flex w-40 xl:w-44 shrink-0 flex-col border-r border-gray-200 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-900/40 min-h-0">
          <div className="shrink-0 px-3 py-2.5 border-b border-gray-200 dark:border-gray-700">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Conversas
            </p>
          </div>
          <nav className="flex-1 min-h-0 overflow-y-auto overscroll-contain py-2 px-1.5 space-y-0.5" aria-label="Datas com conversas">
            {loadingDays && sidebarDays.length === 0 ? (
              <div className="flex justify-center py-6">
                <Loader2 className="w-5 h-5 animate-spin text-emerald-600" aria-hidden />
              </div>
            ) : (
              sidebarDays.map((day) => {
                const ativo = day === dateKey;
                const isHoje = day === hoje;
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => selectDate(day)}
                    className={`w-full text-left rounded-lg px-2.5 py-2 transition-colors ${
                      ativo
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200 ring-1 ring-emerald-500/30'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-800'
                    }`}
                  >
                    <span className="block text-sm font-medium capitalize leading-tight">
                      {formatChatDayLabel(day)}
                    </span>
                    <span className="block text-[10px] text-gray-500 dark:text-gray-400 mt-0.5 tabular-nums">
                      {isHoje ? 'Hoje · ' : ''}
                      {day.split('-').reverse().join('/')}
                    </span>
                  </button>
                );
              })
            )}
          </nav>
          <div className="shrink-0 p-2 border-t border-gray-200 dark:border-gray-700">{datePicker}</div>
        </aside>
      ) : null}

      <div className="flex flex-1 min-h-0 min-w-0 flex-col overflow-hidden">
        {onDateKeyChange ? (
          <div className={`shrink-0 pb-2 ${showDaysSidebar ? 'md:hidden' : ''}`}>{datePicker}</div>
        ) : null}

        {dayTotals &&
          (dayTotals.calories > 0 ||
            dayTotals.protein > 0 ||
            dayTotals.carbs > 0 ||
            dayTotals.fat > 0) && (
            <div className="flex-shrink-0 flex justify-end py-1 px-0.5">
              <span className="text-xs text-gray-600 dark:text-gray-400 tabular-nums truncate max-w-full text-right">
                Dia: {Math.round(dayTotals.calories)} kcal · P {Math.round(dayTotals.protein * 10) / 10}g
              </span>
            </div>
          )}

        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden py-2 space-y-3 overscroll-contain touch-pan-y">
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-600" aria-hidden />
            </div>
          ) : messages.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-6 px-2">
              Envie uma foto da refeição para análise automática, converse pelo texto ou use{' '}
              <span className="font-medium text-gray-700 dark:text-gray-300">Analisar com IA</span> quando quiser a
              resposta do assistente.
            </p>
          ) : (
            messages.map((msg) => {
              const badge = messageAuthorBadge(msg);
              const align = bubbleAlign(msg);
              return (
                <div
                  key={msg.id}
                  className={`flex ${align === 'end' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[min(100%,20rem)] rounded-lg px-3 py-2 text-sm break-words ${bubbleClass(msg)}`}>
                    {badge ? (
                      <p
                        className={`text-[10px] font-semibold uppercase tracking-wide mb-1 ${
                          msg.role === 'professional'
                            ? 'text-sky-700 dark:text-sky-300'
                            : 'text-gray-500 dark:text-gray-400'
                        }`}
                      >
                        {badge}
                      </p>
                    ) : null}
                    {msg.imageUrl ? (
                      <img
                        src={msg.imageUrl}
                        alt=""
                        className="rounded-md max-h-40 w-full max-w-full object-contain mb-1.5 bg-black/5"
                      />
                    ) : null}
                    <p className="whitespace-pre-wrap">{renderInlineBold(msg.text)}</p>
                  </div>
                </div>
              );
            })
          )}
          {(analyzing || uploadingMeal) && (
            <div className="flex justify-start">
              <div className="inline-flex items-center gap-2 rounded-lg px-3 py-2 bg-gray-100 dark:bg-gray-700 text-sm text-gray-600 dark:text-gray-300">
                <Loader2 className="w-4 h-4 animate-spin" />
                {uploadingMeal ? 'Analisando foto…' : 'Analisando com IA…'}
              </div>
            </div>
          )}
          <div ref={listEndRef} />
        </div>

        <div className="flex-shrink-0 border-t border-gray-100 dark:border-gray-700 pt-3 pb-0.5 bg-white dark:bg-transparent">
          <form onSubmit={sendText} className="flex flex-col gap-2 min-w-0">
            <div className="flex gap-2 min-w-0 items-center">
              <button
                type="button"
                onClick={openPhotoModal}
                disabled={busy}
                className="flex-shrink-0 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 shadow-sm"
                aria-label="Enviar foto da refeição"
                title="Enviar foto da refeição (análise automática)"
              >
                <Camera className="w-5 h-5" />
              </button>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={busy}
                placeholder={placeholder}
                className="flex-1 min-w-0 h-11 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 text-sm leading-none"
              />
              <button
                type="submit"
                disabled={busy || !input.trim()}
                className="flex-shrink-0 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 shadow-sm"
                aria-label="Enviar mensagem"
                title="Enviar sem resposta automática da IA"
              >
                {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
              </button>
            </div>
            <button
              type="button"
              onClick={() => void analyzeWithAi()}
              disabled={busy || !input.trim()}
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-violet-300 dark:border-violet-700 bg-violet-50 dark:bg-violet-950/40 text-violet-800 dark:text-violet-200 text-sm font-semibold hover:bg-violet-100 dark:hover:bg-violet-900/50 disabled:opacity-50"
              title="Envia o texto e pede resposta do assistente IA"
            >
              {analyzing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              Analisar com IA
            </button>
          </form>

          {error ? (
            <p className="text-xs text-red-600 dark:text-red-400 mt-2" role="alert">
              {error}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
