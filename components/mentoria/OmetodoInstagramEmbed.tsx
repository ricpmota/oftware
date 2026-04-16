'use client';

import React, { useEffect } from 'react';
import Image from 'next/image';
import Script from 'next/script';

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

export default function OmetodoInstagramEmbed({ permalink }: Props) {
  useEffect(() => {
    if (!permalink) return;
    const t = window.setTimeout(() => processInstagramEmbeds(), 80);
    return () => window.clearTimeout(t);
  }, [permalink]);

  if (!permalink) {
    return (
      <>
        <div className="relative w-full overflow-hidden rounded-2xl border border-white/10 bg-white/5 shadow-xl min-h-[min(22rem,50svh)] sm:min-h-[min(24rem,52svh)]">
          <Image
            src="/criativo-metodo.png"
            alt="Método Emagrecer"
            fill
            className="object-cover object-center"
            sizes="(min-width: 1024px) 28rem, 100vw"
            priority={false}
          />
        </div>
        <p className="mt-3 text-center text-sm text-[#E8EDED]/60">
          Canal oficial do método no Instagram — feed em integração.
        </p>
      </>
    );
  }

  return (
    <>
      <div className="w-full overflow-hidden rounded-2xl border border-white/10 bg-white/5 shadow-[0_22px_48px_-18px_rgba(0,0,0,0.35),0_0_0_1px_rgba(76,203,122,0.12)] min-h-[min(22rem,50svh)] sm:min-h-[min(24rem,52svh)] lg:min-h-[min(28rem,58svh)]">
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
      <figcaption className="mt-3 text-center text-sm text-[#E8EDED]/70">
        {captionForPermalink(permalink)}
      </figcaption>
    </>
  );
}
