'use client';

import { MessageCircle } from 'lucide-react';
import Link from 'next/link';
import { MatchAchievementBadge } from '@/components/meta/match/achievements/MatchAchievementBadge';
import { MatchProfileIcon } from '@/components/meta/match/icons/MatchProfileIcon';
import { connectionWhenLabel } from '@/lib/match/connectionWhen';
import type { MatchPerson } from '@/services/matchSocialClient';

export function MatchConnectionRow({ person, pairKey }: { person: MatchPerson; pairKey: string }) {
  const name = person.card.displayName || 'Conexão';
  const medal = person.card.photoMedals[0];
  const icons = person.card.socialIcons.slice(0, 3);

  return (
    <li className="flex items-center gap-3 border-b border-white/10 py-3">
      <Link href={`/meta/match/people/${person.uid}`} className="flex min-w-0 flex-1 items-center gap-3">
        {person.card.primaryPhoto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={person.card.primaryPhoto.url} alt="" className="h-[60px] w-[60px] shrink-0 rounded-full object-cover" />
        ) : (
          <span className="flex h-[60px] w-[60px] shrink-0 items-center justify-center rounded-full bg-white/10 text-xl font-extrabold">
            {name.slice(0, 1).toUpperCase()}
          </span>
        )}
        <span className="min-w-0">
          <span className="block truncate text-[15px] font-semibold text-white">
            {name}
            {person.card.age != null ? <span className="font-medium text-white/75">, {person.card.age}</span> : null}
          </span>
          {person.card.cityLine ? <span className="mt-0.5 block truncate text-[13px] text-[#4CCB7A]">{person.card.cityLine}</span> : null}
          {icons.length || medal ? (
            <span className="mt-1.5 flex items-center gap-1.5">
              {icons.map((id) => (
                <span key={id} className="flex h-7 w-7 items-center justify-center rounded-full bg-white/90">
                  <MatchProfileIcon icon={id} size={18} decorative={false} />
                </span>
              ))}
              {medal ? <MatchAchievementBadge achievementId={medal.achievementId} size={28} verified={medal.verified} decorative /> : null}
            </span>
          ) : null}
          <span className="mt-1 block text-[12px] text-white/60">{connectionWhenLabel(person.connectedAtMs)}</span>
        </span>
      </Link>
      <Link
        href={`/meta/match/messages/${pairKey}`}
        aria-label={`Mensagem para ${name}`}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[#4CCB7A]"
      >
        <MessageCircle className="h-5 w-5" aria-hidden="true" />
      </Link>
    </li>
  );
}
