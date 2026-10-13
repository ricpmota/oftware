import { describe, expect, it } from 'vitest';
import type { EstrategiaEnergetica } from '@/lib/nutri/estrategiaEnergetica';
import {
  DISTRIBUICAO_CALORICA_PADRAO_V1,
  DISTRIBUICAO_PROTEICA_PADRAO_V1,
  REFEICOES_NUTRI_ORDEM,
  arredondarParaMultiploDe5,
  calcularDistribuicaoMetasRefeicoes,
  selecionarTabelaCalorica,
  type ContextoDistribuicaoRefeicoes,
} from '@/lib/nutri/distribuicaoMetasRefeicoes';

function estrategiaOk(
  meta: number,
  status: EstrategiaEnergetica['status'] = 'calculada'
): EstrategiaEnergetica {
  return {
    versao: 1,
    status,
    getEstimadoKcalDia: Math.round(meta / 0.8),
    intensidadeDesejada: 'moderada',
    intensidadeAplicada: 'moderada',
    deficitPercentual: 0.2,
    deficitKcalDia: Math.round((meta / 0.8) * 0.2),
    metaCaloricaCalculadaKcalDia: meta,
    metaCaloricaAplicadaKcalDia: meta,
    pisoCaloricoAplicadoKcalDia: 1200,
    motivosAjuste: [],
    alertas: [],
    bloqueios: [],
    requerAprovacaoProfissional: status === 'requer_revisao',
    observacoes: [],
  };
}

function estrategiaIndisponivel(): EstrategiaEnergetica {
  return {
    versao: 1,
    status: 'indisponivel',
    getEstimadoKcalDia: null,
    intensidadeDesejada: null,
    intensidadeAplicada: 'indisponivel',
    deficitPercentual: null,
    deficitKcalDia: null,
    metaCaloricaCalculadaKcalDia: null,
    metaCaloricaAplicadaKcalDia: null,
    pisoCaloricoAplicadoKcalDia: null,
    motivosAjuste: [],
    alertas: [],
    bloqueios: ['GET_INDISPONIVEL'],
    requerAprovacaoProfissional: false,
    observacoes: [],
  };
}

function ctx(
  overrides: Partial<ContextoDistribuicaoRefeicoes> = {}
): ContextoDistribuicaoRefeicoes {
  return {
    estrategiaEnergetica: estrategiaOk(1600),
    proteinaDiariaG: 120,
    numeroRefeicoesDia: '4-5',
    horarioTrabalho: 'diurno',
    fomeMatinal: 4,
    fomeNoturna: 4,
    pulaCafeManha: false,
    chegaComMuitaFomeJantar: false,
    compulsaoNoturna: false,
    sintomasGI: 'nenhum',
    atividadeFisica: '3-4x',
    objetivoPrincipal: 'perda_peso',
    ...overrides,
  };
}

describe('padrão', () => {
  it('1–2. percentuais padrão somam 100%', () => {
    const somaC = Object.values(DISTRIBUICAO_CALORICA_PADRAO_V1).reduce((a, b) => a + b, 0);
    const somaP = Object.values(DISTRIBUICAO_PROTEICA_PADRAO_V1).reduce((a, b) => a + b, 0);
    expect(somaC).toBeCloseTo(1, 10);
    expect(somaP).toBeCloseTo(1, 10);
  });

  it('3–6. meta 1600 / prot 120 — somas exatas', () => {
    const r = calcularDistribuicaoMetasRefeicoes(ctx());
    expect(r.status).toBe('calculada');
    expect(r.metaCaloricaDiaKcal).toBe(1600);
    expect(r.proteinaDiariaG).toBe(120);
    expect(r.somaCaloriasKcal).toBe(1600);
    expect(r.somaProteinaG).toBe(120);
    expect(r.refeicoes.cafe.caloriasAlvoKcal).toBe(320);
    expect(r.refeicoes.lanche1.caloriasAlvoKcal).toBe(160);
    expect(r.refeicoes.almoco.caloriasAlvoKcal).toBe(480);
    expect(r.refeicoes.lanche2.caloriasAlvoKcal).toBe(240);
    expect(r.refeicoes.jantar.caloriasAlvoKcal).toBe(400);
    expect(r.refeicoes.cafe.proteinaAlvoG).toBe(24);
    expect(r.refeicoes.lanche1.proteinaAlvoG).toBe(12);
    expect(r.refeicoes.almoco.proteinaAlvoG).toBe(36);
    expect(r.refeicoes.lanche2.proteinaAlvoG).toBe(18);
    expect(r.refeicoes.jantar.proteinaAlvoG).toBe(30);
  });
});

