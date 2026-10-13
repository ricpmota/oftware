/**
 * Amostra visual do PDF de bioimpedância.
 * Os números do último exame repetem a conferência pedida; não entram no gerador.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { buildRelatorioImpressaoPdf } from '@/utils/relatorioImpressaoPdf';
import type { BioImpedanciaRegistro } from '@/types/bioImpedancia';
import type { PacienteCompleto } from '@/types/obesidade';

function seg(kg: number, percentual: number) {
  return { kg, percentual };
}

function exame(
  id: string,
  data: string,
  peso: number,
  gorduraKg: number,
  musculo: number,
  visceral: number | null,
  gorduraPct: number,
  agua: number,
  proteina: number,
  mineral: number,
  kcal: number,
  imc: number
): BioImpedanciaRegistro {
  return {
    id,
    dataRegistro: new Date(`${data}T12:00:00`),
    peso,
    origemExame: 'inbody',
    percentualGordura: gorduraPct,
    gorduraVisceral: visceral ?? undefined,
    imc,
    metabolismoBasalKcal: kcal,
    composicaoCorporal: {
      aguaTotalLitros: agua,
      proteinasKg: proteina,
      mineraisKg: mineral,
      massaGorduraKg: gorduraKg,
    },
    analiseMusculoGordura: { massaMuscularKg: musculo, massaGorduraKg: gorduraKg },
    analiseObesidade: { percentualGordura: gorduraPct },
    massaMagraSegmentar: {
      arm_r: seg(4.2, 112),
      arm_l: seg(4.1, 110),
      trunk: seg(28.4, 98),
      leg_r: seg(9.6, 101),
      leg_l: seg(9.5, 100),
    },
    gorduraSegmentar: {
      arm_r: seg(1.8, 148),
      arm_l: seg(1.9, 152),
      trunk: seg(16.4, 176),
      leg_r: seg(3.6, 130),
      leg_l: seg(3.7, 132),
    },
  };
}

const registros: BioImpedanciaRegistro[] = [
  exame('e1', '2026-01-12', 128.4, 46.2, 41.1, 21, 36.0, 48.2, 12.4, 4.1, 1980, 42.1),
  exame('e2', '2026-03-16', 124.8, 43.5, 42.0, 20, 34.8, 49.0, 12.6, 4.2, 2010, 40.9),
  exame('e3', '2026-05-18', 121.2, 41.0, 43.1, null, 33.9, 49.6, 12.8, 4.2, 2034, 39.7),
  exame('e4', '2026-07-20', 118.6, 39.2, 44.0, 18, 33.1, 50.1, 13.0, 4.3, 2048, 38.9),
  exame('e5', '2026-09-14', 116.1, 37.7, 44.9, 17, 32.5, 50.8, 13.2, 4.3, 2062, 38.1),
];

const paciente = {
  id: 'amostra-bio',
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
  dadosClinicos: { medidasIniciais: { altura: 174, peso: 128.4, imc: 42.1 } },
  planoTerapeutico: {
    numeroSemanasTratamento: 24,
    semanaInicioCiclo: 1,
    metas: { weightLossTargetType: 'PESO_ABSOLUTO', weightLossTargetValue: 20, waistReductionTargetCm: 10 },
  },
  evolucaoSeguimento: [
    {
      id: 's1',
      weekIndex: 1,
      dataRegistro: '2026-01-12',
      peso: 128.4,
      circunferenciaAbdominal: 118,
      doseAplicada: { quantidade: 2.5, data: '2026-01-12', horario: '08:00' },
    },
  ],
  bioimpedanciaRegistros: registros,
} as unknown as PacienteCompleto;

async function main() {
  const { doc } = await buildRelatorioImpressaoPdf({
    secao: 'bio',
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
  const out = 'artifacts/relatorio-bio-amostra.pdf';
  writeFileSync(out, Buffer.from(doc.output('arraybuffer')));
  console.log(out);
  console.log('pages', doc.getNumberOfPages());
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
