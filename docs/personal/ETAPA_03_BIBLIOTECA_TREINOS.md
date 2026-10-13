# ETAPA 03 — Biblioteca de Treinos do personal

**Sistema criado:** biblioteca manual do profissional (`personal_trainers/{uid}/planos_treino`).  
**Não alterado:** sessões do paciente (`trainingSessions`), aba Novo Treino, Treinos Salvos, motor determinístico (`WorkoutPlanDraft` / `PublishedTrainingPlan`).

**Fonte de verdade:** código atual.  
**Data:** 2026-08-16.

---

## 1. Objetivo

O personal passa a ter **treinos padrão reutilizáveis**, independentes de paciente, no mesmo espírito dos `planos_cardapio` do MetaNutri.

Exemplos: “Peito + Tríceps — Hipertrofia”, “Pernas — Iniciante”, “Treino Hotel”.

Nesta etapa **não existe** import para o aluno. A biblioteca só cria, lista, edita, duplica e exclui templates.

---

## 2. Biblioteca ≠ Treinos Salvos

| Conceito | Dono | Persistência | Papel |
| --- | --- | --- | --- |
| Treinos Salvos | Paciente | `trainingSessions/{sessionId}` | Sessões operacionais daquele aluno |
| Biblioteca | Personal logado | `personal_trainers/{uid}/planos_treino/{planoId}` | Template reutilizável, sem `patientId` |
| Motor determinístico | Plano gerado | `WorkoutPlanDraft` / `PublishedTrainingPlan` | **Não usar** para biblioteca manual |

Não transformar Treinos Salvos em biblioteca.  
Não gravar `patientId` / `pacienteId` / `userId` do paciente no template.

O template é um **snapshot**. Editar “Peito + Tríceps” amanhã **não** altera sessões já salvas. Na ETAPA 04 o import também será cópia (novos ids), não referência viva (`templateId` na sessão).

---

## 3. Firestore

Caminho real:

```text
personal_trainers/{auth.currentUser.uid}/planos_treino/{planoId}
```

Constante: `COL_PERSONAL_TRAINERS` (`features/metaPersonal/metaPersonal.constants.ts`).  
Subcollection: `planos_treino`.

`planoId` é ID Firestore próprio. Não reutilizar id de sessão, de paciente nem `exerciseId` da ExerciseDB.

Listagem: `getDocs` + ordenação **em memória** por `atualizadoEm` desc. **Não exige índice composto.**

Update preserva `criadoEm` (merge sem reenviar o campo) e atualiza `atualizadoEm`.

`descricao` vazia é gravada como `''` para o merge limpar o valor antigo.

`undefined` não vai ao Firestore (`omitUndefinedDeep` local no service, mesmo padrão do Nutri). `loadKg` usa `null`.

Regras: o catch-all autenticado de `firestore.rules` já cobre a subcollection. Esta etapa **não alarga** regras. A ACL prática é a UI (aba só no Metapersonal) + `uid` injetado no service.

---

## 4. Tipos

Arquivo: `lib/personal/planosTreino.ts`

```ts
export type PersonalWorkoutTemplateExercise = {
  id: string                 // tpl_ex_… identidade interna do item
  source: 'exercisedb'
  exerciseId: string         // ID ExerciseDB (ex.: "0025")
  name: string
  bodyPart: string
  target: string
  equipment: string
  gifUrl?: string            // /api/exercisedb/image?exerciseId=…&resolution=360
  prescription: TrainingExercisePrescription
  order: number
}

export type PersonalWorkoutTemplate = {
  id?: string
  nome: string
  descricao?: string
  exercicios: PersonalWorkoutTemplateExercise[]
  criadoEm?: Date
  atualizadoEm?: Date
}
```

O mesmo `exerciseId` pode aparecer duas vezes: cada entrada tem `id` (`tpl_ex_…`) e séries próprias.

Prescrição = ETAPA 01, sem modelo paralelo:

```ts
prescription: {
  series: [
    { id: string, order: number, reps: number, loadKg: number | null, restSec: number }
  ]
}
```

`loadKg` é opcional (`null` permitido). O personal pode salvar metodologia sem carga.

---

## 5. CRUD

`services/personalPlanosTreinoService.ts`

```ts
PersonalPlanosTreinoService.listar(uid)
PersonalPlanosTreinoService.salvar(uid, { id?, nome, descricao?, exercicios })
PersonalPlanosTreinoService.excluir(uid, planoId)
```

O service **recebe `uid`**. Nunca aceita `patientId`. Nunca lê `auth` internamente.

