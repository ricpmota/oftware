/**
 * BRy EasySign: `name` e `clientName` do envelope.
 * Docs: `^([A-Za-zÀ-Úà-ú0-9ç/\\\-_\.& ()@:;,]){1,50}$`
 * @see https://bry-developer.readme.io/reference/post_api-service-sign-v1-signatures-1
 */
export const EASYSIGN_ENVELOPE_NAME_MAX = 50;

/** Caracteres permitidos pela BRy em name/clientName (fora disso → espaço). */
const DISALLOWED = /[^A-Za-zÀ-Úà-ú0-9ç/\\\-_\.& ()@:;,]+/g;

/**
 * Sanitiza e trunca para caber no limite de 50 da BRy (evita
 * "Error validating tag 'max' of field 'Name' in object 'CreateCollection.Name'").
 */
export function sanitizeEasySignEnvelopeName(
  raw: string,
  fallback = 'Documento'
): string {
  let s = (raw || '').normalize('NFC').trim().replace(DISALLOWED, ' ');
  s = s.replace(/\s+/g, ' ').trim();
  if (!s) s = fallback;
  if (s.length > EASYSIGN_ENVELOPE_NAME_MAX) {
    s = s.slice(0, EASYSIGN_ENVELOPE_NAME_MAX).trim();
  }
  if (!s) s = fallback.slice(0, EASYSIGN_ENVELOPE_NAME_MAX);
  return s;
}

export function isEasySignNameValidationError(message: string): boolean {
  return (
    /CreateCollection\.Name|field 'Name'.*max|validating tag 'max'.*Name/i.test(message) ||
    /clientName|field 'ClientName'/i.test(message)
  );
}
