'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Check, X } from 'lucide-react';
import InstagramFounderWhatsAppPicker from '@/components/instagram/InstagramFounderWhatsAppPicker';
import InstagramQuestionnaireGateModal from '@/components/instagram/InstagramQuestionnaireGateModal';
import {
  ACCENT_STYLES,
  type InstagramFounderItem,
  type InstagramHubItem,
  type InstagramProfileItem,
} from '@/components/instagram/instagramHubData';
import { resolveInstagramHubIcon } from '@/components/instagram/resolveInstagramHubIcon';
import { trackInstagramHubProfileEvent } from '@/lib/analytics/instagramHubAnalytics';
import type { InstagramFounderContactProfile } from '@/lib/landing/instagramFounderWhatsApp';
import { isInstagramFounderContactProfile } from '@/lib/whiteLabel/whiteLabelInstagramFlow';

type Props = {
  item: InstagramHubItem | null;
  onClose: () => void;
  enableAnalytics?: boolean;
};

const listContainerVariants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.09,
      delayChildren: 0.14,
    },
  },
};

const listItemVariants = {
  hidden: {
    opacity: 0,
    y: 22,
    filter: 'blur(8px)',
  },
  show: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: {
      type: 'spring',
      stiffness: 420,
      damping: 30,
      mass: 0.65,
    },
  },
};

const introVariants = {
  hidden: { opacity: 0, y: 14, filter: 'blur(6px)' },
  show: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] },
  },
};

const ctaVariants = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { delay: 0.42, duration: 0.4, ease: [0.22, 1, 0.36, 1] },
  },
};

function isFounderItem(item: InstagramHubItem): item is InstagramFounderItem {
  return item.kind === 'founder';
}

function isProfileItem(item: InstagramHubItem): item is InstagramProfileItem {
  return item.kind === 'profile';
}

function splitFounderParagraphs(text: string): string[] {
  return text
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean);
}

export default function InstagramProfileSheet({ item, onClose, enableAnalytics = true }: Props) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const [showWhatsAppPicker, setShowWhatsAppPicker] = useState(false);
  const [questionnaireGateProfile, setQuestionnaireGateProfile] =
    useState<InstagramFounderContactProfile | null>(null);

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
  const founderParagraphs = founder ? splitFounderParagraphs(founder.modalText) : [];
  const benefitCount = item?.benefits.length ?? 0;
  const founderContactProfile =
    profile && isInstagramFounderContactProfile(profile.id) ? profile.id : null;
  const showQuestionnaireGate = Boolean(
    profile && profile.href.startsWith('https://wa.me') && founderContactProfile
  );

  const founderDirectWhatsApp =
    Boolean(founder?.openWhatsAppDirectly && founder.href.startsWith('https://wa.me'));
  const sheetTitle = founder ? founder.modalTitle : profile?.title;
  const ringClass = founder
    ? 'ring-emerald-400/40 shadow-[0_0_60px_rgba(74,222,128,0.15)]'
    : styles
      ? `${styles.ring} shadow-[0_0_60px_rgba(74,222,128,0.08)]`
      : '';

  const handleBackdropClose = () => {
    if (showWhatsAppPicker || questionnaireGateProfile) return;
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
                  <motion.div
                    key={`${item.id}-intro`}
                    className="mb-4 space-y-3"
                    variants={listContainerVariants}
                    initial="hidden"
                    animate="show"
                  >
                    {founderParagraphs.map((paragraph, index) => (
                      <motion.p
                        key={`${item.id}-p-${index}`}
                        variants={listItemVariants}
                        className="text-[15px] sm:text-base leading-relaxed text-slate-200/95"
                      >
                        {paragraph}
                      </motion.p>
                    ))}
                  </motion.div>
                ) : profile?.modalIntro ? (
                  <motion.p
                    key={`${item.id}-intro`}
                    variants={introVariants}
                    initial="hidden"
                    animate="show"
                    className="mb-4 text-[15px] sm:text-base leading-relaxed text-slate-200/95"
                  >
                    {profile.modalIntro}
                  </motion.p>
                ) : null}

                <motion.ul
                  key={`${item.id}-benefits`}
                  className="mb-5 space-y-2.5"
                  variants={listContainerVariants}
                  initial="hidden"
                  animate="show"
                >
                  {item.benefits.map((benefit, index) => (
                    <motion.li
                      key={`${item.id}-benefit-${index}`}
                      variants={listItemVariants}
                      className="group relative flex items-start gap-3 overflow-hidden rounded-xl border border-white/[0.07] bg-white/[0.04] px-3.5 py-3 text-[15px] sm:text-[16px] leading-snug text-slate-100/95 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
                    >
                      <span
                        className="pointer-events-none absolute inset-y-0 left-0 w-[2px] bg-gradient-to-b from-transparent via-emerald-400/70 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                        aria-hidden
                      />
                      <span
                        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ring-1 ring-white/10 ${
                          founder ? 'bg-emerald-500/20' : styles?.iconBg
                        }`}
                      >
                        <Check
                          className={`h-3 w-3 ${founder ? 'text-emerald-400' : styles?.iconText}`}
                          aria-hidden
                        />
                      </span>
                      <span className="min-w-0 flex-1 leading-relaxed">{benefit}</span>
                    </motion.li>
                  ))}
                </motion.ul>

                <motion.div
                  key={`${item.id}-cta`}
                  variants={ctaVariants}
                  initial="hidden"
                  animate="show"
                  transition={{ delay: 0.14 + benefitCount * 0.09 + 0.2 }}
                >
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
                ) : showQuestionnaireGate && founderContactProfile ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (enableAnalytics) trackInstagramHubProfileEvent(founderContactProfile, 'cta');
                      setQuestionnaireGateProfile(founderContactProfile);
                    }}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#25D366] to-emerald-400 px-4 py-3 text-sm font-semibold text-[#04210f] transition hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a1428]"
                  >
                    <span aria-hidden>💬</span>
                    {item.ctaLabel}
                  </button>
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
                </motion.div>
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

      <InstagramQuestionnaireGateModal
        open={questionnaireGateProfile !== null}
        profile={questionnaireGateProfile}
        onClose={() => setQuestionnaireGateProfile(null)}
        enableAnalytics={enableAnalytics}
      />
    </>
  );
}
