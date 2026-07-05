/**
 * Tentativas de resposta do estudante no banco de questões Oftpay.
 * Coleção Firestore: oftpayQuestionAttempts
 */

import type { QuestaoDificuldade } from '@/types/oftpayQuestoes';

export const OFTPAY_QUESTION_ATTEMPTS_COLLECTION = 'oftpayQuestionAttempts';

export interface OftpayQuestionAttempt {
  id?: string;
  userId: string;
  userEmail?: string;
  questionId: string;
  acertou: boolean;
  respostaSelecionada: string;
  respostaCorreta: string;
  courseId: 'oftreview';
  apostilaTitulo?: string;
  knowledgeMapId?: string;
  capituloTitulo?: string;
  tema?: string;
  subtema?: string;
  dificuldade?: QuestaoDificuldade | string;
  respondedAt?: number;
}

export type OftpayQuestionAttemptDoc = OftpayQuestionAttempt & { id: string };

export interface StudentPerformanceKpis {
  totalRespondidas: number;
  acertos: number;
  erros: number;
  percentualAcerto: number;
}

export interface StudentGroupPerformance {
  key: string;
  label: string;
  total: number;
  acertos: number;
  erros: number;
  percentualAcerto: number;
}

export interface StudentPerformanceSummary {
  kpis: StudentPerformanceKpis;
  porCapitulo: StudentGroupPerformance[];
  porApostila: StudentGroupPerformance[];
  capitulosRevisar: StudentGroupPerformance[];
}

function emptyKpis(): StudentPerformanceKpis {
  return { totalRespondidas: 0, acertos: 0, erros: 0, percentualAcerto: 0 };
}

function pct(acertos: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((acertos / total) * 1000) / 10;
}

function aggregateBy(
  attempts: OftpayQuestionAttemptDoc[],
  labelFn: (a: OftpayQuestionAttemptDoc) => string
): StudentGroupPerformance[] {
  const map = new Map<string, { label: string; acertos: number; erros: number }>();

  for (const attempt of attempts) {
    const label = labelFn(attempt);
    const key = label.toLowerCase();
    const row = map.get(key) ?? { label, acertos: 0, erros: 0 };
    if (attempt.acertou) row.acertos += 1;
    else row.erros += 1;
    map.set(key, row);
  }

  return Array.from(map.entries())
    .map(([key, row]) => {
      const total = row.acertos + row.erros;
      return {
        key,
        label: row.label,
        total,
        acertos: row.acertos,
        erros: row.erros,
        percentualAcerto: pct(row.acertos, total),
      };
    })
    .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'));
}

/** Agregação client-side a partir das tentativas do usuário. */
export function computeStudentPerformance(
  attempts: OftpayQuestionAttemptDoc[]
): StudentPerformanceSummary {
  if (attempts.length === 0) {
    return {
      kpis: emptyKpis(),
      porCapitulo: [],
      porApostila: [],
      capitulosRevisar: [],
    };
  }

  const acertos = attempts.filter((a) => a.acertou).length;
  const erros = attempts.length - acertos;

  const porCapitulo = aggregateBy(attempts, (a) => {
    const cap = (a.capituloTitulo ?? '').trim();
    if (cap) return cap;
    const tema = (a.tema ?? '').trim();
    return tema || 'Sem capítulo';
  });

  const porApostila = aggregateBy(attempts, (a) => {
    const ap = (a.apostilaTitulo ?? '').trim();
    return ap || 'Sem apostila';
  });

  const capitulosRevisar = [...porCapitulo]
    .filter((g) => g.total > 0)
    .sort((a, b) => {
      if (a.percentualAcerto !== b.percentualAcerto) {
        return a.percentualAcerto - b.percentualAcerto;
      }
      return b.total - a.total;
    });

  return {
    kpis: {
      totalRespondidas: attempts.length,
      acertos,
      erros,
      percentualAcerto: pct(acertos, attempts.length),
    },
    porCapitulo,
    porApostila,
    capitulosRevisar,
  };
}
