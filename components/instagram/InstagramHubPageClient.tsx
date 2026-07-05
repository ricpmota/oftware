'use client';

import React, { useCallback, useEffect, useState } from 'react';
import InstagramDepoimentosButton from '@/components/instagram/InstagramDepoimentosButton';
import InstagramDepoimentosSheet from '@/components/instagram/InstagramDepoimentosSheet';
import type { InstagramDepoimentoItem } from '@/components/instagram/instagramDepoimentosTypes';
import InstagramLinkButton from '@/components/instagram/InstagramLinkButton';
import InstagramProfileSheet from '@/components/instagram/InstagramProfileSheet';
import {
  findInstagramHubItem,
  getInstagramProfilesForHub,
  INSTAGRAM_FOUNDER,
  INSTAGRAM_HUB_COPY,
  type InstagramHubItem,
  type InstagramHubItemId,
} from '@/components/instagram/instagramHubData';
import type { InstagramHubPageConfig } from '@/lib/instagram/instagramWhiteLabelTypes';
import {
  setInstagramBioStatsMedicoId,
  trackInstagramBioPageView,
} from '@/lib/analytics/instagramBioStatsClient';
import { trackInstagramHubProfileEvent } from '@/lib/analytics/instagramHubAnalytics';

const DEFAULT_CONFIG: InstagramHubPageConfig = {
  copy: INSTAGRAM_HUB_COPY,
  profiles: getInstagramProfilesForHub(),
  founder: INSTAGRAM_FOUNDER,
  logoSrc: '/oftware2.png',
  logoAlt: 'Oftware',
  footerText: 'Oftware · Dr. Ricardo Mota',
};

type Props = {
  config?: InstagramHubPageConfig;
  enableAnalytics?: boolean;
  /** Quando definido, eventos são agregados em `instagramBioStats/{medicoId}`. */
  analyticsMedicoId?: string;
};

export default function InstagramHubPageClient({
  config = DEFAULT_CONFIG,
  enableAnalytics = true,
  analyticsMedicoId,
}: Props) {
  const [activeItem, setActiveItem] = useState<InstagramHubItem | null>(null);
  const [depoimentos, setDepoimentos] = useState<InstagramDepoimentoItem[]>([]);
  const [showDepoimentosSheet, setShowDepoimentosSheet] = useState(false);
  const { copy, profiles, founder, trailingProfiles = [], logoSrc, logoVariant = 'oftware', logoAlt, footerText } =
    config;

  const logoClassName =
    logoVariant === 'avatar'
      ? 'mx-auto mb-2 h-24 w-24 sm:h-28 sm:w-28 rounded-full border-2 border-white/20 object-cover shadow-[0_0_24px_rgba(74,222,128,0.12)]'
      : logoVariant === 'custom'
        ? 'mx-auto mb-2 h-12 w-auto max-w-[180px] sm:h-14 object-contain'
        : 'mx-auto mb-2 h-7 w-auto sm:h-8 object-contain';

  const logoWidth = logoVariant === 'avatar' ? 112 : logoVariant === 'custom' ? 180 : 120;
  const logoHeight = logoVariant === 'avatar' ? 112 : logoVariant === 'custom' ? 56 : 32;

  const openItem = useCallback(
    (id: InstagramHubItemId) => {
      if (enableAnalytics) trackInstagramHubProfileEvent(id, 'open_modal');
      setActiveItem(
        findInstagramHubItem(id, [...profiles, ...trailingProfiles], founder),
      );
    },
    [enableAnalytics, profiles, trailingProfiles, founder],
  );

  const closeItem = useCallback(() => {
    setActiveItem(null);
  }, []);

  useEffect(() => {
    if (!analyticsMedicoId) {
      setInstagramBioStatsMedicoId(null);
      return;
    }
    setInstagramBioStatsMedicoId(analyticsMedicoId);
    trackInstagramBioPageView();
    return () => setInstagramBioStatsMedicoId(null);
  }, [analyticsMedicoId]);

  useEffect(() => {
    if (!analyticsMedicoId) {
      setDepoimentos([]);
      return;
    }
    let cancelled = false;
    fetch(`/api/depoimentos-medico?medicoId=${encodeURIComponent(analyticsMedicoId)}`)
      .then((res) => (res.ok ? res.json() : { depoimentos: [] }))
      .then((data: { depoimentos?: InstagramDepoimentoItem[] }) => {
        if (!cancelled) setDepoimentos(data.depoimentos || []);
      })
      .catch(() => {
        if (!cancelled) setDepoimentos([]);
      });
    return () => {
      cancelled = true;
    };
  }, [analyticsMedicoId]);

  return (
    <div className="relative min-h-dvh overflow-x-hidden bg-[#060d1f] text-white">
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
        <div className="absolute -left-20 top-0 h-48 w-48 rounded-full bg-emerald-500/10 blur-[80px]" />
        <div className="absolute -right-12 top-1/3 h-52 w-52 rounded-full bg-blue-500/10 blur-[90px]" />
      </div>

      <main className="relative mx-auto flex min-h-dvh w-full max-w-[420px] flex-col justify-center px-4 py-6 sm:py-8">
        <header className="mb-5 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={logoSrc}
            alt={logoAlt}
            className={logoClassName}
            width={logoWidth}
            height={logoHeight}
          />
          <h1 className="mt-3 text-[1.05rem] font-bold leading-snug tracking-tight text-white sm:text-lg">
            {copy.headline}
          </h1>
          <p className="mx-auto mt-2 max-w-[340px] text-[12px] leading-relaxed text-slate-400 sm:text-[13px]">
            {copy.subtitle}
          </p>
          <p className="mt-4 text-sm font-semibold text-slate-200">{copy.profilePrompt}</p>
        </header>

        <nav aria-label="Perfis Oftware" className="flex flex-col gap-2.5">
          {depoimentos.length > 0 ? (
            <InstagramDepoimentosButton onOpen={() => setShowDepoimentosSheet(true)} />
          ) : null}

          {profiles.map((profile) => (
            <InstagramLinkButton
              key={profile.id}
              variant="profile"
              item={profile}
              onOpen={() => openItem(profile.id)}
            />
          ))}

          {founder ? (
            <InstagramLinkButton
              variant="founder"
              item={founder}
              onOpen={() => openItem('fundador')}
            />
          ) : null}

          {trailingProfiles.map((profile) => (
            <InstagramLinkButton
              key={profile.id}
              variant="profile"
              item={profile}
              onOpen={() => openItem(profile.id)}
            />
          ))}
        </nav>

        <footer className="mt-6 text-center text-[11px] text-slate-500">{footerText}</footer>
      </main>

      <InstagramProfileSheet
        item={activeItem}
        onClose={closeItem}
        enableAnalytics={enableAnalytics}
      />

      <InstagramDepoimentosSheet
        depoimentos={depoimentos}
        open={showDepoimentosSheet}
        onClose={() => setShowDepoimentosSheet(false)}
      />
    </div>
  );
}
