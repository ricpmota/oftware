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

/** Perfis principais exibidos na hub. */
export const INSTAGRAM_PROFILES: InstagramProfileItem[] = [
  {
    kind: 'profile',
    id: 'medico',
    title: 'Sou Médico',
    ctaLabel: 'Ver Clínica Digital',
    href: 'https://www.oftware.com.br',
    iconKey: 'stethoscope',
    accent: 'green',
    modalIntro:
      'Transforme consultas em acompanhamento contínuo e construa uma clínica digital moderna.',
    benefits: [
      'Crie sua clínica digital',
      'Acompanhe pacientes além da consulta',
      'Menos dependência de plantões',
    ],
  },
  {
    kind: 'profile',
    id: 'nutricionista',
    title: 'Sou Nutricionista',
    ctaLabel: 'Ver Plataforma Nutricional',
    href: 'https://www.oftware.com.br/metanutri',
    iconKey: 'utensils',
    accent: 'blue',
    modalIntro: 'Trabalhe em conjunto com médicos e personal trainers.',
    benefits: [
      'Fidelize seus pacientes',
      'Acompanhamento nutricional contínuo',
      'Trabalhe integrado com a equipe',
    ],
  },
  {
    kind: 'profile',
    id: 'personal',
    title: 'Sou Personal',
    ctaLabel: 'Ver Plataforma de Treino',
    href: 'https://www.oftware.com.br/metapersonal',
    iconKey: 'dumbbell',
    accent: 'cyan',
    benefits: [
      'Transforme acompanhamento em resultado mensurável',
      'Acompanhe resultados em tempo real',
      'Integração com médico e nutricionista',
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
    'Médico, engenheiro e fundador da Oftware. Tire dúvidas, conheça a plataforma ou converse sobre uma possível parceria.',
  modalTitle: 'Falar diretamente com o fundador',
  modalText:
    'Sou médico, engenheiro e fundador da Oftware.\n\nSe você deseja conhecer a plataforma, entender como funciona uma clínica digital, discutir uma parceria ou tirar dúvidas sobre acompanhamento digital, fale diretamente comigo.\n\nRespondo pessoalmente.',
  ctaLabel: 'Falar com Dr. Ricardo',
  href: '#',
  benefits: [
    'Demonstração da plataforma',
    'Dúvidas sobre implementação',
    'Parcerias e oportunidades',
    'Estratégias para acompanhamento recorrente',
  ],
};

export const INSTAGRAM_HUB_COPY = {
  headline: 'Menos consultas isoladas. Mais acompanhamento.',
  subtitle: 'Uma nova geração de clínicas digitais para profissionais da saúde e pacientes.',
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
