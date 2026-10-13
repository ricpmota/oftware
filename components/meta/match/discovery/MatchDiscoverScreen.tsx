'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { MatchAchievementBadge } from '@/components/meta/match/achievements/MatchAchievementBadge';
import { MatchConnectActions } from '@/components/meta/match/discovery/MatchConnectActions';
import { MatchConnectedMoment } from '@/components/meta/match/discovery/MatchConnectedMoment';
import { MatchProfileIcon } from '@/components/meta/match/icons/MatchProfileIcon';
import { isMatchProfileIconId } from '@/components/meta/match/icons/matchProfileIcons';
import { MatchProfileStage } from '@/components/meta/match/profile/MatchProfileStage';
import { useMatchAuth } from '@/components/meta/match/useMatchAuth';
import { commonalityDetail, type MatchCommonality } from '@/lib/match/matchCommonalities';
import type { MatchRelation } from '@/lib/match/matchPair';
import { forgetPassedUid, readPassedUids, rememberPassedUid } from '@/lib/match/matchPassedPeople';
import { connectWithPerson, fetchDiscovery, fetchMatchPerson, saveMatchPass, type MatchPerson } from '@/services/matchSocialClient';

const ADVANCE_MS = 450;

function isPassed(person: MatchPerson, passed: Set<string>) {
  return passed.has(person.uid);
}

function isWaiting(person: MatchPerson) {
  return person.relation === 'outgoing_pending' || person.relation === 'incoming_pending';
}

function isFresh(person: MatchPerson, passed: Set<string>) {
  return person.relation === 'none' && !isPassed(person, passed);
}

function rotateTo(group: MatchPerson[], focusUid?: string | null): MatchPerson[] | null {
  if (!focusUid) return null;
  const at = group.findIndex((item) => item.uid === focusUid);
  if (at < 0) return null;
  return [...group.slice(at), ...group.slice(0, at)];
}

function orderDiscoveryDeck(list: MatchPerson[], focusUid: string | null | undefined, passed: Set<string>): MatchPerson[] {
  const fresh = list.filter((item) => isFresh(item, passed));
  const pending = list.filter((item) => isWaiting(item) && !isPassed(item, passed));
  const declined = list.filter((item) => isPassed(item, passed));
  const rest = list.filter((item) => !fresh.includes(item) && !pending.includes(item) && !declined.includes(item));
  const focusedFresh = rotateTo(fresh, focusUid);
  if (focusedFresh) return [...focusedFresh, ...pending, ...declined, ...rest];
  const focusedPending = rotateTo(pending, focusUid);
  if (focusedPending) {
    const [first, ...tail] = focusedPending;
    if (first) return [first, ...fresh, ...tail, ...declined, ...rest];
  }
  const focusedDeclined = rotateTo(declined, focusUid);
  if (focusedDeclined) {
    const [first, ...tail] = focusedDeclined;
    if (first) return [first, ...fresh, ...pending, ...tail, ...rest];
  }
  return [...fresh, ...pending, ...declined, ...rest];
}

function nextAfterRequest(list: MatchPerson[], uid: string, passed: Set<string>): { people: MatchPerson[]; index: number } {
  const at = list.findIndex((item) => item.uid === uid);
  if (at < 0) return { people: list, index: 0 };
  const item = { ...list[at], relation: 'outgoing_pending' as MatchRelation };
  const without = [...list.slice(0, at), ...list.slice(at + 1)];
  const people = [...without, item];
  let index = at < people.length ? at : 0;
  if (people[index] && !isFresh(people[index], passed)) {
    for (let cursor = index; cursor < people.length; cursor += 1) {
      if (isFresh(people[cursor], passed)) return { people, index: cursor };
    }
    for (let cursor = 0; cursor < index; cursor += 1) {
      if (isFresh(people[cursor], passed)) return { people, index: cursor };
    }
  }
  return { people, index };
}

