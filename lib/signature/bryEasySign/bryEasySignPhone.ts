/**
 * BRy EasySign: campo `phone` do signatário é string no formato E.164 (ex.: +5511999999999).
 * @see https://bry-developer.readme.io/reference/post_api-service-sign-v1-signatures-1
 */
export function formatEasySignPhoneE164(raw: string | undefined): string | undefined {
  const digits = (raw || '').replace(/\D/g, '');
  if (!digits) return undefined;

  let normalized = digits;

  if (normalized.startsWith('55') && normalized.length >= 12 && normalized.length <= 15) {
    return `+${normalized}`;
  }

  if (normalized.startsWith('0')) {
    normalized = normalized.replace(/^0+/, '');
  }

  // Brasil: DDD (2) + fixo (8) ou celular (9)
  if (normalized.length >= 10 && normalized.length <= 11) {
    return `+55${normalized}`;
  }

  return undefined;
}

export function isEasySignPhoneValidationError(message: string): boolean {
  return (
    /e164|signers\[0\]\.phone|field 'phone'/i.test(message) ||
    /cannot unmarshal object.*phone/i.test(message)
  );
}
