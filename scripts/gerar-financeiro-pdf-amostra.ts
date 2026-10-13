/**
 * Amostra visual do PDF financeiro.
 * Os números da conferência ficam só neste script.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { buildRelatorioImpressaoPdf } from '@/utils/relatorioImpressaoPdf';
import type { PacienteCompleto } from '@/types/obesidade';
import type { PagamentoPaciente, ParcelaPagamento } from '@/types/pagamento';

function parcela(
  numero: number,
  valor: number,
  vencimento: string,
  pagamento: string,
  dataVenda?: string,
  forma?: ParcelaPagamento['formaPagamento']
): ParcelaPagamento {
  return {
    numero,
    valor,
    dataVencimento: new Date(`${vencimento}T12:00:00`),
    dataPagamento: new Date(`${pagamento}T12:00:00`),
    status: 'paga',
    ...(forma ? { formaPagamento: forma } : {}),
    ...(dataVenda ? { dataVenda: new Date(`${dataVenda}T12:00:00`) } : {}),
  };
}

const parcelas: ParcelaPagamento[] = [
  parcela(1, 2400, '2026-03-10', '2026-03-10', undefined, 'pix'),
  parcela(1, 2400, '2026-04-10', '2026-04-08', '2026-04-02', 'pix'),
  parcela(1, 2400, '2026-05-10', '2026-05-09', '2026-05-04', 'cartao_credito'),
  parcela(1, 1200, '2026-06-10', '2026-06-10', '2026-06-06', 'pix'),
  parcela(2, 1200, '2026-10-05', '2026-10-05'),
  parcela(1, 1200, '2026-07-10', '2026-07-10', '2026-07-08', 'boleto'),
  parcela(2, 1200, '2026-08-10', '2026-08-10', undefined, 'pix'),
  parcela(1, 1200, '2026-08-15', '2026-08-15', '2026-08-10'),
  parcela(2, 1200, '2026-09-15', '2026-09-12', undefined, 'dinheiro'),
];

const pagamento: PagamentoPaciente = {
  pacienteId: 'andrea',
  statusPagamento: 'pago',
  formaPagamento: 'dividido',
  valorTotal: 14400,
  valorPago: 14400,
  valorPendente: 0,
  parcelas,
  dataUltimaAtualizacao: new Date('2026-09-12T12:00:00'),
  dataVenda: new Date('2026-03-02T12:00:00'),
};

const paciente = {
  id: 'andrea',
  nome: 'Andréa Farias',
  email: 'andrea.farias@example.com',
  statusTratamento: 'em_tratamento',
  dadosIdentificacao: {
    nomeCompleto: 'Andréa Farias',
    email: 'andrea.farias@example.com',
    telefone: '11977776666',
    cpf: '987.654.321-00',
    sexoBiologico: 'F',
    dataNascimento: '1984-11-20',
    endereco: { cidade: 'São Paulo', estado: 'SP' },
  },
  dadosClinicos: { medidasIniciais: { altura: 162, peso: 92, imc: 35 } },
  planoTerapeutico: {
    numeroSemanasTratamento: 20,
    semanaInicioCiclo: 1,
    metas: { weightLossTargetType: 'PESO_ABSOLUTO', weightLossTargetValue: 12, waistReductionTargetCm: 8 },
  },
  evolucaoSeguimento: [
    {
      id: 's1',
      weekIndex: 1,
      dataRegistro: '2026-03-02',
      peso: 92,
      circunferenciaAbdominal: 98,
      doseAplicada: { quantidade: 2.5, data: '2026-03-02', horario: '08:00' },
    },
  ],
} as unknown as PacienteCompleto;

async function main() {
  const { doc } = await buildRelatorioImpressaoPdf({
    secao: 'financeiro',
    paciente,
    medico: {
      nome: 'Ricardo Mendes',
      genero: 'M',
      crm: { estado: 'SP', numero: '123456' },
      primaryColor: '#3DDC97',
      pageBg: '#0A1F44',
      pageText: '#E8EDED',
    },
    pagamento,
    prescricoes: [],
    solicitacoesExames: [],
    protocoloIndice: 1,
  });
  mkdirSync('artifacts', { recursive: true });
  const out = 'artifacts/relatorio-financeiro-amostra.pdf';
  writeFileSync(out, Buffer.from(doc.output('arraybuffer')));
  console.log(out);
  console.log('pages', doc.getNumberOfPages());
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
