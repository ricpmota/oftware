import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  buildPrescriptionPublicPdfUrl,
  buildPrescriptionPublicValidationUrl,
  PRESCRIPTION_PUBLIC_APP_URL_DEFAULT,
  resolvePrescriptionDocumentPublicBaseUrl,
} from '@/lib/signature/prescriptionPublicDocumentUrls';

describe('prescriptionPublicDocumentUrls', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('usa PUBLIC_APP_URL quando definida', () => {
    vi.stubEnv('PUBLIC_APP_URL', 'https://www.oftware.com.br');
    vi.stubEnv('NEXT_PUBLIC_APP_URL', '');
    vi.stubEnv('VERCEL_URL', 'oftware-site-final-xxx.vercel.app');
    expect(resolvePrescriptionDocumentPublicBaseUrl()).toBe('https://www.oftware.com.br');
  });

  it('ignora VERCEL_URL mesmo sem PUBLIC_APP_URL', () => {
    vi.stubEnv('PUBLIC_APP_URL', '');
    vi.stubEnv('NEXT_PUBLIC_APP_URL', '');
    vi.stubEnv('VERCEL_URL', 'oftware-site-final-xxx.vercel.app');
    expect(resolvePrescriptionDocumentPublicBaseUrl()).toBe(PRESCRIPTION_PUBLIC_APP_URL_DEFAULT);
  });

  it('rejeita base vercel.app em env e cai no domínio oficial', () => {
    vi.stubEnv('PUBLIC_APP_URL', 'https://oftware-site-final-abc.vercel.app');
    expect(resolvePrescriptionDocumentPublicBaseUrl()).toBe(PRESCRIPTION_PUBLIC_APP_URL_DEFAULT);
  });

  it('monta URLs de validação e PDF oficiais', () => {
    vi.stubEnv('PUBLIC_APP_URL', 'https://www.oftware.com.br');
    expect(buildPrescriptionPublicValidationUrl('OFTW-RE-4HEWEVWW')).toBe(
      'https://www.oftware.com.br/prescricao/documento?codigo=OFTW-RE-4HEWEVWW'
    );
    expect(buildPrescriptionPublicPdfUrl('OFTW-RE-4HEWEVWW')).toBe(
      'https://www.oftware.com.br/prescricao/documento?_format=application/pdf&codigo=OFTW-RE-4HEWEVWW'
    );
  });

  it('normaliza oftware.com.br sem www', () => {
    vi.stubEnv('PUBLIC_APP_URL', 'https://oftware.com.br');
    expect(resolvePrescriptionDocumentPublicBaseUrl()).toBe('https://www.oftware.com.br');
  });
});
