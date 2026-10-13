/**
 * Precedência do cardápio: o que o nutricionista salvar prevalece
 * sobre a Opção 01 automática gerada após a anamnese.
 */

import type { MealImageData } from '@/lib/nutri/mealImageSource';

export type OrigemSlotCardapio = 'automatica' | 'manual' | 'taco' | 'paciente';

export type SlotCardapioLike = {
  id?: string;
  titulo?: string;
  descricao?: string;
  proteina_g?: number;
  calorias_kcal?: number;
  itensSelecionados?: string[];
  itensDetalhe?: unknown[];
  observacao?: string;
  origem?: OrigemSlotCardapio | string;
  /** Preservado no merge pós-anamnese quando o slot da nutri prevalece. */
  mealImage?: MealImageData;
};

export const REFEICOES_CARDAPIO_KEYS = ['cafe', 'lanche1', 'almoco', 'lanche2', 'jantar'] as const;
export type RefeicaoCardapioKey = (typeof REFEICOES_CARDAPIO_KEYS)[number];

const PREFIXOS_ITEM_NUTRI = ['taco_', 'metanutri_', 'manual_', 'imp_'] as const;

export function normalizarSlotsCardapio(value: unknown): SlotCardapioLike[] {
  if (Array.isArray(value)) return value.filter(Boolean) as SlotCardapioLike[];
  if (value && typeof value === 'object') {
    return Object.keys(value as Record<string, SlotCardapioLike>)
      .sort((a, b) => Number(a) - Number(b))
      .map((k) => (value as Record<string, SlotCardapioLike>)[k])
      .filter(Boolean);
  }
  return [];
}

export function slotCardapioEstaVazio(opcao: SlotCardapioLike | null | undefined): boolean {
  if (!opcao) return true;
  const temDescricao = Boolean(opcao.descricao?.trim());
  const temItens = Boolean(opcao.itensSelecionados?.length || opcao.itensDetalhe?.length);
  const temMacros = (opcao.proteina_g || 0) > 0 || (opcao.calorias_kcal || 0) > 0;
  const temObs = Boolean(opcao.observacao?.trim());
  return !temDescricao && !temItens && !temMacros && !temObs;
}

function itemIdEhDeNutricionista(id: string): boolean {
  return (
    PREFIXOS_ITEM_NUTRI.some((p) => id.startsWith(p)) || id.toLowerCase().includes('custom')
  );
}

/** Slot montado/editado pelo nutricionista (não regenerar / paciente não edita). */
export function slotFoiEditadoPorNutricionista(
  opcao: SlotCardapioLike | null | undefined
): boolean {
  if (!opcao) return false;
  if (opcao.origem === 'paciente') return false;
  if (opcao.origem === 'manual' || opcao.origem === 'taco') return true;
  const itens = opcao.itensSelecionados || [];
  if (itens.some(itemIdEhDeNutricionista)) return true;
  if ((opcao.itensDetalhe?.length || 0) > 0 && opcao.origem !== 'automatica') {
    return Boolean(opcao.origem);
  }
  return false;
}

export function planoTemEdicaoDeNutricionista(plano: {
  cardapioEditadoPorNutricionista?: boolean;
  opcoesSlots?: Partial<Record<string, unknown>>;
  itensCustomizadosPorRefeicao?: Partial<Record<string, unknown[]>>;
}): boolean {
  if (plano.cardapioEditadoPorNutricionista) return true;
  const customs = plano.itensCustomizadosPorRefeicao;
  if (customs && Object.values(customs).some((arr) => (arr?.length ?? 0) > 0)) return true;
  for (const key of REFEICOES_CARDAPIO_KEYS) {
    const slots = normalizarSlotsCardapio(plano.opcoesSlots?.[key]);
    if (
      slots.some(
        (slot, index) =>
          slotFoiEditadoPorNutricionista(slot) ||
          (index > 0 && !slotCardapioEstaVazio(slot) && slot.origem !== 'paciente')
      )
    ) {
      return true;
    }
  }
  return false;
}

export function fingerprintConteudoSlot(opcao: SlotCardapioLike): string {
  const ids = (opcao.itensSelecionados || []).join('|');
  if (ids) return `ids:${ids}`;
  return `desc:${(opcao.descricao || '').replace(/\s+/g, ' ').trim().toLowerCase()}`;
}

