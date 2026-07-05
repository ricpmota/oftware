import { describe, expect, it } from 'vitest';
import { buildOrganizationFinanceMetrics } from './buildOrganizationFinanceMetrics';
import type { Medico } from '@/types/medico';

const medicoA = { id: 'm1', nome: 'Ana', email: 'ana@test.com' } as Medico;
const medicoB = { id: 'm2', nome: 'Bruno', email: 'bruno@test.com' } as Medico;

describe('buildOrganizationFinanceMetrics', () => {
  it('lista todos os médicos da org, inclusive sem faturamento', () => {
    const result = buildOrganizationFinanceMetrics({
      medicos: [medicoA, medicoB],
      pacientes: [],
      pagamentosPacientes: {},
      vendasAvulsas: [],
    });

    expect(result.totalMedicos).toBe(2);
    expect(result.rows).toHaveLength(2);
    expect(result.totalFaturamento).toBe(0);
  });

  it('agrega pagamentos de pacientes e vendas avulsas por médico', () => {
    const result = buildOrganizationFinanceMetrics({
      medicos: [medicoA, medicoB],
      pacientes: [
        { id: 'p1', medicoResponsavelId: 'm1', statusTratamento: 'em_tratamento' },
        { id: 'p2', medicoResponsavelId: 'm1', statusTratamento: 'concluido' },
        { id: 'p3', medicoResponsavelId: 'm1', statusTratamento: 'pendente' },
        { id: 'p4', medicoResponsavelId: 'm2', statusTratamento: 'abandono' },
      ],
      pagamentosPacientes: {
        p1: {
          pacienteId: 'p1',
          statusPagamento: 'em_aberto',
          formaPagamento: null,
          valorTotal: 1000,
          valorPago: 400,
          valorPendente: 600,
          dataUltimaAtualizacao: new Date(),
        },
        p2: {
          pacienteId: 'p2',
          statusPagamento: 'pago',
          formaPagamento: 'a_vista',
          valorTotal: 500,
          valorPago: 500,
          valorPendente: 0,
          dataUltimaAtualizacao: new Date(),
        },
      },
      vendasAvulsas: [
        {
          id: 'v1',
          descricao: 'Consulta',
          statusPagamento: 'pago',
          formaPagamento: 'a_vista',
          valorTotal: 200,
          valorPago: 200,
          valorPendente: 0,
          dataUltimaAtualizacao: new Date(),
          dataVenda: new Date(),
          medicoId: 'm2',
        },
      ],
    });

    const ana = result.rows.find((r) => r.medicoId === 'm1');
    const bruno = result.rows.find((r) => r.medicoId === 'm2');

    expect(ana?.pacientesTotal).toBe(3);
    expect(ana?.pacientesPendente).toBe(1);
    expect(ana?.pacientesEmTratamento).toBe(1);
    expect(ana?.pacientesConcluido).toBe(1);
    expect(ana?.pacientesAbandono).toBe(0);
    expect(ana?.pacientesComPagamento).toBe(2);
    expect(ana?.valorTotal).toBe(1500);
    expect(ana?.valorPago).toBe(900);
    expect(ana?.valorPendente).toBe(600);

    expect(bruno?.pacientesTotal).toBe(1);
    expect(bruno?.pacientesAbandono).toBe(1);
    expect(bruno?.pacientesComPagamento).toBe(0);
    expect(bruno?.vendasAvulsas).toBe(1);
    expect(bruno?.valorTotal).toBe(200);

    expect(result.totalFaturamento).toBe(1700);
    expect(result.totalPago).toBe(1100);
    expect(result.totalPendente).toBe(600);
  });
});
