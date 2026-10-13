import { describe, expect, it } from 'vitest';
import type { PacienteCompleto } from '@/types/obesidade';
import {
  ehPrimeiraSemanaDoProtocolo,
  resolverWeekIndexAplicacaoPublica,
} from '@/lib/aplicacao/resolverWeekIndexAplicacaoPublica';

function pacienteProtocolo2(): PacienteCompleto {
  const inicio2 = new Date(2025, 5, 2);
  return {
    id: 'p1',
    nome: 'Ana',
    email: 'a@test.com',
    statusTratamento: 'em_tratamento',
    evolucaoSeguimento: [
      { weekIndex: 1, peso: 100, doseAplicada: { quantidade: 2.5, data: new Date(2025, 0, 6) } },
      { weekIndex: 6, peso: 92, doseAplicada: { quantidade: 5, data: new Date(2025, 1, 10) } },
    ],
    planoTerapeutico: {
      metas: {},
      startDate: inicio2,
      dataInicioTratamento: inicio2,
      numeroSemanasTratamento: 6,
      semanaInicioCiclo: 8,
      currentDoseMg: 5,
      historicoProtocolosTirzepatida: [
        {
          id: 'h1',
          indice: 1,
          semanaInicioCiclo: 1,
          numeroSemanasTratamento: 6,
          startDate: new Date(2025, 0, 6),
        },
      ],
    },
  } as PacienteCompleto;
}

describe('resolverWeekIndexAplicacaoPublica', () => {
  it('protocolo 1: semana 1 permanece 1', () => {
    const p = pacienteProtocolo2();
    p.planoTerapeutico = {
      ...p.planoTerapeutico!,
      semanaInicioCiclo: 1,
      startDate: new Date(2025, 0, 6),
      historicoProtocolosTirzepatida: undefined,
    };
    expect(
      resolverWeekIndexAplicacaoPublica({
        paciente: p,
        semanaLink: 1,
        dataLink: '2025-01-06',
      })
    ).toBe(1);
  });

  it('protocolo 2: semana global 8 permanece 8', () => {
    expect(
      resolverWeekIndexAplicacaoPublica({
        paciente: pacienteProtocolo2(),
        semanaLink: 8,
        dataLink: '2025-06-02',
      })
    ).toBe(8);
  });

  it('protocolo 2: link com semana relativa 1 na data de início grava na semana 8', () => {
    expect(
      resolverWeekIndexAplicacaoPublica({
        paciente: pacienteProtocolo2(),
        semanaLink: 1,
        dataLink: '2025-06-02',
      })
    ).toBe(8);
  });

  it('aceita semana do link como string', () => {
    expect(
      resolverWeekIndexAplicacaoPublica({
        paciente: pacienteProtocolo2(),
        semanaLink: '8',
        dataLink: '2025-06-02',
      })
    ).toBe(8);
  });

  it('não remapeia semana 1 de um link antigo do protocolo 1', () => {
    expect(
      resolverWeekIndexAplicacaoPublica({
        paciente: pacienteProtocolo2(),
        semanaLink: 1,
        dataLink: '2025-01-06',
      })
    ).toBe(1);
  });

  it('ehPrimeiraSemanaDoProtocolo: semana 8 do ciclo 2 e semana 1 do ciclo 1', () => {
    const p = pacienteProtocolo2();
    expect(ehPrimeiraSemanaDoProtocolo(p, 8)).toBe(true);
    expect(ehPrimeiraSemanaDoProtocolo(p, 9)).toBe(false);
    expect(ehPrimeiraSemanaDoProtocolo(p, 1)).toBe(true);
    expect(ehPrimeiraSemanaDoProtocolo(p, 6)).toBe(false);
  });
});
