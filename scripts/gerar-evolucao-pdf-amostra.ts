import { writeFileSync, mkdirSync } from 'node:fs';
import { buildDepoimentoResultadoFromPaciente } from '@/utils/buildDepoimentoResultadoFromPaciente';
import { buildRelatorioImpressaoPdf } from '@/utils/relatorioImpressaoPdf';
import type { PacienteCompleto } from '@/types/obesidade';

const registros = Array.from({ length: 30 }, (_, index) => {
  const semana = index + 1;
  const dose = semana <= 4 ? 2.5 : semana <= 8 ? 5 : semana <= 12 ? 7.5 : 10;
  return {
    id: `s${semana}`,
    weekIndex: semana,
    dataRegistro: `2026-01-${String(semana).padStart(2, '0')}`,
    peso: 118 - semana * 0.9,
    circunferenciaAbdominal: 112 - semana * 0.6,
    doseAplicada: { quantidade: dose, data: `2026-01-${String(semana).padStart(2, '0')}`, horario: '08:00' },
  };
});

const paciente = {
  id: 'amostra',
  nome: 'Paciente Amostra',
  email: 'amostra@example.com',
  statusTratamento: 'em_tratamento',
  dadosIdentificacao: {
    nomeCompleto: 'Paciente Amostra',
    email: 'amostra@example.com',
    telefone: '11999999999',
    cpf: '123.456.789-00',
    sexoBiologico: 'F',
    dataNascimento: '1988-04-12',
    endereco: { cidade: 'São Paulo', estado: 'SP' },
  },
  dadosClinicos: { medidasIniciais: { altura: 165, peso: 118, imc: 43.3, circunferenciaAbdominal: 112 } },
  planoTerapeutico: {
    numeroSemanasTratamento: 32,
    semanaInicioCiclo: 1,
    metas: { weightLossTargetType: 'PESO_ABSOLUTO', weightLossTargetValue: 20, waistReductionTargetCm: 12 },
  },
  evolucaoSeguimento: registros,
} as unknown as PacienteCompleto;

const serie = buildDepoimentoResultadoFromPaciente(paciente, 0, '', { protocoloIndice: 1 });
const totalSite = serie.evolucao.reduce((s, p) => s + (p.doseMg || 0), 0);
const totalAplicado = serie.evolucao.reduce((s, p) => s + (p.foiAplicado ? p.doseMg || 0 : 0), 0);
const ultima = [...serie.evolucao].reverse().find((p) => p.peso != null || p.foiAplicado)?.weekIndex;
console.log(
  JSON.stringify(
    {
      semanasNoGraficoDoSite: serie.evolucao.length,
      ultimaSemanaComRegistro: ultima,
      totalSiteIncluiPlanejado: Number(totalSite.toFixed(1)),
      totalSomenteAplicado: Number(totalAplicado.toFixed(1)),
    },
    null,
    2
  )
);

async function main() {
const { doc } = await buildRelatorioImpressaoPdf({
  secao: 'evolucao',
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
const out = 'artifacts/relatorio-evolucao-amostra.pdf';
writeFileSync(out, Buffer.from(doc.output('arraybuffer')));
console.log(out);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
