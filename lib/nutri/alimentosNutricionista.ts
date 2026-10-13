/**
 * Catálogo personalizado de alimentos do nutricionista (MetaNutri → Alimentos).
 * Usado para favoritos + grupos de refeição ao montar Planos.
 */

import {
  CATALOGO_ALIMENTOS_METANUTRI,
  IDS_ALIMENTOS_DEPRECADOS,
  type ItemCatalogoAlimentosMetanutri,
} from '@/lib/nutri/catalogoAlimentosMetanutri';
import {
  REFEICOES_PLANO_ORDEM,
  nomeBaseAlimento,
  normalizarItemComPorcao,
  type CategoriaItemPlano,
  type ItemPlanoRefeicao,
  type RefeicaoPlanoKey,
} from '@/lib/nutri/planosNutricionista';

export type GrupoAlimentoRefeicao = RefeicaoPlanoKey;

export const GRUPOS_ALIMENTO_ORDEM: GrupoAlimentoRefeicao[] = [...REFEICOES_PLANO_ORDEM];

export const ROTULO_GRUPO_ALIMENTO: Record<GrupoAlimentoRefeicao, string> = {
  cafe: 'Café da Manhã',
  lanche1: 'Lanche da Manhã',
  almoco: 'Almoço',
  lanche2: 'Lanche da Tarde',
  jantar: 'Jantar',
};

export const CATEGORIAS_ALIMENTO: Array<{ id: CategoriaItemPlano; label: string }> = [
  { id: 'proteina', label: 'Proteína' },
  { id: 'carboidrato', label: 'Carboidrato' },
  { id: 'gordura_boa', label: 'Gordura' },
  { id: 'legumes_salada', label: 'Legumes/Salada' },
  { id: 'extra', label: 'Extra' },
  { id: 'lixo', label: 'Lixo' },
];

export interface AlimentoNutricionista {
  id: string;
  nome: string;
  categoria: CategoriaItemPlano;
  proteina_g: number;
  calorias_kcal: number;
  descricao?: string;
  peso_g?: number;
  quantidade?: number;
  unidade?: string;
  proteinaBase_g?: number;
  caloriasBase_kcal?: number;
  pesoBase_g?: number;
  /** Aparece no builder de Planos quando true e o grupo da refeição estiver marcado. */
  favorito: boolean;
  /** Em quais refeições o alimento pode aparecer. */
  grupos: GrupoAlimentoRefeicao[];
  /** true = veio do catálogo base Oftware. */
  origemCatalogo: boolean;
  criadoEm: Date;
  atualizadoEm: Date;
}

export function alimentoFromCatalogoCurado(
  item: ItemCatalogoAlimentosMetanutri
): Omit<AlimentoNutricionista, 'criadoEm' | 'atualizadoEm'> {
  const norm = normalizarItemComPorcao({
    id: item.id,
    nome: item.nome,
    categoria: item.categoria,
    proteina_g: item.proteina_g,
    calorias_kcal: item.calorias_kcal,
    descricao: item.descricao,
    peso_g: item.peso_g,
    quantidade: 1,
    unidade: item.unidade,
    proteinaBase_g: item.proteina_g,
    caloriasBase_kcal: item.calorias_kcal,
    pesoBase_g: item.peso_g,
  });
  return {
    id: norm.id,
    nome: nomeBaseAlimento(norm.nome),
    categoria: norm.categoria,
    proteina_g: norm.proteina_g,
    calorias_kcal: norm.calorias_kcal,
    descricao: item.descricao,
    peso_g: norm.peso_g,
    quantidade: 1,
    unidade: item.unidade,
    proteinaBase_g: norm.proteinaBase_g,
    caloriasBase_kcal: norm.caloriasBase_kcal,
    pesoBase_g: norm.pesoBase_g,
    favorito: false,
    grupos: [...item.grupos],
    origemCatalogo: true,
  };
}

/** Seed / sincronização da página Alimentos (lista curada, sem duplicatas de porção). */
export function seedAlimentosDoCatalogoBase(): Omit<
  AlimentoNutricionista,
  'criadoEm' | 'atualizadoEm'
>[] {
  return CATALOGO_ALIMENTOS_METANUTRI.map((item) => alimentoFromCatalogoCurado(item));
}

export { IDS_ALIMENTOS_DEPRECADOS };

export function alimentoParaItemPlano(alimento: AlimentoNutricionista): ItemPlanoRefeicao {
  return normalizarItemComPorcao({
    id: alimento.id,
    nome: alimento.nome,
    categoria: alimento.categoria,
    proteina_g: alimento.proteina_g,
    calorias_kcal: alimento.calorias_kcal,
    descricao: alimento.descricao,
    peso_g: alimento.peso_g,
    quantidade: alimento.quantidade,
    unidade: alimento.unidade,
    proteinaBase_g: alimento.proteinaBase_g,
    caloriasBase_kcal: alimento.caloriasBase_kcal,
    pesoBase_g: alimento.pesoBase_g,
  });
}

export function filtrarFavoritosDoGrupo(
  alimentos: AlimentoNutricionista[],
  grupo: GrupoAlimentoRefeicao
): AlimentoNutricionista[] {
  return alimentos.filter(
    (a) => a.favorito && Array.isArray(a.grupos) && a.grupos.includes(grupo)
  );
}
