import { describe, expect, it } from 'vitest';
import type { EstimativaTaxaMetabolicaBasal } from '@/lib/nutri/estimativaMetabolica';
import {
  FATORES_ATIVIDADE_GET_V1,
  calcularEstimativaGet,
  classificarAtividadeEnergetica,
  type ContextoAtividadeEnergetica,
} from '@/lib/nutri/estimativaGastoEnergetico';

function tmbCalculada(kcal: number): EstimativaTaxaMetabolicaBasal {
  return {
    versao: 1,
    status: 'calculada',
    equacao: 'mifflin_st_jeor',
    tmbEstimativaKcalDia: kcal,
    entradas: {
      pesoKg: 80,
      alturaCm: 170,
      idadeAnos: 40,
      sexoBiologico: 'masculino',
    },
    motivosIndisponibilidade: [],
    observacoes: [],
  };
}

function tmbIndisponivel(): EstimativaTaxaMetabolicaBasal {
  return {
    versao: 1,
    status: 'indisponivel',
    equacao: 'mifflin_st_jeor',
    tmbEstimativaKcalDia: null,
    entradas: {
      pesoKg: null,
      alturaCm: null,
      idadeAnos: null,
      sexoBiologico: null,
    },
    motivosIndisponibilidade: ['DADOS_ENERGETICOS_INAPTOS'],
    observacoes: [],
  };
}

function ctx(
  overrides: Partial<ContextoAtividadeEnergetica> = {}
): ContextoAtividadeEnergetica {
  return {
    atividadeFisicaDeclarada: '3-4x',
    horasSentado: '4-8h',
    ...overrides,
  };
}

describe('classificarAtividadeEnergetica', () => {
  it('1. nunca → sedentário', () => {
    expect(classificarAtividadeEnergetica('nunca', '>8h').nivel).toBe('sedentario');
  });

  it('2. 1-2x → levemente ativo', () => {
    expect(classificarAtividadeEnergetica('1-2x', '4-8h').nivel).toBe(
      'levemente_ativo'
    );
  });

  it('3. 3-4x → moderadamente ativo', () => {
    expect(classificarAtividadeEnergetica('3-4x', '4-8h').nivel).toBe(
      'moderadamente_ativo'
    );
  });

  it('4. 5-7x sem >8h → muito ativo', () => {
    expect(classificarAtividadeEnergetica('5-7x', '<4h').nivel).toBe('muito_ativo');
    expect(classificarAtividadeEnergetica('5-7x', '4-8h').nivel).toBe('muito_ativo');
  });

  it('7. 3-4x + >8h → levemente ativo + rebaixamento', () => {
    const c = classificarAtividadeEnergetica('3-4x', '>8h');
    expect(c.nivel).toBe('levemente_ativo');
    expect(c.rebaixado).toBe(true);
    expect(c.alertas).toContain('NIVEL_REBAIXADO_POR_SEDENTARISMO_OCUPACIONAL');
  });

  it('8. 5-7x + >8h → moderadamente ativo', () => {
    expect(classificarAtividadeEnergetica('5-7x', '>8h').nivel).toBe(
      'moderadamente_ativo'
    );
  });

  it('9. 1-2x + >8h permanece levemente ativo', () => {
    const c = classificarAtividadeEnergetica('1-2x', '>8h');
    expect(c.nivel).toBe('levemente_ativo');
    expect(c.rebaixado).toBe(false);
    expect(c.confianca).toBe('baixa');
  });

  it('10. <4h não eleva categoria', () => {
    expect(classificarAtividadeEnergetica('nunca', '<4h').nivel).toBe('sedentario');
    expect(classificarAtividadeEnergetica('1-2x', '<4h').nivel).toBe(
      'levemente_ativo'
    );
    expect(classificarAtividadeEnergetica('3-4x', '<4h').nivel).toBe(
      'moderadamente_ativo'
    );
  });
});