`salvar` valida com `validatePersonalWorkoutTemplate` (nome, ≥1 exercício, `validateTrainingPrescription` em cada um).  
Editar reusa o mesmo `id`. Duplicar chama `clonePersonalWorkoutTemplate` (nome ` (cópia)`, novos `tpl_ex_` e novos ids de série) e `salvar` sem id.

---

## 6. UI

Aba **+ Criar**, só no profissional Metapersonal:

```text
Novo Treino | Treinos Salvos | Biblioteca
```

Mobile curto: `Novo | Salvos | Biblioteca`.

Estado: `criarTab: 'novo' | 'salvos' | 'biblioteca'`.

Lista (`PersonalWorkoutTemplatesPanel` + `PersonalWorkoutTemplateCard`):

- título, descrição resumida, `N exercícios · M séries` (`getWorkoutDraftSummary`);
- até 3 nomes de exercícios (sem GIF na lista);
- data de atualização;
- Editar / Duplicar / Excluir;
- busca client-side pelo nome.

Excluir confirma:

> Excluir este plano da sua biblioteca?  
> Isso não altera treinos já salvos em pacientes.

---

## 7. Builder

`PersonalWorkoutTemplateEditor` reutiliza o split da ETAPA 02:

- `ExerciseCatalogPanel`
- `PersonalCreateWorkoutDesktop` (`responsive` para empilhar no mobile)
- `WorkoutBuilderPanel` + `WorkoutExerciseBuilderCard` + `ExerciseSeriesEditor`

Draft **próprio**: `nome`, `descricao`, `exercicios`.  
**Não** alimenta `selectedExercises` do paciente. Conversão só na borda (`templateExerciseToDraft` / `draftToTemplateExercise`): `draftId` = `tpl_ex_…`, `id` = ExerciseDB.

Nome obrigatório. Descrição = textarea simples. Contador = helper da ETAPA 02.

---

## 8. ExerciseDB e GIF

Mesmo catálogo (`search` / `bodyPart` / `target` / `equipment`).

GIF **nunca** RapidAPI. Sempre:

```text
/api/exercisedb/image?exerciseId={exerciseId}&resolution=360
```

`exerciseId` é a fonte robusta. `gifUrl` no documento é snapshot auxiliar. A listagem não carrega GIFs.

O `+` do catálogo continua bloqueando o mesmo ExerciseDB id. Duplicar explícito no card é permitido (novo `tpl_ex_`, novas séries).

Default ao adicionar: `createDefaultTrainingSeries()` → 3×10, `loadKg: null`, 60s.

---

## 9. Séries, duplicação e drag

- Editar série a série: `ExerciseSeriesEditor` (reps, carga, descanso, add/remove).
- Duplicar exercício: `insertDuplicatedTemplateExercise` → `cloneSeriesWithNewIds` / `createTrainingSeriesId()`.
- Duplicar plano: `clonePersonalWorkoutTemplate`.
- Drag: `@dnd-kit` da ETAPA 02; no save, `order = index`.
- Remover exercício só do draft do template.

---

## 10. Permissões

A aba só renderiza se:

```ts
fromMetapersonal && !fromMetaadminEmbedded && !professionalReadOnly
```

(`fromMetapersonal` = `from=metapersonal` **ou** `fromMetapersonalEmbedded`.)

Não aparece em:

- `/meta/personal` do paciente;
- Metaadmin (médico);
- Metanutri (`fromMetaadminEmbedded`);
- embeds read-only.

Dono da biblioteca: `user.uid` (auth), **nunca** `paciente.userId`.

---

## 11. Mobile

Mesma tela. Lista + editor em stack vertical (`responsive` no split). Sem segundo produto.

---

## 12. Testes

Automáticos: `lib/personal/planosTreino.spec.ts` (criar item, duplicar exercício/plano, reordenar, clone profundo, validar nome/séries).

Manuais: criar → adicionar ExerciseDB → editar séries → salvar → reload → editar → drag → duplicar exercício → duplicar plano → excluir cópia → confirmar que paciente/médico/nutri não veem a aba.

---

## 13. Limitações (fora desta etapa)

- Puxar plano da biblioteca para o paciente
- Salvar treino do paciente como modelo
- `templateId` vivo na sessão
- Biblioteca semanal, A/B automático, calendário, recorrência
- Execução, RPE, RIR, drop-set, supersérie, vídeos próprios
- `WorkoutPlanDraft` / `PublishedTrainingPlan`

---

## 14. Preparação para a ETAPA 04

O template já tem estrutura clonável:

1. Paciente → Novo Treino → **Puxar da Biblioteca** (ainda não existe)
2. Copiar `exercicios` para `selectedExercises` com **novos** `draftId` e ids de série
3. Personal individualiza (carga, reps)
4. Salvar em `trainingSessions`

Import = snapshot. Mudar o plano depois não atualiza sessões já criadas.
