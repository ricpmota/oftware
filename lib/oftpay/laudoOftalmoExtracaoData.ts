/**
 * Payload de extração do módulo Laudo Exames (compatível com legado laboratorial + campos oftalmológicos).
 */

import type { ExameLaboratorialExtracaoNormalizada } from '@/lib/metaadmin/exameLaboratorialExtracao';
import type { OftalmoExamType } from '@/lib/oftpay/laudoOftalmoExtraction';
import type { ChecklistStatus } from '@/lib/oftpay/laudoOftalmoChecklist';
import type { OftalmoEye } from '@/lib/oftpay/laudoOftalmoEye';

/** Status simples para UI e para contexto na análise. */
export type LaudoReviewStatus = 'ok' | 'attention' | 'review';

/** Flags canônicas de qualidade (pós-processamento + validação leve). */
export type LaudoQualityFlag =
  | 'missing_key_fields'
  | 'low_confidence_extraction'
  | 'possible_ocr_issue'
  | 'exam_type_fallback_used'
  | 'possible_exam_type_mismatch'
  | 'limited_interpretability'
  | 'review_recommended';

export type LaudoOftalmoExtracaoData = ExameLaboratorialExtracaoNormalizada & {
  /** Repete o tipo enviado na requisição (fonte da verdade). */
  examType: OftalmoExamType;
  examTypeLabel: string;
  /** Valores extraídos por modalidade, já pós-processados (limpeza leve). */
  camposEstruturados: Record<string, string | number | null>;
  rawSummary?: string | null;
  qualityFlags?: LaudoQualityFlag[];
  /** Uma linha sobre confiabilidade / revisão. */
  qualitySummary?: string | null;
  reviewStatus?: LaudoReviewStatus;
  /** Sugestão assistida de modalidade detectada no conteúdo (não substitui a escolha médica). */
  suggestedExamType?: OftalmoExamType | null;
  suggestedExamTypeLabel?: string | null;
  /** Confiança heurística da sugestão (0..1). */
  examTypeConfidence?: number | null;
  /** Explicação curta das pistas detectadas para a sugestão. */
  examTypeSuggestionReason?: string | null;
  /** true quando tipo escolhido diverge da sugestão com confiança suficiente. */
  examTypeMismatch?: boolean;
  checklistCoverage?: number;
  checklistFilledCount?: number;
  checklistTotal?: number;
  checklistStatus?: ChecklistStatus;
  filledKeyFields?: string[];
  missingKeyFields?: string[];
  eye?: OftalmoEye;
  eyeLabel?: string;
  detectedEye?: OftalmoEye;
  detectedEyeLabel?: string;
  eyeConfidence?: number | null;
};
