import { describe, expect, it } from 'vitest';
import {
  EASYSIGN_ENVELOPE_NAME_MAX,
  isEasySignNameValidationError,
  sanitizeEasySignEnvelopeName,
} from '@/lib/signature/bryEasySign/bryEasySignName';

describe('sanitizeEasySignEnvelopeName', () => {
  it('mantém nome curto válido', () => {
    expect(sanitizeEasySignEnvelopeName('Contrato - Maria Silva')).toBe(
      'Contrato - Maria Silva'
    );
  });

  it('trunca em 50 caracteres', () => {
    const long = `Contrato de Tratamento - ${'Maria '.repeat(20)}Silva`;
    const out = sanitizeEasySignEnvelopeName(long);
    expect(out.length).toBeLessThanOrEqual(EASYSIGN_ENVELOPE_NAME_MAX);
    expect(out.startsWith('Contrato de Tratamento')).toBe(true);
  });

  it('remove caracteres fora do charset BRy', () => {
    expect(sanitizeEasySignEnvelopeName("João D'Angelo #42")).toBe('João D Angelo 42');
  });

  it('usa fallback quando vazio', () => {
    expect(sanitizeEasySignEnvelopeName('   ')).toBe('Documento');
    expect(sanitizeEasySignEnvelopeName('###', 'Paciente')).toBe('Paciente');
  });
});

describe('isEasySignNameValidationError', () => {
  it('reconhece erro CreateCollection.Name', () => {
    expect(
      isEasySignNameValidationError(
        "Error validating tag 'max' of field 'Name' in object 'CreateCollection.Name' of request."
      )
    ).toBe(true);
  });
});
