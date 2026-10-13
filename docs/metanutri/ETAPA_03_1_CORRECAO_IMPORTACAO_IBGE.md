# ETAPA 03.1 — Correção importação PDF IBGE (0 alimentos)

**Data:** 2026-08-10  
**PDF:** `Tabela 01.pdf` (Pesquisa de Orçamento Familiar IBGE) — 351 páginas  
**Sintoma:** 351/351 páginas processadas, **0 alimentos** (OK/Atenção/Revisar = 0)

---

## 1. Diagnóstico (páginas 37–39)

| Etapa | Resultado |
| --- | --- |
| **A** `extractPdfTextByPage` | OK — ~2,6k chars/página; linhas densas com `6400101 Batata-inglesa …` |
| **A2** Parser IBGE determinístico | **109 alimentos** no lote 37–39 |
| **B** Prompt | Pede chave `"foods"` (contrato correto no prompt) |
| **C** Gemini (local) | Credenciais Vertex não disponíveis no ambiente de diag; em produção o lote fechou com 0 |
| **D–E** `extractGeminiJson` → `parseGeminiExtractionPayload` | Se JSON nulo **ou** chave `alimentos`/`items` → **`foods: []` silencioso** |
| **F–G** normalize / validate | **Não descartam** itens (só marcam ATTENTION/REVIEW) |
| **H** Firestore `itens` | Só grava o que chega em `foods[]` → **0 salvos** |

### Onde N → 0

O texto do PDF **não** é o problema (N ≫ 0 na etapa A).

O buraco fica **entre a resposta do Gemini e o parse do payload**:

1. Lotes densos + schema enorme → resposta truncada / JSON inválido → `extractJsonFromGeminiText` → `null` → `parseGeminiExtractionPayload` → `{ foods: [] }`.
2. Ou Gemini devolve array sob outra chave (`alimentos`, etc.) → parser antigo lia **só** `foods` → `[]`.
3. O lote era marcado **`done` com `foodsExtracted: 0`** mesmo com sinais claros de tabela → importação “completa” com 0 itens.

Normalizer/validator **não** eram o ponto de perda.

---

## 2. Correções aplicadas

### 2.1 Contrato Gemini
- `parseGeminiExtractionPayload` aceita: `foods` | `alimentos` | `items` | `foodItems`
- Recuperação parcial de array `foods`/`alimentos` em JSON truncado (`extractGeminiJson`)
- Prompt **v2** (`food-pdf-extract-v2`): IBGE multi-preparo, `codigoPreparacao`, tipos de tabela, proibição de `foods: []` quando há tabela
- `maxOutputTokens`: 8192 → **16384**

### 2.2 Fallback IBGE Tabela 1
- `parseIbgeTabela1FromText` — regex sobre texto colapsado
- Se Gemini retorna 0 e há sinais/Tabela 1 → usa parser determinístico
- Se Gemini retorna poucos e Tabela 1 tem mais → complementa por `codigo+preparacao`

### 2.3 Lote vazio não é DONE silencioso
- Sinais de tabela + 0 itens → status lote **`failed_extraction`**
- Importação pode ir para `partially_completed`
- Campos de rastreio no lote: `extractionSource`, `tableKind`, `finishReason`

### 2.4 Preparações distintas
- Campos: `codigoPreparacao`, `fonteIdentidade` (`IBGE:6400101:2`)
- Dedup **não** marca Cru vs Cozido do mesmo código como duplicata

### 2.5 Detecção de tabela
- `detectIbgeTableKind` / `hasFoodTableSignals`

---

## 3. Fixture esperada

```
6400101 Batata-inglesa 2 Cozido(a) 86,00 1,71 0,10 20,01 2,05
```

→

```json
{
  "codigoOriginal": "6400101",
  "nome": "Batata-inglesa",
  "preparo": "Cozido(a)",
  "codigoPreparacao": "2",
  "energiaKcal": 86,
  "proteinasG": 1.71,
  "gordurasTotaisG": 0.10,
  "carboidratosG": 20.01,
  "fibrasG": 2.05,
  "baseQuantidade": 100,
  "baseUnidade": "g",
  "fonteIdentidade": "IBGE:6400101:2"
}
```

Validado em `etapa03_1.ibge.spec.ts` + texto real páginas 37–39 (109 linhas).

---

## 4. Como reprocessar

1. Na UI da importação, usar **retry do lote** nas páginas de tabela (ex. `p37_39`), **ou**
2. Criar nova importação do `Tabela 01.pdf` e processar (não precisa das 351 de uma vez para validar — testar 37–39).

Script de diagnóstico:

```bash
npx tsx scripts/diag-ibge-import-etapa03_1.ts
# com Gemini (se credenciais no .env.local):
# CALL_GEMINI=1 npx tsx scripts/diag-ibge-import-etapa03_1.ts
```

---

## 5. Arquivos

| Arquivo | Papel |
| --- | --- |
| `lib/.../parseIbgeTabela1.ts` | Parser Tabela 1 + sinais |
| `lib/.../normalizeExtraction.ts` | Chaves alternativas + `codigoPreparacao` |
| `lib/.../detectDuplicates.ts` | Dedup por código+preparação |
| `lib/.../foodPdfExtractionPrompt.ts` | Prompt v2 IBGE |
| `lib/.../foodPdfGemini.server.ts` | Tokens + debug |
| `lib/oftpay/extractGeminiJson.ts` | Foods parciais |
| `services/globalFoodsImportService.server.ts` | Fallback + `failed_extraction` |
| `lib/.../etapa03_1.ibge.spec.ts` | Testes |
| `scripts/diag-ibge-import-etapa03_1.ts` | Diagnóstico A–H |

**Fora de escopo:** MetaNutri, Planos, Cardápio, TACO, `alimentos_globais` publicados, ETAPA 08.

---

## 6. Contagens do teste 37–39 (diagnóstico)

| Métrica | Valor |
| --- | --- |
| Gemini devolveu (local sem creds) | n/a |
| Parser IBGE no mesmo texto | **109** |
| Após normalize | 109 (nenhum drop) |
| Após validate | 109 (flags só) |
| Graváveis | 109 |

**Bug exato:** pipeline tratava falha/chave errada/truncamento do Gemini como `foods: []` e marcava lote **DONE**, sem fallback e sem alerta — por isso 351/351 com 0 alimentos.
