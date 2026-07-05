/**
 * Identidade visual MetaAdminGeral — plataforma Oftware (Etapa 9).
 * Organização Método aparece apenas em contexto de Organização Ativa.
 */
export const META_ADMIN_GERAL_BRANDING = {
  productName: 'Oftware',
  panelTitle: 'MetaAdminGeral',
  panelSubtitle: 'Administração da Plataforma',
  panelDescription: 'Gestão global de Organizações, White Label e Patrimônio da Oftware',
  welcomeLabel: 'Administração Oftware',
  logoFullSrc: '/oftware2.png',
  logoFullAlt: 'Oftware',
  logoIconSrc: '/oftware3.png',
  logoIconAlt: 'Oftware',
  favicon: '/oftware3.png',
  colors: {
    /** Fundo principal (Deep Blue Oftware) */
    background: '#0A1F44',
    /** Texto sobre fundo escuro */
    text: '#E8EDED',
    /** Destaque plataforma — alinhado ao site Oftware */
    platformAccent: '#22C55E',
    platformAccentHover: '#16A34A',
    /** Destaque Organização Ativa (Método) — só na seção de org */
    organizationAccent: '#4CCB7A',
    /** Gradiente secundário (charts, scrollbar) */
    gradientSecondary: '#2F8FA3',
  },
} as const;

export type MetaAdminGeralBranding = typeof META_ADMIN_GERAL_BRANDING;

/** Classes Tailwind reutilizáveis no shell MAG (evita hardcode espalhado). */
export const META_ADMIN_GERAL_SHELL = {
  page: 'min-h-screen bg-[#0A1F44] metaadmingeral-page text-[#E8EDED]',
  sidebar:
    'bg-[#0A1F44]/95 backdrop-blur-md border-r border-white/10 shadow-lg',
  mobileHeader: 'bg-[#0A1F44]/95 backdrop-blur-md border-b border-white/10',
  spinner: 'border-[#22C55E]',
  navActive:
    'bg-[#22C55E]/20 text-[#22C55E] border-r-2 border-[#22C55E]',
  navInactive: 'text-[#E8EDED]/70 hover:bg-white/10 hover:text-[#E8EDED]',
} as const;
