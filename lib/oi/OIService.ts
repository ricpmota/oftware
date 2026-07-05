/**
 * Serviço central da OI — analisa PacienteCompleto com benchmarks estatísticos offline.
 * Nenhuma tela deve importar benchmarks diretamente; use apenas analisarPaciente().
 */
import type { PacienteCompleto } from '@/types/obesidade';
import {
  FaixaMeta,
  OIConfiabilidade,
  type OIAnalysis,
} from '@/types/oi';
import {
  carregarBenchmarks,
  obterBenchmarkPorFaixa,
  type OIBenchmarkFaixaInterna,
  type OIWeightLossBenchmarksFile,
} from '@/lib/oi/OIBenchmarkRepository';
import {
  calcularConfiabilidade,
  estimarIntervalo,
  estimarIntervaloAplicacoes,
  extrairPerfilPaciente,
  faixaMetaParaChaveBenchmark,
} from '@/lib/oi/OIHelpers';
import { OI_MODEL_VERSION } from '@/lib/oi/OIVersion';

export class OIService {
  private benchmarksOverride: OIWeightLossBenchmarksFile | null = null;

  /** Permite injeção de benchmarks (testes) sem ler arquivo. */
  constructor(benchmarks?: OIWeightLossBenchmarksFile) {
    this.benchmarksOverride = benchmarks ?? null;
  }

  analisarPaciente(paciente: PacienteCompleto): OIAnalysis {
    const perfil = extrairPerfilPaciente(paciente);
    const observacoes: string[] = [];

    const { data: benchmarks, sourcePath } = this.benchmarksOverride
      ? { data: this.benchmarksOverride, sourcePath: 'injected' }
      : carregarBenchmarks();

    if (!sourcePath) {
      observacoes.push(
        'Benchmarks não encontrados em disco. Execute a exportação offline (Etapa 2) ou configure OI_BENCHMARKS_PATH.'
      );
    }

    const faixaChave = faixaMetaParaChaveBenchmark(perfil.faixaMeta);
    if (perfil.faixaMeta === FaixaMeta.NaoInformado || !faixaChave) {
      observacoes.push('Meta de perda de peso não cadastrada — análise limitada.');
      return this.respostaSemBenchmark(perfil, observacoes);
    }

    const benchmark = obterBenchmarkPorFaixa(faixaChave, benchmarks);
    if (!benchmark) {
      observacoes.push(`Benchmark indisponível para faixa ${faixaChave}.`);
      return this.respostaSemBenchmark(perfil, observacoes);
    }

    return this.gerarAnalise(perfil, benchmark, faixaChave, sourcePath, observacoes);
  }

  private gerarAnalise(
    perfil: ReturnType<typeof extrairPerfilPaciente>,
    benchmark: OIBenchmarkFaixaInterna,
    faixaChave: string,
    sourcePath: string | null,
    observacoes: string[]
  ): OIAnalysis {
    if (benchmark.dadosInsuficientes) {
      observacoes.push(
        `Amostra insuficiente na faixa ${faixaChave} (n=${benchmark.n}, mínimo 30). Estimativas não são confiáveis.`
      );
    }

    const confiabilidade = calcularConfiabilidade(benchmark.n, benchmark.dadosInsuficientes);

    const intervaloMg = estimarIntervalo({
      media: benchmark.mgMedio,
      p25: benchmark.p25Mg,
      p50: benchmark.p50Mg,
      p75: benchmark.p75Mg,
      p90: benchmark.p90Mg,
    });

    const intervaloSemanas = estimarIntervalo({
      media: benchmark.semanasMedia,
      p25: benchmark.p25Semanas,
      p50: benchmark.p50Semanas,
      p75: benchmark.p75Semanas,
    });

    const intervaloAplicacoes = estimarIntervaloAplicacoes({
      aplicacoesMedia: benchmark.aplicacoesMedia,
      semanasIntervalo: intervaloSemanas,
      semanasMedia: benchmark.semanasMedia,
    });

    observacoes.push(
      'Estimativas baseadas em médias e percentis de pacientes com meta semelhante na base histórica anonimizada.'
    );
    observacoes.push('Não constitui promessa de resultado — decisão final é do médico.');

    if (confiabilidade === OIConfiabilidade.Baixa) {
      observacoes.push('Confiabilidade baixa: utilize como referência orientativa apenas.');
    }

    const benchmarkUtilizado = sourcePath
      ? `weight_loss_benchmarks/${faixaChave}@${sourcePath}`
      : `weight_loss_benchmarks/${faixaChave}`;

    return {
      versaoModelo: OI_MODEL_VERSION,
      pacientesSemelhantes: benchmark.n,
      confiabilidade,
      faixaMeta: perfil.faixaMeta,
      faixaIMC: perfil.faixaIMC,
      faixaPeso: perfil.faixaPeso,
      faixaEtaria: perfil.faixaEtaria,
      tempoEstimadoSemanas: intervaloSemanas.estimado,
      tempoMinimoSemanas: intervaloSemanas.minimo,
      tempoMaximoSemanas: intervaloSemanas.maximo,
      mgEstimado: intervaloMg.estimado,
      mgMinimo: intervaloMg.minimo,
      mgMaximo: intervaloMg.maximo,
      aplicacoesEstimadas: intervaloAplicacoes.estimado,
      aplicacoesMinimas: intervaloAplicacoes.minimo,
      aplicacoesMaximas: intervaloAplicacoes.maximo,
      perdaMediaKg: benchmark.perdaKgMedia,
      perdaMediaPercentual: benchmark.perdaPercentualMedia,
      probabilidadeAtingirMeta: benchmark.taxaAtingiuMeta,
      benchmarkUtilizado,
      observacoes,
    };
  }

  private respostaSemBenchmark(
    perfil: ReturnType<typeof extrairPerfilPaciente>,
    observacoes: string[]
  ): OIAnalysis {
    observacoes.push('Não foi possível consultar benchmark estatístico para este perfil.');

    return {
      versaoModelo: OI_MODEL_VERSION,
      pacientesSemelhantes: 0,
      confiabilidade: OIConfiabilidade.Baixa,
      faixaMeta: perfil.faixaMeta,
      faixaIMC: perfil.faixaIMC,
      faixaPeso: perfil.faixaPeso,
      faixaEtaria: perfil.faixaEtaria,
      tempoEstimadoSemanas: null,
      tempoMinimoSemanas: null,
      tempoMaximoSemanas: null,
      mgEstimado: null,
      mgMinimo: null,
      mgMaximo: null,
      aplicacoesEstimadas: null,
      aplicacoesMinimas: null,
      aplicacoesMaximas: null,
      perdaMediaKg: null,
      perdaMediaPercentual: null,
      probabilidadeAtingirMeta: null,
      benchmarkUtilizado: null,
      observacoes,
    };
  }
}

/** Instância padrão — ponto de entrada recomendado para telas/APIs futuras. */
const defaultService = new OIService();

/**
 * Analisa um paciente com benchmarks OI offline.
 * Função principal da Etapa 3 — ainda não conectada a nenhuma UI.
 */
export function analisarPaciente(paciente: PacienteCompleto): OIAnalysis {
  return defaultService.analisarPaciente(paciente);
}
