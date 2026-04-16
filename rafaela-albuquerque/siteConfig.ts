/**
 * Conteúdo e identidade da landing /rafaelaalbuquerque.
 * Briefing: pasta do projeto `Rafaela Albuquerque` (prompt + paleta).
 */

export const BRAND = {
  name: 'Rafaela Albuquerque',
  tagline: 'Previdenciário, Família e Sucessões',
  /** Logo da landing /rafaelaalbuquerque (PNG sem fundo; não confundir com /logo-site.jpg) */
  logoPath: '/rafaela-albuquerque/logonova.png',
  /** Retrato no hero (origem: Rafaela Albuquerque/IMG_8557.jpg) */
  portraitPhotoPath: '/rafaela-albuquerque/dra-rafaela.jpg',
  heroBgFrom: '#245F70',
  heroBgVia: '#2F7F96',
  heroBgTo: '#4099B3',
  primary: '#4099B3',
  primaryHover: '#2F7F96',
  primarySoft: '#EAF5F8',
  text: '#4E4B4C',
  textStrong: '#2F2D2E',
  textMuted: '#656263',
  textSoft: '#8A8788',
  border: '#E9E7E7',
  bgAlt: '#F7F7F7',
  /** WhatsApp oficial (DDI 55 + DDD 83). Sobrescrito por NEXT_PUBLIC_RAFAELA_WA se definido. */
  whatsappE164Default: '5583987700107',
  whatsappDisplay: '(83) 98770-0107',
} as const;

/** Dígitos com DDI — env opcional substitui o número padrão do escritório. */
export function whatsappDigits(): string {
  const fromEnv = process.env.NEXT_PUBLIC_RAFAELA_WA?.replace(/\D/g, '') ?? '';
  return fromEnv || BRAND.whatsappE164Default;
}

/** Link wa.me com mensagem inicial para a Dra. Rafaela. */
export function whatsappHref(): string {
  const n = whatsappDigits();
  const text = encodeURIComponent(
    'Olá, Dra. Rafaela! Vim pelo site e gostaria de conversar sobre meu caso.'
  );
  return `https://wa.me/${n}?text=${text}`;
}

export function scheduleHref(): string | null {
  const u = process.env.NEXT_PUBLIC_RAFAELA_SCHEDULE_URL?.trim();
  return u || null;
}

export function mailtoHref(): string | null {
  const e = process.env.NEXT_PUBLIC_RAFAELA_EMAIL?.trim();
  return e ? `mailto:${encodeURIComponent(e)}?subject=${encodeURIComponent('Contato — advocacia')}` : null;
}

/**
 * URL do perfil (ou post/reel) para embed oficial do Instagram.
 * `NEXT_PUBLIC_RAFAELA_INSTAGRAM`: @usuario, usuario ou URL https://www.instagram.com/...
 * Conta pública e incorporações permitidas nas configurações do Instagram.
 */
export function rafaelaInstagramPermalink(): string | null {
  const raw = process.env.NEXT_PUBLIC_RAFAELA_INSTAGRAM?.trim();
  if (!raw) return null;
  if (/^https?:\/\//i.test(raw)) {
    try {
      const u = new URL(raw);
      const host = u.hostname.replace(/^www\./i, '').toLowerCase();
      if (host !== 'instagram.com' && host !== 'instagr.am') return null;
      const path = u.pathname.replace(/\/+$/, '');
      if (!path || path === '/') return null;
      return `https://www.instagram.com${path}/`;
    } catch {
      return null;
    }
  }
  const user = raw.replace(/^@+/, '').replace(/\/+$/, '').trim();
  if (!/^[a-zA-Z0-9._]{1,30}$/.test(user)) return null;
  return `https://www.instagram.com/${user}/`;
}
