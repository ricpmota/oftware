export type WorkoutEditorAppearance = 'dark' | 'light';

/** Paleta sóbria do editor claro (Central de Treinos). Sem acentos coloridos. */
export const LIGHT_EDITOR = {
  canvas: 'bg-zinc-100',
  panel: 'border-zinc-200/90 bg-white shadow-sm',
  panelMuted: 'border-zinc-200 bg-zinc-50',
  header: 'border-zinc-200 bg-zinc-50',
  list: 'bg-zinc-50',
  title: 'text-zinc-900',
  muted: 'text-zinc-500',
  faint: 'text-zinc-400',
  input:
    'border border-zinc-200 bg-white text-zinc-900 placeholder:text-zinc-400 focus:ring-2 focus:ring-zinc-300 focus:border-zinc-400',
  btnPrimary:
    'bg-zinc-900 text-white hover:bg-zinc-800 disabled:opacity-45 disabled:cursor-not-allowed',
  btnSecondary:
    'border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50',
  btnGhost: 'text-zinc-500 hover:bg-zinc-200 hover:text-zinc-800',
  btnQuiet: 'border border-zinc-200 bg-zinc-100 text-zinc-700 hover:bg-zinc-200',
  btnDanger:
    'border border-zinc-300 bg-white text-zinc-600 hover:border-zinc-500 hover:bg-zinc-900 hover:text-white',
  btnAdd: 'bg-zinc-900 text-white hover:bg-zinc-700',
  btnAdded: 'bg-zinc-200 text-zinc-600',
  tabActive: 'bg-zinc-900 text-white',
  tabIdle: 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800',
  tabHasValue: 'text-zinc-800',
  card: 'border-zinc-200 bg-white',
  cardMuted: 'border-zinc-200 bg-zinc-50',
  cardAdded: 'border-zinc-300 bg-zinc-100',
  stepperPlus: 'text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900',
} as const;
