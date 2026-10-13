# AUDITORIA PRÉ-ETAPA 07 — Técnicas avançadas, blocos e exercícios intercalados

**Sistema auditado:** fluxo operacional do Personal (`PersonalPageContent` → `trainingSessions` / `planos_treino` / `exerciseExecutions`).  
**Não auditado como alvo de mudança:** motor determinístico (`WorkoutPlanDraft` / `PublishedTrainingPlan` / `trainingSessionExecutions`).  
**Esta tarefa:** somente análise. **Zero implementação.** Nenhum schema foi criado.

**Fonte de verdade:** código atual.  
**Data:** 2026-08-18.

Documentos lidos: ETAPA 01–06, ETAPA 05B, `AUDITORIA_ESTATISTICAS_ANTES_DASHBOARD.md`, `ESTRUTURA_MONTAR_TREINO.md`.

---

## 1. Resumo executivo

O Personal trata o treino como **lista linear de exercícios independentes**. Cada exercício tem `prescription.series[]` próprio. A execução é **isolada por exercício**: o paciente entra num card, conclui S1→S2→S3 daquele movimento, e só então escolhe o próximo (botão Próximo / miniatura). Não existe relação entre exercícios, round, bloco, técnica estruturada, RPE/RIR, cadência nem segmentos dentro da série.

**O sistema não consegue executar hoje:**

```text
Agachamento S1 → Elevação S1 → Agachamento S2 → Elevação S2 → …
```

Por quê: a próxima série é sempre `getNextPendingSeries(execução DESTE exercício)`. Não há orquestrador de sessão.

**Conclusão central:** para intercalados / supersérie / circuito precisamos de:

1. um **conceito de bloco** (relação entre ocorrências);
2. um **orquestrador de navegação da sessão** (qual ocorrência + qual série vem a seguir);
3. **descansos no nível do bloco**, porque `series[].restSec` hoje significa “depois desta série, ainda neste exercício”.

Não precisamos de cinco schemas. Um `TrainingExerciseBlock` com `type` cobre Alternado, Supersérie, Bi-set, Tri-set e Circuito. Drop-set / rest-pause / cluster são **outra camada** (`segments[]` opcional na série) e não devem ser misturados com bloco.

Treino antigo sem bloco continua exatamente como hoje (`campo ausente → execução tradicional`).

**Primeira implementação recomendada:** infraestrutura de bloco + **Exercícios alternados** (2 exercícios, mesmo número de séries) + execução guiada + clone/PDF/Histórico. Só depois supersérie/circuito, depois RPE/RIR/cadência, depois segmentos.

---

## 2. Arquitetura atual

Três mundos que **não devem ser misturados**:

| Mundo | Onde | Papel |
| --- | --- | --- |
| Operacional | `trainingSessions/{id}` + `exercises` + `exerciseExecutions` | Treino do paciente (Criar / Hoje / execução) |
| Biblioteca do personal | `personal_trainers/{uid}/planos_treino/{planoId}` | Template reutilizável |
| Motor publicado | `WorkoutPlanDraft` / `PublishedTrainingPlan` / `trainingSessionExecutions` | Fora desta auditoria |

Fluxo real do exercício operacional:

```text
ExerciseDB (API)
  → Catálogo (ExerciseCatalogPanel)
  → selectedExercises[] (SelectedExerciseDraft)
  → WorkoutBuilder / sheet mobile
  → series[] editadas no rascunho
  → handleCreateSession
  → trainingSessions/{sessionId}
       exercises/{exerciseDocId}     prescrição
       exerciseExecutions/{exerciseDocId}  realizado (só depois de executar)
  → Paciente: modal Iniciar treino
  → Histórico / Estatísticas / PDF
```

Biblioteca é um desvio paralelo: rascunho ↔ `PersonalWorkoutTemplate.exercicios[]` ↔ de volta ao rascunho. Não grava em `trainingSessions` até “Puxar para o paciente” + Salvar treino.

---

## 3. Modelo atual do exercício

Tipo real: `TrainingSessionExercise` em `types/trainingSession.ts`.

```ts
{
  id?: string                 // exerciseDocId Firestore (só depois de salvar)
  source: 'exercisedb'
  exerciseId: string          // ID ExerciseDB — identidade longitudinal
  name: string
  bodyPart: string
  target: string
  equipment: string
  gifUrl?: string
  prescription: TrainingExercisePrescription
  trainerNote?: string        // orientação humana, por ocorrência
  order: number               // posição visual 0-based
  status?: 'done' | 'skipped' // exercício inteiro; ausente = pendente
  completedAt?: Date | string
}
```

