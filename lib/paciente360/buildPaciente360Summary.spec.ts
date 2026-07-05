import { describe, expect, it } from 'vitest';
import type { PacienteCompleto } from '@/types/obesidade';
import type { PagamentoPaciente } from '@/types/pagamento';
import type { Lembrete } from '@/types/lembrete';
import { buildPaciente360Summary } from '@/lib/paciente360/buildPaciente360Summary';

const NOW = new Date(2026, 5, 21, 12, 0, 0);

function pacienteBase(overrides: Partial<PacienteCompleto> = {}): PacienteCompleto {
  return {
    id: 'p-1',
    userId: 'u-1',
    email: 'paciente@test.com',
    nome: 'Maria Silva',
    medicoResponsavelId: 'm-1',
    dadosIdentificacao: {
      nomeCompleto: 'Maria Silva',
      email: 'paciente@test.com',
      dataCadastro: new Date(2026, 0, 1),
      endereco: {},
    },
    dadosClinicos: {
      medidasIniciais: { peso: 100, altura: 165, imc: 36.7, circunferenciaAbdominal: 110 },
    },
    estiloVida: {},
    examesLaboratoriais: [],
    planoTerapeutico: {
      metas: {},
      startDate: new Date(2026, 2, 1),
      numeroSemanasTratamento: 18,
      currentDoseMg: 2.5,
      injectionDayOfWeek: 'seg',
    },
    evolucaoSeguimento: [],
    alertas: [],
    comunicacao: { mensagens: [], anexos: [], logsAuditoria: [] },
    indicadores: {
      tempoEmTratamento: { dias: 0, semanas: 0 },
      adesaoMedia: 0,
      incidenciaEfeitosAdversos: { total: 0, grave: 0, moderado: 0, leve: 0 },
    },
    dataCadastro: new Date(2026, 0, 1),
    status: 'ativo',
    statusTratamento: 'em_tratamento',
    ...overrides,
  };
}

