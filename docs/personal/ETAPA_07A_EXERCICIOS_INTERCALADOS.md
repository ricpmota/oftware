# ETAPA 07A — Exercícios intercalados entre séries

**Sistema alterado:** fluxo operacional do Personal (`PersonalPageContent` → `trainingSessions` / `planos_treino` / `exerciseExecutions`).  
**Não alterado:** motor determinístico (`WorkoutPlanDraft` / `PublishedTrainingPlan` / `trainingSessionExecutions`), supersérie formal, circuito, drop-set, rest-pause, RPE/RIR.

**Fonte de verdade:** código atual.  
**Data:** 2026-08-18.

Documentos lidos: ETAPA 01–06, ETAPA 05B, `AUDITORIA_ETAPA_07_TECNICAS_BLOCOS.md`, `ESTRUTURA_MONTAR_TREINO.md`.

---

## 1. UX

O personal **não** cria bloco, grupo, round nem A1/A2.

Entre as séries do exercício principal aparece:

```text
────────────── (+) ──────────────
```

* Primeiro `+` (sem intercalado anterior no fluxo) → catálogo em modo **Selecionar exercício para intercalar**.
* Próximos `+` → menu **Repetir [exercício]** / **Selecionar outro exercício** / **Cancelar**.
* O intercalado entra com **uma série** (10 reps, `loadKg` null, `restSec` 0). Não usa o default 3×10.
* Card compacto: GIF pequeno + nome + Série N + reps / carga / descanso + remover.
* Há `+` **depois de cada série**, inclusive a última.
* Desktop e mobile (sheet) usam o mesmo editor.

Modelo mental: “quero colocar outro exercício **aqui**, entre essas séries.”

---

## 2. Schema

`series[]` continua sendo **somente** as séries do exercício principal.

Intercalações vivem ao lado, em `prescription.intercalations[]`:

```ts
type TrainingIntercalatedOccurrence = {
  id: string              // int_…
  afterSeriesId: string   // series.id do principal (não índice)
  slotOrder: number       // ordem se houver vários após a mesma série
  exerciseId: string      // ExerciseDB
  name: string
  bodyPart: string
  target: string
  equipment: string
  gifUrl?: string
  trainerNote?: string
  series: TrainingExerciseSeries  // sempre 1 série nesta etapa
}
```

Campo ausente = treino legado, execução tradicional. Sem migration em massa.

Não é “supersérie” no banco nem na UI principal. Nome: **exercício intercalado**.

---

## 3. Relação `afterSeriesId`

A âncora é o `series.id` da série principal **depois da qual** a ocorrência entra na fila.

Não usar `afterSeriesIndex`: adicionar/remover séries reindexa `order`, mas os IDs permanecem.

Vários intercalados após a mesma série: `slotOrder` 0, 1, 2…

Remover série principal com intercalado vinculado: confirmação “remover ambos”. `sanitizeIntercalations` também descarta órfãos na normalização.

---

## 4. IDs

| ID | Prefixo | Papel |
| --- | --- | --- |
| ExerciseDB | (catálogo) | Identidade longitudinal / Estatísticas |
| `draftId` | `draft_ex_` | Ocorrência do exercício **principal** no rascunho (não vai para a sessão) |
| `intercalationId` | `int_` | Ocorrência intercalada (persiste na prescrição) |
| `series.id` | `set_` | Série específica (principal ou da ocorrência intercalada) |
| `exerciseDocId` | auto Firestore | Doc do exercício principal; execução intercalada usa `int_` como doc id em `exerciseExecutions` |

Não misturar.

---

## 5. Draft

`SelectedExerciseDraft.prescription.intercalations` existe no rascunho sujo.

Qualquer add / repetir / editar / remover marca `isWorkoutDraftDirty` (paciente) ou dirty da biblioteca.

Drag continua sendo só entre **exercícios principais**. Não há drag de séries.

---

## 6. Firestore

`serializeTrainingPrescription` grava `intercalations` junto da prescrição do exercício da sessão.

Não há query nova. `normalizeTrainingExercisePrescription` relê o campo.

Execução intercalada: `trainingSessions/{sessionId}/exerciseExecutions/{intercalationId}`  
com `exerciseId` = ExerciseDB do movimento intercalado. Prescrito × realizado separados (ETAPA 05).

O exercício host só vai para `done`/`skipped` quando **toda** a fila derivada (séries principais + intercalações) estiver terminal.

---

## 7. Biblioteca

Salvar como modelo preserva intercalações (`serialize` no item do template).

