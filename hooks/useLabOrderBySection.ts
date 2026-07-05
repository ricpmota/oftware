'use client';

import { useState, useEffect } from 'react';
import { labOrderBySection as defaultLabOrderBySection } from '@/types/labRanges';
import type { LabLimitOverrides } from '@/utils/labRangesFromJson';

type LabExamesConfigResponse = {
  labOrderBySection?: Record<string, string[]>;
  labLimitOverrides?: LabLimitOverrides;
};

/**
 * Ordem dos exames por sistema e overrides de min/max.
 * A estrutura de seções/exames (labOrderBySection) vem SEMPRE do código-fonte (types/labRanges.ts)
 * para garantir sincronização com novos exames. Apenas labLimitOverrides vem do Firestore.
 */
export function useLabOrderBySection(): {
  labOrderBySection: Record<string, string[]>;
  labLimitOverrides: LabLimitOverrides;
  loading: boolean;
  reload: () => void;
} {
  const [order] = useState<Record<string, string[]>>(() => {
    const o: Record<string, string[]> = {};
    for (const [k, v] of Object.entries(defaultLabOrderBySection)) {
      o[k] = [...v];
    }
    return o;
  });
  const [limitOverrides, setLimitOverrides] = useState<LabLimitOverrides>({});
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/lab-exames-config', { cache: 'no-store' });
        const j = (await res.json()) as LabExamesConfigResponse;
        if (!cancelled && j.labLimitOverrides && typeof j.labLimitOverrides === 'object' && !Array.isArray(j.labLimitOverrides)) {
          setLimitOverrides(j.labLimitOverrides as LabLimitOverrides);
        } else if (!cancelled) {
          setLimitOverrides({});
        }
      } catch {
        /* mantém default */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tick]);

  return {
    labOrderBySection: order,
    labLimitOverrides: limitOverrides,
    loading,
    reload: () => {
      setLoading(true);
      setTick((t) => t + 1);
    },
  };
}
