import type { MedicoInstagramBio, MedicoInstagramBioFormState } from '@/types/medicoInstagramBio';
import {
  buildOrganizacaoPublicUrl,
  ORGANIZACAO_METODO_PUBLIC_ORIGIN,
} from '@/lib/tenant/organizacaoPublicOrigin';

export const INSTAGRAM_BIO_DEFAULT_EMAGRECIMENTO_URL = ORGANIZACAO_METODO_PUBLIC_ORIGIN;

export const INSTAGRAM_BIO_TEXT_DEFAULTS = {
  headline: 'Menos consultas isoladas. Mais acompanhamento.',
  subtitle:
    'Uma nova geração de acompanhamento digital para pacientes em tratamento de emagrecimento.',
  contactButtonLabel: 'Falar com Dr(a). {nomeMedico}',
  contactModalText: `Sou Dr(a). {nomeMedico} e acompanho pacientes em programas de emagrecimento e saúde metabólica.

Se você deseja entender como funciona o acompanhamento, tirar dúvidas ou iniciar sua jornada, fale diretamente comigo.`,
  profilePrompt: 'Escolha uma opção',
  emagrecerCtaLabel: 'Quero conhecer',
} as const;

export function buildInstagramBioPublicUrl(crmEstado: string, crmNumero: string): string | null {
  const uf = crmEstado.trim().toUpperCase();
  const numero = crmNumero.replace(/\D/g, '');
  if (!/^[A-Z]{2}$/.test(uf) || !numero) return null;
  return buildOrganizacaoPublicUrl(`/instagram/${uf}${numero}`);
}

export function normalizeInstagramBioWhatsApp(input: string): string {
  const digits = input.replace(/\D/g, '');
  if (digits.length < 10) return '';
  if (digits.startsWith('55')) return digits;
  return `55${digits}`;
}

export function validateInstagramBioHttpsUrl(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed) return true;
  return normalizeInstagramBioEmagrecimentoUrl(trimmed) !== null;
}