describe('calcularEstimativaGet — classificação e disponibilidade', () => {
  it('5–6. atividade ausente → indisponível; não presume sedentário', () => {
    const r = calcularEstimativaGet(tmbCalculada(1500), ctx({
      atividadeFisicaDeclarada: null,
      horasSentado: '4-8h',
    }));
    expect(r.status).toBe('indisponivel');
    expect(r.nivelAtividade).toBe('indisponivel');
    expect(r.getEstimadoKcalDia).toBeNull();
    expect(r.motivosIndisponibilidade).toContain('ATIVIDADE_FISICA_INDISPONIVEL');
    expect(r.fatorAtividade).toBeNull();
  });

  it('11. horas sentado ausentes geram alerta', () => {
    const r = calcularEstimativaGet(
      tmbCalculada(1500),
      ctx({ atividadeFisicaDeclarada: '1-2x', horasSentado: null })
    );
    expect(r.status).toBe('calculado');
    expect(r.alertas).toContain('HORAS_SENTADO_INDISPONIVEL');
    expect(r.confiancaAtividade).toBe('baixa');
  });

  it('12. rebaixamento gera alerta', () => {
    const r = calcularEstimativaGet(
      tmbCalculada(1600),
      ctx({ atividadeFisicaDeclarada: '3-4x', horasSentado: '>8h' })
    );
    expect(r.alertas).toContain('NIVEL_REBAIXADO_POR_SEDENTARISMO_OCUPACIONAL');
  });
});

describe('fatores centralizados', () => {
  it('13–16. fatores versionados corretos', () => {
    expect(FATORES_ATIVIDADE_GET_V1.sedentario).toBe(1.2);
    expect(FATORES_ATIVIDADE_GET_V1.levemente_ativo).toBe(1.35);
    expect(FATORES_ATIVIDADE_GET_V1.moderadamente_ativo).toBe(1.5);
    expect(FATORES_ATIVIDADE_GET_V1.muito_ativo).toBe(1.7);
  });

  it('17–18. somente fatores do conjunto V1; sem 1.9', () => {
    const valores = Object.values(FATORES_ATIVIDADE_GET_V1);
    expect(valores).not.toContain(1.9);
    expect(new Set(valores).size).toBe(4);

    const sed = calcularEstimativaGet(
      tmbCalculada(1500),
      ctx({ atividadeFisicaDeclarada: 'nunca', horasSentado: '>8h' })
    );
    expect(sed.fatorAtividade).toBe(1.2);

    const lev = calcularEstimativaGet(
      tmbCalculada(1500),
      ctx({ atividadeFisicaDeclarada: '1-2x', horasSentado: '4-8h' })
    );
    expect(lev.fatorAtividade).toBe(1.35);

    const mod = calcularEstimativaGet(
      tmbCalculada(1600),
      ctx({ atividadeFisicaDeclarada: '3-4x', horasSentado: '4-8h' })
    );
    expect(mod.fatorAtividade).toBe(1.5);

    const muito = calcularEstimativaGet(
      tmbCalculada(1800),
      ctx({ atividadeFisicaDeclarada: '5-7x', horasSentado: '<4h' })
    );
    expect(muito.fatorAtividade).toBe(1.7);
  });
});

describe('fórmula GET', () => {
  it('19. 1500 × 1,2 = 1800', () => {
    const r = calcularEstimativaGet(
      tmbCalculada(1500),
      ctx({ atividadeFisicaDeclarada: 'nunca', horasSentado: '>8h' })
    );
    expect(r.getEstimadoKcalDia).toBe(1800);
  });

  it('20. 1500 × 1,35 = 2025', () => {
    const r = calcularEstimativaGet(
      tmbCalculada(1500),
      ctx({ atividadeFisicaDeclarada: '1-2x', horasSentado: '4-8h' })
    );
    expect(r.getEstimadoKcalDia).toBe(2025);
  });

  it('21. 1600 × 1,5 = 2400', () => {
    const r = calcularEstimativaGet(
      tmbCalculada(1600),
      ctx({ atividadeFisicaDeclarada: '3-4x', horasSentado: '4-8h' })
    );
    expect(r.getEstimadoKcalDia).toBe(2400);
  });

  it('22. 1800 × 1,7 = 3060', () => {
    const r = calcularEstimativaGet(
      tmbCalculada(1800),
      ctx({ atividadeFisicaDeclarada: '5-7x', horasSentado: '<4h' })
    );
    expect(r.getEstimadoKcalDia).toBe(3060);
  });

  it('exemplo 4: rebaixamento 1600 × 1,35 = 2160', () => {
    const r = calcularEstimativaGet(
      tmbCalculada(1600),
      ctx({ atividadeFisicaDeclarada: '3-4x', horasSentado: '>8h' })
    );
    expect(r.nivelAtividade).toBe('levemente_ativo');
    expect(r.fatorAtividade).toBe(1.35);
    expect(r.getEstimadoKcalDia).toBe(2160);
  });

  it('23. arredondamento somente ao final', () => {
    // 1395 × 1.35 = 1883.25 → 1883
    const r = calcularEstimativaGet(
      tmbCalculada(1395),
      ctx({ atividadeFisicaDeclarada: '1-2x', horasSentado: '4-8h' })
    );
    expect(r.getEstimadoKcalDia).toBe(Math.round(1395 * 1.35));
    expect(r.fatorAtividade).toBe(1.35);
  });

  it('24. resultado inválido não é exposto (TMB zero)', () => {
    const r = calcularEstimativaGet(
      { ...tmbCalculada(0), tmbEstimativaKcalDia: 0 },
      ctx()
    );
    expect(r.status).toBe('indisponivel');
    expect(r.getEstimadoKcalDia).toBeNull();
  });
});

