'use client';

import { Paperclip, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useMatchAuth } from '@/components/meta/match/useMatchAuth';
import { MATCH_MESSAGE_MAX, messageClock, messageDayLabel } from '@/lib/match/matchChat';
import { subscribeMatchMessages } from '@/services/matchChatLive';
import {
  fetchMatchThread,
  markMatchThreadRead,
  sendMatchMessage,
  type MatchChatMessage,
} from '@/services/matchSocialClient';

type Row = MatchChatMessage;

function mergeMessages(...lists: Row[][]): Row[] {
  const map = new Map<string, Row>();
  for (const list of lists) {
    for (const item of list) map.set(item.id, item);
  }
  return [...map.values()].sort((a, b) => a.createdAtMs - b.createdAtMs || a.id.localeCompare(b.id));
}

export function MatchChatScreen({ pairKey }: { pairKey: string }) {
  const router = useRouter();
  const user = useMatchAuth();
  const scroller = useRef<HTMLDivElement>(null);
  const nearBottom = useRef(true);
  const loadingOlder = useRef(false);
  const [peer, setPeer] = useState<{ uid: string; name: string; photoUrl?: string } | null>(null);
  const [messages, setMessages] = useState<Row[]>([]);
  const [olderBeforeMs, setOlderBeforeMs] = useState<number | null>(null);
  const [text, setText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user === null) router.replace('/');
  }, [router, user]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setLoading(true);
    fetchMatchThread(pairKey)
      .then((result) => {
        if (cancelled) return;
        setPeer({ uid: result.otherUid, name: result.displayName, ...(result.photoUrl ? { photoUrl: result.photoUrl } : {}) });
        setMessages(result.messages.map((item) => ({ ...item, status: 'sent' as const })));
        setOlderBeforeMs(result.olderBeforeMs);
        nearBottom.current = true;
        void markMatchThreadRead(pairKey).catch(() => undefined);
      })
      .catch(() => {
        if (!cancelled) setError('Esta conversa não está disponível.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    const stop = subscribeMatchMessages(pairKey, (rows) => {
      setMessages((current) => {
        const firstLive = rows[0]?.createdAtMs || 0;
        const older = current.filter((item) => item.status === 'sent' && firstLive > 0 && item.createdAtMs < firstLive && !rows.some((row) => row.id === item.id));
        const pending = current.filter((item) => (item.status === 'sending' || item.status === 'error') && !rows.some((row) => row.id === item.id));
        return mergeMessages(older, rows, pending);
      });
      void markMatchThreadRead(pairKey).catch(() => undefined);
    });
    return () => {
      cancelled = true;
      stop();
    };
  }, [pairKey, user]);

  useEffect(() => {
    const el = scroller.current;
    if (!el || !nearBottom.current) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, loading]);

  async function loadOlder() {
    if (!olderBeforeMs || loadingOlder.current) return;
    loadingOlder.current = true;
    const el = scroller.current;
    const previous = el?.scrollHeight || 0;
    try {
      const result = await fetchMatchThread(pairKey, olderBeforeMs);
      setOlderBeforeMs(result.olderBeforeMs);
      setMessages((current) => mergeMessages(result.messages.map((item) => ({ ...item, status: 'sent' as const })), current));
      requestAnimationFrame(() => {
        if (el) el.scrollTop += el.scrollHeight - previous;
      });
    } finally {
      loadingOlder.current = false;
    }
  }

  function onScroll() {
    const el = scroller.current;
    if (!el) return;
    nearBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    if (el.scrollTop < 40 && olderBeforeMs) void loadOlder();
  }

  async function submit() {
    const value = text.trim();
    const selected = file;
    if ((!value && !selected) || !user || sending || value.length > MATCH_MESSAGE_MAX) return;
    const clientMessageId = crypto.randomUUID().replace(/-/g, '').slice(0, 24);
    const optimistic: Row = {
      id: clientMessageId,
      senderUid: user.uid,
      text: value,
      createdAtMs: Date.now(),
      status: 'sending',
      ...(selected
        ? {
            attachment: {
              url: URL.createObjectURL(selected),
              name: selected.name,
              contentType: selected.type,
              kind: selected.type.startsWith('image/') ? ('image' as const) : ('file' as const),
            },
          }
        : {}),
    };
    setText('');
    setFile(null);
    if (fileInput.current) fileInput.current.value = '';
    setSending(true);
    nearBottom.current = true;
    setMessages((current) => mergeMessages(current, [optimistic]));
    try {
      const result = await sendMatchMessage(pairKey, value, clientMessageId, selected || undefined);
      setMessages((current) => current.map((item) => (item.id === clientMessageId ? { ...result.message, status: 'sent' } : item)));
    } catch {
      setMessages((current) => current.map((item) => (item.id === clientMessageId ? { ...item, status: 'error' } : item)));
    } finally {
      setSending(false);
    }
  }

  let lastDay = '';

  return (
    <div className="mx-auto flex h-full w-full max-w-[480px] flex-col bg-[#0A1F44] text-white md:max-w-[640px]">
      <header className="flex items-center gap-3 border-b border-white/10 px-3 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <button type="button" onClick={() => router.push('/meta/match/messages')} aria-label="Voltar" className="text-lg text-white/80">
          ←
        </button>
        {peer ? (
          <Link href={`/meta/match/people/${peer.uid}`} className="flex min-w-0 items-center gap-2">
            {peer.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={peer.photoUrl} alt="" className="h-10 w-10 rounded-full object-cover" />
            ) : (
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-sm font-extrabold">
                {peer.name.slice(0, 1).toUpperCase()}
              </span>
            )}
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold">{peer.name}</span>
              <span className="block text-[11px] text-[#4CCB7A]">✓ Conectados</span>
            </span>
          </Link>
        ) : (
          <span className="text-sm text-white/60">Conversa</span>
        )}
      </header>
      <div ref={scroller} onScroll={onScroll} className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 py-4">
        {loading ? <p className="text-center text-sm text-white/50">Carregando…</p> : null}
        {error ? <p className="text-center text-sm text-[#F3B4B4]">{error}</p> : null}
        {!loading && !error && !messages.length ? (
          <p className="px-6 text-center text-sm leading-relaxed text-white/60">A conversa começa quando alguém envia a primeira mensagem.</p>
        ) : null}
        {messages.map((item) => {
          const day = item.createdAtMs ? messageDayLabel(item.createdAtMs) : '';
          const showDay = day && day !== lastDay;
          if (showDay) lastDay = day;
          const mine = user?.uid === item.senderUid;
          return (
            <div key={item.id}>
              {showDay ? <p className="py-2 text-center text-[11px] text-white/45">{day}</p> : null}
              <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[78%] rounded-2xl px-3 py-2 text-sm leading-snug ${
                    mine ? 'bg-[#4CCB7A] text-[#0A1F44]' : 'bg-white text-[#0A1F44]'
                  } ${item.status === 'error' ? 'opacity-60' : ''}`}
                >
                  {item.attachment?.kind === 'image' ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.attachment.url} alt="" className="mb-1 max-h-52 w-full rounded-xl object-cover" />
                  ) : null}
                  {item.attachment?.kind === 'file' ? (
                    <a href={item.attachment.url} target="_blank" rel="noreferrer" className="mb-1 block font-semibold underline">
                      {item.attachment.name}
                    </a>
                  ) : null}
                  {item.text ? <p className="whitespace-pre-wrap break-words">{item.text}</p> : null}
                  <p className={`mt-1 text-[10px] ${mine ? 'text-[#0A1F44]/70' : 'text-[#0A1F44]/55'}`}>
                    {item.status === 'sending' ? 'Enviando…' : item.status === 'error' ? 'Não enviada' : messageClock(item.createdAtMs)}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <form
        className="border-t border-white/10 px-3 py-2"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        {file ? (
          <p className="mb-2 flex items-center justify-between gap-2 rounded-xl bg-white/10 px-3 py-2 text-[13px] text-white">
            <span className="min-w-0 truncate">{file.name}</span>
            <button type="button" aria-label="Remover arquivo" onClick={() => setFile(null)} className="text-white/70">
              <X className="h-4 w-4" />
            </button>
          </p>
        ) : null}
        <div className="flex items-end gap-2">
          <input
            ref={fileInput}
            type="file"
            className="hidden"
            accept="image/*,.pdf,.txt,.doc,.docx,.xls,.xlsx,.mp3,.mp4"
            onChange={(event) => setFile(event.target.files?.[0] || null)}
          />
          <button
            type="button"
            aria-label="Anexar arquivo"
            disabled={Boolean(error) || loading}
            onClick={() => fileInput.current?.click()}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white/80"
          >
            <Paperclip className="h-5 w-5" />
          </button>
          <textarea
            value={text}
            maxLength={MATCH_MESSAGE_MAX}
            rows={1}
            disabled={Boolean(error) || loading}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={(event) => {
              const desktop = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
              if (event.key === 'Enter' && !event.shiftKey && desktop) {
                event.preventDefault();
                void submit();
              }
            }}
            placeholder="Escreva uma mensagem..."
            className="max-h-28 min-h-11 flex-1 resize-none rounded-2xl border border-white/15 bg-white/5 px-3 py-2.5 text-sm text-white caret-white outline-none placeholder:text-white/40"
            style={{ WebkitTextFillColor: '#ffffff' }}
          />
          <button
            type="submit"
            disabled={sending || (!text.trim() && !file)}
            aria-label="Enviar mensagem"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#4CCB7A] text-lg font-bold text-[#0A1F44] disabled:opacity-40"
          >
            ➤
          </button>
        </div>
      </form>
    </div>
  );
}
