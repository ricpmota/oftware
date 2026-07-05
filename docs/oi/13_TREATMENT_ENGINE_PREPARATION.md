# Treatment Engine — Preparação Arquitetural

Documento técnico — reorganização do Treatment Designer antes do motor v2  
Versão: 1.0  
Status: arquitetura preparada; comportamento e layout inalterados

**Relacionado:** [09_TREATMENT_DESIGNER.md](./09_TREATMENT_DESIGNER.md) · [11_PLANO_TERAPEUTICO_V2_UI.md](./11_PLANO_TERAPEUTICO_V2_UI.md) · [12_FASES_DO_TRATAMENTO.md](./12_FASES_DO_TRATAMENTO.md)

---

## Objetivo desta etapa

Reorganizar o código do Treatment Designer para:

1. Trabalhar conceitualmente com **um plano único** (não três cenários na UI).
2. Introduzir tipos para **marcos clínicos**, **fases** e **extensões OI** no gráfico.
3. Isolar a **interpolação legada** dos três cenários para remoção futura.
4. Preparar pontos de integração para **diff dinâmico** e **`TreatmentPlanningEngine.compute()`**.

**Não alterado nesta etapa:** OI, Firestore, APIs, autenticação, persistência, layout, comportamento visual.

---

## Novo módulo: `lib/treatment-designer/`

| Arquivo | Responsabilidade |
|---------|------------------|
| `types.ts` | `PlanoTratamentoUnificado`, marcos, fases, extensões OI do gráfico |
| `legacyTresCenarios.ts` | **@legacy** — interpolação progressivo / equilibrado / intensivo |
| `legacyCenarioAdapter.ts` | Único adaptador UI → cenários persistidos → plano único |
| `horizontePlano.ts` | Meta atingida ≠ fim do tratamento; placeholders de fases/marcos |
| `planoVisuais.ts` | Dose visual, marcadores, formatação (sem dependência legada) |
| `graficoPlano.ts` | `montarDadosGraficoTratamento` — pontos com `extensao.oi` preparada |
| `planoDiff.ts` | `compararResumosPlano` — diff ao mover meta/prazo (não exibido) |
| `usePlanoDiff.ts` | Hook de integração — ref atualizada a cada mudança de resumo |
| `treatmentPlanningEngine.ts` | Contrato futuro `TreatmentPlanningEngine.compute()` (stub) |
| `index.ts` | Re-exports públicos |

---

## O que foi preparado

### 1. Plano único na UI

A página `/plano/[orcamentoId]` passa a resolver o plano via:

```
resolvePlanoUnico()  →  PlanoTratamentoUnificado
```

Em vez de tratar internamente três cenários como unidade de trabalho.

`planoTerapeuticoPlanoUi.ts` virou camada de **compatibilidade** (re-exports + aliases `@deprecated`).

### 2. Marcos clínicos

Tipos em `types.ts`:

| ID | Marco |
|----|-------|
| `inicio_tratamento` | Início do tratamento |
| `fim_adaptacao` | Fim da adaptação |
| `perda_5_pct` | 5% de perda de peso |
| `perda_10_pct` | 10% de perda de peso |
| `meta_atingida` | Meta atingida |
| `fim_consolidacao` | Fim da consolidação |
| `inicio_pos_meta` | Início da estratégia pós-meta |

Hoje `marcosPlaceholderFasePerda()` popula apenas início, 5%/10% estimados e meta. Demais marcos aguardam motor v2.

### 3. Gráfico preparado para OI

`PontoGraficoTratamento.extensao` aceita:

- `oi.percentualAtingiuMarco`
- `oi.pacientesSemelhantes`
- `oi.faixaPercentil`
- `marcosNaSemana`

**Não renderizado** em `PlanoTerapeuticoGraficoPrevisto.tsx`.

### 4. Interpolação documentada e isolada

**Onde a interpolação acontece hoje:**

```
Slider prazo (4–10 meses)
    ↓
prazoParaInterpolacao(meses)  →  t ∈ [0, 1]
    ↓
interpolarCenarioPorPrazo(cenarios, meses)
    ├─ t ≤ 0.5: intensivo ↔ equilibrado
    └─ t > 0.5: equilibrado ↔ progressivo
    ↓
escalarComposicaoPorMeta(composicao, metaSlider / metaOriginal)
    ↓
PlanoTratamentoUnificado
```

**Substituição futura:** `TreatmentPlanningEngine.compute({ mesesPrazo, metaKg, pesoAtualKg })` — comentários em:

- `legacyCenarioAdapter.ts` → `resolvePlanoUnico`
- `PlanoTerapeuticoInterativoClient.tsx` → `useMemo` do plano
- `planoTerapeuticoPlanoUi.ts` → `resolverPlanoContinuo`
- `treatmentPlanningEngine.ts` → stub

### 5. Diff dinâmico (integração)

- `compararResumosPlano(anterior, atual)` → `{ alterado, mensagem, itens[] }`
- Mensagem futura: `"O plano foi atualizado."`
- Exemplo de itens: `+2 consultas`, `+18 mg`, `+4 aplicações`
- `usePlanoDiffRef(resumo)` no client — **não exibe na UI**

### 6. Fases no gráfico (tipos)

`FaseTratamentoId`: `adaptacao` | `perda_peso` | `consolidacao` | `pos_meta`

Hoje `fasesPlaceholderFasePerda()` retorna apenas `perda_peso`. Cada ponto do gráfico carrega `faseId` e `semanaMetaAtingida` — sem mudança visual.

### 7. Meta ≠ fim do tratamento

