import type { QuestaoDificuldade } from '@/types/oftpayQuestoes';
import type { OftpayQuestaoDoc } from '@/services/oftpayQuestoesService';
import {
  computeSubjectGroupsFromPublicadas,
  type OftpaySimuladoSelection,
} from '@/types/oftpaySimulados';

export interface PublishedTopicMatch {
  subjectKey: string;
  subjectLabel: string;
  topicKey: string;
  topicLabel: string;
  /** Ex.: "Órbita — Fraturas orbitárias" */
  fullLabel: string;
  totalPublicadas: number;
  facil: number;
  medio: number;
  dificil: number;
}

export interface SmartSearchRow {
  id: string;
  query: string;
  selectedTopic: PublishedTopicMatch | null;
  dificuldade: QuestaoDificuldade;
  quantidade: number;
}

export function buildPublishedTopicIndex(publicadas: OftpayQuestaoDoc[]): PublishedTopicMatch[] {
  return computeSubjectGroupsFromPublicadas(publicadas).flatMap((group) =>
    group.topics.map((topic) => ({
      subjectKey: group.key,
      subjectLabel: group.label,
      topicKey: topic.key,
      topicLabel: topic.label,
      fullLabel: `${group.label} — ${topic.label}`,
      totalPublicadas: topic.totalPublicadas,
      facil: topic.facil,
      medio: topic.medio,
      dificil: topic.dificil,
    }))
  );
}

function normalizeSearchText(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '');
}

function scoreTopicMatch(topic: PublishedTopicMatch, rawQuery: string): number {
  const q = normalizeSearchText(rawQuery);
  if (!q) return 0;

  const topicNorm = normalizeSearchText(topic.topicLabel);
  const subjectNorm = normalizeSearchText(topic.subjectLabel);
  const fullNorm = normalizeSearchText(topic.fullLabel);

  if (topicNorm === q || fullNorm === q) return 100;
  if (topicNorm.startsWith(q)) return 85;
  if (subjectNorm.startsWith(q)) return 75;
  if (topicNorm.includes(q)) return 65;
  if (fullNorm.includes(q)) return 55;
  if (subjectNorm.includes(q)) return 45;

  const words = q.split(/\s+/).filter(Boolean);
  if (words.length > 1 && words.every((w) => fullNorm.includes(w))) return 50;

  let wordHits = 0;
  for (const word of words) {
    if (topicNorm.includes(word) || subjectNorm.includes(word)) wordHits += 1;
  }
  if (wordHits > 0) return 30 + wordHits * 8;

  return 0;
}

export function searchPublishedTopics(
  index: PublishedTopicMatch[],
  query: string,
  options?: { limit?: number; excludeTopicKeys?: Set<string> }
): PublishedTopicMatch[] {
  const limit = options?.limit ?? 12;
  const exclude = options?.excludeTopicKeys ?? new Set<string>();

  const scored = index
    .filter((topic) => !exclude.has(getPublishedTopicKey(topic)))
    .map((topic) => ({ topic, score: scoreTopicMatch(topic, query) }))
    .filter((row) => row.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.topic.fullLabel.localeCompare(b.topic.fullLabel, 'pt-BR');
    });

  return scored.slice(0, limit).map((row) => row.topic);
}

export function getPublishedTopicKey(
  topic: Pick<PublishedTopicMatch, 'subjectKey' | 'topicKey'>
): string {
  return `${topic.subjectKey}:${topic.topicKey}`;
}

export function createSmartSearchRowFromTopic(
  topic: PublishedTopicMatch,
  index = 0
): SmartSearchRow {
  const defaultDifficulty: QuestaoDificuldade =
    topic.medio > 0 ? 'medio' : topic.facil > 0 ? 'facil' : topic.dificil > 0 ? 'dificil' : 'medio';
  const disp = getAvailableForTopicDifficulty(topic, defaultDifficulty);
  return {
    id: `row-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}`,
    query: topic.fullLabel,
    selectedTopic: topic,
    dificuldade: defaultDifficulty,
    quantidade: Math.min(5, Math.max(1, disp)),
  };
}

export function createEmptySmartSearchRow(): SmartSearchRow {
  return {
    id: `row-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    query: '',
    selectedTopic: null,
    dificuldade: 'medio',
    quantidade: 5,
  };
}

export function getAvailableForTopicDifficulty(
  topic: PublishedTopicMatch,
  dificuldade: QuestaoDificuldade
): number {
  if (dificuldade === 'facil') return topic.facil;
  if (dificuldade === 'dificil') return topic.dificil;
  return topic.medio;
}

export function smartRowsToSelections(rows: SmartSearchRow[]): OftpaySimuladoSelection[] {
  return rows
    .filter((row) => row.selectedTopic && row.quantidade > 0)
    .map((row) => ({
      apostilaTitulo: row.selectedTopic!.subjectLabel,
      capituloTitulo: row.selectedTopic!.topicLabel,
      dificuldade: row.dificuldade,
      quantidade: row.quantidade,
    }));
}

export function countConfiguredSmartRows(rows: SmartSearchRow[]): number {
  return rows.filter((row) => row.selectedTopic && row.quantidade > 0).length;
}

export function totalQuestionsFromSmartRows(rows: SmartSearchRow[]): number {
  return smartRowsToSelections(rows).reduce((sum, sel) => sum + sel.quantidade, 0);
}
