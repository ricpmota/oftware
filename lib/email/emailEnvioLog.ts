/** Valor gravado em `email_envios.provedor` para envios pelo SMTP ZeptoMail. */
export const TRANSACTIONAL_EMAIL_PROVIDER = 'ZeptoMail' as const;

/**
 * Campos padronizados para registros em `email_envios` após envio transacional.
 * Use junto aos demais campos do documento (leadId, assunto, status, etc.).
 */
export function zeptoEnvioFields(messageId?: string | null): {
  provedor: typeof TRANSACTIONAL_EMAIL_PROVIDER;
  messageId?: string;
} {
  const out: { provedor: typeof TRANSACTIONAL_EMAIL_PROVIDER; messageId?: string } = {
    provedor: TRANSACTIONAL_EMAIL_PROVIDER,
  };
  if (messageId != null && String(messageId).trim() !== '') {
    out.messageId = String(messageId);
  }
  return out;
}
