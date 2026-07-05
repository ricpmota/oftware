export function signersFromStatusPayload(data: Record<string, unknown>): Record<string, unknown>[] {
  const candidates = [data.signers, data.signersData, data.signatureSigners];
  for (const c of candidates) {
    if (Array.isArray(c) && c.length) {
      return c as Record<string, unknown>[];
    }
  }
  return [];
}

export function envelopeStatusValue(data: Record<string, unknown>): string {
  return String(data.status || data.signatureStatus || data.situation || data.state || '')
    .trim()
    .toUpperCase();
}
