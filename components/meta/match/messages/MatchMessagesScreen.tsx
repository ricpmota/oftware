'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useMatchAuth } from '@/components/meta/match/useMatchAuth';
import { messageClock, messageDayLabel } from '@/lib/match/matchChat';
import { subscribeMatchConversationList } from '@/services/matchChatLive';
import { fetchMatchConversations, type MatchChatPreview } from '@/services/matchSocialClient';

function whenLabel(ms: number): string {
  const day = messageDayLabel(ms);
  if (day === 'Hoje') return messageClock(ms);
  if (day === 'Ontem') return 'Ontem';
  return day;
}

export function MatchMessagesScreen() {
  const router = useRouter();
  const user = useMatchAuth();
  const [conversations, setConversations] = useState<MatchChatPreview[]>([]);
  const [queryText, setQueryText] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user === null) router.replace('/');
  }, [router, user]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const load = () => {
      fetchMatchConversations()
        .then((result) => {
          if (!cancelled) setConversations(result.conversations);
        })
        .catch(() => {
          if (!cancelled) setError('Não foi possível abrir as mensagens.');
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    };
    load();
    const stop = subscribeMatchConversationList(user.uid, load);
    return () => {
      cancelled = true;
      stop();
    };
  }, [user]);

  const visible = useMemo(() => {
    const term = queryText.trim().toLowerCase();
    if (!term) return conversations;
    return conversations.filter((item) => item.displayName.toLowerCase().includes(term));
  }, [conversations, queryText]);

  return (
    <div className="mx-auto min-h-full w-full max-w-[480px] overflow-x-hidden bg-[#0A1F44] px-4 pb-6 pt-[max(1rem,env(safe-area-inset-top))] text-white md:max-w-[640px]">
      <button type="button" onClick={() => router.push('/meta/match')} className="text-sm font-semibold text-white/80">
        Voltar
      </button>
      <h1 className="mt-4 text-2xl font-extrabold">Mensagens</h1>
      <label className="mt-4 block">
        <span className="sr-only">Buscar mensagens</span>
        <input
          value={queryText}
          onChange={(event) => setQueryText(event.target.value)}
          placeholder="Buscar"
          className="h-11 w-full rounded-full border border-white/15 bg-white/5 px-4 text-sm outline-none placeholder:text-white/40"
        />
      </label>
      {loading ? <p className="mt-8 text-sm text-white/60">Carregando…</p> : null}
      {error ? <p className="mt-8 text-sm text-[#F3B4B4]">{error}</p> : null}
      {!loading && !conversations.length && !error ? (
        <div className="mt-8">
          <p className="text-lg font-semibold">Suas conversas aparecerão aqui.</p>
          <p className="mt-2 text-sm leading-relaxed text-white/70">Quando você se conectar com alguém, poderá iniciar uma conversa.</p>
          <button
            type="button"
            onClick={() => router.push('/meta/match/connections')}
            className="mt-6 flex h-11 items-center justify-center rounded-full bg-[#4CCB7A] px-5 text-sm font-semibold text-[#0A1F44]"
          >
            Ver minhas conexões
          </button>
        </div>
      ) : null}
      {!loading && conversations.length > 0 && !visible.length ? <p className="mt-8 text-sm text-white/70">Nenhuma conversa encontrada.</p> : null}
      <ul className="mt-3">
        {visible.map((item) => (
          <li key={item.pairKey} className="border-b border-white/10">
            <Link href={`/meta/match/messages/${item.pairKey}`} className="flex items-center gap-3 py-3">
              {item.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.photoUrl} alt="" className="h-14 w-14 rounded-full object-cover" />
              ) : (
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/10 text-lg font-extrabold">
                  {item.displayName.slice(0, 1).toUpperCase()}
                </span>
              )}
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-2">
                  <span className="truncate font-semibold">{item.displayName}</span>
                  <span className="shrink-0 text-[11px] text-white/50">{item.lastMessageAtMs ? whenLabel(item.lastMessageAtMs) : ''}</span>
                </span>
                <span className="mt-0.5 flex items-center justify-between gap-2">
                  <span className="truncate text-sm text-white/70">{item.lastText}</span>
                  {item.unread > 0 ? (
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#4CCB7A] px-1.5 text-[11px] font-bold text-[#0A1F44]">
                      {item.unread}
                    </span>
                  ) : null}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
