import type { LucideIcon } from 'lucide-react';
import {
  Calendar,
  DollarSign,
  Dumbbell,
  History,
  LayoutDashboard,
  Mail,
  MessageCircle,
  Stethoscope,
  Kanban,
  Users,
} from 'lucide-react';

/** Menus do shell /metapersonal. Mantido local para não acoplar a page.v2. */
export type MetapersonalShellMenuId =
  | 'home'
  | 'leads'
  | 'medicos'
  | 'pacientes'
  | 'treinos'
  | 'historico'
  | 'financeiro'
  | 'calendario'
  | 'meu-perfil'
  | 'comunicacao';

export type MetapersonalShellNavId = MetapersonalShellMenuId | 'whatsapp';

export const METAPERSONAL_SHELL_MENU_LABELS: Record<MetapersonalShellMenuId, string> = {
  home: 'Dashboard',
  leads: 'Leads',
  medicos: 'Médicos',
  pacientes: 'Pacientes',
  treinos: 'Treinos',
  historico: 'Histórico',
  financeiro: 'Financeiro',
  calendario: 'Calendário',
  comunicacao: 'Comunicação',
  'meu-perfil': 'Meu Perfil',
};

export const METAPERSONAL_SHELL_NAV_ITEMS: {
  id: MetapersonalShellNavId;
  label: string;
  Icon: LucideIcon;
}[] = [
  { id: 'home', label: 'Dashboard', Icon: LayoutDashboard },
  { id: 'leads', label: 'Leads', Icon: Kanban },
  { id: 'medicos', label: 'Médicos', Icon: Stethoscope },
  { id: 'pacientes', label: 'Pacientes', Icon: Users },
  { id: 'treinos', label: 'Treinos', Icon: Dumbbell },
  { id: 'historico', label: 'Histórico', Icon: History },
  { id: 'financeiro', label: 'Financeiro', Icon: DollarSign },
  { id: 'calendario', label: 'Calendário', Icon: Calendar },
  { id: 'comunicacao', label: 'Comunicação', Icon: Mail },
  { id: 'whatsapp', label: 'WhatsApp', Icon: MessageCircle },
];

export function metapersonalShellHeaderTitle(
  menu: MetapersonalShellMenuId,
  perfilAba?: string,
): string {
  if (menu === 'meu-perfil' && perfilAba === 'whatsapp') return 'WhatsApp';
  return METAPERSONAL_SHELL_MENU_LABELS[menu];
}

export function metapersonalShellFirstName(name?: string | null): string {
  const trimmed = (name || '').trim();
  if (!trimmed) return '';
  return trimmed.split(/\s+/)[0] || '';
}
