import { describe, expect, it } from 'vitest';
import type { EstimativaGastoEnergeticoTotal } from '@/lib/nutri/estimativaGastoEnergetico';
import {
  DEFICITS_ENERGETICOS_V1,
  PISOS_CALORICOS_PADRAO_V1,
  calcularEstrategiaEnergetica,
  classificarEnergiaKcal,
  determinarIntensidadeAplicada,
  type ContextoEstrategiaEnergetica,
} from '@/lib/nutri/estrategiaEnergetica';

function getOk(
  overrides: Partial<EstimativaGastoEnergeticoTotal> & {
    getEstimadoKcalDia: number;
    tmbEstimativaKcalDia?: number;
  }
): EstimativaGastoEnergeticoTotal {
  const {
    getEstimadoKcalDia,
    tmbEstimativaKcalDia = Math.round(getEstimadoKcalDia / 1.35),
    ...rest
  } = overrides;
  return {
    versao: 1,
    status: 'calculado',
    tmbEstimativaKcalDia,
    nivelAtividade: 'moderadamente_ativo',
    fatorAtividade: 1.5,
    confiancaAtividade: 'moderada',
    getEstimadoKcalDia,
    contextoAtividade: {
      atividadeFisicaDeclarada: '3-4x',
      horasSentado: '4-8h',
    },
    motivosIndisponibilidade: [],
    alertas: [],
    observacoes: [],
    ...rest,
  };
}

function getIndisponivel(): EstimativaGastoEnergeticoTotal {
  return {
    versao: 1,
    status: 'indisponivel',
    tmbEstimativaKcalDia: null,
    nivelAtividade: 'indisponivel',
    fatorAtividade: null,
    confiancaAtividade: null,
    getEstimadoKcalDia: null,
    contextoAtividade: {
      atividadeFisicaDeclarada: null,
      horasSentado: null,
    },
    motivosIndisponibilidade: ['ATIVIDADE_FISICA_INDISPONIVEL'],
    alertas: [],
    observacoes: [],
  };
}

function ctx(
  overrides: Partial<ContextoEstrategiaEnergetica> = {}
): ContextoEstrategiaEnergetica {
  return {
    get: getOk({ getEstimadoKcalDia: 2000, tmbEstimativaKcalDia: 1400 }),
    intensidadeDesejada: 'moderada',
    objetivoPrincipal: 'perda_peso',
    sexoBiologico: 'feminino',
    idadeAnos: 40,
    imcAtual: 30,
    atividadeFisicaDeclarada: '3-4x',
    sintomasGI: 'nenhum',
    efeitoSanfona: 'nao',
    fomeEmocional: false,
    compulsaoNoturna: false,
    gestacaoConfirmada: false,
    lactacaoConfirmada: false,
    ...overrides,
  };
}

describe('déficits', () => {
  it('1–4. percentuais centralizados e aplicados', () => {
    expect(DEFICITS_ENERGETICOS_V1.leve).toBe(0.12);
    expect(DEFICITS_ENERGETICOS_V1.moderada).toBe(0.2);
    expect(DEFICITS_ENERGETICOS_V1.intensiva).toBe(0.3);

    const leve = calcularEstrategiaEnergetica(
      ctx({
        get: getOk({ getEstimadoKcalDia: 2000, tmbEstimativaKcalDia: 1400 }),
        intensidadeDesejada: 'leve',
      })
    );
    expect(leve.deficitPercentual).toBe(0.12);
    expect(leve.metaCaloricaCalculadaKcalDia).toBe(1760);

    const mod = calcularEstrategiaEnergetica(
      ctx({
        get: getOk({ getEstimadoKcalDia: 2000, tmbEstimativaKcalDia: 1400 }),
        intensidadeDesejada: 'moderada',
      })
    );
    expect(mod.deficitPercentual).toBe(0.2);
    expect(mod.metaCaloricaCalculadaKcalDia).toBe(1600);

    const int = calcularEstrategiaEnergetica(
      ctx({
        get: getOk({ getEstimadoKcalDia: 2500, tmbEstimativaKcalDia: 1600 }),
        intensidadeDesejada: 'intensiva',
      })
    );
    expect(int.deficitPercentual).toBe(0.3);
    expect(int.metaCaloricaCalculadaKcalDia).toBe(1750);
  });

  it('5. arredondamento no déficit e meta', () => {
    // 2025 * 0.12 = 243; 2025 * 0.88 = 1782
    const r = calcularEstrategiaEnergetica(
      ctx({
        get: getOk({ getEstimadoKcalDia: 2025, tmbEstimativaKcalDia: 1500 }),
        intensidadeDesejada: 'leve',
      })
    );
    expect(r.deficitKcalDia).toBe(Math.round(2025 * 0.12));
    expect(r.metaCaloricaCalculadaKcalDia).toBe(Math.round(2025 * 0.88));
  });
});

