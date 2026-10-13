# ETAPA 05 — MetaNutri como fonte principal ao adicionar alimentos nos Planos

**Data:** 2026-08-10  
**Pré-requisitos:** ETAPA 01–04  
**Escopo:** conectar `alimentos_globais` (published) → modal Adicionar alimento em Planos.  
**Fora de escopo:** `CATALOGO_OPCAO_01_ATUAL`, cardápio automático do paciente, NutriContent Opção 01, pipeline PDF, escrita global pelo nutri.

---

## 1. Fluxo

```
Planos → NutriPlanosTemplatesPanel → Adicionar alimento
  [ METANUTRI ] (padrão) | [ TACO ] | [ MANUAL ]
       ↓
  GET /api/metanutri/alimentos-globais?q=
       ↓
  MetaNutriFoodSearchResult (DTO)
       ↓
  quantidade/porção → criarItemComPorcao / mapMetaNutriFoodToItemPlano
       ↓
  ItemPlanoRefeicao (snapshot) + categoria da aba ativa
       ↓
  NutriPlanosTemplateService.salvar
```

---

## 2. Componente alterado

`components/nutri/NutriPlanosTemplatesPanel.tsx` — modal inline “Adicionar alimento”.

Não alterados: `NutriContent` (cardápio paciente), Opção 01, TACO API (só UI tab), catálogos seed.

---

## 3. Schema do snapshot (confirmado)

`ItemPlanoRefeicao` (`lib/nutri/planosNutricionista.ts`):

| Campo | Significado |
| --- | --- |
| `proteina_g` / `calorias_kcal` | **Já escalados** para `peso_g × quantidade` |
| `proteinaBase_g` / `caloriasBase_kcal` | Macros no `pesoBase_g` |
| `pesoBase_g` | Referência (TACO/MetaNutri = 100 g) |
| `peso_g` | Porção em gramas |
| `categoria` | Papel no cardápio (aba ativa) |

**Novos opcionais (ETAPA 05):**

- `origemAlimento?: 'metanutri' | 'taco' | 'manual' | 'legacy'`
- `alimentoGlobalId?: string`

Não são referência viva. Planos antigos sem esses campos continuam válidos.

**Compatibilidade de macros no snapshot:** o schema exige `number` em prot/kcal; ausência no global vira `0` na base do item (igual ao contrato TACO/manual). Na **UI de busca**, null continua `—`.

---

## 4. API read-only

`GET /api/metanutri/alimentos-globais?q=banana&limit=30`

- Auth: `requireNutricionistaMetaNutri` (Bearer + `nutricionistas/{uid}`)
- **Não** usa `requireMetaAdminGeral`
- Somente `status === 'published'`
- Resposta: `{ alimentos: MetaNutriFoodSearchResult[] }`
- Sem fonte, importId, Gemini, prompt, logs

---

## 5. DTO

```ts
MetaNutriFoodSearchResult {
  id, nome, segmento, marca?,
  energiaKcal, proteinasG, carboidratosG, gordurasTotaisG, fibrasG, // number | null
  baseQuantidade, baseUnidade: 'g',
  porcoes: { id, nome, quantidadeG }[]
}
```

---

## 6. Busca Firestore

Prioridade: `status == published` + prefixo `nomeNormalizado`.

```
where status == published
where nomeNormalizado >= qNorm
where nomeNormalizado <= qNorm + '\uf8ff'
orderBy nomeNormalizado
limit ≤ 30
```

Fallback se índice ausente: published limitado + filtro `includes` em memória (máx. ~400 docs).

UI: debounce 300 ms, mínimo 2 caracteres.

**Não** Algolia/Typesense nesta etapa.

---

## 7. Índice Firestore

Em `firestore.indexes.json`:

```json
{
  "collectionGroup": "alimentos_globais",
  "fields": [
    { "fieldPath": "status", "order": "ASCENDING" },
    { "fieldPath": "nomeNormalizado", "order": "ASCENDING" }
  ]
}
```

Deploy: `firebase deploy --only firestore:indexes` (ou console).

---

## 8. Segmento ≠ categoria

`segmento` do global **não** mapeia para `categoria` do plano.  
Categoria = aba ativa (`proteina` | `carboidrato` | `gordura_boa` | `legumes_salada` em reguladores).

---

## 9. Cálculo

`calcularNutrientePorPorcao(valor100g, quantidadeG) = valor100g × quantidadeG / 100`  
Null → null. Determinístico, sem Gemini.

Porções do alimento: selecionar → `quantidadeG` + rótulo em `unidade`.

---

## 10. O que NÃO faz

- Não copia para `nutricionistas/{uid}/alimentos`
- Não altera Opção 01 / cardápio paciente
- Não permite escrita em `alimentos_globais` pelo nutri
- Não migra planos antigos

---

## 11. Arquivos

**Criados**

- `lib/metanutri/requireNutricionistaMetaNutri.ts`
- `lib/metanutri/alimentosGlobais/*` (types, DTO, map, cálculo, spec)
- `app/api/metanutri/alimentos-globais/route.ts`
- `docs/metanutri/ETAPA_05_METANUTRI_FONTE_PLANOS.md`

**Modificados**

- `NutriPlanosTemplatesPanel.tsx`
- `planosNutricionista.ts` (campos opcionais)
- `nutriPlanosTemplateService.ts` (serialize/parse)
- `globalFoodsService.server.ts` (`buscarPublicados`)
- `firestore.indexes.json`

---

## 12. Testes

`lib/metanutri/alimentosGlobais/metanutriAlimentos.spec.ts`

- cálculo porção / null
- DTO sem admin
- categoria pela aba
- origemAlimento + alimentoGlobalId
- legado / TACO / Manual

---

## 13. Riscos

- Índice composto necessário em produção para busca prefixada eficiente
- Substring no meio do nome depende do fallback (limitado)
- Snapshot só persiste prot/kcal (C/G/F só na UI MetaNutri) — alinhado ao schema atual dos Planos
- Auth exige doc em `nutricionistas/{uid}` (mesmo padrão WhatsApp nutri)

---

## 14. Próximo (fora desta etapa)

Cardápio paciente / Opção 01 consumindo a mesma busca; favoritar alimento global; proveniência por nutriente.