describe('bloqueios', () => {
  it('25–26. TMB indisponível / null impede GET', () => {
    const r = calcularEstimativaGet(tmbIndisponivel(), ctx());
    expect(r.status).toBe('indisponivel');
    expect(r.motivosIndisponibilidade).toContain('TMB_INDISPONIVEL');
    expect(r.getEstimadoKcalDia).toBeNull();
  });

  it('27. TMB NaN impede GET', () => {
    const r = calcularEstimativaGet(
      { ...tmbCalculada(1500), tmbEstimativaKcalDia: Number.NaN },
      ctx()
    );
    expect(r.motivosIndisponibilidade).toContain('TMB_INDISPONIVEL');
    expect(r.getEstimadoKcalDia).toBeNull();
  });

  it('28. atividade ausente impede GET', () => {
    expect(
      calcularEstimativaGet(
        tmbCalculada(1500),
        ctx({ atividadeFisicaDeclarada: null })
      ).status
    ).toBe('indisponivel');
  });

  it('29. alertas sem bloqueio não impedem cálculo', () => {
    const r = calcularEstimativaGet(
      tmbCalculada(1500),
      ctx({ atividadeFisicaDeclarada: '1-2x', horasSentado: null })
    );
    expect(r.status).toBe('calculado');
    expect(r.alertas.length).toBeGreaterThan(0);
  });
});

describe('confiança', () => {
  it('30. dados completos sem conflito → moderada (exceto 5-7x)', () => {
    expect(
      calcularEstimativaGet(
        tmbCalculada(1500),
        ctx({ atividadeFisicaDeclarada: 'nunca', horasSentado: '4-8h' })
      ).confiancaAtividade
    ).toBe('moderada');
    expect(
      calcularEstimativaGet(
        tmbCalculada(1500),
        ctx({ atividadeFisicaDeclarada: '3-4x', horasSentado: '4-8h' })
      ).confiancaAtividade
    ).toBe('moderada');
  });

  it('31. 5-7x → baixa', () => {
    expect(
      calcularEstimativaGet(
        tmbCalculada(1800),
        ctx({ atividadeFisicaDeclarada: '5-7x', horasSentado: '<4h' })
      ).confiancaAtividade
    ).toBe('baixa');
  });

  it('32. horas sentado ausentes → baixa', () => {
    expect(
      calcularEstimativaGet(
        tmbCalculada(1500),
        ctx({ atividadeFisicaDeclarada: '3-4x', horasSentado: null })
      ).confiancaAtividade
    ).toBe('baixa');
  });

  it('33. rebaixamento → baixa', () => {
    expect(
      calcularEstimativaGet(
        tmbCalculada(1600),
        ctx({ atividadeFisicaDeclarada: '3-4x', horasSentado: '>8h' })
      ).confiancaAtividade
    ).toBe('baixa');
  });

  it('34. não existe confiança alta', () => {
    const casos: ContextoAtividadeEnergetica[] = [
      ctx({ atividadeFisicaDeclarada: 'nunca', horasSentado: '<4h' }),
      ctx({ atividadeFisicaDeclarada: '1-2x', horasSentado: '4-8h' }),
      ctx({ atividadeFisicaDeclarada: '3-4x', horasSentado: '4-8h' }),
      ctx({ atividadeFisicaDeclarada: '5-7x', horasSentado: '<4h' }),
    ];
    for (const c of casos) {
      const r = calcularEstimativaGet(tmbCalculada(1500), c);
      expect(r.confiancaAtividade).not.toBe('alta' as never);
      expect(['baixa', 'moderada', null]).toContain(r.confiancaAtividade);
    }
  });
});

