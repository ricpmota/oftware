import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createMetaChatSandboxPacienteVazio } from '@/lib/chat/metaChatSandboxPaciente';
import { META_CHAT_STEP_LOCALIZACAO } from '@/lib/meta/metaChatInicial/constants';
import { getFirstIncompleteStep } from '@/lib/meta/metaChatInicial/resume';
import { validateMetaChatStep } from '@/lib/meta/metaChatInicial/validation';
import {
  formatNationalPhone,
  IDENTIFICACAO_PHONE_ERROR,
  isValidIdentificacaoPhone,
  persistedPhoneForIdentificacao,
  toPersistedInternationalPhone,
  viewCountryFromIdentificacao,
} from '@/lib/phone/internationalPhoneValue';
import { resolveInternationalPhone } from '@/lib/whatsapp/resolveInternationalPhone';

const ROOT = resolve(__dirname, '../../..');

function readRepo(relativePath: string): string {
  return readFileSync(resolve(ROOT, relativePath), 'utf8');
}

function withPhone(
  fields: {
    telefone?: string;
    telefoneDdi?: string;
    telefonePais?: string;
    telefoneE164?: string;
  },
) {
  const base = createMetaChatSandboxPacienteVazio();
  return {
    ...base,
    dadosIdentificacao: {
      ...base.dadosIdentificacao,
      ...fields,
    },
  };
}

describe('ETAPA 3 — A/B/C Brasil e legado', () => {
  it('A) sem dados prévios a UI assume BR / 55', () => {
    const view = viewCountryFromIdentificacao({});
    expect(view.iso).toBe('BR');
    expect(view.ddi).toBe('55');
    expect(view.isLegacyBrazil).toBe(true);
  });

  it('B) Brasil 83988192848 é válido e envia 5583988192848', () => {
    const saved = toPersistedInternationalPhone('BR', '83988192848', '55');
    expect(isValidIdentificacaoPhone(saved)).toBe(true);
    expect(validateMetaChatStep(1, withPhone(saved))).toBeNull();
    expect(resolveInternationalPhone(saved)).toBe('5583988192848');
  });

  it('C) legado mascarado sem DDI → UI BR +55 e válido', () => {
    const legado = { telefone: '(83) 98819-2848' };
    const view = viewCountryFromIdentificacao(legado);
    expect(view.iso).toBe('BR');
    expect(view.ddi).toBe('55');
    expect(isValidIdentificacaoPhone(legado)).toBe(true);
    expect(validateMetaChatStep(1, withPhone(legado))).toBeNull();
    expect(getFirstIncompleteStep(withPhone(legado))).toBe(META_CHAT_STEP_LOCALIZACAO);
  });
});

describe('ETAPA 3 — D/E/F internacional', () => {
  it('D) EUA válido e envio 17137326616', () => {
    const saved = toPersistedInternationalPhone('US', '7137326616', '1');
    expect(saved).toEqual({ telefone: '7137326616', telefoneDdi: '1', telefonePais: 'US' });
    expect(isValidIdentificacaoPhone(saved)).toBe(true);
    expect(validateMetaChatStep(1, withPhone(saved))).toBeNull();
    expect(resolveInternationalPhone(saved)).toBe('17137326616');
  });

  it('E/F) Portugal 9 dígitos nacionais é válido e envia 351912345678', () => {
    const saved = toPersistedInternationalPhone('PT', '912345678', '351');
    expect(saved.telefone).toBe('912345678');
    expect(saved.telefone.length).toBe(9);
    expect(isValidIdentificacaoPhone(saved)).toBe(true);
    expect(validateMetaChatStep(1, withPhone(saved))).toBeNull();
    expect(IDENTIFICACAO_PHONE_ERROR).not.toMatch(/DDD|9º/);
    expect(resolveInternationalPhone(saved)).toBe('351912345678');
  });
});

