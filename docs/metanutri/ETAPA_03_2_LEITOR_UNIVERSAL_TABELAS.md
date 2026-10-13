# ETAPA 03.2 — Leitor universal de tabelas nutricionais + resiliência Gemini

**Data:** 2026-08-10  
**Pré-requisitos:** ETAPA 03 · ETAPA 03.1  
**Escopo:** ingestão PDF → TableSchema discovery → extração orientada por schema → retry/backoff. Sem MetaNutri/Planos/Cardápio/Opção 01/TACO/publicação.

---

## 1. Respostas da auditoria (pré-implementação)

| # | Pergunta | Resposta |
| --- | --- | --- |
| 1 | Como chama Vertex? | `fetch` REST `generateContent` + JWT (`getVertexAccessToken`), sem SDK |
| 2 | Sequencial ou paralelo? | Sequencial (UI em loop; server 1 lote/vez) |
| 3 | Retry automático? | Antes: não. Agora: `withGeminiRetry` + lote `waiting_retry` |
| 4 | Location? | `VERTEX_AI_LOCATION` \|\| `us-central1` |
| 5 | `global` só no importador? | Sim — `FOOD_IMPORT_VERTEX_LOCATION` |
| 6 | Chamadas até 1º 429? | Sem telemetria antiga; agora `observability.rateLimitHits` |
| 7 | Retry-After? | Header lido em `classifyGeminiHttpError` / `parseRetryAfterMs` |
| 8 | Persistência lote? | Agora: `attemptCount`, `nextRetryAt`, `lastErrorCode`, … |
| 9 | FoodTableSchema? | `lib/.../tableSchema.ts` + subcoleção `schemas` |
| 10 | Discovery vs Extraction? | FASE A `discoverFoodTableSchema` → FASE B `extrairLinhasComSchema` |

---

## 2. Arquitetura

```
PDF
 → extractPdfTextByPage
 → DocumentFoodMap (classificação determinística)
 → FASE A: Schema Discovery (amostra) → FoodTableSchema
 → FASE B: Row Extraction (schema fixo no prompt)
 → normalize → validate → ImportedFoodDraft
 → checkpoint por lote
```

**Não** é a arquitetura `if IBGE / if TBCA / if USDA`.  
Parser IBGE denso permanece só como **camada 3 de fallback** quando Gemini retorna 0 em texto tabular.

---

## 3. TableSchema

Tipos em `tableSchema.ts`:

- `FoodTableType`, `FoodTableColumn`, `FoodTableSchema`
- Nutriente desconhecido → `targetField: null` → `nutrientesExtras` na normalização
- Persistência: `alimentos_importacoes/{id}/schemas/{schemaId}`
- `activeTableSchemaId` no doc da importação (continuação de tabela)

---

## 4. Classificação de páginas

`classifyPdfPage` / `buildDocumentFoodMap`:

| Class | Gemini? |
| --- | --- |
| NARRATIVE | não → `done_no_food_table` |
| REFERENCE_TABLE | não |
| FOOD_TABLE / TABLE_CONTINUATION | sim |
| UNKNOWN | sim (conservador) |

---

## 5. Chunk dinâmico

`estimateChunkComplexity`: LOW≤3 págs · MEDIUM≤2 · HIGH=1

---

## 6. Resiliência Gemini

- `withGeminiRetry` — backoff exponencial + jitter + Retry-After
- `throttleFoodImportGeminiCall` — `FOOD_IMPORT_GEMINI_MIN_INTERVAL_MS` (default 1500)
- Location: `FOOD_IMPORT_VERTEX_LOCATION` (opcional `global`)
- Erros: `GEMINI_RATE_LIMITED`, `GEMINI_UNAVAILABLE`, `GEMINI_TIMEOUT`, `GEMINI_INVALID_RESPONSE`, …
- Lote: `waiting_retry` → retry → `done` \| `failed_transient`
- Tabela + 0 foods → `TABLE_DETECTED_ZERO_ITEMS` / `failed_extraction` (nunca DONE silencioso)

---

## 7. Observabilidade

No doc da importação (`observability`):

- geminiCalls, retryCalls, pagesSentToGemini, pagesSkippedNarrative, rateLimitHits, input/output tokens

UI: linha discreta sob o progresso.

---

## 8. UI

- Upload **não** dispara rajada automática
- Botão **Processar / Continuar** (max 1 lote/request, poucas iterações)
- Status: aguardando Gemini / limite temporário / revisar extração
- Retry em falhas reais

---

## 9. Env

| Var | Default | Uso |
| --- | --- | --- |
| `FOOD_IMPORT_VERTEX_LOCATION` | `VERTEX_AI_LOCATION` / `us-central1` | só importador |
| `FOOD_IMPORT_GEMINI_MIN_INTERVAL_MS` | `1500` | throttle |
| `FOOD_IMPORT_DEBUG` | — | logs |
| `GEMINI_MODEL_ID` | `gemini-2.5-flash` | modelo |

---

## 10. Testes

`etapa03_2.universal.spec.ts`:

- retry 429 → success
- 429 esgota
- 503
- classificação FOOD_TABLE / NARRATIVE
- schema nutriente desconhecido
- foods vs alimentos
- JSON truncado
- fallback denso Batata

---

## 11. Arquivos principais

| Arquivo | Papel |
| --- | --- |
| `tableSchema.ts` | tipos schema |
| `classifyPdfPage.ts` | mapa do documento |
| `estimateChunkComplexity.ts` | chunk dinâmico |
| `geminiRetry.ts` / `geminiThrottle.ts` | resiliência |
| `foodPdfVertexClient.server.ts` | cliente Vertex isolado |
| `foodPdfSchemaDiscovery.server.ts` | FASE A |
| `foodPdfRowExtraction.server.ts` | FASE B |
| `processImportLoteCore.ts` | orquestração de extração |
| `globalFoodsImportService.server.ts` | persistência / checkpoint / waiting_retry |
| `AlimentosGlobaisImportPanel.tsx` | UI |

**Fora de escopo:** MetaNutri, Planos, Cardápio, Opção 01, TACO, publicados.

---

## 12. Multimodal (preparado, não ativo)

`textExtractionQuality` GOOD/DEGRADED/UNUSABLE — caminho futuro para render→Gemini vision. Não usado como default nesta etapa.

---

## 13. Como validar

1. Deploy
2. Abrir importação antiga → **Reprocessar do início** **ou** nova upload
3. **Não** processa sozinho no upload → clicar **Continuar**
4. Observar mapa + schema + alimentos
5. Em 429: status “Limite temporário” e retomada sem duplicar
