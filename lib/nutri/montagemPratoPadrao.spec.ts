import { describe, expect, it } from 'vitest';
import type { DistribuicaoMetasRefeicoes } from '@/lib/nutri/distribuicaoMetasRefeicoes';
import {
  CALORIAS_FIXAS_LEGADO_V1,
  complementoProteicoCompativel,
  montarPratoPadraoRefeicaoV2,
  obterMetasMontagemRefeicao,
  opcaoPodeSerRegeneradaAutomaticamente,
  pontuarCombinacaoPrato,
  type ItemCatalogoMontagem,
} from '@/lib/nutri/montagemPratoPadrao';

const catalogoMinimo: ItemCatalogoMontagem[] = [
  { id: 'prot_frango_100g', nome: 'Peito de frango grelhado (100g)', categoria: 'proteina', proteina_g: 31, calorias_kcal: 165 },
  { id: 'prot_frango_150g', nome: 'Peito de frango grelhado (150g)', categoria: 'proteina', proteina_g: 46, calorias_kcal: 248 },
  { id: 'prot_peixe_100g', nome: 'Peixe grelhado (100g)', categoria: 'proteina', proteina_g: 25, calorias_kcal: 150 },
  { id: 'prot_ovos_2un', nome: '2 ovos inteiros', categoria: 'proteina', proteina_g: 12, calorias_kcal: 140 },
  { id: 'prot_ovos_3un', nome: '3 ovos inteiros', categoria: 'proteina', proteina_g: 18, calorias_kcal: 210 },
  { id: 'prot_claras_4un', nome: '4 claras de ovo', categoria: 'proteina', proteina_g: 14, calorias_kcal: 68 },
  { id: 'prot_whey_1dose', nome: 'Whey protein (1 dose)', categoria: 'proteina', proteina_g: 25, calorias_kcal: 120 },
  { id: 'prot_iogurte_proteico', nome: 'Iogurte proteico (170g)', categoria: 'proteina', proteina_g: 20, calorias_kcal: 150 },
  { id: 'prot_queijo_cottage', nome: 'Queijo cottage (100g)', categoria: 'proteina', proteina_g: 11, calorias_kcal: 98 },
  { id: 'prot_tofu_100g', nome: 'Tofu (100g)', categoria: 'proteina', proteina_g: 8, calorias_kcal: 76 },
  { id: 'carb_arroz_integral_3col', nome: 'Arroz integral (3 colheres)', categoria: 'carboidrato', proteina_g: 3, calorias_kcal: 150 },
  { id: 'carb_arroz_branco_3col', nome: 'Arroz branco (3 colheres)', categoria: 'carboidrato', proteina_g: 2, calorias_kcal: 140 },
  { id: 'carb_batata_doce_1un', nome: 'Batata doce (1 unidade média)', categoria: 'carboidrato', proteina_g: 2, calorias_kcal: 180 },
  { id: 'carb_mandioca_100g', nome: 'Mandioca (100g)', categoria: 'carboidrato', proteina_g: 1, calorias_kcal: 160 },
  { id: 'carb_pao_integral_1fat', nome: 'Pão integral (1 fatia)', categoria: 'carboidrato', proteina_g: 3, calorias_kcal: 80 },
  { id: 'carb_quinoa_3col', nome: 'Quinoa (3 colheres)', categoria: 'carboidrato', proteina_g: 4, calorias_kcal: 120 },
  { id: 'leg_salada_grande', nome: 'Prato cheio de salada e legumes', categoria: 'legumes_salada', proteina_g: 2, calorias_kcal: 50 },
  { id: 'leg_salada_media', nome: 'Meia porção de salada', categoria: 'legumes_salada', proteina_g: 1, calorias_kcal: 25 },
  { id: 'leg_legumes_cozidos', nome: 'Legumes cozidos variados', categoria: 'legumes_salada', proteina_g: 2, calorias_kcal: 60 },
  { id: 'gord_azeite_1col', nome: 'Azeite (1 colher de sopa)', categoria: 'gordura_boa', proteina_g: 0, calorias_kcal: 120 },
  { id: 'gord_castanhas_porcao', nome: 'Castanhas (porção pequena)', categoria: 'gordura_boa', proteina_g: 3, calorias_kcal: 100 },
  { id: 'extra_fruta_pequena', nome: 'Fruta pequena', categoria: 'extra', proteina_g: 0, calorias_kcal: 60 },
  { id: 'lixo_pizza_calabresa_fatia', nome: 'Pizza', categoria: 'lixo', proteina_g: 12, calorias_kcal: 350 },
];