describe('ETAPA 3 — G/H/I troca de país', () => {
  it('G) BR → US atualiza DDI/ISO e não mantém máscara BR', () => {
    const br = toPersistedInternationalPhone('BR', '83988192848', '55');
    const us = toPersistedInternationalPhone('US', br.telefone, '1');
    expect(us.telefoneDdi).toBe('1');
    expect(us.telefonePais).toBe('US');
    expect(us.telefone).toBe('83988192848');
    expect(us.telefone.startsWith('1')).toBe(false);
    expect(formatNationalPhone('US', us.telefone)).not.toMatch(/\(83\)/);
  });

  it('H) US → BR volta máscara/DDI brasileiros', () => {
    const us = toPersistedInternationalPhone('US', '7137326616', '1');
    const br = toPersistedInternationalPhone('BR', us.telefone, '55');
    expect(br.telefoneDdi).toBe('55');
    expect(br.telefonePais).toBe('BR');
    expect(br.telefone).toBe('7137326616');
    expect(formatNationalPhone('BR', '83988192848')).toBe('(83) 98819-2848');
  });

  it('I) BR → PT não concatena DDI no nacional', () => {
    const br = toPersistedInternationalPhone('BR', '83988192848', '55');
    const pt = toPersistedInternationalPhone('PT', br.telefone, '351');
    expect(pt.telefoneDdi).toBe('351');
    expect(pt.telefonePais).toBe('PT');
    expect(pt.telefone).toBe('83988192848');
    expect(pt.telefone.startsWith('351')).toBe(false);
  });
});

describe('ETAPA 3 — J/K/L persistência e retomada', () => {
  it('J) cadastro antigo sem DDI não é migrado e segue o fluxo', () => {
    const antigo = { telefone: '(83) 98819-2848' };
    expect(antigo).not.toHaveProperty('telefoneDdi');
    expect(antigo).not.toHaveProperty('telefonePais');
    expect(getFirstIncompleteStep(withPhone(antigo))).toBe(META_CHAT_STEP_LOCALIZACAO);
  });

  it('K) persistência separa nacional e DDI', () => {
    const us = persistedPhoneForIdentificacao(
      toPersistedInternationalPhone('US', '(713) 732-6616', '1'),
    );
    expect(us.telefone).toBe('7137326616');
    expect(us.telefoneDdi).toBe('1');
    expect(us.telefone).not.toBe('17137326616');
  });

  it('L) anamnese não cria telefoneE164', () => {
    const saved = persistedPhoneForIdentificacao(
      toPersistedInternationalPhone('US', '7137326616', '1'),
    );
    expect(saved).toEqual({
      telefone: '7137326616',
      telefoneDdi: '1',
      telefonePais: 'US',
    });
    expect('telefoneE164' in saved).toBe(false);

    const wizard = readRepo('components/meta/MetaPacienteWizard.tsx');
    const chat = readRepo('components/ModalDadosPacienteChat.tsx');
    expect(wizard).not.toMatch(/telefoneE164/);
    expect(chat).not.toMatch(/telefoneE164/);
  });

  it('erro do passo 1 é neutro (sem DDD)', () => {
    expect(validateMetaChatStep(1, createMetaChatSandboxPacienteVazio())).toBe(
      IDENTIFICACAO_PHONE_ERROR,
    );
    expect(IDENTIFICACAO_PHONE_ERROR).not.toMatch(/DDD|9º/);
  });
});

describe('ETAPA 3 — wiring das superfícies', () => {
  it('wizard e chat reutilizam InternationalPhoneInput', () => {
    const wizard = readRepo('components/meta/MetaPacienteWizard.tsx');
    const chat = readRepo('components/ModalDadosPacienteChat.tsx');
    expect(wizard).toContain("from '@/components/phone/InternationalPhoneInput'");
    expect(chat).toContain("from '@/components/phone/InternationalPhoneInput'");
    expect(wizard).toContain('<InternationalPhoneInput');
    expect(chat).toContain('<InternationalPhoneInput');
    expect(wizard).not.toContain('formatTelefone');
    expect(chat).not.toContain('formatTelefone');
  });
});
