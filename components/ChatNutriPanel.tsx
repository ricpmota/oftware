'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Camera, Send, Loader2, UtensilsCrossed } from 'lucide-react';
import { renderInlineBold } from '@/lib/format/renderInlineBold';
import type { ChatNutriMessage, ChatNutriDayTotals, ChatNutriMealType } from '@/lib/chatnutri/types';
import { prepareMealImageForUpload } from '@/utils/prepareMealImageForUpload';

const MEAL_OPTIONS: { value: ChatNutriMealType; label: string }[] = [
  { value: 'cafe', label: 'Café' },
  { value: 'lanche1', label: 'Lanche manhã' },
  { value: 'almoco', label: 'Almoço' },
  { value: 'lanche2', label: 'Lanche tarde' },
  { value: 'jantar', label: 'Jantar' },
];

export interface ChatNutriPanelProps {
  patientId: string;
  dateKey: string;
  className?: string;
}

/**
 * ChatNutri nativo: histórico do dia (/api/chatnutri/messages), texto (/chat) e foto de refeição (/meal).
 * Altura limitada para caber no mobile (aba Nutri / meta com menu inferior).
 */
export default function ChatNutriPanel({ patientId, dateKey, className = '' }: ChatNutriPanelProps) {
  const [messages, setMessages] = useState<ChatNutriMessage[]>([]);
  const [dayTotals, setDayTotals] = useState<ChatNutriDayTotals | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [uploadingMeal, setUploadingMeal] = useState(false);
  const [input, setInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [mealType, setMealType] = useState<ChatNutriMealType>('almoco');
  const fileRef = useRef<HTMLInputElement>(null);
  const listEndRef = useRef<HTMLDivElement>(null);

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
    loadMessages();
  }, [loadMessages]);

  useEffect(() => {
    listEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending, uploadingMeal]);

  const sendText = async (e: React.FormEvent) => {
    e.preventDefault();
    const t = input.trim();
    if (!t || sending || uploadingMeal) return;
    setSending(true);
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
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!data.ok) {
        setError(typeof data.error?.message === 'string' ? data.error.message : 'Não foi possível enviar.');
        return;
      }
      setInput('');
      await loadMessages();
    } catch {
      setError('Erro de conexão.');
    } finally {
      setSending(false);
    }
  };

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || sending || uploadingMeal) return;
    setUploadingMeal(true);
    setError(null);
    try {
      const fileToSend = await prepareMealImageForUpload(file);
      const fd = new FormData();
      fd.set('patientId', patientId.trim());
      fd.set('dateKey', dateKey.trim());
      fd.set('mealType', mealType);
      fd.set('file', fileToSend);
      const res = await fetch('/api/chatnutri/meal', { method: 'POST', body: fd });
      const data = await res.json().catch(() => ({}));
      if (!data.ok) {
        setError(typeof data.error?.message === 'string' ? data.error.message : 'Erro ao enviar a foto.');
        return;
      }
      await loadMessages();
    } catch {
      setError('Erro de conexão no envio da foto.');
    } finally {
      setUploadingMeal(false);
    }
  };

  const busy = sending || uploadingMeal;

  return (
    <div
      className={`flex flex-col w-full max-w-full min-h-0 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 overflow-hidden ${className}`}
      style={{ maxHeight: 'min(32rem, calc(100dvh - 13.5rem))' }}
    >
      <div className="flex-shrink-0 flex items-center gap-2 px-3 py-2.5 border-b border-gray-200 dark:border-gray-600 bg-emerald-50/80 dark:bg-emerald-950/30">
        <UtensilsCrossed className="w-5 h-5 text-emerald-700 dark:text-emerald-400 flex-shrink-0" />
        <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">ChatNutri</span>
        {dayTotals &&
          (dayTotals.calories > 0 ||
            dayTotals.protein > 0 ||
            dayTotals.carbs > 0 ||
            dayTotals.fat > 0) && (
            <span className="ml-auto text-xs text-gray-600 dark:text-gray-400 tabular-nums truncate max-w-[55%] text-right">
              Dia: {Math.round(dayTotals.calories)} kcal · P {Math.round(dayTotals.protein * 10) / 10}g
            </span>
          )}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-3 py-3 space-y-3 overscroll-contain touch-pan-y">
        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-600" aria-hidden />
          </div>
        ) : messages.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-6 px-2">
            Tire uma foto da refeição (escolha o horário abaixo) ou escreva uma dúvida. O assistente usa o contexto
            deste dia.
          </p>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[min(100%,20rem)] rounded-lg px-3 py-2 text-sm break-words ${
                  msg.role === 'user'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-600'
                }`}
              >
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
          ))
        )}
        {(sending || uploadingMeal) && (
          <div className="flex justify-start">
            <div className="inline-flex items-center gap-2 rounded-lg px-3 py-2 bg-gray-100 dark:bg-gray-700 text-sm text-gray-600 dark:text-gray-300">
              <Loader2 className="w-4 h-4 animate-spin" />
              {uploadingMeal ? 'Analisando foto…' : 'Pensando…'}
            </div>
          </div>
        )}
        <div ref={listEndRef} />
      </div>

      <div className="flex-shrink-0 border-t border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900/50 p-3 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={mealType}
            onChange={(e) => setMealType(e.target.value as ChatNutriMealType)}
            disabled={busy}
            className="text-xs sm:text-sm flex-1 min-w-[7rem] max-w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-2 py-2"
            aria-label="Refeição da foto"
          >
            {MEAL_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={onFileChange}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={busy}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 text-white text-xs sm:text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 shrink-0"
          >
            <Camera className="w-4 h-4" />
            Foto
          </button>
        </div>

        <form onSubmit={sendText} className="flex gap-2 min-w-0">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={busy}
            placeholder="Mensagem…"
            className="flex-1 min-w-0 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={busy || !input.trim()}
            className="flex-shrink-0 inline-flex items-center justify-center p-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
            aria-label="Enviar"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>

        {error ? (
          <p className="text-xs text-red-600 dark:text-red-400" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}
