# Etapa 12 — Publicação controlada do plano de treino

**Data:** 2026-07-27  
**Base:** Etapas 09–11

---

## Objetivo

Publicar um `ReviewedWorkoutPlanDraft` aprovado como `PublishedTrainingPlan` versionado, auditável e visível ao paciente — **sem** criar `trainingSessions` nem eventos de calendário.

```text
PublishedTrainingPlan representa o plano prescrito e publicado.

Ele não representa uma sessão executada, um evento de calendário ou um registro de progresso.
```

---

## Arquitetura

```text
Draft aprovado → validação no service → builder puro → publishedTrainingPlans
                                                      ↓
                                         (ativo) / superseded / cancelled
```

---

## Arquivos criados

| Arquivo | Papel |
| --- | --- |
| `types/publishedTrainingPlan.ts` | Domínio publicado |
| `lib/trainingEngine/buildPublishedTrainingPlan.ts` | Builder puro |
| `lib/trainingEngine/rpePatientCopy.ts` | Texto RPE para paciente |
| `services/publishedTrainingPlanService.ts` | Publicar / listar / cancelar |
| `components/trainingPlan/PublishedTrainingPlanView.tsx` | Visualização |
| `components/trainingPlan/PublishTrainingPlanModal.tsx` | Confirmação de publicação |
| `components/trainingPlan/ActivePublishedTrainingPlanPanel.tsx` | Painel ativo |
| `lib/trainingEngine/buildPublishedTrainingPlan.spec.ts` | Testes |
| `docs/metapersonal/ETAPA_12_PUBLICACAO_CONTROLADA_PLANO_TREINO.md` | Este doc |

## Arquivos alterados

| Arquivo | Mudança |
| --- | --- |
| `WorkoutPlanDraftPreview.tsx` | Botão publicar + modal + painel ativo |
| `app/meta/personal/page.tsx` | “Meu plano de treino” para paciente |
| `firestore.rules` | Rules da collection |
| `firestore.indexes.json` | Índices patientId+status / planVersion |

**Não alterados:** `trainingSessions`, calendário, avaliação, índice, motor de geração, IA.

---

## Domínio

`PublishedTrainingPlan` com snapshot completo dos exercícios (nome, instruções, mídia URL, músculos, equipamento, prescrição).  
`patientId` = `pacientes_completos.id` · `patientUserId` = Auth UID (ACL paciente).

Coleção: `publishedTrainingPlans/{planId}`

---

## Plano ativo e versionamento

- No máximo um `status === 'active'` por paciente  
- Nova publicação: anterior → `superseded` (transação) + novo `active`  
- `planVersion` incremental  
- Idempotência: `source.publishKey = reviewedDraftId::fingerprint`

---

## Autorização

Service:

- **Médico:** `pacientes_completos.medicoResponsavelId === userId`  
- **Personal:** `PacientePersonalTrainerService.hasAccessToPaciente`  
- Draft buscado pelo ID; status/validação/stale conferidos no service  

Rules:

- Paciente lê se `patientUserId == auth.uid`  
- Create: autenticado + `publishedBy == auth.uid`  
- Update: autenticado e **não** o paciente; identidade imutável  
- Delete: false  

---

## Snapshot

No publish, catálogo enriquece instruções; GIF via `/api/exercisedb/image?exerciseId=…&resolution=360`.  
Plano permanece legível sem ExerciseDB online.

---

## Interface

### Profissional
Após aprovação: **Publicar plano para o paciente** → modal (título, datas, aviso de calendário, confirmação de supersede).

### Paciente
`/meta/personal`: painel **Meu plano de treino** (sem score/warnings/IDs técnicos; RPE com texto estático).

---

## Cancelamento

Profissional autorizado → `cancelled` + `cancelledAt`. Histórico preservado. Paciente deixa de ver plano ativo.

---

## Feature flag

`NEXT_PUBLIC_TRAINING_PLAN_PUBLISHING_ENABLED`  
Desliga com `false` / `0`. Ausente = ligado. Independente do preview.

---

## Índices

- `patientId` + `status`  
- `patientId` + `planVersion` desc  
- (também) `workoutPlanDrafts`: `patientId` + `createdAt` desc  

---

## Fora de escopo

IA · calendário · sessões executadas · carga · progressão · notificações · status `completed` automático.

---

## Próximos passos

Materializar sessões no calendário a partir do plano; check-in de execução; progressão de carga.
