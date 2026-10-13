/**
 * Amostra visual do PDF de exames.
 * Os números repetem a conferência pedida e ficam só neste script.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { buildRelatorioImpressaoPdf } from '@/utils/relatorioImpressaoPdf';
import type { PacienteCompleto } from '@/types/obesidade';

const paciente = {
  id: 'amostra-exames',
  nome: 'Antônio Costa',
  email: 'antonio.costa@example.com',
  statusTratamento: 'em_tratamento',
  dadosIdentificacao: {
    nomeCompleto: 'Antônio Costa',
    email: 'antonio.costa@example.com',
    telefone: '11988887777',
    cpf: '123.456.789-00',
    sexoBiologico: 'M',
    dataNascimento: '1978-03-02',
    endereco: { cidade: 'São Paulo', estado: 'SP' },
  },
  dadosClinicos: { medidasIniciais: { altura: 174, peso: 116.1, imc: 38.1 } },
  planoTerapeutico: {
    numeroSemanasTratamento: 24,
    semanaInicioCiclo: 1,
    metas: { weightLossTargetType: 'PESO_ABSOLUTO', weightLossTargetValue: 15, waistReductionTargetCm: 8 },
  },
  evolucaoSeguimento: [
    {
      id: 's1',
      weekIndex: 1,
      dataRegistro: '2026-03-05',
      peso: 124,
      circunferenciaAbdominal: 112,
      doseAplicada: { quantidade: 2.5, data: '2026-03-05', horario: '08:00' },
    },
  ],
  examesLaboratoriais: [
    {
      id: 'ago',
      dataColeta: '2026-08-08',
      glicemiaJejum: 89,
      hemoglobinaGlicada: 5.4,
      hdl: 34,
      vitaminaD: 23.9,
      homaIr: 2.8,
      ferritina: 180,
      tgo: 18,
    },
    {
      id: 'mar',
      dataColeta: '2026-03-05',
      glicemiaJejum: 85,
      hemoglobinaGlicada: 5.6,
      hdl: 38,
      vitaminaD: 29.2,
      ureia: 32,
      creatinina: 0.9,
      sodio: 140,
      potassio: 4.2,
      t4Livre: 1.2,
      tgo: 22,
    },
  ],
  examesDeImagem: [],
} as unknown as PacienteCompleto;

async function main() {
  const { doc } = await buildRelatorioImpressaoPdf({
    secao: 'exames',
    paciente,
    medico: {
      nome: 'Ricardo Mendes',
      genero: 'M',
      crm: { estado: 'SP', numero: '123456' },
      primaryColor: '#3DDC97',
      pageBg: '#0A1F44',
      pageText: '#E8EDED',
    },
    pagamento: null,
    prescricoes: [],
    solicitacoesExames: [],
    protocoloIndice: 1,
  });
  mkdirSync('artifacts', { recursive: true });
  const out = 'artifacts/relatorio-exames-amostra.pdf';
  writeFileSync(out, Buffer.from(doc.output('arraybuffer')));
  console.log(out);
  console.log('pages', doc.getNumberOfPages());
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
