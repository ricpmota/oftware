# ETAPA 04 — Puxar da Biblioteca e Salvar como modelo

**Sistema:** clone entre a biblioteca do personal (`planos_treino`) e o rascunho do Novo Treino (`selectedExercises` → `trainingSessions`).  
**Não alterado:** schema de `trainingSessions`, CRUD da ETAPA 03, motor determinístico (`WorkoutPlanDraft` / `PublishedTrainingPlan`), Treinos Salvos como conceito.

**Fonte de verdade:** código atual.  
**Data:** 2026-08-16.

---

## 1. Objetivo

Dois fluxos, ambos **snapshot** (nunca referência viva):

```text
Biblioteca → clone → selectedExercises → personal individualiza → trainingSessions
selectedExercises → snapshot → novo template em planos_treino
```

Não existe `templateId` na sessão. Editar o modelo depois **não** muda treinos já salvos. Editar o treino do aluno **não** muda o modelo.

---

## 2. Fluxo A — Puxar da Biblioteca

Em **Novo Treino** (e ao editar um treino salvo, que volta para o mesmo rascunho):

1. **Puxar da Biblioteca**
2. Lista `PersonalPlanosTreinoService.listar(uid)` + busca pelo nome
3. Preview: nome, descrição, `N exercícios · M séries`, até 3 nomes (sem GIF)
4. **Usar este treino**
   - rascunho vazio → importa direto
   - rascunho com exercícios → Substituir / Adicionar / Cancelar
5. Clone atômico para `selectedExercises`
6. `isWorkoutDraftDirty = true`
7. Modal fecha; usuário permanece em Novo Treino

Substituir troca só os exercícios. Adicionar concatena (atuais primeiro, template depois). O mesmo `exerciseId` ExerciseDB **pode** aparecer duas vezes (ação explícita; cada um com `draftId` novo).

---

## 3. Fluxo B — Salvar como modelo

1. **Salvar como modelo** (habilitado se há ≥1 exercício)
2. Modal: nome (pré-preenchido com `newSessionTitle`), descrição opcional, checkbox **Salvar as cargas atuais** (default **desmarcado**)
3. Converte o rascunho com novos `tpl_ex_` e novos ids de série
4. `PersonalPlanosTreinoService.salvar(uid, { nome, descricao, exercicios })` **sem id** (sempre documento novo)
5. Feedback: “Modelo salvo na Biblioteca.”
6. **Não** salva `trainingSessions`, **não** altera `selectedExercises`, data, recorrência nem dirty

---

## 4. Clone profundo e IDs

Helpers em `lib/personal/planosTreino.ts`:

| Função | Papel |
| --- | --- |
| `importWorkoutTemplateToDraft` | valida o template inteiro; se ok, clona tudo |
| `cloneTemplateExerciseToWorkoutDraft` | `draft_ex_…` + `createTrainingSeriesId()` |
| `mergeClonedDraftsIntoWorkout` | `replace` ou `append` |
| `workoutDraftToTemplateExercises` | `tpl_ex_…` + novos series ids; `preserveLoads` |
| `stripLoadsFromSeries` | `loadKg = null` |
| `suggestedSessionTitleFromTemplate` | preenche título só se estiver vazio |

- `exerciseId` ExerciseDB é preservado.
- GIF reconstruído: `/api/exercisedb/image?exerciseId=…&resolution=360`.
- `tpl_ex_…` **nunca** vira `draftId`. `draftId` **nunca** vira id do template.

---

## 5. Título, agenda e dirty

- Título vazio → copia `template.nome`. Título já preenchido → preserva.
- Import **não** mexe em data, Único/Recorrente, frequência, semanas, dias da semana.
- Import marca dirty. Salvar como modelo **não** limpa dirty.

---

## 6. UI

Botões só se `canUseWorkoutLibrary` (mesmo gate da ETAPA 03):

```ts
fromMetapersonal && !fromMetaadminEmbedded && !professionalReadOnly
```

Paciente, Metaadmin e Metanutri não veem.

- Desktop: toolbar no builder, ao lado do resumo / acima do meta do treino.
- Mobile: faixa acima do catálogo **e** no sheet do FAB (FAB continua igual).

Componentes:

- `ImportWorkoutTemplateModal.tsx`
- `SaveWorkoutAsTemplateModal.tsx`
- `WorkoutLibraryDraftActions.tsx`
- `PersonalWorkoutTemplateSelectCard.tsx`

---

## 7. z-index

| Camada | z |
| --- | --- |
| Shell Personal fullscreen | 200 |
| FAB / sheet do treino | 220 |
| Modais biblioteca (esta etapa) | **225** |
| Execução do treino | 230 |

Portal em `document.body`. Header fixo + lista com scroll; mobile `max-h-[min(88dvh,720px)]`.

---

## 8. Firestore

Sem mudança de schema.

- Biblioteca: `personal_trainers/{auth.currentUser.uid}/planos_treino/{planoId}`
- Paciente: `trainingSessions/{sessionId}/exercises/{exerciseDocId}` + `prescription.series[]`

UID = `user.uid` do personal. Nunca `paciente.userId`. Regras: não alargadas.

---

## 9. Testes

`lib/personal/planosTreino.spec.ts`: import (draftId, exerciseId, series ids, loads, clone profundo), merge replace/append, draft→template com e sem cargas, duplicados ExerciseDB, título.

---

## 10. Limitações

Sem vínculo vivo, histórico de uso, favoritos, marketplace, RPE/RIR, drop-set, supersérie, biblioteca semanal, A/B, `WorkoutPlanDraft`.
