'use client';

import React from 'react';
import { ChevronRight } from 'lucide-react';
import {
  ACCENT_STYLES,
  type InstagramFounderItem,
  type InstagramProfileItem,
} from '@/components/instagram/instagramHubData';
import { resolveInstagramHubIcon } from '@/components/instagram/resolveInstagramHubIcon';

type ProfileProps = {
  variant: 'profile';
  item: InstagramProfileItem;
  onOpen: () => void;
};

type FounderProps = {
  variant: 'founder';
  item: InstagramFounderItem;
  onOpen: () => void;
};

type Props = ProfileProps | FounderProps;

export default function InstagramLinkButton(props: Props) {
  if (props.variant === 'founder') {
    const { item, onOpen } = props;

    return (
      <div className="relative mt-1">
        <div
          className="pointer-events-none absolute -inset-px rounded-xl bg-gradient-to-r from-emerald-400/50 via-cyan-400/40 to-emerald-400/50 opacity-70 blur-[0.5px] animate-pulse"
          aria-hidden
        />
        <button
          type="button"
          onClick={onOpen}
          aria-haspopup="dialog"
          aria-label={`${item.title}. Toque para conversar.`}
          className="group relative w-full overflow-hidden rounded-xl border border-emerald-400/35 bg-gradient-to-br from-emerald-500/[0.12] via-white/[0.06] to-cyan-500/[0.08] px-3.5 py-3.5 backdrop-blur-md shadow-[0_0_28px_rgba(74,222,128,0.18)] transition active:scale-[0.98] hover:border-emerald-300/50 hover:shadow-[0_0_36px_rgba(74,222,128,0.28)] focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#060d1f]"
        >
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-emerald-400/[0.06] via-transparent to-cyan-400/[0.06]" />
          <div className="relative flex items-start gap-3">
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/20 text-lg leading-none"
              aria-hidden
            >
              💬
            </span>
            <span className="min-w-0 flex-1 text-left">
              <span className="block text-[15px] font-semibold tracking-tight text-white">{item.title}</span>
              <span className="mt-1 block text-[11px] leading-snug text-slate-300/85 line-clamp-2">
                {item.description}
              </span>
            </span>
            <ChevronRight
              className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400/80 transition group-hover:translate-x-0.5 group-hover:text-emerald-300"
              aria-hidden
            />
          </div>
        </button>
      </div>
    );
  }

  const { item, onOpen } = props;
  const styles = ACCENT_STYLES[item.accent];
  const Icon = resolveInstagramHubIcon(item.iconKey);

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-haspopup="dialog"
      aria-label={`${item.title}. Toque para ver opções.`}
      className={`group relative w-full overflow-hidden rounded-xl border border-white/10 bg-white/[0.05] px-3.5 py-3 backdrop-blur-md transition active:scale-[0.98] hover:border-white/20 hover:bg-white/[0.08] focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#060d1f] ${styles.glow}`}
    >
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-white/[0.04] to-transparent opacity-0 transition group-hover:opacity-100" />
      <div className="relative flex items-center gap-3">
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${styles.iconBg} ${styles.iconText}`}
        >
          <Icon className="h-4 w-4" aria-hidden />
        </span>
        <span className="min-w-0 flex-1 text-left text-[15px] font-semibold tracking-tight text-white">
          {item.title}
        </span>
        <ChevronRight
          className={`h-4 w-4 shrink-0 opacity-50 transition group-hover:translate-x-0.5 group-hover:opacity-100 ${styles.iconText}`}
          aria-hidden
        />
      </div>
    </button>
  );
}
