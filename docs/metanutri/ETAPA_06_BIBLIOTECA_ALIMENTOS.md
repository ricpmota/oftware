# ETAPA 06 — Biblioteca de Alimentos do `/metanutri`

**Data:** 2026-08-10  
**Pré-requisitos:** ETAPA 01–05  
**Escopo:** página Alimentos como biblioteca **METANUTRI** + **Meus Alimentos**.  
**Fora de escopo:** Opção 01, cardápio paciente, TACO API, pipeline PDF, escrita em `alimentos_globais` pelo nutri, reescrita dos Planos ETAPA 05.

---

## 1. Auditoria (antes)

### NutriAlimentosPanel (legado)
- Lista única em `nutricionistas/{uid}/alimentos`
- `garantirSeed`: upsert dos 29 do `CATALOGO_ALIMENTOS_METANUTRI`, preserva só `favorito`, sobrescreve macros/nome/grupos do seed, remove catalog depreciados, mantém `origemCatalogo: false`
- Favoritos locais = campo `favorito` no doc do alimento
- Dependentes: `page.v2` (menu Alimentos), Planos (`garantirSeed` + favoritos por grupo)

### Preservar
- CRUD Meus Alimentos
- `garantirSeed` **somente** na aba Meus / Planos (compatibilidade seed)
- Planos ETAPA 05 (METANUTRI|TACO|MANUAL) intactos

### Adaptar
- Abas METANUTRI | Meus Alimentos
- Busca/detalhe/favoritos da base global
- API ETAPA 05 com `segmento`, browse e detalhe

---

## 2. Arquitetura

```
/metanutri → Alimentos
  [ METANUTRI ] (padrão)     [ Meus Alimentos ]
        │                            │
  alimentos_globais               nutricionistas/{uid}/alimentos
  (published, read-only)          (seed + custom; CRUD)
        │
  favoritos vínculo:
  nutricionistas/{uid}/alimentos_globais_favoritos/{globalId}
```

Quatro conceitos: **METANUTRI** (global) · **Meus** (particular) · **Favorito** (vínculo) · **Plano** (snapshot).

---

## 3. APIs

| Método | Rota | Uso |
| --- | --- | --- |
| GET | `/api/metanutri/alimentos-globais?q=&segmento=&limit=&cursor=` | busca / browse published |
| GET | `/api/metanutri/alimentos-globais/[id]` | detalhe published |

Auth: `requireNutricionistaMetaNutri`.

DTO busca: `MetaNutriFoodSearchResult` (enxuto).  
DTO detalhe: `MetaNutriFoodDetailResult` (composição + fontes públicas, sem Gemini/import).

---

## 4. Favoritos globais

Path: `nutricionistas/{uid}/alimentos_globais_favoritos/{alimentoGlobalId}`

```json
{ "alimentoGlobalId": "...", "criadoEm": "..." }
```

**Não** copia para `alimentos`. Inactive/draft não aparecem na API de detalhe.

---

## 5. garantirSeed

Continua só em `NutriAlimentosService` sobre `nutricionistas/{uid}/alimentos`.  
**Nunca** aplicado a `alimentos_globais`.  
Na UI, seed roda ao abrir **Meus Alimentos** (lazy).

---

## 6. Índices Firestore

- `status` + `nomeNormalizado`
- `status` + `segmento` + `nomeNormalizado`

---

## 7. Arquivos

**Criados:** `NutriAlimentosMetanutriBiblioteca.tsx`, favoritos service, detail DTO/mapper, `[id]/route.ts`, `biblioteca.spec.ts`, este doc.

**Modificados:** `NutriAlimentosPanel.tsx`, `alimentos-globais/route.ts`, `globalFoodsService.server.ts`, `firestore.indexes.json`.

**Não alterados:** Planos modal ETAPA 05, Opção 01, NutriContent cardápio, pipeline PDF.

---

## 8. Testes

`lib/metanutri/alimentosGlobais/biblioteca.spec.ts` — DTO detalhe sem admin, null, path favoritos, contrato published.

---

## 9. Riscos

- Seed 29 ainda sobrescreve macros em Meus se editados com mesmo id — comportamento legado documentado
- Filtro Favoritos METANUTRI carrega detalhe por id (limitado); ok para V1
- Planos ainda usam favoritos **locais** do seed/custom, não os globais (próxima etapa opcional)