describe('comportamento', () => {
  it('7. pula café reduz café e aumenta lanche1', () => {
    const r = calcularDistribuicaoMetasRefeicoes(ctx({ pulaCafeManha: true }));
    expect(r.refeicoes.cafe.percentualCalorico).toBe(0.12);
    expect(r.refeicoes.lanche1.percentualCalorico).toBe(0.18);
    expect(r.ajustesAplicados).toContain('CAFE_REDUZIDO_POR_BAIXA_ADESAO_MATINAL');
    expect(r.somaCaloriasKcal).toBe(1600);
  });

  it('8. fome matinal alta reforça café', () => {
    const r = calcularDistribuicaoMetasRefeicoes(
      ctx({ fomeMatinal: 8, pulaCafeManha: false })
    );
    expect(r.refeicoes.cafe.percentualCalorico).toBe(0.25);
    expect(r.ajustesAplicados).toContain('CAFE_REFORCADO_POR_FOME_MATINAL');
  });

  it('9. muita fome no jantar reforça almoço/lanche2', () => {
    const r = calcularDistribuicaoMetasRefeicoes(
      ctx({ chegaComMuitaFomeJantar: true })
    );
    expect(r.refeicoes.almoco.percentualCalorico).toBe(0.32);
    expect(r.refeicoes.lanche2.percentualCalorico).toBe(0.18);
    expect(r.refeicoes.jantar.percentualCalorico).toBe(0.22);
  });

  it('10. compulsão reforça lanche2', () => {
    const r = calcularDistribuicaoMetasRefeicoes(ctx({ compulsaoNoturna: true }));
    expect(r.refeicoes.lanche2.percentualCalorico).toBe(0.2);
    expect(r.refeicoes.jantar.percentualCalorico).toBe(0.2);
  });

  it('11. compulsão tem prioridade sobre fome matinal', () => {
    const sel = selecionarTabelaCalorica(
      ctx({ compulsaoNoturna: true, fomeMatinal: 9 })
    );
    expect(sel.ajustePrincipal).toBe('LANCHE2_REFORCADO_POR_COMPULSAO_NOTURNA');
    expect(sel.tabela.lanche2).toBe(0.2);
  });

  it('12. muita fome jantar tem prioridade sobre pular café', () => {
    const sel = selecionarTabelaCalorica(
      ctx({ chegaComMuitaFomeJantar: true, pulaCafeManha: true })
    );
    expect(sel.ajustePrincipal).toBe(
      'ALMOCO_E_LANCHE2_REFORCADOS_PARA_PREVENIR_FOME_NOTURNA'
    );
  });

  it('13. apenas uma tabela comportamental principal', () => {
    const sel = selecionarTabelaCalorica(
      ctx({
        compulsaoNoturna: true,
        chegaComMuitaFomeJantar: true,
        pulaCafeManha: true,
        fomeMatinal: 9,
      })
    );
    expect(sel.ajustePrincipal).toBe('LANCHE2_REFORCADO_POR_COMPULSAO_NOTURNA');
    expect(Object.values(sel.tabela).reduce((a, b) => a + b, 0)).toBeCloseTo(1);
  });
});

describe('GI', () => {
  it('14. GI moderado mantém percentuais e gera ajuste', () => {
    const r = calcularDistribuicaoMetasRefeicoes(ctx({ sintomasGI: 'moderado' }));
    expect(r.refeicoes.cafe.percentualCalorico).toBe(0.2);
    expect(r.ajustesAplicados).toContain('PORCOES_MENORES_E_PREPARACOES_DIGESTIVAS');
  });

  it('15–17. GI grave fraciona e tem prioridade; total 100%', () => {
    const r = calcularDistribuicaoMetasRefeicoes(
      ctx({ sintomasGI: 'grave', compulsaoNoturna: true })
    );
    expect(r.refeicoes.lanche1.percentualCalorico).toBe(0.15);
    expect(r.ajustesAplicados).toContain('DISTRIBUICAO_FRACIONADA_POR_SINTOMAS_GI');
    const soma = REFEICOES_NUTRI_ORDEM.reduce(
      (s, k) => s + r.refeicoes[k].percentualCalorico,
      0
    );
    expect(soma).toBeCloseTo(1);
    expect(r.somaCaloriasKcal).toBe(1600);
  });
});

