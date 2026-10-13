# ETAPA 03 — Importação de PDF com Gemini (Base Global de Alimentos)

**Data:** 2026-08-10  
**Pré-requisitos:** ETAPA 01 (auditoria) · ETAPA 02 (fundação `alimentos_globais`)  
**Escopo:** pipeline isolado PDF → Gemini → preview/revisão. **Sem publicação** em `alimentos_globais`. Sem alteração MetaNutri/TACO/Planos/Opção 01.

---

## 1. Arquitetura

```
Admin (Patrimônio Global → Alimentos)
  → Importar PDF (multipart)
      → Storage: alimentos_importacoes/{importId}/source.pdf
      → Firestore: alimentos_importacoes/{importId}   ← só metadados
            + paginas/chunk_*   ← texto do PDF (fatiado; evita limite 1 MiB)
            + lotes/{loteId}
            + itens/{itemId}   ← ImportedFoodDraft
  → Processar lotes
      → extractPdfTextByPage (pdf-parse) / cache em paginas/
      → selectNextFoodImportChunk (3 págs)
      → Vertex Gemini (texto + prompt versionado, temperature 0)
      → normalizeExtraction → validate → detectDuplicates
      → preview (UI) — NÃO grava em alimentos_globais
```

Publicação/reconciliação = **ETAPA 04**.

---

## 2. O que foi reutilizado do OftPay / projeto

| Peça | Origem | Uso |
| --- | --- | --- |
| `extractPdfTextByPage` | `lib/oftpay/extractPdfTextByPage.ts` | texto por página |
| `extractJsonFromGeminiText` / `getGeminiAnswerText` | `lib/oftpay/extractGeminiJson.ts` | parse JSON Gemini |
| Chunk continue/idempotente | padrão `apostilaTopicMappingChunks` | lotes de páginas |
| Vertex auth | `lib/gcp/googleVertexAuth.ts` | credenciais |
| Modelo | `resolveGeminiModelId()` → `gemini-2.5-flash` (ou `GEMINI_MODEL_ID`) | |
| Auth admin | `requireMetaAdminGeral` | gate e-mail |
| Storage Admin | `getAdminStorageBucket()` | PDF |

**Não reutilizado cegamente:** collections/questões, GCS Oftreview, prompts de questões, multimodal de exames lab (aqui usamos **texto** por lote — mais estável para tabelas densas e retry).

---

## 3. Collections

| Path | Conteúdo |
| --- | --- |
| `alimentos_importacoes/{importId}` | metadados, progresso, fonte, status (**sem** texto do PDF) |
| `alimentos_importacoes/{importId}/paginas/chunk_*` | cache de texto do PDF (5 págs/doc — evita limite 1 MiB) |
| `alimentos_importacoes/{importId}/lotes/{loteId}` | status lote (`pending/processing/done/failed`), páginas, erro, duração, modelo |
| `alimentos_importacoes/{importId}/itens/{itemId}` | `ImportedFoodDraft` |

Storage: `alimentos_importacoes/{importId}/source.pdf`

**Não grava** em `alimentos_globais` nesta etapa.

---

## 4. Endpoints

| Método | Rota | Ação |
| --- | --- | --- |
| GET/POST | `/api/metaadmingeral/alimentos-globais/importacoes` | listar / upload |
| GET | `/api/metaadmingeral/alimentos-globais/importacoes/[id]` | detalhe + itens + lotes |
| POST | `/api/metaadmingeral/alimentos-globais/importacoes/[id]/process` | processa até N lotes |
| POST | `/api/metaadmingeral/alimentos-globais/importacoes/[id]/retry-lote` | retry lote falho |
| PATCH | `/api/metaadmingeral/alimentos-globais/importacoes/[id]/itens/[itemId]` | editar draft / ignorar |

Auth: Bearer + `requireMetaAdminGeral`.

---

## 5. Gemini

