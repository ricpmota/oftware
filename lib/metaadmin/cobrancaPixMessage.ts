/** Tamanho máximo da chave PIX (Bacen). */
export const MEDICO_CHAVE_PIX_MAX_LENGTH = 77;

export function normalizeMedicoChavePix(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  const trimmed = raw.replace(/\s+/g, ' ').trim();
  if (!trimmed) return '';
  return trimmed.slice(0, MEDICO_CHAVE_PIX_MAX_LENGTH);
}

export function buildCobrancaPixInstrucao(chavePix: string): string {
  return [
    `Chave PIX: ${chavePix}`,
    'Após o pagamento, envie o comprovante diretamente para o médico.',
  ].join('\n');
}

/**
 * Se o médico cadastrou PIX, inclui a chave na cobrança e pede o comprovante.
 * Se o texto já traz a chave (template), só acrescenta o pedido de comprovante.
 */
export function appendCobrancaPixInstrucao(
  message: string,
  chavePix: string | null | undefined
): string {
  const pix = normalizeMedicoChavePix(chavePix);
  const base = message.trimEnd();
  if (!pix) return base;
  if (base.includes(pix)) {
    if (/comprovante/i.test(base)) return base;
    return `${base}\nApós o pagamento, envie o comprovante diretamente para o médico.`;
  }
  return `${base}\n\n${buildCobrancaPixInstrucao(pix)}`;
}
