/**
 * href tel: — separado de wa.me.
 * Representação E.164 com '+': tel:+17137326616
 */
import { resolveWhatsappCanonicalDigits, type InternationalPhoneFields } from '@/lib/phone/buildWhatsappUrl';

export function buildTelHref(fields: InternationalPhoneFields): string | null {
  const digits = resolveWhatsappCanonicalDigits(fields);
  if (!digits) return null;
  return `tel:+${digits}`;
}
