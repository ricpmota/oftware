import { describe, expect, it } from 'vitest';
import {
  appendCobrancaPixInstrucao,
  MEDICO_CHAVE_PIX_MAX_LENGTH,
  normalizeMedicoChavePix,
} from './cobrancaPixMessage';

describe('normalizeMedicoChavePix', () => {
  it('trim e limita o tamanho da chave', () => {
    expect(normalizeMedicoChavePix('  11999999999  ')).toBe('11999999999');
    expect(normalizeMedicoChavePix('a'.repeat(90))).toHaveLength(MEDICO_CHAVE_PIX_MAX_LENGTH);
    expect(normalizeMedicoChavePix(null)).toBe('');
    expect(normalizeMedicoChavePix('   ')).toBe('');
  });
});

describe('appendCobrancaPixInstrucao', () => {
  const cobranca = 'Olá, Maria!\n\nValor em aberto: R$ 150,00.';

  it('não altera a mensagem se o PIX não estiver configurado', () => {
    expect(appendCobrancaPixInstrucao(cobranca, '')).toBe(cobranca);
    expect(appendCobrancaPixInstrucao(cobranca, '   ')).toBe(cobranca);
    expect(appendCobrancaPixInstrucao(cobranca, null)).toBe(cobranca);
  });

  it('inclui a chave PIX e pede o comprovante ao médico', () => {
    const text = appendCobrancaPixInstrucao(cobranca, 'medico@clinica.com');
    expect(text).toContain('Chave PIX: medico@clinica.com');
    expect(text).toContain('envie o comprovante diretamente para o médico');
    expect(text.startsWith(cobranca)).toBe(true);
  });

  it('não duplica a chave se o template já a inclui', () => {
    const comPix = `${cobranca}\n\nChave PIX: 123.456.789-00`;
    const text = appendCobrancaPixInstrucao(comPix, '123.456.789-00');
    expect(text.match(/123\.456\.789-00/g)).toHaveLength(1);
    expect(text).toContain('envie o comprovante diretamente para o médico');
  });
});
