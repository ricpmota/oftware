'use client';

import { Check } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { MatchConnectActions } from '@/components/meta/match/discovery/MatchConnectActions';
import { MatchConnectedMoment } from '@/components/meta/match/discovery/MatchConnectedMoment';
import { MatchAchievementBadge } from '@/components/meta/match/achievements/MatchAchievementBadge';
import { MatchProfileIcon } from '@/components/meta/match/icons/MatchProfileIcon';
import { isMatchProfileIconId } from '@/components/meta/match/icons/matchProfileIcons';
import { MatchProfileStage } from '@/components/meta/match/profile/MatchProfileStage';
import { useMatchAuth } from '@/components/meta/match/useMatchAuth';
import { commonalityDetail, type MatchCommonality } from '@/lib/match/matchCommonalities';
import { matchPairKey } from '@/lib/match/matchPair';
import { connectWithPerson, fetchMatchPerson, type MatchPerson } from '@/services/matchSocialClient';

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

export function MatchPersonScreen({ uid }: { uid: string }) {
  const router = useRouter();
  const user = useMatchAuth();
  const [person, setPerson] = useState<MatchPerson | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [celebrating, setCelebrating] = useState(false);
  const [connectedKey, setConnectedKey] = useState('');
  const [showCommon, setShowCommon] = useState(false);

  useEffect(() => {
    if (user === null) router.replace('/');
  }, [router, user]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    fetchMatchPerson(uid)
      .then((result) => {
        if (!cancelled) setPerson(result.person);
      })
      .catch(() => {
        if (!cancelled) setError('Perfil indisponível.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [uid, user]);

  if (loading || user === undefined) {
    return <div className="flex h-full items-center justify-center bg-[#0A1F44] text-sm text-white/70">Carregando…</div>;
  }
  if (!person) {
    return (
      <div className="flex h-full flex-col items-center justify-center bg-[#0A1F44] px-6 text-center text-white">
        <p>{error || 'Perfil indisponível.'}</p>
        <button type="button" onClick={() => router.back()} className="mt-4 text-sm font-semibold text-[#4CCB7A]">
          Voltar
        </button>
      </div>
    );
  }

  const mode = person.relation === 'connected' ? 'connection' : person.relation === 'incoming_pending' ? 'incoming-request' : 'discovery';
  const name = person.card.displayName || 'esta pessoa';
  const showConnect = person.relation === 'none' || person.relation === 'incoming_pending' || person.relation === 'outgoing_pending' || person.relation === 'connected';

  return (
    <div className="relative h-full">
      <MatchProfileStage
        mode={mode}
        card={person.card}
        onBack={() => router.back()}
        lead={
          <>
            {person.relation === 'incoming_pending' ? (
              <p className="mt-2 text-sm font-semibold text-[#4CCB7A]">Quer se conectar com você</p>
            ) : null}
            {person.commonalities.total > 0 || person.relation === 'connected' ? (
              <div className="mt-3 flex items-center gap-2">
                {person.commonalities.total > 0 ? (
                  <button
                    type="button"
                    onClick={() => setShowCommon(true)}
                    className="inline-flex items-center rounded-full bg-white/10 px-3 py-1.5 text-sm font-semibold text-[#D9FFE8]"
                  >
                    ✦ {person.commonalities.total}{' '}
                    {person.commonalities.total === 1 ? 'coisa em comum' : 'coisas em comum'}
                  </button>
                ) : null}
                {person.relation === 'connected' && user ? (
                  <span className="ml-auto flex shrink-0 items-center gap-2">
                    <span
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-[#4CCB7A] text-[#0A1F44]"
                      aria-label="Conectados"
                    >
                      <Check className="h-4 w-4" strokeWidth={3} aria-hidden="true" />
                    </span>
                    <Link
                      href={`/meta/match/messages/${matchPairKey(user.uid, person.uid)}`}
                      className="inline-flex h-8 items-center rounded-full bg-[#4CCB7A] px-3 text-sm font-semibold text-[#0A1F44]"
                    >
                      Mensagem
                    </Link>
                  </span>
                ) : null}
              </div>
            ) : null}
          </>
        }
        overlay={
          showCommon
            ? { key: 'common', title: 'Vocês têm em comum', body: <CommonList items={person.commonalities.items} /> }
            : null
        }
        onDismissOverlay={() => setShowCommon(false)}
        action={
          showConnect && person.relation !== 'blocked' && person.relation !== 'connected' ? (
            <MatchConnectActions
              name={name}
              busy={sending}
              relation={person.relation}
              mode={person.relation === 'incoming_pending' ? 'incoming' : 'discovery'}
              canPass={false}
              showPass={false}
              error={error}
              onPass={() => router.back()}
              onConnect={() => {
                if (person.relation === 'outgoing_pending' || person.relation === 'connected') return;
                setSending(true);
                void connectWithPerson(person.uid)
                  .then((result) => {
                    if (result.result === 'connected' || result.result === 'already_connected') {
                      setConnectedKey(result.requestId);
                      setPerson({ ...person, relation: 'connected' });
                      setCelebrating(true);
                      return;
                    }
                    if (result.result === 'interest_sent' || result.result === 'already_sent') {
                      setPerson({ ...person, relation: 'outgoing_pending' });
                      return;
                    }
                  })
                  .catch(() => setError('Não foi possível conectar agora.'))
                  .finally(() => setSending(false));
              }}
            />
          ) : null
        }
      />
      {celebrating ? (
        <MatchConnectedMoment
          name={name}
          otherPhotoUrl={person.card.primaryPhoto?.url}
          pairKey={connectedKey}
          continueLabel="Continuar"
          onContinue={() => setCelebrating(false)}
        />
      ) : null}
    </div>
  );
}
