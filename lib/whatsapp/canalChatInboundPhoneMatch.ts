/**
 * Matching inbound Canal Chat: parse do canônico recebido do WhatsApp
 * (não adivinha país por comprimento) + comparação final via
 * `resolveInternationalPhone` / `tryResolvePhoneFromPacienteDoc`.
 */
import { parsePhoneNumberFromString } from 'libphonenumber-js';
import { phoneLookupVariants } from '@/lib/whatsapp/canalChatInboundMessage';
import {
  assertCanonicalWhatsappPhone,
  resolveLegacyBrazilWhatsappPhone,
  tryResolvePhoneFromPacienteDoc,
} from '@/lib/whatsapp/resolveInternationalPhone';

/** Limite por query Firestore (`in` + `.limit`). 3 campos → no máximo 30 docs. */
export const INBOUND_PHONE_QUERY_LIMIT = 10;

export type ParsedCanonicalWhatsappPhone = {
  canonical: string;
  callingCode: string;
  nationalNumber: string;
};

export function parseCanonicalWhatsappPhone(
  canonical: string,
): ParsedCanonicalWhatsappPhone | null {
  const digits = canonical.replace(/\D/g, '');
  if (digits.length < 10 || digits.length > 15) return null;
  const parsed = parsePhoneNumberFromString(`+${digits}`);
  const callingCode = parsed?.countryCallingCode ? String(parsed.countryCallingCode) : '';
  const nationalNumber = parsed?.nationalNumber ? String(parsed.nationalNumber) : '';
  if (!callingCode || !nationalNumber) return null;
  return { canonical: digits, callingCode, nationalNumber };
}

function uniqueLookupValues(values: string[], minDigits = 10): string[] {
  const seen = new Set<string>();
  for (const raw of values) {
    const digits = raw.replace(/\D/g, '');
    if (digits.length >= minDigits && digits.length <= 15) seen.add(digits);
  }
  return [...seen].slice(0, INBOUND_PHONE_QUERY_LIMIT);
}

/** Valores para `canalChatPhoneKey`: canônico + variantes BR legadas. */
export function inboundPhoneKeyLookupValues(canonical: string): string[] {
  return uniqueLookupValues(phoneLookupVariants(canonical));
}

/**
 * Valores para `dadosIdentificacao.telefone` e root `telefone`.
 * Inclui variantes BR + nacional parseado do canônico (US 10, PT 9, BR 10/11).
 */
export function inboundIdentLookupValues(canonical: string): string[] {
  const parsed = parseCanonicalWhatsappPhone(canonical);
  const values = uniqueLookupValues(phoneLookupVariants(canonical));
  const national = parsed?.nationalNumber?.replace(/\D/g, '') || '';
  if (national.length >= 6 && national.length <= 15) {
    return uniqueLookupValues([national, ...values], 6);
  }
  return values;
}

function storedKeyMatchesInbound(key: string, inboundCanonical: string): boolean {
  const digits = key.replace(/\D/g, '');
  if (!digits) return false;
  try {
    if (assertCanonicalWhatsappPhone(digits) === inboundCanonical) return true;
  } catch {
    /* tenta legado BR abaixo */
  }
  try {
    if (resolveLegacyBrazilWhatsappPhone(digits) === inboundCanonical) return true;
  } catch {
    return false;
  }
  return false;
}

/**
 * Match final: canônico inbound vs ident estruturado (DDI+nacional ou E164)
 * ou `canalChatPhoneKey`. Sem últimos-8-dígitos (evita colisão BR × US).
 */
export function inboundPatientMatchesCanonical(
  data: Record<string, unknown> | null | undefined,
  inboundCanonical: string,
): boolean {
  const canonical = inboundCanonical.replace(/\D/g, '');
  if (!canonical) return false;
  if (!data) return false;

  const key = typeof data.canalChatPhoneKey === 'string' ? data.canalChatPhoneKey : '';
  if (key && storedKeyMatchesInbound(key, canonical)) return true;

  const resolved = tryResolvePhoneFromPacienteDoc(data);
  return Boolean(resolved && resolved === canonical);
}
