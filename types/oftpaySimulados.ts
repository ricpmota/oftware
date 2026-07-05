/**
 * Simulados personalizados do Banco de Questões Oftpay.
 * Coleções: oftpaySimulados, oftpaySimuladoAnswers
 */

import type { AlternativaLetra, QuestaoDificuldade } from '@/types/oftpayQuestoes';
import { getQuestaoCapituloDisplay } from '@/types/oftpayQuestoes';
import type { OftpayQuestaoDoc } from '@/services/oftpayQuestoesService';

export const OFTPAY_SIMULADOS_COLLECTION = 'oftpaySimulados';
export const OFTPAY_SIMULADO_ANSWERS_COLLECTION = 'oftpaySimuladoAnswers';

export type OftpaySimuladoStatus = 'em_andamento' | 'finalizado';

export interface OftpaySimuladoSelection {
  /** Apostila oficial (assunto macro, ex.: Órbita). */
  apostilaTitulo?: string;
  tema?: string;
  capituloTitulo?: string;
  subtema?: string;
  dificuldade: QuestaoDificuldade;
  quantidade: number;
}

export interface OftpaySimuladoResultado {
  total: number;
  acertos: number;
  erros: number;
  percentualAcerto: number;
}

export interface OftpaySimulado {
  id?: string;
  userId: string;
  userEmail?: string;
  title?: string;
  selections: OftpaySimuladoSelection[];
  questionIds: string[];
  status: OftpaySimuladoStatus;
  startedAt?: number;
  finishedAt?: number;
  resultado?: OftpaySimuladoResultado;
}

export type OftpaySimuladoDoc = OftpaySimulado & { id: string };

export interface OftpaySimuladoAnswer {
  id?: string;
  simuladoId: string;
  userId: string;
  questionId: string;
  respostaSelecionada: AlternativaLetra;
  respostaCorreta: AlternativaLetra;
  acertou: boolean;
  tema?: string;
  capituloTitulo?: string;
  subtema?: string;
  dificuldade?: string;
  apostilaTitulo?: string;
  answeredAt?: number;
}

export type OftpaySimuladoAnswerDoc = OftpaySimuladoAnswer & { id: string };

export interface TopicStudyCoverage {
  key: string;
  label: string;
  totalQuestoesPublicadas: number;
  questoesUnicasRespondidas: number;
  percentualCobertura: number;
}

export type StudyCoverageDifficultyFilter = 'todas' | QuestaoDificuldade;

export const STUDY_COVERAGE_DIFFICULTY_FILTERS: StudyCoverageDifficultyFilter[] = [
  'todas',
  'facil',
  'medio',
  'dificil',
];

export const STUDY_COVERAGE_DIFFICULTY_LABEL: Record<StudyCoverageDifficultyFilter, string> = {
  todas: 'Todas',
  facil: 'Fácil',
  medio: 'Médio',
  dificil: 'Difícil',
};

export interface CoverageDifficultyStats {
  totalQuestoesPublicadas: number;
  questoesUnicasRespondidas: number;
  percentualCobertura: number;
}

export type StudyCoverageByDifficulty = Record<
  StudyCoverageDifficultyFilter,
  CoverageDifficultyStats
>;

export interface TopicStudyCoverageDetail {
  key: string;
  label: string;
  byDifficulty: StudyCoverageByDifficulty;
}

export interface SubjectStudyCoverage {
  key: string;
  label: string;
  topics: TopicStudyCoverageDetail[];
  byDifficulty: StudyCoverageByDifficulty;
}

export interface SimuladoSubjectPerformance {
  label: string;
  total: number;
  acertos: number;
  erros: number;
  percentualAcerto: number;
}

export const SIMULADO_STATUS_LABEL: Record<OftpaySimuladoStatus, string> = {
  em_andamento: 'Em andamento',
  finalizado: 'Finalizado',
};

export const DIFICULDADE_LABEL: Record<QuestaoDificuldade, string> = {
  facil: 'Fácil',
  medio: 'Médio',
  dificil: 'Difícil',
};

function pct(acertos: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((acertos / total) * 1000) / 10;
}

function normalizeKey(value: string): string {
  return value.trim().toLowerCase();
}

export function formatSimuladoApostilaLabel(apostilaTitulo: string): string {
  return apostilaTitulo.replace(/\.(cdr|pdf)$/i, '').trim() || 'Sem assunto';
}

