'use client';

import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, X } from 'lucide-react';
import {
  getInstagramFounderWhatsAppUrl,
  INSTAGRAM_FOUNDER_CONTACT_OPTIONS,
  type InstagramFounderContactProfile,
} from '@/lib/landing/instagramFounderWhatsApp';
import { trackInstagramHubWhatsAppEvent } from '@/lib/analytics/instagramHubAnalytics';

type Props = {
  open: boolean;
  onClose: () => void;
  enableAnalytics?: boolean;
};

export default function InstagramFounderWhatsAppPicker({ open, onClose, enableAnalytics = true }: Props) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  const handleSelect = (profile: InstagramFounderContactProfile) => {
    if (enableAnalytics) trackInstagramHubWhatsAppEvent(profile);
    window.open(getInstagramFounderWhatsAppUrl(profile), '_blank', 'noopener,noreferrer');
    onClose();
  };

  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.button
            type="button"
            aria-label="Fechar"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-[60] bg-[#020610]/80 backdrop-blur-sm"
            onClick={onClose}
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="instagram-whatsapp-picker-title"
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 440, damping: 34 }}
            className="fixed inset-x-3 bottom-3 z-[70] mx-auto max-w-[380px] overflow-hidden rounded-2xl border border-emerald-400/25 bg-[#0a1428]/98 shadow-[0_0_48px_rgba(74,222,128,0.12)] backdrop-blur-xl ring-2 ring-emerald-400/30 sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:w-full sm:-translate-x-1/2 sm:-translate-y-1/2"
          >
            <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-emerald-500/20 blur-2xl opacity-60" />

            <div className="relative p-4 sm:p-5">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <span className="mb-2 inline-flex items-center gap-1.5 text-lg leading-none" aria-hidden>
                    💬
                  </span>
                  <h2 id="instagram-whatsapp-picker-title" className="text-base font-semibold text-white">
                    Quem é você?
                  </h2>
                  <p className="mt-1 text-[12px] leading-snug text-slate-400">
                    Escolha seu perfil para abrir o WhatsApp com a mensagem certa.
                  </p>
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

              <div className="flex flex-col gap-2">
                {INSTAGRAM_FOUNDER_CONTACT_OPTIONS.map((option, index) => (
                  <motion.button
                    key={option.id}
                    type="button"
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.04, duration: 0.2 }}
                    onClick={() => handleSelect(option.id)}
                    className="group flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-3 text-left transition hover:border-emerald-400/30 hover:bg-emerald-500/[0.08] focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60 active:scale-[0.99]"
                  >
                    <span className="text-[14px] font-medium text-white">{option.label}</span>
                    <ChevronRight
                      className="h-4 w-4 text-slate-500 transition group-hover:translate-x-0.5 group-hover:text-emerald-400"
                      aria-hidden
                    />
                  </motion.button>
                ))}
              </div>
            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  );
}
