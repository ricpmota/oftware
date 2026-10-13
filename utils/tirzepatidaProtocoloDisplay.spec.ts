import { describe, expect, it } from 'vitest';
import type { PacienteCompleto } from '@/types/obesidade';
import { buildDepoimentoResultadoFromPaciente } from '@/utils/buildDepoimentoResultadoFromPaciente';
import {
  agruparItensPorProtocolo,
  listarProtocolosTirzepatida,
  listarSemanasTimelinePorProtocolo,
  contextoConclusaoCicloAtivo,
  progressoAplicacoesDoProtocolo,
  progressoAplicacoesProtocoloAtivo,
  protocoloDaSemanaGlobal,
  rotuloSemanaCalendario,
  semanaRelativaNoProtocolo,
  totalMgRealizadoProtocolo,
  weekIndexGlobalDaSemanaRelativa,
} from '@/utils/tirzepatidaProtocoloDisplay';
import { countAplicacoesProgress } from '@/lib/paciente/metaProgresso';

function pacienteDoisProtocolos(): PacienteCompleto {
  return {
    id: 'p1',
    nome: 'Ana',
    email: 'a@test.com',
    statusTratamento: 'em_tratamento',
    dadosClinicos: { medidasIniciais: { peso: 100, circunferenciaAbdominal: 110 } },
    evolucaoSeguimento: [
      { weekIndex: 1, peso: 100, circunferenciaAbdominal: 110, doseAplicada: { quantidade: 2.5 } },
      { weekIndex: 6, peso: 92, circunferenciaAbdominal: 102, doseAplicada: { quantidade: 5 } },
      { weekIndex: 8, peso: 90, circunferenciaAbdominal: 100, doseAplicada: { quantidade: 5 } },
      { weekIndex: 10, peso: 88, circunferenciaAbdominal: 98, doseAplicada: { quantidade: 7.5 } },
    ],
    planoTerapeutico: {
      metas: { weightLossTargetType: 'PESO_ABSOLUTO', weightLossTargetValue: 8, waistReductionTargetCm: 6 },
      startDate: new Date(2025, 5, 2),
      numeroSemanasTratamento: 6,
      semanaInicioCiclo: 8,
      currentDoseMg: 5,
      historicoProtocolosTirzepatida: [
        {
          id: 'h1',
          indice: 1,
          semanaInicioCiclo: 1,
          numeroSemanasTratamento: 6,
          metas: { weightLossTargetType: 'PESO_ABSOLUTO', weightLossTargetValue: 12, waistReductionTargetCm: 10 },
          conclusaoTratamento: { pesoFinalKg: 92, circunferenciaAbdominalFinalCm: 102 },
        },
      ],
    },
  } as PacienteCompleto;
}

describe('tirzepatidaProtocoloDisplay', () => {
  it('semana relativa: 8 com início 8 vira 1', () => {
    expect(semanaRelativaNoProtocolo(8, 8)).toBe(1);
    expect(semanaRelativaNoProtocolo(10, 8)).toBe(3);
    expect(semanaRelativaNoProtocolo(1, 1)).toBe(1);
    expect(weekIndexGlobalDaSemanaRelativa(1, 8)).toBe(8);
    expect(weekIndexGlobalDaSemanaRelativa(3, 8)).toBe(10);
  });

  it('lista protocolo 1 arquivado e 2 ativo', () => {
    const lista = listarProtocolosTirzepatida(pacienteDoisProtocolos());
    expect(lista.map((p) => p.indice)).toEqual([1, 2]);
    expect(lista[0].ativo).toBe(false);
    expect(lista[1].ativo).toBe(true);
    expect(lista[1].semanaInicioCiclo).toBe(8);
  });

  it('rótulo do calendário: semana 8 vira 1/6 · P2', () => {
    const p = pacienteDoisProtocolos();
    const proto = protocoloDaSemanaGlobal(p, 8);
    expect(rotuloSemanaCalendario(8, proto).texto).toBe('1/6 · P2');
    expect(rotuloSemanaCalendario(1, protocoloDaSemanaGlobal(p, 1)).texto).toBe('1/6');
    const bar = progressoAplicacoesDoProtocolo(p, proto);
    expect(bar.total).toBe(6);
    expect(bar.aplicadas).toBe(2);
  });

  it('progresso da lista de pacientes usa só o protocolo ativo, não o histórico', () => {
    const p = pacienteDoisProtocolos();
    const ativo = progressoAplicacoesProtocoloAtivo(p);
    expect(ativo.total).toBe(6);
    expect(ativo.aplicadas).toBe(2);
    expect(countAplicacoesProgress(p)).toMatchObject({ feitas: 2, total: 6 });
    const todosProtocolos = listarProtocolosTirzepatida(p);
    const primeiro = progressoAplicacoesDoProtocolo(p, todosProtocolos[0]);
    expect(primeiro.aplicadas).toBe(2);
    expect(primeiro.aplicadas + ativo.aplicadas).toBe(4);
  });

  it('não soma o protocolo 1 quando o plano vigente omite semanaInicioCiclo', () => {
    const p = pacienteDoisProtocolos();
    p.planoTerapeutico!.numeroSemanasTratamento = 18;
    delete p.planoTerapeutico!.semanaInicioCiclo;
    const ativo = progressoAplicacoesProtocoloAtivo(p);
    expect(ativo.aplicadas).toBe(2);
    expect(ativo.total).toBe(18);
    expect(countAplicacoesProgress(p)).toMatchObject({ feitas: 2, total: 18 });
  });

  it('agrupa semanas globais no protocolo certo e conclusão no ciclo', () => {
    const p = pacienteDoisProtocolos();
    const grupos = agruparItensPorProtocolo(p, [1, 6, 7, 8, 10, 14], (w) => w);
    expect(grupos[0].items).toEqual([1, 6, 7]);
    expect(grupos[1].items).toEqual([8, 10, 14]);
    expect(semanaRelativaNoProtocolo(8, grupos[1].proto.semanaInicioCiclo)).toBe(1);
  });

  it('timeline do protocolo 2 inclui semanas planejadas mesmo sem registro', () => {
    const p = pacienteDoisProtocolos();
    const grupos = listarSemanasTimelinePorProtocolo(p);
    const p2 = grupos.find((g) => g.proto.indice === 2);
    expect(p2).toBeTruthy();
    expect(p2!.items.map((i) => i.weekIndex)).toEqual([8, 9, 10, 11, 12, 13, 14]);
    expect(p2!.items[0].registro?.weekIndex).toBe(8);
    expect(p2!.items[1].registro).toBeNull();
    expect(semanaRelativaNoProtocolo(p2!.items[0].weekIndex, p2!.proto.semanaInicioCiclo)).toBe(1);
  });

  it('texto usa a semana atual e a barra separa pulos em vermelho', () => {
    const inicio = new Date(2026, 0, 5);
    const hoje = new Date(inicio);
    hoje.setDate(inicio.getDate() + 13 * 7);
    const evolucao = [];
    for (let semana = 1; semana <= 10; semana++) {
      evolucao.push({ weekIndex: semana, doseAplicada: { quantidade: 2.5 } });
    }
    evolucao.push({ weekIndex: 14, doseAplicada: { quantidade: 5 } });
    const p = {
      id: 'p-faixa',
      nome: 'Lia',
      email: 'l@test.com',
      statusTratamento: 'em_tratamento',
      evolucaoSeguimento: evolucao,
      planoTerapeutico: {
        metas: {},
        startDate: inicio,
        numeroSemanasTratamento: 20,
        currentDoseMg: 2.5,
      },
    } as PacienteCompleto;
    const proto = listarProtocolosTirzepatida(p).find((item) => item.ativo)!;
    const bar = progressoAplicacoesDoProtocolo(p, proto, hoje);
    expect(bar.total).toBe(20);
    expect(bar.aplicadas).toBe(11);
    expect(bar.posicao).toBe(14);
    expect(bar.pendentesAFrente).toBe(6);
    expect(bar.segmentos).toEqual([
      { estado: 'aplicada', quantidade: 10 },
      { estado: 'pulada', quantidade: 3 },
      { estado: 'aplicada', quantidade: 1 },
      { estado: 'pendente', quantidade: 6 },
    ]);
  });

  it('conclusão do ciclo ativo aponta para o protocolo 2 e não reusa a semana 1', () => {
    const p = pacienteDoisProtocolos();
    const ctx = contextoConclusaoCicloAtivo(p);
    expect(ctx.proto.indice).toBe(2);
    expect(ctx.semanaGlobal).toBe(14);
    expect(ctx.semanaRelativa).toBe(7);
    expect(ctx.registro).toBeNull();
  });
});

