import { getInstagramFounderWhatsAppUrl } from '@/lib/landing/instagramFounderWhatsApp';

export type InstagramProfileIconKey = 'stethoscope' | 'utensils' | 'dumbbell' | 'heart' | 'rocket';

export type InstagramProfileId = 'medico' | 'nutricionista' | 'personal' | 'emagrecer' | 'empreendedor';
export type InstagramHubItemId = InstagramProfileId | 'fundador';

export const INSTAGRAM_PROFILE_ICON_KEYS: Record<InstagramProfileId, InstagramProfileIconKey> = {
  medico: 'stethoscope',
  nutricionista: 'utensils',
  personal: 'dumbbell',
  emagrecer: 'heart',
  empreendedor: 'rocket',
};

type InstagramHubItemBase = {
  id: InstagramHubItemId;
  title: string;
  ctaLabel: string;
  href: string;
  benefits: string[];
};

export type InstagramProfileItem = InstagramHubItemBase & {
  kind: 'profile';
  iconKey: InstagramProfileIconKey;
  accent: 'green' | 'blue' | 'cyan' | 'emerald' | 'violet';
  /** Texto curto exibido no modal, antes dos benefícios. */
  modalIntro?: string;
};

export type InstagramFounderItem = InstagramHubItemBase & {
  kind: 'founder';
  description: string;
  modalTitle: string;
  modalText: string;
  /** Abre WhatsApp direto, sem seletor de perfil. */
  openWhatsAppDirectly?: boolean;
};

export type InstagramHubItem = InstagramProfileItem | InstagramFounderItem;

/** URLs de plataforma usadas nas hubs white-label de outros médicos. */
export const INSTAGRAM_PLATFORM_HREFS = {
  nutricionista: 'https://www.oftware.com.br/metanutri',
  personal: 'https://www.oftware.com.br/metapersonal',
  medico: 'https://www.oftware.com.br',
} as const;

/** Perfis principais exibidos na hub `/instagram` (fundador). */
export const INSTAGRAM_PROFILES: InstagramProfileItem[] = [
  {
    kind: 'profile',
    id: 'medico',
    title: 'Sou Médico',
    ctaLabel: 'Falar no WhatsApp',
    href: getInstagramFounderWhatsAppUrl('medico'),
    iconKey: 'stethoscope',
    accent: 'green',
    modalIntro:
      'Tenha sua própria plataforma para acompanhar pacientes e construir um programa de acompanhamento contínuo.',
    benefits: [
      'Sua própria plataforma com sua marca',
      'Acompanhamento contínuo dos pacientes',
      'Prescrições, exames e evolução em um só lugar',
      'Menos dependência de consultas isoladas',
    ],
  },
  {
    kind: 'profile',
    id: 'nutricionista',
    title: 'Sou Nutricionista',
    ctaLabel: 'Falar no WhatsApp',
    href: getInstagramFounderWhatsAppUrl('nutricionista'),
    iconKey: 'utensils',
    accent: 'blue',
    modalIntro: 'Transforme seu acompanhamento nutricional em uma experiência premium para seus pacientes.',
    benefits: [
      'Plataforma personalizada com sua marca',
      'Evolução alimentar e acompanhamento contínuo',
      'Fotos, medidas e bioimpedância',
      'Comunicação próxima com seus pacientes',
      'Integração com médicos quando desejar',
    ],
  },
  {
    kind: 'profile',
    id: 'personal',
    title: 'Sou Personal',
    ctaLabel: 'Falar no WhatsApp',
    href: getInstagramFounderWhatsAppUrl('personal'),
    iconKey: 'dumbbell',
    accent: 'cyan',
    modalIntro: 'Tenha sua própria plataforma para acompanhar seus alunos todos os dias.',
    benefits: [
      'Plataforma personalizada com sua marca',
      'Treinos organizados',
      'Evolução física',
      'Fotos e medidas',
      'Comunicação contínua com seus alunos',
    ],
  },
  {
    kind: 'profile',
    id: 'emagrecer',
    title: 'Quero Emagrecer',
    ctaLabel: 'Quero conhecer',
    href: 'https://www.ometodoemagrecer.com.br',
    iconKey: 'heart',
    accent: 'emerald',
    benefits: [
      'Programa de emagrecimento com acompanhamento',
      'Equipe médica e multidisciplinar',
      'Resultados sustentáveis a longo prazo',
    ],
  },
];

/**
 * Copy legado dos cards nutri/personal nas hubs White Label de outros médicos.
 * Mantido para não alterar o posicionamento das páginas WL.
 */
export const INSTAGRAM_WHITELABEL_PARTNER_COPY: Record<
  'nutricionista' | 'personal',
  { modalIntro?: string; benefits: string[]; ctaLabel: string }
