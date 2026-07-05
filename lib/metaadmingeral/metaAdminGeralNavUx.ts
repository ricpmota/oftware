import type { LucideIcon } from 'lucide-react';
import {
  Activity,
  BookOpen,
  Bot,
  Brain,
  Building2,
  Calendar,
  CreditCard,
  Dumbbell,
  FileText,
  FlaskConical,
  Globe,
  Image,
  LayoutDashboard,
  Mail,
  Megaphone,
  MessageCircle,
  MessageSquare,
  Palette,
  Pill,
  Settings,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Target,
  TrendingUp,
  Users,
  UtensilsCrossed,
  Wrench,
} from 'lucide-react';
import {
  listOrganizations,
  METODO_ORGANIZATION,
  type OrganizationDefinition,
} from '@/lib/organization/organizationRegistry';

/** Contexto de navegação — Plataforma vs Organização ativa. */
export type MetaAdminGeralNavContext = 'platform' | 'organization';

export type MetaAdminGeralNavLeaf = {
  id: string;
  label: string;
  icon?: LucideIcon;
  href?: string;
  /** Item visível mas ainda sem página dedicada (Etapa 12+). */
  comingSoon?: boolean;
};

export type MetaAdminGeralNavDepartment = {
  id: string;
  label: string;
  icon: LucideIcon;
  items: MetaAdminGeralNavLeaf[];
};

export type MetaAdminGeralPlatformTopItem = {
  id: string;
  label: string;
  icon: LucideIcon;
  href?: string;
};

/** IDs de menu da camada Plataforma (para inferir contexto). */
export const META_ADMIN_GERAL_PLATFORM_MENU_IDS = new Set([
  'dashboard-oftware',
  'organizacoes',
  'organizacao-metodo',
  'oftpay',
  'meta-business',
  'chatinicial',
  'cores-do-sistema',
  'exames-laboratoriais',
  'protocolos-prescricao',
  'bio-impedancia',
  'oi-validation',
  'platform-patrimonio',
  'platform-health',
  'leads-whitelabel',
]);

export const META_ADMIN_GERAL_PLATFORM_TOP: MetaAdminGeralPlatformTopItem[] = [
  { id: 'dashboard-oftware', label: 'Dashboard da Plataforma', icon: LayoutDashboard },
  { id: 'platform-organizacoes', label: 'Organizações', icon: Building2 },
  { id: 'platform-produtos', label: 'Produtos da Plataforma', icon: BookOpen },
  { id: 'platform-patrimonio', label: 'Patrimônio Global', icon: FlaskConical },
  { id: 'platform-ferramentas', label: 'Ferramentas', icon: Wrench },
  { id: 'platform-config-global', label: 'Configurações Globais', icon: Settings },
];

export const META_ADMIN_GERAL_PLATFORM_DEPARTMENTS: MetaAdminGeralNavDepartment[] = [
  {
    id: 'platform-organizacoes',
    label: 'Organizações',
    icon: Building2,
    items: [
      { id: 'organizacoes', label: 'Organizações ativas', icon: Building2 },
      { id: 'leads-whitelabel', label: 'Leads White Label', icon: Sparkles },
    ],
  },
  {
    id: 'platform-produtos',
    label: 'Produtos da Plataforma',
    icon: BookOpen,
    items: [
      { id: 'oftpay', label: 'OftPay', icon: BookOpen },
      { id: 'meta-business', label: 'Meta Business', icon: MessageCircle },
    ],
  },
  {
    id: 'platform-patrimonio',
    label: 'Patrimônio Global',
    icon: FlaskConical,
    items: [
      { id: 'chatinicial', label: 'Chat Inicial', icon: MessageSquare, href: '/metaadmingeral/chatinicial' },
      { id: 'exames-laboratoriais', label: 'Exames Laboratoriais', icon: FlaskConical },
      { id: 'protocolos-prescricao', label: 'Prescrições / Protocolos', icon: Pill },
      { id: 'bio-impedancia', label: 'Bio Impedância', icon: Activity },
      {
        id: 'oi-validation',
        label: 'OI Validation',
        icon: Brain,
        href: '/metaadmingeral/oi-validation',
      },
    ],
  },
  {
    id: 'platform-ferramentas',
    label: 'Ferramentas',
    icon: Wrench,
    items: [{ id: 'platform-health', label: 'Saúde da Plataforma', icon: ShieldCheck }],
  },
  {
    id: 'platform-config-global',
    label: 'Configurações Globais',
    icon: Settings,
    items: [{ id: 'cores-do-sistema', label: 'Cores do Sistema', icon: Palette }],
  },
];