Puxar template → draft: `clonePrescriptionWithNewIds` gera novos `draftId`, `int_`, `set_` e **remapeia** `afterSeriesId`.

Draft → template idem, com mapa de IDs.

---

## 8. Clone

Função: `clonePrescriptionWithNewIds` + `cloneIntercalationsWithIdMap`.

1. Clonar `series[]` com novos `set_`.
2. `seriesIdMapFromClone(old → new)`.
3. Clonar cada intercalação: novo `int_`, novo `series.id`, `afterSeriesId = map.get(old)`.
4. Ocorrência cujo `afterSeriesId` não existe no mapa é descartada.

Duplicar exercício principal **copia** a sequência intercalada com IDs novos.

---

## 9. Recorrência

Cada data gerada recebe `clonePrescriptionWithNewIds` **independente**. Não há referência viva entre sessões Seg/Qua/Sex.

---

## 10. Execução

A sequência **não é persistida**. É derivada:

```text
para cada série principal:
  emitir série principal
  emitir intercalations afterSeriesId === essa série (slotOrder)
```

Exemplo: A1 B1 A2 B2 A3 B3.

O paciente vê GIF + nome do **passo atual**. Intercalado: cor teal `#2F8FA3`, selo discreto `⇄ Intercalado`. Principal: verde `#4CCB7A`.

---

## 11. Retomada

`getHostQueuePendingStep` devolve o primeiro passo `pending` da fila.

Se A1 e B1 estão `done`, o próximo é A2. Não reinicia o exercício host.

---

## 12. Timer

`restSec` = descanso **depois daquela ocorrência** (igual à ETAPA 01/05).

Timer só inicia se `restSec > 0` **e** existe próximo passo na fila.

Não se aplica o descanso do Supino automaticamente se o próximo item é intercalado: cada passo usa o próprio `restSec`.

**V1 — descanso ao adicionar intercalado:** default `restSec = 0` no intercalado. **Não** zera automaticamente o descanso da série principal (seria agressivo demais). O personal ajusta, por exemplo:

```text
Supino S1 restSec = 0
Elevação S1 restSec = 60
```

---

## 13. Histórico

Com intercalações, a lista mostra a **sequência prescrita** (GIF/nome + Série N), sem reagrupar por exercício.

---

## 14. Estatísticas

A execução intercalada grava `exerciseId` do movimento. `buildExerciseEvolutionSummaries` agrupa por esse id. Nome vem da intercalação (`intercalations[].name`) quando o doc id é `int_`.

O mesmo ExerciseDB pode aparecer como principal e como intercalado no mesmo treino; as cargas entram no mesmo gráfico.

---

## 15. PDF

Sem GIF (ETAPA 05B). Linhas intercaladas aparecem **entre** as séries do principal, com `⇄ Intercalado`, nome e Série N · reps · carga · descanso.

---

## 16. Desktop

Slot `──── + ────` com alvo de clique no círculo. Menu de repetir sobre o slot.

Catálogo ao lado: título **Selecionar exercício para intercalar** + Cancelar. Não bloqueia ExerciseDB já usado como principal.

---

## 17. Mobile

Os mesmos `+` no sheet do treino. Ao escolher “selecionar”, o sheet fecha para o catálogo (modo intercalado). Não é desktop-only.

A biblioteca (`PersonalWorkoutTemplateEditor`) usa o mesmo builder.

---

## 18. Testes

Arquivos: `trainingIntercalation.spec.ts`, mais casos em `trainingExerciseSeries`, `workoutDraft`, `planosTreino`, `workoutPrint`, `trainingStats`, `trainingExecutionSeries`.

Cobertura: inserir after S1, repetir (cópia independente), outro exercício, remover ocorrência, clone remap, duplicar principal, legado, carga null, sequência A/B, sequência livre, retomada A2, timer `restSec` 0 vs 60, PDF, estatísticas por `exerciseId`.

---

## 19. Limitações

* Não há UI de `trainerNote` no card compacto intercalado (a propriedade existe e é clonada no repetir).
* Não há drag de séries; a relação já é por `series.id`.
* Não implementa supersérie / circuito / drop-set / rest-pause.
* Não valida `bodyPart`/`target` (perna ↔ ombro é válido).
* Não persiste a fila derivada.
* Um intercalado = uma série por ocorrência (repetir cria nova ocorrência).
* Cor de destaque única para **qualquer** intercalado (`#2F8FA3`); GIF + nome diferenciam os movimentos.