describe('buildPaciente360Summary', () => {
  it('retorna pendente quando plano não foi iniciado', () => {
    const paciente = pacienteBase({
      statusTratamento: 'pendente',
      planoTerapeutico: { metas: {} },
      evolucaoSeguimento: [],
    });

    const summary = buildPaciente360Summary({ paciente, now: NOW });

    expect(summary.statusComposto).toBe('pendente');
    expect(summary.plano?.tratamentoIniciado).toBe(false);
    expect(summary.tagsAutomaticas).toContain('Pendente');
  });

  it('calcula resultado, adesão e semana atual', () => {
    const paciente = pacienteBase({
      marcoZero: {
        pesoInicial: 100,
        circunferenciaInicial: 110,
        motivacaoPrincipal: 'saude',
        satisfacaoAtual: 'baixa',
        objetivoPaciente: 'perder peso',
        confiancaNoObjetivo: 'media',
        possuiFotosIniciais: false,
      },
      evolucaoSeguimento: [
        {
          id: 's1',
          weekIndex: 1,
          dataRegistro: new Date(2026, 2, 3),
          peso: 98,
          circunferenciaAbdominal: 108,
          doseAplicada: { quantidade: 2.5, data: new Date(2026, 2, 3), horario: '10:00' },
          adherence: 'ON_TIME',
        },
        {
          id: 's2',
          weekIndex: 2,
          dataRegistro: new Date(2026, 2, 10),
          peso: 96,
          doseAplicada: { quantidade: 2.5, data: new Date(2026, 2, 10), horario: '10:00' },
          adherence: 'LATE_<96H',
        },
      ],
    });

    const summary = buildPaciente360Summary({ paciente, now: new Date(2026, 2, 11) });

    expect(summary.statusComposto).toBe('em_tratamento');
    expect(summary.plano?.semanaAtual).toBe(2);
    expect(summary.resultado?.pesoInicial).toBe(100);
    expect(summary.resultado?.pesoAtual).toBe(96);
    expect(summary.resultado?.deltaPesoKg).toBe(-4);
    expect(summary.adesao?.aplicacoesRealizadas).toBe(1);
    expect(summary.adesao?.aplicacoesAtrasadas).toBe(1);
    expect(summary.adesao?.percentualAdesao).toBe(50);
    expect(summary.tagsAutomaticas).toContain('Semana 2');
    expect(summary.tagsAutomaticas).toContain('Perdeu 4 kg');
  });

  it('mapeia alertas ACTIVE e financeiro com parcela pendente', () => {
    const paciente = pacienteBase({
      alertas: [
        {
          id: 'a1',
          type: 'GI_SEVERE',
          description: 'Efeitos GI graves',
          severity: 'CRITICAL',
          status: 'ACTIVE',
          generatedAt: new Date(2026, 5, 1),
          followUpRequired: true,
        },
        {
          id: 'a2',
          type: 'GI_MILD',
          description: 'Resolvido',
          severity: 'INFO',
          status: 'RESOLVED',
          generatedAt: new Date(2026, 4, 1),
          followUpRequired: false,
        },
      ],
    });

    const pagamento: PagamentoPaciente = {
      pacienteId: 'p-1',
      statusPagamento: 'em_aberto',
      formaPagamento: 'dividido',
      valorTotal: 1000,
      valorPago: 500,
      valorPendente: 500,
      dataUltimaAtualizacao: new Date(2026, 5, 1),
      parcelas: [
        {
          numero: 2,
          valor: 500,
          dataVencimento: new Date(2026, 6, 1),
          status: 'pendente',
        },
      ],
    };

    const summary = buildPaciente360Summary({ paciente, pagamento, now: NOW });

    expect(summary.alertas).toHaveLength(1);
    expect(summary.alertas[0].severidade).toBe('danger');
    expect(summary.financeiro?.valorPendente).toBe(500);
    expect(summary.financeiro?.proximoVencimento).toBe('2026-07-01');
    expect(summary.risco.nivel).toBe('alto');
    expect(summary.proximaAcao?.tipo).toBe('cobrar_pagamento');
  });

  it('detecta dose atrasada e lembrete atrasado', () => {
    const paciente = pacienteBase({
      statusTratamento: 'em_tratamento',
      evolucaoSeguimento: [
        {
          id: 's1',
          weekIndex: 1,
          dataRegistro: new Date(2026, 2, 3),
          doseAplicada: { quantidade: 2.5, data: new Date(2026, 2, 3), horario: '10:00' },
          adherence: 'ON_TIME',
        },
        {
          id: 's2',
          weekIndex: 2,
          dataRegistro: new Date(2026, 2, 10),
          adherence: 'MISSED',
        },
      ],
    });

    const lembretes: Lembrete[] = [
      {
        id: 'l1',
        medicoId: 'm-1',
        pacienteId: 'p-1',
        pacienteNome: 'Maria Silva',
        data: '2026-06-01',
        texto: 'Ligar paciente',
        tag: 'Ligação',
        criadoEm: new Date(2026, 5, 1),
      },
    ];

    const summary = buildPaciente360Summary({ paciente, lembretes, now: NOW });

    expect(summary.statusComposto).toBe('dose_atrasada');
    expect(summary.adesao?.aplicacoesPerdidas).toBe(1);
    expect(summary.lembretes?.atrasados).toBe(1);
    expect(summary.proximaAcao?.tipo).toBe('avaliar_aplicacao');
  });

  it('prioriza última interação mais recente', () => {
    const paciente = pacienteBase({
      dataLeituraRecomendacoes: new Date(2026, 5, 10),
      evolucaoSeguimento: [
        {
          id: 's1',
          weekIndex: 1,
          dataRegistro: new Date(2026, 5, 15),
          peso: 95,
          doseAplicada: { quantidade: 2.5, data: new Date(2026, 5, 15), horario: '10:00' },
          adherence: 'ON_TIME',
        },
      ],
    });

    const summary = buildPaciente360Summary({ paciente, now: NOW });

    expect(summary.ultimaInteracao?.tipo).toBe('aplicacao');
  });
});
