import { describe, expect, it } from 'vitest';
import {
  shouldReconcileWhatsappConnectionStatus,
  WHATSAPP_SESSION_HEALTH_STRIKES_NEEDED,
} from '@/lib/whatsapp/whatsappSessionHealthGuard';

describe('shouldReconcileWhatsappConnectionStatus', () => {
  it('reconcilia connected, qr_pending e error', () => {
    expect(shouldReconcileWhatsappConnectionStatus('connected')).toBe(true);
    expect(shouldReconcileWhatsappConnectionStatus('qr_pending')).toBe(true);
    expect(shouldReconcileWhatsappConnectionStatus('error')).toBe(true);
    expect(shouldReconcileWhatsappConnectionStatus('disconnected')).toBe(false);
  });

  it('threshold conservador é 3', () => {
    expect(WHATSAPP_SESSION_HEALTH_STRIKES_NEEDED).toBe(3);
  });
});
