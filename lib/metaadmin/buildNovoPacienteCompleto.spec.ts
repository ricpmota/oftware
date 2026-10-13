import { describe, expect, it } from 'vitest';
import { isValidFirebaseAuthUid } from '@/lib/firebase/isValidAuthUid';
import {
  buildNovoPacienteCompleto,
  pacienteTemTelefoneParaWhatsapp,
  sincronizarIdentificacaoPaciente,
  validarEmailGmailPaciente,
} from './buildNovoPacienteCompleto';

describe('buildNovoPacienteCompleto', () => {
  it('cria paciente pendente com userId temporário (ainda sem Google Auth)', () => {
    const paciente = buildNovoPacienteCompleto({
      medicoId: 'medico-1',
      medicoUserId: 'xY7kL2mN9pQ4rS8tU1vW3zA5',
    });
    expect(paciente.id).toBe('');
    expect(paciente.medicoResponsavelId).toBe('medico-1');
    expect(paciente.statusTratamento).toBe('pendente');
    expect(paciente.dadosIdentificacao.telefoneDdi).toBe('55');
    expect(paciente.dadosIdentificacao.telefonePais).toBe('BR');
    expect(isValidFirebaseAuthUid(paciente.userId)).toBe(false);
  });
});

describe('pacienteTemTelefoneParaWhatsapp', () => {
  it('exige pelo menos 10 dígitos', () => {
    expect(
      pacienteTemTelefoneParaWhatsapp({
        dadosIdentificacao: { nomeCompleto: '', email: '', dataCadastro: new Date(), endereco: {}, telefone: '(83) 99999-0000' },
      }),
    ).toBe(true);
    expect(
      pacienteTemTelefoneParaWhatsapp({
        dadosIdentificacao: { nomeCompleto: '', email: '', dataCadastro: new Date(), endereco: {}, telefone: '123' },
      }),
    ).toBe(false);
  });
});

describe('sincronizarIdentificacaoPaciente', () => {
  it('copia nome e e-mail da identificação para os campos raiz', () => {
    const base = buildNovoPacienteCompleto({ medicoId: 'm1', medicoUserId: 'uid1' });
    const synced = sincronizarIdentificacaoPaciente({
      ...base,
      dadosIdentificacao: {
        ...base.dadosIdentificacao,
        nomeCompleto: ' Ana Silva ',
        email: 'Ana.Silva@gmail.com',
      },
    });
    expect(synced.nome).toBe('Ana Silva');
    expect(synced.email).toBe('ana.silva@gmail.com');
  });
});

describe('validarEmailGmailPaciente', () => {
  it('aceita gmail e rejeita outros', () => {
    expect(validarEmailGmailPaciente('a@gmail.com')).toBeNull();
    expect(validarEmailGmailPaciente('a@hotmail.com')).toMatch(/gmail/i);
  });
});