/** Template oficial — 9 departamentos da Organização Ativa. */
export const META_ADMIN_GERAL_ORG_TOP: MetaAdminGeralPlatformTopItem[] = [
  { id: 'org-dashboard', label: 'Dashboard da Organização', icon: LayoutDashboard },
  { id: 'org-identidade', label: 'Identidade', icon: Palette },
  { id: 'org-equipe', label: 'Equipe', icon: Users },
  { id: 'org-pacientes', label: 'Pacientes', icon: Target },
  { id: 'org-marketing', label: 'Marketing', icon: Megaphone },
  { id: 'org-jornada', label: 'Jornada', icon: Calendar },
  { id: 'org-negocio', label: 'Negócio', icon: CreditCard },
  { id: 'org-ia', label: 'IA', icon: Brain },
  { id: 'org-administracao', label: 'Administração', icon: Settings },
];

export const META_ADMIN_GERAL_ORG_DEPARTMENTS: MetaAdminGeralNavDepartment[] = [
  {
    id: 'org-identidade',
    label: 'Identidade',
    icon: Palette,
    items: [
      { id: 'organizacao-metodo-branding', label: 'Geral / Marca da Organização', icon: Palette },
      { id: 'org-marca-logos', label: 'Logos', icon: Image, comingSoon: true },
      { id: 'org-marca-cores', label: 'Cores', icon: Palette, comingSoon: true },
      { id: 'org-marca-dominio', label: 'Domínio', icon: Globe, comingSoon: true },
      { id: 'org-marca-seo', label: 'SEO / Open Graph', icon: Globe, comingSoon: true },
      { id: 'org-identidade-pdfs', label: 'PDFs', icon: FileText, comingSoon: true },
      { id: 'emails', label: 'E-mails', icon: Mail },
    ],
  },
  {
    id: 'org-equipe',
    label: 'Equipe',
    icon: Users,
    items: [
      { id: 'medicos', label: 'Médicos', icon: Stethoscope },
      { id: 'nutricionistas', label: 'Nutricionistas', icon: UtensilsCrossed },
      { id: 'personal_trainers', label: 'Personais', icon: Dumbbell },
    ],
  },
  {
    id: 'org-pacientes',
    label: 'Pacientes',
    icon: Target,
    items: [
      { id: 'pacientes', label: 'Pacientes', icon: Users },
      { id: 'leads', label: 'Leads', icon: Target },
      { id: 'nps', label: 'NPS', icon: TrendingUp },
    ],
  },
  {
    id: 'org-marketing',
    label: 'Marketing',
    icon: Megaphone,
    items: [
      { id: 'org-marketing-landing', label: 'Landing', icon: Globe, comingSoon: true },
      { id: 'org-marketing-instagram', label: 'Instagram', icon: MessageCircle, comingSoon: true },
      { id: 'org-marketing-campanhas', label: 'Campanhas', icon: Megaphone, comingSoon: true },
      { id: 'banners', label: 'Banners', icon: Image },
    ],
  },
  {
    id: 'org-jornada',
    label: 'Jornada',
    icon: Calendar,
    items: [
      { id: 'calendario', label: 'Aplicações', icon: Calendar },
      { id: 'org-jornada-conclusoes', label: 'Conclusões', icon: FileText, comingSoon: true },
      { id: 'relatorios', label: 'Relatórios do paciente', icon: FileText },
      { id: 'org-jornada-indicacoes', label: 'Indicações', icon: Users, comingSoon: true },
      { id: 'org-jornada-renovacao', label: 'Renovação', icon: Calendar, comingSoon: true },
      { id: 'contratos', label: 'Contratos', icon: FileText },
    ],
  },
  {
    id: 'org-negocio',
    label: 'Negócio',
    icon: CreditCard,
    items: [
      { id: 'org-financeiro-overview', label: 'Financeiro', icon: CreditCard },
      { id: 'tirzepatida', label: 'Produtos / Tirzepatida', icon: Pill },
      { id: 'org-negocio-planos', label: 'Planos', icon: CreditCard, comingSoon: true },
      { id: 'org-negocio-assinaturas', label: 'Assinaturas', icon: CreditCard, comingSoon: true },
      { id: 'org-negocio-comissoes', label: 'Comissões', icon: CreditCard, comingSoon: true },
    ],
  },
  {
    id: 'org-ia',
    label: 'IA',
    icon: Brain,
    items: [
      { id: 'org-ia-chat', label: 'Chat', icon: Bot, comingSoon: true },
      { id: 'org-ia-prompts', label: 'Prompts', icon: MessageSquare, comingSoon: true },
      { id: 'org-ia-conhecimento', label: 'Base de Conhecimento', icon: BookOpen, comingSoon: true },
      { id: 'org-ia-automacoes', label: 'Automações', icon: Sparkles, comingSoon: true },
    ],
  },
  {
    id: 'org-administracao',
    label: 'Administração',
    icon: Settings,
    items: [
      { id: 'organizacao-metodo', label: 'Dados da Organização', icon: Building2 },
      { id: 'org-admin-usuarios', label: 'Usuários', icon: Users, comingSoon: true },
      { id: 'org-admin-permissoes', label: 'Permissões', icon: ShieldCheck, comingSoon: true },
      { id: 'org-config-integracoes', label: 'Integrações', icon: Settings, comingSoon: true },
      { id: 'org-admin-seguranca', label: 'Segurança', icon: ShieldCheck, comingSoon: true },
      { id: 'org-admin-logs', label: 'Logs', icon: FileText, comingSoon: true },
      { id: 'org-admin-config-gerais', label: 'Configurações Gerais', icon: Settings, comingSoon: true },
    ],
  },
];