describe('separação de responsabilidades', () => {
  it('35. intensidade desejada não altera GET (não está na entrada)', () => {
    const a = calcularEstimativaGet(tmbCalculada(1500), ctx());
    const b = calcularEstimativaGet(tmbCalculada(1500), ctx());
    expect(a.getEstimadoKcalDia).toBe(b.getEstimadoKcalDia);
    // Campo de adesão do wizard (leve/moderada/intensiva) não existe no resultado
    expect(JSON.stringify(a)).not.toMatch(/intensidadeDesejada|"leve"|"intensiva"/);
    expect(a).not.toHaveProperty('intensidadeDesejada');
  });

  it('36–39. GLP-1 / IMC / cardápio / proteína não entram', () => {
    const r = calcularEstimativaGet(tmbCalculada(1500), ctx());
    const s = JSON.stringify(r);
    expect(s).not.toMatch(/tirzepatida|semaglutida|protDia|cardapio|imc/i);
  });

  it('40. GET não altera TMB', () => {
    const tmb = tmbCalculada(1500);
    const before = JSON.stringify(tmb);
    calcularEstimativaGet(tmb, ctx());
    expect(JSON.stringify(tmb)).toBe(before);
  });

  it('41. objetos de entrada não são modificados', () => {
    const tmb = tmbCalculada(1600);
    const atividade = ctx({
      atividadeFisicaDeclarada: '3-4x',
      horasSentado: '>8h',
    });
    const beforeT = JSON.stringify(tmb);
    const beforeA = JSON.stringify(atividade);
    calcularEstimativaGet(tmb, atividade);
    expect(JSON.stringify(tmb)).toBe(beforeT);
    expect(JSON.stringify(atividade)).toBe(beforeA);
  });

  it('alertas de duração/intensidade quando atividade ≠ nunca', () => {
    const r = calcularEstimativaGet(
      tmbCalculada(1500),
      ctx({ atividadeFisicaDeclarada: '1-2x', horasSentado: '4-8h' })
    );
    expect(r.alertas).toContain('DURACAO_EXERCICIO_NAO_INFORMADA');
    expect(r.alertas).toContain('INTENSIDADE_EXERCICIO_NAO_INFORMADA');
  });

  it('5-7x adiciona ATIVIDADE_ALTA_SEM_CONFIRMAR_EXECUCAO', () => {
    const r = calcularEstimativaGet(
      tmbCalculada(1800),
      ctx({ atividadeFisicaDeclarada: '5-7x', horasSentado: '4-8h' })
    );
    expect(r.alertas).toContain('ATIVIDADE_ALTA_SEM_CONFIRMAR_EXECUCAO');
  });
});

describe('compatibilidade snapshot (campos V1/V2)', () => {
  it('42–43. atividade e horasSentado de snapshot tipados alimentam GET', () => {
    // Espelha campos comuns V1/V2 da anamnese
    const snapshotLike = {
      atividadeFisica: '3-4x' as const,
      horasSentado: '4-8h' as const,
    };
    const r = calcularEstimativaGet(tmbCalculada(1600), {
      atividadeFisicaDeclarada: snapshotLike.atividadeFisica,
      horasSentado: snapshotLike.horasSentado,
    });
    expect(r.status).toBe('calculado');
    expect(r.getEstimadoKcalDia).toBe(2400);
  });

  it('44. sem snapshot (atividade null) → GET indisponível', () => {
    const r = calcularEstimativaGet(tmbCalculada(1600), {
      atividadeFisicaDeclarada: null,
      horasSentado: null,
    });
    expect(r.status).toBe('indisponivel');
  });
});
