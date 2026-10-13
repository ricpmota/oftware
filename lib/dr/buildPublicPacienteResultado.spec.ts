import { describe, expect, it } from 'vitest';
import { buildPublicPacienteResultado } from '@/lib/dr/buildPublicPacienteResultado';

describe('buildPublicPacienteResultado', () => {
  it('retorna null quando não há evolução nem medidas', () => {
    expect(buildPublicPacienteResultado({ nome: 'Maria Silva' }, 'p1', 'Maria Silva')).toBeNull();
  });

  it('monta métricas de peso a partir da evolução', () => {
    const resultado = buildPublicPacienteResultado(
      {
        nome: 'Maria Silva',
        dadosIdentificacao: {
          nomeCompleto: 'Maria Silva',
          endereco: { cidade: 'João Pessoa', estado: 'PB' },
        },
        evolucaoSeguimento: [
          { weekIndex: 1, peso: 90, doseAplicada: { quantidade: 2.5 } },
          { weekIndex: 4, peso: 84, doseAplicada: { quantidade: 5 } },
        ],
      },
      'p1',
      'Maria'
    );

    expect(resultado).not.toBeNull();
    expect(resultado?.nome).toBe('Maria Silva');
    expect(resultado?.cidadeEstado).toBe('João Pessoa-PB');
    expect(resultado?.pesoInicialKg).toBe(90);
    expect(resultado?.pesoAtualKg).toBe(84);
    expect(resultado?.perdaTotalKg).toBe(6);
    expect(resultado?.perdaPercentual).toBeCloseTo(6.666, 2);
    expect(resultado?.evolucao).toHaveLength(2);
    expect(resultado?.evolucao[1]).toMatchObject({ weekIndex: 4, peso: 84, doseMg: 5 });
  });
});