function getQuestionApostilaLabel(questao: OftpayQuestaoDoc): string {
  const raw = (questao.fonte?.apostilaTitulo ?? '').trim();
  return raw ? formatSimuladoApostilaLabel(raw) : 'Sem assunto';
}

function getQuestionApostilaKey(questao: OftpayQuestaoDoc): string {
  return normalizeKey(getQuestionApostilaLabel(questao));
}

/** Rótulo principal do assunto para seleção/cobertura. */
export function getSelectionLabel(sel: OftpaySimuladoSelection): string {
  const cap = (sel.capituloTitulo ?? sel.tema ?? sel.subtema ?? '').trim();
  const ap = (sel.apostilaTitulo ?? '').trim();
  if (ap && cap) return `${ap} — ${cap}`;
  if (ap) return ap;
  return cap || 'Assunto';
}

export function matchQuestionToSelection(
  questao: OftpayQuestaoDoc,
  selection: OftpaySimuladoSelection
): boolean {
  if (questao.dificuldade !== selection.dificuldade) return false;

  const apSel = (selection.apostilaTitulo ?? '').trim();
  const capSel = (selection.capituloTitulo ?? '').trim();
  const temaSel = (selection.tema ?? '').trim();
  const subtemaSel = (selection.subtema ?? '').trim();

  if (!apSel && !capSel && !temaSel && !subtemaSel) return false;

  if (apSel && getQuestionApostilaKey(questao) !== normalizeKey(apSel)) return false;

  if (capSel) {
    const qCap = getQuestaoCapituloDisplay(questao).trim();
    if (normalizeKey(qCap) !== normalizeKey(capSel)) return false;
  }

  if (temaSel && normalizeKey(questao.tema) !== normalizeKey(temaSel)) return false;
  if (subtemaSel && normalizeKey(questao.subtema ?? '') !== normalizeKey(subtemaSel)) return false;

  return true;
}

export function countAvailableQuestions(
  publicadas: OftpayQuestaoDoc[],
  selection: OftpaySimuladoSelection,
  excludeIds?: Set<string>
): number {
  return publicadas.filter(
    (q) => matchQuestionToSelection(q, selection) && !(excludeIds?.has(q.id) ?? false)
  ).length;
}

function shuffle<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function buildSimuladoQuestionIds(
  publicadas: OftpayQuestaoDoc[],
  selections: OftpaySimuladoSelection[]
): { questionIds: string[]; warnings: string[] } {
  const used = new Set<string>();
  const questionIds: string[] = [];
  const warnings: string[] = [];

  for (const sel of selections) {
    const label = getSelectionLabel(sel);
    const pool = shuffle(
      publicadas.filter((q) => matchQuestionToSelection(q, sel) && !used.has(q.id))
    );
    const take = Math.min(Math.max(0, sel.quantidade), pool.length);

    if (pool.length < sel.quantidade) {
      warnings.push(
        `Existem apenas ${pool.length} questão(ões) disponíveis para ${label} (${DIFICULDADE_LABEL[sel.dificuldade]}). Pedido: ${sel.quantidade}.`
      );
    }

    for (let i = 0; i < take; i += 1) {
      used.add(pool[i].id);
      questionIds.push(pool[i].id);
    }
  }

  return { questionIds, warnings };
}

export function computeSimuladoResultado(
  questionIds: string[],
  answers: OftpaySimuladoAnswerDoc[]
): OftpaySimuladoResultado {
  const byQuestion = new Map(answers.map((a) => [a.questionId, a]));
  let acertos = 0;
  let erros = 0;

  for (const qid of questionIds) {
    const ans = byQuestion.get(qid);
    if (ans?.acertou) acertos += 1;
    else erros += 1;
  }

  const total = questionIds.length;
  return {
    total,
    acertos,
    erros,
    percentualAcerto: pct(acertos, total),
  };
}

export function computePerformanceBySubject(
  answers: OftpaySimuladoAnswerDoc[]
): SimuladoSubjectPerformance[] {
  const map = new Map<string, { label: string; acertos: number; erros: number }>();

  for (const ans of answers) {
    const label =
      (ans.capituloTitulo ?? '').trim() ||
      (ans.tema ?? '').trim() ||
      (ans.subtema ?? '').trim() ||
      'Sem assunto';
    const key = normalizeKey(label);
    const row = map.get(key) ?? { label, acertos: 0, erros: 0 };
    if (ans.acertou) row.acertos += 1;
    else row.erros += 1;
    map.set(key, row);
  }

  return Array.from(map.values())
    .map((row) => {
      const total = row.acertos + row.erros;
      return {
        label: row.label,
        total,
        acertos: row.acertos,
        erros: row.erros,
        percentualAcerto: pct(row.acertos, total),
      };
    })
    .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'));
}

