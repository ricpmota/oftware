import { describe, expect, it } from 'vitest';
import { METAADMIN_GERAL_EMAIL } from '@/lib/meta/anamneseInteligenteGate';
import {
  medicoPodeSerAbertoNoRelatorio,
  ordenarMedicosDoApp,
  sessaoPodeEntrarRelatoriosMedicos,
} from './relatorioMedicoAcesso';

describe('sessaoPodeEntrarRelatoriosMedicos', () => {
  it('libera médico cadastrado e verificado', () => {
    expect(
      sessaoPodeEntrarRelatoriosMedicos({
        email: 'dra@clinica.com',
        medico: { isVerificado: true },
      }),
    ).toBe(true);
  });

  it('bloqueia médico cadastrado que ainda não foi verificado', () => {
    expect(
      sessaoPodeEntrarRelatoriosMedicos({
        email: 'dra@clinica.com',
        medico: { isVerificado: false },
      }),
    ).toBe(false);
  });

  it('bloqueia quem não tem cadastro de médico', () => {
    expect(sessaoPodeEntrarRelatoriosMedicos({ email: 'paciente@mail.com', medico: null })).toBe(false);
  });

  it('mantém o acesso do admin geral', () => {
    expect(sessaoPodeEntrarRelatoriosMedicos({ email: METAADMIN_GERAL_EMAIL, medico: null })).toBe(true);
    expect(
      medicoPodeSerAbertoNoRelatorio({ visitanteEmail: METAADMIN_GERAL_EMAIL, alvoVerificado: false }),
    ).toBe(true);
  });
});

describe('medicoPodeSerAbertoNoRelatorio', () => {
  it('só deixa entrar no relatório de médico verificado', () => {
    expect(
      medicoPodeSerAbertoNoRelatorio({ visitanteEmail: 'dra@clinica.com', alvoVerificado: true }),
    ).toBe(true);
    expect(
      medicoPodeSerAbertoNoRelatorio({ visitanteEmail: 'dra@clinica.com', alvoVerificado: false }),
    ).toBe(false);
  });
});

describe('ordenarMedicosDoApp', () => {
  it('coloca verificados primeiro e ordena pelo nome', () => {
    const lista = ordenarMedicosDoApp([
      { nome: 'Carla', isVerificado: false },
      { nome: 'Bruno', isVerificado: true },
      { nome: 'Ana', isVerificado: true },
    ]);
    expect(lista.map((item) => item.nome)).toEqual(['Ana', 'Bruno', 'Carla']);
  });
});
