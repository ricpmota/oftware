import { sanitizeMensagemHtml, htmlToPlainText } from '@/lib/pacienteMensagem/mensagemHtml';
import { DEFAULT_PUBLIC_PAGE_LOGO_SRC } from '@/lib/whiteLabel/publicPagesTheme';

export type MensagemAssinaturaRole =
  | 'medico'
  | 'paciente'
  | 'nutricionista'
  | 'psiquiatra'
  | 'personal';

export type MensagemAssinaturaDefaults = {
  role: MensagemAssinaturaRole;
  /** Nome exibido (ex.: Dra. Maria Silva). */
  displayName: string;
  /** Linha de registro profissional (ex.: CRM SP 123456 / CRN / CREF). */
  registro?: string | null;
  telefone?: string | null;
  email?: string | null;
  /** Logo principal (mesma do menu desktop / Marca da Organização). */
  logoUrl?: string | null;
};

export type MensagemAssinaturaDoc = {
  /** Auth UID (metadado / dono da conta). */
  userId: string;
  /** ID do perfil no papel (medicoId / nutriId / personalId / pacienteId). */
  profileId?: string;
  role: MensagemAssinaturaRole;
  html: string;
  atualizadoEm: Date;
};

/**
 * Chave Firestore por perfil+papel — NÃO usar Auth UID / e-mail.
 * Ex.: `medico:abc`, `nutricionista:xyz`, `psiquiatra:…`, `personal:…`, `paciente:…`
 */
export function buildAssinaturaDocId(
  role: MensagemAssinaturaRole | string,
  profileId: string
): string {
  const r = String(role || '').trim().toLowerCase();
  const p = String(profileId || '').trim();
  if (!r || !p) return '';
  return `${r}:${p}`;
}

/** Bump para forçar regeneração de assinaturas salvas com o padrão atual. */
export const ASSINATURA_PADRAO_VERSAO = 3;

export type AssinaturaLogoSize = 'small' | 'medium' | 'large';

/** Tamanhos estilo Gmail para imagens da assinatura / editor. */
export const ASSINATURA_LOGO_SIZES: Record<
  AssinaturaLogoSize,
  { height: number; maxWidth: number; widthAttr: number; label: string }
> = {
  small: { height: 32, maxWidth: 96, widthAttr: 96, label: 'Pequeno' },
  medium: { height: 48, maxWidth: 160, widthAttr: 140, label: 'Médio' },
  large: { height: 80, maxWidth: 280, widthAttr: 240, label: 'Grande' },
};

/** Logo principal Método / organização — mesma usada no shell quando há branding. */
export const ASSINATURA_LOGO_PADRAO = DEFAULT_PUBLIC_PAGE_LOGO_SRC; // /metodo-emagrecer-logotipo-28.png

/** Fallback antigo (Oftware) — não usar em assinatura de médico/equipe. */
const LOGO_OFTWARE_ERRADA = '/logo.png';

/**
 * Resolve a logo da assinatura:
 * 1) logoMainUrl da Marca (principal)
 * 2) URL do menu desktop (se não for /logo.png)
 * 3) logotipo Método padrão
 */
export function resolveAssinaturaLogoUrl(opts: {
  logoMainUrl?: string | null;
  shellLogoUrl?: string | null;
  explicitLogoUrl?: string | null;
}): string {
  const candidates = [
    opts.explicitLogoUrl,
    opts.logoMainUrl,
    opts.shellLogoUrl,
    ASSINATURA_LOGO_PADRAO,
  ];
  for (const c of candidates) {
    const t = String(c || '').trim();
    if (!t) continue;
    if (t === LOGO_OFTWARE_ERRADA || t.endsWith(LOGO_OFTWARE_ERRADA)) continue;
    return t;
  }
  return ASSINATURA_LOGO_PADRAO;
}

