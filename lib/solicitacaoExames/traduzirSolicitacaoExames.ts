export type SolicitacaoExamesTextoTraduzivel = {
  exames: string[];
  hipoteseDiagnostica: string;
};

const MAX_EXAMES = 120;
const MAX_NOME_EXAME = 300;
const MAX_HIPOTESE = 8000;

export class TraducaoSolicitacaoExamesError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TraducaoSolicitacaoExamesError';
  }
}

export function validarEntradaTraducaoSolicitacaoExames(source: SolicitacaoExamesTextoTraduzivel): void {
  if (source.exames.length > MAX_EXAMES) {
    throw new TraducaoSolicitacaoExamesError('A requisição tem exames demais para traduzir de uma vez.');
  }
  if (source.hipoteseDiagnostica.length > MAX_HIPOTESE) {
    throw new TraducaoSolicitacaoExamesError('A hipótese diagnóstica é longa demais para traduzir de uma vez.');
  }
  if (source.exames.some((exame) => exame.length > MAX_NOME_EXAME)) {
    throw new TraducaoSolicitacaoExamesError('Um dos exames é longo demais para traduzir.');
  }
}

function extractJsonObject(raw: string): unknown {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = (fenced?.[1] ?? trimmed).trim();
  const start = body.indexOf('{');
  const end = body.lastIndexOf('}');
  if (start < 0 || end <= start) {
    throw new TraducaoSolicitacaoExamesError('A tradução não veio em um formato utilizável.');
  }
  try {
    return JSON.parse(body.slice(start, end + 1)) as unknown;
  } catch {
    throw new TraducaoSolicitacaoExamesError('A tradução não veio em um formato utilizável.');
  }
}

export function parseTraducaoSolicitacaoExames(
  raw: string,
  source: SolicitacaoExamesTextoTraduzivel
): SolicitacaoExamesTextoTraduzivel {
  const parsed = extractJsonObject(raw);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new TraducaoSolicitacaoExamesError('A tradução não veio em um formato utilizável.');
  }
  const record = parsed as Record<string, unknown>;
  if (!Array.isArray(record.exames) || record.exames.length !== source.exames.length) {
    throw new TraducaoSolicitacaoExamesError('A tradução alterou a quantidade de exames.');
  }
  const exames = source.exames.map((origem, index) => {
    const value = record.exames?.[index];
    if (typeof value !== 'string') {
      throw new TraducaoSolicitacaoExamesError('A tradução não devolveu o nome de um exame.');
    }
    const texto = value.replace(/\r\n/g, '\n').trim();
    if (texto.length > MAX_NOME_EXAME) {
      throw new TraducaoSolicitacaoExamesError('A tradução de um exame excedeu o tamanho permitido.');
    }
    if (origem.trim() && !texto) {
      throw new TraducaoSolicitacaoExamesError('A tradução removeu o nome de um exame.');
    }
    return texto;
  });

  if (typeof record.hipoteseDiagnostica !== 'string') {
    throw new TraducaoSolicitacaoExamesError('A tradução não devolveu a hipótese diagnóstica.');
  }
  const hipoteseDiagnostica = record.hipoteseDiagnostica.replace(/\r\n/g, '\n');
  if (hipoteseDiagnostica.length > MAX_HIPOTESE) {
    throw new TraducaoSolicitacaoExamesError('A tradução da hipótese diagnóstica excedeu o tamanho permitido.');
  }
  if (source.hipoteseDiagnostica.trim() && !hipoteseDiagnostica.trim()) {
    throw new TraducaoSolicitacaoExamesError('A tradução removeu a hipótese diagnóstica.');
  }

  return { exames, hipoteseDiagnostica };
}