Onde cada campo vive:

| Campo | Catálogo `Exercise` | Draft | Sessão Firestore | Execução | Biblioteca |
| --- | --- | --- | --- | --- | --- |
| `exerciseId` | `Exercise.id` | `draft.id` / `exerciseId` | `exerciseId` | `exerciseId` | `exerciseId` |
| `exerciseDocId` | — | — | `exercises/{autoId}` | chave do doc + `exerciseDocId` | — (`tpl_ex_…` é outro) |
| `draftId` | — | `draft_ex_…` | **não é gravado** | — | vira `tpl_ex_…` / regenerado |
| `order` | — | índice do array | `order: index` no save | — | `order` |
| `trainerNote` | — | no draft | no doc do exercício | snapshot `prescribedTrainerNote` | no item do template |
| `prescription.series[]` | default 3×10 | no draft | no doc | copiado p/ `prescribed*` | no item |

**Não existe hoje nenhum campo de relação entre exercícios.**

---

## 4. Modelo atual de `series[]`

`lib/personal/trainingExerciseSeries.ts`:

```ts
type TrainingExerciseSeries = {
  id: string        // set_{timestamp36}_{rand}
  order: number     // 1-based, sempre reindexado
  reps: number      // ≥ 1
  loadKg: number | null
  restSec: number   // ≥ 0
}
```

- **Criar ID:** `createTrainingSeriesId()`.
- **Normalizar order:** `normalizeSeriesOrder` → `order = index + 1`.
- **Adicionar:** `addTrainingSeries` copia reps/carga/descanso da última.
- **Remover:** `removeTrainingSeries`; mínimo 1 série.
- **Atualizar:** `updateTrainingSeries` (reps, loadKg, restSec).
- **Duplicar exercício:** `cloneSeriesWithNewIds` — **novos** `set_…`.
- **Salvar:** `serializeTrainingPrescription` grava `{ id, order, reps, loadKg, restSec }`. `loadKg` usa `null`, nunca `undefined`.
- **Legado:** se não houver `series[]`, `sets`/`reps`/`restSec` planos viram N séries iguais, `loadKg: null`.
- **Validação:** `reps > 0` obrigatório. Isso **bloqueia** isometria/AMRAP sem mudança futura.
- **Pirâmide:** já funciona (séries com valores diferentes). Não é uma técnica no schema.

Não há `segments[]`, `rpe`, `rir`, `tempo`, `durationSec`, `round`, `block`.

---

## 5. Significado atual de `restSec`

**Resposta: A + C, no contexto de um único exercício.**

É o descanso **depois daquela série**, usado pelo **timer global do modal**, antes da **próxima série do mesmo exercício**.

Evidência:

1. Builder: cada linha de série tem campo Descanso (`ExerciseSeriesEditor`).
2. Execução série a série (`handleCompleteRunSeries`): se ainda existe série pending **neste** `runExecution`, inicia `setRestSecondsLeft(restSec)` com `restAdvanceMode = 'series'`. Não troca de exercício.
3. O paciente pode editar o valor na hora; o timer usa o valor informado, não muta a prescrição.
4. `getEffectiveRestSec()` = descanso da **última** série. Usado no fluxo antigo de marcar Feito no card (fora do modal série a série).

O que `restSec` **não** é hoje:

- descanso entre dois exercícios diferentes;
- descanso após uma volta de bloco;
- descanso intra-série (drop / rest-pause);
- persistido como `restEndAt` — o timer vive só na memória do modal.

**Limitação para intercalado:** se A1 tem 20s e B1 tem 60s, o código atual só aplicaria os 20s se o paciente continuasse no Agachamento (A2). Não há gancho “após A1 vá para B1 com 20s”. Para blocos, descanso entre membros e descanso após round precisam ser campos do **bloco**, senão o personal não consegue expressar as duas pausas.

---

## 6. Draft e IDs

`SelectedExerciseDraft` (`lib/personal/workoutDraft.ts`):

```ts
Exercise & {
  draftId: string
  prescription: { series: TrainingExerciseSeries[] }
  trainerNote?: string
}
```

`Exercise.id` no catálogo **é** o ExerciseDB id.