describe('trabalho e número de refeições', () => {
  it('18–20. trabalho noturno/turnos alertam; diurno não', () => {
    expect(
      calcularDistribuicaoMetasRefeicoes(ctx({ horarioTrabalho: 'noturno' }))
        .ajustesAplicados
    ).toContain('DISTRIBUICAO_DEVE_SEGUIR_HORARIO_ACORDADO');
    expect(
      calcularDistribuicaoMetasRefeicoes(ctx({ horarioTrabalho: 'turnos' }))
        .ajustesAplicados
    ).toContain('DISTRIBUICAO_DEVE_SEGUIR_HORARIO_ACORDADO');
    expect(
      calcularDistribuicaoMetasRefeicoes(ctx({ horarioTrabalho: 'diurno' }))
        .ajustesAplicados
    ).not.toContain('DISTRIBUICAO_DEVE_SEGUIR_HORARIO_ACORDADO');
  });

  it('21–24. número de refeições; sempre 5 keys', () => {
    expect(
      calcularDistribuicaoMetasRefeicoes(ctx({ numeroRefeicoesDia: '2-3' }))
        .ajustesAplicados
    ).toContain('PACIENTE_RELATA_MENOS_REFEICOES_QUE_O_PLANO_PADRAO');
    expect(
      calcularDistribuicaoMetasRefeicoes(ctx({ numeroRefeicoesDia: '4-5' }))
        .ajustesAplicados
    ).not.toContain('PACIENTE_RELATA_MENOS_REFEICOES_QUE_O_PLANO_PADRAO');
    expect(
      calcularDistribuicaoMetasRefeicoes(ctx({ numeroRefeicoesDia: '>5' }))
        .ajustesAplicados
    ).toContain('PACIENTE_RELATA_MAIS_REFEICOES_QUE_O_PLANO_PADRAO');
    const r = calcularDistribuicaoMetasRefeicoes(ctx({ numeroRefeicoesDia: '2-3' }));
    expect(Object.keys(r.refeicoes)).toHaveLength(5);
  });
});

describe('proteína e arredondamento', () => {
  it('25–28. recomposição / 5-7x altera % protéica sem aumentar total', () => {
    const r = calcularDistribuicaoMetasRefeicoes(
      ctx({ objetivoPrincipal: 'recomposicao', proteinaDiariaG: 120 })
    );
    expect(r.refeicoes.lanche1.percentualProteico).toBe(0.12);
    expect(r.refeicoes.almoco.percentualProteico).toBe(0.28);
    expect(r.somaProteinaG).toBe(120);
    expect(r.proteinaDiariaG).toBe(120);
    expect(r.ajustesAplicados).toContain('PROTEINA_MAIS_DISTRIBUIDA_PARA_RECOMPOSICAO');

    const a = calcularDistribuicaoMetasRefeicoes(
      ctx({ atividadeFisica: '5-7x', proteinaDiariaG: 100 })
    );
    expect(a.somaProteinaG).toBe(100);
  });

  it('29–33. arredondamento e residual no almoço', () => {
    expect(arredondarParaMultiploDe5(323)).toBe(325);
    expect(arredondarParaMultiploDe5(322)).toBe(320);

    // Meta que gera residual típico
    const r = calcularDistribuicaoMetasRefeicoes(
      ctx({
        estrategiaEnergetica: estrategiaOk(1603),
        proteinaDiariaG: 121.4,
      })
    );
    expect(r.somaCaloriasKcal).toBe(1603);
    expect(r.somaProteinaG).toBe(121);
    for (const k of REFEICOES_NUTRI_ORDEM) {
      if (k === 'almoco') continue;
      expect(r.refeicoes[k].caloriasAlvoKcal % 5).toBe(0);
    }
  });
});

describe('indisponibilidade e separação', () => {
  it('34–38. bloqueios sem fallback fixo', () => {
    expect(
      calcularDistribuicaoMetasRefeicoes(
        ctx({ estrategiaEnergetica: estrategiaIndisponivel() })
      ).status
    ).toBe('indisponivel');

    expect(
      calcularDistribuicaoMetasRefeicoes(
        ctx({
          estrategiaEnergetica: {
            ...estrategiaOk(1600),
            metaCaloricaAplicadaKcalDia: null,
          },
        })
      ).status
    ).toBe('indisponivel');

    expect(
      calcularDistribuicaoMetasRefeicoes(
        ctx({
          estrategiaEnergetica: {
            ...estrategiaOk(1600),
            metaCaloricaAplicadaKcalDia: Number.NaN,
          },
        })
      ).status
    ).toBe('indisponivel');

    expect(
      calcularDistribuicaoMetasRefeicoes(ctx({ proteinaDiariaG: Number.NaN })).status
    ).toBe('indisponivel');
  });

  it('requer_revisao não bloqueia distribuição', () => {
    const r = calcularDistribuicaoMetasRefeicoes(
      ctx({ estrategiaEnergetica: estrategiaOk(1600, 'requer_revisao') })
    );
    expect(r.status).toBe('calculada');
    expect(r.alertas).toContain('ESTRATEGIA_REQUER_REVISAO_MAS_DISTRIBUICAO_CALCULADA');
  });

  it('39–45 / 50. imutabilidade e sem catálogo', () => {
    const c = ctx();
    const before = JSON.stringify(c);
    const r = calcularDistribuicaoMetasRefeicoes(c);
    expect(JSON.stringify(c)).toBe(before);
    expect(JSON.stringify(r)).not.toMatch(/catalogo|tirzepatida|opcao01|itemId/i);
  });
});
