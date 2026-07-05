'use client';

import { useEffect, useRef } from 'react';
import { compararResumosPlano, type PlanoDiffResult } from '@/lib/treatment-designer/planoDiff';
import type { ResumoDinamicoTratamento } from '@/lib/treatment-designer/types';

/**
 * Ponto de integração para diff dinâmico (meta/prazo).
 * Retorna ref atualizada a cada mudança de resumo — UI futura lê `.current`.
 */
export function usePlanoDiffRef(resumo: ResumoDinamicoTratamento | null) {
  const resumoAnteriorRef = useRef<ResumoDinamicoTratamento | null>(null);
  const diffRef = useRef<PlanoDiffResult | null>(null);

  useEffect(() => {
    if (!resumo) return;
    diffRef.current = compararResumosPlano(resumoAnteriorRef.current, resumo);
    resumoAnteriorRef.current = resumo;
  }, [resumo]);

  return diffRef;
}
