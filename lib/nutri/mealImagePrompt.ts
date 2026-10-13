/**
 * Prompt visual do prato — separado de buildMealImageSource (hash).
 * Só alimentos. Sem dados pessoais.
 */

import { nomeBaseAlimento } from '@/lib/nutri/planosNutricionista';
import {
  buildMealImageSource,
  type MealImageSourceItem,
  type MealImageSourceOption,
} from '@/lib/nutri/mealImageSource';

export const MEAL_IMAGE_VISUAL_PROMPT_BASE = `Fotografia gastronômica realista de um prato individual, aparência saudável e natural.
Todos os alimentos descritos devem ser visualmente identificáveis.
Não acrescente alimentos relevantes que não estejam descritos.
Apresentação organizada, mas realista, com proporções visualmente coerentes.
Iluminação suave e natural, fundo claro e neutro, louça discreta.
Enquadramento aproximadamente 45 graus, composição centralizada.
Fotografia premium de aplicativo de nutrição.
Sem pessoas, sem mãos, sem texto, sem letras, sem logotipos, sem embalagem, sem marcas, sem elementos gráficos.
A imagem é ilustrativa: não precisa representar gramagem exata.`;

function formatNumeroNatural(n: number): string {
  if (Math.abs(n - 0.5) < 0.001) return 'meia';
  if (Math.abs(n - 0.25) < 0.001) return '1/4';
  if (Math.abs(n - 0.75) < 0.001) return '3/4';
  if (Math.abs(n - Math.round(n)) < 0.001) return String(Math.round(n));
  return String(Math.round(n * 100) / 100).replace('.', ',');
}

function itemNatural(item: MealImageSourceItem): string {
  const nome = nomeBaseAlimento(item.nome || '').trim();
  if (!nome) return '';
  const peso = typeof item.peso_g === 'number' && item.peso_g > 0 ? item.peso_g : null;
  const qtd = typeof item.quantidade === 'number' && item.quantidade > 0 ? item.quantidade : null;
  const unidade = item.unidade?.trim() || '';

  if (peso && qtd && unidade && qtd !== 1) {
    return `${formatNumeroNatural(peso)} g de ${nome} (${formatNumeroNatural(qtd)} ${unidade})`;
  }
  if (peso) {
    return `${formatNumeroNatural(peso)} g de ${nome}`;
  }
  if (qtd && unidade) {
    const q = formatNumeroNatural(qtd);
    if (q === 'meia') return `meia ${unidade} de ${nome}`;
    return `${q} ${unidade} de ${nome}`;
  }
  if (unidade) {
    return `${nome} ${unidade}`;
  }
  if (qtd && qtd !== 1) {
    return `${formatNumeroNatural(qtd)} de ${nome}`;
  }
  return nome;
}

function naturalizeSourceLine(line: string): string {
  const raw = line.trim();
  if (!raw) return '';

  const peso = raw.match(/^(.*?)\s*-\s*(\d+(?:[.,]\d+)?)\s*g$/i);
  if (peso?.[1]?.trim()) {
    const g = peso[2].replace('.', ',');
    return `${g} g de ${peso[1].trim()}`;
  }

  const qtdUn = raw.match(/^(.*?)\s*-\s*(\d+(?:[.,]\d+)?)\s*-\s*(.+)$/);
  if (qtdUn?.[1]?.trim() && qtdUn[3]?.trim()) {
    const n = Number(String(qtdUn[2]).replace(',', '.'));
    const q = Number.isFinite(n) ? formatNumeroNatural(n) : qtdUn[2];
    const unidade = qtdUn[3].trim();
    if (q === 'meia') return `meia ${unidade} de ${qtdUn[1].trim()}`;
    return `${q} ${unidade} de ${qtdUn[1].trim()}`;
  }

  const soUnidade = raw.match(/^(.*?)\s*-\s*(.+)$/);
  if (soUnidade?.[1]?.trim() && soUnidade[2]?.trim()) {
    return `${soUnidade[1].trim()} ${soUnidade[2].trim()}`;
  }

  return raw;
}

function alimentosDoPrato(option: MealImageSourceOption): string[] {
  const detalhe = Array.isArray(option.itensDetalhe) ? option.itensDetalhe : [];
  const fromDetalhe = detalhe.map(itemNatural).filter(Boolean);
  if (fromDetalhe.length > 0) return fromDetalhe;

  const source = buildMealImageSource(option);
  if (!source) return [];
  return source
    .split(/\n|(?:\s+\+\s+)/)
    .map((line) => naturalizeSourceLine(line))
    .filter(Boolean);
}

/** Prompt enviado ao modelo. Só composição alimentar + estilo visual. */
export function buildMealImagePrompt(option: MealImageSourceOption | null | undefined): string {
  if (!option) return '';
  const itens = alimentosDoPrato(option);
  if (itens.length === 0) return '';

  const lista = itens.map((item) => `- ${item}`).join('\n');
  return `${MEAL_IMAGE_VISUAL_PROMPT_BASE}

Fotografia gastronômica realista de um prato contendo:
${lista}`;
}