describe('intensidade', () => {
  it('6–7. começa igual e nunca eleva', () => {
    const r = calcularEstrategiaEnergetica(ctx({ intensidadeDesejada: 'leve' }));
    expect(r.intensidadeAplicada).toBe('leve');
    const det = determinarIntensidadeAplicada(ctx({ intensidadeDesejada: 'leve' }), 'leve');
    expect(det.aplicada).toBe('leve');
  });

  it('8. compulsão reduz intensiva', () => {
    const r = calcularEstrategiaEnergetica(
      ctx({
        get: getOk({ getEstimadoKcalDia: 2500, tmbEstimativaKcalDia: 1600 }),
        intensidadeDesejada: 'intensiva',
        compulsaoNoturna: true,
      })
    );
    expect(r.intensidadeAplicada).toBe('moderada');
    expect(r.deficitPercentual).toBe(0.2);
    expect(r.metaCaloricaCalculadaKcalDia).toBe(2000);
    expect(r.motivosAjuste).toContain('INTENSIDADE_REDUZIDA_POR_COMPULSAO_NOTURNA');
  });

  it('9–13. outras reduções de intensiva', () => {
    expect(
      calcularEstrategiaEnergetica(
        ctx({ intensidadeDesejada: 'intensiva', fomeEmocional: true })
      ).motivosAjuste
    ).toContain('INTENSIDADE_REDUZIDA_POR_FOME_EMOCIONAL');

    expect(
      calcularEstrategiaEnergetica(
        ctx({ intensidadeDesejada: 'intensiva', efeitoSanfona: 'sim' })
      ).motivosAjuste
    ).toContain('INTENSIDADE_REDUZIDA_POR_HISTORICO_DE_RESTRICAO');

    expect(
      calcularEstrategiaEnergetica(
        ctx({ intensidadeDesejada: 'intensiva', sintomasGI: 'grave' })
      ).motivosAjuste
    ).toContain('INTENSIDADE_REDUZIDA_POR_SINTOMAS_GI');

    expect(
      calcularEstrategiaEnergetica(
        ctx({
          intensidadeDesejada: 'intensiva',
          objetivoPrincipal: 'recomposicao',
        })
      ).motivosAjuste
    ).toContain('INTENSIDADE_REDUZIDA_PARA_PRESERVAR_RECOMPOSICAO');

    expect(
      calcularEstrategiaEnergetica(
        ctx({
          intensidadeDesejada: 'intensiva',
          atividadeFisicaDeclarada: '5-7x',
        })
      ).motivosAjuste
    ).toContain('INTENSIDADE_REDUZIDA_POR_ALTA_DEMANDA_DE_ATIVIDADE');
  });

  it('14. múltiplos motivos sem duplicar', () => {
    const r = calcularEstrategiaEnergetica(
      ctx({
        intensidadeDesejada: 'intensiva',
        fomeEmocional: true,
        compulsaoNoturna: true,
      })
    );
    expect(r.intensidadeAplicada).toBe('moderada');
    expect(r.motivosAjuste).toEqual([
      'INTENSIDADE_REDUZIDA_POR_COMPULSAO_NOTURNA',
      'INTENSIDADE_REDUZIDA_POR_FOME_EMOCIONAL',
    ]);
    expect(new Set(r.motivosAjuste).size).toBe(r.motivosAjuste.length);
  });

  it('15. intensiva sempre requer revisão', () => {
    const r = calcularEstrategiaEnergetica(
      ctx({
        get: getOk({ getEstimadoKcalDia: 2500, tmbEstimativaKcalDia: 1600 }),
        intensidadeDesejada: 'intensiva',
      })
    );
    expect(r.intensidadeAplicada).toBe('intensiva');
    expect(r.status).toBe('requer_revisao');
    expect(r.requerAprovacaoProfissional).toBe(true);
    expect(r.alertas).toContain('INTENSIDADE_INTENSIVA_REQUER_APROVACAO');
  });
});

