export type LembreteTag = 'Exames' | 'Consulta' | 'Renovação' | 'Envio' | 'Ligação' | 'Cobrança';

export const LEMBRETE_TAGS: LembreteTag[] = [
  'Exames',
  'Consulta',
  'Renovação',
  'Envio',
  'Ligação',
  'Cobrança',
];

export const LEMBRETE_TAG_CONFIG: Record<LembreteTag, { icon: string; color: string; bgLight: string; bgDark: string; textLight: string; textDark: string }> = {
  Exames:    { icon: 'FlaskConical', color: '#8b5cf6', bgLight: 'bg-violet-100',  bgDark: 'bg-violet-900/30',  textLight: 'text-violet-700',  textDark: 'text-violet-300' },
  Consulta:  { icon: 'Stethoscope',  color: '#2563eb', bgLight: 'bg-blue-100',    bgDark: 'bg-blue-900/30',    textLight: 'text-blue-700',    textDark: 'text-blue-300' },
  Renovação: { icon: 'RefreshCw',    color: '#059669', bgLight: 'bg-emerald-100', bgDark: 'bg-emerald-900/30', textLight: 'text-emerald-700', textDark: 'text-emerald-300' },
  Envio:     { icon: 'Send',         color: '#0891b2', bgLight: 'bg-cyan-100',    bgDark: 'bg-cyan-900/30',    textLight: 'text-cyan-700',    textDark: 'text-cyan-300' },
  Ligação:   { icon: 'Phone',        color: '#d97706', bgLight: 'bg-amber-100',   bgDark: 'bg-amber-900/30',   textLight: 'text-amber-700',   textDark: 'text-amber-300' },
  Cobrança:  { icon: 'DollarSign',   color: '#dc2626', bgLight: 'bg-red-100',     bgDark: 'bg-red-900/30',     textLight: 'text-red-700',     textDark: 'text-red-300' },
};

export interface Lembrete {
  id: string;
  /** Médico (metaadmin). */
  medicoId?: string;
  /** Nutricionista (metanutri). */
  nutricionistaId?: string;
  pacienteId: string;
  pacienteNome: string;
  data: string; // YYYY-MM-DD
  texto: string;
  tag: LembreteTag;
  criadoEm: Date;
  concluido?: boolean;
}
