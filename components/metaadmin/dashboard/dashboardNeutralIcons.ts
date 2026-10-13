import {
  Activity,
  BarChart3,
  Camera,
  CheckCircle2,
  Clock,
  MessageSquare,
  Scale,
  Syringe,
  UserX,
  Users,
  type LucideIcon,
} from 'lucide-react';
import type { MetodoEmagrecerIconName } from '@/components/metodo/MetodoEmagrecerIcon';
import type { OrganizationShellChrome } from '@/lib/organization/resolveOrganizationShellChrome';

export type DashboardNeutralIconTone = 'amber' | 'blue' | 'green' | 'red' | 'neutral';

export const DASHBOARD_NEUTRAL_ICONS: Record<
  MetodoEmagrecerIconName,
  { Icon: LucideIcon; tone: DashboardNeutralIconTone }
> = {
  pendente: { Icon: Clock, tone: 'amber' },
  'em-tratamento': { Icon: Activity, tone: 'blue' },
  concluido: { Icon: CheckCircle2, tone: 'green' },
  abandono: { Icon: UserX, tone: 'red' },
  aplicacao: { Icon: Syringe, tone: 'neutral' },
  'bio-impedancia': { Icon: Scale, tone: 'neutral' },
  paciente: { Icon: Users, tone: 'neutral' },
  grafico: { Icon: BarChart3, tone: 'neutral' },
  mensagens: { Icon: MessageSquare, tone: 'neutral' },
  fotografia: { Icon: Camera, tone: 'neutral' },
};

/** Ícones do sprite do Método só aparecem para `metodo` ou quando o chamador não informa a organização. */
export function shouldUseMetodoDashboardIcons(chrome: OrganizationShellChrome | null | undefined): boolean {
  return !chrome || chrome.useMetodoChrome;
}
