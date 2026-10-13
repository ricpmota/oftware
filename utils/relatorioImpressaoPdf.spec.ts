import { describe, expect, it } from 'vitest';
import type { PacienteCompleto } from '@/types/obesidade';
import type { BioImpedanciaRegistro } from '@/types/bioImpedancia';
import type { PagamentoPaciente } from '@/types/pagamento';
import type { Prescricao } from '@/types/prescricao';
import type { SolicitacaoExamesSalva } from '@/utils/solicitacaoExamesPdfDownload';
import { buildRelatorioImpressaoPdf, type RelatorioImpressaoSecao } from '@/utils/relatorioImpressaoPdf';

function pacienteBase(): PacienteCompleto & { bioimpedanciaRegistros: BioImpedanciaRegistro[] } {
  return {
    id: 'p1',
    nome: 'Maria Silva',
    email: 'maria@example.com',
    statusTratamento: 'em_tratamento',
    dadosIdentificacao: {
      nomeCompleto: 'Maria Silva',
      email: 'maria@example.com',
      telefone: '11999999999',
      cpf: '123.456.789-00',
      sexoBiologico: 'F',
      dataNascimento: '1990-05-10',
      endereco: { cidade: 'São Paulo', estado: 'SP' },
    },
    dadosClinicos: {
      medidasIniciais: { altura: 165, peso: 90, imc: 33 },
    },
    planoTerapeutico: { numeroSemanasTratamento: 4, semanaInicioCiclo: 1 },
    evolucaoSeguimento: [
      {
        id: 's1',
        weekIndex: 1,
        dataRegistro: '2026-01-06',
        peso: 90,
        circunferenciaAbdominal: 98,
        doseAplicada: { quantidade: 2.5, data: '2026-01-06', horario: '08:00' },
      },
      {
        id: 's2',
        weekIndex: 2,
        dataRegistro: '2026-01-13',
        peso: 88.4,
        circunferenciaAbdominal: 96,
        doseAplicada: { quantidade: 2.5, data: '2026-01-13', horario: '08:00' },
      },
    ],
    examesLaboratoriais: [
      {
        id: 'ex1',
        dataColeta: '2026-02-01',
        glicemiaJejum: 92,
        colesterolTotal: 210,
      },
    ],
    examesDeImagem: [
      {
        id: 'img1',
        nomeArquivo: 'usg-abdomen.pdf',
        tipoExame: 'usg',
        dataExame: '2026-02-02',
        nomePacienteDocumento: 'Maria Silva',
        resumoEquipamentoOuRegiao: 'Abdome total',
      },
    ],
    bioimpedanciaRegistros: [
      {
        id: 'b1',
        dataRegistro: new Date('2026-02-10'),
        peso: 86,
        origemExame: 'inbody',
        percentualGordura: 32,
        imc: 31.6,
        composicaoCorporal: {
          aguaTotalLitros: 38,
          proteinasKg: 8,
          mineraisKg: 3,
          massaGorduraKg: 27,
        },
        analiseMusculoGordura: { massaMuscularKg: 28, massaGorduraKg: 27 },
        analiseObesidade: { percentualGordura: 32 },
        massaMagraSegmentar: {
          arm_r: { kg: 2.1, percentual: 90 },
          arm_l: { kg: 2, percentual: 88 },
          trunk: { kg: 20, percentual: 95 },
          leg_r: { kg: 7, percentual: 92 },
          leg_l: { kg: 6.8, percentual: 91 },
        },
      },
    ],
  } as unknown as PacienteCompleto & { bioimpedanciaRegistros: BioImpedanciaRegistro[] };
}

const pagamento: PagamentoPaciente = {
  pacienteId: 'p1',
  statusPagamento: 'iniciou_pagamento',
  formaPagamento: 'dividido',
  valorTotal: 2000,
  valorPago: 1000,
  valorPendente: 1000,
  dataUltimaAtualizacao: new Date('2026-03-01'),
  dataVenda: new Date('2026-01-02'),
  parcelas: [
    {
      numero: 1,
      valor: 1000,
      dataVencimento: new Date('2026-01-10'),
      dataPagamento: new Date('2026-01-10'),
      status: 'paga',
      formaPagamento: 'pix',
    },
    {
      numero: 2,
      valor: 1000,
      dataVencimento: new Date('2026-02-10'),
      status: 'pendente',
    },
  ],
  observacoes: 'Acordo em duas parcelas.',
};

const prescricoes = [
  {
    id: 'pr1',
    nome: 'Suplementação',
    criadoEm: '2026-01-15',
    tipoDocumento: 'prescricao',
    itens: [{ medicamento: 'Whey', dosagem: '30 g', frequencia: '1x ao dia' }],
  },
] as unknown as Prescricao[];

const solicitacoes = [
  {
    id: 'so1',
    pacienteId: 'p1',
    exames: ['Glicemia', 'Perfil lipídico'],
    hipoteseDiagnostica: 'Acompanhamento',
    criadoEm: '2026-01-20',
  },
] as unknown as SolicitacaoExamesSalva[];

