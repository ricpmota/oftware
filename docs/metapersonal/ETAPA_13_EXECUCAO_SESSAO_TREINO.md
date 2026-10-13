# Etapa 13 — Execução de sessões do plano de treino

**Data:** 2026-07-27  
**Base:** Etapa 12 (`PublishedTrainingPlan`)

---

## 1. Objetivo

Permitir que o paciente inicie uma sessão prescrita do plano publicado ativo e registre o que realmente realizou (séries, carga, RPE, pulos, feedback).

```text
TrainingSessionExecution representa o que o paciente realmente realizou.

Ele não modifica o plano prescrito e não representa uma sessão futura de calendário.
```

---

## 2. Arquitetura

```text
PublishedTrainingPlan (imutável)
        ↓
Paciente escolhe sessão → Iniciar treino
        ↓
TrainingSessionExecution (in_progress)
        ↓
Registro exercício a exercício (séries / skip)
        ↓
Concluir | Abandonar
```

Separação:

| Camada | Domínio |
| --- | --- |
| Plano prescrito | `PublishedTrainingPlan` |
| Sessão prescrita | `PublishedTrainingPlan.sessions[]` |
| Sessão executada | `TrainingSessionExecution` |
| Evolução futura | fora de escopo |

---

## 3. Diferença plano × execução

- **Plano:** snapshot prescrito, versionado, não editável pelo paciente.
- **Execução:** cópia de trabalho com status, séries reais e feedback.
- Alterar execução **nunca** escreve em `publishedTrainingPlans`.

---

## 4. Coleção

**Escolhida:** `trainingSessionExecutions/{executionId}`

### Auditoria de `trainingSessions`

| Achado | Decisão |
| --- | --- |
| Representa sessões de calendário / prescrição manual | Mistura prescrição + done/skipped leve |
| Sem séries/carga/RPE por exercício | Contrato incompatível |
| `patientId` frequentemente = Auth UID | Colisão conceitual com `pacientes_completos.id` |

**Não reutilizar** `trainingSessions`. Nova coleção evita colisão com calendário e drafts.

---

## 5. Tipos

`types/trainingSessionExecution.ts`

- Status: `in_progress` \| `completed` \| `abandoned` \| `cancelled`
- Exercícios + séries com snapshot prescrito imutável
- Warmup / cardio opcionais
- Feedback: RPE global, dificuldade, dor, notas

---

## 6. Builder

`lib/trainingExecution/buildTrainingSessionExecution.ts` — puro:

- resolve sessão no plano ativo;
- cria snapshot + séries `pending`;
- status `in_progress`;
- não muta o plano.

---

## 7. Início

`trainingSessionExecutionService.startSessionExecution`:

1. carrega plano por id;
2. exige `active` + `patientUserId === userId`;
3. no máximo uma execução `in_progress` por paciente;
4. idempotência: mesma sessão em andamento ou `clientRequestId`;
5. builder + `setDoc`.

---

## 8–10. Séries, carga, RPE

`updateSetExecution` / `applySetExecutionUpdate`:

- reps ≥ 0; carga ≥ 0; RPE 1–10;
- carga opcional (peso corporal sem unidade obrigatória);
- salvamento imediato ao concluir série;
- UI locale `pt-BR`.

---

## 11. Descanso

Cronômetro local após concluir série (tempo prescrito).  
Não grava ticks no Firestore.

---

## 12–13. Aquecimento e cardio

Marcar `completed` / `skipped`; duração real e RPE de cardio opcionais.  
Não obrigatórios para finalizar (warning de aquecimento na UI).

---

## 14. Pular exercício

Status `skipped` + motivo opcional (`SKIP_REASON_OPTIONS`).  
Permanece no array; snapshot intacto.

---

## 15–16. Feedback e dor

Na conclusão: dificuldade, RPE global, dor (+ regiões), observação.  
Orientação neutra se dor; sem diagnóstico nem alteração do plano.

---

## 17–18. Conclusão e abandono

