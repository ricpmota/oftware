import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import type { PacienteCompleto } from '@/types/obesidade';
import {
  FaixaIMC,
  FaixaMeta,
  FaixaPeso,
  OIConfiabilidade,
} from '@/types/oi';
import {
  calcularConfiabilidade,
  determinarFaixaIMC,
  determinarFaixaMeta,
  determinarFaixaPeso,
  estimarIntervalo,
  extrairPerfilPaciente,
} from '@/lib/oi/OIHelpers';
import { OIService, analisarPaciente } from '@/lib/oi/OIService';
import { __setBenchmarksForTests } from '@/lib/oi/OIBenchmarkRepository';
import { OI_MODEL_VERSION } from '@/lib/oi/OIVersion';

function pacienteMock(partial: Partial<PacienteCompleto> = {}): PacienteCompleto {
  return {
    id: 'test-id',
    userId: 'uid',
    email: 'x@y.com',
    nome: 'Test',
    medicoResponsavelId: 'med',
    dadosIdentificacao: {
      nomeCompleto: 'Test',
      email: 'x@y.com',
      sexoBiologico: 'F',
      dataNascimento: new Date('1985-03-10'),
      endereco: {},
      dataCadastro: new Date(),
    },
    dadosClinicos: {
      medidasIniciais: { peso: 100, altura: 170, imc: 34.6 },
    } as PacienteCompleto['dadosClinicos'],
    estiloVida: {} as PacienteCompleto['estiloVida'],
    examesLaboratoriais: [],
    planoTerapeutico: {
      metas: { weightLossTargetType: 'PERCENTUAL', weightLossTargetValue: 10 },
      startDate: new Date('2025-01-01'),
    } as PacienteCompleto['planoTerapeutico'],
    evolucaoSeguimento: [
      {
        id: '1',
        weekIndex: 1,
        dataRegistro: new Date('2025-01-08'),
        peso: 100,
        doseAplicada: { quantidade: 2.5, data: new Date(), horario: '08:00' },
        adherence: 'ON_TIME',
      },
    ],
    alertas: [],
    comunicacao: {} as PacienteCompleto['comunicacao'],
    indicadores: {} as PacienteCompleto['indicadores'],
    dataCadastro: new Date(),
    status: 'ativo',
    statusTratamento: 'em_tratamento',
    ...partial,
  };
}

const benchmarkFixture = {
  meta: { versao: 'test' },
  faixas: {
    '5_a_10': {
      faixa: '5_a_10',
      n: 120,
      dadosInsuficientes: false,
      perdaKgMedia: 9.5,
      perdaPercentualMedia: 9.8,
      mgMedio: 132,
      semanasMedia: 24,
      aplicacoesMedia: 24,
      taxaAtingiuMeta: 0.72,
      p25Mg: 118,
      p50Mg: 132,
      p75Mg: 147,
      p90Mg: 160,
      p25Semanas: 20,
      p50Semanas: 24,
      p75Semanas: 28,
    },
  },
};

describe('OIHelpers', () => {
  it('determina faixas corretamente', () => {
    expect(determinarFaixaIMC(32)).toBe(FaixaIMC.Imc30_35);
    expect(determinarFaixaPeso(95)).toBe(FaixaPeso.Entre80_100);
    expect(determinarFaixaMeta(10)).toBe(FaixaMeta.Entre5_10);
  });

  it('calcularConfiabilidade segue limiares', () => {
    expect(calcularConfiabilidade(10, true)).toBe(OIConfiabilidade.Baixa);
    expect(calcularConfiabilidade(50, false)).toBe(OIConfiabilidade.Media);
    expect(calcularConfiabilidade(200, false)).toBe(OIConfiabilidade.Alta);
    expect(calcularConfiabilidade(600, false)).toBe(OIConfiabilidade.MuitoAlta);
  });

  it('estimarIntervalo usa percentis', () => {
    const r = estimarIntervalo({ p25: 118, p50: 132, p75: 147 });
    expect(r).toEqual({ estimado: 132, minimo: 118, maximo: 147 });
  });

  it('extrairPerfilPaciente não expõe PII', () => {
    const perfil = extrairPerfilPaciente(pacienteMock());
    expect(perfil.pesoInicialKg).toBe(100);
    expect(perfil.faixaMeta).toBe(FaixaMeta.Entre5_10);
    expect(JSON.stringify(perfil)).not.toContain('Test');
  });
});

describe('OIService', () => {
  beforeEach(() => {
    __setBenchmarksForTests(benchmarkFixture);
  });

  afterEach(() => {
    __setBenchmarksForTests(null);
  });

  it('analisarPaciente retorna intervalos e confiabilidade', () => {
    const service = new OIService(benchmarkFixture);
    const analysis = service.analisarPaciente(pacienteMock());

    expect(analysis.versaoModelo).toBe(OI_MODEL_VERSION);
    expect(analysis.pacientesSemelhantes).toBe(120);
    expect(analysis.confiabilidade).toBe(OIConfiabilidade.Alta);
    expect(analysis.mgEstimado).toBe(132);
    expect(analysis.mgMinimo).toBe(118);
    expect(analysis.mgMaximo).toBe(147);
    expect(analysis.tempoEstimadoSemanas).toBe(24);
    expect(analysis.tempoMinimoSemanas).toBe(20);
    expect(analysis.tempoMaximoSemanas).toBe(28);
    expect(analysis.aplicacoesEstimadas).toBe(24);
    expect(analysis.probabilidadeAtingirMeta).toBe(0.72);
    expect(analysis.benchmarkUtilizado).toContain('5_a_10');
    expect(analysis.observacoes.length).toBeGreaterThan(0);
  });

  it('export analisarPaciente usa serviço padrão', () => {
    const service = new OIService(benchmarkFixture);
    const viaClass = service.analisarPaciente(pacienteMock());
    __setBenchmarksForTests(benchmarkFixture);
    const viaFn = analisarPaciente(pacienteMock());
    expect(viaFn.faixaMeta).toBe(viaClass.faixaMeta);
  });

  it('retorna análise limitada sem meta', () => {
    const service = new OIService(benchmarkFixture);
    const p = pacienteMock({
      planoTerapeutico: { metas: {} } as PacienteCompleto['planoTerapeutico'],
    });
    const analysis = service.analisarPaciente(p);
    expect(analysis.confiabilidade).toBe(OIConfiabilidade.Baixa);
    expect(analysis.mgEstimado).toBeNull();
    expect(analysis.observacoes.some((o) => o.includes('Meta'))).toBe(true);
  });
});