/** Cobertura = questões únicas respondidas / total publicadas por tópico (lista plana). */
export function computeStudyCoverageByTopic(
  publicadas: OftpayQuestaoDoc[],
  answeredQuestionIds: Set<string>
): TopicStudyCoverage[] {
  return computeStudyCoverageBySubject(publicadas, answeredQuestionIds)
    .flatMap((subject) =>
      subject.topics.map((topic) => {
        const stats = topic.byDifficulty.todas;
        return {
          key: `${subject.key}:${topic.key}`,
          label: `${subject.label} — ${topic.label}`,
          totalQuestoesPublicadas: stats.totalQuestoesPublicadas,
          questoesUnicasRespondidas: stats.questoesUnicasRespondidas,
          percentualCobertura: stats.percentualCobertura,
        };
      })
    )
    .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'));
}

function buildStudyCoverageByDifficulty(
  questions: OftpayQuestaoDoc[],
  answeredQuestionIds: Set<string>
): StudyCoverageByDifficulty {
  const build = (diff: StudyCoverageDifficultyFilter): CoverageDifficultyStats => {
    const filtered =
      diff === 'todas' ? questions : questions.filter((q) => q.dificuldade === diff);
    const total = filtered.length;
    const answered = filtered.filter((q) => answeredQuestionIds.has(q.id)).length;
    return {
      totalQuestoesPublicadas: total,
      questoesUnicasRespondidas: answered,
      percentualCobertura: total > 0 ? pct(answered, total) : 0,
    };
  };

  return {
    todas: build('todas'),
    facil: build('facil'),
    medio: build('medio'),
    dificil: build('dificil'),
  };
}

/** Cobertura agrupada por assunto (apostila) com tópicos mapeados e stats por dificuldade. */
export function computeStudyCoverageBySubject(
  publicadas: OftpayQuestaoDoc[],
  answeredQuestionIds: Set<string>
): SubjectStudyCoverage[] {
  const subjectMap = new Map<
    string,
    {
      label: string;
      questions: OftpayQuestaoDoc[];
      topics: Map<string, { label: string; questions: OftpayQuestaoDoc[] }>;
    }
  >();

  for (const q of publicadas) {
    const subjectLabel = getQuestionApostilaLabel(q);
    const subjectKey = normalizeKey(subjectLabel);
    const topicLabel = getQuestaoCapituloDisplay(q) || q.tema || 'Sem tópico';
    const topicKey = normalizeKey(topicLabel);

    let subject = subjectMap.get(subjectKey);
    if (!subject) {
      subject = { label: subjectLabel, questions: [], topics: new Map() };
    }
    subject.questions.push(q);

    let topic = subject.topics.get(topicKey);
    if (!topic) {
      topic = { label: topicLabel, questions: [] };
    }
    topic.questions.push(q);
    subject.topics.set(topicKey, topic);
    subjectMap.set(subjectKey, subject);
  }

  return Array.from(subjectMap.entries())
    .map(([key, row]) => ({
      key,
      label: row.label,
      byDifficulty: buildStudyCoverageByDifficulty(row.questions, answeredQuestionIds),
      topics: Array.from(row.topics.entries())
        .map(([topicKey, topicRow]) => ({
          key: topicKey,
          label: topicRow.label,
          byDifficulty: buildStudyCoverageByDifficulty(topicRow.questions, answeredQuestionIds),
        }))
        .filter((t) => t.byDifficulty.todas.totalQuestoesPublicadas > 0)
        .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR')),
    }))
    .filter((row) => row.byDifficulty.todas.totalQuestoesPublicadas > 0)
    .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'));
}

export function collectUniqueAnsweredQuestionIds(
  simuladoAnswers: OftpaySimuladoAnswerDoc[],
  attemptQuestionIds: string[]
): Set<string> {
  const ids = new Set<string>();
  for (const a of simuladoAnswers) ids.add(a.questionId);
  for (const id of attemptQuestionIds) ids.add(id);
  return ids;
}

export interface SimuladoTopicOption {
  key: string;
  label: string;
  totalPublicadas: number;
  facil: number;
  medio: number;
  dificil: number;
}