`PlanoTratamentoUnificado` expõe:

- `semanaMetaAtingida` — marco clínico
- `semanaFimHorizonteVisual` — hoje igual à meta; futuro inclui pós-meta

`calcularHorizonteAtualFasePerda()` documenta que o horizonte visual atual cobre só a fase de perda.

---

## Arquivos que ainda dependem dos três cenários

### Motor e persistência (inalterados nesta etapa)

| Arquivo | Dependência |
|---------|-------------|
| `lib/metaadmin/planoTerapeuticoInterativoEngine.ts` | Gera `progressivo`, `equilibrado`, `intensivo` via `gerarCenariosPlanoTerapeutico` |
| `lib/server/planoTerapeuticoInterativoStore.ts` | Persiste `cenarios` + `cenarioSelecionado` |
| `types/planoTerapeuticoInterativo.ts` | `CenarioPlanoTipo`, `Record<CenarioPlanoTipo, …>` no documento |
| `app/api/metaadmin/plano-terapeutico/route.ts` | Cria plano com 3 cenários |
| `app/api/plano-terapeutico/[orcamentoId]/route.ts` | PATCH `cenarioSelecionado` (legado) |

### Camada legada isolada (remover com motor v2)

| Arquivo | Função |
|---------|--------|
| `lib/treatment-designer/legacyTresCenarios.ts` | `interpolarCenarioPorPrazo`, `prazoParaInterpolacao` |
| `lib/treatment-designer/legacyCenarioAdapter.ts` | `resolvePlanoUnico` — consome `cenariosLegados` |

### UI (único ponto de leitura dos cenários persistidos)

| Arquivo | Uso |
|---------|-----|
| `components/planoTerapeutico/PlanoTerapeuticoInterativoClient.tsx` | `plano.cenarios` → `resolvePlanoUnico`; prazo inicial via `mesesInicialDoPlanoLegado` |

---

## Pontos já preparados para o novo motor

| Capacidade | Status |
|------------|--------|
| Tipo `PlanoTratamentoUnificado` | Pronto |
| Marcos clínicos (`MarcoClinicoDef`) | Tipos + placeholder parcial |
| Fases (`FaseTratamentoSegmento`) | Tipos + placeholder `perda_peso` |
| Horizonte meta ≠ fim | `semanaMetaAtingida` / `semanaFimHorizonteVisual` |
| Gráfico multi-fase / OI | `PontoGraficoTratamento.extensao` |
| Diff meta/prazo | `planoDiff.ts` + `usePlanoDiffRef` |
| Contrato `TreatmentPlanningEngine` | Stub em `treatmentPlanningEngine.ts` |
| Isolamento 3 cenários | `legacyTresCenarios.ts` |

---

## Etapas que ainda faltam

| # | Entrega | Depende de |
|---|---------|------------|
| 1 | Implementar `TreatmentPlanningEngine.compute()` | ADR + motor v2 |
| 2 | Remover `legacyTresCenarios` e adapter | Motor v2 emitindo plano único |
| 3 | Persistência `fases[]` em vez de `cenarios` | ADR Firestore (fora desta etapa) |
| 4 | Fase 1 Adaptação no motor | [12_FASES_DO_TRATAMENTO.md](./12_FASES_DO_TRATAMENTO.md) |
| 5 | Fase 3 Consolidação configurável | Config médico |
| 6 | Fase 4 pós-meta (A/B/C) | Templates médico |
| 7 | Gráfico: faixas por fase | UI — sem alterar nesta etapa |
| 8 | Gráfico: overlay OI (cohort, %) | Integração OI semanal |
| 9 | UI: exibir diff ao mover sliders | `usePlanoDiffRef` → componente |
| 10 | Investimento multi-fase | Motor v2 + comercial |
| 11 | Curvas de dose reais (OI) | Substituir `derivarDosesSemanaisVisuais` |

---

## Fluxo atual vs futuro

### Hoje (inalterado em comportamento)

```
Firestore: cenarios { progressivo, equilibrado, intensivo }
    ↓
resolvePlanoUnico (interpolação legada + escala meta)
    ↓
PlanoTratamentoUnificado
    ↓
montarDadosGraficoTratamento → PlanoTerapeuticoGraficoPrevisto
```

### Futuro

```
TreatmentPlanningEngine.compute(input)
    ↓
PlanoTratamentoUnificado (fases completas, marcos, OI)
    ↓
Gráfico multi-fase + overlay estatístico + diff na UI
```

---

## Mapa de migração da UI

| Antes | Agora | Futuro |
|-------|-------|--------|
| `resolverPlanoContinuo` | `resolvePlanoUnico` | `TreatmentPlanningEngine.compute` |
| `PlanoContinuoUi` | `PlanoTratamentoUnificado` | mesmo tipo evoluído |
| `montarDadosGraficoPlano` | `montarDadosGraficoTratamento` | + render fases/OI |
| `mesesInicialDoPlano` | `mesesInicialDoPlanoLegado` | do plano único persistido |
| 3 cenários na UI | removidos (já na v2 UI) | removidos do motor |

---

## Verificação

- Comportamento do slider, resumo, gráfico e investimento: **inalterado**
- Layout da página: **inalterado**
- OI, Firestore, APIs: **não tocados**
- Novo código concentrado em `lib/treatment-designer/`

---

*Preparação concluída. Próximo passo recomendado: implementar `TreatmentPlanningEngine.compute()` com Fase 2 (perda) extraída do motor v1, depois fases 1, 3 e 4 conforme [12_FASES_DO_TRATAMENTO.md](./12_FASES_DO_TRATAMENTO.md).*