async function pdfOk(secao: RelatorioImpressaoSecao, paciente: PacienteCompleto) {
  const { doc, fileName } = await buildRelatorioImpressaoPdf({
    secao,
    paciente,
    medico: {
      nome: 'Ricardo Mendes',
      genero: 'M',
      crm: { estado: 'SP', numero: '123456' },
      primaryColor: '#3DDC97',
      pageBg: '#0A1F44',
      pageText: '#E8EDED',
    },
    pagamento: secao === 'financeiro' ? pagamento : null,
    prescricoes: secao === 'exames' ? prescricoes : [],
    solicitacoesExames: secao === 'exames' ? solicitacoes : [],
    protocoloIndice: 1,
  });
  const bytes = new Uint8Array(doc.output('arraybuffer'));
  const header = String.fromCharCode(...bytes.slice(0, 5));
  expect(header).toBe('%PDF-');
  expect(doc.getNumberOfPages()).toBeGreaterThan(0);
  expect(fileName.startsWith(`relatorio-${secao}-`)).toBe(true);
  expect(bytes.length).toBeGreaterThan(800);
}

describe('buildRelatorioImpressaoPdf', () => {
  it.each(['evolucao', 'bio', 'exames', 'financeiro'] as const)(
    'gera PDF de %s',
    async (secao) => {
      await pdfOk(secao, pacienteBase());
    }
  );

  it('desenha o gráfico de evolução e omite a tabela semanal', async () => {
    const { doc } = await buildRelatorioImpressaoPdf({
      secao: 'evolucao',
      paciente: pacienteBase(),
      medico: { nome: 'Ricardo Mendes', genero: 'M', crm: { estado: 'SP', numero: '123456' } },
      pagamento: null,
      prescricoes: [],
      solicitacoesExames: [],
      protocoloIndice: 1,
    });
    const raw = new TextDecoder('latin1').decode(new Uint8Array(doc.output('arraybuffer')));
    expect(raw).toContain('PESO E DOSE POR SEMANA');
    expect(raw).toContain('mg registrados');
    expect(raw).toContain('Evolu');
    expect(raw).not.toContain('Registros semanais');
    expect(doc.getNumberOfPages()).toBeLessThanOrEqual(2);
  });

  it('monta os laboratoriais por marcador e não abre página de seção vazia', async () => {
    const paciente = pacienteBase();
    paciente.examesDeImagem = [];
    const { doc } = await buildRelatorioImpressaoPdf({
      secao: 'exames',
      paciente,
      medico: { nome: 'Ricardo Mendes', genero: 'M', crm: { estado: 'SP', numero: '123456' } },
      pagamento: null,
      prescricoes: [],
      solicitacoesExames: [],
      protocoloIndice: 1,
    });
    const raw = new TextDecoder('latin1').decode(new Uint8Array(doc.output('arraybuffer')));
    expect(raw).toContain('Resultados por marcador');
    expect(raw).not.toContain('Coleta 1');
    expect(raw).not.toContain('Sem itens');
    expect(doc.getNumberOfPages()).toBeLessThanOrEqual(2);
  });

  it('resume o financeiro em vendas e parcelas', async () => {
    const { doc } = await buildRelatorioImpressaoPdf({
      secao: 'financeiro',
      paciente: pacienteBase(),
      medico: { nome: 'Ricardo Mendes', genero: 'M', crm: { estado: 'SP', numero: '123456' } },
      pagamento,
      prescricoes: [],
      solicitacoesExames: [],
      protocoloIndice: 1,
    });
    const raw = new TextDecoder('latin1').decode(new Uint8Array(doc.output('arraybuffer')));
    expect(raw).toContain('Resumo das vendas');
    expect(raw).toContain('Pago informado');
    expect(raw).not.toContain('Sem parcelas nesta venda');
  });

  it('troca a bioimpedância repetida pelo resultado atual e o histórico', async () => {
    const { doc } = await buildRelatorioImpressaoPdf({
      secao: 'bio',
      paciente: pacienteBase(),
      medico: { nome: 'Ricardo Mendes', genero: 'M', crm: { estado: 'SP', numero: '123456' } },
      pagamento: null,
      prescricoes: [],
      solicitacoesExames: [],
      protocoloIndice: 1,
    });
    const raw = new TextDecoder('latin1').decode(new Uint8Array(doc.output('arraybuffer')));
    expect(raw).toContain('Composi');
    expect(raw).toContain('Refer');
    expect(raw).toContain('Bra');
    expect(raw).not.toContain('Registro 1');
  });

  it('gera PDF vazio sem lançar', async () => {
    const vazio = { id: 'v', nome: 'Paciente' } as PacienteCompleto;
    for (const secao of ['evolucao', 'bio', 'exames', 'financeiro'] as const) {
      await pdfOk(secao, vazio);
    }
  });
});
