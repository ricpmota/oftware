import {
  Calendar,
  DollarSign,
  Kanban,
  LayoutDashboard,
  Mail,
  Stethoscope,
  Users,
  type LucideIcon,
} from 'lucide-react';

/** Menus do shell MetaPsi (sem Meu Perfil — Perfil fica no footer, como MetaNutri). */
export type MetaPsiShellNavId =
  | 'home'
  | 'leads'
  | 'medicos'
  | 'pacientes'
  | 'financeiro'
  | 'calendario'
  | 'comunicacao';

export type MetaPsiShellNavItem = {
  id: MetaPsiShellNavId;
  label: string;
  /** Nome Lucide canônico — usado em testes de paridade. */
  iconName:
    | 'LayoutDashboard'
    | 'Kanban'
    | 'Stethoscope'
    | 'Users'
    | 'DollarSign'
    | 'Calendar'
    | 'Mail';
  Icon: LucideIcon;
};

/** Endpoint de branding da organização (paridade MetaNutri / MetaPersonal). */
export const METAPSI_SHELL_BRANDING_ENDPOINT = '/api/metapsi/organization-branding';

/**
 * Nav principal do sidebar — hierarquia Nutri (Dashboard → Leads → Médicos…).
 * Início usa LayoutDashboard (não Home). Comunicação usa Mail (não MessageSquare).
 */
export const METAPSI_SIDEBAR_NAV: readonly MetaPsiShellNavItem[] = [
  { id: 'home', label: 'Início', iconName: 'LayoutDashboard', Icon: LayoutDashboard },
  { id: 'leads', label: 'Leads', iconName: 'Kanban', Icon: Kanban },
  { id: 'medicos', label: 'Médicos', iconName: 'Stethoscope', Icon: Stethoscope },
  { id: 'pacientes', label: 'Pacientes', iconName: 'Users', Icon: Users },
  { id: 'financeiro', label: 'Financeiro', iconName: 'DollarSign', Icon: DollarSign },
  { id: 'calendario', label: 'Calendário', iconName: 'Calendar', Icon: Calendar },
  { id: 'comunicacao', label: 'Comunicação', iconName: 'Mail', Icon: Mail },
] as const;

/**
 * Bottom nav mobile — paridade Nutri (Início / Leads / Pacientes / Comunicação).
 * Chrome visual = Nutri (active green, tamanho ícone w-4 h-4).
 */
export const METAPSI_BOTTOM_NAV: readonly MetaPsiShellNavItem[] = [
  { id: 'home', label: 'Início', iconName: 'LayoutDashboard', Icon: LayoutDashboard },
  { id: 'leads', label: 'Leads', iconName: 'Kanban', Icon: Kanban },
  { id: 'pacientes', label: 'Pacientes', iconName: 'Users', Icon: Users },
  { id: 'comunicacao', label: 'Comunicação', iconName: 'Mail', Icon: Mail },
] as const;

/** Ícones proibidos no shell (auditoria 6.2 / correção 6.3.1). */
export const METAPSI_SHELL_FORBIDDEN_ICON_NAMES = ['Home', 'MessageSquare'] as const;
