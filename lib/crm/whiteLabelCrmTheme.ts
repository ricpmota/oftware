export type WhiteLabelCrmThemeVariant =
  | 'metaadmingeral-dark'
  | 'metaadmin-dark'
  | 'metaadmin-light';

export type WhiteLabelCrmTheme = {
  variant: WhiteLabelCrmThemeVariant;
  textPrimary: string;
  textMuted: string;
  textSubtle: string;
  cardBg: string;
  cardBorder: string;
  panelBg: string;
  panelBorder: string;
  input: string;
  inputIcon: string;
  selectOptionBg: string;
  accent: string;
  accentFg: string;
  sheetBg: string;
  sheetOverlay: string;
  columnHeaderBg: string;
  kanbanColumn: string;
  kanbanColumnOver: string;
  kanbanEmpty: string;
  pipelineCard: string;
  pipelineCardGrip: string;
  btnSecondary: string;
  btnPrimary: string;
  spinner: string;
  messageOk: string;
  messageErr: string;
  badgeCount: string;
  divider: string;
  infoBox: string;
  timelineDot: string;
  timelineLine: string;
  label: string;
  closeBtn: string;
  actionBtn: string;
  deleteBtn: string;
  noteBtn: string;
};

const metaadmingeralDark: WhiteLabelCrmTheme = {
  variant: 'metaadmingeral-dark',
  textPrimary: 'text-[#E8EDED]',
  textMuted: 'text-[#E8EDED]/60',
  textSubtle: 'text-[#E8EDED]/40',
  cardBg: 'bg-white/5',
  cardBorder: 'border-white/10',
  panelBg: 'bg-white/5',
  panelBorder: 'border-white/10',
  input:
    'w-full bg-[#0A1F44] border border-white/20 rounded-md px-3 py-2 text-sm text-[#E8EDED] focus:outline-none focus:border-[#4CCB7A]/60',
  inputIcon: 'text-[#E8EDED]/40',
  selectOptionBg: '#0A1F44',
  accent: 'text-[#4CCB7A]',
  accentFg: 'bg-[#4CCB7A] text-[#0A1F44]',
  sheetBg: 'bg-[#0d2a5a]',
  sheetOverlay: 'bg-black/60',
  columnHeaderBg: 'bg-[#0d2a5a]/95',
  kanbanColumn: 'border-white/10 bg-white/[0.03]',
  kanbanColumnOver: 'border-[#4CCB7A]/50 bg-[#4CCB7A]/5',
  kanbanEmpty: 'text-[#E8EDED]/30',
  pipelineCard:
    'bg-[#0A1F44]/80 border border-white/15 rounded-xl p-3 shadow-sm hover:border-[#4CCB7A]/30',
  pipelineCardGrip: 'text-[#E8EDED]/30 hover:text-[#E8EDED]/60',
  btnSecondary: 'bg-white/10 hover:bg-white/15 text-[#E8EDED]',
  btnPrimary: 'bg-[#4CCB7A] text-[#0A1F44] hover:bg-[#45b86d]',
  spinner: 'text-[#4CCB7A]',
  messageOk: 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30',
  messageErr: 'bg-red-500/15 text-red-300 border border-red-500/30',
  badgeCount: 'bg-white/10 text-[#E8EDED]/70',
  divider: 'border-white/10',
  infoBox: 'bg-white/5',
  timelineDot: 'bg-[#4CCB7A]',
  timelineLine: 'bg-white/15',
  label: 'text-[#E8EDED]/50',
  closeBtn: 'hover:bg-white/10 text-[#E8EDED]/70',
  actionBtn: 'bg-white/10 hover:bg-white/15 text-[#E8EDED]',
  deleteBtn:
    'border border-red-500/30 bg-red-500/10 text-red-300 hover:bg-red-500/20',
  noteBtn: 'bg-violet-600 text-white',
};

const metaadminDark: WhiteLabelCrmTheme = {
  ...metaadmingeralDark,
  variant: 'metaadmin-dark',
  sheetBg: 'bg-[#0A1F44]',
  columnHeaderBg: 'bg-[#0A1F44]/95',
};

const metaadminLight: WhiteLabelCrmTheme = {
  variant: 'metaadmin-light',
  textPrimary: 'text-gray-900 dark:text-white',
  textMuted: 'text-gray-600 dark:text-gray-300',
  textSubtle: 'text-gray-400 dark:text-gray-500',
  cardBg: 'bg-white dark:bg-gray-800',
  cardBorder: 'border-gray-200 dark:border-gray-700',
  panelBg: 'bg-white dark:bg-gray-800',
  panelBorder: 'border-gray-200 dark:border-gray-700',
  input:
    'w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-md px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20',
  inputIcon: 'text-gray-400',
  selectOptionBg: '#ffffff',
  accent: 'text-emerald-600',
  accentFg: 'bg-emerald-600 text-white hover:bg-emerald-700',
  sheetBg: 'bg-white dark:bg-gray-900',
  sheetOverlay: 'bg-black/40',
  columnHeaderBg: 'bg-gray-50 dark:bg-gray-800/95',
  kanbanColumn: 'border-gray-200 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-800/50',
  kanbanColumnOver: 'border-emerald-400 bg-emerald-50 dark:bg-emerald-950/30',
  kanbanEmpty: 'text-gray-400',
  pipelineCard:
    'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 shadow-sm hover:border-emerald-400/60',
  pipelineCardGrip: 'text-gray-300 hover:text-gray-500',
  btnSecondary:
    'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700',
  btnPrimary: 'bg-emerald-600 text-white hover:bg-emerald-700',
  spinner: 'text-emerald-600',
  messageOk: 'bg-emerald-50 text-emerald-800 border border-emerald-200',
  messageErr: 'bg-red-50 text-red-700 border border-red-200',
  badgeCount: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300',
  divider: 'border-gray-200 dark:border-gray-700',
  infoBox: 'bg-gray-50 dark:bg-gray-800/80',
  timelineDot: 'bg-emerald-500',
  timelineLine: 'bg-gray-200 dark:bg-gray-700',
  label: 'text-gray-500 dark:text-gray-400',
  closeBtn: 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500',
  actionBtn:
    'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700',
  deleteBtn: 'border border-red-200 bg-red-50 text-red-700 hover:bg-red-100',
  noteBtn: 'bg-violet-600 text-white',
};

export function getWhiteLabelCrmTheme(
  variant: WhiteLabelCrmThemeVariant = 'metaadmingeral-dark'
): WhiteLabelCrmTheme {
  if (variant === 'metaadmin-light') return metaadminLight;
  if (variant === 'metaadmin-dark') return metaadminDark;
  return metaadmingeralDark;
}

/** Converte themeHome do metaadmin para variante do CRM WL. */
export function whiteLabelCrmVariantFromMetaadminHome(
  themeHome: 'light' | 'dark'
): WhiteLabelCrmThemeVariant {
  return themeHome === 'dark' ? 'metaadmin-dark' : 'metaadmin-light';
}
