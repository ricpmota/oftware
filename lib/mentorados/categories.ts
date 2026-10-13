import type { MentorCategory, MentorCategoryCounts } from '@/types/mentorContent';
import { MENTOR_CATEGORIES } from '@/types/mentorContent';

export type MentorCategoryMeta = {
  id: MentorCategory;
  emoji: string;
  name: string;
  shortName: string;
  description: string;
};

export const MENTOR_CATEGORY_META: Record<MentorCategory, MentorCategoryMeta> = {
  medicacao: {
    id: 'medicacao',
    emoji: '💊',
    name: 'Medicação',
    shortName: 'Medicação',
    description: 'Conteúdos sobre medicamentos, conservação, protocolos e orientações.',
  },
  aplicacao: {
    id: 'aplicacao',
    emoji: '💉',
    name: 'Aplicação',
    shortName: 'Aplicação',
    description: 'Técnicas, preparo, materiais, locais de aplicação e boas práticas.',
  },
  envio_medicacao: {
    id: 'envio_medicacao',
    emoji: '📦',
    name: 'Envio de medicação',
    shortName: 'Envio',
    description: 'Embalagem, conservação, logística, envio e recebimento.',
  },
  atendimento: {
    id: 'atendimento',
    emoji: '🩺',
    name: 'Atendimento',
    shortName: 'Atendimento',
    description: 'Consulta, acompanhamento, comunicação e rotina de atendimento.',
  },
  sistema: {
    id: 'sistema',
    emoji: '💻',
    name: 'Usabilidade do Sistema',
    shortName: 'Sistema Oftware',
    description: 'Funcionalidades e utilização da plataforma Oftware.',
  },
  novidades: {
    id: 'novidades',
    emoji: '✨',
    name: 'Novidades',
    shortName: 'Novidades',
    description: 'Atualizações, novos recursos e novos processos.',
  },
  configuracoes: {
    id: 'configuracoes',
    emoji: '⚙️',
    name: 'Configurações',
    shortName: 'Configurações',
    description: 'Configurações da conta, perfil, integrações e recursos da plataforma.',
  },
};

export const MENTOR_CATEGORY_LIST: MentorCategoryMeta[] = MENTOR_CATEGORIES.map(
  (id) => MENTOR_CATEGORY_META[id]
);

export function isMentorCategory(value: unknown): value is MentorCategory {
  return typeof value === 'string' && (MENTOR_CATEGORIES as readonly string[]).includes(value);
}

export function emptyMentorCategoryCounts(): MentorCategoryCounts {
  return MENTOR_CATEGORIES.reduce((acc, id) => {
    acc[id] = 0;
    return acc;
  }, {} as MentorCategoryCounts);
}