function distNova(
  overrides?: Partial<DistribuicaoMetasRefeicoes>
): DistribuicaoMetasRefeicoes {
  const mk = (kcal: number, prot: number, pct = 0.2) => ({
    refeicao: 'cafe' as const,
    percentualCalorico: pct,
    caloriasAlvoKcal: kcal,
    percentualProteico: pct,
    proteinaAlvoG: prot,
  });
  return {
    versao: 1,
    status: 'calculada',
    metaCaloricaDiaKcal: 1600,
    proteinaDiariaG: 120,
    refeicoes: {
      cafe: { ...mk(320, 24), refeicao: 'cafe' },
      lanche1: { ...mk(160, 12, 0.1), refeicao: 'lanche1' },
      almoco: { ...mk(480, 36, 0.3), refeicao: 'almoco' },
      lanche2: { ...mk(240, 18, 0.15), refeicao: 'lanche2' },
      jantar: { ...mk(400, 30, 0.25), refeicao: 'jantar' },
    },
    ajustesAplicados: [],
    alertas: [],
    somaCaloriasKcal: 1600,
    somaProteinaG: 120,
    ...overrides,
  };
}

const planoLegado = {
  distribuicaoProteina: {
    cafe: '25-30 g',
    lanche1: '15-20 g',
    almoco: '35-40 g',
    lanche2: '15-20 g',
    jantar: '30-35 g',
  },
};

describe('metas', () => {
  it('1–5. novas metas e fallback legado', () => {
    const m = obterMetasMontagemRefeicao('cafe', distNova(), planoLegado);
    expect(m.origem).toBe('distribuicao_nova');
    expect(m.caloriasAlvoKcal).toBe(320);
    expect(m.proteinaAlvoG).toBe(24);

    const leg = obterMetasMontagemRefeicao('cafe', { ...distNova(), status: 'indisponivel' }, planoLegado);
    expect(leg.origem).toBe('legado');
    expect(leg.caloriasAlvoKcal).toBe(CALORIAS_FIXAS_LEGADO_V1.cafe);

    expect(CALORIAS_FIXAS_LEGADO_V1).toEqual({
      cafe: 400,
      lanche1: 250,
      almoco: 550,
      lanche2: 200,
      jantar: 450,
    });
  });
});

describe('preservação', () => {
  it('6–7. manual e taco não regeneram', () => {
    expect(
      opcaoPodeSerRegeneradaAutomaticamente({
        origem: 'manual',
        itensSelecionados: ['prot_ovos_2un'],
      })
    ).toBe(false);
    expect(
      opcaoPodeSerRegeneradaAutomaticamente({
        origem: 'taco',
        itensSelecionados: ['taco_123'],
      })
    ).toBe(false);
    expect(
      opcaoPodeSerRegeneradaAutomaticamente({
        origem: 'paciente',
        itensSelecionados: ['prot_ovos_2un'],
      })
    ).toBe(false);
  });

  it('import de plano (imp_*) não regenera', () => {
    expect(
      opcaoPodeSerRegeneradaAutomaticamente({
        origem: 'automatica',
        itensSelecionados: ['imp_cafe_123_0_abc'],
      })
    ).toBe(false);
  });

  it('8. automática pode regenerar; vazia regenera', () => {
    expect(
      opcaoPodeSerRegeneradaAutomaticamente({
        origem: 'automatica',
        itensSelecionados: ['prot_ovos_2un'],
      })
    ).toBe(true);
    expect(opcaoPodeSerRegeneradaAutomaticamente(undefined)).toBe(true);
    expect(opcaoPodeSerRegeneradaAutomaticamente({ descricao: '', proteina_g: 0 })).toBe(true);
  });

  it('na dúvida não regenera descrição legada sem origem', () => {
    expect(
      opcaoPodeSerRegeneradaAutomaticamente({
        descricao: 'texto antigo',
        proteina_g: 30,
        calorias_kcal: 400,
      })
    ).toBe(false);
  });
});