export function toAbsoluteAssetUrl(url: string | null | undefined): string {
  const raw = resolveAssinaturaLogoUrl({ explicitLogoUrl: url });
  if (/^https?:\/\//i.test(raw) || raw.startsWith('data:')) return raw;
  if (typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}${raw.startsWith('/') ? '' : '/'}${raw}`;
  }
  return raw.startsWith('/') ? raw : `/${raw}`;
}

function escapeHtml(s: string): string {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function imgSizeStyle(size: AssinaturaLogoSize = 'medium'): {
  widthAttr: number;
  heightAttr: number;
  style: string;
} {
  const s = ASSINATURA_LOGO_SIZES[size] || ASSINATURA_LOGO_SIZES.medium;
  return {
    widthAttr: s.widthAttr,
    heightAttr: s.height,
    style: `height:${s.height}px;width:auto;max-width:${s.maxWidth}px;display:block;object-fit:contain`,
  };
}

/**
 * Assinatura padrão estilo Gmail: logo à esquerda + nome / CRM / telefone.
 */
export function buildDefaultAssinaturaHtml(
  defaults: MensagemAssinaturaDefaults,
  logoSize: AssinaturaLogoSize = 'medium'
): string {
  const logo = toAbsoluteAssetUrl(defaults.logoUrl);
  const nome = escapeHtml(defaults.displayName || 'Usuário');
  const registro = escapeHtml(String(defaults.registro || '').trim());
  const telefone = escapeHtml(String(defaults.telefone || '').trim());
  const email = escapeHtml(String(defaults.email || '').trim());
  const size = imgSizeStyle(logoSize);

  const lines: string[] = [
    `<div style="font-weight:700;font-size:13px;color:#111827;line-height:1.35">${nome}</div>`,
  ];
  if (registro) {
    lines.push(
      `<div style="font-size:12px;color:#4b5563;line-height:1.35;margin-top:2px">${registro}</div>`
    );
  }
  if (telefone) {
    lines.push(
      `<div style="font-size:12px;color:#4b5563;line-height:1.35;margin-top:2px">${telefone}</div>`
    );
  }
  if (!registro && !telefone && email) {
    lines.push(
      `<div style="font-size:12px;color:#4b5563;line-height:1.35;margin-top:2px">${email}</div>`
    );
  }

  return [
    `<table cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;margin:0;font-family:Arial,Helvetica,sans-serif">`,
    `<tr>`,
    `<td style="padding-right:12px;vertical-align:middle">`,
    `<img src="${escapeHtml(logo)}" alt="Logo" width="${size.widthAttr}" height="${size.heightAttr}" data-oftware-img-size="${logoSize}" style="${size.style}" />`,
    `</td>`,
    `<td style="vertical-align:middle">${lines.join('')}</td>`,
    `</tr>`,
    `</table>`,
  ].join('');
}

/** HTML inicial do editor: espaço para digitar + assinatura no rodapé (estilo Gmail). */
export function buildComposeHtmlWithAssinatura(
  bodyHtml: string,
  assinaturaHtml: string
): string {
  const body = sanitizeMensagemHtml(bodyHtml).trim() || '<div><br></div>';
  return appendAssinaturaToHtml(body, assinaturaHtml);
}

/** Conteúdo digável sem a assinatura (para validar mensagem vazia). */
export function plainBodyWithoutAssinatura(
  html: string,
  assinaturaHtml: string
): string {
  const full = htmlToPlainText(html).trim();
  const sig = htmlToPlainText(assinaturaHtml).trim();
  if (!sig) return full;
  if (full.endsWith(sig)) {
    return full.slice(0, -sig.length).replace(/[\s\-–—]*$/u, '').trim();
  }
  const idx = full.lastIndexOf(sig);
  if (idx > 0) {
    return full.slice(0, idx).replace(/[\s\-–—]*$/u, '').trim();
  }
  return full;
}

/** Assinaturas salvas com a logo Oftware errada devem ser regeneradas. */
export function assinaturaHtmlUsaLogoErrada(html: string): boolean {
  const h = String(html || '');
  return (
    h.includes('/logo.png') ||
    h.includes('%2Flogo.png') ||
    /src=["'][^"']*\/logo\.png["']/i.test(h)
  );
}

export function appendAssinaturaToHtml(bodyHtml: string, assinaturaHtml: string): string {
  const body = sanitizeMensagemHtml(bodyHtml).trim();
  const sig = sanitizeMensagemHtml(assinaturaHtml).trim();
  if (!sig) return body;
  if (!body) return sig;
  return `${body}<div style="margin-top:18px;padding-top:12px;border-top:1px solid #e5e7eb"></div>${sig}`;
}

export function appendAssinaturaToPlain(bodyPlain: string, assinaturaHtml: string): string {
  const body = String(bodyPlain || '').trim();
  const sigPlain = htmlToPlainText(assinaturaHtml).trim();
  if (!sigPlain) return body;
  if (!body) return sigPlain;
  return `${body}\n\n--\n${sigPlain}`;
}

export function formatRegistroProfissional(
  role: MensagemAssinaturaRole,
  opts: { numero?: string | null; uf?: string | null }
): string {
  const numero = String(opts.numero || '').trim();
  const uf = String(opts.uf || '').trim().toUpperCase();
  if (!numero) return '';
  if (role === 'medico' || role === 'psiquiatra') {
    return uf ? `CRM ${uf} ${numero}` : `CRM ${numero}`;
  }
  if (role === 'nutricionista') return uf ? `CRN ${uf} ${numero}` : `CRN ${numero}`;
  if (role === 'personal') return uf ? `CREF ${uf} ${numero}` : `CREF ${numero}`;
  return '';
}

export function formatNomeMedicoAssinatura(opts: {
  nome?: string | null;
  genero?: 'M' | 'F' | '' | null;
  fallback?: string;
}): string {
  const nome = String(opts.nome || '').trim();
  if (!nome) return opts.fallback || 'Médico';
  if (/^(dr\.?|dra\.?)\s/i.test(nome)) return nome;
  const prefix = opts.genero === 'F' ? 'Dra.' : 'Dr.';
  return `${prefix} ${nome}`;
}
