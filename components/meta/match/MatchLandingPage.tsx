'use client';

import { ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useMatchAuth } from './useMatchAuth';
import { MatchCommunityCards } from './MatchCommunityCards';
import { MatchHeader } from './MatchHeader';
import { MatchConnectionWaves } from './MatchConnectionWaves';
import { MatchHero } from './MatchHero';
import { MatchDiscoveryOptIn } from './MatchDiscoveryOptIn';
import { MatchNearbyPeople } from './discovery/MatchNearbyPeople';
import { MatchRecentConnections } from './discovery/MatchRecentConnections';
import { readPassedUids } from '@/lib/match/matchPassedPeople';
import { getMyMatchProfile } from '@/services/matchProfileService';
import {
  fetchDiscovery,
  fetchIncomingRequests,
  fetchMatchVisibility,
  fetchMyConnections,
  type MatchPerson,
} from '@/services/matchSocialClient';

export function MatchLandingPage() {
  const router = useRouter();
  const user = useMatchAuth();
  const [onboarded, setOnboarded] = useState(false);
  const [discoverable, setDiscoverable] = useState(false);
  const [incoming, setIncoming] = useState<MatchPerson[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [recent, setRecent] = useState<MatchPerson[] | null>(null);
  const [nearby, setNearby] = useState<MatchPerson[]>([]);
  const [passedIds, setPassedIds] = useState<string[]>([]);

  useEffect(() => {
    if (!user) {
      setOnboarded(false);
      setDiscoverable(false);
      setIncoming([]);
      setPendingCount(0);
      setRecent(null);
      setNearby([]);
      setPassedIds([]);
      return;
    }
    const syncPassed = () => setPassedIds(readPassedUids(user.uid));
    syncPassed();
    const onShow = () => {
      if (document.visibilityState === 'visible') syncPassed();
    };
    document.addEventListener('visibilitychange', onShow);
    let cancelled = false;
    getMyMatchProfile()
      .then((profile) => {
        if (cancelled) return;
        const done = profile?.onboardingCompleted === true;
        setOnboarded(done);
        fetchMatchVisibility()
          .then((result) => {
            if (!cancelled) setDiscoverable(result.discoverable);
          })
          .catch(() => undefined);
        fetchIncomingRequests()
          .then((result) => {
            if (cancelled) return;
            setIncoming(result.people);
            setPendingCount(result.pendingCount);
          })
          .catch(() => undefined);
        fetchDiscovery()
          .then((result) => {
            if (cancelled) return;
            setNearby(result.people);
            const saved = new Set([...(result.passedUids || []), ...readPassedUids(user.uid)]);
            setPassedIds([...saved]);
          })
          .catch(() => undefined);
        fetchMyConnections(8)
          .then((result) => {
            if (!cancelled) setRecent(result.people);
          })
          .catch(() => {
            if (!cancelled) setRecent([]);
          });
      })
      .catch(() => {
        if (!cancelled) setOnboarded(false);
      });
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onShow);
    };
  }, [user]);

  function onJoin() {
    if (!user) {
      router.push('/');
      return;
    }
    router.push(onboarded || discoverable ? '/meta/match/discover' : '/meta/match/onboarding');
  }

  const socialHome = onboarded || discoverable || pendingCount > 0;
  const heroClass = socialHome
    ? 'relative flex min-h-[22rem] flex-1 flex-col'
    : 'relative min-h-[20rem] h-[min(68dvh,36rem)]';

  return (
    <div className="flex min-h-full flex-1 flex-col overflow-x-hidden bg-[#06142e] text-white">
      <div
        className={`relative mx-auto flex w-full max-w-[480px] flex-1 flex-col md:shadow-[0_0_40px_-24px_rgba(10,31,68,0.45)] ${
          socialHome ? 'min-h-full' : 'min-h-full bg-[#0A1F44]'
        }`}
      >
        <section className={heroClass}>
          <MatchHero className="object-cover object-[center_30%]" />
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background: socialHome
                ? 'linear-gradient(to bottom, rgba(10,31,68,0.42) 0%, rgba(10,31,68,0.08) 34%, rgba(10,31,68,0.28) 68%, rgba(10,31,68,0.55) 100%)'
                : 'linear-gradient(to bottom, rgba(10,31,68,0.42) 0%, rgba(10,31,68,0.05) 32%, rgba(10,31,68,0.2) 58%, rgba(10,31,68,0.92) 100%)',
            }}
            aria-hidden="true"
          />
          <MatchConnectionWaves />
          <MatchHeader
            onBack={() => router.push('/meta')}
            trailing={user ? <MatchDiscoveryOptIn enabled={discoverable} onChange={setDiscoverable} /> : null}
          />
          <div className={`relative z-20 px-4 ${socialHome ? 'mt-auto pb-3' : 'absolute inset-x-0 bottom-0 pb-6'}`}>
            <h1 className="text-[clamp(1.45rem,6.2vw,1.85rem)] font-extrabold leading-[1.02] tracking-tight drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)]">
              <span className="text-white">
                Conexões
                <br />
                para uma vida
              </span>
              <br />
              <span className="text-[#D7E6FF]">mais saudável</span>
            </h1>
            <p className="mt-2 max-w-[22rem] text-[13px] leading-snug text-white/90">
              Encontre pessoas com interesses em comum, compartilhe experiências e viva novas histórias através da saúde e do bem-estar.
            </p>
            {onboarded || discoverable ? null : (
              <button
                type="button"
                onClick={onJoin}
                disabled={user === undefined}
                className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-full bg-[#4CCB7A] text-[14px] font-semibold text-[#0A1F44] transition-transform duration-150 hover:brightness-[1.03] active:scale-[0.98] disabled:opacity-70"
              >
                Quero fazer parte
                <ArrowRight className="h-4 w-4" strokeWidth={2.25} aria-hidden="true" />
              </button>
            )}
            {socialHome ? <MatchNearbyPeople people={nearby} passedIds={passedIds} /> : null}
          </div>
        </section>

        {onboarded || discoverable || pendingCount > 0 ? (
          <main className="relative z-10 -mt-3 mt-auto shrink-0 overflow-hidden rounded-t-[1.75rem] bg-[#0A1F44] px-4 pb-3 pt-3">
            <MatchConnectionWaves placement="card" />
            <div className="relative z-[1] [&>section:first-child]:mt-0">
            {pendingCount > 0 ? (
              <MatchRecentConnections
                people={incoming.slice(0, 8)}
                title="Querem se conectar"
                seeAllHref="/meta/match/requests"
                seeAllLabel="Ver todos"
                count={pendingCount}
                ring={false}
                hrefFor={(person) => `/meta/match/requests?uid=${encodeURIComponent(person.uid)}`}
                labelFor={(name) => `Ver interesse de ${name}`}
              />
            ) : null}
            <MatchRecentConnections
              people={recent ?? []}
              collapsible
              empty={
                recent ? (
                  <p className="text-[13px] leading-snug text-white/70">Suas conexões aparecerão aqui.</p>
                ) : (
                  <p className="text-[13px] text-white/60">Carregando…</p>
                )
              }
            />
            </div>
          </main>
        ) : (
          <div className="px-4 pb-8">
            <div className="mt-3">
              <MatchCommunityCards />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
