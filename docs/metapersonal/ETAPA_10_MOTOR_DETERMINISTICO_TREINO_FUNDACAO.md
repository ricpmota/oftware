# Etapa 10 — Motor Determinístico de Treino (Fundação)

**Data:** 2026-07-26  
**Base:** Etapa 09 (Training Personalization Index)

---

## Objetivo

Normalizar o catálogo ExerciseDB, filtrar/pontuar exercícios e produzir um `WorkoutPlanDraft` **técnico e não publicado**.

```text
O WorkoutPlanDraft produzido nesta etapa não é publicado nem ativado para o paciente.

Ele é uma proposta técnica determinística que deverá ser validada antes de se tornar um treino operacional.
```

---

## Arquitetura

```text
Index → elegibilidade → normalização → filtros → score → estrutura → slots → draft
```

Módulos em `lib/trainingEngine/` separados (sem função monolítica).

---

## Ajustes prévios

1. **`generatedAt`:** builder puro deixa `null`; service carimba `new Date()` ao persistir o índice.
2. **Weekdays:** contrato `TrainingWeekday` (`monday`…`sunday`); aliases legados (`mon`, `segunda`, …) normalizados no índice.

---

## Arquivos criados

| Arquivo | Papel |
| --- | --- |
| `types/workoutPlanDraft.ts` | Draft, NormalizedExercise, slots, scores |
| `lib/trainingEngine/normalizeExercise.ts` | Normalizador puro |
| `lib/trainingEngine/equipmentMap.ts` | Avaliação → API |
| `lib/trainingEngine/movementPatternMap.ts` | Padrões / impacto / floor |
| `lib/trainingEngine/bodyRegionMap.ts` | Prioridade/dor → targets |
| `lib/trainingEngine/scoringConstants.ts` | `TRAINING_ENGINE_SCORING_V1` |
| `lib/trainingEngine/evaluateCompatibility.ts` | Filtros |
| `lib/trainingEngine/scoreExercise.ts` | Score + desempate |
| `lib/trainingEngine/buildWeeklyStructure.ts` | Estrutura + slots |
| `lib/trainingEngine/selectExerciseForSlot.ts` | Seleção |
| `lib/trainingEngine/buildDeterministicWorkoutPlan.ts` | Orquestração |
| `lib/trainingEngine/validateWorkoutPlanDraft.ts` | Validator |
| `lib/trainingEngine/normalizeWeekday.ts` | Weekdays |
| `lib/trainingEngine/index.ts` | Barrel |
| `lib/trainingEngine/buildDeterministicWorkoutPlan.spec.ts` | Testes |
| `docs/metapersonal/ETAPA_10_MOTOR_DETERMINISTICO_TREINO_FUNDACAO.md` | Este doc |

## Arquivos alterados

| Arquivo | Mudança |
| --- | --- |
| `types/trainingPersonalizationIndex.ts` | Padrões extras; reexport NormalizedExercise |
| `lib/avaliacaoAtividadeFisica/buildTrainingPersonalizationIndex.ts` | generatedAt null + weekdays |
| `services/avaliacaoAtividadeFisicaService.ts` | carimbo generatedAt |
| specs Etapa 09 | weekdays canônicos |

**Não alterados:** Firestore Rules, `trainingSessions`, calendário, IA, UI paciente, publicação.

---

## Contrato `NormalizedExercise`

Campos: source/sourceId, músculos, equipment, environments, difficulty, movementPatterns, exerciseType, impact/floor/noise, unilateral/compound, confidence por metadado.

Metadados sem base → `unknown` / `null` (nunca “safe” falso).

---

## Mapas

### Equipamentos (avaliação → API)

`dumbbells`→`dumbbell` · `barbell_plates`→`barbell`/`olympic barbell`/… · `strength_machines`→`machine`/`cable`/… · `none`→`body weight` · `trx`→body weight (API sem suspension) · `treadmill`→body weight (sem código esteira)

### Ambientes

Inferidos por equipamento (máquina→gym/condo; free weights→gym/home/condo; BW→todos). Desconhecido → não exclui automaticamente.

### Movimentos

Aliases controlados por nome/target/bodyPart. Novos padrões: `hip_hinge`, `locomotion`, `core_stability`, `rotation`, `carry`, `calf_raise`, `elbow_*`, `knee_*`, `hip_abduction/adduction`.

### Dor → targets

Heurística operacional em `bodyRegionMap` — **não é decisão clínica**.

---

## Filtros (exclusões)

`generation_not_allowed` · `excluded_movement_pattern` · `restricted_movement_conflict` (padrão primário) · `equipment_unavailable` · `floor_exercise_not_allowed` · `high_impact_not_allowed` · `noise_not_allowed` · `environment_incompatible` · `difficulty_incompatible` (beginner/returning × advanced) · `body_region_conflict` (primário) · `catalog_metadata_invalid`

Restricted secundário / dor secundária → penalidade, não exclusão.

---

## Score (`TRAINING_ENGINE_SCORING_V1`)

Objetivo +30 · prioridade +25/+12 · modalidade +15 · equipamento +10 · dificuldade +10 · ambiente +5 · composto +4 · unilateral +2 · unknown −5 · restrito −30 · dor sec. −20 · barreira −10 · slot pattern/muscle +20/+18

Desempate: score → confiança → `normalizedName` → `id`. Sem `Math.random`.

---

## Estrutura / slots / seleção

`buildWeeklyStructure` define dias e slots sem escolher exercícios.  
`advanced_split_candidate` → `unsupported_split`.  
Variável → `weekday = null`.  
Seleção por slot com diversidade (`maxPerMovementPattern/Muscle/Equipment`).

Parâmetros (sets/reps/rest/RPE) vêm do índice. Sem carga em kg / 1RM.

Cardio: bloco simples se preferência ≠ dislike e sem cautela cardiorrespiratória.

Warmup: `general_dynamic_warmup` 5 min.

---

## Draft / validação / diagnóstico

Status: `generated` | `blocked` | `unsupported_profile` | `unsupported_split` | `insufficient_catalog`

**Não persiste** automaticamente. Sem collection nova.

`catalogDiagnostics.missingSlots` quando slot obrigatório fica vazio.

---

## Testes

Cobertura em `buildDeterministicWorkoutPlan.spec.ts` + ajustes no spec do índice.

---

## Limitações / próximos passos

- Inferências de floor/impact/noise são heurísticas; confiança explícita.
- Sem painel técnico UI nesta entrega.
- Sem publicação em `trainingSessions`.
- Etapa 11+: review profissional, ativação controlada, mapa TRX/treadmill mais rico, metadados manuais.

## Fora de escopo (intactos)

IA · prompts · calendário · notificações · treino ativo · progressão · PDF · rules · whitelabel.
