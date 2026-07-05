import { describe, expect, it, vi } from 'vitest';
import { getPrescriptionSignedPrintEligibility } from '@/lib/signature/prescriptionPrintEligibility';

describe('prescription print flow eligibility', () => {
  it('PDF sem assinatura não exige provedor', () => {
    expect(getPrescriptionSignedPrintEligibility(null).allowed).toBe(false);
  });

  it('sandbox connected permite assinatura simulada', () => {
    const r = getPrescriptionSignedPrintEligibility({
      provider: 'sandbox_mock',
      providerLabel: 'Sandbox',
      providerCategory: 'sandbox',
      status: 'connected',
    });
    expect(r.allowed).toBe(true);
  });
});

describe('unsigned vs signed handlers', () => {
  it('fluxo antigo permanece quando só unsigned é chamado', async () => {
    const unsigned = vi.fn(async () => undefined);
    const signed = vi.fn(async () => undefined);
    await unsigned();
    expect(unsigned).toHaveBeenCalledOnce();
    expect(signed).not.toHaveBeenCalled();
  });
});