> = {
  nutricionista: {
    modalIntro: 'Trabalhe em conjunto com médicos e personal trainers.',
    ctaLabel: 'Ver Plataforma Nutricional',
    benefits: [
      'Fidelize seus pacientes',
      'Acompanhamento nutricional contínuo',
      'Trabalhe integrado com a equipe',
    ],
  },
  personal: {
    ctaLabel: 'Ver Plataforma de Treino',
    benefits: [
      'Transforme acompanhamento em resultado mensurável',
      'Acompanhe resultados em tempo real',
      'Integração com médico e nutricionista',
    ],
  },
};
/**
 * Cards opcionais — altere `enabled` para `true` quando for publicar.
 * Reservado: 🚀 Quero empreender na medicina
 */
export const INSTAGRAM_OPTIONAL_PROFILES: (InstagramProfileItem & { enabled: boolean })[] = [
  {
    enabled: false,
    kind: 'profile',
    id: 'empreendedor',
    title: 'Quero empreender na medicina',
    ctaLabel: 'Conhecer oportunidades',
    href: 'https://www.oftware.com.br',
    iconKey: 'rocket',
    accent: 'violet',
    benefits: [
      'Modelos de clínica digital',
      'Mentoria para médicos empreendedores',
      'Estratégias de acompanhamento recorrente',
    ],
  },
];

export const INSTAGRAM_FOUNDER: InstagramFounderItem = {
  kind: 'founder',
  id: 'fundador',
  title: 'Falar com Dr. Ricardo',
  description:
    'Médico, engenheiro e fundador da Oftware. Construindo uma nova forma de profissionais da saúde acompanharem seus pacientes.',
  modalTitle: 'Falar diretamente com o fundador',
  modalText:
    'Sou médico, engenheiro e fundador da Oftware.\n\nEstou construindo uma nova forma de profissionais da saúde acompanharem seus pacientes.\n\nSe você deseja conhecer a plataforma, entender como criar sua própria clínica digital, oferecer uma experiência premium aos seus pacientes ou conversar sobre uma parceria, será um prazer falar com você.\n\nEu mesmo respondo todas as mensagens.',
  ctaLabel: 'Falar com Dr. Ricardo',
  href: '#',
  benefits: [
    'Demonstração personalizada da plataforma',
    'Estratégias para aumentar a recorrência dos pacientes',
    'Como criar sua própria plataforma de atendimento',
    'Parcerias e novos projetos',
  ],
};

export const INSTAGRAM_HUB_COPY = {
  headline: 'Sua própria plataforma. Sua marca. Seus pacientes.',
  subtitle:
    'Médicos, nutricionistas e personal trainers podem criar uma experiência completa de acompanhamento com sua própria marca.',
  profilePrompt: 'Escolha uma opção',
} as const;

export const ACCENT_STYLES: Record<
  InstagramProfileItem['accent'],
  { ring: string; glow: string; iconBg: string; iconText: string }
> = {
  green: {
    ring: 'ring-emerald-400/30',
    glow: 'shadow-[0_0_40px_rgba(74,222,128,0.15)]',
    iconBg: 'bg-emerald-500/15',
    iconText: 'text-emerald-400',
  },
  blue: {
    ring: 'ring-blue-400/30',
    glow: 'shadow-[0_0_40px_rgba(96,165,250,0.15)]',
    iconBg: 'bg-blue-500/15',
    iconText: 'text-blue-400',
  },
  cyan: {
    ring: 'ring-cyan-400/30',
    glow: 'shadow-[0_0_40px_rgba(34,211,238,0.15)]',
    iconBg: 'bg-cyan-500/15',
    iconText: 'text-cyan-400',
  },
  emerald: {
    ring: 'ring-teal-400/30',
    glow: 'shadow-[0_0_40px_rgba(45,212,191,0.15)]',
    iconBg: 'bg-teal-500/15',
    iconText: 'text-teal-400',
  },
  violet: {
    ring: 'ring-violet-400/30',
    glow: 'shadow-[0_0_40px_rgba(167,139,250,0.15)]',
    iconBg: 'bg-violet-500/15',
    iconText: 'text-violet-400',
  },
};

/** Perfis visíveis na hub (principais + opcionais com enabled: true). */
export function getInstagramProfilesForHub(): InstagramProfileItem[] {
  const optional = INSTAGRAM_OPTIONAL_PROFILES.filter((item) => item.enabled).map(
    ({ enabled: _enabled, ...profile }) => profile,
  );
  return [...INSTAGRAM_PROFILES, ...optional];
}

export function findInstagramHubItem(
  id: InstagramHubItemId,
  profiles: InstagramProfileItem[] = getInstagramProfilesForHub(),
  founder: InstagramFounderItem | null = INSTAGRAM_FOUNDER,
): InstagramHubItem | null {
  if (id === 'fundador') return founder;
  const visible = profiles.find((item) => item.id === id);
  if (visible) return visible;
  return INSTAGRAM_OPTIONAL_PROFILES.find((item) => item.id === id) ?? null;
}
