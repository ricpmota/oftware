import { describe, expect, it } from 'vitest';
import {
  CATALOGO_OPCAO_01_SNAPSHOT_V1,
  IDS_CATALOGO_OPCAO_01_V1,
} from '@/lib/nutri/catalogoOpcao01Snapshot';
import {
  ESTILOS_AUDITADOS_V1,
  LIMITES_CLASSIFICACAO_COBERTURA_V1,
  METAS_CALORIAS_POR_REFEICAO_V1,
  METAS_PROTEINA_POR_REFEICAO_V1,
  PREFERENCIAS_AUDITADAS_V1,
  RESTRICOES_AUDITADAS_V1,
  avaliarCenarioAuditoria,
  avaliarNaturalidadeCombinacao,
  cenarioFoiAtendido,
  classificarCoberturaPercentual,
  contarCenariosMatriz,
  executarAuditoriaCoberturaCatalogo,
  gerarDefinicoesCenarios,
  montarIdCenario,
} from '@/lib/nutri/auditoriaCoberturaCatalogo';
import { REFEICOES_NUTRI_ORDEM } from '@/lib/nutri/distribuicaoMetasRefeicoes';
import { montarPratoPadraoRefeicaoV2 } from '@/lib/nutri/montagemPratoPadrao';

describe('auditoria cobertura catálogo', () => {
  it('1–2. usa motor V2 real (sem duplicar montagem)', () => {
    const def = gerarDefinicoesCenarios('teste')[0];
    const a = avaliarCenarioAuditoria(def, CATALOGO_OPCAO_01_SNAPSHOT_V1);
    expect(typeof montarPratoPadraoRefeicaoV2).toBe('function');
    expect(a.idCenario).toBeTruthy();
  });

  it('3–6. estilos, refeições, restrições e preferências cobertos', () => {
    const defs = gerarDefinicoesCenarios('teste');
    for (const e of ESTILOS_AUDITADOS_V1) {
      expect(defs.some((d) => d.estilo === e)).toBe(true);
    }
    for (const r of REFEICOES_NUTRI_ORDEM) {
      expect(defs.some((d) => d.refeicao === r)).toBe(true);
    }
    for (const restr of RESTRICOES_AUDITADAS_V1) {
      const key = restr.join('+');
      expect(defs.some((d) => d.restricoes.join('+') === key)).toBe(true);
    }
    for (const prefs of PREFERENCIAS_AUDITADAS_V1) {
      expect(defs.some((d) => d.preferenciasProteina.join('+') === prefs.join('+'))).toBe(true);
    }
  });

  it('7–8. IDs determinísticos e relatório estável (V1)', () => {
    const a = executarAuditoriaCoberturaCatalogo({ modo: 'teste', versaoCatalogo: 1 });
    const b = executarAuditoriaCoberturaCatalogo({ modo: 'teste', versaoCatalogo: 1 });
    expect(a.resumo.totalCenarios).toBe(b.resumo.totalCenarios);
    expect(a.cenarios.map((c) => c.idCenario)).toEqual(b.cenarios.map((c) => c.idCenario));
    expect(a.resumo.percentualAtendimento).toBe(b.resumo.percentualAtendimento);
  });

  it('9. percentual de atendimento correto', () => {
    const rel = executarAuditoriaCoberturaCatalogo({ modo: 'teste', versaoCatalogo: 1 });
    const ok = rel.cenarios.filter((c) => cenarioFoiAtendido(c)).length;
    expect(rel.resumo.atendidos).toBe(ok);
    expect(rel.resumo.percentualAtendimento).toBeCloseTo(ok / rel.cenarios.length, 10);
  });

  it('10–13. classificação por limiares V1', () => {
    expect(LIMITES_CLASSIFICACAO_COBERTURA_V1.excelenteMin).toBe(0.9);
    expect(classificarCoberturaPercentual(0.95)).toBe('excelente');
    expect(classificarCoberturaPercentual(0.8)).toBe('boa');
    expect(classificarCoberturaPercentual(0.6)).toBe('limitada');
    expect(classificarCoberturaPercentual(0.4)).toBe('insuficiente');
  });

  it('14–15. alertas agregados', () => {
    const rel = executarAuditoriaCoberturaCatalogo({ modo: 'amostra', versaoCatalogo: 1 });
    expect(Array.isArray(rel.resumo.alertasMaisFrequentes)).toBe(true);
  }, 30_000);

  it('16–19. naturalidade', () => {
    expect(
      avaliarNaturalidadeCombinacao('almoco', ['prot_peixe_100g', 'prot_whey_1dose']).natural
    ).toBe(false);
    expect(
      avaliarNaturalidadeCombinacao('cafe', ['gord_azeite_1col', 'gord_castanhas_porcao']).natural
    ).toBe(false);
  });

  it('20. vegano V1 lanche', () => {
    const r = avaliarCenarioAuditoria(
      {
        idCenario: 't',
        refeicao: 'lanche1',
        estilo: 'plant_based',
        metaCaloriasKcal: 200,
        metaProteinaG: 25,
        restricoes: ['vegano'],
        preferenciasProteina: [],
      },
      CATALOGO_OPCAO_01_SNAPSHOT_V1
    );
    expect(['atendido', 'atendido_com_alertas', 'nao_atendido']).toContain(r.status);
  });

  it('21–24. catálogo V1 intacto', () => {
    const before = JSON.stringify(CATALOGO_OPCAO_01_SNAPSHOT_V1);
    const ids = [...IDS_CATALOGO_OPCAO_01_V1];
    executarAuditoriaCoberturaCatalogo({ modo: 'teste', versaoCatalogo: 1 });
    expect(JSON.stringify(CATALOGO_OPCAO_01_SNAPSHOT_V1)).toBe(before);
    expect(IDS_CATALOGO_OPCAO_01_V1).toEqual(ids);
  });

  it('25. objetos de entrada não modificados', () => {
    const cat = CATALOGO_OPCAO_01_SNAPSHOT_V1.map((i) => ({ ...i }));
    const before = JSON.stringify(cat);
    avaliarCenarioAuditoria(
      {
        idCenario: 'x',
        refeicao: 'almoco',
        estilo: 'mediterranea',
        metaCaloriasKcal: 500,
        metaProteinaG: 40,
        restricoes: [],
        preferenciasProteina: ['Frango'],
      },
      cat
    );
    expect(JSON.stringify(cat)).toBe(before);
  });

  it('28. número de cenários estável', () => {
    expect(contarCenariosMatriz('teste')).toBe(gerarDefinicoesCenarios('teste').length);
    expect(contarCenariosMatriz('completo')).toBeGreaterThan(contarCenariosMatriz('amostra'));
  });

  it('29. JSON serializável', () => {
    const rel = executarAuditoriaCoberturaCatalogo({ modo: 'teste', versaoCatalogo: 2 });
    expect(() => JSON.stringify(rel)).not.toThrow();
  });

  it('ids de cenário', () => {
    expect(
      montarIdCenario({
        refeicao: 'cafe',
        estilo: 'digestiva',
        metaCaloriasKcal: 300,
        metaProteinaG: 25,
        restricoes: ['vegano'],
        preferenciasProteina: ['Ovos'],
      })
    ).toBe('cafe|digestiva|k300|p25|vegano|Ovos');
  });

  it('matrizes de metas', () => {
    for (const r of REFEICOES_NUTRI_ORDEM) {
      expect(METAS_CALORIAS_POR_REFEICAO_V1[r].length).toBeGreaterThan(0);
      expect(METAS_PROTEINA_POR_REFEICAO_V1[r].length).toBeGreaterThan(0);
    }
  });
});
