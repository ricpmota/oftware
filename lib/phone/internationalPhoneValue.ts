import {
  AsYouType,
  isPossiblePhoneNumber,
  parsePhoneNumberFromString,
  type CountryCode,
} from 'libphonenumber-js';
import {
  DEFAULT_PHONE_COUNTRY,
  DEFAULT_PHONE_DDI,
  getPhoneCountryOrDefault,
  isoFlagEmoji,
  resolvePhoneCountryIso,
} from '@/lib/phone/callingCountries';

export type InternationalPhoneFields = {
  telefone?: string | null;
  telefoneDdi?: string | null;
  telefonePais?: string | null;
  telefoneE164?: string | null;
};

export type PersistedInternationalPhone = {
  telefone: string;
  telefoneDdi: string;
  telefonePais: string;
};

export function digitsOnly(value: string | null | undefined): string {
  return (value || '').replace(/\D/g, '');
}

function stripLeadingDdi(nationalDigits: string, ddi: string): string {
  if (!ddi || !nationalDigits.startsWith(ddi)) return nationalDigits;
  if (nationalDigits.length <= ddi.length + 4) return nationalDigits;
  return nationalDigits.slice(ddi.length);
}

/** Nacional em dígitos, sem o DDI do país selecionado. */
export function nationalDigitsForCountry(
  raw: string | null | undefined,
  country: CountryCode,
  ddi: string,
): string {
  const trimmed = (raw || '').trim();
  if (!trimmed) return '';

  const parsed = parsePhoneNumberFromString(trimmed, country);
  if (parsed?.nationalNumber) {
    return String(parsed.nationalNumber);
  }

  return stripLeadingDdi(digitsOnly(trimmed), ddi);
}

export function formatNationalPhone(country: CountryCode, nationalDigits: string): string {
  const digits = digitsOnly(nationalDigits);
  if (!digits) return '';

  const parsed = parsePhoneNumberFromString(digits, country);
  if (parsed) {
    try {
      return parsed.formatNational();
    } catch {
      /* AsYouType abaixo */
    }
  }

  const typed = new AsYouType(country);
  const formatted = typed.input(digits);
  return formatted.replace(/^\+\d+\s*/, '').trim() || digits;
}

export function formatNationalAsYouType(country: CountryCode, raw: string): string {
  const typed = new AsYouType(country);
  const formatted = typed.input(raw);
  return formatted.replace(/^\+\d+\s*/, '').trim() || raw;
}

export function isPossibleNationalPhone(country: CountryCode, nationalDigits: string): boolean {
  const digits = digitsOnly(nationalDigits);
  if (!digits) return false;
  try {
    return isPossiblePhoneNumber(digits, country);
  } catch {
    return digits.length >= 6 && digits.length <= 15;
  }
}

/**
 * Persistência da Identificação: nacional + DDI + ISO.
 * Não grava telefoneE164 (evita campo obsoleto no merge do Firestore).
 */
export function toPersistedInternationalPhone(
  country: CountryCode,
  nationalRaw: string,
  ddi: string,
): PersistedInternationalPhone {
  return {
    telefone: nationalDigitsForCountry(nationalRaw, country, ddi),
    telefoneDdi: digitsOnly(ddi) || DEFAULT_PHONE_DDI,
    telefonePais: country,
  };
}

export const IDENTIFICACAO_PHONE_ERROR = 'Informe um número de telefone válido.';

/** País ausente = Brasil (legado). Portugal 9 dígitos com DDI 351 é válido. */
export function isValidIdentificacaoPhone(
  fields: InternationalPhoneFields | null | undefined,
): boolean {
  if (!fields) return false;
  const country = getPhoneCountryOrDefault({
    telefonePais: fields.telefonePais,
    telefoneDdi: fields.telefoneDdi,
  });
  const national = nationalDigitsForCountry(fields.telefone, country.iso, country.ddi);
  return isPossibleNationalPhone(country.iso, national);
}

/** Campos persistidos pela anamnese/Identificação — nunca inclui telefoneE164. */
export function persistedPhoneForIdentificacao(
  next: PersistedInternationalPhone,
): PersistedInternationalPhone {
  return {
    telefone: next.telefone,
    telefoneDdi: next.telefoneDdi,
    telefonePais: next.telefonePais,
  };
}

export function formatInternationalPhoneDisplay(fields: InternationalPhoneFields): string {
  const country = getPhoneCountryOrDefault({
    telefonePais: fields.telefonePais,
    telefoneDdi: fields.telefoneDdi,
  });
  const national = nationalDigitsForCountry(fields.telefone, country.iso, country.ddi);
  const formatted = formatNationalPhone(country.iso, national);
  const prefix = `${country.flag} +${country.ddi}`;
  return formatted ? `${prefix} ${formatted}` : prefix;
}

export function viewCountryFromIdentificacao(fields: InternationalPhoneFields) {
  const country = getPhoneCountryOrDefault({
    telefonePais: fields.telefonePais,
    telefoneDdi: fields.telefoneDdi,
  });
  return {
    ...country,
    flag: country.flag || isoFlagEmoji(country.iso),
    inferredIso: resolvePhoneCountryIso({
      telefonePais: fields.telefonePais,
      telefoneDdi: fields.telefoneDdi,
    }),
    isLegacyBrazil: !digitsOnly(fields.telefoneDdi || '') && !fields.telefonePais,
    defaultCountry: DEFAULT_PHONE_COUNTRY,
    defaultDdi: DEFAULT_PHONE_DDI,
  };
}
