import { describe, expect, it } from 'vitest';
import { matchBroadcastPatientView } from '@/lib/match/matchBroadcastPatient';

describe('paciente da lista de disparo', () => {
  it('usa o nome completo do cadastro e só o final do telefone', () => {
    const patient = matchBroadcastPatientView(
      'abc123',
      {
        nome: 'Ana',
        dadosIdentificacao: { nomeCompleto: 'Ana Lima Souza', endereco: { cidade: 'João Pessoa' } },
        status: 'ativo',
        statusTratamento: 'em_tratamento',
      },
      '5583999991234',
    );
    expect(patient.name).toBe('Ana Lima Souza');
    expect(patient.city).toBe('João Pessoa');
    expect(patient.hasPhone).toBe(true);
    expect(patient.phoneTail).toBe('1234');
    expect(patient.phoneTail).not.toBe('5583999991234');
  });

  it('entra na lista mesmo sem telefone e sem Match', () => {
    const patient = matchBroadcastPatientView('sem-match', { nome: 'Lia' }, null);
    expect(patient.name).toBe('Lia');
    expect(patient.hasPhone).toBe(false);
    expect(patient.phoneTail).toBeNull();
  });
});
