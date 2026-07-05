import { describe, expect, it } from 'vitest';
import {
  FaixaEtaria,
  FaixaIMC,
  FaixaMeta,
  FaixaPeso,
  OIConfiabilidade,
  type OIAnalysis,
} from '@/types/oi';
import {
  analiseOiUtilizavel,
  aplicarAnaliseOiNaEstimativa,
  avisoOiNaoAplicada,
  calcularEstimativaPlanoInicialV2,
  type ContextoOrcamentoPaciente,
} from '@/lib/metaadmin/orcamentoTerapeuticoUtils';

const contextoBase: ContextoOrcamentoPaciente = {
  nome: 'Paciente Teste',
  pesoInicial: 100,
  pesoAtual: 95,
  metaDescricao: 'perder 10%',
  kgDesejados: 10,
  percentualDesejado: 10,
  imcInicial: 34,
  imcAtual: 32,
  medicamento: 'tirzepatida',
  statusTratamento: 'Em tratamento',
  adesaoMedia: 90,
  numeroAplicacoesHistorico: 5,
};

const analysisOi: OIAnalysis = {
  versaoModelo: '0.1.0',
  pacientesSemelhantes: 85,
  confiabilidade: OIConfiabilidade.Alta,
  faixaMeta: FaixaMeta.Entre5_10,
  faixaIMC: FaixaIMC.Imc30_35,
  faixaPeso: FaixaPeso.Entre80_100,
  faixaEtaria: FaixaEtaria.Faixa40_49,
  tempoEstimadoSemanas: 24,
  tempoMinimoSemanas: 20,
  tempoMaximoSemanas: 28,
  mgEstimado: 132,
  mgMinimo: 118,
  mgMaximo: 147,
  aplicacoesEstimadas: 24,
  aplicacoesMinimas: 22,
  aplicacoesMaximas: 26,
  perdaMediaKg: 9,
  perdaMediaPercentual: 9,
  probabilidadeAtingirMeta: 0.72,
  benchmarkUtilizado: 'weight_loss_benchmarks/5_a_10',
  observacoes: ['teste'],
};

describe('analiseOiUtilizavel', () => {
  it('aceita análise com confiabilidade média ou superior', () => {
    expect(analiseOiUtilizavel(analysisOi)).toBe(true);
  });

  it('rejeita confiabilidade baixa', () => {
    expect(
      analiseOiUtilizavel({ ...analysisOi, confiabilidade: OIConfiabilidade.Baixa })
    ).toBe(false);
  });
});

describe('aplicarAnaliseOiNaEstimativa', () => {
  it('substitui mg/semanas/aplicações quando OI confiável', () => {
    const v2 = calcularEstimativaPlanoInicialV2(contextoBase);
    const next = aplicarAnaliseOiNaEstimativa(v2, analysisOi, contextoBase);

    expect(next.origemEstimativa).toBe('oi');
    expect(next.quantidadeMedicacaoMg).toBe(132);
    expect(next.duracaoSemanas).toBe(24);
    expect(next.duracaoMeses).toBe(6);
    expect(next.numeroAplicacoes).toBe(24);
    expect(next.oiAnalysisResumo?.pacientesSemelhantes).toBe(85);
  });

  it('mantém V2 quando OI não utilizável', () => {
    const v2 = calcularEstimativaPlanoInicialV2(contextoBase);
    const next = aplicarAnaliseOiNaEstimativa(
      v2,
      { ...analysisOi, confiabilidade: OIConfiabilidade.Baixa },
      contextoBase
    );

    expect(next.origemEstimativa).toBe('v2_deterministica');
    expect(next.quantidadeMedicacaoMg).toBe(v2.quantidadeMedicacaoMg);
    expect(next.oiAnalysisResumo).toBeUndefined();
  });
});

describe('avisoOiNaoAplicada', () => {
  it('menciona fallback quando benchmark é provisório', () => {
    const msg = avisoOiNaoAplicada({
      ...analysisOi,
      confiabilidade: OIConfiabilidade.Baixa,
      benchmarkUtilizado: 'weight_loss_benchmarks/5_a_10@data/oi/weight_loss_benchmarks.fallback.json',
    });
    expect(msg).toMatch(/benchmark provisório/i);
  });
});
