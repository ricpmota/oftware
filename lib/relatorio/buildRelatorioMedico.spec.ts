import { describe, expect, it } from 'vitest';
import {
  buildFinanceiroDemografico,
  buildRelatorioMedicoFinanceiro,
  buildRelatorioMedicoPerfil,
  contarStatusPacientes,
  distribuicaoFaixaEtaria,
  type RelatorioMedicoVendaLinha,
} from './buildRelatorioMedico';
import type { PacienteCompleto } from '@/types/obesidade';
import type { PagamentoPaciente, VendaAvulsa } from '@/types/pagamento';

describe('contarStatusPacientes', () => {
  it('separa pendente, tratamento, concluído e abandono', () => {
    const counts = contarStatusPacientes([
      { statusTratamento: 'em_tratamento' },
      { statusTratamento: 'concluido' },
      { statusTratamento: 'abandono' },
      { statusTratamento: 'pendente' },
      {},
    ]);

    expect(counts).toEqual({
      total: 5,
      pendente: 2,
      emTratamento: 1,
      concluido: 1,
      abandono: 1,
    });
  });
});

describe('buildRelatorioMedicoPerfil', () => {
  it('agrupa sexo e as cidades mais frequentes', () => {
    const perfil = buildRelatorioMedicoPerfil([
      { dadosIdentificacao: { sexoBiologico: 'F', endereco: { cidade: 'são paulo', estado: 'sp' } } },
      { dadosIdentificacao: { sexoBiologico: 'F', endereco: { cidade: 'São Paulo', estado: 'SP' } } },
      { dadosIdentificacao: { sexoBiologico: 'M', endereco: { cidade: 'Campinas', estado: 'SP' } } },
      { dadosIdentificacao: { sexoBiologico: 'Outro' } },
      { dadosIdentificacao: {} },
    ] as PacienteCompleto[]);

    expect(perfil.feminino).toBe(2);
    expect(perfil.masculino).toBe(1);
    expect(perfil.outro).toBe(1);
    expect(perfil.semSexo).toBe(1);
    expect(perfil.totalComCidade).toBe(3);
    expect(perfil.cidades[0]).toEqual({ label: 'São Paulo, SP', quantidade: 2 });
  });
});

describe('distribuicaoFaixaEtaria', () => {
  it('distribui os pacientes nas mesmas faixas do MetaAdmin', () => {
    const faixas = distribuicaoFaixaEtaria([
      { dadosIdentificacao: { dataNascimento: new Date('2006-03-01') } },
      { dadosIdentificacao: { dataNascimento: new Date('1995-06-15') } },
      { dadosIdentificacao: { dataNascimento: new Date('1950-01-01') } },
      { dadosIdentificacao: {} },
    ] as PacienteCompleto[]);

    expect(faixas.totalComIdade).toBe(3);
    expect(faixas.percentages['18-24']).toBeCloseTo(100 / 3);
    expect(faixas.percentages['25-40']).toBeCloseTo(100 / 3);
    expect(faixas.percentages['65+']).toBeCloseTo(100 / 3);
    expect(faixas.percentages['41-65']).toBe(0);
  });
});

describe('buildFinanceiroDemografico', () => {
  it('soma vendido, recebido e aberto por sexo, cidade e estado', () => {
    const linha = (parcial: Partial<RelatorioMedicoVendaLinha>): RelatorioMedicoVendaLinha =>
      ({
        id: 'x',
        origem: 'paciente',
        nome: 'Paciente',
        vendaLabel: 'Venda',
        data: new Date('2026-01-10'),
        dataLabel: '10/01/2026',
        mesKey: '2026-01',
        mesLabel: 'Janeiro 2026',
        status: 'iniciou_pagamento',
        valorTotal: 0,
        valorPago: 0,
        valorPendente: 0,
        ...parcial,
      }) as RelatorioMedicoVendaLinha;

    const demo = buildFinanceiroDemografico(
      [
        linha({ pacienteId: 'p1', valorTotal: 1000, valorPago: 400, valorPendente: 600 }),
        linha({ id: 'avulsa', origem: 'avulsa', valorTotal: 50, valorPago: 50, valorPendente: 0 }),
      ],
      [
        {
          id: 'p1',
          dadosIdentificacao: { sexoBiologico: 'F', endereco: { cidade: 'São Paulo', estado: 'SP' } },
        },
      ] as PacienteCompleto[],
    );

    expect(demo.porSexo).toEqual([{ nome: 'Feminino', vendido: 1000, recebido: 400, aberto: 600 }]);
    expect(demo.porCidade[0]?.nome).toBe('São Paulo - SP');
    expect(demo.porRegiao[0]?.nome).toBe('SP');
    expect(demo.porSexo[0]?.vendido).toBe(1000);
  });
});

describe('buildRelatorioMedicoFinanceiro', () => {
  it('abre cada venda do paciente e a venda avulsa, com o que segue em aberto', () => {
    const paciente = {
      id: 'p1',
      nome: 'Maria',
      dadosIdentificacao: {
        nomeCompleto: 'Maria Silva',
        dataCadastro: new Date('2026-01-10T12:00:00'),
      },
    } as PacienteCompleto;

    const pagamento = {
      pacienteId: 'p1',
      statusPagamento: 'iniciou_pagamento',
      formaPagamento: 'dividido',
      valorTotal: 1500,
      valorPago: 500,
      valorPendente: 1000,
      dataUltimaAtualizacao: new Date('2026-03-01T12:00:00'),
      parcelas: [
        { numero: 1, valor: 500, dataVencimento: new Date('2026-01-20'), status: 'paga' },
        { numero: 2, valor: 500, dataVencimento: new Date('2026-02-20'), status: 'pendente' },
        {
          numero: 3,
          valor: 500,
          dataVencimento: new Date('2026-03-20'),
          dataVenda: new Date('2026-03-02T12:00:00'),
          status: 'pendente',
        },
      ],
    } as PagamentoPaciente;

    const avulsa = {
      id: 'v1',
      descricao: 'Consulta avulsa',
      cliente: 'João',
      statusPagamento: 'pago',
      formaPagamento: 'a_vista',
      valorTotal: 200,
      valorPago: 200,
      valorPendente: 0,
      dataUltimaAtualizacao: new Date('2026-02-01'),
      dataVenda: new Date('2026-02-01T12:00:00'),
      medicoId: 'm1',
    } as VendaAvulsa;

    const result = buildRelatorioMedicoFinanceiro({
      pacientes: [paciente],
      pagamentosPacientes: { p1: pagamento },
      vendasAvulsas: [avulsa],
    });

    expect(result.totalVendas).toBe(3);
    expect(result.vendasPaciente).toBe(2);
    expect(result.vendasAvulsas).toBe(1);
    expect(result.vendasPagas).toBe(1);
    expect(result.vendasAbertas).toBe(2);
    expect(result.valorTotal).toBe(1700);
    expect(result.valorPago).toBe(700);
    expect(result.valorPendente).toBe(1000);
    expect(result.linhas.map((linha) => linha.nome)).toEqual(['Maria Silva', 'João', 'Maria Silva']);
    expect(result.linhas[0]?.vendaLabel).toBe('Venda 2');
    expect(result.meses.map((mes) => mes.mesKey)).toEqual(['2026-01', '2026-02', '2026-03']);
  });
});
