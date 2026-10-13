import { describe, expect, it } from 'vitest';
import type { PacienteCompleto } from '@/types/obesidade';
import {
  dataGradeSemanal,
  primeiraDoseDoPlano,
  semanaIndexConclusao,
  semanaInicioCicloDoPlano,
} from '@/utils/datasAplicacaoSemanaPlano';
import { buildSemanasEsquemaDoses } from '@/utils/esquemaDosesSemana';
import {
  apagarProtocoloTirzepatidaAtivo,
  criarNovoProtocoloTirzepatida,
  podeCriarNovoProtocoloTirzepatida,
} from '@/utils/tirzepatidaNovoProtocolo';

function ymd(d: Date) {
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function pacienteCiclo1(): PacienteCompleto {
  return {
    id: 'p1',
    nome: 'Teste',
    email: 't@test.com',
    statusTratamento: 'concluido',
    evolucaoSeguimento: [],
    planoTerapeutico: {
      metas: {},
      startDate: new Date(2025, 0, 6),
      numeroSemanasTratamento: 6,
      currentDoseMg: 2.5,
      conclusaoTratamento: { dataConclusao: new Date(2025, 1, 24), pesoFinalKg: 90 },
    },
  } as PacienteCompleto;
}

describe('novo protocolo Tirzepatida', () => {
  it('ciclo 1: conclusão é última aplicação + 1 (semana 7)', () => {
    const p = pacienteCiclo1();
    expect(semanaIndexConclusao(p.planoTerapeutico!)).toBe(7);
    expect(semanaInicioCicloDoPlano(p.planoTerapeutico)).toBe(1);
  });

  it('pode criar após conclusão preenchida', () => {
    expect(podeCriarNovoProtocoloTirzepatida(pacienteCiclo1())).toBe(true);
  });

  it('novo ciclo começa na semana da conclusão + 1 e guarda o protocolo 1', () => {
    const next = criarNovoProtocoloTirzepatida(pacienteCiclo1());
    const plano = next.planoTerapeutico!;
    expect(plano.semanaInicioCiclo).toBe(8);
    expect(plano.startDate).toBeUndefined();
    expect(plano.conclusaoTratamento).toBeUndefined();
    expect(plano.historicoProtocolosTirzepatida).toHaveLength(1);
    expect(plano.historicoProtocolosTirzepatida?.[0].indice).toBe(1);
    expect(plano.historicoProtocolosTirzepatida?.[0].numeroSemanasTratamento).toBe(6);
    expect(next.statusTratamento).toBe('em_tratamento');
  });

  it('data da primeira semana do ciclo 2 = data de início do ciclo 2', () => {
    const next = criarNovoProtocoloTirzepatida(pacienteCiclo1());
    const inicio2 = new Date(2025, 5, 2);
    const plano = {
      ...next.planoTerapeutico!,
      startDate: inicio2,
      dataInicioTratamento: inicio2,
    };
    const paciente = { ...next, planoTerapeutico: plano } as PacienteCompleto;
    const primeira = primeiraDoseDoPlano(plano)!;
    const semana8 = dataGradeSemanal(primeira, 8, semanaInicioCicloDoPlano(plano));
    expect(ymd(semana8)).toBe(ymd(inicio2));

    const built = buildSemanasEsquemaDoses(paciente);
    const aplicacoes = built?.semanas.filter((s) => !s.isConclusao) || [];
    expect(aplicacoes[0]?.semana).toBe(8);
    expect(ymd(aplicacoes[0].data)).toBe(ymd(inicio2));
  });

  it('apagar o protocolo 02 restaura o 01 como concluído e tira a evolução do ciclo novo', () => {
    const p2 = criarNovoProtocoloTirzepatida({
      ...pacienteCiclo1(),
      evolucaoSeguimento: [
        { weekIndex: 1, peso: 100 },
        { weekIndex: 8, peso: 90 },
      ],
      alertas: [
        { id: 'a1', linkedWeek: 1 },
        { id: 'a2', linkedWeek: 8 },
        { id: 'a3' },
      ],
    } as PacienteCompleto);
    expect(p2.planoTerapeutico?.historicoConclusoesTratamento).toHaveLength(1);

    const back = apagarProtocoloTirzepatidaAtivo(p2);
    expect(back.statusTratamento).toBe('concluido');
    expect(back.planoTerapeutico?.historicoProtocolosTirzepatida || []).toHaveLength(0);
    expect(back.planoTerapeutico?.startDate).toEqual(new Date(2025, 0, 6));
    expect(back.planoTerapeutico?.conclusaoTratamento).toMatchObject({ pesoFinalKg: 90 });
    expect(back.planoTerapeutico?.historicoConclusoesTratamento).toBeUndefined();
    expect(back.planoTerapeutico?.semanaInicioCiclo).toBe(1);
    expect(back.evolucaoSeguimento?.map((e) => e.weekIndex)).toEqual([1]);
    expect(back.alertas?.map((a) => a.id)).toEqual(['a1', 'a3']);
  });

  it('apagar o protocolo 03 volta ao protocolo 02 concluído', () => {
    const p2 = criarNovoProtocoloTirzepatida(pacienteCiclo1());
    const comInicio = {
      ...p2,
      planoTerapeutico: {
        ...p2.planoTerapeutico!,
        startDate: new Date(2025, 5, 2),
        dataInicioTratamento: new Date(2025, 5, 2),
        numeroSemanasTratamento: 4,
        conclusaoTratamento: { dataConclusao: new Date(2025, 6, 7), pesoFinalKg: 80 },
      },
    } as PacienteCompleto;
    const p3 = criarNovoProtocoloTirzepatida(comInicio);
    const back = apagarProtocoloTirzepatidaAtivo(p3);

    expect(back.statusTratamento).toBe('concluido');
    expect(back.planoTerapeutico?.historicoProtocolosTirzepatida).toHaveLength(1);
    expect(back.planoTerapeutico?.historicoProtocolosTirzepatida?.[0].indice).toBe(1);
    expect(back.planoTerapeutico?.semanaInicioCiclo).toBe(8);
    expect(back.planoTerapeutico?.startDate).toEqual(new Date(2025, 5, 2));
    expect(back.planoTerapeutico?.conclusaoTratamento).toMatchObject({ pesoFinalKg: 80 });
    expect(back.planoTerapeutico?.numeroSemanasTratamento).toBe(4);
  });

  it('apagar o único protocolo limpa o plano e mantém o status', () => {
    const unico = {
      ...pacienteCiclo1(),
      statusTratamento: 'em_tratamento' as const,
      planoTerapeutico: {
        ...pacienteCiclo1().planoTerapeutico!,
        conclusaoTratamento: undefined,
      },
    };
    const back = apagarProtocoloTirzepatidaAtivo(unico);
    expect(back.statusTratamento).toBe('em_tratamento');
    expect(back.planoTerapeutico?.startDate).toBeUndefined();
    expect(back.planoTerapeutico?.numeroSemanasTratamento).toBeUndefined();
  });
});
