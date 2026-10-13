'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { MatchConnectActions } from '@/components/meta/match/discovery/MatchConnectActions';
import { MatchConnectedMoment } from '@/components/meta/match/discovery/MatchConnectedMoment';
import { MatchProfileStage } from '@/components/meta/match/profile/MatchProfileStage';
import { useMatchAuth } from '@/components/meta/match/useMatchAuth';
import { connectWithPerson, fetchIncomingRequests, respondMatchRequest, type MatchPerson } from '@/services/matchSocialClient';

export function MatchRequestsScreen() {
  const router = useRouter();
  const user = useMatchAuth();
  const reducedMotion = useReducedMotion();
  const [people, setPeople] = useState<MatchPerson[]>([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [celebrating, setCelebrating] = useState(false);
  const [connectedKey, setConnectedKey] = useState('');

  useEffect(() => {
    if (user === null) router.replace('/');
  }, [router, user]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const focus = new URLSearchParams(window.location.search).get('uid');
    fetchIncomingRequests()
      .then((result) => {
        if (cancelled) return;
        setPeople(result.people);
        if (!focus) return;
        const at = result.people.findIndex((item) => item.uid === focus);
        if (at > 0) setIndex(at);
      })
      .catch(() => {
        if (!cancelled) setError('Não foi possível abrir agora.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const person = people[index];

  function drop(uid: string) {
    const at = people.findIndex((item) => item.uid === uid);
    const nextLength = people.length - 1;
    setPeople((current) => current.filter((item) => item.uid !== uid));
    if (at >= nextLength) setIndex(Math.max(0, nextLength - 1));
  }

  async function connect() {
    if (!person || sending) return;
    setSending(true);
    setError('');
    try {
      const result = await connectWithPerson(person.uid);
      if (result.result === 'connected' || result.result === 'already_connected') {
        setConnectedKey(result.requestId || person.requestId || '');
        setCelebrating(true);
        return;
      }
      setError('Não foi possível conectar agora.');
    } catch {
      setError('Não foi possível conectar agora.');
    } finally {
      setSending(false);
    }
  }

  async function ignore() {
    if (!person?.requestId || sending) return;
    setSending(true);
    setError('');
    try {
      await respondMatchRequest({ requestId: person.requestId, action: 'ignore' });
      drop(person.uid);
    } catch {
      setError('Não foi possível continuar.');
    } finally {
      setSending(false);
    }
  }

  if (user === undefined || loading) {
    return <div className="flex h-full items-center justify-center bg-[#0A1F44] text-sm text-white/70">Carregando…</div>;
  }

  if (!person) {
    return (
      <div className="mx-auto flex h-full w-full max-w-[480px] flex-col justify-center bg-[#0A1F44] px-6 text-center text-white">
        <h1 className="text-2xl font-extrabold">Querem se conectar</h1>
        <p className="mt-3 text-sm leading-relaxed text-white/75">Quando alguém quiser se conectar, a pessoa aparece aqui.</p>
        <button type="button" onClick={() => router.push('/meta/match')} className="mt-8 text-sm font-semibold text-[#4CCB7A]">
          Voltar
        </button>
      </div>
    );
  }

  const name = person.card.displayName || 'esta pessoa';

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
            mode="incoming-request"
            card={person.card}
            onBack={() => router.push('/meta/match')}
            lead={<p className="mt-2 text-sm font-semibold text-[#4CCB7A]">Quer se conectar com você</p>}
            action={
              <MatchConnectActions
                name={name}
                busy={sending}
                relation="incoming_pending"
                mode="incoming"
                canPass
                error={error}
                onPass={() => void ignore()}
                onConnect={() => void connect()}
              />
            }
          />
        </motion.div>
      </AnimatePresence>
      {celebrating ? (
        <MatchConnectedMoment
          name={name}
          otherPhotoUrl={person.card.primaryPhoto?.url}
          pairKey={connectedKey || person.requestId}
          continueLabel="Continuar descobrindo"
          onContinue={() => {
            setCelebrating(false);
            drop(person.uid);
          }}
        />
      ) : null}
    </div>
  );
}