- Conclusão exige ≥ 1 exercício iniciado; pendentes → `skipped`.
- Segunda conclusão é idempotente.
- Abandono preserva dados; não exclui; bloqueado após `completed`.

Mutações puras: `lib/trainingExecution/applyTrainingExecutionMutations.ts`.

---

## 19. Recuperação

Ao abrir “Meu plano de treino”:

- query `patientId + status == in_progress`;
- banner **Continuar treino** + botão por sessão;
- workspace restaura `currentExerciseIndex` e séries salvas.

---

## 20. Histórico

Lista **Treinos recentes** (data, sessão, status, duração, exercícios concluídos).  
Profissional vê a mesma lista no painel ativo (somente leitura nesta etapa).

---

## 21. Autorização

| Quem | Pode |
| --- | --- |
| Paciente | criar/atualizar própria execução; ler próprio histórico |
| Paciente | **não** alterar plano, identidade, snapshots prescritos |
| Profissional | ler execuções (ACL fina no app; rules: autenticado) |

---

## 22. Rules / API

Rules em `trainingSessionExecutions`:

- create: `patientUserId == auth.uid` + `in_progress`;
- update: owner + identidade/`source`/`createdAt` imutáveis;
- delete: false.

**API Route Handlers:** não criados nesta etapa — mesmo padrão da Etapa 12 (service cliente + Rules + validações no service). Hardening futuro: `/api/training-executions/*` com Admin SDK.

---

## 23. Índices

- `patientId + status`
- `patientId + timing.startedAt desc`
- `patientId + source.clientRequestId`
- `source.publishedPlanId + timing.startedAt desc`

---

## 24. Idempotência

- start: sessão em andamento igual ou `clientRequestId`;
- complete/abandon: status terminal retorna estado existente;
- update de série: sobrescreve campos informados (último write vence no service).

---

## 25. Testes

`lib/trainingExecution/buildTrainingSessionExecution.spec.ts`:

- builder (criação, rejeição, imutabilidade, IDs, snapshot);
- séries (reps/carga/RPE, validações, exercício inválido);
- skip / complete / abandon.

---

## 26. Limitações

- Sem offline completo;
- Sem telemetria detalhada de descanso;
- Sem edição profissional da execução;
- Writes via cliente autenticado (não Admin API).

---

## 27. Fora de escopo

- IA
- Calendário / `trainingSessions`
- Progressão automática
- Alteração de `PublishedTrainingPlan`
- Sessões futuras antecipadas
- Notificações automáticas

---

## 28. Feature flag

`NEXT_PUBLIC_TRAINING_SESSION_EXECUTION_ENABLED`

- `false` / `0` → botões de iniciar ocultos; plano continua visível.
- Default: ligado.

---

## 29. Próximos passos

- API server-side para writes;
- Painel profissional dedicado de histórico;
- Analytics de aderência;
- Progressão assistida (Etapa futura).

---

## Arquivos

| Arquivo | Papel |
| --- | --- |
| `types/trainingSessionExecution.ts` | Domínio |
| `lib/trainingExecution/buildTrainingSessionExecution.ts` | Builder |
| `lib/trainingExecution/applyTrainingExecutionMutations.ts` | Mutações puras |
| `services/trainingSessionExecutionService.ts` | Persistência |
| `components/trainingPlan/TrainingSessionExecutionWorkspace.tsx` | UI mobile |
| `app/meta/personal/treino/[executionId]/page.tsx` | Rota |
| `components/trainingPlan/PublishedTrainingPlanView.tsx` | Iniciar/Continuar |
| `components/trainingPlan/ActivePublishedTrainingPlanPanel.tsx` | Flag + histórico |
| `firestore.rules` / `firestore.indexes.json` | ACL + índices |
| `lib/trainingExecution/buildTrainingSessionExecution.spec.ts` | Testes |

**Não alterados:** calendário, `trainingSessions` schema, motor de geração, IA, snapshot do plano publicado.
