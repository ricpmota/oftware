'use client';

import { ChevronDown, ChevronRight, ChevronUp } from 'lucide-react';
import Link from 'next/link';
import { useState, type ReactNode } from 'react';
import { matchGivenName } from '@/lib/match/connectionWhen';
import type { MatchPerson } from '@/services/matchSocialClient';

function Avatar({ person, ring }: { person: MatchPerson; ring: boolean }) {
  const name = matchGivenName(person.card.displayName);
  const frame = `box-border h-16 w-16 shrink-0 overflow-hidden rounded-full ${ring ? 'border-2 border-[#4CCB7A]' : ''}`;
  if (person.card.primaryPhoto) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={person.card.primaryPhoto.url} alt="" className={`${frame} object-cover`} />
    );
  }
  return (
    <span className={`flex items-center justify-center bg-white/15 text-lg font-extrabold text-white ${frame}`}>
      {name.slice(0, 1).toUpperCase()}
    </span>
  );
}

export function MatchRecentConnections({
  people,
  title = 'Suas conexões',
  seeAllHref = '/meta/match/connections',
  seeAllLabel = 'Ver todas',
  count,
  hrefFor = (person) => `/meta/match/people/${person.uid}`,
  labelFor = (name) => `Perfil de ${name}`,
  ring = true,
  empty,
  collapsible = false,
}: {
  people: MatchPerson[];
  title?: string;
  seeAllHref?: string;
  seeAllLabel?: string;
  count?: number;
  hrefFor?: (person: MatchPerson) => string;
  labelFor?: (name: string) => string;
  ring?: boolean;
  empty?: ReactNode;
  collapsible?: boolean;
}) {
  const [open, setOpen] = useState(true);
  if (!people.length && !empty) return null;
  const expanded = !collapsible || open;

  return (
    <section className="mt-4">
      <div className={`flex items-center justify-between gap-3 ${expanded ? 'mb-3' : 'mb-0'}`}>
        <h2 className="flex items-center gap-1 text-[15px] font-semibold text-white">
          {title}
          {count && count > 0 ? (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#4CCB7A] px-1.5 text-[11px] font-bold text-[#0A1F44]">
              {count}
            </span>
          ) : null}
          {collapsible ? (
            <button
              type="button"
              onClick={() => setOpen((current) => !current)}
              aria-expanded={expanded}
              aria-label={expanded ? `Esconder ${title}` : `Mostrar ${title}`}
              className="flex h-8 w-8 items-center justify-center rounded-full text-white"
            >
              {expanded ? <ChevronDown className="h-5 w-5" aria-hidden="true" /> : <ChevronUp className="h-5 w-5" aria-hidden="true" />}
            </button>
          ) : null}
        </h2>
        {expanded && people.length ? (
          <Link href={seeAllHref} className="inline-flex h-11 items-center gap-0.5 text-[13px] font-semibold text-[#4CCB7A]">
            {seeAllLabel}
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        ) : null}
      </div>
      {expanded && people.length ? (
        <ul className="flex max-w-full touch-pan-x gap-4 overflow-x-auto overscroll-x-contain pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {people.map((person) => {
            const name = matchGivenName(person.card.displayName);
            return (
              <li key={person.uid} className="w-[4.5rem] shrink-0">
                <Link href={hrefFor(person)} aria-label={labelFor(name)} className="flex flex-col items-center gap-1.5">
                  <Avatar person={person} ring={ring} />
                  <span className="w-full truncate text-center text-[12px] font-semibold text-white">{name}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : expanded ? (
        empty
      ) : null}
    </section>
  );
}