| ID | Quando existe | Persistido na sessão? |
| --- | --- | --- |
| `exerciseId` / `Exercise.id` | sempre | sim |
| `draftId` (`draft_ex_…`) | só no rascunho | **não** |
| `tpl_ex_…` | item da biblioteca | na biblioteca, não na sessão |
| `exerciseDocId` | após `createSessionWithExercises` (auto-id Firestore) | sim, é o path |
| `series.id` (`set_…`) | no draft e na sessão | sim, copiado pelo serialize |

**Buraco crítico para blocos:** o `draftId` morre no save. Um bloco que aponte para `draftId` não sobrevive a `trainingSessions` a menos que gravemos uma chave de ocorrência no doc do exercício (recomendado: persistir `draftId` ou `occurrenceKey`).

---

## 7. Drag-and-drop

Desktop (`WorkoutBuilderPanel` + `WorkoutExerciseBuilderCard`):

- `@dnd-kit`, `verticalListSortingStrategy`, sortable id = `draftId`.
- Só reordena `selectedExercises` (`reorderSelectedExercises`).
- **Nenhum conceito além de posição linear.**
- `order` salvo = **índice do array** em `createSessionWithExercises` (`order: index`).

Mobile (bottom sheet em `page.tsx`): **não tem DnD nem Duplicar**. Lista vertical + remover + editor de séries. Qualquer UX de agrupamento precisa de botão/menu, não de arrastar um card sobre o outro.

**Risco futuro:** um DnD linear solto **quebra blocos** se puder interpolar um exercício no meio do grupo. Unidade de drag do bloco deve ser o bloco inteiro; reordenar A1/A2 só **dentro** do bloco.

---

## 8. Persistência Firestore

### `trainingSessions/{sessionId}`

Campos reais: `patientId`, `createdBy`, `createdById`, `scheduledDate`, `title`, `status`, `published`, `recurrenceGroupId?`, `patientNotes?`, `trainerNotes?`, `createdAt`, `updatedAt`.  
**Nenhum array de exercícios no doc.** Exercícios são subcollection.

### `trainingSessions/{sessionId}/exercises/{exerciseDocId}`

Campos do save: `source`, `exerciseId`, `name`, `bodyPart`, `target`, `equipment`, `gifUrl?`, `prescription.series[]`, `trainerNote?`, `order`. Depois da execução: `status`, `completedAt`.

`exerciseDocId` é gerado pelo Firestore (`doc(collection(...))`), **não** é o `draftId`.

### `trainingSessions/{sessionId}/exerciseExecutions/{exerciseDocId}`

Doc id = mesmo `exerciseDocId`. Shape: ver §11 / tipos em `trainingExecutionSeries.ts`. Serialização: `omitUndefinedDeep`; `loadKg`/`actualLoadKg` usam `null`.

**Relação entre exercícios:** confirmado, **não existe**.

**Onde salvar bloco (recomendação):** campo `exerciseBlocks` **no documento da sessão**, não subcollection. Motivo: zero query extra (`getSession` já lê o doc); clone/recorrência copia o array junto; exercises continuam a subcollection atual.

Biblioteca: campo irmão `exerciseBlocks` (ou `blocos`) em `planos_treino/{planoId}`, referenciando `tpl_ex_…`.

---

## 9. Biblioteca e clones

Tipos: `PersonalWorkoutTemplate` / `PersonalWorkoutTemplateExercise` em `lib/personal/planosTreino.ts`.

Ciclo de IDs:

```text
Draft draft_ex_X, series set_1
  → Salvar como modelo
      tpl_ex_NOVO, series set_NOVOS, loadKg opcionalmente stripped
  → Importar para paciente
      draft_ex_NOVOS, series set_NOVOS
  → Salvar sessão
      exerciseDocId AUTO, series ids do draft (preservados no serialize)
  → Recorrência N datas
      N sessions, N conjuntos de exerciseDocId NOVOS, mesmos series.id do payload
```

`clonePersonalWorkoutTemplate` / `duplicateTemplateExercise` / `cloneTemplateExerciseToWorkoutDraft` já regeneram ids de exercício e de série. **Qualquer `blockId` futuro precisa do mesmo remap:** novo blockId, novos member keys, **mesma ordem relativa**.

Campos clonados hoje: catálogo (nome, bodyPart, target, equipment, exerciseId), `prescription.series` (valores), `trainerNote`, `order`. Nada de técnica/bloco.

---

## 10. Recorrência

`handleCreateSession` gera N datas e chama `createSessionWithExercises` **N vezes com o mesmo `exercisesData`**. Cada sessão:

- novo `sessionId`;
- novos `exerciseDocId`;
- mesmo `recurrenceGroupId`;
- mesma prescrição (incluindo os mesmos `series.id` do payload).

Se existirem blocos, a relação A1+A2 **precisa ser regravada em cada sessão**, apontando para os **novos** `exerciseDocId` daquela data. Algoritmo: salvar na ordem do array; mapear índice i → novo doc id; reescrever `memberExerciseDocIds`.

Editar recorrente hoje: apaga os ids antigos e republica. Blocos seguiriam o mesmo padrão se copiados no payload.

---

## 11. Execução atual

Arquivos: `app/meta/personal/page.tsx` (modal), `WorkoutRunSeriesPanel.tsx`, `trainingExecutionSeries.ts`, `TrainingExerciseExecutionService`.

```text
Iniciar treino (startWorkout)
  → modal; activeRunExerciseId = exercício clicado
  → getOrCreate execution (snapshot prescribed* + trainerNote)
  → getNextPendingSeries → painel da série
  → Concluir série → save execution; se há próxima série DESTE exercício → timer
  → fim das séries → card "Exercício concluído" [Refazer]
  → Próximo / miniatura → outro exercício (índice + 1 circular)
  → Pulei → skipRemainingExerciseSeries + markExercise skipped
```

Não há `currentSeriesIndex` persistido. O “cursor” é a primeira série `pending`.

Read-only (personal/médico/nutri): carrega execution ou monta snapshot local; não muta.

---

## 12. Timer

Estado **global do modal**, em `page.tsx`:

- `restSecondsLeft`, `isRestRunning`, `restAdvanceMode` (`'series' | 'exercise'`)
- countdown `setInterval` 1s
- som / `restDefaultSec` / `timerAutoStart` em localStorage

**Não pertence à execution do exercício.** Quando o timer acaba em modo `'series'`, permanece no mesmo exercício. Modo `'exercise'` avançaria o `activeRunExerciseId`, mas o fluxo série a série **só grava `'series'`**. Ou seja: hoje o timer nunca troca de exercício sozinho.

Isso é **favorável** a blocos: o timer já é da sessão. O orquestrador só precisa dizer, ao terminar o descanso, se o próximo passo é outra série do mesmo doc ou outro `exerciseDocId`.

Não existe `restEndAt` no Firestore. Fechar o navegador no meio do descanso **perde o timer**, não a série já `done`.

---

## 13. Retomada

Sim, para **séries dentro de um exercício**: `getOrCreate` lê `exerciseExecutions/{exerciseDocId}`; `getNextPendingSeries` acha a primeira `pending`.

Não retoma:

- descanso em andamento;
- “estou no meio de um bloco” como conceito (não existe);
- posição na lista além do exercício que o usuário reabrir.

Com blocos, o próximo passo `A2` deve ser **derivado**: varrer membros na ordem do bloco, achar a primeira série pending na ordem intercalada. Não precisa cursor global persistido.

---

## 14. Histórico

Lista cronológica de sessões. Detalhe: exercícios da sessão (`order`) + se existir execution, prescrito × realizado por série (`SessionExerciseExecutionDetail`). Sem gráfico.

Não há agrupamento visual. Um bloco futuro deveria aparecer como seção (“Bloco A — Alternado”) **na ordem real da prescrição**, sem inventar carga. Execução intercalada no histórico: mostrar a sequência derivada (A1, B1, A2…) se quisermos fidelidade; o mínimo é listar membros do bloco juntos.

---

## 15. Estatísticas

ETAPA 06 agrupa progressão por **`exerciseId` (ExerciseDB)**. Ocorrências distintas (`exerciseDocId`) entram no histórico daquele movimento.

Participar de supersérie/alternado **não deve mudar** essa identidade. Impacto: nenhum no agrupamento, desde que o realizado continue em `exerciseExecutions` por ocorrência. Opcional depois: badge “feito em bloco” — fora de 07A.

---

## 16. PDF

`buildWorkoutPrintData` ordena por `exercise.order` e imprime cada exercício com suas séries (prescrição, não execução).

Hoje:

```text
1. Agachamento
2. Elevação lateral
3. Leg press
```

Futuro desejado: inserir um cabeçalho de bloco e, sob ele, os membros. Continua sendo lista derivada de `order` + `exerciseBlocks`. Sem query nova.

---

## 17. Impacto de exercícios alternados

Caso que motiva a etapa:

