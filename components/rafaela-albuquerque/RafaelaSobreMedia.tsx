'use client';

import React, { useEffect } from 'react';
import Script from 'next/script';
import { BRAND } from '@/rafaela-albuquerque/siteConfig';

declare global {
  interface Window {
    instgrm?: { Embeds: { process: () => void } };
  }
}

function processInstagramEmbeds() {
  window.instgrm?.Embeds?.process();
}

function captionForPermalink(permalink: string): string {
  try {
    const segments = new URL(permalink).pathname.split('/').filter(Boolean);
    const first = segments[0];
    if (first && first !== 'p' && first !== 'reel' && first !== 'tv') {
      return `@${first} — Instagram`;
    }
  } catch {
    /* ignore */
  }
  return 'Instagram';
}

type Props = {
  permalink: string | null;
};

export default function RafaelaSobreMedia({ permalink }: Props) {
  useEffect(() => {
    if (!permalink) return;
    const t = window.setTimeout(() => processInstagramEmbeds(), 80);
    return () => window.clearTimeout(t);
  }, [permalink]);

  if (!permalink) {
    return (
      <>
        <img
          src={BRAND.portraitPhotoPath}
          alt="Dra. Rafaela Albuquerque"
          width={960}
          height={1280}
          className="w-full rounded-2xl border object-cover object-top aspect-[3/4] max-h-[min(20rem,48svh)] sm:max-h-[min(22rem,45svh)] lg:max-h-[min(28rem,70vh)] shadow-[0_22px_48px_-18px_rgba(0,0,0,0.22),0_0_0_1px_rgba(64,153,179,0.12),0_0_52px_-20px_rgba(64,153,179,0.2)] transition-shadow duration-200 ease-out"
          style={{ borderColor: BRAND.border }}
        />
        <figcaption className="mt-3 text-center text-sm" style={{ color: BRAND.textMuted }}>
          Dra. Rafaela Albuquerque
        </figcaption>
      </>
    );
  }

  return (
    <>
      <div
        className="w-full overflow-hidden rounded-2xl border bg-white shadow-[0_22px_48px_-18px_rgba(0,0,0,0.18),0_0_0_1px_rgba(64,153,179,0.12)] min-h-[min(22rem,50svh)] sm:min-h-[min(24rem,52svh)] lg:min-h-[min(28rem,58svh)]"
        style={{ borderColor: BRAND.border }}
      >
        <div className="flex w-full max-w-full justify-center overflow-x-auto px-1 py-3 sm:px-2 sm:py-4">
          <blockquote
            className="instagram-media max-w-full"
            data-instgrm-permalink={permalink}
            data-instgrm-version="14"
            style={{
              background: '#fff',
              border: 0,
              borderRadius: 12,
              margin: 0,
              maxWidth: 'min(540px, 100%)',
              minWidth: 0,
              width: '100%',
            }}
          />
        </div>
      </div>
      <Script
        src="https://www.instagram.com/embed.js"
        strategy="lazyOnload"
        onLoad={() => {
          processInstagramEmbeds();
        }}
      />
      <figcaption className="mt-3 text-center text-sm" style={{ color: BRAND.textMuted }}>
        {captionForPermalink(permalink)}
      </figcaption>
    </>
  );
}
