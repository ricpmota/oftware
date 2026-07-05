/**
 * Tópicos reais mapeados a partir do conteúdo extraído de cada apostila.
 * Coleção Firestore: oftreviewApostilaTopics
 */

export const OFTREVIEW_APOSTILA_TOPICS_COLLECTION = 'oftreviewApostilaTopics';

export const TOPIC_CAPACITY_MIN = 1;
export const TOPIC_CAPACITY_MAX = 50;

export type OftreviewApostilaTopicStatus = 'ativo' | 'revisar' | 'esgotado' | 'ignorar';

/** Assunto/ângulo planejado para uma questão dentro do tópico. */
export interface OftreviewApostilaTopicPlannedSubjectDifficultySlot {
  covered: boolean;
  questaoId?: string;
  coveredAt?: number;
  cancelled?: boolean;
  cancelledReason?: string;
  cancelledAt?: number;
}

export interface OftreviewApostilaTopicPlannedSubject {
  id: string;
  title: string;
  hint?: string;
  byDifficulty: Record<
    'facil' | 'medio' | 'dificil',
    OftreviewApostilaTopicPlannedSubjectDifficultySlot
  >;
}

export interface OftreviewApostilaTopic {
  id?: string;
  apostilaTitulo: string;
  topicTitle: string;
  topicSummary?: string;
  pages?: number[];
  keywords?: string[];
  estimatedQuestionCapacity?: number;
  /** Assuntos distintos planejados (1 por questão possível). */
  plannedSubjects?: OftreviewApostilaTopicPlannedSubject[];
  generatedQuestionCount?: number;
  coveragePercent?: number;
  status?: OftreviewApostilaTopicStatus;
  createdAt?: number;
  updatedAt?: number;
}

export type OftreviewApostilaTopicDoc = OftreviewApostilaTopic & { id: string };

/** Tópico enriquecido com estatísticas calculadas a partir das questões existentes. */
export interface OftreviewApostilaTopicWithStats extends OftreviewApostilaTopicDoc {
  generatedQuestionCount: number;
  coveragePercent: number;
  status: OftreviewApostilaTopicStatus;
}

export function clampTopicCapacity(value: unknown): number {
  const n = typeof value === 'number' ? value : parseInt(String(value ?? ''), 10);
  if (!Number.isFinite(n)) return TOPIC_CAPACITY_MIN;
  return Math.min(TOPIC_CAPACITY_MAX, Math.max(TOPIC_CAPACITY_MIN, Math.round(n)));
}

/** coveragePercent = generatedQuestionCount / estimatedQuestionCapacity * 100 */
export function computeCoveragePercent(
  generatedQuestionCount: number,
  estimatedQuestionCapacity: number
): number {
  if (estimatedQuestionCapacity <= 0) return 0;
  const raw = (generatedQuestionCount / estimatedQuestionCapacity) * 100;
  return Math.round(raw * 10) / 10;
}

export function suggestTopicStatus(
  generatedQuestionCount: number,
  estimatedQuestionCapacity: number,
  stored?: OftreviewApostilaTopicStatus
): OftreviewApostilaTopicStatus {
  if (stored === 'ignorar') return 'ignorar';
  const pct = computeCoveragePercent(generatedQuestionCount, estimatedQuestionCapacity);
  if (pct >= 100) return 'esgotado';
  if (pct >= 75) return 'revisar';
  return stored === 'revisar' || stored === 'esgotado' ? stored : 'ativo';
}

export const TOPIC_STATUS_LABEL: Record<OftreviewApostilaTopicStatus, string> = {
  ativo: 'Ativo',
  revisar: 'Revisar',
  esgotado: 'Esgotado',
  ignorar: 'Ignorar',
};

export const TOPIC_STATUS_BADGE: Record<OftreviewApostilaTopicStatus, string> = {
  ativo: 'bg-green-50 text-green-800 border-green-200',
  revisar: 'bg-amber-50 text-amber-900 border-amber-200',
  esgotado: 'bg-gray-100 text-gray-700 border-gray-200',
  ignorar: 'bg-gray-50 text-gray-500 border-gray-200',
};

/** Resumo de cobertura editorial por apostila (criador). */
export interface ApostilaQuestoesOverview {
  apostilaTitulo: string;
  hasContentExtracted: boolean;
  topicsMapped: number;
  totalCapacity: number;
  questoesTotal: number;
  questoesPublicadas: number;
  questoesRascunho: number;
  questoesRevisao: number;
  /** publicadas / totalCapacity */
  coveragePercent: number;
  topics: OftreviewApostilaTopicWithStats[];
}

export interface ApostilaQuestoesOverviewTotals {
  apostilas: number;
  apostilasComConteudo: number;
  apostilasMapeadas: number;
  topicsMapped: number;
  totalCapacity: number;
  questoesTotal: number;
  questoesPublicadas: number;
  coveragePercent: number;
}
