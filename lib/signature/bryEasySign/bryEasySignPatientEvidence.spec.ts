import { describe, expect, it } from 'vitest';
import { buildContratoTratamentoPatientEasySignEvidenceFooterLines } from '@/lib/signature/contratoTratamentoPatientSignedPdfVisualFooter';

describe('buildContratoTratamentoPatientEasySignEvidenceFooterLines', () => {
  it('inclui nome, data, IP, geolocalização e autenticações', () => {
    const lines = buildContratoTratamentoPatientEasySignEvidenceFooterLines({
      envelopeId: 'env-123',
      signerNonce: 'paciente-abc',
      name: 'Maria Silva',
      email: 'maria@test.com',
      cpf: '123.456.789-01',
      signedAt: new Date('2026-06-08T15:30:00Z'),
      ipAddress: '177.10.20.30',
      geolocationLabel: '-7.11950, -34.84500',
      authenticationMethods: ['Geolocalização', 'Endereço IP', 'Confirmação por e-mail (OTP)'],
    });

    const joined = lines.join('\n');
    expect(joined).toMatch(/Maria Silva/);
    expect(joined).toMatch(/177\.10\.20\.30/);
    expect(joined).toMatch(/-7\.11950, -34\.84500/);
    expect(joined).toMatch(/maria@test\.com/);
    expect(joined).toMatch(/123\.456\.789-01/);
    expect(joined).toMatch(/env-123/);
    expect(joined).toMatch(/BRy EasySign/);
  });
});
