/**
 * Aparência dos assuntos do Oftreview.
 * A lista de assuntos continua vindo das pastas dos vídeos.
 * A chave é o nome literal já salvo em ScheduleItem.subject.
 */

export type SubjectVisual = {
  iconSrc: string;
  colorKey: string;
  stripeClass: string;
  barClass: string;
  badgeClass: string;
  dotClass: string;
};

const NEUTRAL: Omit<SubjectVisual, 'iconSrc' | 'colorKey'> = {
  stripeClass: 'bg-gray-300',
  barClass: 'bg-gray-400',
  badgeClass: 'bg-gray-50 text-gray-600',
  dotClass: 'bg-gray-400',
};

const TONES: Record<string, Omit<SubjectVisual, 'iconSrc' | 'colorKey'>> = {
  CATARATA: {
    stripeClass: 'bg-amber-500',
    barClass: 'bg-amber-500',
    badgeClass: 'bg-amber-50 text-amber-800',
    dotClass: 'bg-amber-500',
  },
  'CIRURGIA REFRATIVA': {
    stripeClass: 'bg-cyan-500',
    barClass: 'bg-cyan-500',
    badgeClass: 'bg-cyan-50 text-cyan-800',
    dotClass: 'bg-cyan-500',
  },
  'CÓRNEA, ESCLERA E CONJUNTIVA': {
    stripeClass: 'bg-violet-500',
    barClass: 'bg-violet-500',
    badgeClass: 'bg-violet-50 text-violet-800',
    dotClass: 'bg-violet-500',
  },
  'EMBRIOLOGIA OCULAR': {
    stripeClass: 'bg-indigo-500',
    barClass: 'bg-indigo-500',
    badgeClass: 'bg-indigo-50 text-indigo-800',
    dotClass: 'bg-indigo-500',
  },
  'EMERGÊNCIA OFTALMOLÓGICA': {
    stripeClass: 'bg-red-500',
    barClass: 'bg-red-500',
    badgeClass: 'bg-red-50 text-red-800',
    dotClass: 'bg-red-500',
  },
  'ESTRABISMO E OFTALMOPEDIATRIA': {
    stripeClass: 'bg-pink-500',
    barClass: 'bg-pink-500',
    badgeClass: 'bg-pink-50 text-pink-800',
    dotClass: 'bg-pink-500',
  },
  FARMACOLOGIA: {
    stripeClass: 'bg-emerald-500',
    barClass: 'bg-emerald-500',
    badgeClass: 'bg-emerald-50 text-emerald-800',
    dotClass: 'bg-emerald-500',
  },
  'GENÉTICA OCULAR': {
    stripeClass: 'bg-fuchsia-500',
    barClass: 'bg-fuchsia-500',
    badgeClass: 'bg-fuchsia-50 text-fuchsia-800',
    dotClass: 'bg-fuchsia-500',
  },
  GLAUCOMA: {
    stripeClass: 'bg-blue-500',
    barClass: 'bg-blue-500',
    badgeClass: 'bg-blue-50 text-blue-800',
    dotClass: 'bg-blue-500',
  },
  'LENTE DE CONTATO': {
    stripeClass: 'bg-sky-500',
    barClass: 'bg-sky-500',
    badgeClass: 'bg-sky-50 text-sky-800',
    dotClass: 'bg-sky-500',
  },
  NEUROFTALMOLOGIA: {
    stripeClass: 'bg-purple-500',
    barClass: 'bg-purple-500',
    badgeClass: 'bg-purple-50 text-purple-800',
    dotClass: 'bg-purple-500',
  },
  'OCULOPLÁSTICA E VIAS LACRIMAIS': {
    stripeClass: 'bg-rose-500',
    barClass: 'bg-rose-500',
    badgeClass: 'bg-rose-50 text-rose-800',
    dotClass: 'bg-rose-500',
  },
  'RETINA E VÍTREO': {
    stripeClass: 'bg-teal-500',
    barClass: 'bg-teal-500',
    badgeClass: 'bg-teal-50 text-teal-800',
    dotClass: 'bg-teal-500',
  },
  'TUMORES OCULARES': {
    stripeClass: 'bg-orange-500',
    barClass: 'bg-orange-500',
    badgeClass: 'bg-orange-50 text-orange-800',
    dotClass: 'bg-orange-500',
  },
  UVEÍTES: {
    stripeClass: 'bg-lime-500',
    barClass: 'bg-lime-500',
    badgeClass: 'bg-lime-50 text-lime-800',
    dotClass: 'bg-lime-500',
  },
  'ÓPTICA E REFRAÇÃO': {
    stripeClass: 'bg-slate-500',
    barClass: 'bg-slate-500',
    badgeClass: 'bg-slate-50 text-slate-700',
    dotClass: 'bg-slate-500',
  },
  ÓRBITA: {
    stripeClass: 'bg-stone-500',
    barClass: 'bg-stone-500',
    badgeClass: 'bg-stone-50 text-stone-700',
    dotClass: 'bg-stone-500',
  },
};

export function getSubjectIconSrc(subject: string): string {
  return `/Oftreview%20Icones/${encodeURIComponent((subject || '').trim())}.png`;
}

export function getSubjectVisual(subject: string): SubjectVisual {
  const name = (subject || '').trim();
  const tone = TONES[name] ?? NEUTRAL;
  return {
    iconSrc: getSubjectIconSrc(name),
    colorKey: TONES[name] ? name : 'default',
    ...tone,
  };
}

const SMALL_WORDS = new Set(['e', 'de', 'da', 'do', 'das', 'dos']);

export function displaySubjectName(subject: string): string {
  const raw = (subject || '').trim();
  if (!raw) return 'Sem assunto';
  return raw
    .toLocaleLowerCase('pt-BR')
    .split(/\s+/)
    .map((word, index) => {
      const bare = word.replace(/[,.]/g, '');
      if (index > 0 && SMALL_WORDS.has(bare)) return word;
      return word.charAt(0).toLocaleUpperCase('pt-BR') + word.slice(1);
    })
    .join(' ');
}

export function shortSubjectLabel(subject: string): string {
  const raw = (subject || '').trim();
  if (!raw) return 'Tema';
  const first = raw.split(/[\s,]+/).filter(Boolean)[0] || raw;
  return first.toLocaleUpperCase('pt-BR');
}