describe('totalMgRealizadoProtocolo', () => {
  it('conta a dose do esquema nas semanas já passadas sem registro e ignora futura e perdida', () => {
    const paciente = {
      id: 'p-mg',
      nome: 'Lia',
      email: 'lia@test.com',
      statusTratamento: 'em_tratamento',
      evolucaoSeguimento: [
        {
          weekIndex: 1,
          dataRegistro: new Date(2026, 0, 5),
          doseAplicada: { quantidade: 5, data: new Date(2026, 0, 5), horario: '08:00' },
        },
        {
          weekIndex: 3,
          dataRegistro: new Date(2026, 0, 19),
          adherence: 'MISSED',
          doseAplicada: { quantidade: 2.5, data: new Date(2026, 0, 19), horario: '08:00' },
        },
      ],
      planoTerapeutico: {
        metas: {},
        startDate: new Date(2026, 0, 5),
        numeroSemanasTratamento: 4,
        semanaInicioCiclo: 1,
        currentDoseMg: 2.5,
      },
    } as PacienteCompleto;

    const proto = listarProtocolosTirzepatida(paciente)[0];
    const total = totalMgRealizadoProtocolo(paciente, proto, new Date(2026, 0, 20));
    expect(total).toBe(7.5);
  });
});

describe('buildDepoimentoResultadoFromPaciente por protocolo', () => {
  it('protocolo 2 usa peso/circ da semana 1 do ciclo (weekIndex 8) e eixo S1', () => {
    const d = buildDepoimentoResultadoFromPaciente(pacienteDoisProtocolos(), 0, '', {
      protocoloIndice: 2,
    });
    expect(d.protocoloIndice).toBe(2);
    expect(d.pesoInicialKg).toBe(90);
    expect(d.comprimentoAbdominalInicialCm).toBe(100);
    expect(d.pesoAtualKg).toBe(88);
    expect(d.evolucao[0]?.weekIndex).toBe(1);
    expect(d.evolucao[0]?.peso).toBe(90);
    expect(d.metaPesoKgLoss).toBe(8);
    expect(d.metaAbdominalCmLoss).toBe(6);
  });

  it('protocolo 1 usa weekIndex 1 e metas arquivadas', () => {
    const d = buildDepoimentoResultadoFromPaciente(pacienteDoisProtocolos(), 0, '', {
      protocoloIndice: 1,
    });
    expect(d.protocoloIndice).toBe(1);
    expect(d.pesoInicialKg).toBe(100);
    expect(d.comprimentoAbdominalInicialCm).toBe(110);
    expect(d.pesoAtualKg).toBe(92);
    expect(d.evolucao[0]?.weekIndex).toBe(1);
    expect(d.metaPesoKgLoss).toBe(12);
    expect(d.metaAbdominalCmLoss).toBe(10);
  });
});
