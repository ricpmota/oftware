import {
  buildWhatsappUrl,
  resolveWhatsappCanonicalDigits,
  type InternationalPhoneFields,
} from '@/lib/phone/buildWhatsappUrl';
import { phoneFieldsFromProfessional } from '@/lib/whatsapp/resolveProfessionalPhone';

export function normalizeMedicoTelefoneWhatsApp(
  telefoneOrFields: string | InternationalPhoneFields | null | undefined,
): string | null {
  if (telefoneOrFields && typeof telefoneOrFields === 'object') {
    return resolveWhatsappCanonicalDigits(telefoneOrFields);
  }
  return resolveWhatsappCanonicalDigits({ telefone: telefoneOrFields });
}

export function getMedicoWhatsAppUrl(
  telefoneOrFields: string | InternationalPhoneFields | null | undefined,
  message?: string,
): string | null {
  if (telefoneOrFields && typeof telefoneOrFields === 'object') {
    return buildWhatsappUrl(telefoneOrFields, message?.trim() || undefined);
  }
  return buildWhatsappUrl(
    phoneFieldsFromProfessional({ telefone: telefoneOrFields }),
    message?.trim() || undefined,
  );
}
