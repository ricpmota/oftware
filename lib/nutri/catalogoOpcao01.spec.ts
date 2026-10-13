import { describe, expect, it } from 'vitest';
import {
  CATALOGO_OPCAO_01_ATUAL,
  CATALOGO_OPCAO_01_V1,
  CATALOGO_OPCAO_01_VERSAO,
  IDS_LOTE_01,
  filtrarCatalogoOpcao01PorRestricoes,
  itensDisponiveisCatalogoPorRefeicao,
} from '@/lib/nutri/catalogoOpcao01';
import {
  complementoProteicoCompativel,
  montarPratoPadraoRefeicaoV2,
} from '@/lib/nutri/montagemPratoPadrao';
import { executarAuditoriaCoberturaCatalogo } from '@/lib/nutri/auditoriaCoberturaCatalogo';

describe('catálogo Opção 01 lote 01 (ETAPA 11)', () => {
  it('1–3. novos IDs existem, únicos e macros finitos', () => {
    expect(CATALOGO_OPCAO_01_VERSAO).toBe(2);
    expect(IDS_LOTE_01.length).toBe(17);
    const ids = CATALOGO_OPCAO_01_ATUAL.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of IDS_LOTE_01) {
      const item = CATALOGO_OPCAO_01_ATUAL.find((i) => i.id === id);
      expect(item).toBeTruthy();
      expect(Number.isFinite(item!.proteina_g)).toBe(true);
      expect(item!.proteina_g).toBeGreaterThanOrEqual(0);
      expect(Number.isFinite(item!.calorias_kcal)).toBe(true);
      expect(item!.calorias_kcal).toBeGreaterThan(0);
    }
  });

  it('5–6. tofu 150/200 montam', () => {
    const itens = itensDisponiveisCatalogoPorRefeicao('almoco', ['vegano']);
    expect(itens.some((i) => i.id === 'prot_tofu_150g')).toBe(true);
    expect(itens.some((i) => i.id === 'prot_tofu_200g')).toBe(true);
    const r = montarPratoPadraoRefeicaoV2({
      refeicao: 'almoco',
      metaProteinaG: 12,
      metaCaloriasKcal: 400,
      origemMetas: 'distribuicao_nova',
      estilo: 'plant_based',
      sintomasGI: 'nenhum',
      restricoes: ['vegano'],
      preferenciasProteina: [],
      itensDisponiveis: itens,
    });
    expect(r.status).not.toBe('indisponivel');
  });

  it('7–8. proteína vegetal em lanches veganos; não com whey', () => {
    const cafe = itensDisponiveisCatalogoPorRefeicao('cafe', ['vegano']);
    expect(cafe.some((i) => i.id === 'prot_proteina_vegetal')).toBe(true);
    expect(
      complementoProteicoCompativel('prot_proteina_vegetal', 'prot_whey_1dose', 'lanche1')
    ).toBe(false);
    expect(
      complementoProteicoCompativel('prot_proteina_vegetal', 'prot_whey_isolado_sl', 'cafe')
    ).toBe(false);
  });

  it('9–11. leguminosas em almoço/jantar', () => {
    const almoco = itensDisponiveisCatalogoPorRefeicao('almoco', ['vegano']);
    expect(almoco.some((i) => i.id === 'prot_feijao_1concha')).toBe(true);
    expect(almoco.some((i) => i.id === 'prot_lentilha_1concha')).toBe(true);
    expect(almoco.some((i) => i.id === 'prot_grao_bico_1concha')).toBe(true);
    const lanche = itensDisponiveisCatalogoPorRefeicao('lanche1', ['vegano']);
    expect(lanche.some((i) => i.id.includes('feijao'))).toBe(false);
  });

  it('12–15. lactose e vegano em iogurte/whey SL', () => {
    const lactose = filtrarCatalogoOpcao01PorRestricoes(CATALOGO_OPCAO_01_ATUAL, [
      'intolerância lactose',
    ]);
    expect(lactose.some((i) => i.id === 'prot_iogurte_sem_lactose')).toBe(true);
    expect(lactose.some((i) => i.id === 'prot_whey_isolado_sl')).toBe(true);
    expect(lactose.some((i) => i.id === 'prot_iogurte_proteico')).toBe(false);
    expect(lactose.some((i) => i.id === 'prot_whey_1dose')).toBe(false);

    const vegano = filtrarCatalogoOpcao01PorRestricoes(CATALOGO_OPCAO_01_ATUAL, ['vegano']);
    expect(vegano.some((i) => i.id === 'prot_iogurte_sem_lactose')).toBe(false);
    expect(vegano.some((i) => i.id === 'prot_whey_isolado_sl')).toBe(false);
    expect(vegano.some((i) => i.id === 'prot_proteina_vegetal')).toBe(true);
  });

  it('16–19. porções intermediárias presentes', () => {
    const ids = CATALOGO_OPCAO_01_ATUAL.map((i) => i.id);
    expect(ids).toContain('prot_frango_120g');
    expect(ids).toContain('prot_peixe_150g');
    expect(ids).toContain('prot_ovos_1un');
    expect(ids).toContain('prot_claras_2un');
  });

  it('20–22. carbos ajustáveis', () => {
    const ids = CATALOGO_OPCAO_01_ATUAL.map((i) => i.id);
    expect(ids).toContain('carb_arroz_branco_2col');
    expect(ids).toContain('carb_arroz_branco_4col');
    expect(ids).toContain('carb_arroz_integral_2col');
    expect(ids).toContain('carb_arroz_integral_4col');
    expect(ids).toContain('carb_batata_doce_meia');
  });

  it('23. peito de peru perde para frango in natura', () => {
    const itens = itensDisponiveisCatalogoPorRefeicao('almoco', []);
    const r = montarPratoPadraoRefeicaoV2({
      refeicao: 'almoco',
      metaProteinaG: 31,
      metaCaloriasKcal: 400,
      origemMetas: 'distribuicao_nova',
      estilo: 'mediterranea',
      sintomasGI: 'nenhum',
      restricoes: [],
      preferenciasProteina: [],
      itensDisponiveis: itens,
    });
    const ids = r.opcao?.itensSelecionados || [];
    expect(ids.some((id) => id.includes('peito_peru'))).toBe(false);
    expect(
      ids.some(
        (id) =>
          id.includes('frango') || id.includes('peixe') || id.includes('ovos') || id.includes('carne')
      )
    ).toBe(true);
  });

  it('24–25. lixo excluído; restrições prevalecem', () => {
    const r = montarPratoPadraoRefeicaoV2({
      refeicao: 'almoco',
      metaProteinaG: 30,
      metaCaloriasKcal: 500,
      origemMetas: 'distribuicao_nova',
      estilo: 'mediterranea',
      sintomasGI: 'nenhum',
      restricoes: ['vegano'],
      preferenciasProteina: [],
      itensDisponiveis: [
        ...itensDisponiveisCatalogoPorRefeicao('almoco', ['vegano']),
        {
          id: 'lixo_pizza_calabresa_fatia',
          nome: 'Pizza',
          categoria: 'lixo',
          proteina_g: 12,
          calorias_kcal: 350,
        },
      ],
    });
    expect(r.opcao?.itensSelecionados?.some((id) => id.startsWith('lixo_'))).toBe(false);
    expect(r.opcao?.itensSelecionados?.some((id) => id.includes('frango'))).toBe(false);
  });

  it('29. auditoria V1 permanece com snapshot V1', () => {
    const v1a = executarAuditoriaCoberturaCatalogo({ modo: 'teste', versaoCatalogo: 1 });
    const v1b = executarAuditoriaCoberturaCatalogo({ modo: 'teste', versaoCatalogo: 1 });
    expect(v1a.resumo.totalCenarios).toBe(v1b.resumo.totalCenarios);
    expect(v1a.resumo.percentualAtendimento).toBe(v1b.resumo.percentualAtendimento);
    expect(CATALOGO_OPCAO_01_V1.length).toBeLessThan(CATALOGO_OPCAO_01_ATUAL.length);
  });

  it('30. auditoria V2 determinística', () => {
    const a = executarAuditoriaCoberturaCatalogo({ modo: 'teste', versaoCatalogo: 2 });
    const b = executarAuditoriaCoberturaCatalogo({ modo: 'teste', versaoCatalogo: 2 });
    expect(a.cenarios.map((c) => c.idCenario)).toEqual(b.cenarios.map((c) => c.idCenario));
    expect(a.resumo.percentualAtendimento).toBe(b.resumo.percentualAtendimento);
  });

  it('compatibilidade tofu+lentilha e leguminosa+whey', () => {
    expect(complementoProteicoCompativel('prot_tofu_100g', 'prot_lentilha_1concha', 'almoco')).toBe(
      true
    );
    expect(complementoProteicoCompativel('prot_feijao_1concha', 'prot_whey_1dose', 'almoco')).toBe(
      false
    );
  });
});
