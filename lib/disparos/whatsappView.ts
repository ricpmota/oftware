import { DISPAROS_WHATSAPP_SESSION_ID } from '@/lib/disparos/constants';
import { formatDisparoPhoneDisplay } from '@/lib/disparos/normalizeDisparoPhone';
import type { DisparosWhatsappStatus, DisparosWhatsappView } from '@/lib/disparos/types';

export function initialDisparosWhatsappView(): DisparosWhatsappView {
  return {
    status: 'disconnected',
    phone: null,
    profileName: null,
    sessionId: DISPAROS_WHATSAPP_SESSION_ID,
    qrCode: null,
    updatedAt: null,
    errorMessage: null,
  };
}

export function formatDisparosConnectedPhone(phone: string | null | undefined): string | null {
  if (!phone?.trim()) return null;
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 12 || digits.length === 13) return formatDisparoPhoneDisplay(digits);
  return phone.trim();
}

export function disparosViewFromConnection(input: {
  status?: string | null;
  phone?: string | null;
  profileName?: string | null;
  qrCode?: string | null;
  updatedAt?: string | null;
  lastCheckAt?: string | null;
  errorMessage?: string | null;
} | null, fallback: DisparosWhatsappStatus = 'disconnected'): DisparosWhatsappView {
  const status = mapDisparosStatus(input?.status, fallback);
  return {
    status,
    phone: status === 'connected' ? formatDisparosConnectedPhone(input?.phone) : null,
    profileName: status === 'connected' ? input?.profileName?.trim() || null : null,
    sessionId: DISPAROS_WHATSAPP_SESSION_ID,
    qrCode: status === 'qr_pending' ? input?.qrCode?.trim() || null : null,
    updatedAt: input?.updatedAt || input?.lastCheckAt || null,
    errorMessage: status === 'error' || status === 'unavailable' ? input?.errorMessage?.trim() || null : null,
  };
}

function mapDisparosStatus(status: string | null | undefined, fallback: DisparosWhatsappStatus): DisparosWhatsappStatus {
  if (status === 'connected') return 'connected';
  if (status === 'qr_pending') return 'qr_pending';
  if (status === 'connecting') return 'connecting';
  if (status === 'error') return 'error';
  if (status === 'unavailable') return 'unavailable';
  if (status === 'disconnected') return 'disconnected';
  return fallback;
}
