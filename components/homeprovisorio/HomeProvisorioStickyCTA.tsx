'use client';

import { useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';

type Props = {
  accentColor: string;
  onCta: () => void;
  footerSelector?: string;
};

export default function HomeProvisorioStickyCTA({
  accentColor,
  onCta,
  footerSelector = '#homeprov-footer',
}: Props) {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const footer = document.querySelector(footerSelector);
    if (!footer) return;
    const observer = new IntersectionObserver(
      ([entry]) => setHidden(Boolean(entry?.isIntersecting)),
      { threshold: 0.15 }
    );
    observer.observe(footer);
    return () => observer.disconnect();
  }, [footerSelector]);

  if (hidden) return null;

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200/80 bg-white/95 px-3.5 pt-3 shadow-[0_-8px_30px_rgba(10,31,68,0.08)] backdrop-blur-md md:hidden"
      style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
    >
      <button
        type="button"
        onClick={onCta}
        className="drprov-cta-shimmer flex w-full items-center justify-between gap-3 rounded-2xl px-4 py-3.5 text-left font-semibold text-[#0A1F44]"
        style={{ backgroundColor: accentColor }}
        aria-label="Encontrar um médico"
      >
        <span className="min-w-0">
          <span className="block text-[15px] leading-tight">Encontrar um médico</span>
          <span className="mt-0.5 block text-[11px] font-medium text-[#0A1F44]/70">
            Perfis verificados
          </span>
        </span>
        <ArrowRight className="h-5 w-5 shrink-0" aria-hidden />
      </button>
    </div>
  );
}
