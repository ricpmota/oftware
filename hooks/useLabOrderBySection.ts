'use client';

import { useState, useEffect } from 'react';
import { labOrderBySection as defaultLabOrderBySection } from '@/types/labRanges';
import type { LabLimitOverrides } from '@/utils/labRangesFromJson';
import {
  extraSectionLabelsFromCustomExams,
  mergeEnabledCustomExamsIntoOrder,
  normalizeLabCustomExams,
  type LabCustomExam,
} from '@/lib/labExames/labCustomExams';

type LabExamesConfigResponse = {
  labOrderBySection?: Record<string, string[]>;
  labLimitOverrides?: LabLimitOverrides;
  labCustomExams?: LabCustomExam[];
  labSectionLabels?: Record<string, string>;
};

function cloneDefaultOrder(): Record<string, string[]> {
  const o: Record<string, string[]> = {};
  for (const [k, v] of Object.entries(defaultLabOrderBySection)) {
    o[k] = [...v];
  }
  return o;
}

/**
 * Ordem dos exames por sistema: catálogo do código + exames criados por médicos (patrimônio global, habilitados).
 * labLimitOverrides vem do Firestore (faixas do Admin Geral + definições dos exames novos).
 */
export function useLabOrderBySection(): {
  labOrderBySection: Record<string, string[]>;
  labLimitOverrides: LabLimitOverrides;
  labSectionLabels: Record<string, string>;
  labCustomExams: LabCustomExam[];
  loading: boolean;
  reload: () => void;
} {
  const [order, setOrder] = useState<Record<string, string[]>>(cloneDefaultOrder);
  const [limitOverrides, setLimitOverrides] = useState<LabLimitOverrides>({});
  const [sectionLabels, setSectionLabels] = useState<Record<string, string>>({});
  const [customExams, setCustomExams] = useState<LabCustomExam[]>([]);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/lab-exames-config', { cache: 'no-store' });
        const j = (await res.json()) as LabExamesConfigResponse;
        if (cancelled) return;
        const customs = normalizeLabCustomExams(j.labCustomExams).filter((e) => e.enabled);
        const overrides =
          j.labLimitOverrides && typeof j.labLimitOverrides === 'object' && !Array.isArray(j.labLimitOverrides)
            ? (j.labLimitOverrides as LabLimitOverrides)
            : {};
        setLimitOverrides(overrides);
        setCustomExams(customs);
        setSectionLabels({
          ...extraSectionLabelsFromCustomExams(customs),
          ...(j.labSectionLabels && typeof j.labSectionLabels === 'object' ? j.labSectionLabels : {}),
        });
        setOrder(mergeEnabledCustomExamsIntoOrder(cloneDefaultOrder(), customs));
      } catch {
        if (!cancelled) {
          setOrder(cloneDefaultOrder());
          setLimitOverrides({});
          setCustomExams([]);
          setSectionLabels({});
        }
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
    labSectionLabels: sectionLabels,
    labCustomExams: customExams,
    loading,
    reload: () => {
      setLoading(true);
      setTick((t) => t + 1);
    },
  };
}
