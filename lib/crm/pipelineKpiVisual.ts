import {
  Activity,
  BadgeCheck,
  Brain,
  Calendar,
  CalendarCheck,
  CircleDashed,
  Dumbbell,
  Layers,
  type LucideIcon,
  Send,
  UserRound,
  UtensilsCrossed,
  XCircle,
} from 'lucide-react';

export type PipelineKpiVisual = {
  Icon: LucideIcon;
  containerClass: string;
  iconClass: string;
};

const NEUTRAL: PipelineKpiVisual = {
  Icon: Layers,
  containerClass: 'bg-slate-100 dark:bg-white/10',
  iconClass: 'text-slate-600 dark:text-slate-300',
};

const BY_STAGE: Record<string, PipelineKpiVisual> = {
  nao_qualificado: {
    Icon: CircleDashed,
    containerClass: 'bg-gray-100 dark:bg-white/10',
    iconClass: 'text-gray-600 dark:text-gray-300',
  },
  nao_atendido: {
    Icon: UserRound,
    containerClass: 'bg-gray-100 dark:bg-white/10',
    iconClass: 'text-gray-600 dark:text-gray-300',
  },
  enviado_contato: {
    Icon: Calendar,
    containerClass: 'bg-amber-50 dark:bg-amber-500/15',
    iconClass: 'text-amber-700 dark:text-amber-300',
  },
  consultas_agendadas: {
    Icon: Calendar,
    containerClass: 'bg-amber-50 dark:bg-amber-500/15',
    iconClass: 'text-amber-700 dark:text-amber-300',
  },
  contato_feito: {
    Icon: CalendarCheck,
    containerClass: 'bg-orange-50 dark:bg-orange-500/15',
    iconClass: 'text-orange-700 dark:text-orange-300',
  },
  tratamento_enviado: {
    Icon: Send,
    containerClass: 'bg-violet-50 dark:bg-violet-500/15',
    iconClass: 'text-violet-700 dark:text-violet-300',
  },
  em_tratamento: {
    Icon: Activity,
    containerClass: 'bg-emerald-50 dark:bg-emerald-500/15',
    iconClass: 'text-emerald-700 dark:text-emerald-300',
  },
  cardapio_em_execucao: {
    Icon: UtensilsCrossed,
    containerClass: 'bg-emerald-50 dark:bg-emerald-500/15',
    iconClass: 'text-emerald-700 dark:text-emerald-300',
  },
  treino_em_execucao: {
    Icon: Dumbbell,
    containerClass: 'bg-emerald-50 dark:bg-emerald-500/15',
    iconClass: 'text-emerald-700 dark:text-emerald-300',
  },
  acompanhamento_em_curso: {
    Icon: Brain,
    containerClass: 'bg-emerald-50 dark:bg-emerald-500/15',
    iconClass: 'text-emerald-700 dark:text-emerald-300',
  },
  concluido: {
    Icon: CalendarCheck,
    containerClass: 'bg-blue-50 dark:bg-blue-500/15',
    iconClass: 'text-blue-700 dark:text-blue-300',
  },
  tratamento_concluido: {
    Icon: BadgeCheck,
    containerClass: 'bg-violet-50 dark:bg-violet-500/15',
    iconClass: 'text-violet-700 dark:text-violet-300',
  },
  excluido: {
    Icon: XCircle,
    containerClass: 'bg-rose-50 dark:bg-rose-500/15',
    iconClass: 'text-rose-700 dark:text-rose-300',
  },
  cardapio_nao_realizado: {
    Icon: XCircle,
    containerClass: 'bg-rose-50 dark:bg-rose-500/15',
    iconClass: 'text-rose-700 dark:text-rose-300',
  },
  treino_nao_realizado: {
    Icon: XCircle,
    containerClass: 'bg-rose-50 dark:bg-rose-500/15',
    iconClass: 'text-rose-700 dark:text-rose-300',
  },
  acompanhamento_nao_realizado: {
    Icon: XCircle,
    containerClass: 'bg-rose-50 dark:bg-rose-500/15',
    iconClass: 'text-rose-700 dark:text-rose-300',
  },
};

export function pipelineStageKpiVisual(stageKey: string): PipelineKpiVisual {
  return BY_STAGE[stageKey] ?? NEUTRAL;
}
