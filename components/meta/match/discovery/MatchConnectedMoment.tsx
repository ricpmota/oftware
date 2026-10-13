'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getMyMatchProfile } from '@/services/matchProfileService';

function Portrait({ url, name }: { url?: string; name: string }) {
  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={url} alt="" className="h-20 w-20 rounded-full object-cover ring-2 ring-white/80" />
    );
  }
  return (
    <span className="flex h-20 w-20 items-center justify-center rounded-full bg-white/10 text-2xl font-extrabold ring-2 ring-white/30">
      {name.slice(0, 1).toUpperCase()}
    </span>
  );
}

export function MatchConnectedMoment({
  name,
  otherPhotoUrl,
  pairKey,
  continueLabel,
  onContinue,
}: {
  name: string;
  otherPhotoUrl?: string;
  pairKey?: string;
  continueLabel: string;
  onContinue: () => void;
}) {
  const router = useRouter();
  const reducedMotion = useReducedMotion();
  const [selfPhoto, setSelfPhoto] = useState<string | undefined>();

  useEffect(() => {
    let cancelled = false;
    getMyMatchProfile()
      .then((profile) => {
        const photo = profile?.photos.find((item) => item.isPrimary) || profile?.photos[0];
        if (!cancelled) setSelfPhoto(photo?.url);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-[#020610]/80 px-5">
      <div className="w-full max-w-sm rounded-3xl border border-white/15 bg-[#0A1F44] px-6 py-8 text-center text-white">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#4CCB7A]">Conexão</p>
        <div className="mt-5 flex items-center justify-center gap-3">
          <motion.div
            initial={reducedMotion ? false : { x: -18, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: reducedMotion ? 0 : 0.35 }}
          >
            <Portrait url={selfPhoto} name="Você" />
          </motion.div>
          <motion.span
            aria-hidden="true"
            className="h-0.5 w-10 origin-center rounded-full bg-[#4CCB7A]"
            initial={reducedMotion ? false : { scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: reducedMotion ? 0 : 0.35, delay: reducedMotion ? 0 : 0.15 }}
          />
          <motion.div
            initial={reducedMotion ? false : { x: 18, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: reducedMotion ? 0 : 0.35 }}
          >
            <Portrait url={otherPhotoUrl} name={name} />
          </motion.div>
        </div>
        <h2 className="mt-5 text-2xl font-extrabold">Vocês se conectaram.</h2>
        <p className="mt-2 text-sm text-white/75">Vocês têm interesses em comum.</p>
        {pairKey ? (
          <button
            type="button"
            onClick={() => router.push(`/meta/match/messages/${pairKey}`)}
            className="mt-6 flex h-12 w-full items-center justify-center rounded-full bg-[#4CCB7A] text-sm font-semibold text-[#0A1F44]"
          >
            Mensagem
          </button>
        ) : null}
        <button type="button" onClick={onContinue} className="mt-3 text-sm font-semibold text-white/80">
          {continueLabel}
        </button>
      </div>
    </div>
  );
}
