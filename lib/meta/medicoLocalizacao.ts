import type { Medico } from '@/types/medico';

type LocalizacaoMedico = Medico['localizacao'];

/** Normaliza URL do Google Maps colada pelo médico. */
export function normalizeGoogleMapsUrl(input: string): string | undefined {
  const trimmed = input.trim();
  if (!trimmed) return undefined;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^(maps\.app\.goo\.gl|goo\.gl\/maps|www\.google\.)/i.test(trimmed)) {
    return `https://${trimmed.replace(/^\/+/, '')}`;
  }
  if (trimmed.includes('google.com/maps') || trimmed.includes('maps.app.goo.gl')) {
    return trimmed.startsWith('http') ? trimmed : `https://${trimmed}`;
  }
  return undefined;
}

export function getMedicoGoogleMapsHref(localizacao?: LocalizacaoMedico | null): string | null {
  if (!localizacao) return null;

  const url = localizacao.googleMapsUrl?.trim();
  if (url) {
    const normalized = normalizeGoogleMapsUrl(url);
    if (normalized) return normalized;
  }

  const parts = [
    localizacao.nomeLocal?.trim(),
    localizacao.endereco?.trim(),
    localizacao.numero?.trim() ? `nº ${localizacao.numero.trim()}` : '',
    localizacao.pontoReferencia?.trim(),
  ].filter(Boolean);

  if (parts.length === 0) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(parts.join(', '))}`;
}

export function formatMedicoEnderecoPrincipal(localizacao?: LocalizacaoMedico | null): string | null {
  if (!localizacao?.endereco?.trim() && !localizacao?.nomeLocal?.trim()) return null;

  const linhas: string[] = [];
  if (localizacao.nomeLocal?.trim()) linhas.push(localizacao.nomeLocal.trim());

  let logradouro = localizacao.endereco?.trim() || '';
  if (logradouro && localizacao.numero?.trim()) {
    logradouro = `${logradouro}, nº ${localizacao.numero.trim()}`;
  }
  if (logradouro) linhas.push(logradouro);

  return linhas.length > 0 ? linhas.join(' · ') : null;
}