```text
A1 → B1 → A2 → B2 → A3 → B3
```

Pontos que **obrigatoriamente** mudam:

| Ponto | Hoje | Precisa |
| --- | --- | --- |
| Schema | lista plana | bloco `alternating` + 2 ocorrências |
| Builder | cards independentes | envelope visual + regras de série |
| Save | só exercises | session.exerciseBlocks + remap de ids |
| Execução | esgota A depois B | após A série i, ir para B série i |
| Timer | rest da série de A | rest entre A/B e após a volta |
| Próximo | +1 na lista | próximo passo da sequência do bloco |
| Retomada | pending de A | pending na sequência intercalada |
| PDF / Histórico | lista | seção de bloco |
| Biblioteca | clone linear | remap blockId + members |

**V1 sugerida:** exatamente 2 exercícios, **mesmo número de séries**. Simplifica para `round i = A.series[i] + B.series[i]`. Proibir N séries diferentes no 07A (estratégia 1). Estratégia 2 (A4 sozinho no fim) e rounds independentes ficam para depois.

`series[]` de cada exercício **não precisa mudar de shape** para alternar. Só a **ordem de navegação**.

---

## 18. Impacto de supersérie

Mesma infra de bloco. Diferença operacional:

```text
Alternado:  A1 → (pausa curta?) → B1 → (pausa de volta) → A2 …
Supersérie: A1 → B1 sem pausa → (pausa de volta) → A2 …
```

Bi-set = supersérie com 2. Tri-set = supersérie com 3. **Não criar** `type: 'biset' | 'triset'`.

---

## 19. Impacto de circuito

Mesmo bloco, N≥2 (ou ≥3 na validação de produto) membros, N rounds = comprimento das séries (V1: séries iguais). Sequência:

```text
A1 → B1 → C1 → D1 → restAfterRound → A2 …
```

`restBetweenExercisesSec` pode ser 0.

---

## 20. Impacto de drop-set / rest-pause / cluster

Escopo: **uma série**, não a ordem entre exercícios.

Hoje a série é atômica (`reps`, `loadKg`, `restSec`). Não cabe 10×30 → 8×22 → 8×16.

Recomendação futura (não 07A): `segments?: TrainingSeriesSegment[]`. Ausente = série tradicional. Compartilhado por drop-set, rest-pause e cluster (`pauseAfterSec` entre segmentos; drop muda carga; cluster/rest-pause repetem carga).

Não usar bloco para isso.

---

## 21. RPE / RIR / cadência

Não mudam ordem nem (em geral) o timer.

Recomendação:

- **RPE e RIR:** na **série** (`series[].rpe?`, `series[].rir?`). Prescrição por série, como carga.
- **Cadência:** default no exercício, override opcional na série. Evita repetir `3-1-1-0` três vezes.

`trainerNote` permanece texto livre. Técnica computável ≠ orientação humana.

Fora de 07A.

---

## 22. Alternativas de schema

### A) Metadados em cada exercício

```ts
group?: { id: string; type: …; orderInGroup: number }
```

Prós: cabe no doc que já existe.  
Contras: dados repetidos; clone precisa varrer todos; um exercício com `group.id` órfão; DnD fácil de dessincronizar `orderInGroup`; descanso de bloco não tem dono natural.

### B) Objeto de bloco separado (recomendado)

```ts
exerciseBlocks: TrainingExerciseBlock[]
```

no doc da sessão / template. Membros apontam para a ocorrência.

Prós: uma fonte da verdade; descanso no bloco; clone remapeia um array; treino sem o campo = legado.  
Contras: precisa de chave de ocorrência estável no exercício (hoje o `draftId` não é salvo).

### C) Subcollection `blocks`

Query extra. Desnecessário nesta escala.

### D) Só `order` intercalado (A, B, A, B como 4 docs)

Duplicaria o exercício a cada série. Quebraria Estatísticas, Duplicar, PDF e execução atual. **Rejeitar.**

---

## 23. Schema recomendado

Ainda não implementar. Proposta mínima:

```ts
type TrainingExerciseBlockType = 'alternating' | 'superset' | 'circuit'

type TrainingExerciseBlock = {
  id: string
  type: TrainingExerciseBlockType
  memberKeys: string[]          // occurrenceKey dos exercícios, ordem no bloco
  restBetweenExercisesSec: number
  restAfterRoundSec: number
}

// No exercício (draft, template e sessão):
occurrenceKey: string           // hoje: draftId / tpl_ex_ / persistir no save
```