- **Papel:** extrator (não fonte nutricional)
- **Input:** texto das páginas do lote (não PDF inteiro)
- **temperature:** 0
- **responseMimeType:** `application/json`
- **Prompt versionado:** `lib/metaadmingeral/alimentosGlobais/prompts/foodPdfExtractionPrompt.ts` (`food-pdf-extract-v1`)
- Conversão numérica final: **código** (`parseBrazilianDecimal`), não o modelo

---

## 6. Chunking / retry / idempotência

- `FOOD_IMPORT_PAGES_PER_CHUNK = 3`
- Ponteiro `paginasProcessadas`
- Lote id `p{start}_{end}` — se `status === done`, avança sem reextrair
- Retry: zera ponteiro para `pageStart-1`, remove itens do lote, reprocessa
- Process API aceita `maxLotes` (UI loopa até `done`)

---

## 7. Pipeline de dados

```
GeminiRawExtraction
  → parseGeminiExtractionPayload
  → normalizeExtractionItem  (null≠0, extras, segmento sugerido)
  → findDuplicateMatches     (import + alimentos_globais; só sinaliza)
  → applyValidationAndDuplicates → qualityFlags + reviewStatus
  → ImportedFoodDraft (Firestore)
```

`reviewStatus`: `OK` | `ATTENTION` | `REVIEW` | `IGNORE`

---

## 8. UI

`AlimentosGlobaisImportPanel` embutido em `AlimentosGlobaisAdmin`:

- botão **Importar PDF**
- histórico de importações
- preview com edição de segmento, ignorar, detalhe (flags, originais, extras, duplicatas)
- botão Publicar **não implementado** (aviso ETAPA 04)

---

## 9. Arquivos novos

- `lib/metaadmingeral/alimentosGlobais/importacao/*`
- `lib/metaadmingeral/alimentosGlobais/prompts/foodPdfExtractionPrompt.ts`
- `services/globalFoodsImportService.server.ts`
- `app/api/metaadmingeral/alimentos-globais/importacoes/**`
- `components/metaadmingeral/AlimentosGlobaisImportPanel.tsx`
- `docs/metanutri/ETAPA_03_IMPORTACAO_PDF_ALIMENTOS.md`

## 10. Arquivos modificados

- `components/metaadmingeral/AlimentosGlobaisAdmin.tsx` (inclui painel)

## 11. Não tocados

NutriContent, Planos, TACO, catálogos MetaNutri, `alimentos_globais` publish path.

---

## 12. Testes

`lib/metaadmingeral/alimentosGlobais/importacao/importacao.spec.ts`:

- decimal BR / null vs zero
- mapeamento nutrientes + extras
- segmento inválido
- base desconhecida
- duplicidade
- chunking
- parse JSON Gemini

---

## 13. Riscos

| Risco | Mitigação |
| --- | --- |
| Texto PDF mal extraído (tabelas) | lotes pequenos; retry; qualityFlags |
| Timeout Vercel | processar 1–3 lotes por request; UI continua |
| Duplicar itens no retry | delete itens do lote antes de reprocessar |
| Gemini inventar valores | prompt + temperature 0 + validação; originais preservados |
| PDF grande / limite 1 MiB Firestore | texto em `paginas/chunk_*` (5 págs/doc); doc pai sem `pagesText`; legado migrado no load |

---

## 14. Preparação ETAPA 04

- Botão publicar selecionados (`ImportedFoodDraft` → `AlimentoGlobal` com `origemCadastro: 'pdf_import'`, status `draft`/`review`)
- Reconciliação de duplicatas (merge/skip humano)
- Não publicar automaticamente nesta etapa 03

---

## 15. Como testar

1. Login MetaAdmin Geral → Patrimônio Global → Alimentos  
2. Importar PDF (poucas páginas) + fonte  
3. Processar lotes até status Em revisão  
4. Conferir preview linha a linha vs PDF  
5. Confirmar: ausentes = `—` (null), zeros = `0`, nenhum item em `alimentos_globais`