function CommonList({ items }: { items: MatchCommonality[] }) {
  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={`${item.type}-${item.id}`} className="flex items-start gap-3">
          {item.type === 'achievement' || item.type === 'goal' ? (
            <MatchAchievementBadge achievementId={item.id} size={36} />
          ) : isMatchProfileIconId(item.id) ? (
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/90">
              <MatchProfileIcon icon={item.id} size={26} />
            </span>
          ) : (
            <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#4CCB7A]" />
          )}
          <span>
            <span className="block text-sm font-semibold text-white">{item.label}</span>
            <span className="block text-sm leading-snug text-white/75">{commonalityDetail(item)}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

export function MatchDiscoverScreen() {
  const router = useRouter();
  const user = useMatchAuth();
  const reducedMotion = useReducedMotion();
  const [people, setPeople] = useState<MatchPerson[]>([]);
  const [index, setIndex] = useState(0);
  const [cursor, setCursor] = useState<string | null>(null);
  const loadingMore = useRef(false);
  const peopleRef = useRef<MatchPerson[]>([]);
  peopleRef.current = people;
  const advanceTimer = useRef<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [sending, setSending] = useState(false);
  const [celebrating, setCelebrating] = useState(false);
  const [connectedKey, setConnectedKey] = useState('');
  const [showCommon, setShowCommon] = useState(false);

  useEffect(() => {
    if (user === null) router.replace('/');
  }, [router, user]);

  useEffect(() => () => {
    if (advanceTimer.current) window.clearTimeout(advanceTimer.current);
  }, []);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setLoading(true);
    const focus = new URLSearchParams(window.location.search).get('uid');
    fetchDiscovery()
      .then(async (result) => {
        if (cancelled) return;
        let next = result.people;
        if (focus && !next.some((item) => item.uid === focus)) {
          const focused = await fetchMatchPerson(focus).catch(() => null);
          if (focused?.person && focused.person.relation !== 'blocked') {
            next = [focused.person, ...next.filter((item) => item.uid !== focus)];
          }
        }
        const saved = new Set([...(result.passedUids || []), ...(user ? readPassedUids(user.uid) : [])]);
        next = orderDiscoveryDeck(next, focus, saved);
        if (cancelled) return;
        setPeople(next);
        setCursor(result.nextCursor);
        setIndex(0);
      })
      .catch(() => {
        if (!cancelled) setError('Não foi possível buscar conexões agora.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const person = people[index];

  const loadMore = useCallback(async () => {
    if (!cursor || loadingMore.current) return;
    loadingMore.current = true;
    try {
      const result = await fetchDiscovery(cursor);
      setPeople((current) => [...current, ...result.people]);
      setCursor(result.nextCursor);
    } finally {
      loadingMore.current = false;
    }
  }, [cursor]);

  useEffect(() => {
    if (!cursor || people.length === 0 || index < people.length - 3) return;
    void loadMore();
  }, [cursor, index, loadMore, people.length]);

  function mark(uid: string, relation: MatchRelation) {
    setPeople((current) => current.map((item) => (item.uid === uid ? { ...item, relation } : item)));
  }

  function goNext() {
    setShowCommon(false);
    setNotice('');
    setCelebrating(false);
    setIndex((value) => value + 1);
  }

  function pass() {
    if (sending || people.length < 2) return;
    const item = people[index];
    if (user && item) {
      rememberPassedUid(user.uid, item.uid);
      void saveMatchPass(item.uid, 'pass').catch(() => undefined);
    }
    setShowCommon(false);
    setNotice('');
    setError('');
    setCelebrating(false);
    if (index >= people.length - 1) {
      setIndex(0);
      return;
    }
    setPeople((current) => {
      const picked = current[index];
      if (!picked) return current;
      return [...current.slice(0, index), ...current.slice(index + 1), picked];
    });
  }

  function leaveQueue(uid: string) {
    const next = peopleRef.current.filter((item) => item.uid !== uid);
    setPeople(next);
    setIndex((value) => {
      if (!next.length) return 0;
      return value >= next.length ? 0 : value;
    });
    setShowCommon(false);
    setNotice('');
  }

  function continueAfterConnection() {
    setCelebrating(false);
    if (person) leaveQueue(person.uid);
  }

  async function connect() {
    if (!person || sending || person.relation === 'outgoing_pending' || person.relation === 'connected' || person.relation === 'blocked') {
      return;
    }
    setSending(true);
    setError('');
    let advance = false;
    try {
      const result = await connectWithPerson(person.uid);
      if (result.result === 'interest_sent' || result.result === 'already_sent') {
        const uid = person.uid;
        mark(uid, 'outgoing_pending');
        setNotice('Conexão solicitada');
        advance = true;
        if (advanceTimer.current) window.clearTimeout(advanceTimer.current);
        advanceTimer.current = window.setTimeout(() => {
          advanceTimer.current = null;
          if (user) {
            forgetPassedUid(user.uid, uid);
            void saveMatchPass(uid, 'clear').catch(() => undefined);
          }
          const moved = nextAfterRequest(peopleRef.current, uid, new Set(user ? readPassedUids(user.uid) : []));
          setPeople(moved.people);
          setIndex(moved.index);
          setShowCommon(false);
          setNotice('');
          setSending(false);
        }, reducedMotion ? 0 : ADVANCE_MS);
      } else if (result.result === 'connected') {
        mark(person.uid, 'connected');
        setConnectedKey(result.requestId);
        setCelebrating(true);
      } else if (result.result === 'already_connected') {
        leaveQueue(person.uid);
      }
    } catch (err) {
      const code = (err as { code?: string }).code;
      if (code === 'blocked') {
        mark(person.uid, 'blocked');
        setError('Não é possível conectar.');
      } else {
        setError('Não foi possível conectar agora.');
      }
    } finally {
      if (!advance) setSending(false);
    }
  }

  if (user === undefined || loading) {
    return (
      <div className="flex h-full items-center justify-center bg-[#0A1F44] text-sm text-white/70">Buscando conexões…</div>
    );
  }

  if (!person) {
    return (
      <div className="mx-auto flex h-full w-full max-w-[480px] flex-col justify-center bg-[#0A1F44] px-6 text-center text-white">
        <h1 className="text-2xl font-extrabold">Novas conexões estão a caminho.</h1>
        <p className="mt-3 text-sm leading-relaxed text-white/75">
          À medida que mais pessoas entram no Match Saudável, novas conexões podem aparecer por aqui.
        </p>
        <button type="button" onClick={() => router.push('/meta/match')} className="mt-8 text-sm font-semibold text-[#4CCB7A]">
          Voltar
        </button>
      </div>
    );
  }

  const total = person.commonalities.total;
  const overlay = showCommon
    ? { key: 'common', title: 'Vocês têm em comum', body: <CommonList items={person.commonalities.items} /> }
    : null;

  return (
    <div className="relative h-full overflow-hidden">
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={person.uid}
          className="h-full"
          initial={reducedMotion ? { opacity: 1 } : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reducedMotion ? { opacity: 1 } : { opacity: 0, y: -12 }}
          transition={{ duration: reducedMotion ? 0 : 0.28, ease: 'easeOut' }}
        >
          <MatchProfileStage
            mode="discovery"
            card={person.card}
            onBack={() => router.push('/meta/match')}
            onPrevious={
              index > 0
                ? () => {
                    setShowCommon(false);
                    setNotice('');
                    setIndex((value) => value - 1);
                  }
                : undefined
            }
            onNext={people.length > 1 ? pass : undefined}
            lead={
              total > 0 ? (
                <button
                  type="button"
                  onClick={() => setShowCommon(true)}
                  className="mt-3 inline-flex items-center rounded-full bg-white/10 px-3 py-1.5 text-sm font-semibold text-[#D9FFE8]"
                >
                  ✦ {total} {total === 1 ? 'coisa em comum' : 'coisas em comum'}
                </button>
              ) : person.sameCity ? (
                <p className="mt-3 text-sm font-semibold text-[#D9FFE8]">Mesma cidade</p>
              ) : null
            }
            overlay={overlay}
            onDismissOverlay={() => setShowCommon(false)}
            action={
              <MatchConnectActions
                name={person.card.displayName || 'esta pessoa'}
                busy={sending}
                relation={person.relation}
                mode="discovery"
                canPass={people.length > 1}
                notice={notice}
                error={error}
                onPass={pass}
                onConnect={() => void connect()}
              />
            }
          />
        </motion.div>
      </AnimatePresence>
      {celebrating ? (
        <MatchConnectedMoment
          name={person.card.displayName || 'esta pessoa'}
          otherPhotoUrl={person.card.primaryPhoto?.url}
          pairKey={connectedKey}
          continueLabel="Continuar descobrindo"
          onContinue={continueAfterConnection}
        />
      ) : null}
    </div>
  );
}
