# ETAPA 03.3 — Leitor híbrido multimodal de tabelas nutricionais

## Problema

Com FASE 1 (Mapear) + FASE 2 (Ler) da 03.2, o progresso funcionava, mas PDFs como **tabela 02** / **tabela 03** (TBCA) geravam:

- páginas processadas > 0
- alimentos = 0

### Diagnóstico (tabela 02, página 7)

**A) Texto extraído** (~1989 chars): legível, com linhas como `646A Arroz, integral...`, mas cabeçalhos quebrados (`GLIC OSE`, `AM IDO TOTAL`) e coluna final `Referências`.

**B) Imagem**: página renderizada via pdfjs + `@napi-rs/canvas` (cache em Storage). Fontes embutidas do PDF podem degradar glyphs; o texto Unicode da extração continua sendo apoio essencial.

**C) Schema text-only**: fluxo antigo não chegava a extrair — ver D.

**D) Por que zero**

1. Classificador tratava a palavra **“Referências”** (coluna do Quadro) como bibliografia → `REFERENCE_TABLE` → skip sem Gemini.
2. `hasFoodTableSignals` era IBGE-cêntrico (energia/proteína/…) e falhava em perfis de carboidratos TBCA.
3. Texto linear perde geometria de colunas → schema/extraction text-only frágeis.

## Solução

Pipeline **híbrido TEXT + VISÃO**:

```
TEXT MAP (barato)
  → páginas FOOD_TABLE / CONTINUATION / UNKNOWN
SCHEMA MULTIMODAL (imagem + texto auxiliar)
  → FoodTableSchema (+ estimatedDataRows, rowPattern)
ROW EXTRACTION MULTIMODAL (1 página / chamada)
  → foods[]
retry infra (429/503) + 1 retry se zero suspeito
  → REVIEW_REQUIRED se ainda zero
fallback IBGE denso só no fim
```

## Arquivos principais

| Arquivo | Papel |
|---------|--------|
| `pageRepresentation.ts` | tipos + validação de schema |
| `renderPdfPage.server.ts` | PDF → PNG |
| `prompts/foodTableSchemaDiscoveryPrompt.ts` | schema-discovery-v2 |
| `prompts/foodTableRowExtractionPrompt.ts` | row-extraction-v2 |
| `foodPdfSchemaDiscovery.server.ts` | discovery multimodal |
| `foodPdfRowExtraction.server.ts` | extraction multimodal |
| `processImportLoteCore.ts` | 1 pág., zero retry, partial flag |
| `classifyPdfPage.ts` / `parseIbgeTabela1.ts` | TBCA Quadro ≠ bibliografia |
| `globalFoodsImportService.server.ts` | cache imagem, inspect, totais por lote |
| `inspect-page/route.ts` | UI discreta “Inspecionar página” |

## Comportamentos

- **Multimodal só em tabelas** (não em narrativa).
- **Schema persistido**; continuação reutiliza; novo Quadro/Tabela rediscobre.
- **Código / preparação / segmento não obrigatórios**.
- **Nutrientes desconhecidos** → `nutrientesExtras`.
- **Partial**: `estimatedDataRows` vs `foods.length` → `POSSIBLE_PARTIAL_EXTRACTION`.
- **Zero suspeito** → nunca `done` silencioso (`failed_extraction` / REVIEW_REQUIRED).
- **`totalItensExtraidos`** recalculado após cada lote.
- Retry/throttle da 03.2 reutilizado.

## Custos

- Fase 1: sem Gemini.
- Fase 2: ~1–2 chamadas multimodal/página de tabela (+ discovery na 1ª / novo cabeçalho).
- CONCURRENCY = 1.

## Testes

- `etapa03_3.hybrid.spec.ts` — classificação TBCA, schema válido, partial, 429.
- Diagnóstico local: `npx tsx scripts/diag-etapa03_3-tabela02.ts` (`PAGE=7`, `CALL_GEMINI=1` no ambiente com Vertex).

## Escopo

Somente importador. MetaNutri / Cardápio / Opção 01 / TACO / publicados: **intocados**.
