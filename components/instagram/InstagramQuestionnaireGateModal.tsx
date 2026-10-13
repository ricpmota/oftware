'use client';

import React, { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { Clock, MessageCircle, X } from 'lucide-react';
import type { InstagramFounderContactProfile } from '@/lib/landing/instagramFounderWhatsApp';
import { getInstagramFounderWhatsAppUrl } from '@/lib/landing/instagramFounderWhatsApp';
import { buildWhiteLabelInstagramQuestionnaireUrl } from '@/lib/whiteLabel/whiteLabelInstagramFlow';
import { parseWhiteLabelProfissao } from '@/lib/whiteLabel/profissao';
import { trackInstagramHubProfileEvent } from '@/lib/analytics/instagramHubAnalytics';

type Props = {
  open: boolean;
  profile: InstagramFounderContactProfile | null;
  onClose: () => void;
  enableAnalytics?: boolean;
};

export default function InstagramQuestionnaireGateModal({
  open,
  profile,
  onClose,
  enableAnalytics = true,
}: Props) {
  const router = useRouter();
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

  const handleYes = () => {
    if (!profile) return;
    if (enableAnalytics) trackInstagramHubProfileEvent(profile, 'cta', 'questionnaire');
    const profissao = parseWhiteLabelProfissao(profile, 'medico');
    router.push(buildWhiteLabelInstagramQuestionnaireUrl(profissao));
    onClose();
  };

  const handleNo = () => {
    if (!profile) return;
    const url = getInstagramFounderWhatsAppUrl(profile);
    if (enableAnalytics) trackInstagramHubProfileEvent(profile, 'cta', url);
    window.open(url, '_blank', 'noopener,noreferrer');
    onClose();
  };

  return (
    <AnimatePresence>
      {open && profile ? (
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
            aria-labelledby="instagram-questionnaire-gate-title"
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 440, damping: 34 }}
            className="fixed inset-x-3 bottom-3 z-[70] mx-auto max-w-[400px] overflow-hidden rounded-2xl border border-emerald-400/25 bg-[#0a1428]/98 shadow-[0_0_48px_rgba(74,222,128,0.12)] backdrop-blur-xl ring-2 ring-emerald-400/30 sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:w-full sm:-translate-x-1/2 sm:-translate-y-1/2"
          >
            <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-emerald-500/20 blur-2xl opacity-60" />

            <div className="relative p-4 sm:p-5">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <span className="mb-2 inline-flex items-center gap-1.5 text-lg leading-none" aria-hidden>
                    📋
                  </span>
                  <h2 id="instagram-questionnaire-gate-title" className="text-base font-semibold text-white">
                    Antes de conversarmos…
                  </h2>
                  <p className="mt-2 text-[14px] sm:text-[15px] leading-relaxed text-slate-300/95">
                    Você se importaria de responder um questionário rápido antes? Leva apenas{' '}
                    <span className="font-semibold text-emerald-300">2 minutinhos</span> e me ajuda a
                    entender melhor seu perfil.
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

              <div className="mb-4 flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-[13px] text-slate-300">
                <Clock className="h-4 w-4 shrink-0 text-emerald-400" aria-hidden />
                Questionário rápido · cerca de 2 minutos
              </div>

              <div className="flex flex-col gap-2.5">
                <button
                  type="button"
                  onClick={handleYes}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-400 to-cyan-300 px-4 py-3.5 text-sm font-semibold text-[#060d1f] transition hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a1428]"
                >
                  Sim, posso responder
                </button>
                <button
                  type="button"
                  onClick={handleNo}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.05] px-4 py-3.5 text-sm font-semibold text-white transition hover:bg-white/[0.08] focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a1428]"
                >
                  <MessageCircle className="h-4 w-4 text-[#25D366]" aria-hidden />
                  Não, falar direto no WhatsApp
                </button>
              </div>
            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  );
}
