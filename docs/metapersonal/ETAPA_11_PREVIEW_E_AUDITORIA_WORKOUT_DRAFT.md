# Etapa 11 — Preview profissional e auditoria do Workout Plan Draft

**Data:** 2026-07-27  
**Base:** Etapas 08–10

---

## Objetivo

Permitir que médico ou personal trainer autorizado gere, visualize, revise, substitua exercícios e aprove um `WorkoutPlanDraft` técnico.

```text
A aprovação do WorkoutPlanDraft não publica o treino.

Ela apenas registra que a proposta técnica foi revisada por um profissional autorizado.
```

---

## Arquitetura

```text
Avaliação concluída → Index → Motor → WorkoutPlanDraft → Preview → Revisão → Draft aprovado
```

Publicação / `trainingSessions` / calendário ficam para etapa posterior.

---

## Arquivos criados

| Arquivo | Papel |
| --- | --- |
| `types/reviewedWorkoutPlanDraft.ts` | Reviewed draft + collection |
| `services/workoutPlanDraftService.ts` | Geração, persistência, approve/discard |
| `lib/trainingEngine/draftLabels.ts` | Labels humanas |
| `lib/trainingEngine/replaceWorkoutDraftExercise.ts` | Substituição pura |
| `lib/trainingEngine/listReplacementCandidates.ts` | Candidatos compatíveis |
| `lib/trainingEngine/loadCatalogForTrainingEngine.ts` | Catálogo 1x por bodyPart |
| `lib/trainingEngine/buildDraftFingerprint.ts` | Fingerprint de contexto |
| `components/trainingEngine/WorkoutPlanDraftPreview.tsx` | UI principal |
| `components/trainingEngine/WorkoutDraftExerciseCard.tsx` | Card de exercício |
| `components/trainingEngine/WorkoutExerciseReplaceModal.tsx` | Modal substituição |
| `lib/trainingEngine/replaceWorkoutDraftExercise.spec.ts` | Testes |
| `docs/metapersonal/ETAPA_11_PREVIEW_E_AUDITORIA_WORKOUT_DRAFT.md` | Este doc |

## Arquivos alterados

| Arquivo | Mudança |
| --- | --- |
| `PersonalPacienteSharePanel.tsx` | Preview após avaliação (`doctor`) |
| `app/meta/personal/page.tsx` | Preview no embed PT |
| `lib/trainingEngine/index.ts` | Exports Etapa 11 |

**Não alterados:** `trainingSessions`, calendário, Firestore Rules (collection nova cai no catch-all auth), IA, flag da avaliação.

---

## Integração

### `/metaadmin`
`PersonalPacienteSharePanel` — após `AvaliacaoAtividadeFisicaProfessionalView`, antes do calendário.

### `/metapersonal`
`PersonalPageContent` quando `isPersonalTrainerMode || fromMetapersonal`.

Mesmo componente: `WorkoutPlanDraftPreview`.

---

## Autorização

Mesmo padrão da Etapa 08: painel só no paciente já aberto / compartilhado.  
`viewerRole` registra quem aprovou; ACL de abertura é do host.

---

## Geração

Botão **Gerar prévia do treino** (não automático).

1. Assessment completed  
2. Index (rebuild se ausente)  
3. Catálogo: bodyParts em paralelo, cache memória 10 min, sem chamada por slot  
4. `buildDeterministicWorkoutPlan`  
5. Persistência em `workoutPlanDrafts/{draftId}`  
6. Reuso por fingerprint se draft não revisado existir  

---

## Estados

| Status | UI |
| --- | --- |
| sem avaliação | Mensagem |
| draft assessment | Em preenchimento |
| blockers no índice | Labels humanas + review profissional |
| `blocked` | Sem sessões |
| `unsupported_*` | Mensagens específicas |
| `insufficient_catalog` | Lista missingSlots |
| `generated` | Sessões + diagnóstico |

---

## Substituição

- Modal com candidatos elegíveis (mesmo slot / índice / diversidade)  
- `replaceWorkoutDraftExercise` puro (não muta base)  
- Mantém sets/reps/rest/RPE do exercício atual  
- Auditoria em `manualAdjustments`  
- Desfazer restaura do `baseDraft`  
- Revalida após cada troca  

Não edita séries/RPE/split nesta etapa.

---

## Revisão

`ReviewedWorkoutPlanDraft`:
- `baseDraft` + `workingDraft`
- `review.status`: not_reviewed | in_review | approved | discarded
- notas livres (máx. 2000)

**Aprovar** exige: generated, validator ok, sem missing slots, não stale.  
**Não publica.**

---

## Persistência

Collection: `workoutPlanDrafts/{draftId}`  
Campos: patientId, assessment/index/engine versions, fingerprint, drafts, review, adjustments.  

Consulta: `where patientId == … orderBy createdAt` — sem full scan.  
Não grava em `trainingSessions`.

---

## Stale detection

Badge **Prévia desatualizada** se assessment/index/engine mudou ou assessment foi atualizado depois do draft. Bloqueia aprovação até nova versão.

---

## Feature flag

`NEXT_PUBLIC_TRAINING_ENGINE_PREVIEW_ENABLED`  
Desliga com `false` / `0`. Ausente = ligado.

---

## Catálogo (estratégia)

Carregar uma vez: 8 bodyParts × limit 40 → dedupe por id → cache cliente 10 min.  
ISR da API existente (1h). Sem chamada por slot.

---

## Fora de escopo

IA · prompts · publicação · calendário · notificações · carga em kg · edição avançada de parâmetros · Rules novas específicas.

---

## Próximos passos

Publicação controlada em `trainingSessions`, edição de séries/RPE, liberação clínica estruturada, índice Firestore composto se necessário em produção.
