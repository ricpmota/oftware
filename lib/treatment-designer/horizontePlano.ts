/**
 * Semântica de horizonte do plano: atingir a meta ≠ fim do tratamento.
 */
import type { FaseTratamentoSegmento, MarcoClinicoDef } from '@/lib/treatment-designer/types';
import { calcularMarcosClinicosPorRitmo } from '@/lib/treatment-designer/marcosClinicosEsperados';

export type HorizontePlanoAtual = {
  /** Semana em que o peso alvo é atingido na fase de perda. */
  semanaMetaAtingida: number;
  /**
   * Última semana exibida no gráfico hoje.
   * Atualmente igual a semanaMetaAtingida; futuro incluirá consolidação e pós-meta.
   */
  semanaFimHorizonteVisual: number;
};

/**
 * Hoje o horizonte visual cobre apenas a fase de perda de peso.
 * A meta é um marco clínico, não o encerramento do tratamento.
 */
export function calcularHorizonteAtualFasePerda(duracaoSemanas: number): HorizontePlanoAtual {
  const semanas = Math.max(1, Math.round(duracaoSemanas));
  return {
    semanaMetaAtingida: semanas,
    semanaFimHorizonteVisual: semanas,
  };
}

/** Placeholder — fases vazias até motor v2. */
export function fasesPlaceholderFasePerda(
  duracaoSemanas: number
): FaseTratamentoSegmento[] {
  const semanas = Math.max(1, Math.round(duracaoSemanas));
  return [
    {
      id: 'perda_peso',
      rotulo: 'Perda de peso',
      semanaInicio: 0,
      semanaFim: semanas,
      duracaoSemanas: semanas,
    },
  ];
}

/** @deprecated Use calcularMarcosClinicosPorRitmo — mantido para compatibilidade legada. */
export function marcosPlaceholderFasePerda(
  duracaoSemanas: number,
  pesoInicialKg?: number | null,
  metaKg?: number
): MarcoClinicoDef[] {
  const semanas = Math.max(1, Math.round(duracaoSemanas));
  if (pesoInicialKg == null || pesoInicialKg <= 0) {
    return [
      { id: 'inicio_tratamento', rotulo: 'Início do tratamento', semana: 0 },
      { id: 'meta_atingida', rotulo: 'Meta atingida', semana: semanas },
    ];
  }

  return calcularMarcosClinicosPorRitmo(
    { pesoInicialKg, metaKg },
    'lento'
  );
}
