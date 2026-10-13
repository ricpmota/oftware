import type { PrescricaoItem } from '@/types/prescricao';

export type PrescricaoTextoTraduzivel = {
  nome: string;
  descricao: string;
  observacoes: string;
  itens: PrescricaoItem[];
};

const MAX_NOME = 500;
const MAX_DESCRICAO = 20000;
const MAX_OBSERVACOES = 8000;
const MAX_ITENS = 40;
const MAX_CAMPO_ITEM = 4000;

export class TraducaoPrescricaoError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TraducaoPrescricaoError';
  }
}

function asTrimmedString(value: unknown, label: string, max: number): string {
  if (typeof value !== 'string') {
    throw new TraducaoPrescricaoError(`A tradução não devolveu o campo ${label}.`);
  }
  const text = value.replace(/\r\n/g, '\n');
  if (text.length > max) {
    throw new TraducaoPrescricaoError(`A tradução de ${label} excedeu o tamanho permitido.`);
  }
  return text;
}

function campoObrigatorioSeOrigem(origem: string, traduzido: string, label: string): string {
  if (origem.trim() && !traduzido.trim()) {
    throw new TraducaoPrescricaoError(`A tradução removeu o conteúdo de ${label}.`);
  }
  return traduzido;
}

export function prescricaoTemTextoParaTraduzir(source: PrescricaoTextoTraduzivel): boolean {
  if (source.nome.trim() || source.descricao.trim() || source.observacoes.trim()) return true;
  return source.itens.some(
    (item) =>
      item.medicamento?.trim() ||
      item.dosagem?.trim() ||
      item.frequencia?.trim() ||
      item.instrucoes?.trim() ||
      item.quantidade?.trim()
  );
}

export function validarEntradaTraducaoPrescricao(source: PrescricaoTextoTraduzivel): void {
  if (source.nome.length > MAX_NOME || source.descricao.length > MAX_DESCRICAO || source.observacoes.length > MAX_OBSERVACOES) {
    throw new TraducaoPrescricaoError('A receita é longa demais para traduzir de uma vez.');
  }
  if (source.itens.length > MAX_ITENS) {
    throw new TraducaoPrescricaoError('A receita tem itens demais para traduzir de uma vez.');
  }
}

function extractJsonObject(raw: string): unknown {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = (fenced?.[1] ?? trimmed).trim();
  const start = body.indexOf('{');
  const end = body.lastIndexOf('}');
  if (start < 0 || end <= start) {
    throw new TraducaoPrescricaoError('A tradução não veio em um formato utilizável.');
  }
  try {
    return JSON.parse(body.slice(start, end + 1)) as unknown;
  } catch {
    throw new TraducaoPrescricaoError('A tradução não veio em um formato utilizável.');
  }
}

/**
 * Confere se a resposta do modelo preserva a estrutura da receita original.
 */
export function parseTraducaoPrescricaoIngles(raw: string, source: PrescricaoTextoTraduzivel): PrescricaoTextoTraduzivel {
  const parsed = extractJsonObject(raw);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new TraducaoPrescricaoError('A tradução não veio em um formato utilizável.');
  }
  const record = parsed as Record<string, unknown>;
  const nome = campoObrigatorioSeOrigem(
    source.nome,
    asTrimmedString(record.nome, 'nome', MAX_NOME),
    'nome'
  );
  const descricao = campoObrigatorioSeOrigem(
    source.descricao,
    asTrimmedString(record.descricao, 'descrição', MAX_DESCRICAO),
    'descrição'
  );
  const observacoes = campoObrigatorioSeOrigem(
    source.observacoes,
    asTrimmedString(record.observacoes, 'observações', MAX_OBSERVACOES),
    'observações'
  );

  if (!Array.isArray(record.itens) || record.itens.length !== source.itens.length) {
    throw new TraducaoPrescricaoError('A tradução alterou a quantidade de itens da receita.');
  }

  const itens = source.itens.map((origem, index) => {
    const item = record.itens?.[index];
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      throw new TraducaoPrescricaoError('A tradução alterou um item da receita.');
    }
    const row = item as Record<string, unknown>;
    return {
      medicamento: campoObrigatorioSeOrigem(
        origem.medicamento || '',
        asTrimmedString(row.medicamento, 'medicamento', MAX_CAMPO_ITEM),
        'medicamento'
      ),
      dosagem: campoObrigatorioSeOrigem(
        origem.dosagem || '',
        asTrimmedString(row.dosagem, 'dosagem', MAX_CAMPO_ITEM),
        'dosagem'
      ),
      frequencia: campoObrigatorioSeOrigem(
        origem.frequencia || '',
        asTrimmedString(row.frequencia, 'frequência', MAX_CAMPO_ITEM),
        'frequência'
      ),
      instrucoes: campoObrigatorioSeOrigem(
        origem.instrucoes || '',
        asTrimmedString(row.instrucoes, 'instruções', MAX_CAMPO_ITEM),
        'instruções'
      ),
      quantidade: campoObrigatorioSeOrigem(
        origem.quantidade || '',
        asTrimmedString(row.quantidade ?? '', 'quantidade', MAX_CAMPO_ITEM),
        'quantidade'
      ),
    };
  });

  return { nome, descricao, observacoes, itens };
}