describe('pontuação e compatibilidade', () => {
  it('12. proteína pesa mais no score', () => {
    const a = pontuarCombinacaoPrato(20, 320, 24, 320); // erro prot
    const b = pontuarCombinacaoPrato(24, 280, 24, 320); // erro kcal
    expect(a.score).toBeGreaterThan(b.score);
  });

  it('22. complementos incompatíveis', () => {
    expect(complementoProteicoCompativel('prot_peixe_100g', 'prot_whey_1dose', 'almoco')).toBe(false);
    expect(complementoProteicoCompativel('prot_ovos_2un', 'prot_claras_4un', 'cafe')).toBe(true);
    expect(complementoProteicoCompativel('prot_iogurte_proteico', 'prot_whey_1dose', 'lanche1')).toBe(true);
  });
});

describe('equivalência fallback legado', () => {
  const fixtureCalorias = {
    cafe: 400,
    lanche1: 250,
    almoco: 550,
    lanche2: 200,
    jantar: 450,
  } as const;

  const fixtureProteina = {
    cafe: 28, // média 25-30
    lanche1: 18, // média 15-20
    almoco: 38, // média 35-40
    lanche2: 18,
    jantar: 33, // média 30-35
  } as const;

  it('quando distribuição indisponível, metas = fixture legado congelada', () => {
    const distIndisp = { ...distNova(), status: 'indisponivel' as const };
    (Object.keys(fixtureCalorias) as Array<keyof typeof fixtureCalorias>).forEach((key) => {
      const m = obterMetasMontagemRefeicao(key, distIndisp, planoLegado);
      expect(m.origem).toBe('legado');
      expect(m.caloriasAlvoKcal).toBe(fixtureCalorias[key]);
      expect(m.proteinaAlvoG).toBe(fixtureProteina[key]);
    });
  });

  it('null/undefined distribuição também usa legado', () => {
    const m = obterMetasMontagemRefeicao('almoco', null, planoLegado);
    expect(m).toEqual({
      refeicao: 'almoco',
      caloriasAlvoKcal: 550,
      proteinaAlvoG: 38,
      origem: 'legado',
    });
  });
});

describe('montagem V2', () => {
  it('monta almoço com proteína e vegetal; sem lixo', () => {
    const r = montarPratoPadraoRefeicaoV2({
      refeicao: 'almoco',
      metaProteinaG: 36,
      metaCaloriasKcal: 480,
      origemMetas: 'distribuicao_nova',
      estilo: 'mediterranea',
      sintomasGI: 'nenhum',
      restricoes: [],
      preferenciasProteina: [],
      itensDisponiveis: catalogoMinimo,
    });
    expect(r.status).not.toBe('indisponivel');
    expect(r.opcao?.origem).toBe('automatica');
    expect(r.opcao?.itensSelecionados?.some((id) => id.startsWith('lixo_'))).toBe(false);
    expect(
      r.opcao?.itensSelecionados?.some(
        (id) => id.includes('salada') || id.includes('legumes')
      )
    ).toBe(true);
    expect(r.opcao?.geracaoAutomatica?.origemMetas).toBe('distribuicao_nova');
  });

  it('19. lanche não recebe azeite', () => {
    const r = montarPratoPadraoRefeicaoV2({
      refeicao: 'lanche2',
      metaProteinaG: 18,
      metaCaloriasKcal: 240,
      origemMetas: 'distribuicao_nova',
      estilo: 'rico_proteina',
      sintomasGI: 'nenhum',
      restricoes: [],
      preferenciasProteina: [],
      itensDisponiveis: catalogoMinimo,
    });
    expect(r.opcao?.itensSelecionados?.some((id) => id.includes('azeite'))).toBe(false);
  });

  it('23–25. GI grave prioriza legumes cozidos / evita salada grande', () => {
    const r = montarPratoPadraoRefeicaoV2({
      refeicao: 'almoco',
      metaProteinaG: 36,
      metaCaloriasKcal: 480,
      origemMetas: 'distribuicao_nova',
      estilo: 'digestiva',
      sintomasGI: 'grave',
      restricoes: [],
      preferenciasProteina: [],
      itensDisponiveis: catalogoMinimo,
    });
    const ids = r.opcao?.itensSelecionados || [];
    if (ids.some((id) => id.includes('leg_'))) {
      expect(ids.some((id) => id.includes('salada_grande'))).toBe(false);
    }
  });

  it('27. café prioriza ovos/iogurte/whey', () => {
    const r = montarPratoPadraoRefeicaoV2({
      refeicao: 'cafe',
      metaProteinaG: 24,
      metaCaloriasKcal: 320,
      origemMetas: 'distribuicao_nova',
      estilo: 'mediterranea',
      sintomasGI: 'nenhum',
      restricoes: [],
      preferenciasProteina: [],
      itensDisponiveis: catalogoMinimo,
      cafeReduzido: true,
    });
    const ids = (r.opcao?.itensSelecionados || []).join(' ');
    expect(
      ids.includes('ovos') || ids.includes('whey') || ids.includes('iogurte')
    ).toBe(true);
  });

  it('36. catálogo vazio → indisponível', () => {
    const r = montarPratoPadraoRefeicaoV2({
      refeicao: 'almoco',
      metaProteinaG: 36,
      metaCaloriasKcal: 480,
      origemMetas: 'distribuicao_nova',
      estilo: 'mediterranea',
      sintomasGI: 'nenhum',
      restricoes: [],
      preferenciasProteina: [],
      itensDisponiveis: [],
    });
    expect(r.status).toBe('indisponivel');
    expect(r.alertas).toContain('SEM_COMBINACAO_NATURAL_VALIDA');
  });

  it('51. não modifica itensDisponiveis', () => {
    const itens = [...catalogoMinimo];
    const before = JSON.stringify(itens);
    montarPratoPadraoRefeicaoV2({
      refeicao: 'jantar',
      metaProteinaG: 30,
      metaCaloriasKcal: 400,
      origemMetas: 'distribuicao_nova',
      estilo: 'low_carb_moderada',
      sintomasGI: 'nenhum',
      restricoes: [],
      preferenciasProteina: ['Frango'],
      itensDisponiveis: itens,
    });
    expect(JSON.stringify(itens)).toBe(before);
  });
});