/** Aceita https completo, domínio sem protocolo ou caminho relativo (/dr/...). */
export function normalizeInstagramBioEmagrecimentoUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  let candidate = trimmed;
  if (candidate.startsWith('/')) {
    candidate = `${ORGANIZACAO_METODO_PUBLIC_ORIGIN}${candidate}`;
  } else if (!/^https?:\/\//i.test(candidate)) {
    candidate = `https://${candidate.replace(/^\/+/, '')}`;
  }

  try {
    const parsed = new URL(candidate);
    if (parsed.protocol !== 'https:') return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

/** URL final do botão “Quero Emagrecer” a partir do Link da Bio salvo no MetaAdmin. */
export function resolveInstagramBioEmagrecimentoHref(
  bio: MedicoInstagramBio | null | undefined,
): string | null {
  const raw = bio?.emagrecimentoUrl?.trim();
  if (!raw) return null;
  return normalizeInstagramBioEmagrecimentoUrl(raw);
}

export function medicoTratamentoShort(genero?: 'M' | 'F'): string {
  return genero === 'F' ? 'Dra.' : 'Dr.';
}

/** Substitui `{nomeMedico}` e normaliza Dr(a). conforme gênero. */
export function applyInstagramBioNomeTemplate(
  text: string,
  nomeMedico: string,
  genero?: 'M' | 'F',
): string {
  const tratamento = medicoTratamentoShort(genero);
  return text
    .replace(/\{nomeMedico\}/g, nomeMedico.trim())
    .replace(/Dr\(a\)\./g, tratamento)
    .replace(/Dr\(a\)/g, tratamento.replace('.', ''));
}

export function instagramBioFormFromStored(
  stored: MedicoInstagramBio | null | undefined,
): MedicoInstagramBioFormState {
  return {
    enabled: stored?.enabled !== false,
    logoUrl: stored?.logoUrl?.trim() || null,
    whatsapp: stored?.whatsapp ? normalizeInstagramBioWhatsApp(stored.whatsapp) : '',
    emagrecimentoUrl: stored?.emagrecimentoUrl?.trim() || INSTAGRAM_BIO_DEFAULT_EMAGRECIMENTO_URL,
    headline: stored?.headline?.trim() || INSTAGRAM_BIO_TEXT_DEFAULTS.headline,
    subtitle: stored?.subtitle?.trim() || INSTAGRAM_BIO_TEXT_DEFAULTS.subtitle,
    contactButtonLabel:
      stored?.contactButtonLabel?.trim() || INSTAGRAM_BIO_TEXT_DEFAULTS.contactButtonLabel,
    contactModalText:
      stored?.contactModalText?.trim() || INSTAGRAM_BIO_TEXT_DEFAULTS.contactModalText,
  };
}

export function instagramBioDefaultTextFormState(
  current: MedicoInstagramBioFormState,
): MedicoInstagramBioFormState {
  return {
    ...current,
    headline: INSTAGRAM_BIO_TEXT_DEFAULTS.headline,
    subtitle: INSTAGRAM_BIO_TEXT_DEFAULTS.subtitle,
    contactButtonLabel: INSTAGRAM_BIO_TEXT_DEFAULTS.contactButtonLabel,
    contactModalText: INSTAGRAM_BIO_TEXT_DEFAULTS.contactModalText,
  };
}

export function validateInstagramBioForm(form: MedicoInstagramBioFormState): string | null {
  if (form.emagrecimentoUrl.trim() && !normalizeInstagramBioEmagrecimentoUrl(form.emagrecimentoUrl)) {
    return 'Link do programa de emagrecimento inválido. Use https://, um domínio ou /dr/seu-nome';
  }
  if (form.whatsapp.trim()) {
    const normalized = normalizeInstagramBioWhatsApp(form.whatsapp);
    if (normalized.length < 12) {
      return 'WhatsApp inválido. Use DDI + DDD + número (ex: 5583999999999).';
    }
  }
  return null;
}

export function instagramBioFormToPayload(form: MedicoInstagramBioFormState): MedicoInstagramBio {
  const whatsapp = form.whatsapp.trim()
    ? normalizeInstagramBioWhatsApp(form.whatsapp)
    : undefined;

  return {
    enabled: form.enabled,
    logoUrl: form.logoUrl?.trim() ? form.logoUrl.trim() : null,
    whatsapp,
    emagrecimentoUrl:
      normalizeInstagramBioEmagrecimentoUrl(form.emagrecimentoUrl.trim()) ||
      INSTAGRAM_BIO_DEFAULT_EMAGRECIMENTO_URL,
    headline: form.headline.trim() || undefined,
    subtitle: form.subtitle.trim() || undefined,
    contactButtonLabel: form.contactButtonLabel.trim() || undefined,
    contactModalText: form.contactModalText.trim() || undefined,
  };
}

export function parseMedicoInstagramBio(raw: unknown): MedicoInstagramBio | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  return {
    enabled: o.enabled !== false,
    logoUrl: typeof o.logoUrl === 'string' ? o.logoUrl.trim() : o.logoUrl === null ? null : undefined,
    primaryColor: typeof o.primaryColor === 'string' ? o.primaryColor.trim() : undefined,
    whatsapp: typeof o.whatsapp === 'string' ? normalizeInstagramBioWhatsApp(o.whatsapp) : undefined,
    emagrecimentoUrl:
      typeof o.emagrecimentoUrl === 'string'
        ? normalizeInstagramBioEmagrecimentoUrl(o.emagrecimentoUrl) ?? undefined
        : undefined,
    headline: typeof o.headline === 'string' ? o.headline : undefined,
    subtitle: typeof o.subtitle === 'string' ? o.subtitle : undefined,
    contactButtonLabel: typeof o.contactButtonLabel === 'string' ? o.contactButtonLabel : undefined,
    contactModalText: typeof o.contactModalText === 'string' ? o.contactModalText : undefined,
    updatedAt: o.updatedAt,
  };
}

export function isInstagramBioHubActive(bio: MedicoInstagramBio | null | undefined): boolean {
  return bio?.enabled !== false;
}
