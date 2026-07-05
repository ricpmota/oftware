import { describe, expect, it } from 'vitest';
import {
  calcularComposicaoPlanoInterativo,
  resolverDescontoPercentualPorVolumeMg,
} from '@/lib/metaadmin/planoTerapeuticoComercial';
import { gerarCenariosPlanoTerapeutico, MAX_KG_PER_SEMANA } from '@/lib/metaadmin/planoTerapeuticoInterativoEngine';
import { criarValoresPadraoConfigOrcamento } from '@/lib/metaadmin/orcamentoTerapeuticoUtils';
import type { EstimativaPlanoInicialV1 } from '@/lib/metaadmin/orcamentoTerapeuticoUtils';
import type { OrcamentoTerapeuticoConfig } from '@/types/orcamentoTerapeuticoConfig';

function configBase(): OrcamentoTerapeuticoConfig {
  const padrao = criarValoresPadraoConfigOrcamento();
  return {
    medicoId: 'med-1',
    ...padrao,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

const estimativaEquilibrada: EstimativaPlanoInicialV1 = {
  duracaoMeses: 6,
  duracaoSemanas: 24,
  numeroAplicacoes: 24,
  quantidadeMedicacaoMg: 88,
  consultasIncluidas: 6,
  bioimpedanciasIncluidas: 3,
  examesIncluidos: 2,
  nomePlanoSugerido: 'Plano 12 kg / 6 meses',
  origemEstimativa: 'v2_deterministica',
};

describe('resolverDescontoPercentualPorVolumeMg', () => {
  it('aplica faixa correta por volume', () => {
    const faixas = criarValoresPadraoConfigOrcamento().descontosPorVolumeMg;
    expect(resolverDescontoPercentualPorVolumeMg(50, faixas)).toBe(0);
    expect(resolverDescontoPercentualPorVolumeMg(80, faixas)).toBe(5);
    expect(resolverDescontoPercentualPorVolumeMg(130, faixas)).toBe(8);
    expect(resolverDescontoPercentualPorVolumeMg(200, faixas)).toBe(10);
  });
});

describe('calcularComposicaoPlanoInterativo', () => {
  it('reduz custo de medicação com desconto por volume', () => {
    const config = configBase();
    const semDesconto = calcularComposicaoPlanoInterativo(
      { ...estimativaEquilibrada, quantidadeMedicacaoMg: 50 },
      config
    );
    const comDesconto = calcularComposicaoPlanoInterativo(
      { ...estimativaEquilibrada, quantidadeMedicacaoMg: 160 },
      config
    );
    expect(comDesconto.descontoMedicacaoVolumePercentual).toBe(10);
    expect(comDesconto.custoMedicacaoLiquido).toBeLessThan(
      160 * config.valorPorMg
    );
    expect(semDesconto.descontoMedicacaoVolume).toBe(0);
  });
});

describe('gerarCenariosPlanoTerapeutico', () => {
  it('gera três cenários com valores distintos', () => {
    const cenarios = gerarCenariosPlanoTerapeutico({
      metaKg: 12,
      metaPercentual: 12,
      pesoAtual: 95,
      pesoInicial: 100,
      estimativaEquilibrada,
      config: configBase(),
    });

    expect(cenarios.progressivo.estimativa.duracaoSemanas).toBeGreaterThan(
      cenarios.equilibrado.estimativa.duracaoSemanas
    );
    expect(cenarios.intensivo.estimativa.duracaoSemanas).toBeLessThan(
      cenarios.equilibrado.estimativa.duracaoSemanas
    );
    expect(cenarios.intensivo.estimativa.quantidadeMedicacaoMg).toBeGreaterThan(
      cenarios.equilibrado.estimativa.quantidadeMedicacaoMg
    );
    expect(cenarios.progressivo.estimativa.quantidadeMedicacaoMg).toBeLessThanOrEqual(
      cenarios.equilibrado.estimativa.quantidadeMedicacaoMg
    );
    expect(cenarios.equilibrado.curvaPeso.length).toBeGreaterThan(1);
  });

  it('aplica guardrail de kg/semana', () => {
    const cenarios = gerarCenariosPlanoTerapeutico({
      metaKg: 40,
      metaPercentual: 25,
      pesoAtual: 120,
      pesoInicial: 130,
      estimativaEquilibrada: {
        ...estimativaEquilibrada,
        duracaoSemanas: 8,
        duracaoMeses: 2,
      },
      config: configBase(),
    });

    const eq = cenarios.equilibrado;
    expect(eq.perdaSemanalKg).toBeLessThanOrEqual(MAX_KG_PER_SEMANA);
    expect(eq.guardrailAplicado).toBe(true);
    expect(eq.mensagemGuardrail).toContain('clinicamente prudente');
  });
});