describe('ETAPA 10.5 — naturalidade', () => {
  it('REGRESSÃO: café nunca gera ovo + arroz', () => {
    // Metas típicas em que arroz + ovo poderia vencer só por macros
    const r = montarPratoPadraoRefeicaoV2({
      refeicao: 'cafe',
      metaProteinaG: 20,
      metaCaloriasKcal: 350,
      origemMetas: 'distribuicao_nova',
      estilo: 'mediterranea',
      sintomasGI: 'nenhum',
      restricoes: [],
      preferenciasProteina: [],
      itensDisponiveis: catalogoMinimo,
    });
    const ids = r.opcao?.itensSelecionados || [];
    expect(ids.some((id) => id.includes('arroz'))).toBe(false);
    if (ids.some((id) => id.includes('ovos'))) {
      expect(ids.some((id) => id.includes('arroz'))).toBe(false);
    }
    expect(r.opcao?.geracaoAutomatica?.templateSelecionado).toBeTruthy();
    expect(r.opcao?.geracaoAutomatica?.versaoContextoAlimentar).toBe(1);
  });

  it('café: sem arroz, quinoa, frango, carne, peixe', () => {
    const r = montarPratoPadraoRefeicaoV2({
      refeicao: 'cafe',
      metaProteinaG: 24,
      metaCaloriasKcal: 320,
      origemMetas: 'distribuicao_nova',
      estilo: 'rico_proteina',
      sintomasGI: 'nenhum',
      restricoes: [],
      preferenciasProteina: ['Carne'], // preferência não libera carne no café
      itensDisponiveis: catalogoMinimo,
    });
    const ids = (r.opcao?.itensSelecionados || []).join(' ');
    expect(ids.includes('arroz')).toBe(false);
    expect(ids.includes('quinoa')).toBe(false);
    expect(ids.includes('frango')).toBe(false);
    expect(ids.includes('carne')).toBe(false);
    expect(ids.includes('peixe')).toBe(false);
  });

  it('café: pode gerar ovo+pão, iogurte+fruta ou whey+fruta', () => {
    const r = montarPratoPadraoRefeicaoV2({
      refeicao: 'cafe',
      metaProteinaG: 22,
      metaCaloriasKcal: 300,
      origemMetas: 'distribuicao_nova',
      estilo: 'mediterranea',
      sintomasGI: 'nenhum',
      restricoes: [],
      preferenciasProteina: [],
      itensDisponiveis: catalogoMinimo,
    });
    expect(r.status).not.toBe('indisponivel');
    const ids = (r.opcao?.itensSelecionados || []).join(' ');
    const natural =
      (ids.includes('ovos') && ids.includes('pao')) ||
      (ids.includes('ovos') && ids.includes('mandioca')) ||
      (ids.includes('iogurte') && ids.includes('fruta')) ||
      (ids.includes('whey') && ids.includes('fruta')) ||
      (ids.includes('cottage') && ids.includes('pao')) ||
      (ids.includes('ovos') && ids.includes('fruta')) ||
      ids.includes('whey') ||
      ids.includes('iogurte') ||
      ids.includes('ovos');
    expect(natural).toBe(true);
  });

  it('lanches: sem arroz, peixe, carne, azeite', () => {
    for (const refeicao of ['lanche1', 'lanche2'] as const) {
      const r = montarPratoPadraoRefeicaoV2({
        refeicao,
        metaProteinaG: 15,
        metaCaloriasKcal: 200,
        origemMetas: 'distribuicao_nova',
        estilo: 'mediterranea',
        sintomasGI: 'nenhum',
        restricoes: [],
        preferenciasProteina: [],
        itensDisponiveis: catalogoMinimo,
      });
      const ids = (r.opcao?.itensSelecionados || []).join(' ');
      expect(ids.includes('arroz')).toBe(false);
      expect(ids.includes('peixe')).toBe(false);
      expect(ids.includes('carne')).toBe(false);
      expect(ids.includes('azeite')).toBe(false);
      expect(ids.includes('salada')).toBe(false);
    }
  });

  it('almoço: whey/iogurte não são proteína principal', () => {
    const r = montarPratoPadraoRefeicaoV2({
      refeicao: 'almoco',
      metaProteinaG: 36,
      metaCaloriasKcal: 480,
      origemMetas: 'distribuicao_nova',
      estilo: 'mediterranea',
      sintomasGI: 'nenhum',
      restricoes: [],
      preferenciasProteina: [],
      itensDisponiveis: catalogoMinimo,
    });
    const ids = r.opcao?.itensSelecionados || [];
    expect(ids[0]?.includes('whey')).toBe(false);
    expect(ids[0]?.includes('iogurte')).toBe(false);
  });

  it('jantar digestivo usa legumes cozidos quando há vegetal', () => {
    const r = montarPratoPadraoRefeicaoV2({
      refeicao: 'jantar',
      metaProteinaG: 30,
      metaCaloriasKcal: 400,
      origemMetas: 'distribuicao_nova',
      estilo: 'digestiva',
      sintomasGI: 'grave',
      restricoes: [],
      preferenciasProteina: [],
      itensDisponiveis: catalogoMinimo,
    });
    expect(r.templateSelecionado).toBe('jantar_digestivo');
    const ids = r.opcao?.itensSelecionados || [];
    expect(ids.some((id) => id.includes('whey'))).toBe(false);
    if (ids.some((id) => id.includes('leg_'))) {
      expect(ids.some((id) => id.includes('legumes_cozidos'))).toBe(true);
    }
  });

  it('peito de peru perde para proteína in natura no almoço', () => {
    const comPeru: ItemCatalogoMontagem[] = [
      ...catalogoMinimo,
      {
        id: 'prot_peito_peru',
        nome: 'Peito de peru (100g)',
        categoria: 'proteina',
        proteina_g: 30,
        calorias_kcal: 120,
        atributos: { ultraprocessado: true, prioridadeBase: 90 },
      },
    ];
    const r = montarPratoPadraoRefeicaoV2({
      refeicao: 'almoco',
      metaProteinaG: 30,
      metaCaloriasKcal: 450,
      origemMetas: 'distribuicao_nova',
      estilo: 'mediterranea',
      sintomasGI: 'nenhum',
      restricoes: [],
      preferenciasProteina: [],
      itensDisponiveis: comPeru,
    });
    expect(r.opcao?.itensSelecionados?.some((id) => id.includes('peito_peru'))).toBe(false);
  });
});
