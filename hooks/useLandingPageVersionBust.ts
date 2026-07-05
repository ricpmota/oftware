'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Garante ?_v=&_t= na URL (mesmo padrão de /mentoria) para não ficar preso em HTML/chunks em cache.
 */
export function useLandingPageVersionBust(pathname: string) {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    fetch('/api/version', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: { version?: string | number }) => {
        if (cancelled) return;
        const current =
          d && typeof d.version !== 'undefined' ? String(d.version) : '';
        if (!current) return;
        const params = new URLSearchParams(window.location.search);
        const v = params.get('_v');
        const t = params.get('_t');
        if (v === current && t) return;
        params.delete('_v');
        params.delete('_t');
        params.set('_v', current);
        params.set('_t', String(Date.now()));
        const q = params.toString();
        router.replace(q ? `${pathname}?${q}` : `${pathname}?_v=${encodeURIComponent(current)}&_t=${Date.now()}`);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [pathname, router]);
}
