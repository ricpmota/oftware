# ETAPA 05 — Execução série a série + registro do realizado

**Sistema alterado:** execução operacional do paciente em `/meta/personal` (`PersonalPageContent` → `trainingSessions` → `exerciseExecutions`) e orientação por exercício (`trainerNote`) na montagem, biblioteca e sessão.  
**Não alterado:** `prescription.series[]` (estrutura), motor determinístico (`WorkoutPlanDraft` / `PublishedTrainingPlan` / `trainingSessionExecutions`), aba Histórico, gráficos, RPE/RIR, drop-set/supersérie, `patientNotes` / `trainerNotes` da sessão.

**Fonte de verdade:** código atual.  
**Data:** 2026-08-16.

**Fonte de verdade:** código atual.  
**Data:** 2026-08-16.

---

## 1. Problema anterior

A prescrição já era por série (ETAPA 01):

```text
S1  15 reps  20 kg  60 s
S2  12 reps  25 kg  60 s
S3  10 reps  30 kg  75 s
```

A execução do paciente ainda era por exercício:

```text
abre treino → entra no exercício → Feito → timer da última série → próximo exercício
```

O timer usava `getEffectiveRestSec()` (descanso da **última** série). Não havia prescrito vs realizado por série. Recarregar a página não tinha o que retomar além de `exercise.status`.

---

## 2. Dois domínios (não misturar)

| Domínio | Coleção | Uso |
| --- | --- | --- |
| Operacional (esta etapa) | `trainingSessions/{sessionId}/exerciseExecutions/{exerciseDocId}` | Paciente executa o treino do Criar / Hoje |
| Motor publicado | `trainingSessionExecutions` | `PublishedTrainingPlan` / `TrainingSessionExecution` |

Conceitos podem se parecer (série feita, skipped). Os schemas **não** foram unidos.

---

## 3. Prescrito ≠ realizado

`trainingSessions/{sessionId}/exercises/{exerciseDocId}.prescription.series[]` continua sendo só a prescrição.

Durante a execução **nunca** ocorre:

```ts
series[0].reps = actualReps
series[0].loadKg = actualLoadKg
```

O realizado vive no snapshot de execução.

---

## 3.1 Orientação do personal (`trainerNote`)

Campo **opcional** no exercício prescrito — não na série, não na sessão, não no realizado.

Não reutiliza:

| Campo | Onde | Papel |
| --- | --- | --- |
| `patientNotes` | `TrainingSession` | observação do paciente sobre o treino |
| `trainerNotes` | `TrainingSession` | nota do personal na sessão inteira |
| `trainerNote` | exercício | instrução prescrita para **aquele** exercício |

```ts
TrainingSessionExercise {
  trainerNote?: string
  prescription: { series: [...] }
}
```

O personal escreve no builder (desktop e mobile, a mesma propriedade de `selectedExercises`). O paciente **vê** na execução; **não edita**.

Fluxo (sempre snapshot, nunca vínculo vivo):

```text
Biblioteca.trainerNote
  → clone → Novo Treino.trainerNote  (personal pode individualizar)
  → trainingSessions/.../exercises.trainerNote
  → exerciseExecutions.prescribedTrainerNote  (congelado ao iniciar)
```

- Puxar da Biblioteca copia a nota.
- Editar a nota do paciente **não** muda o template.
- **Salvar como modelo** inclui a nota. `Salvar cargas atuais = OFF` zera só `loadKg`.
- Duplicar exercício copia a nota.
- Texto vazio / ausente: não grava campo e não mostra card vazio.
- Treinos e templates antigos funcionam sem migration.
- Na execução, o card **Orientação do seu personal** fica visível em qualquer série. Instruções ExerciseDB continuam em **Como executar o exercício**.
- Execuções já existentes sem `prescribedTrainerNote` fazem fallback para `exercise.trainerNote` ao exibir.

---

## 4. Modelo de execução

Arquivo: `lib/personal/trainingExecutionSeries.ts`  
Reexportado em `types/trainingSession.ts`.

