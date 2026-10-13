export type LembreteTag =
  // Metaadmin (médico)
  | 'Exames'
  | 'Consulta'
  | 'Renovação'
  | 'Envio'
  | 'Ligação'
  | 'Cobrança'
  // Metanutri
  | 'Nova receita'
  | 'Check-In'
  // Metapersonal
  | 'Novo Treino'
  | 'Treino'
  | 'Aula';

/** Tags do calendário do médico (/metaadmin). */
export const LEMBRETE_TAGS: LembreteTag[] = [
  'Exames',
  'Consulta',
  'Renovação',
  'Envio',
  'Ligação',
  'Cobrança',
];

/** Tags do calendário do nutricionista (/metanutri). */
export const LEMBRETE_TAGS_NUTRI: LembreteTag[] = [
  'Nova receita',
  'Consulta',
  'Cobrança',
  'Ligação',
  'Check-In',
];

/** Tags do calendário do personal trainer (/metapersonal). */
export const LEMBRETE_TAGS_PERSONAL: LembreteTag[] = [
  'Novo Treino',
  'Consulta',
  'Treino',
  'Cobrança',
  'Ligação',
  'Aula',
];

type LembreteTagVisual = {
  icon: string;
  color: string;
  bgLight: string;
  bgDark: string;
  textLight: string;
  textDark: string;
};

export const LEMBRETE_TAG_CONFIG: Record<LembreteTag, LembreteTagVisual> = {
  Exames: {
    icon: 'FlaskConical',
    color: '#8b5cf6',
    bgLight: 'bg-violet-100',
    bgDark: 'bg-violet-900/30',
    textLight: 'text-violet-700',
    textDark: 'text-violet-300',
  },
  Consulta: {
    icon: 'Stethoscope',
    color: '#2563eb',
    bgLight: 'bg-blue-100',
    bgDark: 'bg-blue-900/30',
    textLight: 'text-blue-700',
    textDark: 'text-blue-300',
  },
  Renovação: {
    icon: 'RefreshCw',
    color: '#059669',
    bgLight: 'bg-emerald-100',
    bgDark: 'bg-emerald-900/30',
    textLight: 'text-emerald-700',
    textDark: 'text-emerald-300',
  },
  Envio: {
    icon: 'Send',
    color: '#0891b2',
    bgLight: 'bg-cyan-100',
    bgDark: 'bg-cyan-900/30',
    textLight: 'text-cyan-700',
    textDark: 'text-cyan-300',
  },
  Ligação: {
    icon: 'Phone',
    color: '#d97706',
    bgLight: 'bg-amber-100',
    bgDark: 'bg-amber-900/30',
    textLight: 'text-amber-700',
    textDark: 'text-amber-300',
  },
  Cobrança: {
    icon: 'DollarSign',
    color: '#dc2626',
    bgLight: 'bg-red-100',
    bgDark: 'bg-red-900/30',
    textLight: 'text-red-700',
    textDark: 'text-red-300',
  },
  'Nova receita': {
    icon: 'UtensilsCrossed',
    color: '#059669',
    bgLight: 'bg-emerald-100',
    bgDark: 'bg-emerald-900/30',
    textLight: 'text-emerald-700',
    textDark: 'text-emerald-300',
  },
  'Check-In': {
    icon: 'ClipboardCheck',
    color: '#7c3aed',
    bgLight: 'bg-violet-100',
    bgDark: 'bg-violet-900/30',
    textLight: 'text-violet-700',
    textDark: 'text-violet-300',
  },
  'Novo Treino': {
    icon: 'Dumbbell',
    color: '#db2777',
    bgLight: 'bg-pink-100',
    bgDark: 'bg-pink-900/30',
    textLight: 'text-pink-700',
    textDark: 'text-pink-300',
  },
  Treino: {
    icon: 'Dumbbell',
    color: '#9333ea',
    bgLight: 'bg-purple-100',
    bgDark: 'bg-purple-900/30',
    textLight: 'text-purple-700',
    textDark: 'text-purple-300',
  },
  Aula: {
    icon: 'BookOpen',
    color: '#0284c7',
    bgLight: 'bg-sky-100',
    bgDark: 'bg-sky-900/30',
    textLight: 'text-sky-700',
    textDark: 'text-sky-300',
  },
};

