'use client';

import Link from 'next/link';
import { useLayoutEffect, useRef, useState } from 'react';
import { matchGivenName } from '@/lib/match/connectionWhen';
import type { MatchPerson } from '@/services/matchSocialClient';

const PAGE = 8;
const MAX_NODES = 96;

function cityLabel(line?: string): string {
  if (!line) return '';
  return line.split('·')[0]?.trim() || line;
}

function queueRank(person: MatchPerson, passed: Set<string>): number {
  if (passed.has(person.uid)) return 2;
  if (person.relation === 'outgoing_pending' || person.relation === 'incoming_pending') return 1;
  return 0;
}

export function MatchNearbyPeople({ people, passedIds = [] }: { people: MatchPerson[]; passedIds?: string[] }) {
  const listRef = useRef<HTMLUListElement>(null);
  const adjustRef = useRef(0);
  const pendingRef = useRef(false);
  const [start, setStart] = useState(0);
  const [count, setCount] = useState(PAGE);
  const passed = new Set(passedIds);
  const ordered = [...people]
    .filter((person) => person.relation !== 'connected' && person.relation !== 'blocked')
    .sort((a, b) => queueRank(a, passed) - queueRank(b, passed));

  useLayoutEffect(() => {
    const el = listRef.current;
    pendingRef.current = false;
    if (!el || !ordered.length) return;
    if (adjustRef.current > 0) {
      el.scrollLeft -= adjustRef.current;
      adjustRef.current = 0;
    }
    if (el.scrollWidth <= el.clientWidth + 24 && count < 200) {
      pendingRef.current = true;
      setCount((current) => current + PAGE);
    }
  }, [count, ordered.length, start]);

  if (!people.length) {
    return (
      <section className="relative -mx-4 mt-4 overflow-hidden bg-white/25 px-4 py-3 backdrop-blur-md">
        <p className="text-[13px] leading-snug text-white/90">Ninguém por perto agora.</p>
      </section>
    );
  }

  const visible = Array.from({ length: count }, (_, offset) => {
    const index = start + offset;
    return { index, person: ordered[index % ordered.length] };
  });

  function onScroll() {
    const el = listRef.current;
    if (!el || pendingRef.current) return;
    if (el.scrollWidth - el.scrollLeft - el.clientWidth > 160) return;
    pendingRef.current = true;
    if (count >= MAX_NODES) {
      const remove = PAGE;
      const first = el.children[0] as HTMLElement | undefined;
      const stride = first ? first.getBoundingClientRect().width + 16 : 88;
      adjustRef.current = stride * remove;
      setStart((current) => current + remove);
      return;
    }
    setCount((current) => current + PAGE);
  }

  return (
    <section className="relative -mx-4 mt-4 overflow-hidden bg-white/25 py-3 backdrop-blur-md">
      <ul
        ref={listRef}
        onScroll={onScroll}
        className="flex max-w-full touch-pan-x gap-4 overflow-x-auto overscroll-x-contain px-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {visible.map(({ index, person }) => {
          const name = matchGivenName(person.card.displayName);
          const city = cityLabel(person.card.cityLine);
          const waiting = person.relation === 'outgoing_pending' || person.relation === 'incoming_pending';
          const rejected = passed.has(person.uid);
          const frame = rejected
            ? 'box-border border-2 border-[#E11D48]'
            : waiting
              ? 'box-border border-2 border-[#F59E0B]'
              : '';
          return (
            <li key={`${person.uid}-${index}`} className="w-[4.5rem] shrink-0">
              <Link
                href={`/meta/match/discover?uid=${encodeURIComponent(person.uid)}`}
                aria-label={
                  rejected
                    ? `Descobrir ${name}, conexão recusada`
                    : waiting
                      ? `Descobrir ${name}, aguardando conexão`
                      : city
                        ? `Descobrir ${name}, ${city}`
                        : `Descobrir ${name}`
                }
                className="flex flex-col items-center gap-1"
              >
                {person.card.primaryPhoto ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={person.card.primaryPhoto.url} alt="" className={`h-16 w-16 rounded-full object-cover ${frame}`} />
                ) : (
                  <span className={`flex h-16 w-16 items-center justify-center rounded-full bg-white/15 text-lg font-extrabold text-white ${frame}`}>
                    {name.slice(0, 1).toUpperCase()}
                  </span>
                )}
                  <span className="w-full truncate text-center text-[12px] font-semibold text-white">{name}</span>
                  {city ? <span className="w-full truncate text-center text-[11px] text-white/85">{city}</span> : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
