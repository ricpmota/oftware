import { describe, expect, it } from 'vitest';
import type { PacienteCompleto } from '@/types/obesidade';
import { buildPacienteResultadoPublico } from '@/lib/aplicacao/pacienteResultadoPublico';

describe('buildPacienteResultadoPublico', () => {
  it('mantém evolução e protocolo e omite e-mail e telefone', () => {
    const out = buildPacienteResultadoPublico({
      id: 'p1',
      userId: 'uid-secret',
      email: 'secret@test.com',
      nome: 'Ana Silva',
      medicoResponsavelId: 'med-1',
      dadosIdentificacao: {
        nomeCompleto: 'Ana Silva',
        telefone: '11999999999',
        dataNascimento: new Date(1990, 0, 1),
        sexoBiologico: 'F',
        endereco: { cidade: 'João Pessoa', estado: 'PB' },
      },
      dadosClinicos: { medidasIniciais: { peso: 100, circunferenciaAbdominal: 110 } },
      evolucaoSeguimento: [
        { weekIndex: 1, peso: 100, doseAplicada: { quantidade: 2.5 } },
        { weekIndex: 2, peso: 98, doseAplicada: { quantidade: 2.5 } },
      ],
      planoTerapeutico: {
        numeroSemanasTratamento: 6,
        semanaInicioCiclo: 1,
        currentDoseMg: 2.5,
      },
    } as PacienteCompleto);

    expect(out?.id).toBe('p1');
    expect(out?.dadosIdentificacao?.sexoBiologico).toBe('F');
    expect(out?.evolucaoSeguimento).toHaveLength(2);
    expect(out?.planoTerapeutico?.numeroSemanasTratamento).toBe(6);
    const raw = JSON.stringify(out);
    expect(raw).not.toContain('secret@test.com');
    expect(raw).not.toContain('11999999999');
    expect(raw).not.toContain('uid-secret');
  });

  it('retorna null sem id', () => {
    expect(buildPacienteResultadoPublico({ nome: 'X' } as PacienteCompleto)).toBeNull();
  });
});