```ts
TrainingExecutedSeries {
  seriesId            // id da série na prescrição (snapshot)
  order
  prescribedReps
  prescribedLoadKg    // number | null
  prescribedRestSec
  actualReps          // number | null até concluir
  actualLoadKg        // number | null
  status              // pending | done | skipped
  completedAt?
}

TrainingExerciseExecution {
  exerciseDocId       // ocorrência na sessão (chave)
  exerciseId          // ExerciseDB
  prescribedTrainerNote?  // snapshot da orientação ao iniciar
  series: TrainingExecutedSeries[]
  status              // pending | in_progress | done | skipped
  startedAt?
  completedAt?
  updatedAt?
}
```

O mesmo `exerciseId` pode aparecer duas vezes na sessão. A chave da execução é **`exerciseDocId`**, nunca só o ExerciseDB.

---

## 5. Firestore

```text
trainingSessions/{sessionId}/exerciseExecutions/{exerciseDocId}
```

Documento (exemplo):

```json
{
  "exerciseDocId": "abc",
  "exerciseId": "0025",
  "status": "in_progress",
  "startedAt": "...",
  "completedAt": null,
  "updatedAt": "<serverTimestamp>",
  "series": [
    {
      "seriesId": "set_a",
      "order": 1,
      "prescribedReps": 15,
      "prescribedLoadKg": 20,
      "prescribedRestSec": 60,
      "actualReps": 15,
      "actualLoadKg": 20,
      "status": "done",
      "completedAt": "..."
    }
  ]
}
```

- Escrita: array completo (`setDoc` / transação). **Não** usar `arrayUnion`.
- `loadKg` / `actualLoadKg` usam `null`, nunca `undefined`.
- `getOrCreate` é idempotente: se o doc já tem `series[]`, não recria nem apaga progresso.
- Ao deletar a sessão, a subcollection `exerciseExecutions` também é apagada.

Regras Firestore: a subcollection cai no catch-all autenticado, igual a `exercises`. Não houve alargamento de rules nesta etapa.

---

## 6. Como a execução é criada (snapshot)

Na primeira vez que o paciente **abre** o exercício no modal de execução:

1. `TrainingExerciseExecutionService.getOrCreate`
2. Se não existe: `createExerciseExecutionFromPrescription` copia `normalizeTrainingExercisePrescription(prescription).series` e `trainerNote` → `prescribedTrainerNote`
3. Todas as séries nascem `pending`, `actual* = null`
4. O snapshot de prescrito (séries + orientação) **congela** aquele momento

Se o personal editar o treino depois, execuções já criadas **não** são reescritas (sem cascade).

Profissional (personal / médico / nutri): não chama `getOrCreate`. Só lê o existente ou monta um snapshot local, sem persistir.

---

## 7. Série ativa

`getNextPendingSeries(execution)` = primeira série `pending` na ordem.

Retomada:

```text
S1 ✓  S2 ✓  S3 pendente  S4 pendente
→ Série 3 de 4
```

A UI pré-preenche reps/carga realizadas com o prescrito, mas **só persiste ao clicar Concluir série**.

---

## 8. Timer

Depois de persistir a série com sucesso:

- se ainda há série pendente e `prescribedRestSec > 0` → descanso com **exatamente** o `prescribedRestSec` da série recém-concluída
- última série → **não** inicia descanso; o exercício é marcado `done` e o paciente segue para o próximo

`getEffectiveRestSec()` (última série da prescrição) permanece só em listagens / descanso fora deste fluxo.

Pausar e **Pular descanso** foram preservados. Pular descanso entre séries apenas fecha o timer (a próxima série já está na execução). O countdown **não** é persistido: reload perde o timer em andamento; séries já salvas permanecem.

---

## 9. Skip

| Ação | Efeito |
| --- | --- |
| Pular série | `status = skipped`, `actual* = null`, avança sem descanso |
| Pulei (exercício) | todas as séries **pending** → `skipped`; séries já `done` permanecem |
| Todas skipped | exercício `skipped` |
| Pelo menos uma `done` e o resto terminal | exercício `done` |

Série já registrada (`done` / `skipped`) não pode ser reeditada nesta etapa.

---

## 10. Status do exercício e da sessão

Compatibilidade preservada em `TrainingSessionExercise`:

```ts
status?: 'done' | 'skipped'
completedAt?: ...
```