export interface SimuladoSubjectGroup {
  key: string;
  label: string;
  totalPublicadas: number;
  topics: SimuladoTopicOption[];
}

/** Assuntos (apostilas) com tópicos mapeados que possuem questões publicadas. */
export function computeSubjectGroupsFromPublicadas(
  publicadas: OftpayQuestaoDoc[]
): SimuladoSubjectGroup[] {
  const subjectMap = new Map<
    string,
    { label: string; totalPublicadas: number; topics: Map<string, SimuladoTopicOption> }
  >();

  for (const q of publicadas) {
    const subjectLabel = getQuestionApostilaLabel(q);
    const subjectKey = normalizeKey(subjectLabel);
    const topicLabel = getQuestaoCapituloDisplay(q) || q.tema || 'Sem tópico';
    const topicKey = normalizeKey(topicLabel);

    let subject = subjectMap.get(subjectKey);
    if (!subject) {
      subject = {
        label: subjectLabel,
        totalPublicadas: 0,
        topics: new Map<string, SimuladoTopicOption>(),
      };
    }

    let topic = subject.topics.get(topicKey);
    if (!topic) {
      topic = {
        key: topicKey,
        label: topicLabel,
        totalPublicadas: 0,
        facil: 0,
        medio: 0,
        dificil: 0,
      };
    }

    topic.totalPublicadas += 1;
    if (q.dificuldade === 'facil') topic.facil += 1;
    else if (q.dificuldade === 'medio') topic.medio += 1;
    else if (q.dificuldade === 'dificil') topic.dificil += 1;

    subject.topics.set(topicKey, topic);
    subjectMap.set(subjectKey, {
      label: subject.label,
      totalPublicadas: subject.totalPublicadas + 1,
      topics: subject.topics,
    });
  }

  return Array.from(subjectMap.entries())
    .map(([key, row]) => ({
      key,
      label: row.label,
      totalPublicadas: row.totalPublicadas,
      topics: Array.from(row.topics.values()).sort((a, b) =>
        a.label.localeCompare(b.label, 'pt-BR')
      ),
    }))
    .filter((row) => row.totalPublicadas > 0)
    .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'));
}

/** Tópicos/capítulos disponíveis a partir das questões publicadas. */
export function computeTopicOptionsFromPublicadas(
  publicadas: OftpayQuestaoDoc[]
): SimuladoTopicOption[] {
  return computeSubjectGroupsFromPublicadas(publicadas).flatMap((group) => group.topics);
}

export function countAvailableForTopicAndDifficulty(
  publicadas: OftpayQuestaoDoc[],
  capituloTitulo: string,
  dificuldade: QuestaoDificuldade,
  apostilaTitulo?: string
): number {
  return countAvailableQuestions(publicadas, {
    ...(apostilaTitulo?.trim() ? { apostilaTitulo: apostilaTitulo.trim() } : {}),
    capituloTitulo,
    dificuldade,
    quantidade: 1,
  });
}

export function countAvailableForSubjectAndDifficulty(
  publicadas: OftpayQuestaoDoc[],
  apostilaTitulo: string,
  dificuldade: QuestaoDificuldade
): number {
  return countAvailableQuestions(publicadas, { apostilaTitulo, dificuldade, quantidade: 1 });
}

export function createEmptySelection(): OftpaySimuladoSelection {
  return { capituloTitulo: '', dificuldade: 'medio', quantidade: 5 };
}

export function validateSelections(selections: OftpaySimuladoSelection[]): string | null {
  if (selections.length === 0) return 'Adicione pelo menos um assunto ao simulado.';
  for (const sel of selections) {
    const label = getSelectionLabel(sel);
    if (!label || label === 'Assunto') return 'Cada seleção precisa de um assunto ou tópico.';
    if (!sel.quantidade || sel.quantidade < 1) {
      return 'Quantidade de questões deve ser pelo menos 1.';
    }
  }
  return null;
}

export function buildDefaultSimuladoTitle(selections: OftpaySimuladoSelection[]): string {
  const labels = selections.map(getSelectionLabel).filter(Boolean);
  if (labels.length === 0) return 'Simulado personalizado';
  if (labels.length === 1) return `Simulado — ${labels[0]}`;
  if (labels.length === 2) return `Simulado — ${labels[0]} e ${labels[1]}`;
  return `Simulado — ${labels[0]} +${labels.length - 1} assuntos`;
}
