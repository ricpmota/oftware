import type { OftpayQuestaoMatchable } from '@/types/oftpayQuestaoCatalog';
import {
  computeSubjectGroupsFromPublicadas,
  countFromSubjectGroup,
  countFromTopicOption,
  type OftpaySimuladoSelection,
  type SimuladoSubjectGroup,
} from '@/types/oftpaySimulados';
import type { QuestaoDificuldade } from '@/types/oftpayQuestoes';

export interface TopicRowConfig {
  key: string;
  label: string;
  totalPublicadas: number;
  facil: number;
  medio: number;
  dificil: number;
  included: boolean;
  dificuldade: QuestaoDificuldade;
  quantidade: number;
}

export interface SubjectGroupConfig {
  key: string;
  label: string;
  totalPublicadas: number;
  topics: TopicRowConfig[];
  expanded: boolean;
  included: boolean;
  dificuldade: QuestaoDificuldade;
  quantidade: number;
}

export function buildSubjectGroupConfigs(
  publicadas: OftpayQuestaoMatchable[]
): SubjectGroupConfig[] {
  return computeSubjectGroupsFromPublicadas(publicadas).map((group) => ({
    key: group.key,
    label: group.label,
    totalPublicadas: group.totalPublicadas,
    expanded: false,
    included: false,
    dificuldade: 'medio' as QuestaoDificuldade,
    quantidade: Math.min(5, countFromSubjectGroup(group, 'medio') || group.totalPublicadas || 1),
    topics: group.topics.map((topic) => ({
      key: topic.key,
      label: topic.label,
      totalPublicadas: topic.totalPublicadas,
      facil: topic.facil,
      medio: topic.medio,
      dificil: topic.dificil,
      included: false,
      dificuldade: 'medio' as QuestaoDificuldade,
      quantidade: Math.min(5, topic.medio || topic.totalPublicadas || 1),
    })),
  }));
}

/** Disponíveis do assunto na dificuldade atual (soma dos tópicos pré-agregados). */
export function subjectDisponiveisFromConfig(
  group: SubjectGroupConfig,
  dificuldade: QuestaoDificuldade = group.dificuldade
): number {
  return group.topics.reduce((sum, t) => sum + (t[dificuldade] ?? 0), 0);
}

export function topicDisponiveisFromConfig(
  topic: TopicRowConfig,
  dificuldade: QuestaoDificuldade = topic.dificuldade
): number {
  return countFromTopicOption(topic, dificuldade);
}

export function selectionsFromSubjectGroups(groups: SubjectGroupConfig[]): OftpaySimuladoSelection[] {
  const selections: OftpaySimuladoSelection[] = [];
  for (const group of groups) {
    if (group.included) {
      if (group.quantidade <= 0) continue;
      selections.push({
        apostilaTitulo: group.label,
        dificuldade: group.dificuldade,
        quantidade: group.quantidade,
      });
      continue;
    }
    for (const topic of group.topics) {
      if (!topic.included || topic.quantidade <= 0) continue;
      selections.push({
        apostilaTitulo: group.label,
        capituloTitulo: topic.label,
        dificuldade: topic.dificuldade,
        quantidade: topic.quantidade,
      });
    }
  }
  return selections;
}

export function countSubjectGroupSelections(groups: SubjectGroupConfig[]): number {
  let count = 0;
  for (const group of groups) {
    if (group.included) {
      if (group.quantidade > 0) count += 1;
      continue;
    }
    count += group.topics.filter((t) => t.included && t.quantidade > 0).length;
  }
  return count;
}

export function totalQuestionsFromSubjectGroups(groups: SubjectGroupConfig[]): number {
  return selectionsFromSubjectGroups(groups).reduce((sum, sel) => sum + sel.quantidade, 0);
}

export function maxSimuladoQuantidade(disponiveis: number): number {
  return Math.max(0, disponiveis);
}

export function parseQuantidadeInput(raw: string, max: number): number {
  if (raw.trim() === '') return 0;
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(max, n);
}

export type { SimuladoSubjectGroup };
export { countFromSubjectGroup, countFromTopicOption };
