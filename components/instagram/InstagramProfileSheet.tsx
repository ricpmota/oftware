'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Check, X } from 'lucide-react';
import InstagramFounderWhatsAppPicker from '@/components/instagram/InstagramFounderWhatsAppPicker';
import {
  ACCENT_STYLES,
  type InstagramFounderItem,
  type InstagramHubItem,
  type InstagramProfileItem,
} from '@/components/instagram/instagramHubData';
import { resolveInstagramHubIcon } from '@/components/instagram/resolveInstagramHubIcon';
import { trackInstagramHubProfileEvent } from '@/lib/analytics/instagramHubAnalytics';

type Props = {
  item: InstagramHubItem | null;
  onClose: () => void;
  enableAnalytics?: boolean;
};

function isFounderItem(item: InstagramHubItem): item is InstagramFounderItem {
  return item.kind === 'founder';
}

function isProfileItem(item: InstagramHubItem): item is InstagramProfileItem {
  return item.kind === 'profile';
}

export default function InstagramProfileSheet({ item, onClose, enableAnalytics = true }: Props) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const [showWhatsAppPicker, setShowWhatsAppPicker] = useState(false);

  useEffect(() => {
    if (!item) return;
    closeRef.current?.focus();
    setShowWhatsAppPicker(false);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [item]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (showWhatsAppPicker) {
          setShowWhatsAppPicker(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose, showWhatsAppPicker]);

  const founder = item && isFounderItem(item) ? item : null;
  const profile = item && isProfileItem(item) ? item : null;
  const styles = profile ? ACCENT_STYLES[profile.accent] : null;
  const Icon = profile ? resolveInstagramHubIcon(profile.iconKey) : null;

  const founderDirectWhatsApp =
    Boolean(founder?.openWhatsAppDirectly && founder.href.startsWith('https://wa.me'));
  const sheetTitle = founder ? founder.modalTitle : profile?.title;
  const ringClass = founder
    ? 'ring-emerald-400/40 shadow-[0_0_60px_rgba(74,222,128,0.15)]'
    : styles
      ? `${styles.ring} shadow-[0_0_60px_rgba(74,222,128,0.08)]`
      : '';

  const handleBackdropClose = () => {
    if (showWhatsAppPicker) return;
    onClose();
  };

  return (
    <>
      <AnimatePresence>
        {item && sheetTitle ? (
          <>
            <motion.button
              type="button"
              aria-label="Fechar"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-[#020610]/75 backdrop-blur-sm"
              onClick={handleBackdropClose}
            />

            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="instagram-sheet-title"
              initial={{ opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 420, damping: 32 }}
              className={`fixed inset-x-3 bottom-3 z-50 mx-auto max-w-[420px] overflow-hidden rounded-2xl border border-white/15 bg-[#0a1428]/95 backdrop-blur-xl sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:w-full sm:-translate-x-1/2 sm:-translate-y-1/2 ring-2 ${ringClass}`}
            >
              {founder ? (
                <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-emerald-500/20 blur-2xl opacity-60" />
              ) : styles ? (
                <div className={`pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full blur-2xl opacity-50 ${styles.iconBg}`} />
              ) : null}

              <div className="relative p-4 sm:p-5">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2.5">
                    {founder ? (
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/20 text-lg leading-none">
                        💬
                      </span>
                    ) : styles && profile?.iconKey ? (
                      <span
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${styles.iconBg} ${styles.iconText}`}
                      >
                        <Icon className="h-4 w-4" aria-hidden />
                      </span>
                    ) : null}
                    <h2 id="instagram-sheet-title" className="text-base font-semibold leading-snug text-white">
                      {sheetTitle}
                    </h2>
                  </div>
                  <button
                    ref={closeRef}
                    type="button"
                    onClick={onClose}
                    aria-label="Fechar"
                    className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-slate-300 transition hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60"
                  >
                    <X className="h-4 w-4" aria-hidden />
                  </button>
                </div>

                {founder ? (
                  <p className="mb-3 whitespace-pre-line text-[13px] leading-relaxed text-slate-300/95">
                    {founder.modalText}
                  </p>
                ) : profile?.modalIntro ? (
                  <p className="mb-3 text-[13px] leading-relaxed text-slate-300/95">{profile.modalIntro}</p>
                ) : null}

                <ul className="mb-4 space-y-2">
                  {item.benefits.map((benefit, index) => (
                    <motion.li
                      key={benefit}
                      initial={{ opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05, duration: 0.2 }}
                      className="flex items-center gap-2.5 text-[13px] leading-snug text-slate-200/95"
                    >
                      <span
                        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${
                          founder ? 'bg-emerald-500/20' : styles?.iconBg
                        }`}
                      >
                        <Check
                          className={`h-2.5 w-2.5 ${founder ? 'text-emerald-400' : styles?.iconText}`}
                          aria-hidden
                        />
                      </span>
                      {benefit}
                    </motion.li>
                  ))}
                </ul>

                {founder ? (
                  founderDirectWhatsApp ? (
                    <a
                      href={founder.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => {
                        if (enableAnalytics) trackInstagramHubProfileEvent('fundador', 'cta', founder.href);
                      }}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#25D366] to-emerald-400 px-4 py-3 text-sm font-semibold text-[#04210f] transition hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a1428]"
                    >
                      <span aria-hidden>💬</span>
                      {item.ctaLabel}
                    </a>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        if (enableAnalytics) trackInstagramHubProfileEvent('fundador', 'cta');
                        setShowWhatsAppPicker(true);
                      }}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#25D366] to-emerald-400 px-4 py-3 text-sm font-semibold text-[#04210f] transition hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a1428]"
                    >
                      <span aria-hidden>💬</span>
                      {item.ctaLabel}
                    </button>
                  )
                ) : (
                  <a
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => {
                      if (enableAnalytics) trackInstagramHubProfileEvent(item.id, 'cta', item.href);
                    }}
                    className={`inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a1428] ${
                      item.href.startsWith('https://wa.me')
                        ? 'bg-gradient-to-r from-[#25D366] to-emerald-400 text-[#04210f] focus-visible:ring-emerald-300'
                        : profile?.id === 'emagrecer'
                          ? 'bg-gradient-to-r from-teal-300 to-emerald-400 text-[#060d1f] focus-visible:ring-teal-300'
                          : 'bg-gradient-to-r from-emerald-300 to-cyan-300 text-[#060d1f] focus-visible:ring-emerald-300'
                    }`}
                  >
                    {item.ctaLabel}
                    <ArrowRight className="h-4 w-4" aria-hidden />
                  </a>
                )}
              </div>
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>

      {!founderDirectWhatsApp ? (
        <InstagramFounderWhatsAppPicker
          open={showWhatsAppPicker}
          onClose={() => setShowWhatsAppPicker(false)}
          enableAnalytics={enableAnalytics}
        />
      ) : null}
    </>
  );
}
