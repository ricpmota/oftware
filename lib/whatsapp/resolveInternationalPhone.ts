/**
 * Resolução central de telefone para WhatsApp (E.164 em dígitos, sem "+").
 *
 * Prioridade:
 * 1. telefoneE164 explícito
 * 2. telefoneDdi + telefone nacional
 * 3. regra LEGADA: 10/11 dígitos sem 55 → prefixar 55 (Brasil)
 *
 * Ausência de DDI em paciente legado = Brasil.
 * Não adivinha país quando o DDI vem preenchido.
 */

export const BRAZIL_DDI = '55';
export const WHATSAPP_PHONE_MIN_DIGITS = 10;
export const WHATSAPP_PHONE_MAX_DIGITS = 15;

export type InternationalPhoneFields = {
  telefone?: string | null;
  telefoneDdi?: string | null;
  telefoneE164?: string | null;
};

export type InternationalPhoneErrorCode = 'EMPTY' | 'INVALID';

export class InternationalPhoneError extends Error {
  readonly code: InternationalPhoneErrorCode;

  constructor(message: string, code: InternationalPhoneErrorCode = 'INVALID') {
    super(message);
    this.name = 'InternationalPhoneError';
    this.code = code;
  }
}

const EMPTY_PHONE_MESSAGE = 'Informe um número de telefone válido.';
const INVALID_PHONE_MESSAGE =
  'Número inválido. Use DDI + DDD + número (ex.: 5583999999999).';

export function phoneDigitsOnly(value: string): string {
  return value.replace(/\D/g, '');
}

function digitsFromUnknown(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  return phoneDigitsOnly(raw.trim());
}

/**
 * Insere o 9º dígito em celulares BR quando informado no formato antigo
 * (10 dígitos nacionais). Só atua se o número já começa com DDI 55.
 */
export function applyBrazilMobileNinthDigit(digits: string): string {
  if (!digits.startsWith(BRAZIL_DDI)) return digits;

  const national = digits.slice(BRAZIL_DDI.length);
  if (national.length === 10) {
    const ddd = national.slice(0, 2);
    const local = national.slice(2);
    // Celular BR: local começa com 6–9 (após DDD).
    if (/^[6-9]/.test(local)) {
      return `${BRAZIL_DDI}${ddd}9${local}`;
    }
  }

  return digits;
}

function assertWhatsappLength(digits: string): string {
  if (digits.length < WHATSAPP_PHONE_MIN_DIGITS || digits.length > WHATSAPP_PHONE_MAX_DIGITS) {
    throw new InternationalPhoneError(INVALID_PHONE_MESSAGE, 'INVALID');
  }
  return digits;
}

function composeDdiAndNational(ddi: string, national: string): string {
  if (national.startsWith(ddi) && national.length > ddi.length) {
    return national;
  }
  return `${ddi}${national}`;
}

/**
 * Regra LEGADA — bit-a-bit a antiga `normalizeWhatsappPhone(raw)`:
 * 10 ou 11 dígitos que não começam com 55 recebem prefixo 55;
 * em seguida o 9º dígito BR (somente DDI 55).
 */
export function resolveLegacyBrazilWhatsappPhone(raw: string): string {
  const digits = phoneDigitsOnly(raw);
  if (!digits) {
    throw new InternationalPhoneError(EMPTY_PHONE_MESSAGE, 'EMPTY');
  }

  let normalized = digits;
  if (
    (normalized.length === 10 || normalized.length === 11) &&
    !normalized.startsWith(BRAZIL_DDI)
  ) {
    normalized = `${BRAZIL_DDI}${normalized}`;
  }

  normalized = applyBrazilMobileNinthDigit(normalized);
  return assertWhatsappLength(normalized);
}

/**
 * Fonte da verdade para o número enviado ao WPPConnect.
 * Com DDI explícito, NÃO aplica a heurística "10/11 = Brasil".
 */
