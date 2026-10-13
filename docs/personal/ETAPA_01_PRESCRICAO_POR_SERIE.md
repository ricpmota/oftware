# ETAPA 01 — Prescrição individual por série

**Sistema alterado:** operacional (`PersonalPageContent` → `trainingSessions` → `exercises`).  
**Não alterado:** motor determinístico (`WorkoutPlanDraft`, `ReviewedWorkoutPlanDraft`, `PublishedTrainingPlan`), biblioteca de treinos, “Puxar de um Plano”, técnicas avançadas, redesign desktop.

**Fonte de verdade:** código atual.  
**Data:** 2026-08-16.

---

## Antes

Cada exercício da sessão tinha uma prescrição plana. Todas as séries eram implicitamente iguais:

```ts
prescription: {
  sets: 3,
  reps: 10,
  restSec: 60,
}
```

Não havia carga (`loadKg`) nem identidade por série.

---

## Depois

A unidade da prescrição passou a ser a série:

```ts
prescription: {
  series: [
    { id: 'set_…', order: 1, reps: 15, loadKg: 20, restSec: 60 },
    { id: 'set_…', order: 2, reps: 12, loadKg: 25, restSec: 60 },
    { id: 'set_…', order: 3, reps: 10, loadKg: 30, restSec: 75 },
  ]
}
```

Campos de leitura legado (`sets`, `reps`, `restSec`) ainda existem no tipo apenas para documentos antigos. O código novo **sempre escreve** `series[]` e **nunca** os campos legado.

Não existe botão “Pirâmide”. Pirâmide crescente/decrescente é só séries com valores diferentes.

---

## Tipo criado

Arquivo: `lib/personal/trainingExerciseSeries.ts`  
Reexportado em `types/trainingSession.ts`.

```ts
export type TrainingExerciseSeries = {
  id: string
  order: number
  reps: number
  loadKg: number | null
  restSec: number
}

export type TrainingExercisePrescription = {
  series: TrainingExerciseSeries[]
  sets?: number    // legado, só leitura
  reps?: number
  restSec?: number
}
```

Campos futuros (RPE, RIR, duração, nota) **não** foram adicionados nesta etapa.

`loadKg` usa `null` (nunca `undefined`) para o Firestore.

---

## Helpers criados

Módulo: `lib/personal/trainingExerciseSeries.ts`

| Função | Papel |
| --- | --- |
| `createTrainingSeriesId()` | `set_{timestamp36}_{random}` |
| `createDefaultTrainingSeries()` | 3 séries × 10 reps × 60s, `loadKg: null` |
| `createUniformTrainingSeries()` | N séries iguais (legado → novo) |
| `normalizeTrainingExercisePrescription()` | Único ponto de compatibilidade |
| `normalizeSeriesOrder()` | `order = index + 1` |
| `addTrainingSeries()` | Copia a última série |
| `removeTrainingSeries()` | Mínimo 1 série; reordena |
| `updateTrainingSeries()` | Patch de `reps` / `loadKg` / `restSec` |
| `formatTrainingSeriesSummary()` | Resumo para cards (Hoje, calendário, etc.) |
| `getEffectiveRestSec()` | Descanso da **última** série (execução atual) |
| `serializeTrainingPrescription()` | Payload Firestore: só `series[]` |
| `validateTrainingPrescription()` | `series.length >= 1`, reps > 0, rest ≥ 0, carga ≥ 0 ou null |
| `parseLoadKgInput()` / `formatLoadKgInput()` | Vírgula decimal (`12,5` → 12.5) |

Testes: `lib/personal/trainingExerciseSeries.spec.ts`.

---

## Componentes alterados

### Novo

`components/personal/ExerciseSeriesEditor.tsx`

Recebe `series`, `onChange`, `readOnly`. Edita reps, carga (opcional, passo 1 kg, digitação com vírgula) e descanso. Botão “+ Adicionar série”. Remover só aparece se houver mais de uma série.

### Operacional (fluxo vivo)

- `app/meta/personal/page.tsx` (`PersonalPageContent`)
  - estado `selectedExercises` usa só `prescription.series`
  - ao adicionar exercício: `createDefaultTrainingSeries()`
  - ao editar treino salvo: `normalizeTrainingExercisePrescription`
  - ao salvar: `serializeTrainingPrescription` + `validateTrainingPrescription`
  - sheet de Criar: `ExerciseSeriesEditor` no lugar dos steppers Séries/Reps/Descanso
  - Hoje / Cronograma / Histórico / execução: `formatTrainingSeriesSummary`
  - timer: `getEffectiveRestSec`
  - `blockProfessionalMutations` / `fromMetaadminEmbedded` / `professionalReadOnly` preservados
- `services/trainingSessionService.ts`
  - escrita: `serializeTrainingPrescription`
  - leitura (`getSessionExercises`): `normalizeTrainingExercisePrescription`
- `components/CalendarioTreinosPersonal.tsx` — resumo via helper (metanutri pasta 9)
- `app/metapersonal/page.v2.tsx` — displays de sessão operacional usam o helper; leftover de criar (se algum dia rodar) serializa `series[]`