describe('pisos', () => {
  it('16–19. pisos e elevação', () => {
    expect(PISOS_CALORICOS_PADRAO_V1.feminino).toBe(1200);
    expect(PISOS_CALORICOS_PADRAO_V1.masculino).toBe(1500);
    expect(Object.values(PISOS_CALORICOS_PADRAO_V1)).not.toContain(1000);

    const acima = calcularEstrategiaEnergetica(
      ctx({
        get: getOk({ getEstimadoKcalDia: 2000, tmbEstimativaKcalDia: 1400 }),
        intensidadeDesejada: 'moderada',
        sexoBiologico: 'feminino',
      })
    );
    expect(acima.metaCaloricaAplicadaKcalDia).toBe(1600);
    expect(acima.motivosAjuste).not.toContain('META_ELEVADA_AO_PISO_PADRAO');

    // Caso 5: GET 1450 intensiva feminino TMB 1180 → math 1015 → piso 1200
    const piso = calcularEstrategiaEnergetica(
      ctx({
        get: getOk({ getEstimadoKcalDia: 1450, tmbEstimativaKcalDia: 1180 }),
        intensidadeDesejada: 'intensiva',
        sexoBiologico: 'feminino',
      })
    );
    expect(piso.metaCaloricaCalculadaKcalDia).toBe(1015);
    expect(piso.metaCaloricaAplicadaKcalDia).toBe(1200);
    expect(piso.motivosAjuste).toContain('META_ELEVADA_AO_PISO_PADRAO');
    expect(piso.status).toBe('requer_revisao');
  });

  it('20–21. sexo ausente bloqueia; sem piso 1000', () => {
    const r = calcularEstrategiaEnergetica(ctx({ sexoBiologico: null }));
    expect(r.status).toBe('indisponivel');
    expect(r.bloqueios).toContain('DADOS_CLINICOS_INSUFICIENTES');
    expect(r.metaCaloricaAplicadaKcalDia).toBeNull();
  });
});

describe('TMB', () => {
  it('22–25. proteção pela TMB', () => {
    // Caso 6: GET 1500, TMB 1300, moderada, feminino → math 1200 → eleva a 1300
    const r = calcularEstrategiaEnergetica(
      ctx({
        get: getOk({ getEstimadoKcalDia: 1500, tmbEstimativaKcalDia: 1300 }),
        intensidadeDesejada: 'moderada',
        sexoBiologico: 'feminino',
      })
    );
    expect(r.metaCaloricaCalculadaKcalDia).toBe(1200);
    expect(r.metaCaloricaAplicadaKcalDia).toBe(1300);
    expect(r.motivosAjuste).toContain('META_ELEVADA_PARA_NAO_FICAR_ABAIXO_DA_TMB');
    expect(r.status).toBe('requer_revisao');

    const acima = calcularEstrategiaEnergetica(
      ctx({
        get: getOk({ getEstimadoKcalDia: 2000, tmbEstimativaKcalDia: 1400 }),
        intensidadeDesejada: 'leve',
      })
    );
    expect(acima.metaCaloricaAplicadaKcalDia).toBe(1760);
    expect(acima.motivosAjuste).not.toContain('META_ELEVADA_PARA_NAO_FICAR_ABAIXO_DA_TMB');
  });
});

describe('energia baixa', () => {
  it('26–29. classificação e não aplicação silenciosa', () => {
    expect(classificarEnergiaKcal(1200)).toBe('padrao');
    expect(classificarEnergiaKcal(1199)).toBe('baixa_energia');
    expect(classificarEnergiaKcal(800)).toBe('baixa_energia');
    expect(classificarEnergiaKcal(799)).toBe('muito_baixa_energia');

    const baixa = calcularEstrategiaEnergetica(
      ctx({
        get: getOk({ getEstimadoKcalDia: 1450, tmbEstimativaKcalDia: 1180 }),
        intensidadeDesejada: 'intensiva',
        sexoBiologico: 'feminino',
      })
    );
    expect(baixa.alertas).toContain('ESTRATEGIA_BAIXA_ENERGIA_REQUER_SUPERVISAO');
    expect(baixa.metaCaloricaAplicadaKcalDia).toBeGreaterThanOrEqual(1200);
    expect(baixa.requerAprovacaoProfissional).toBe(true);
  });
});