Quando a execução fica `done` ou `skipped`, o código ainda chama `trainingSessionService.markExercise` como antes.

**Sessão:** não foi criada regra nova. `TrainingSession.status` continua sendo marcado pelo fluxo já existente (não auto-done só porque todas as séries acabaram).

Marcar Feito/Pulei nos cards da aba Hoje (fora do modal) **não** gera log série a série. O detalhe por série nasce no modal de execução.

---

## 11. Mobile

Foco do modal fullscreen (`z-[230]`):

- GIF, carrossel, Detalhes, portal e z-index preservados
- Série atual, prescrito vs realizado, stepper de reps, carga com vírgula PT-BR
- Botão grande **Concluir série**; **Pular série** discreto
- Touch targets ≥ 44px nos controles da série

Desktop funciona sem layout especial.

---

## 12. Compatibilidade

- Treino legado `{sets, reps, restSec}`: a execução consome `normalizeTrainingExercisePrescription()` — sem reimplementar legado.
- Carga `null` (flexão, prancha, mobilidade): campo vazio / `—`; o paciente pode informar carga realizada se quiser.
- Exercícios por tempo: fora de escopo; reps continuam o modelo.
- GIF: `resolveExerciseDbId` / `resolveExerciseGifUrl` / `/api/exercisedb/image` inalterados.
- Profissional: `startWorkout` continua bloqueado por `blockProfessionalMutations`; concluir/pular série também exige `!isPersonalTrainerMode && !blockProfessionalMutations`.

---

## 13. Helpers

`lib/personal/trainingExecutionSeries.ts`:

| Função | Papel |
| --- | --- |
| `createExerciseExecutionFromPrescription` | snapshot pending |
| `getNextPendingSeries` | série ativa |
| `completeExecutedSeries` | realizado + `done` (clone; não muta prescrição) |
| `skipExecutedSeries` | pular uma série |
| `skipRemainingExerciseSeries` | pular o resto do exercício |
| `getExerciseExecutionStatus` | pending / in_progress / done / skipped |
| `getMarkExerciseStatusFromExecution` | ponte para `markExercise` |
| `getSeriesProgress` | contagens |
| `isExerciseExecutionDone` | atalho |

Serviço: `services/trainingExerciseExecutionService.ts`  
UI: `components/personal/run/WorkoutRunSeriesPanel.tsx`, `ExerciseTrainerNoteCard.tsx`, `ExerciseTrainerNoteField.tsx`

---

## 14. Testes

`lib/personal/trainingExecutionSeries.spec.ts`:

- criação 3 pending a partir da prescrição
- completar S1 (realizado + clone da prescrição)
- próxima pendente = S2
- pular série
- status done / done+skipped / all skipped
- pular exercício
- legado `sets/reps`
- não reescrever série já concluída
- snapshot de `trainerNote` / vazio não quebra

`lib/personal/workoutDraft.spec.ts` e `lib/personal/planosTreino.spec.ts`: clone/duplicar/import/salvar modelo preservam `trainerNote`; alterar o draft não muda o template; `preserveLoads: false` não remove a orientação.

---

## 15. Limitações (proposital)

- Sem histórico longitudinal, gráfico, PR, progressão automática, RPE/RIR
- Sem edição da prescrição durante a execução
- Sem persistência do countdown
- Sem edição de série já concluída
- Sem concorrência multi-device sofisticada (`updatedAt` existe)
- Feito nos cards da aba Hoje não preenche `exerciseExecutions`
- Exercícios por tempo / drop-set / supersérie / circuito: fora de escopo

---

## 16. Preparação para a ETAPA 06

Com `exerciseDocId` + `exerciseId` + `series[].prescribedLoadKg` + `series[].actualLoadKg` dá para perguntar depois:

- maior carga realizada no Supino
- carga da última sessão
- se o paciente aumentou carga

Esta etapa **não** constrói esses relatórios nem altera a aba Histórico.

---

## 17. Impressão do treino (ETAPA 05B)

A impressão da **prescrição** (PDF / diálogo de impressão) está documentada em [`ETAPA_05B_IMPRESSAO_TREINO.md`](./ETAPA_05B_IMPRESSAO_TREINO.md). Não mistura com persistência de execução (`actualReps` / `actualLoadKg`).

