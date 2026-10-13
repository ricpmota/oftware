# ETAPA 08 — METANUTRI no Cardápio manual do paciente

**Data:** 2026-08-10  
**Pré-requisitos:** ETAPA 01–07  
**Escopo:** integrar a Base Global METANUTRI ao fluxo **manual** de adicionar alimento no Cardápio do paciente (`NutriContent`). Sem redesign, sem Opção 01, sem PDF/Gemini, sem migração em massa.

---

## 1. Fluxo anterior (confirmado)

Em `components/NutriContent.tsx`:

| Peça | Comportamento |
| --- | --- |
| Modal | `showAddItemModal` — só TACO (“Adicionar item da tabela TACO”) |
| Catálogo automático | `CATALOGO_OPCAO_01_ATUAL` via `gerarConfiguracaoBuilderPorRefeicao` |
| Custom | `itensCustomizadosPorRefeicao` mesclado em `itensDisponiveis` |
| Persistência | `pacientes_completos/{id}/nutricao/plano` via `setDoc` + `omitUndefinedDeep` |
| Importar de Planos | `importarRefeicaoDePlanoTemplate` → substitui customs da refeição |
| Porção | `EditarPorcaoItemModal` + `atualizarPorcaoItemBuilder` |

`ItemRefeicao` local tinha P/kcal + bases de peso; **não** tinha C/G/F, `origemAlimento` nem `alimentoGlobalId`. TACO preview mostrava C, mas o snapshot gravado descartava C/G.

---

## 2. Fluxo novo

Botão **Adicionar Item** abre modal:

**[ METANUTRI ] [ TACO ] [ MANUAL ]** — METANUTRI padrão.

```
fonte → snapshot (helpers ETAPA 07) → itensCustomizadosPorRefeicao
      → itensDisponiveis → salvar plano
```

`CATALOGO_OPCAO_01_ATUAL` e `gerarConfiguracaoBuilderPorRefeicao` **não** mudam. Itens METANUTRI/TACO/MANUAL **nunca** entram no catálogo automático.

---

## 3. Modal

Reutiliza o visual dos Planos (ETAPA 05), dentro do builder do paciente:

- METANUTRI: busca `GET /api/metanutri/alimentos-globais` (debounce, limit, published, Bearer)
- TACO: `/api/taco-buscar` (inalterado)
- MANUAL: nome + peso + P + kcal; C/G/F opcionais

Null na UI = `—` (nunca promove null → 0).

---

## 4. METANUTRI

- Mapper: `mapMetaNutriFoodToItemPlano` + `criarItemComPorcao`
- `categoria` = aba ativa (`categoriaDaAbaBuilder`) — **segmento ≠ categoria**
- Snapshot: P/C/G/F/kcal + bases + `origemAlimento: 'metanutri'` + `alimentoGlobalId`
- Porções `porcoes[]` resolvem `peso_g` (sem Gemini)
- Item **não** é referência viva: reabrir paciente usa só o snapshot salvo

---

## 5. TACO

Alinhado ao schema ETAPA 07:

- grava C/G
- fibra permanece `undefined` (API sem fibra)
- `origemAlimento: 'taco'`

---

## 6. MANUAL

- obrigatórios: nome, peso, P e/ou kcal
- opcionais: C, G, F
- `origemAlimento: 'manual'`

---

## 7. Snapshot / porção

Fórmula única (ETAPA 07):

`(valorBase × peso_g / pesoBase_g) × quantidade`

Helpers reutilizados:

- `aplicarPorcaoItem` / `criarItemComPorcao` / `normalizarItemComPorcao`
- `lib/nutri/itemRefeicaoSnapshot.ts` — ponte Cardápio ↔ `ItemPlanoRefeicao`
- `EditarPorcaoItemModal` recalcula P/C/G/F/kcal via `viewItemRefeicao`

---

## 8. `itensCustomizadosPorRefeicao`

Prefixos custom: `metanutri_`, `taco_`, `manual_`, `imp_`.

Importar de Planos continua replace da lista custom da refeição, agora **preservando** C/G/F, bases, origem e `alimentoGlobalId` (via `itemPlanoComoItemRefeicao`).

---

## 9. Serialização

Sem parser dedicado novo: o plano do paciente já persiste objetos com `omitUndefinedDeep`.

Campos novos são opcionais → planos legados sem C/G/F continuam válidos.

---

## 10. Totais e cobertura

- Resumo da refeição: linha discreta `kcal • P • C • G • F` quando houver C/G/F conhecidos
- Soma de C/G/F **só** sobre itens com valor definido (ausência ≠ zero científico)
- Helpers de dia (`calcularTotaisNutricionaisPlano` / cobertura) disponíveis via mapeamento para `ItemPlanoRefeicao`; sem nova seção visual obrigatória

---

## 11. Compatibilidade

| Cenário | Resultado |
| --- | --- |
| Só Opção 01 | inalterado |
| TACO antigo (sem C/G no doc) | carrega; P/kcal ok |
| Importado de Plano ETAPA 07 | snapshot completo |
| METANUTRI novo | snapshot completo |
| Misto | cada item com a cobertura que tiver |

Experiência do paciente: sem redesign; campos novos viajam no documento.

---

## 12. Auth / performance

- Mesma API MetaNutri com `requireNutricionistaMetaNutri`
- Sem client direto em `alimentos_globais`
- Debounce + limit server-side

---

## 13. Testes

`lib/nutri/cardapioPaciente.etapa08.spec.ts`:

- A) METANUTRI → cardápio (categoria, porção, macros, id, origem, roundtrip)
- B) TACO P/C/G
- C) Manual + opcionais
- D) Legado
- E) Importar / clone
- F) Editar porção
- G) Fingerprint `CATALOGO_OPCAO_01_ATUAL` (sem `alimentoGlobalId`)
- H) null/undefined não vira 0

---

## 14. Arquivos alterados

| Arquivo | Papel |
| --- | --- |
| `components/NutriContent.tsx` | Modal 3 abas, handlers, snapshot, import/porção |
| `lib/nutri/itemRefeicaoSnapshot.ts` | Bridge Cardápio ↔ Planos |
| `lib/nutri/cardapioPaciente.etapa08.spec.ts` | Regressão |
| `docs/metanutri/ETAPA_08_METANUTRI_CARDAPIO_PACIENTE.md` | Este doc |

**Não alterados:** `catalogoOpcao01.ts`, motor Opção 01, pipeline PDF, Biblioteca ETAPA 06, Planos (exceto reuso de helpers).

---

## 15. Riscos

| Risco | Mitigação |
| --- | --- |
| Regressão Opção 01 | `gerarConfiguracaoBuilderPorRefeicao` intocado; customs só append |
| Perda de C/G/F no save | `viewItemRefeicao` / `itemPlanoComoItemRefeicao` em todos os mapeamentos |
| Null → 0 na UI | `formatMacroOrDashCardapio` + `omitUndefinedDeep` |
| Design drift | Mesmos padrões visuais do modal de Planos |

---

## 16. Critério de conclusão

Nutricionista no Cardápio: Adicionar → METANUTRI|TACO|MANUAL (METANUTRI default) → banana → porção → item com P/C/G/F/kcal em customs → salvar/recarregar igual → TACO/Manual/Import/legado/Opção 01 ok → sem redesign.
