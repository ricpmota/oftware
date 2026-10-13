/**
 * Prompt Row Extraction multimodal v2.
 */

import type { FoodTableSchema } from '../importacao/tableSchema';

export const FOOD_TABLE_ROW_EXTRACTION_PROMPT_VERSION = 'row-extraction-v2';

export function buildFoodTableRowExtractionPromptV2(opts: {
  pageNumber: number;
  fonteNome?: string;
  schema: FoodTableSchema;
  estimatedDataRows?: number | null;
  zeroRetry?: boolean;
}): string {
  const schemaJson = JSON.stringify(
    {
      tableTitle: opts.schema.tableTitle,
      tableNumber: opts.schema.tableNumber,
      tableType: opts.schema.tableType,
      base: opts.schema.base,
      rowIdentityHints: opts.schema.rowIdentityHints,
      columns: opts.schema.columns,
    },
    null,
    2
  );

  const retryBlock = opts.zeroRetry
    ? `
ATENÇÃO — SEGUNDA TENTATIVA:
Há claramente uma tabela nesta imagem.
Nenhum alimento foi extraído na tentativa anterior.
Revise visualmente TODAS as linhas e identifique os registros alimentares.
`
    : '';

  return `Extraia TODAS as linhas alimentares VISÍVEIS nesta página seguindo o schema informado.

VERSÃO: ${FOOD_TABLE_ROW_EXTRACTION_PROMPT_VERSION}
PÁGINA: ${opts.pageNumber}
${opts.fonteNome ? `FONTE: ${opts.fonteNome}` : ''}
${opts.estimatedDataRows != null ? `LINHAS ESTIMADAS (discovery): ${opts.estimatedDataRows}` : ''}
${retryBlock}

A IMAGEM é a fonte principal. O texto auxiliar pode estar fora de ordem.
SCHEMA FIXO (não altere o significado das colunas):
${schemaJson}

REGRAS:
1) Extraia TODAS as linhas de alimento visíveis nesta página (1 página apenas).
2) Não invente valores. Ausente → null. Zero explícito → 0. Traço "—" → null.
3) Decimal BR em valoresOriginais (ex.: "31,85").
4) Nutriente sem targetField → nutrientesExtras[{ nome, valor, unidade, valorOriginal }].
5) Código NÃO é obrigatório. Se não houver, omita codigoOriginal (null).
6) Preparação NÃO é obrigatória.
7) Segmento NÃO é obrigatório.
8) Retorne APENAS JSON com chave canônica "foods".

FORMATO:
{
  "document": {
    "page": ${opts.pageNumber},
    "table": ${JSON.stringify(opts.schema.tableTitle || opts.schema.tableNumber || null)},
    "baseQuantity": ${opts.schema.base?.quantity ?? 100},
    "baseUnit": ${JSON.stringify(opts.schema.base?.unit || 'g')}
  },
  "foods": [
    {
      "codigoOriginal": "string|null",
      "codigoPreparacao": "string|null",
      "nome": "string",
      "preparo": "string|null",
      "nomeCientifico": "string|null",
      "marca": "string|null",
      "baseQuantidade": ${opts.schema.base?.quantity ?? 100},
      "baseUnidade": ${JSON.stringify(opts.schema.base?.unit || 'g')},
      "nutrientes": {},
      "valoresOriginais": {},
      "nutrientesExtras": [],
      "source": { "page": ${opts.pageNumber}, "table": "string|null" },
      "extractionConfidence": 0.0
    }
  ]
}`;
}