/**
 * Remove opções vazias e cópias idênticas consecutivas/repetidas
 * (ex.: Opção 02–05 clonadas da 01 na impressão).
 * Mantém duas opções iguais se o nutricionista deu nomes distintos.
 */
export function coletarSlotsPreenchidosParaImpressao(
  slotsBrutos: unknown,
  refeicaoKey: string
): SlotCardapioLike[] {
  const slots = normalizarSlotsCardapio(slotsBrutos);
  const preenchidos = slots.filter((slot) => !slotCardapioEstaVazio(slot));
  if (preenchidos.length <= 1) return preenchidos;

  const vistos = new Map<string, SlotCardapioLike>();
  const resultado: SlotCardapioLike[] = [];
  for (const slot of preenchidos) {
    const fp = fingerprintConteudoSlot(slot);
    const anterior = vistos.get(fp);
    if (!anterior) {
      vistos.set(fp, slot);
      resultado.push(slot);
      continue;
    }
    const tituloAtual = (slot.titulo || '').trim();
    const tituloAnterior = (anterior.titulo || '').trim();
    const tituloPadrao = new RegExp(`^Opção\\s*0?[1-5]$`, 'i');
    const ambosPadrao = tituloPadrao.test(tituloAtual) && tituloPadrao.test(tituloAnterior);
    if (ambosPadrao || tituloAtual === tituloAnterior) {
      continue;
    }
    resultado.push(slot);
  }
  void refeicaoKey;
  return resultado;
}

/**
 * Respeita a opção Atual já escolhida (paciente ou nutricionista).
 * Só promove o slot da nutri quando a seleção está vazia ou inválida.
 */
export function resolverOpcaoAtualComPrecedenciaNutri(
  slotsBrutos: unknown,
  selecionadaId: string | undefined,
  refeicaoKey: string
): string {
  const fallback = `slot_${refeicaoKey}_1`;
  const slots = normalizarSlotsCardapio(slotsBrutos);
  if (slots.length === 0) return selecionadaId || fallback;

  const selecionada =
    slots.find((s) => s.id === selecionadaId) ||
    (selecionadaId && /^slot_/.test(selecionadaId)
      ? undefined
      : slots[0]);

  if (selecionada && !slotCardapioEstaVazio(selecionada)) {
    return selecionada.id || fallback;
  }

  const nutriSlot = slots.find(
    (s) => !slotCardapioEstaVazio(s) && slotFoiEditadoPorNutricionista(s)
  );
  if (nutriSlot?.id) return nutriSlot.id;

  return selecionadaId && /^slot_/.test(selecionadaId) ? selecionadaId : fallback;
}

/** Ao salvar um slot: vira Atual se a Atual ainda for automática/vazia. */
export function devePromoverSlotSalvoComoAtual(params: {
  slotSalvoId: string;
  opcaoAtualId: string | undefined;
  slotAtual: SlotCardapioLike | null | undefined;
}): boolean {
  const { slotSalvoId, opcaoAtualId, slotAtual } = params;
  if (!opcaoAtualId || opcaoAtualId === slotSalvoId) return true;
  if (!/^slot_/.test(opcaoAtualId)) return true;
  if (slotCardapioEstaVazio(slotAtual)) return true;
  if (slotAtual?.origem === 'automatica' && !slotFoiEditadoPorNutricionista(slotAtual)) {
    return true;
  }
  return false;
}

export function mesclarSlotsAposAnamnese<T extends SlotCardapioLike>(
  slotsNovos: Record<RefeicaoCardapioKey, T[]>,
  slotsAntigos: Partial<Record<string, unknown>> | undefined
): Record<RefeicaoCardapioKey, T[]> {
  const resultado = {} as Record<RefeicaoCardapioKey, T[]>;
  for (const key of REFEICOES_CARDAPIO_KEYS) {
    const novos = slotsNovos[key] || [];
    const antigos = normalizarSlotsCardapio(slotsAntigos?.[key]);
    resultado[key] = novos.map((slotNovo, index) => {
      const antigo =
        antigos.find((s) => s.id && s.id === slotNovo.id) || antigos[index];
      if (!antigo) return slotNovo;
      const nutriEditou =
        slotFoiEditadoPorNutricionista(antigo) ||
        antigo.origem === 'paciente' ||
        (index > 0 && !slotCardapioEstaVazio(antigo));
      if (nutriEditou) {
        return { ...slotNovo, ...antigo, id: slotNovo.id } as T;
      }
      return slotNovo;
    });
  }
  return resultado;
}
