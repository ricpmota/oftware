import {
  REFEICOES_CARDAPIO_KEYS,
  coletarSlotsPreenchidosParaImpressao,
  resolverOpcaoAtualComPrecedenciaNutri,
  type SlotCardapioLike,
} from '@/lib/nutri/cardapioPrecedenciaNutri';
import { ROTULO_REFEICAO_PLANO, formatarNomeItemPorcao } from '@/lib/nutri/planosNutricionista';
import type {
  CheckInMenuContext,
  CheckInMenuFood,
  CheckInMenuMeal,
} from '@/lib/nutri/checkInSemanalNutriV3';

type ItemDetalhe = {
  id?: string;
  nome?: string;
  peso_g?: number;
  quantidade?: number;
  unidade?: string;
  alimentoGlobalId?: string;
};

function foodFromItem(item: ItemDetalhe, fallbackId: string): CheckInMenuFood | null {
  const label = String(item.nome || '').trim();
  if (!label && !item.id) return null;
  const display = formatarNomeItemPorcao({
    nome: label || 'Alimento',
    peso_g: item.peso_g,
    quantidade: item.quantidade,
    unidade: item.unidade,
  });
  const food: CheckInMenuFood = {
    id: String(item.id || fallbackId),
    label: label || display,
    display,
  };
  if (item.alimentoGlobalId) food.alimentoGlobalId = String(item.alimentoGlobalId);
  return food;
}

function foodsFromSlot(slot: SlotCardapioLike): CheckInMenuFood[] {
  const detalhe = Array.isArray(slot.itensDetalhe) ? (slot.itensDetalhe as ItemDetalhe[]) : [];
  const fromDetalhe = detalhe
    .map((item, index) => foodFromItem(item, `${slot.id || 'item'}_${index}`))
    .filter((item): item is CheckInMenuFood => Boolean(item));
  if (fromDetalhe.length > 0) return fromDetalhe;

  const descricao = String(slot.descricao || '')
    .split(/[·|,;\n]+/)
    .map((part) => part.trim())
    .filter(Boolean);
  return descricao.map((label, index) => ({
    id: `${slot.id || 'desc'}_${index}`,
    label,
    display: label,
  }));
}

export function buildCheckInMenuContextFromPlano(plano: Record<string, unknown> | null | undefined): CheckInMenuContext {
  if (!plano) return { meals: [] };
  const slotsByMeal = (plano.opcoesSlots || {}) as Record<string, unknown>;
  const selected = (plano.opcoesSelecionadas || {}) as Record<string, string | undefined>;
  const meals: CheckInMenuMeal[] = [];

  for (const key of REFEICOES_CARDAPIO_KEYS) {
    const preenchidos = coletarSlotsPreenchidosParaImpressao(slotsByMeal[key], key);
    if (preenchidos.length === 0) continue;
    const atualId = resolverOpcaoAtualComPrecedenciaNutri(slotsByMeal[key], selected[key], key);
    const atual = preenchidos.find((slot) => slot.id === atualId) || preenchidos[0];
    const foods = foodsFromSlot(atual);
    if (foods.length === 0 && !String(atual.descricao || '').trim()) continue;
    meals.push({
      mealId: key,
      mealLabel: ROTULO_REFEICAO_PLANO[key] || key,
      foods,
    });
  }

  const aguaRaw = plano.aguaDia_ml;
  const aguaDia_ml =
    typeof aguaRaw === 'number' && Number.isFinite(aguaRaw) && aguaRaw > 0 ? Math.round(aguaRaw) : undefined;

  return { meals, ...(aguaDia_ml != null ? { aguaDia_ml } : {}) };
}

export function toPublicCheckInMenuContext(context: CheckInMenuContext): CheckInMenuContext {
  return {
    ...(context.aguaDia_ml != null ? { aguaDia_ml: context.aguaDia_ml } : {}),
    meals: context.meals.map((meal) => ({
      mealId: meal.mealId,
      mealLabel: meal.mealLabel,
      foods: meal.foods.map((food) => ({
        id: food.id,
        label: food.label,
        display: food.display,
      })),
    })),
  };
}
