import { describe, expect, it } from 'vitest';
import { COL_PSIQUIATRAS, PSIQUIATRA_ESPECIALIDADE } from '@/features/metaPsi/metaPsi.constants';
import { mapPsiquiatraFromFirestore } from '@/services/psiquiatraService';
import { sanitizeAppNextPath } from '@/lib/landing/appNavigation';
import {
  getFirstIncompleteNutriPersonalStep,
  nutriPersonalRegistroLabel,
  nutriPersonalStepTexts,
  wizardTipoToUploadProfissao,
} from '@/lib/meta/metaNutriPersonalVerificacao';
import type { PsiquiatraDoc } from '@/features/metaPsi/metaPsi.types';

function basePsi(overrides: Partial<PsiquiatraDoc> = {}): PsiquiatraDoc {
  return {
    id: 'uid-psi',
    userId: 'uid-psi',
    email: 'psi@example.com',
    nome: 'Dra. Ana',
    registroNumero: '123456',
    crmUf: 'SP',
    rqe: '',
    especialidade: PSIQUIATRA_ESPECIALIDADE,
    telefone: '(11) 99999-9999',
    cidades: [{ estado: 'SP', cidade: 'São Paulo' }],
    isVerificado: false,
    status: 'inativo',
    medicoVinculadoIds: [],
    dataCadastro: new Date('2026-01-01T00:00:00.000Z'),
    docVerificacaoCnhUrl: 'https://example.com/cnh.png',
    docVerificacaoSelfieUrl: 'https://example.com/selfie.png',
    docVerificacaoRegistroUrl: 'https://example.com/crm.png',
    ...overrides,
  };
}

describe('MetaPsi identidade', () => {
  it('usa a collection psiquiatras', () => {
    expect(COL_PSIQUIATRAS).toBe('psiquiatras');
  });

  it('mapeia documento Firestore para PsiquiatraDoc sem campos de nutri/personal', () => {
    const mapped = mapPsiquiatraFromFirestore('abc', {
      userId: 'abc',
      email: 'a@b.com',
      nome: 'Dr. João',
      registroNumero: '999',
      crmUf: 'RJ',
      especialidade: 'Psiquiatria',
      telefone: '21999999999',
      isVerificado: true,
      status: 'ativo',
    });
    expect(mapped.id).toBe('abc');
    expect(mapped.crmUf).toBe('RJ');
    expect(mapped.especialidade).toBe('Psiquiatria');
    expect(mapped.medicoVinculadoIds).toEqual([]);
    expect(mapped).not.toHaveProperty('nutritionistId');
  });
});

describe('login /metapsi', () => {
  it('preserva /metapsi na allowlist de next', () => {
    expect(sanitizeAppNextPath('/metapsi')).toBe('/metapsi');
  });

  it('não quebra paths existentes', () => {
    expect(sanitizeAppNextPath('/metanutri')).toBe('/metanutri');
    expect(sanitizeAppNextPath('/metapersonal')).toBe('/metapersonal');
  });
});

describe('wizard psi', () => {
  it('usa CRM e não CRN/CREF', () => {
    expect(nutriPersonalRegistroLabel('psi')).toBe('CRM');
    expect(nutriPersonalRegistroLabel('nutri')).toBe('CRN');
    expect(nutriPersonalRegistroLabel('personal')).toBe('CREF');
    const texts = nutriPersonalStepTexts('psi');
    expect(texts[3]?.title).toContain('CRM');
    expect(texts[3]?.title).not.toContain('CRN');
    expect(texts[7]?.title).toContain('CRM');
  });

  it('envia upload para pasta de psiquiatra', () => {
    expect(wizardTipoToUploadProfissao('psi')).toBe('psiquiatra');
    expect(wizardTipoToUploadProfissao('nutri')).toBe('nutricionista');
  });

  it('exige UF do CRM no passo de registro', () => {
    const semUf = basePsi({ crmUf: '' });
    expect(getFirstIncompleteNutriPersonalStep(semUf, 'psi')).toBe(3);
    expect(getFirstIncompleteNutriPersonalStep(basePsi(), 'psi')).toBe(9);
  });

  it('não exige crmUf para nutricionista', () => {
    const nutriLike = basePsi({ crmUf: '' });
    expect(getFirstIncompleteNutriPersonalStep(nutriLike, 'nutri')).toBe(9);
  });
});
