export function normalizeMedicoTelefoneWhatsApp(telefone: string | null | undefined): string | null {
  if (!telefone) return null;
  const digits = telefone.replace(/\D/g, '');
  if (digits.length < 10) return null;
  return digits.startsWith('55') ? digits : `55${digits}`;
}

export function getMedicoWhatsAppUrl(
  telefone: string | null | undefined,
  message?: string,
): string | null {
  const normalized = normalizeMedicoTelefoneWhatsApp(telefone);
  if (!normalized) return null;
  const base = `https://wa.me/${normalized}`;
  if (!message?.trim()) return base;
  return `${base}?text=${encodeURIComponent(message.trim())}`;
}
