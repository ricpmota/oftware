'use client';

import { useState, useEffect } from 'react';
import type { BioLimitOverrides } from '@/types/bioImpedancia';

let inflight: Promise<BioLimitOverrides> | null = null;

function fetchBioLimitOverrides(): Promise<BioLimitOverrides> {
  if (!inflight) {
    inflight = fetch('/api/bio-impedancia-config', { cache: 'no-store' })
      .then((r) => r.json())
      .then((j) => {
        const o = j?.bioLimitOverrides;
        return o && typeof o === 'object' && !Array.isArray(o) ? (o as BioLimitOverrides) : {};
      })
      .catch(() => ({}))
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}

/**
 * Carrega overrides de faixa de Bio Impedância (MetaAdmin Geral → Firestore).
 * Requisições simultâneas compartilham a mesma promise.
 */
export function useBioLimitOverrides(): BioLimitOverrides {
  const [overrides, setOverrides] = useState<BioLimitOverrides>({});
  useEffect(() => {
    let cancelled = false;
    fetchBioLimitOverrides().then((o) => {
      if (!cancelled) setOverrides(o);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return overrides;
}
