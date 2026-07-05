import { describe, expect, it } from 'vitest';
import { buildPaciente360TimelineEvents } from '@/lib/paciente360/buildPaciente360TimelineEvents';
import { mergeCrmUnifiedTimeline } from '@/lib/paciente360/mergeCrmUnifiedTimeline';
import type { Paciente360Summary } from '@/types/paciente360';
import type { LeadMedico } from '@/types/leadMedico';
import type { PacienteCompleto } from '@/types/obesidade';
import type { PagamentoPaciente } from '@/types/pagamento';
import type { Lembrete } from '@/types/lembrete';

const NOW = new Date(2026, 5, 21, 12, 0, 0);

const lead: LeadMedico = {
  id: 'l1',
  uid: 'u1',
  email: 'maria@test.com',
  name: 'Maria Silva',
  telefone: '(11) 98765-4321',
  status: 'em_tratamento',
  dataStatus: new Date(2026, 5, 10),
  createdAt: new Date(2026, 5, 8),
  medicoId: 'm1',
};

function summary(overrides: Partial<Paciente360Summary> = {}): Paciente360Summary {
  return {
    pacienteId: 'p1',
    nome: 'Maria Silva',
    statusComposto: 'em_tratamento',
    alertas: [],
    risco: { nivel: 'baixo', motivos: [] },
    tagsAutomaticas: ['Em tratamento'],
    proximaAcao: { tipo: 'acompanhar', label: 'Acompanhar evolução', prioridade: 10 },
    updatedAt: NOW,
    ...overrides,
  };
}

function pacienteBase(): PacienteCompleto {
  return {
    id: 'p1',
    userId: 'u1',
    email: 'maria@test.com',
    nome: 'Maria Silva',
    medicoResponsavelId: 'm1',
    dadosIdentificacao: { nomeCompleto: 'Maria Silva', email: 'maria@test.com', endereco: {} },
    dadosClinicos: { medidasIniciais: { peso: 100, altura: 165, imc: 36.7, circunferenciaAbdominal: 110 } },
    estiloVida: {},
    examesLaboratoriais: [],
    planoTerapeutico: {
      startDate: new Date(2026, 5, 8),
      numeroSemanasTratamento: 18,
      metas: {},
    },
    evolucaoSeguimento: [
      {
        id: 'e1',
        weekIndex: 2,
        dataRegistro: new Date(2026, 5, 17),
        peso: 84.1,
        circunferenciaAbdominal: 108.8,
        doseAplicada: { quantidade: 2.5, data: new Date(2026, 5, 17), horario: '09:00' },
        adesao: 'pontual',
      },
    ],
    alertas: [],
    statusTratamento: 'em_tratamento',
  } as PacienteCompleto;
}

describe('buildPaciente360TimelineEvents', () => {
  it('usa data real de tratamento, check-in e aplicação', () => {
    const result = buildPaciente360TimelineEvents({
      summary: summary({
        plano: {
          tratamentoIniciado: true,
          semanaAtual: 2,
          semanasTotal: 18,
          doseAtualMg: 2.5,
        },
        resultado: { pesoInicial: 85, pesoAtual: 84.1, deltaPesoKg: -0.8 },
      }),
      lead,
      paciente: pacienteBase(),
      now: NOW,
    });

    expect(result.events.some((e) => e.type === 'treatment_started' && e.sourceDateQuality === 'real')).toBe(
      true
    );
    expect(result.events.some((e) => e.title === 'Check-in registrado')).toBe(true);
    expect(result.events.some((e) => e.title === 'Aplicação registrada')).toBe(true);
    expect(result.events.every((e) => !e.isSnapshot)).toBe(true);
  });

  it('consolida risco e próxima ação em estado atual', () => {
    const result = buildPaciente360TimelineEvents({
      summary: summary({
        financeiro: { statusPagamento: 'em_aberto', valorPendente: 800 },
        risco: { nivel: 'alto', motivos: ['Pagamento atrasado'] },
        proximaAcao: { tipo: 'cobrar_pagamento', label: 'Cobrar pagamento atrasado', prioridade: 90 },
      }),
      lead,
      now: NOW,
    });

    expect(result.currentState?.title).toBe('Estado atual');
    expect(result.currentState?.isSnapshot).toBe(true);
    expect(result.currentState?.description?.toLowerCase()).toContain('cobrar pagamento');
  });

  it('gera parcelas com data real', () => {
    const pagamento: PagamentoPaciente = {
      pacienteId: 'p1',
      statusPagamento: 'em_aberto',
      formaPagamento: 'dividido',
      valorTotal: 800,
      valorPago: 0,
      valorPendente: 800,
      dataUltimaAtualizacao: NOW,
      parcelas: [
        {
          numero: 1,
          valor: 800,
          dataVencimento: new Date(2026, 5, 9),
          status: 'atrasada',
        },
      ],
    };

    const result = buildPaciente360TimelineEvents({
      summary: summary({ financeiro: { statusPagamento: 'em_aberto', valorPendente: 800 } }),
      lead,
      pagamento,
      now: NOW,
    });

    const parcela = result.events.find((e) => e.title === 'Parcela vencida');
    expect(parcela?.sourceDateQuality).toBe('real');
    expect(parcela?.tone).toBe('danger');
  });

  it('não quebra com summary mínimo', () => {
    const result = buildPaciente360TimelineEvents({
      summary: summary({ plano: undefined, proximaAcao: undefined, tagsAutomaticas: [] }),
      lead,
      now: NOW,
    });
    expect(result.events.length + (result.currentState ? 1 : 0)).toBeGreaterThanOrEqual(0);
  });
});

describe('mergeCrmUnifiedTimeline', () => {
  it('coloca estado atual no topo e limita eventos', () => {
    const merged = mergeCrmUnifiedTimeline(
      [
        {
          id: '1',
          leadId: 'l1',
          medicoId: 'm1',
          type: 'lead_created',
          description: 'Lead captado',
          createdAt: new Date(2026, 5, 8),
        },
      ],
      buildPaciente360TimelineEvents({
        summary: summary({
          risco: { nivel: 'alto', motivos: ['Teste'] },
          proximaAcao: { tipo: 'cobrar_pagamento', label: 'Cobrar pagamento', prioridade: 90 },
        }),
        lead,
        paciente: pacienteBase(),
        now: NOW,
      })
    );

    expect(merged[0]?.title).toBe('Estado atual');
    expect(merged[0]?.isSnapshot).toBe(true);
    expect(merged.length).toBeLessThanOrEqual(20);
  });
});