Rounds **não** precisam ser persistidos se V1 exige o mesmo `series.length` em todos os membros: `rounds = series.length`.

Série tradicional inalterada. `segments[]` / RPE só em etapas seguintes, sempre opcionais.

UI:

| Código | Tela |
| --- | --- |
| `TrainingExerciseBlock` | Bloco |
| `alternating` | Exercícios alternados |
| `superset` | Supersérie |
| `circuit` | Circuito |

---

## 24. Orquestração recomendada

**Sim, precisamos de um orquestrador de sessão** — mas como **função pura de navegação**, não como coleção nova.

```ts
buildSessionRunQueue(exercises, blocks) →
  { occurrenceKey, exerciseDocId, seriesId, seriesIndex, blockId? }[]
```

- Sem bloco: queue = todos os series de ex0, depois ex1… (comportamento atual).
- Alternado A,B com 3 séries: A0, B0, A1, B1, A2, B2.

Estado persistido: continua sendo `exerciseExecutions` **por exercício**. Próximo passo = primeiro item da queue cuja série ainda é `pending`.

**Não persistir cursor global.** É derivável. Retomada: recalcular a queue.

O modal já tem `activeRunExerciseId` + timer global. O orquestrador só troca o exercício ativo no meio do bloco e escolhe a série certa.

Execução isolada **sem** orquestrador **não** implementa A1→B1. Alterar só a lista/miniaturas também não: o painel esgota A.

---

## 25. UX recomendada

### Como o personal agrupa

Melhor: **seleção de 2 cards + Agrupar → Exercícios alternados** (opção A), com atalho no menu `⋯` do card (opção C) “Agrupar com o próximo”.

Evitar arrastar um exercício sobre o outro (conflita com o DnD de reordenar).

“+ Criar bloco” vazio (opção D) gera formulário cedo demais.

Progressive disclosure: treino tradicional **igual ao de hoje**. Ação **Agrupar exercícios** só quando há ≥2 itens. Sem 15 campos novos no card.

Duplicar exercício que está no bloco: **cópia sai do bloco** (opção B). Evita bloco de 3 sem o personal perceber.

Remover um membro e sobrar 1: **dissolver o bloco automaticamente** e deixar o exercício solto. Confirmar se o bloco tinha nome/config que se perde.

### Desktop (wireframe)

```text
Catálogo | Treino sendo montado
         | Aquecimento (card atual)
         | ┌─ BLOCO A · Alternado · 3 voltas ─┐
         | │ 20s entre exercícios · 60s volta │
         | │ A1 Agachamento  [séries]         │
         | │ A2 Elevação     [séries]         │
         | │ [Desagrupar]                     │
         | └──────────────────────────────────┘
         | Leg press (card atual)
```

Drag: bloco inteiro; A1/A2 só internamente.

### Mobile

Sem DnD. Checkbox ou `⋯ Agrupar com…` no sheet. Bloco compacto empilhado. Mesmo save.

### Paciente (execução)

Enquanto estiver no bloco, o GIF/header mostra:

```text
Bloco A · Alternado · Volta 1 de 3
Agachamento · Série 1
em seguida: Elevação lateral
```

Após concluir A1: descanso (se >0) → abre Elevação S1 automaticamente. Não exigir que o paciente toque Próximo no meio da volta. Miniaturas podem destacar os dois membros.

### Histórico / PDF

Seção “Bloco A — Alternado · 3 voltas” com os dois exercícios. PDF usa a prescrição; Histórico pode acrescentar prescrito × realizado já existente.

---

## 26. Compatibilidade

Campo `exerciseBlocks` ausente ou `[]` → execução, PDF, Histórico, Estatísticas, DnD **idênticos aos atuais**.

Sem `segments` / RPE → série como hoje.

`getOrCreate` de execution inalterado se o orquestrador só escolhe qual doc abrir.

Lazy migration: **sim**, padrão das etapas 01–06. Sem backfill em massa.

`omitUndefinedDeep` + `null` em cargas: manter. Não gravar `undefined`. Bloco opcional simplesmente não vai no payload.

---

## 27. Performance

Blocos no doc da sessão / template: **0 queries novas**. Exercises e executions continuam 1+1 por sessão no stats loader. Não usar collectionGroup nem agregados persistidos.

---

## 28. Casos de borda