describe('objetivos', () => {
  it('30–31. manutenção déficit zero', () => {
    const r = calcularEstrategiaEnergetica(
      ctx({
        get: getOk({ getEstimadoKcalDia: 2100, tmbEstimativaKcalDia: 1500 }),
        objetivoPrincipal: 'manutencao',
        intensidadeDesejada: 'intensiva',
      })
    );
    expect(r.deficitPercentual).toBe(0);
    expect(r.deficitKcalDia).toBe(0);
    expect(r.metaCaloricaAplicadaKcalDia).toBe(2100);
    expect(r.intensidadeAplicada).toBe('manutencao');
    expect(r.alertas).toContain('OBJETIVO_MANUTENCAO_COM_INTENSIDADE_DE_PERDA');
  });

  it('32–35. perda segue intensidade; recomposição reduz; outros sem regra inventada', () => {
    expect(
      calcularEstrategiaEnergetica(
        ctx({ objetivoPrincipal: 'perda_peso', intensidadeDesejada: 'leve' })
      ).deficitPercentual
    ).toBe(0.12);

    expect(
      calcularEstrategiaEnergetica(
        ctx({
          objetivoPrincipal: 'recomposicao',
          intensidadeDesejada: 'intensiva',
        })
      ).intensidadeAplicada
    ).toBe('moderada');

    const glic = calcularEstrategiaEnergetica(
      ctx({ objetivoPrincipal: 'controle_glicemia', intensidadeDesejada: 'moderada' })
    );
    expect(glic.deficitPercentual).toBe(0.2);
    expect(glic.motivosAjuste).toEqual([]);

    const disp = calcularEstrategiaEnergetica(
      ctx({ objetivoPrincipal: 'melhora_disposicao', intensidadeDesejada: 'leve' })
    );
    expect(disp.deficitPercentual).toBe(0.12);
  });
});

describe('bloqueios', () => {
  it('36–40. bloqueios absolutos', () => {
    expect(
      calcularEstrategiaEnergetica(ctx({ get: getIndisponivel() })).bloqueios
    ).toContain('GET_INDISPONIVEL');

    expect(
      calcularEstrategiaEnergetica(ctx({ gestacaoConfirmada: true })).bloqueios
    ).toContain('GESTACAO');

    expect(
      calcularEstrategiaEnergetica(ctx({ lactacaoConfirmada: true })).bloqueios
    ).toContain('LACTACAO');

    expect(
      calcularEstrategiaEnergetica(ctx({ intensidadeDesejada: null })).bloqueios
    ).toContain('INTENSIDADE_DESEJADA_INDISPONIVEL');
  });
});

describe('confiança', () => {
  it('41–43. GET baixa confiança exige revisão', () => {
    const baixa = calcularEstrategiaEnergetica(
      ctx({
        get: getOk({
          getEstimadoKcalDia: 2000,
          tmbEstimativaKcalDia: 1400,
          confiancaAtividade: 'baixa',
        }),
        intensidadeDesejada: 'leve',
      })
    );
    expect(baixa.alertas).toContain('GET_COM_CONFIANCA_BAIXA');
    expect(baixa.status).toBe('requer_revisao');
    expect(baixa.requerAprovacaoProfissional).toBe(true);

    const mod = calcularEstrategiaEnergetica(
      ctx({
        get: getOk({
          getEstimadoKcalDia: 2000,
          tmbEstimativaKcalDia: 1400,
          confiancaAtividade: 'moderada',
        }),
        intensidadeDesejada: 'leve',
      })
    );
    expect(mod.status).toBe('calculada');
  });
});

describe('separação e imutabilidade', () => {
  it('44–50. sem GLP-1/IMC/cardápio/proteína; não altera GET/TMB', () => {
    const c = ctx();
    const before = JSON.stringify(c);
    const r = calcularEstrategiaEnergetica(c);
    expect(JSON.stringify(c)).toBe(before);
    const s = JSON.stringify(r);
    expect(s).not.toMatch(/tirzepatida|semaglutida|protDia|cardapio/i);
    expect(r).not.toHaveProperty('imcAtual');
  });

  it('51–53. intensidade ausente (V1) → indisponível', () => {
    expect(
      calcularEstrategiaEnergetica(ctx({ intensidadeDesejada: null })).status
    ).toBe('indisponivel');
  });
});
