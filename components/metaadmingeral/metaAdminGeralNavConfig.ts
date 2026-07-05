import type { LucideIcon } from 'lucide-react';
import {
  Activity,
  BarChart3,
  BookOpen,
  Brain,
  Building2,
  Calendar,
  Dumbbell,
  FileText,
  FlaskConical,
  Image,
  LayoutDashboard,
  Mail,
  MessageCircle,
  MessageSquare,
  Palette,
  Pill,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Target,
  TrendingUp,
  Users,
  UtensilsCrossed,
} from 'lucide-react';
import { METODO_ORGANIZATION } from '@/lib/organization/organizationRegistry';

export type MetaAdminGeralNavItem = {
  id: string;
  label: string;
  icon: LucideIcon;
  /** Link externo (ex.: /metaadmingeral/chatinicial) — não altera activeMenu */
  href?: string;
};

export type MetaAdminGeralNavEntry =
  | { type: 'section-header'; label: string }
  | { type: 'subsection-header'; label: string }
  | { type: 'item'; item: MetaAdminGeralNavItem };

export const META_ADMIN_GERAL_ACTIVE_ORG = METODO_ORGANIZATION;

/** Médicos atuais da Organização Método (referência visual, Etapa 5). */
export const METODO_ORGANIZATION_MEDICOS_ATUAIS = [
  'Dr. Ricardo',
  'Dr. Marcos',
  'Dr. Pedro',
  'Dra. Vitória',
] as const;

export const META_ADMIN_GERAL_OFTWARE_NAV: MetaAdminGeralNavEntry[] = [
  { type: 'section-header', label: 'OFTWARE' },
  { type: 'item', item: { id: 'dashboard-oftware', label: 'Dashboard', icon: LayoutDashboard } },
  { type: 'subsection-header', label: 'Organizações' },
  {
    type: 'item',
    item: { id: 'organizacao-metodo', label: 'Método Emagrecer', icon: Building2 },
  },
  { type: 'item', item: { id: 'leads-whitelabel', label: 'Leads White Label', icon: Sparkles } },
  { type: 'item', item: { id: 'meta-business', label: 'Meta Business', icon: MessageCircle } },
  { type: 'item', item: { id: 'oftpay', label: 'OftPay', icon: BookOpen } },
  {
    type: 'item',
    item: {
      id: 'chatinicial',
      label: 'Chat Inicial',
      icon: MessageSquare,
      href: '/metaadmingeral/chatinicial',
    },
  },
  { type: 'item', item: { id: 'cores-do-sistema', label: 'Cores do Sistema', icon: Palette } },
  { type: 'subsection-header', label: 'Patrimônio Global' },
  {
    type: 'item',
    item: { id: 'exames-laboratoriais', label: 'Exames Laboratoriais', icon: FlaskConical },
  },
  { type: 'item', item: { id: 'protocolos-prescricao', label: 'Prescrições', icon: Pill } },
  { type: 'item', item: { id: 'bio-impedancia', label: 'Bio Impedância', icon: Activity } },
  {
    type: 'item',
    item: {
      id: 'oi-validation',
      label: 'OI Validation',
      icon: Brain,
      href: '/metaadmingeral/oi-validation',
    },
  },
  { type: 'subsection-header', label: 'Ferramentas' },
  {
    type: 'item',
    item: { id: 'platform-health', label: 'Saúde da Plataforma', icon: ShieldCheck },
  },
];

export const META_ADMIN_GERAL_ORGANIZATION_NAV: MetaAdminGeralNavEntry[] = [
  {
    type: 'section-header',
    label: `ORGANIZAÇÃO ATIVA — ${METODO_ORGANIZATION.name}`,
  },
  { type: 'item', item: { id: 'estatisticas', label: 'Estatísticas', icon: BarChart3 } },
  {
    type: 'item',
    item: {
      id: 'organizacao-metodo-branding',
      label: 'Marca da Organização',
      icon: Palette,
    },
  },
  { type: 'item', item: { id: 'medicos', label: 'Médicos', icon: Stethoscope } },
  { type: 'item', item: { id: 'nutricionistas', label: 'Nutricionistas', icon: UtensilsCrossed } },
  { type: 'item', item: { id: 'personal_trainers', label: 'Personais', icon: Dumbbell } },
  { type: 'item', item: { id: 'pacientes', label: 'Pacientes', icon: Users } },
  { type: 'item', item: { id: 'leads', label: 'Leads', icon: Target } },
  { type: 'item', item: { id: 'tirzepatida', label: 'Tirzepatida', icon: Pill } },
  { type: 'item', item: { id: 'emails', label: 'E-mails', icon: Mail } },
  { type: 'item', item: { id: 'calendario', label: 'Calendário', icon: Calendar } },
  { type: 'item', item: { id: 'banners', label: 'Banners', icon: Image } },
  { type: 'item', item: { id: 'nps', label: 'NPS', icon: TrendingUp } },
  { type: 'item', item: { id: 'relatorios', label: 'Relatórios', icon: FileText } },
  { type: 'item', item: { id: 'contratos', label: 'Contratos', icon: FileText } },
];

export const META_ADMIN_GERAL_ALL_NAV: MetaAdminGeralNavEntry[] = [
  ...META_ADMIN_GERAL_OFTWARE_NAV,
  ...META_ADMIN_GERAL_ORGANIZATION_NAV,
];

/** Apenas itens clicáveis (para mobile drawer). */
export function getMetaAdminGeralNavItems(): MetaAdminGeralNavItem[] {
  return META_ADMIN_GERAL_ALL_NAV.filter(
    (entry): entry is { type: 'item'; item: MetaAdminGeralNavItem } => entry.type === 'item',
  ).map((entry) => entry.item);
}