### Ponte mínima do motor (sem mudar o draft)

`lib/trainingEngine/materializeDraftToTrainingSessions.ts` continua lendo `sets` + `repetitionRange` + `restSeconds` do draft e materializa séries iguais, **sem carga**, com o mesmo `reps` de antes (`max || min || 10`).

### Não mexido de propósito

- `WorkoutPlanDraft` / `PublishedTrainingPlan` / `PublishedTrainingPlanView`
- `lib/trainingExecution/buildTrainingSessionExecution.ts` (execução de plano publicado, outro domínio)
- GIFs: `resolveExerciseDbId`, `resolveExerciseGifUrl`, `/api/exercisedb/image?resolution=360`
- `recurrenceGroupId` e cópia por data
- portais / z-index / overlay do sheet

---

## Persistência

Caminho inalterado:

```text
trainingSessions/{sessionId}/exercises/{exerciseDocId}
```

Exemplo de documento salvo:

```json
{
  "source": "exercisedb",
  "exerciseId": "0025",
  "name": "barbell bench press",
  "bodyPart": "chest",
  "target": "pectorals",
  "equipment": "barbell",
  "gifUrl": "/api/exercisedb/image?exerciseId=0025&resolution=360",
  "order": 0,
  "prescription": {
    "series": [
      { "id": "set_…", "order": 1, "reps": 15, "loadKg": 20, "restSec": 60 },
      { "id": "set_…", "order": 2, "reps": 12, "loadKg": 25, "restSec": 60 },
      { "id": "set_…", "order": 3, "reps": 10, "loadKg": 30, "restSec": 75 },
      { "id": "set_…", "order": 4, "reps": 8, "loadKg": 35, "restSec": 90 }
    ]
  }
}
```

`exerciseId` continua sendo o ID da ExerciseDB. O `id` da série é outro campo.

Recorrência: cada data recebe uma **cópia** completa de `series[]`. Não há template vivo.

---

## Retrocompatibilidade (lazy migration)

Não há script de migração em massa.

```text
Treino antigo (sets/reps/restSec)
  → leitura (getSessionExercises / editor)
  → normalizeTrainingExercisePrescription
  → series[] em memória (N séries iguais, loadKg: null)
  → usuário edita (opcional)
  → save escreve só series[]
```

`{ sets: 3, reps: 10, restSec: 60 }` vira três séries `10 / null / 60`.

Se `series[]` já existir e tiver itens, o legado é ignorado.

Se `series` vier vazio `[]`, a normalização cai no default 3×10×60 (documento quebrado não derruba a UI).

---

## Execução do treino

A execução operacional **continua por exercício**, não série a série.

O timer de descanso usa:

```ts
getEffectiveRestSec(prescription) // última série, ou 60
```

Oportunidade futura (fora desta etapa): navegar série a série e usar o `restSec` da série recém-concluída.

---

## Resumo na UI

`formatTrainingSeriesSummary`:

| Situação | Exemplo |
| --- | --- |
| Séries iguais com carga | `3 × 10 · 30 kg` |
| Séries iguais sem carga | `3 × 10` |
| Reps diferentes | `4 séries · 15/12/10/8 reps` |
| Cargas diferentes | `… · 20/25/30/35 kg` |

---

## Como testar

Casos manuais da especificação:

1. Tradicional 3×10×30 kg×60s — salvar, reabrir.
2. Pirâmide 15/12/10/8 com 20/25/30/35 kg e descansos 60/60/75/90.
3. Flexão 3×12 sem carga — Firestore aceita `loadKg: null`.
4. Adicionar 4ª série copiando a última; alterar só a 4ª.
5. Remover a 2ª de quatro; ordem vira 1, 2, 3.
6. Abrir treino antigo `sets/reps/restSec` — três séries iguais, sem erro.
7. Editar S2 de um antigo e salvar — documento novo com `series[]`.
8. Recorrência 3×/semana — cada `trainingSession` com a mesma `series[]`.
9. Metaadmin (read-only) — vê o resumo; não muta.
10. Metanutri calendário Personal — vê o resumo; não muta.
11. Paciente `/meta/personal` — GIF, iniciar, timer, conclusão.

Cobertura automática: `npx vitest run lib/personal/trainingExerciseSeries.spec.ts`.

---

## Limitações ainda existentes

- Sem modo/botão “Pirâmide” (intencional).
- Sem RPE/RIR/duração/nota por série na UI.
- Sem execução série a série.
- Sem histórico de cargas.
- Sem drop-set, rest-pause, bi-set, circuito.
- Sem redesign desktop (catálogo à esquerda / treino à direita) — ETAPA 02.
- Sem biblioteca / puxar plano / salvar modelo.
- `WorkoutPlanDraft` e plano publicado continuam com `sets` + faixa de reps.
- Leftover de criar treino em `app/metapersonal/page.v2.tsx` (UI antiga, provavelmente morta) ainda edita `sets/reps/restSec` no estado local; na gravação já serializa `series[]`.
- Normalizar `series: []` recria 3×10×60 na **leitura** (proteção de UI). A **validação de save** rejeita `series` vazio e `reps <= 0`.
