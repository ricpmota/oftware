import { describe, expect, it } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import type { Prescricao } from '@/types/prescricao';
import { generateReceituarioControleEspecialPdf } from '@/utils/receituarioControleEspecialPdfGenerate';

const prescricaoMock: Prescricao = {
  id: 'p1',
  medicoId: 'm1',
  nome: 'Controle Especial Teste',
  descricao: '',
  itens: [
    {
      medicamento: 'Medicamento A',
      dosagem: '10mg',
      frequencia: '1x ao dia',
      instrucoes: 'Tomar após refeições',
      quantidade: '30 comprimidos',
    },
  ],
  observacoes: 'Justificativa clínica.',
  criadoEm: new Date(),
  atualizadoEm: new Date(),
  criadoPor: 'test@example.com',
  isTemplate: false,
  pesoPaciente: 80,
};

describe('receituarioControleEspecialPdfGenerate', () => {
  it('generateReceituarioControleEspecialPdf produz 2 páginas', async () => {
    const doc = await generateReceituarioControleEspecialPdf(
      prescricaoMock,
      {
        id: 'm1',
        userId: 'u1',
        email: 'medico@test.com',
        nome: 'Silva',
        genero: 'M',
        crm: { numero: '12345', estado: 'SP' },
        localizacao: { endereco: 'Rua Teste, 100' },
        cidades: [{ estado: 'SP', cidade: 'São Paulo' }],
        telefone: '(11) 99999-9999',
        dataCadastro: new Date(),
        status: 'ativo',
      },
      {
        pacienteNome: 'Paciente Teste',
        pacienteCpf: '123.456.789-00',
        enderecoCompleto: 'Av. Brasil, 1, São Paulo, SP',
        sexo: 'Masculino',
        idade: '40',
        uf: 'SP',
      }
    );

    const ab = doc.output('arraybuffer') as ArrayBuffer;
    const pdf = await PDFDocument.load(ab);
    expect(pdf.getPageCount()).toBe(2);
  });
});
