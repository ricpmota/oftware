# Plano Terapêutico — UI v2 (consulta compartilhada)

Documento de produto/UX — evolução da página `/plano/[orcamentoId]`.  
**Escopo:** interface apenas. Motor, OI, APIs, Firestore e persistência **não foram alterados**.

---

## O que mudou

### De orçamento para planejamento

| Antes (v1 UI) | Agora (v2 UI) |
|---------------|---------------|
| Três cards (Progressivo / Equilibrado / Intensivo) | **Um único plano** contínuo |
| Foco em investimento no topo | Investimento **somente no final** |
| Um slider (prazo) | Dois sliders: **prazo** + **meta (kg)** |
| Gráfico com 3 linhas de cenário | Gráfico único com peso, dose, marcos |
| "Seu plano inclui" | **"Como será seu tratamento"** com frequências |
| Tom de proposta comercial | Tom de **ferramenta de consulta** |

### Novo topo

Exibe apenas:

- **Peso atual**
- **Meta atual** (valor do slider de meta)
- **Peso alvo** (derivado: peso atual − meta)

Título da página: **Planejamento do Tratamento**.

### Sliders

1. **Prazo** (4–10 meses) — pergunta: *"Em quanto tempo gostaríamos de atingir essa meta?"*
2. **Meta de perda** (5–25 kg)

O paciente participa da decisão sobre **meta** e **prazo**. Dose, medicamento e aplicações **não são editáveis**.

### Resumo dinâmico

Atualiza instantaneamente ao mover os sliders:

- Prazo
- Perda média prevista (kg/semana)
- Dose total prevista (mg)
- Aplicações
- Consultas

### Gráfico protagonista

- Eixo esquerdo: **peso (kg)** — linha prevista + linha de peso alvo + área suave
- Eixo direito: **dose semanal (mg)** — barras
- **Marcadores** discretos na linha do tempo: Consulta, Bioimpedância, Exame, Reavaliação

### Investimento

- Seção **"Investimento previsto"** apenas no final
- Valor total visível por padrão
- Botão **"Ver composição do investimento"** expande detalhamento sob demanda

---

## Arquitetura da UI (reaproveitamento)

```
PlanoTerapeuticoInterativoClient.tsx   ← orquestra estado, layout, sliders
        ↓
planoTerapeuticoPlanoUi.ts             ← camada de apresentação / interpolação
        ↓
PlanoTerapeuticoGraficoPrevisto.tsx    ← gráfico combinado + marcadores
        ↓
Payload API (3 cenários persistidos)   ← inalterado
```

### Ponto de entrada da lógica de UI

```typescript
resolverPlanoContinuo(cenarios, mesesPrazo, metaKgSlider, metaKgOriginal, pesoAtual)
```

Retorna `PlanoContinuoUi` com estimativa, curva, doses visuais, marcadores e valores para exibição.

---

## Como funciona hoje (sem alterar o motor)

### Prazo contínuo

Os 3 cenários do motor (`intensivo`, `equilibrado`, `progressivo`) permanecem no payload, mas **não são exibidos** ao usuário.

A UI interpola linearmente entre eles:

| Prazo (meses) | Interpolação |
|---------------|--------------|
| 4 | intensivo |
| 4–7 | intensivo → equilibrado |
| 7–10 | equilibrado → progressivo |
| 10 | progressivo |

Função: `interpolarCenarioPorPrazo` em `planoTerapeuticoPlanoUi.ts`.

### Meta contínua (preparada, limitada)

O slider de meta (5–25 kg) ajusta na UI:

- Peso alvo e curva de peso (regerada visualmente)
- Mg total (escala proporcional à meta original do plano)
- Perda semanal = meta / semanas
- Componente de medicação no investimento (escala proporcional)

**Limitação atual:** o motor foi calculado com uma meta fixa no momento da geração. A UI escala os valores — não recalcula cohort OI nem guardrails clínicos para cada meta.

### Doses semanais no gráfico

Função `derivarDosesSemanaisVisuais` — **distribuição visual** a partir do mg total interpolado.  
Não representa prescrição nem curva OI real.

### Marcadores de timeline

`gerarMarcadoresTimeline` distribui consultas, bio, exames e reavaliações ao longo das semanas do plano interpolado — somente visualização.

---

## Onde integrar o futuro motor (Treatment Planning Engine)

| Etapa futura | Arquivo / função | Ação |
|--------------|------------------|------|
| 1 | `resolverPlanoContinuo` | Substituir interpolação por `TreatmentPlanningEngine.compute({ metaKg, mesesPrazo, pesoAtual, … })` |
| 2 | `derivarDosesSemanaisVisuais` | Substituir por `dosesSemanais` retornadas pela OI / motor de curvas |
| 3 | `gerarCurvaPesoUi` | Substituir por curva semanal real do cohort |
| 4 | `escalarComposicaoPorMeta` | Remover — investimento virá do motor |
| 5 | `PlanoTerapeuticoInterativoClient` | Opcional: PATCH ao confirmar plano (quando persistência de aceite existir) |

### Contrato sugerido para o motor futuro

```typescript
type TreatmentPlanningInput = {
  metaKg: number;           // contínuo 5–25+
  mesesPrazo: number;       // contínuo 4–10+
  pesoAtualKg: number;
  configuracaoComercial: …;
  oiContext?: …;
};

type TreatmentPlanningOutput = {
  estimativa: EstimativaPlanoUi;
  curvaPeso: PontoCurvaPeso[];
  dosesSemanais: number[];  // fonte OI
  marcadores: MarcadorTimelineUi[];
  composicao: ComposicaoPlanoComercial;
  valorTotal: number;
  guardrails: …;
};
```

A UI v2 já consome `PlanoContinuoUi` — o motor futuro só precisa preencher o mesmo shape.

---

## O que NÃO mudou

- `planoTerapeuticoInterativoEngine.ts` (motor)
- OI / benchmarks
- Rotas API (`/api/plano-terapeutico`, `/api/metaadmin/plano-terapeutico`)
- Firestore (`orcamentosTerapeuticos`, `plano_terapeutico_links`)
- Configuração comercial do médico
- Persistência ao mover sliders (estado local apenas)

---

## Critérios de aceite (v2 UI)

| Critério | Status |
|----------|--------|
| Página mais limpa | ✅ |
| Foco em meta e prazo | ✅ |
| Gráfico como protagonista | ✅ |
| Tratamento antes do investimento | ✅ |
| Sem aparência de orçamento | ✅ |
| Preparada para motor inteligente | ✅ (`resolverPlanoContinuo` documentado) |
| Sem alteração OI / Firestore / APIs / motor | ✅ |

---

## Próximos passos sugeridos

1. **Treatment Planning Engine** com entradas contínuas `{ metaKg, meses }`
2. **Curvas OI semanais** substituindo `derivarDosesSemanaisVisuais`
3. **Guardrails clínicos** recalculados por meta+prazo no motor (não na UI)
4. **Aceite do plano** com persistência de `metaKg` + `mesesPrazo` escolhidos na consulta

---

*Relacionado: `09_TREATMENT_DESIGNER.md` (visão de produto), `08_PLANO_TERAPEUTICO_INTERATIVO.md` (v1 técnico).*
