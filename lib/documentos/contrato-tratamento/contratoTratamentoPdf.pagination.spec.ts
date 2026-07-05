import { describe, expect, it } from 'vitest';
import type { Medico } from '@/types/medico';
import type { PacienteCompleto } from '@/types/obesidade';
import {
  buildContratoTratamentoJsPdfDocument,
  measureContratoPdfPagination,
} from '@/lib/documentos/contrato-tratamento/contratoTratamentoPdf';

const medicoMock: Medico = {
  id: 'm1',
  userId: 'u1',
  email: 'medico@test.com',
  nome: 'Ana Silva',
  genero: 'F',
  crm: { numero: '12345', estado: 'SP' },
  localizacao: { endereco: 'Rua Teste, 100', cep: '01000-000' },
  cidades: [{ estado: 'SP', cidade: 'São Paulo' }],
  dataCadastro: new Date(),
  status: 'ativo',
};

const pacienteMock: PacienteCompleto = {
  id: 'p1',
  userId: 'u2',
  email: 'paciente@test.com',
  nome: 'João Souza',
  medicoResponsavelId: 'm1',
  dadosIdentificacao: {
    nomeCompleto: 'João Souza',
    email: 'paciente@test.com',
    cpf: '12345678901',
    dataNascimento: new Date(1985, 5, 15),
    endereco: { rua: 'Av. Brasil, 200', cidade: 'São Paulo', estado: 'SP', cep: '02000-000' },
    dataCadastro: new Date(),
  },
  dadosClinicos: {} as PacienteCompleto['dadosClinicos'],
  estiloVida: {} as PacienteCompleto['estiloVida'],
  examesLaboratoriais: [],
  planoTerapeutico: {} as PacienteCompleto['planoTerapeutico'],
  evolucaoSeguimento: [],
  alertas: [],
  comunicacao: {} as PacienteCompleto['comunicacao'],
  indicadores: {} as PacienteCompleto['indicadores'],
  dataCadastro: new Date(),
  status: 'ativo',
  statusTratamento: 'em_tratamento',
};

describe('contratoTratamentoPdf pagination', () => {
  it('gera entre 6 e 10 páginas com fluxo BRy (sem reserva global de rodapé)', async () => {
    const paginationOut = { pageEndYs: [] as { page: number; endY: number; usedMm: number; capacityMm: number }[] };
    const doc = await buildContratoTratamentoJsPdfDocument(
      medicoMock,
      pacienteMock,
      { medicoId: 'm1', pacienteId: 'p1' },
      { omitManualSignatureBlock: true },
      paginationOut
    );

    const metrics = measureContratoPdfPagination(doc, paginationOut.pageEndYs);
    console.log('BRy metrics:', JSON.stringify(metrics, null, 2));
    expect(metrics.pageCount).toBeGreaterThanOrEqual(6);
    expect(metrics.pageCount).toBeLessThanOrEqual(10);
    expect(metrics.avgFillRatio).toBeGreaterThan(0.75);
  });

  it('gera entre 6 e 10 páginas sem assinatura BRy', async () => {
    const paginationOut = { pageEndYs: [] as { page: number; endY: number; usedMm: number; capacityMm: number }[] };
    const doc = await buildContratoTratamentoJsPdfDocument(
      medicoMock,
      pacienteMock,
      { medicoId: 'm1', pacienteId: 'p1' },
      undefined,
      paginationOut
    );
    const metrics = measureContratoPdfPagination(doc, paginationOut.pageEndYs);
    console.log('Manual metrics:', JSON.stringify(metrics, null, 2));
    expect(metrics.pageCount).toBeGreaterThanOrEqual(6);
    expect(metrics.pageCount).toBeLessThanOrEqual(10);
  });
});