const LEMBRETE_TAG_FALLBACK: LembreteTagVisual = {
  icon: 'Bell',
  color: '#6b7280',
  bgLight: 'bg-gray-100',
  bgDark: 'bg-gray-800/40',
  textLight: 'text-gray-700',
  textDark: 'text-gray-300',
};

/** Resolve visual config even for legacy/unknown tags stored in Firestore. */
export function getLembreteTagConfig(tag: string | undefined | null): LembreteTagVisual {
  if (!tag) return LEMBRETE_TAG_FALLBACK;
  return LEMBRETE_TAG_CONFIG[tag as LembreteTag] ?? LEMBRETE_TAG_FALLBACK;
}

/** Quando o médico quer receber o WhatsApp do lembrete do calendário. */
export type LembreteAvisoWhatsApp =
  | 'disabled'
  | 'no_horario'
  | '30_min_antes'
  | '1_hora_antes';

export type LembreteWhatsappNotifyStatus = 'pending' | 'sent' | 'failed' | 'skipped';

export interface Lembrete {
  id: string;
  /** Médico (metaadmin). */
  medicoId?: string;
  /** Nutricionista (metanutri). */
  nutricionistaId?: string;
  /** Personal trainer (metapersonal). */
  personalTrainerId?: string;
  pacienteId: string;
  pacienteNome: string;
  data: string; // YYYY-MM-DD
  /** Horário do compromisso (HH:mm, Brasília). */
  horario?: string;
  /**
   * Quando enviar o aviso no WhatsApp.
   * `disabled` = sem notificação automática.
   */
  avisoWhatsApp?: LembreteAvisoWhatsApp;
  /**
   * Telefone que recebe o aviso (nacional ou canônico legado).
   * Se omitido, o motor usa o número da sessão WhatsApp conectada.
   */
  telefoneAviso?: string;
  /** DDI do aviso. Ausente = legado BR em `telefoneAviso`. */
  telefoneAvisoDdi?: string;
  /** ISO-3166 alpha-2 do aviso. */
  telefoneAvisoPais?: string;
  /**
   * Se true, o mesmo aviso WhatsApp também é enviado ao telefone
   * cadastrado do paciente (`dadosIdentificacao.telefone`).
   */
  notificarPaciente?: boolean;
  /**
   * `paciente` = aviso ao paciente (consulta).
   * Omitido = Canal Chat → telefoneAviso (comportamento do calendário).
   * Médico consulta 30 min: Canal Chat → paciente.
   * Nutri consulta 30 min: WhatsApp da nutricionista → paciente.
   */
  whatsappNotifyTarget?: 'profissional' | 'paciente';
  /** Instantâneo UTC em que o cron deve disparar o WhatsApp. */
  notificarEm?: Date;
  whatsappNotifyStatus?: LembreteWhatsappNotifyStatus;
  whatsappNotificadoEm?: Date;
  whatsappNotifyError?: string;
  texto: string;
  tag: LembreteTag;
  /**
   * Origem do registro. Ex.: `nutri_consulta` = alerta automático da consulta
   * agendada pelo link público (não é um lembrete criado à mão).
   */
  origem?: string;
  criadoEm: Date;
  concluido?: boolean;
  /** Série recorrente: instâncias geradas compartilham o mesmo id. */
  recorrenciaId?: string;
  recorrenciaIntervalo?: number;
  recorrenciaUnidade?: 'semanas' | 'meses';
  /** Quantidade de avisos da série (ex.: 3x). */
  recorrenciaQuantidade?: number;
  /** Data-limite da série (YYYY-MM-DD). */
  recorrenciaDataFinal?: string;
}
