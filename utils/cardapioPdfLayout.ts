import type { CardapioPdfItemRow, CardapioPdfOpcao } from '@/types/cardapioPrint';

/** Separa visualmente alimento × quantidade a partir da descrição salva (`nome - 45g - 4 - col de sopa`). */
export function splitDescricaoAlimentoQuantidade(descricao: string): {
  alimento: string;
  quantidade: string;
} {
  const raw = (descricao || '').replace(/\s+/g, ' ').trim();
  if (!raw) return { alimento: '', quantidade: '' };

  const parts = raw.split(/\s+-\s+/).map((p) => p.trim()).filter(Boolean);
  if (parts.length <= 1) {
    const m = raw.match(/^(.*?)[,\s]+(\d+(?:[.,]\d+)?\s*g)\s*$/i);
    if (m?.[1]?.trim()) {
      return { alimento: m[1].trim(), quantidade: formatPesoToken(m[2]) };
    }
    return { alimento: raw, quantidade: '' };
  }

  const alimento = parts[0];
  let peso = '';
  let qtd = '';
  const unidadeParts: string[] = [];
  for (const p of parts.slice(1)) {
    if (/^\d+(?:[.,]\d+)?\s*g$/i.test(p)) {
      peso = formatPesoToken(p);
    } else if (/^\d+(?:[.,]\d+)?$/.test(p)) {
      qtd = formatNumeroToken(p);
    } else {
      unidadeParts.push(p);
    }
  }
  const unidade = prettyUnidade(unidadeParts.join(' '));
  const bits: string[] = [];
  if (qtd && unidade) bits.push(`${qtd} ${unidade}`);
  else if (unidade) bits.push(unidade);
  else if (qtd) bits.push(qtd);
  if (peso) bits.push(peso);
  return { alimento, quantidade: bits.join(' · ') };
}

export function formatNumeroPtBr(value: number, maxDecimals = 1): string {
  if (!Number.isFinite(value)) return '';
  const rounded =
    maxDecimals === 0 ? Math.round(value) : Math.round(value * 10 ** maxDecimals) / 10 ** maxDecimals;
  const decimals = Number.isInteger(rounded) ? 0 : maxDecimals;
  return rounded.toLocaleString('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatKcalPtBr(value: number): string {
  return formatNumeroPtBr(Math.round(value), 0);
}

export function formatGramasPtBr(value: number): string {
  return `${formatNumeroPtBr(value, 1)} g`;
}

export type CardapioPdfItemCells = {
  alimento: string;
  quantidade: string;
  proteina: string;
  kcal: string;
};

/** Células da tabela impressa: alimento, quantidade, proteína e kcal. */
export function formatCardapioPdfItemCells(item: CardapioPdfItemRow): CardapioPdfItemCells {
  const { alimento, quantidade } = splitDescricaoAlimentoQuantidade(item.descricao);
  return {
    alimento: alimento || item.descricao || '',
    quantidade: quantidade || '—',
    proteina: item.proteinaG > 0 ? formatGramasPtBr(item.proteinaG) : '—',
    kcal: item.kcal > 0 ? formatKcalPtBr(item.kcal) : '—',
  };
}

export type CardapioPdfItemColWidths = {
  alimento: number;
  quantidade: number;
  proteina: number;
  kcal: number;
};

/** Larguras das colunas da tabela de itens (alimento | qtd | prot | kcal). */
export function cardapioPdfItemColWidths(tableW: number): CardapioPdfItemColWidths {
  return {
    alimento: tableW * 0.4,
    quantidade: tableW * 0.26,
    proteina: tableW * 0.17,
    kcal: tableW * 0.17,
  };
}

export function cardapioPdfMealPhotoBox(
  img: { width: number; height: number },
  maxMm = 38
): { w: number; h: number } {
  const ratio = img.height > 0 && img.width > 0 ? img.height / img.width : 1;
  let w = maxMm;
  let h = w * ratio;
  if (h > maxMm) {
    h = maxMm;
    w = h / Math.max(ratio, 0.01);
  }
  return { w, h };
}

function formatPesoToken(token: string): string {
  const m = token.match(/^(\d+(?:[.,]\d+)?)\s*g$/i);
  if (!m) return token.replace(/g$/i, ' g').trim();
  const n = Number(String(m[1]).replace(',', '.'));
  if (!Number.isFinite(n)) return `${m[1]} g`;
  return `${formatNumeroPtBr(n, 1)} g`;
}

function formatNumeroToken(token: string): string {
  const n = Number(token.replace(',', '.'));
  if (!Number.isFinite(n)) return token;
  return formatNumeroPtBr(n, 2).replace(/,00$/, '');
}

function prettyUnidade(unidade: string): string {
  const u = unidade.trim();
  if (!u) return '';
  const key = u
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  const map: Record<string, string> = {
    'col de sopa': 'colheres de sopa',
    'col sopa': 'colheres de sopa',
    'col de cha': 'colheres de chá',
    'colher de sopa': 'colher de sopa',
    'colheres de sopa': 'colheres de sopa',
  };
  return map[key] || u;
}

export function macrosDaOpcao(itens: CardapioPdfItemRow[]): {
  proteina?: number;
  carboidrato?: number;
  kcal?: number;
} {
  const proteina = itens.reduce((a, r) => a + (r.proteinaG || 0), 0);
  const temC = itens.some((r) => typeof r.carboidratoG === 'number');
  const carboidrato = temC
    ? itens.reduce((a, r) => a + (typeof r.carboidratoG === 'number' ? r.carboidratoG : 0), 0)
    : undefined;
  const kcal = itens.reduce((a, r) => a + (r.kcal || 0), 0);
  return {
    ...(proteina > 0 ? { proteina } : {}),
    ...(typeof carboidrato === 'number' ? { carboidrato } : {}),
    ...(kcal > 0 ? { kcal } : {}),
  };
}

export function rotuloOpcaoPdf(titulo: string, index: number): string {
  const t = (titulo || '').trim();
  if (t) return t;
  return `Opção ${String(index + 1).padStart(2, '0')}`;
}

export function opcoesDaRefeicaoPdf(refeicao: {
  opcoes?: CardapioPdfOpcao[];
  tituloOpcao: string;
  itens: CardapioPdfItemRow[];
  observacao?: string;
}): CardapioPdfOpcao[] {
  if (refeicao.opcoes?.length) return refeicao.opcoes;
  return [
    {
      tituloOpcao: refeicao.tituloOpcao,
      itens: refeicao.itens,
      ...(refeicao.observacao ? { observacao: refeicao.observacao } : {}),
    },
  ];
}
