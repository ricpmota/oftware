'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { MatchConnectionRow } from '@/components/meta/match/discovery/MatchConnectionRow';
import { useMatchAuth } from '@/components/meta/match/useMatchAuth';
import { matchPairKey } from '@/lib/match/matchPair';
import { fetchMyConnections, type MatchPerson } from '@/services/matchSocialClient';

export function MatchConnectionsScreen() {
  const router = useRouter();
  const user = useMatchAuth();
  const [people, setPeople] = useState<MatchPerson[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user === null) router.replace('/');
  }, [router, user]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    fetchMyConnections(40)
      .then((result) => {
        if (!cancelled) setPeople(result.people);
      })
      .catch(() => {
        if (!cancelled) setError('Não foi possível abrir suas conexões.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const visible = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return people;
    return people.filter((person) => {
      const name = person.card.displayName.toLowerCase();
      const city = (person.card.cityLine || '').toLowerCase();
      return name.includes(term) || city.includes(term);
    });
  }, [people, query]);

  return (
    <div className="mx-auto min-h-full w-full max-w-[480px] overflow-x-hidden bg-[#0A1F44] px-4 pb-6 pt-[max(1rem,env(safe-area-inset-top))] text-white md:max-w-[640px]">
      <button type="button" onClick={() => router.push('/meta/match')} className="text-sm font-semibold text-white/80">
        Voltar
      </button>
      <h1 className="mt-4 text-2xl font-extrabold">Minhas conexões</h1>
      <label className="mt-4 block">
        <span className="sr-only">Buscar conexões</span>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar conexões"
          className="h-11 w-full rounded-full border border-white/15 bg-white/5 px-4 text-sm text-white outline-none placeholder:text-white/40"
        />
      </label>
      {loading ? <p className="mt-8 text-sm text-white/60">Carregando…</p> : null}
      {error ? <p className="mt-8 text-sm text-[#F3B4B4]">{error}</p> : null}
      {!loading && !people.length && !error ? (
        <div className="mt-8">
          <p className="text-lg font-semibold">Você ainda não tem conexões.</p>
          <p className="mt-2 text-sm leading-relaxed text-white/70">
            Quando duas pessoas escolherem se conectar, elas aparecerão aqui.
          </p>
          <button
            type="button"
            onClick={() => router.push('/meta/match/discover')}
            className="mt-6 flex h-11 items-center justify-center rounded-full bg-[#4CCB7A] px-5 text-sm font-semibold text-[#0A1F44]"
          >
            Descobrir conexões
          </button>
        </div>
      ) : null}
      {!loading && people.length > 0 && !visible.length ? (
        <p className="mt-8 text-sm text-white/70">Nenhuma conexão encontrada.</p>
      ) : null}
      <ul className="mt-2">
        {user
          ? visible.map((person) => (
              <MatchConnectionRow key={person.uid} person={person} pairKey={matchPairKey(user.uid, person.uid)} />
            ))
          : null}
      </ul>
    </div>
  );
}
