import type { ItemPlanoRefeicao } from '@/lib/nutri/planosNutricionista';
import { nomeBaseAlimento, normalizarItemComPorcao } from '@/lib/nutri/planosNutricionista';

/**
 * Campos nutricionais alinhados a ItemPlanoRefeicao (ETAPA 07/08).
 * Usado pelo Cardápio do paciente sem acoplar CATALOGO_OPCAO_01.
 */
export type ItemRefeicaoNutriSnapshot = {
  id: string;
  nome: string;
  categoria: ItemPlanoRefeicao['categoria'] | string;
  proteina_g: number;
  calorias_kcal: number;
  descricao?: string;
  peso_g?: number;
  quantidade?: number;
  unidade?: string;
  proteinaBase_g?: number;
  caloriasBase_kcal?: number;
  pesoBase_g?: number;
  carboidrato_g?: number;
  gordura_g?: number;
  fibra_g?: number;
  carboidratoBase_g?: number;
  gorduraBase_g?: number;
  fibraBase_g?: number;
  origemAlimento?: ItemPlanoRefeicao['origemAlimento'];
  alimentoGlobalId?: string;
};

/** Converte ItemPlanoRefeicao (ou parcial) → snapshot do Cardápio preservando C/G/F. */
export function itemPlanoParaItemRefeicaoSnapshot(
  item: ItemPlanoRefeicao
): ItemRefeicaoNutriSnapshot {
  const norm = normalizarItemComPorcao(item);
  return {
    id: norm.id,
    nome: nomeBaseAlimento(norm.nome),
    categoria: norm.categoria,
    proteina_g: norm.proteina_g,
    calorias_kcal: norm.calorias_kcal,
    descricao: norm.descricao,
    peso_g: norm.peso_g,
    quantidade: norm.quantidade,
    unidade: norm.unidade,
    proteinaBase_g: norm.proteinaBase_g,
    caloriasBase_kcal: norm.caloriasBase_kcal,
    pesoBase_g: norm.pesoBase_g,
    carboidrato_g: norm.carboidrato_g,
    gordura_g: norm.gordura_g,
    fibra_g: norm.fibra_g,
    carboidratoBase_g: norm.carboidratoBase_g,
    gorduraBase_g: norm.gorduraBase_g,
    fibraBase_g: norm.fibraBase_g,
    origemAlimento: norm.origemAlimento,
    alimentoGlobalId: norm.alimentoGlobalId,
  };
}

/** Remonta ItemPlanoRefeicao a partir do snapshot local do Cardápio. */
export function itemRefeicaoSnapshotParaPlano(
  item: ItemRefeicaoNutriSnapshot
): ItemPlanoRefeicao {
  return normalizarItemComPorcao({
    id: item.id,
    nome: item.nome,
    categoria: item.categoria as ItemPlanoRefeicao['categoria'],
    proteina_g: item.proteina_g,
    calorias_kcal: item.calorias_kcal,
    descricao: item.descricao,
    peso_g: item.peso_g,
    quantidade: item.quantidade,
    unidade: item.unidade,
    proteinaBase_g: item.proteinaBase_g,
    caloriasBase_kcal: item.caloriasBase_kcal,
    pesoBase_g: item.pesoBase_g,
    carboidrato_g: item.carboidrato_g,
    gordura_g: item.gordura_g,
    fibra_g: item.fibra_g,
    carboidratoBase_g: item.carboidratoBase_g,
    gorduraBase_g: item.gorduraBase_g,
    fibraBase_g: item.fibraBase_g,
    origemAlimento: item.origemAlimento,
    alimentoGlobalId: item.alimentoGlobalId,
  });
}