| # | Caso | Recomendação |
| --- | --- | --- |
| 1 | 2×3 séries | V1 feliz: 6 passos |
| 2 | 4 vs 3 séries | 07A: recusar no save |
| 3 | Circuito 3 exercícios | 07B, mesma queue |
| 4 | Remove elevação | dissolve bloco |
| 5 | Duplicar bloco | novos blockId + novos occurrenceKeys (como clone de template) |
| 6 | Import template | novos ids, mesma topologia |
| 7 | Recorrência | remap members por índice em cada data |
| 8 | Fecha no meio | retoma pelo primeiro pending da queue |
| 9 | Pula B1 | B1 skipped; próximo A2 (não pular o bloco inteiro) |
| 10 | Pula exercício B | skipRemaining em B; orquestrador salta passos de B |
| 11 | Personal edita depois | execution é snapshot; igual ETAPA 05 |
| 12 | PDF | cabeçalho de bloco |
| 13 | Estatísticas | segue `exerciseId` |
| 14 | Treino antigo | sem bloco |
| 15 | Mobile | agrupar sem DnD |

Permissões atuais (`blockProfessionalMutations`, `fromMetaadminEmbedded`, `professionalReadOnly`): só paciente/personal mutam. Médico/nutri read-only. Blocos seguem o mesmo gate.

---

## 29. Fases recomendadas

A hipótese 07A–D está **quase certa**, com um ajuste: a infra de bloco e o orquestrador devem nascer **junto** do Alternado, senão o 07A não executa o caso real.

```text
ETAPA 07A — occurrenceKey persistido + TrainingExerciseBlock
            + Alternado (2 exercícios, séries iguais)
            + orquestrador derivado
            + timer entre passos do bloco
            + clone biblioteca / recorrência / PDF / Histórico (seção)
            + UX Agrupar / Desagrupar (desktop + mobile)

ETAPA 07B — Supersérie (restBetween=0) + Circuito (N membros)
            (mesmo schema; só type + validações + copy)

ETAPA 07C — RPE / RIR na série + cadência (exercício, override série)
            (não mexe em ordem)

ETAPA 07D — segments[] drop-set / rest-pause / cluster
            + targetType AMRAP / isometria (quebra reps>0)
```

Não começar por drop-set: não resolve intercalado. Não começar por RPE: não muda execução.

---

## 30. Riscos

1. **Perder `draftId` no save** — maior risco; sem `occurrenceKey` o bloco não amarra os docs novos.
2. **DnD linear** — interpolar exercício no bloco sem regra.
3. **Reusar `series.restSec` para pausa entre A e B** — ambíguo; personal não entende qual campo vale.
4. **Cursor persistido** — dessincroniza se o personal editar o treino no meio.
5. **Cinco `type`s de marketing** (bi-set, tri-set…) — infla enum sem ganho.
6. **Duplicar exercício no bloco** sem regra — bloco inválido.
7. **Mobile sem agrupamento** — personal só consegue intercalado no desktop.
8. **Misturar motor publicado** (`trainingSessionExecutions`) com operacional.
9. **Estatísticas por nome** — já rejeitado na ETAPA 06; manter `exerciseId`.
10. **Timer só em memória** — aceitável; não atrasar 07A por `restEndAt`.

---

## Tabela de impacto

| Área | Alternado | Supersérie | Circuito | Drop-set | RPE/RIR | Precisa mudar? |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Draft | bloco + keys | idem | idem | não | campos série | **Sim** (07A) |
| series[] | não (só count) | não | não | `segments?` | `rpe?`/`rir?` | Drop/RPE depois |
| Firestore sessão | `exerciseBlocks` | idem | idem | não | nas séries | **Sim** (07A) |
| Biblioteca | bloco + remap | idem | idem | copiar segments | copiar campos | **Sim** (07A) |
| Clone / import / recorrência | remap ids | idem | idem | remap series ids | copiar | **Sim** (07A) |
| DnD | unidade=bloco | idem | idem | não | não | **Sim** (07A) |
| Execução | orquestrador | idem (rest 0) | N membros | intra-série | não | **Sim** (07A) |
| Timer | 2 níveis no bloco | 1 pausa/volta | idem | pausas de segmento | não | **Sim** (07A) |
| Histórico | seção de bloco | idem | idem | segmentos | mostrar RPE | 07A mínimo |
| Estatísticas | não (exerciseId) | não | não | max carga ok | não | **Não** (07A) |
| PDF | cabeçalho bloco | idem | idem | linhas extra | colunas extra | **Sim** (07A) |

---