export function resolveInternationalPhone(input: InternationalPhoneFields): string {
  const e164 = digitsFromUnknown(input.telefoneE164);
  if (e164) {
    return assertWhatsappLength(applyBrazilMobileNinthDigit(e164));
  }

  const ddi = digitsFromUnknown(input.telefoneDdi);
  const national = digitsFromUnknown(input.telefone);

  if (ddi) {
    if (!national) {
      throw new InternationalPhoneError(EMPTY_PHONE_MESSAGE, 'EMPTY');
    }
    const composed = composeDdiAndNational(ddi, national);
    const withNinth =
      ddi === BRAZIL_DDI ? applyBrazilMobileNinthDigit(composed) : composed;
    return assertWhatsappLength(withNinth);
  }

  return resolveLegacyBrazilWhatsappPhone(input.telefone ?? '');
}

export function resolveInternationalPhoneFromIdentificacao(
  ident: InternationalPhoneFields | null | undefined,
): string {
  return resolveInternationalPhone({
    telefone: ident?.telefone,
    telefoneDdi: ident?.telefoneDdi,
    telefoneE164: ident?.telefoneE164,
  });
}

/** null somente quando não há dígitos úteis. Entrada presente mas inválida relança. */
export function tryResolveInternationalPhone(
  input: InternationalPhoneFields,
): string | null {
  try {
    return resolveInternationalPhone(input);
  } catch (error) {
    if (error instanceof InternationalPhoneError && error.code === 'EMPTY') {
      return null;
    }
    throw error;
  }
}

/**
 * Telefone JÁ resolvido (fila, E.164, saída de `resolveInternationalPhone`).
 * Não aplica a heurística 10/11 = Brasil. O 9º dígito BR só entra se o valor
 * já começa com DDI 55.
 */
export function assertCanonicalWhatsappPhone(raw: string): string {
  const digits = phoneDigitsOnly(raw);
  if (!digits) {
    throw new InternationalPhoneError(EMPTY_PHONE_MESSAGE, 'EMPTY');
  }
  return assertWhatsappLength(applyBrazilMobileNinthDigit(digits));
}

/**
 * Porta de envio WPPConnect: cru/legado vs canônico.
 * `phoneIsResolved === true` → nunca prefixa 55 em 10/11 dígitos.
 */
export function resolvePhoneForWhatsappSend(
  phone: string,
  phoneIsResolved: boolean,
): string {
  return phoneIsResolved
    ? assertCanonicalWhatsappPhone(phone)
    : resolveLegacyBrazilWhatsappPhone(phone);
}

function pickStringField(raw: unknown): string | undefined {
  return typeof raw === 'string' && raw.trim() ? raw : undefined;
}

function identFieldsFromPacienteDoc(
  data: Record<string, unknown>,
): InternationalPhoneFields {
  const ident = data.dadosIdentificacao;
  const rec =
    ident && typeof ident === 'object' && !Array.isArray(ident)
      ? (ident as Record<string, unknown>)
      : undefined;
  return {
    telefone:
      pickStringField(rec?.telefone) ??
      pickStringField(rec?.celular) ??
      pickStringField(rec?.whatsapp) ??
      pickStringField(data.telefone),
    telefoneDdi: pickStringField(rec?.telefoneDdi),
    telefoneE164: pickStringField(rec?.telefoneE164),
  };
}

const PACIENTE_PHONE_FALLBACK_KEYS = [
  'telefone',
  'celular',
  'phone',
  'whatsapp',
  'telefoneWhatsApp',
] as const;

/**
 * Extractor server-side: `dadosIdentificacao` estruturado, depois campos soltos.
 * Paciente legado só com `telefone` continua na regra BR.
 */
export function tryResolvePhoneFromPacienteDoc(
  data: Record<string, unknown> | null | undefined,
): string | null {
  if (!data) return null;

  try {
    return resolveInternationalPhone(identFieldsFromPacienteDoc(data));
  } catch (error) {
    if (!(error instanceof InternationalPhoneError)) throw error;
  }

  for (const key of PACIENTE_PHONE_FALLBACK_KEYS) {
    const raw = data[key];
    if (typeof raw !== 'string' || !raw.trim()) continue;
    try {
      return resolveLegacyBrazilWhatsappPhone(raw);
    } catch {
      continue;
    }
  }

  return null;
}