/** Aliases → menuId legado (compatibilidade ?menu= e switch existente). */
export const META_ADMIN_GERAL_MENU_ALIASES: Record<string, string> = {
  estatisticas: 'org-dashboard',
  /** Deptos renomeados (template oficial) — expandir nav se usado como ?menu= */
  'org-marca': 'organizacao-metodo-branding',
  'org-operacao': 'calendario',
  'org-financeiro': 'org-financeiro-overview',
  'org-configuracoes': 'organizacao-metodo',
};

export function resolveMetaAdminGeralMenuId(menuId: string): string {
  return META_ADMIN_GERAL_MENU_ALIASES[menuId] ?? menuId;
}

export function inferNavContextFromMenu(menuId: string): MetaAdminGeralNavContext {
  const resolved = resolveMetaAdminGeralMenuId(menuId);
  if (META_ADMIN_GERAL_PLATFORM_MENU_IDS.has(resolved)) return 'platform';
  if (resolved.startsWith('org-') && resolved !== 'org-dashboard') {
    const dept = META_ADMIN_GERAL_ORG_DEPARTMENTS.find((d) => d.id === resolved);
    if (dept) return 'organization';
  }
  if (resolved === 'org-dashboard') return 'organization';
  return 'organization';
}

export function listNavOrganizations(): OrganizationDefinition[] {
  return listOrganizations();
}

export function getNavOrganizationById(id: string): OrganizationDefinition | null {
  return listOrganizations().find((o) => o.id === id) ?? null;
}

export function defaultActiveOrganizationId(): string {
  return METODO_ORGANIZATION.id;
}

/** Agrupa departamento que contém um menuId (para expandir ao navegar). */
export function findDepartmentIdForMenu(menuId: string): string | null {
  const resolved = resolveMetaAdminGeralMenuId(menuId);
  for (const dept of [...META_ADMIN_GERAL_PLATFORM_DEPARTMENTS, ...META_ADMIN_GERAL_ORG_DEPARTMENTS]) {
    if (dept.items.some((item) => item.id === resolved)) return dept.id;
  }
  return null;
}

/** Rótulo amigável para breadcrumb / header. */
export function getMenuLabel(menuId: string): string {
  const resolved = resolveMetaAdminGeralMenuId(menuId);
  for (const top of [...META_ADMIN_GERAL_PLATFORM_TOP, ...META_ADMIN_GERAL_ORG_TOP]) {
    if (top.id === resolved) return top.label;
  }
  for (const dept of [...META_ADMIN_GERAL_PLATFORM_DEPARTMENTS, ...META_ADMIN_GERAL_ORG_DEPARTMENTS]) {
    const item = dept.items.find((i) => i.id === resolved);
    if (item) return item.label;
  }
  if (resolved === 'org-dashboard') return 'Dashboard da Organização';
  if (resolved === 'organizacoes') return 'Organizações';
  return resolved;
}
