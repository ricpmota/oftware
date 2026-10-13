'use client';

import { Compass, House, MessageCircle, User, Users } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { fetchMatchConversations } from '@/services/matchSocialClient';

const ITEMS = [
  { href: '/meta/match', label: 'Home', icon: House },
  { href: '/meta/match/discover', label: 'Descobrir', icon: Compass },
  { href: '/meta/match/connections', label: 'Conexões', icon: Users },
  { href: '/meta/match/messages', label: 'Mensagens', icon: MessageCircle },
  { href: '/meta/match/profile', label: 'Perfil', icon: User },
] as const;

function isActive(pathname: string, href: string) {
  if (href === '/meta/match') return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function MatchSocialNav({ unread }: { unread?: number }) {
  const pathname = usePathname();
  const [count, setCount] = useState(unread ?? 0);

  useEffect(() => {
    if (unread != null) {
      setCount(unread);
      return;
    }
    let cancelled = false;
    fetchMatchConversations()
      .then((result) => {
        if (!cancelled) setCount(result.unreadTotal);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [unread]);

  return (
    <nav
      aria-label="Match Saudável"
      className="shrink-0 border-t border-white/10 bg-[#0A1F44] pb-[env(safe-area-inset-bottom)] md:border-t-0 md:bg-transparent md:px-4 md:pb-4"
    >
      <div className="mx-auto flex h-16 w-full max-w-[480px] items-stretch justify-around md:h-[4.25rem] md:rounded-full md:border md:border-white/10 md:bg-[#0A1F44] md:px-1 md:shadow-[0_12px_40px_-24px_rgba(0,0,0,0.7)]">
        {ITEMS.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          const badge = href === '/meta/match/messages' && count > 0;
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              aria-label={badge ? `${label}, ${count} não lidas` : label}
              className={`mx-0.5 flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl text-[10px] font-semibold ${
                active ? 'bg-[#4CCB7A]/20 text-[#4CCB7A]' : 'text-white/55'
              }`}
            >
              <span className="relative">
                <Icon className="h-5 w-5" strokeWidth={active ? 2.5 : 2} aria-hidden="true" />
                {badge ? (
                  <span className="absolute -right-2.5 -top-2 flex h-[1.125rem] min-w-[1.125rem] items-center justify-center rounded-full bg-[#4CCB7A] px-1 text-[10px] font-bold leading-none text-[#0A1F44]">
                    {count > 99 ? '99+' : count}
                  </span>
                ) : null}
              </span>
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