## Tabela de técnicas

| Técnica | Escopo | Estrutura necessária | Muda ordem de execução? | Muda timer? |
| --- | --- | --- | ---: | ---: |
| Tradicional | série/exercício | atual | Não | Não |
| Pirâmide | séries | atual `series[]` | Não | Não |
| Alternado | 2+ exercícios | `TrainingExerciseBlock` type `alternating` | **Sim** | **Sim** |
| Supersérie | 2+ exercícios | mesmo bloco, `superset` | **Sim** | **Sim** |
| Bi-set / Tri-set | 2 / 3 | supersérie (sem enum extra) | **Sim** | **Sim** |
| Circuito | N exercícios | mesmo bloco, `circuit` | **Sim** | **Sim** |
| Drop-set | uma série | `segments[]` | Não entre exercícios | **Sim** (intra) |
| Rest-pause | uma série | `segments[]` | Não entre exercícios | **Sim** |
| Cluster | uma série | `segments[]` | Não entre exercícios | **Sim** |
| AMRAP | série | `targetType` / reps opcional | Não | Não |
| Isometria | série | `durationSec` / `targetType` | Não | talvez |
| RPE | série | `series.rpe?` | Não | Não |
| RIR | série | `series.rir?` | Não | Não |
| Cadência | exercício, override série | `tempo?` | Não | Não |

---

## Mapa de transformações (IDs)

| Seta | Arquivo / função | Preserva | Regenera |
| --- | --- | --- | --- |
| ExerciseDB → catálogo | API + `Exercise` | `id` ExerciseDB | — |
| Catálogo → draft | `addExerciseToSession` / `toSelectedExerciseDraft` | `exercise.id` | `draftId`, `series.id` (default 3) |
| Editar séries | `ExerciseSeriesEditor` / `addTrainingSeries` | demais ids | novo `series.id` se adicionar |
| Duplicar no builder | `duplicateSelectedExerciseDraft` | `exerciseId`, valores, `trainerNote` | `draftId`, todos `series.id` |
| DnD | `reorderSelectedExercises` | todos os ids | só a posição no array |
| Draft → sessão | `handleCreateSession` → `createSessionWithExercises` | `exerciseId`, `series.id`, valores, `trainerNote` | `sessionId`, `exerciseDocId`; **descarta draftId** |
| Recorrência | loop N× `createSessionWithExercises` | payload de exercícios | cada `sessionId` + cada `exerciseDocId` |
| Draft → biblioteca | `workoutDraftToTemplateExercises` | `exerciseId`, valores, `trainerNote` | `tpl_ex_`, `series.id` |
| Biblioteca → draft | `cloneTemplateExerciseToWorkoutDraft` | `exerciseId`, valores | `draftId`, `series.id` |
| Duplicar plano | `clonePersonalWorkoutTemplate` | `exerciseId`, valores | `tpl_ex_`, `series.id`, sem `planoId` |
| Iniciar exercício | `getOrCreate` / `createExerciseExecutionFromPrescription` | `exerciseDocId`, `exerciseId`, `seriesId` como snapshot | doc execution se não existia |
| Concluir série | `completeExecutedSeries` + `save` | prescrito | `actual*`, `status`, timestamps |
| Stats | `buildExerciseEvolutionSummaries` | agrupa `exerciseId` | — |
| PDF | `buildWorkoutPrintData` | `order` da sessão | — |

---

## Definições operacionais (Oftware)

**Tradicional:** esgotar `series[]` de um exercício; descanso = `series[i].restSec` após a série i.

**Exercícios alternados:** bloco de 2 (V1). Passo `i`: membro 0 série i, depois membro 1 série i. `restBetweenExercisesSec` após o primeiro da dupla; `restAfterRoundSec` após o segundo, antes da volta seguinte.

**Supersérie:** mesmo algoritmo; `restBetweenExercisesSec = 0`; pausa só após completar os membros da volta.

**Circuito:** N membros; uma volta = série i de cada membro em ordem; pausa principal após a volta.

**Drop-set / rest-pause / cluster:** segmentos dentro de **uma** série; não mudam o próximo exercício.

**trainerNote:** texto. Nunca substitui `type` do bloco nem `segments`.

---

## Permissões (inalteradas)

`blockProfessionalMutations = professionalReadOnly || fromMetaadminEmbedded`.  
Personal (Metapersonal) e paciente mutam. Metaadmin/Metanutri: read-only, inclusive técnicas futuras.
