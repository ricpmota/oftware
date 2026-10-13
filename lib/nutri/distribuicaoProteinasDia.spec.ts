import { describe, expect, it } from 'vitest';
import {
  distribuirProteinasAoLongoDoDia,
  validarVariedadeProteicaDia,
} from '@/lib/nutri/distribuicaoProteinasDia';
import { CATALOGO_OPCAO_01_ATUAL } from '@/lib/nutri/catalogoOpcao01';
import { filtrarCatalogoOpcao01PorRestricoes } from '@/lib/nutri/catalogoOpcao01';
import { montarOpcao01DiaCompleto } from '@/lib/nutri/montarOpcao01Dia';
import type { ItemCatalogoMontagem } from '@/lib/nutri/montagemPratoPadrao';
import { REFEICOES_NUTRI_ORDEM } from '@/lib/nutri/distribuicaoMetasRefeicoes';

const catalogo = CATALOGO_OPCAO_01_ATUAL as unknown as ItemCatalogoMontagem[];

function metasPadrao() {
  return {
    cafe: { proteinaAlvoG: 24, caloriasAlvoKcal: 320, origemMetas: 'distribuicao_nova' as const },
    lanche1: { proteinaAlvoG: 15, caloriasAlvoKcal: 200, origemMetas: 'distribuicao_nova' as const },
    almoco: { proteinaAlvoG: 36, caloriasAlvoKcal: 480, origemMetas: 'distribuicao_nova' as const },
    lanche2: { proteinaAlvoG: 18, caloriasAlvoKcal: 240, origemMetas: 'distribuicao_nova' as const },
    jantar: { proteinaAlvoG: 30, caloriasAlvoKcal: 400, origemMetas: 'distribuicao_nova' as const },
  };
}

function itensPorRefeicao(restricoes: string[] = []) {
  const filtrados = filtrarCatalogoOpcao01PorRestricoes(catalogo, restricoes);
  return {
    cafe: filtrados,
    lanche1: filtrados,
    almoco: filtrados,
    lanche2: filtrados,
    jantar: filtrados,
  };
}

describe('distribuicaoProteinasDia', () => {
  it('onívoro com 4 grupos: almoço/jantar não são ovos; ≥3 grupos no plano', () => {
    const d = distribuirProteinasAoLongoDoDia({
      preferenciasProteina: ['Ovos', 'Frango', 'Peixe', 'Carne'],
      restricoes: [],
      estilo: 'mediterranea',
    });
    expect(d.grupoPrincipalPorRefeicao.almoco).not.toBe('ovos');
    expect(['frango', 'peixe', 'carne']).toContain(d.grupoPrincipalPorRefeicao.almoco);
    expect(d.grupoPrincipalPorRefeicao.jantar).not.toBe('ovos');
    expect(d.gruposSelecionados.length).toBeGreaterThanOrEqual(3);
  });

  it('ovos no máximo 2 como principal no plano diário', () => {
    const d = distribuirProteinasAoLongoDoDia({
      preferenciasProteina: ['Ovos', 'Frango', 'Peixe', 'Carne'],
      restricoes: [],
      estilo: 'rico_proteina',
    });
    const count = Object.values(d.grupoPrincipalPorRefeicao).filter((g) => g === 'ovos').length;
    expect(count).toBeLessThanOrEqual(2);
  });

  it('vegetariano não atribui frango/peixe/carne', () => {
    const d = distribuirProteinasAoLongoDoDia({
      preferenciasProteina: ['Ovos', 'Laticínios', 'Leguminosas'],
      restricoes: ['vegetariano'],
      estilo: 'plant_based',
    });
    for (const g of Object.values(d.grupoPrincipalPorRefeicao)) {
      expect(['frango', 'peixe', 'carne', 'peru']).not.toContain(g);
    }
  });

  it('vegano só tofu/leguminosas/proteina_vegetal', () => {
    const d = distribuirProteinasAoLongoDoDia({
      preferenciasProteina: ['Leguminosas'],
      restricoes: ['vegano'],
      estilo: 'plant_based',
    });
    for (const g of Object.values(d.grupoPrincipalPorRefeicao)) {
      if (!g) continue;
      expect(['tofu', 'leguminosas', 'proteina_vegetal']).toContain(g);
    }
  });
});

