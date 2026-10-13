# ETAPA 04 — Revisão, reconciliação e publicação (Base Global de Alimentos)

**Data:** 2026-08-10  
**Pré-requisitos:** ETAPA 01 · ETAPA 02 · ETAPA 03  
**Escopo:** draft revisado → CREATE / MERGE / SKIP → `alimentos_globais`.  
**Fora de escopo:** MetaNutri, TACO, Planos, NutriContent, catálogos Opção 01 / MetaNutri (ETAPA 05).

---

## 1. Fluxo

```
PDF → Gemini → ImportedFoodDraft
  → revisão humana (segmento, ignore, flags)
  → ação: CREATE | MERGE | SKIP
  → readiness: READY | NEEDS_REVIEW | BLOCKED | IGNORED
  → publicação (humana, nunca automática)
  → AlimentoGlobal em alimentos_globais
```

Nenhum item é publicado sem decisão humana.

---

## 2. Evolução de `fonte` → múltiplas fontes

### Decisão

- Manter **`fonte`** como fonte principal (compatível com registros ETAPA 02).
- Adicionar **`fontes: FonteAlimentoGlobal[]`** como histórico completo.
- Loader (`resolveFontesAlimento` / `parseAlimentoGlobalDoc`):
  - só `fonte` → `fontes = [fonte]`
  - `fontes[]` → usa array; `fonte` = última / explícita

### Proveniência ampliada em `FonteAlimentoGlobal`

Além de nome/documento/versão/ano/código/página/licença:

- `tabela`
- `importId`, `itemImportId`
- `modeloGemini`, `promptVersion`
- `valoresOriginais`
- `registradoEm`

### Limitação V1 (documentada)

Não há proveniência **por nutriente** ainda (qual PDF preencheu cada campo).  
Nesta etapa: histórico de fontes no alimento + vínculo draft → `publishedFoodId` + importId na fonte.  
Proveniência por nutriente = candidato ETAPA 05+.

### Merge de fontes

Ao MERGE: `appendFonteHistorico` **adiciona** a nova fonte; **nunca** substitui as anteriores.

---

## 3. Regras de merge

| Existente | Importado | Sugestão |
| --- | --- | --- |
| null | valor | `USE_IMPORTED` |
| valor | null | `KEEP_EXISTING` |
| igual | igual | `KEEP_EXISTING` |
| valor A | valor B | `UNRESOLVED` (humano) |

`MergeConflict.resolution`:

- `KEEP_EXISTING`
- `USE_IMPORTED`
- `KEEP_BOTH_IF_SUPPORTED` (reservado; V1 não dual-write)
- `UNRESOLVED`

Enquanto houver `UNRESOLVED`, o merge é recusado.

Nunca sobrescrever silenciosamente.

Duplicidade detectada na ETAPA 03 é **sugestão** — banana madura ≠ verde ≠ farinha; peito cru ≠ grelhado.

---

## 4. Readiness

| Status | Significado |
| --- | --- |
| READY | sem erro bloqueante |
| NEEDS_REVIEW | alertas; publicável com confirmação humana (`forceReviewAlerts`) |
| BLOCKED | nome/segmento/base/parse/valor impossível — corrigir antes |
| IGNORED | SKIP / ignore |

Null em nutriente **não** bloqueia.

---

## 5. Idempotência

Em cada `ImportedFoodDraft`:

- `publicationAction`
- `publicationStatus` (`pending` | `published` | `skipped` | `failed`)
- `publishedFoodId`
- `publishedAt` / `publishedByUid`
- `mergeTargetFoodId`
- `mergeConflictsResolved`

Antes de CREATE/MERGE: se já `published` + `publishedFoodId` → retorno idempotente (não cria segundo alimento).

---

## 6. Endpoints

Auth: Bearer + `requireMetaAdminGeral`.

| Método | Rota | Ação |
| --- | --- | --- |
| PATCH | `.../importacoes/[id]/itens/[itemId]` | editar + `publicationAction` |
| POST | `.../importacoes/[id]/itens/[itemId]/publish` | CREATE ou SKIP |
| GET/POST | `.../importacoes/[id]/itens/[itemId]/merge` | preview / executar MERGE |
| POST | `.../importacoes/[id]/publish` | lote seguro (CREATE+READY+sem dup) |

---

## 7. Service

`services/globalFoodsPublicationService.server.ts`

- validar readiness
- `mapImportedDraftToGlobalFood`
- CREATE via `GlobalFoodsService.criar`
- MERGE com conflitos resolvidos + append de fontes
- SKIP
- lote
- `refreshImportSummary` → `completed` | `partially_completed`

Lógica complexa **não** fica nas routes.

---

## 8. UI

Em `AlimentosGlobaisImportPanel`:

- **Preparar publicação** — modo revisão final
- seleção em lote só itens seguros
- **Publicar selecionados**
- ações por linha: Criar / Mesclar / Ignorar
- modal de merge campo a campo
- badge **Publicado** + link do alimento
- resumo: extraídos / criados / mesclados / ignorados / pendentes / falhas

---

## 9. Resumo da importação

```json
{
  "extraidos": N,
  "criados": N,
  "mesclados": N,
  "ignorados": N,
  "comRevisaoPendente": N,
  "falharam": N
}
```

Status: `completed` (sem pendências) ou `partially_completed`.

---

## 10. Desfazer / rollback

V1:

- identificar via `fonte.importId` / `publishedFoodId` no draft
- desativar manualmente no Patrimônio Global (`inactive`)
- **não** há rollback automático de campos mesclados

Futuro: snapshot pré-merge + revert por publicação.

---

## 11. Testes

`lib/metaadmingeral/alimentosGlobais/importacao/publication.spec.ts`

- CREATE map + proveniência
- MERGE null / igual / conflito
- SKIP / readiness BLOCKED
- lote seguro
- múltiplas fontes + compat `fonte` antigo
- resumo

---

## 12. Arquivos principais

**Criados**

- `lib/metaadmingeral/alimentosGlobais/fontes.ts`
- `lib/.../importacao/publicationReadiness.ts`
- `lib/.../importacao/mapImportedDraftToGlobalFood.ts`
- `lib/.../importacao/mergeFoodFields.ts`
- `lib/.../importacao/publication.spec.ts`
- `services/globalFoodsPublicationService.server.ts`
- APIs `publish` / `merge`
- este documento

**Modificados**

- `types` AlimentoGlobal + ImportedFoodDraft
- `parseAlimentoGlobal` (fontes)
- `importacao/constants`
- `globalFoodsImportService`
- `AlimentosGlobaisImportPanel`

**Não alterados:** NutriContent, Planos, TACO, catálogos MetaNutri/Opção 01.

---

## 13. Riscos

- Merge sem proveniência por nutriente: auditoria fina limitada.
- Admin pode forçar NEEDS_REVIEW → published; flags ficam no draft.
- ID de merge digitado à mão — erro humano possível (preview mitiga).

---

## 14. Preparação ETAPA 05

Conectar busca MetaNutri: METANUTRI → TACO → MANUAL / global published.  
Não misturar `segmento` com `categoria` de cardápio.  
Considerar proveniência por nutriente e rollback de merge.
