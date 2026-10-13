# Etapa 09 — Training Personalization Index

**Data:** 2026-07-26  
**Base:** Etapas 03–08

---

## Objetivo

Derivar da avaliação concluída um **índice operacional determinístico** para o futuro motor de treino.

```text
O Training Personalization Index não é um treino.

Ele é uma camada operacional determinística entre a avaliação do paciente e o futuro motor de geração.
```

```text
Avaliação concluída → Training Personalization Index → Motor determinístico (Etapa 10+)
```

Não substitui `answers`, `summary` nem `safety`.

---

## Arquivos criados

| Arquivo | Papel |
| --- | --- |
| `types/trainingPersonalizationIndex.ts` | Índice, blockers, warnings, `NormalizedExercise` |
| `lib/avaliacaoAtividadeFisica/buildTrainingPersonalizationIndex.ts` | Builder puro |
| `lib/avaliacaoAtividadeFisica/validateTrainingPersonalizationIndex.ts` | Validação estrutural |
| `lib/avaliacaoAtividadeFisica/buildTrainingPersonalizationIndex.spec.ts` | Testes Vitest (31) |
| `docs/metapersonal/ETAPA_09_TRAINING_PERSONALIZATION_INDEX.md` | Este doc |

## Arquivos alterados

| Arquivo | Mudança |
| --- | --- |
| `types/avaliacaoAtividadeFisica.ts` | Campo `trainingPersonalizationIndex` |
| `services/avaliacaoAtividadeFisicaService.ts` | `completeAssessment` salva índice; `rebuildTrainingPersonalizationIndex` |

**Não alterados:** rules, UI profissional/paciente, calendário, sessões, IA, seleção de exercícios.

---

## Estrutura do índice (`version: 1`)

- `source` — ids/versões/status/datas
- `eligibility` — `generationAllowed`, review, blockers, warnings
- `goals` / `experience` / `routine` / `trainingPreferences`
- `environment` — ambientes + equipamentos
- `constraints` — regiões, padrões, floor/noise, cautelas
- `generationParameters` — split, volume, séries, reps, rest, RPE, cardio

---

## Blockers

| Código | Quando |
| --- | --- |
| `assessment_not_completed` | status ≠ completed |
| `professional_review_required` | safety.requiresProfessionalAttention |
| `professional_restriction_present` | restrição profissional ≠ no |
| `weekly_frequency_missing` | sem dias disponíveis |
| `session_duration_missing` | sem duração |
| `training_location_missing` | sem local |
| `insufficient_assessment_data` | completed sem dados mínimos |

`generationAllowed = blockers.length === 0`

---

## Warnings (não bloqueiam)

`summary_rebuilt_from_answers` · `equipment_availability_unknown` · `variable_schedule` · `variable_session_duration` · `returning_after_inactivity` · `exercise_preferences_not_in_catalog` · `environment_has_limitations` · `low_training_experience` · `cardio_preference_unknown` · `seven_day_frequency` · `very_intense_preference_capped`

---

## Normalizações

### Experiência
`never_trained` / `<6m` → beginner · `returning` → returning · `6m–2y` / `>2y` → intermediate · `advanced` → advanced

### Intensidade / RPE
Preferência só **reduz** ou aproxima; nunca eleva além do teto da experiência. `very_intense` é limitado + warning.

### Frequência / split
Usa `availableDaysPerWeek` (cap estrutural 6 para split). 7 dias → warning.

### Duração → exercícios
15–20: 3–4 · 30: 4–6 · 40–50: 5–7 · 60: 6–9 · 75: 7–10 · 90+: 8–11 (reduz se iniciante/returning/volume baixo)

### Séries base
Beginner/returning: 2–3×10–15, rest 60–90, RPE 4–6 · Intermediate: 3–4×8–15 · Advanced: 3–5×6–15

### Cardio
warmup 5–8 · little 8–15 · moderate 15–25 · a_lot 20–35 · dislike 0–5 · no_preference 5–15 (cap ~40% da sessão)

### Ambientes / equipamentos
Códigos da avaliação; `none` → lista vazia conhecida; `unknown` → vazia + warning.

### Floor / ruído
`no_space` → `requiresNoFloorExercises` · ruído `yes` → low noise + environmental low impact (separado de clinical).

### Movimentos
Limitações → `TrainingMovementPattern` (squat, kneeling, floor_transition, push/pull, running, jumping, …). Texto livre de favoritos/evitados **não** é interpretado por regex/IA.

---

## Auditoria da API de exercícios (`types/exercise.ts`)

### Presentes
`id`, `name`, `bodyPart`, `target`, `equipment`, `secondaryMuscles`, `instructions`, `description?`, `difficulty?`, `category?`, `gifUrl?`

### Ausentes (necessários ao motor)
`impactLevel`, `requiresFloor`, `noiseLevel`, `contraindicationTags`, `limitationTags`, `environments`, `movementPatterns`, `primaryMuscles[]` (hoje `target` + `bodyPart`)

### Incompatibilidade de equipamentos
Códigos da avaliação (`dumbbells`, `mat`, `trx`…) ≠ strings ExerciseDB (`dumbbell`, `body weight`…).  
**Próxima etapa:** mapa `assessment equipment → API equipment`.

### Contrato futuro
`NormalizedExercise` documentado em `types/trainingPersonalizationIndex.ts`.

---

## Persistência

No mesmo documento `avaliacaoAtividadeFisica/{patientId}`:

1. `completeAssessment` → safety + summary + **index** no mesmo write  
2. `rebuildTrainingPersonalizationIndex(patientId)` → só índice + `updatedAt` (completed only)  
3. Índice sempre recalculado no service (não confiar na UI)  
4. Sem collection nova · sem full scan · idempotente

Versões distintas: assessment · summary · index.

---

## Testes (lógica coberta no builder/validator)

Builder puro · elegibilidade · experiência · parâmetros · ambiente · constraints · validação de faixas · persistência via complete/rebuild.

**Confirmado:** nenhum exercício selecionado, nenhuma sessão, nenhuma IA.

---

## Limitações / próximos passos

- Sem UI do índice (somente dado técnico).
- Sem mapa equipamento avaliação ↔ ExerciseDB.
- Sem preenchimento de metadados ausentes no catálogo.
- Etapa 10: motor determinístico consumindo o índice + `NormalizedExercise`.
