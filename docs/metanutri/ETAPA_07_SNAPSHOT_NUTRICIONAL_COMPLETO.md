# ETAPA 07 — Snapshot nutricional completo nos Planos

**Data:** 2026-08-10  
**Pré-requisitos:** ETAPA 01–06  
**Escopo:** enriquecer `ItemPlanoRefeicao` com C/G/F, totais e cobertura. Sem redesign, sem Opção 01, sem migração em massa.

---

## 1. Schema anterior (confirmado)

| Campo | Significado |
| --- | --- |
| `proteina_g` / `calorias_kcal` | Valores da **porção** atual (`peso_g × quantidade`) |
| `proteinaBase_g` / `caloriasBase_kcal` | Valores na **base** (`pesoBase_g`, tipicamente 100 g) |
| `peso_g` | Porção em gramas |
| `pesoBase_g` | Referência dos macros base |
| `quantidade` | Multiplicador |

Fator: `(peso_g / pesoBase_g) * quantidade`

---

## 2. Schema novo (opcional)

Em `ItemPlanoRefeicao`:

- `carboidrato_g?` / `gordura_g?` / `fibra_g?` — porção
- `carboidratoBase_g?` / `gorduraBase_g?` / `fibraBase_g?` — base

Em `RefeicaoPlanoTemplate`:

- `carboidrato_g?` / `gordura_g?` / `fibra_g?` — soma dos selecionados **conhecidos**

**null/undefined:**

- Novos campos: `undefined` = desconhecido; `0` = fonte informou zero
- Legado `proteina_g` / `calorias_kcal`: continuam `number` (METANUTRI null → 0 só nesses dois)

---

## 3. Fontes

| Fonte | P/kcal | C | G | F |
| --- | --- | --- | --- | --- |
| METANUTRI | sim | se houver | se houver | se houver |
| TACO | sim | sim | sim | undefined (API sem fibra) |
| Manual | sim | undefined (V1) | undefined | undefined |
| Legado | sim | undefined | undefined | undefined |

Kcal da **fonte** — não recalcular P×4+C×4+G×9.

---

## 4. Helpers

- `escalarNutrienteOpcional` / `aplicarPorcaoItem` / `criarItemComPorcao`
- `recalcularMacrosRefeicaoPlano` (inclui C/G/F)
- `calcularTotaisNutricionaisPlano`
- `calcularCoberturaNutricionalPlano`
- `formatarResumoMacrosItem` / `formatarResumoMacrosRefeicao`

---

## 5. Serialização

`NutriPlanosTemplateService` persiste/lê novos campos; docs antigos sem eles continuam válidos. Sem migration.

---

## 6. UI

Sem redesign: resumos existentes passam a mostrar `kcal • P • C • G • F` quando disponíveis. Modal de porção recalcula tudo via `normalizarItemComPorcao`.

---

## 7. Arquivos

- `lib/nutri/planosNutricionista.ts`
- `lib/metanutri/alimentosGlobais/mapMetaNutriFoodToItemPlano.ts`
- `services/nutriPlanosTemplateService.ts`
- `components/nutri/NutriPlanosTemplatesPanel.tsx`
- `components/nutri/EditarPorcaoItemModal.tsx`
- `lib/nutri/planosNutricionista.etapa07.spec.ts`
- este doc

**Não alterados:** Opção 01, NutriContent cardápio automático, pipeline PDF.

---

## 8. Testes

`planosNutricionista.etapa07.spec.ts` — METANUTRI 100→150, null≠0, TACO, Manual, legado, totais, cobertura, clone, fixtures A–E.

---

## 9. Riscos

- Totais C/G/F parciais se itens mistos (use cobertura)
- Tabela desktop unificou colunas Prot/Kcal em “Macros” (mesmo padrão visual)
- Planos ainda não mostram total do dia na UI (helper pronto)