describe('montarOpcao01DiaCompleto — regressão ovos 5×', () => {
  it('não gera ovos como principal em todas as 5 refeições', () => {
    const dia = montarOpcao01DiaCompleto({
      estilo: 'mediterranea',
      sintomasGI: 'nenhum',
      restricoes: [],
      preferenciasProteina: ['Ovos', 'Frango', 'Peixe', 'Carne'],
      metasPorRefeicao: metasPadrao(),
      itensPorRefeicao: itensPorRefeicao(),
    });
    const grupos = REFEICOES_NUTRI_ORDEM.map((r) => dia.gruposPrincipaisFinais[r]);
    const ovosCount = grupos.filter((g) => g === 'ovos').length;
    expect(ovosCount, `grupos=${JSON.stringify(dia.gruposPrincipaisFinais)} plano=${JSON.stringify(dia.distribuicao.grupoPrincipalPorRefeicao)}`).toBeLessThan(5);
    expect(
      ovosCount,
      `final=${JSON.stringify(dia.gruposPrincipaisFinais)} plano=${JSON.stringify(dia.distribuicao.grupoPrincipalPorRefeicao)} alts=${JSON.stringify(dia.distribuicao.gruposAlternativosPorRefeicao)}`
    ).toBeLessThanOrEqual(2);
    expect(dia.gruposPrincipaisFinais.almoco).not.toBe('ovos');
    expect(dia.gruposPrincipaisFinais.jantar).not.toBe('ovos');
    expect(dia.validacao.quantidadeGruposDistintos).toBeGreaterThanOrEqual(3);
  });

  it('paciente A onívoro: variedade humana', () => {
    const dia = montarOpcao01DiaCompleto({
      estilo: 'rico_proteina',
      sintomasGI: 'nenhum',
      restricoes: [],
      preferenciasProteina: ['Ovos', 'Frango', 'Peixe', 'Carne'],
      metasPorRefeicao: metasPadrao(),
      itensPorRefeicao: itensPorRefeicao(),
    });
    expect(dia.validacao.quantidadeGruposDistintos).toBeGreaterThanOrEqual(3);
    expect(['frango', 'peixe', 'carne']).toContain(dia.gruposPrincipaisFinais.almoco);
  });

  it('paciente B vegetariano', () => {
    const dia = montarOpcao01DiaCompleto({
      estilo: 'plant_based',
      sintomasGI: 'nenhum',
      restricoes: ['vegetariano'],
      preferenciasProteina: ['Ovos', 'Laticínios', 'Leguminosas'],
      metasPorRefeicao: metasPadrao(),
      itensPorRefeicao: itensPorRefeicao(['vegetariano']),
    });
    for (const g of Object.values(dia.gruposPrincipaisFinais)) {
      expect(['frango', 'peixe', 'carne']).not.toContain(g);
    }
  });

  it('paciente C vegano não recebe animal', () => {
    const dia = montarOpcao01DiaCompleto({
      estilo: 'plant_based',
      sintomasGI: 'nenhum',
      restricoes: ['vegano'],
      preferenciasProteina: ['Leguminosas'],
      metasPorRefeicao: metasPadrao(),
      itensPorRefeicao: itensPorRefeicao(['vegano']),
    });
    for (const r of REFEICOES_NUTRI_ORDEM) {
      const ids = dia.porRefeicao[r].opcao?.itensSelecionados || [];
      expect(ids.some((id) => /frango|peixe|carne|ovos|whey|iogurte|cottage|peru/.test(id))).toBe(
        false
      );
    }
  });

  it('paciente D intolerância lactose mantém ovos/frango/peixe', () => {
    const dia = montarOpcao01DiaCompleto({
      estilo: 'mediterranea',
      sintomasGI: 'nenhum',
      restricoes: ['intolerância lactose'],
      preferenciasProteina: ['Ovos', 'Frango', 'Peixe'],
      metasPorRefeicao: metasPadrao(),
      itensPorRefeicao: itensPorRefeicao(['intolerância lactose']),
    });
    expect(dia.validacao.quantidadeGruposDistintos).toBeGreaterThanOrEqual(2);
    for (const r of REFEICOES_NUTRI_ORDEM) {
      const ids = (dia.porRefeicao[r].opcao?.itensSelecionados || []).join(' ');
      expect(ids.includes('prot_iogurte_proteico')).toBe(false);
      expect(ids.includes('prot_queijo_cottage')).toBe(false);
    }
  });

  it('validação detecta 3+ ovos', () => {
    const v = validarVariedadeProteicaDia(
      { cafe: 'ovos', lanche1: 'ovos', almoco: 'ovos', lanche2: 'whey', jantar: 'frango' },
      ['ovos', 'frango', 'peixe'],
      []
    );
    expect(v.alertas).toContain('REPETICAO_PROTEICA_ACIMA_DO_DESEJADO');
    expect(v.valida).toBe(false);
  });
});
