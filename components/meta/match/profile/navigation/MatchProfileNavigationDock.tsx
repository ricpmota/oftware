'use client';

import { useEffect, useRef } from 'react';
import { useReducedMotion } from 'framer-motion';
import { MatchProfileNavigationIcon } from '@/components/meta/match/profile/navigation/MatchProfileNavigationIcon';
import {
  MATCH_PROFILE_NAVIGATION_ICONS,
  type MatchProfileNavigationIconId,
} from '@/components/meta/match/profile/navigation/matchProfileNavigationIcons';

type MatchProfileNavigationDockProps = {
  items: readonly MatchProfileNavigationIconId[];
  activeId: MatchProfileNavigationIconId | null;
  onSelect: (id: MatchProfileNavigationIconId) => void;
};

export function MatchProfileNavigationDock({ items, activeId, onSelect }: MatchProfileNavigationDockProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<number | null>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!activeId || !scroller) return;
    const target = scroller.querySelector<HTMLElement>(`[data-nav-id="${activeId}"]`);
    if (!target) return;
    const scrollerRect = scroller.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    const delta = targetRect.left - scrollerRect.left - (scrollerRect.width - targetRect.width) / 2;
    const max = Math.max(0, scroller.scrollWidth - scroller.clientWidth);
    const next = Math.min(max, Math.max(0, scroller.scrollLeft + delta));
    if (frameRef.current != null) cancelAnimationFrame(frameRef.current);
    if (reducedMotion || Math.abs(next - scroller.scrollLeft) < 1) {
      scroller.scrollLeft = next;
      return;
    }
    const start = scroller.scrollLeft;
    const change = next - start;
    const duration = 280;
    const t0 = performance.now();
    const step = (now: number) => {
      const progress = Math.min(1, (now - t0) / duration);
      const eased = 1 - (1 - progress) ** 3;
      scroller.scrollLeft = start + change * eased;
      if (progress < 1) frameRef.current = requestAnimationFrame(step);
    };
    frameRef.current = requestAnimationFrame(step);
    return () => {
      if (frameRef.current != null) cancelAnimationFrame(frameRef.current);
    };
  }, [activeId, reducedMotion]);

  return (
    <nav
      aria-label="Explorar perfil"
      className="shrink-0 border-t border-[#0A1F44]/10 bg-white/92 px-1.5 pt-1 shadow-[0_-8px_18px_-14px_rgba(10,31,68,0.45)] backdrop-blur-md pb-[max(0.35rem,env(safe-area-inset-bottom))]"
    >
      <div ref={scrollerRef} className="flex w-full items-stretch justify-evenly">
        {items.map((id) => {
          const active = activeId === id;
          const label = MATCH_PROFILE_NAVIGATION_ICONS[id].label;
          return (
            <button
              key={id}
              type="button"
              data-nav-id={id}
              aria-pressed={active}
              aria-controls="match-profile-section-panel"
              aria-label={active ? `Recolher ${label}` : `Abrir ${label}`}
              onClick={() => onSelect(id)}
              className={`flex min-w-0 flex-1 basis-0 flex-col items-center px-0.5 py-1 ${
                active ? 'opacity-100' : 'opacity-80'
              }`}
            >
              <span className="flex h-11 w-11 items-center justify-center">
                <span
                  className={`flex items-center justify-center ${
                    active ? 'motion-safe:-translate-y-0.5 motion-safe:scale-[1.08]' : ''
                  }`}
                >
                  <MatchProfileNavigationIcon icon={id} size={34} />
                </span>
              </span>
              <span
                className={`h-1 w-1 rounded-full ${active ? 'bg-[#4CCB7A]' : 'bg-transparent'}`}
                aria-hidden="true"
              />
              <span
                className={`mt-0.5 max-w-full truncate text-center text-[10px] leading-none tracking-tight text-[#0A1F44] ${
                  active ? 'font-extrabold' : 'font-medium'
                }`}
              >
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
