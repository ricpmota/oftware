# ETAPA 06 — Evolução por exercício dentro de Estatísticas

**Sistema alterado:** aba Estatísticas operacional em `PersonalPageContent` (`/meta/personal`, Metapersonal, Metaadmin, Metanutri).  
**Não alterado:** motor determinístico (`WorkoutPlanDraft` / `PublishedTrainingPlan` / `trainingSessionExecutions`), nova aba Dashboard, nome da aba no menu, RPE/RIR, volume como KPI, IA, metas, streak avançado.

**Fonte de verdade:** código atual.  
**Data:** 2026-08-16.

---

## 1. Problemas anteriores

A aba Estatísticas só tinha:

```text
Aderência — últimos 7 dias
Aderência — últimos 30 dias
Treinos feitos por semana — últimas 4 semanas
```

Isso era semanticamente incorreto:

* **Aderência** calculava `exercícios status === done ÷ todos os exercícios das sessões do período`. Não media aderência à prescrição (reps/carga).
* **Treinos feitos por semana** contava exercícios `done`, não sessões concluídas.
* Barras usavam `count / 7` como escala fixa.
* Datas usavam `Date.toISOString().split('T')[0]` (deslocamento possível no Brasil).
* Dois `useEffect` chamavam `loadEstatisticas`.
* Cada carga fazia `getPatientSessions` × 6 (7d + 30d + 4 semanas), cada uma lendo **todas** as sessões do paciente e filtrando no cliente, e depois N+1 `getSessionExercises` **por janela** (as mesmas sessões eram relidas).
* `TrainingExerciseExecutionService` não listava `exerciseExecutions`; Estatísticas não via carga realizada.
* `adherenceDisplay` no header era código morto.

Não havia como responder: o paciente está treinando? aumentou carga no Supino?

---

## 2. Arquitetura nova

Uma montagem por abertura da aba / troca de período:

```text
patientId (resolvido uma vez, com fallback uid_timestamp → uid)
      ↓
getPatientSessionsInDateRange (query Firestore no período)
      ↓
para cada sessão, em paralelo:
  getSessionExercises + listBySession(exerciseExecutions)
      ↓
buildTrainingStatsDataset()
      ↓
KPIs + gráfico semanal + progressão + modal
```

Camadas:

| Camada | Arquivo |
| --- | --- |
| Domínio puro | `lib/personal/trainingStats.ts` |
| Leitura Firestore | `services/personalTrainingStatsService.ts` |
| UI | `components/personal/stats/*` |
| Orquestração | `app/meta/personal/page.tsx` só passa `patientId` e `activeTab` |

Não há agregados persistidos (`patient_training_stats`, etc.).

---

## 3. Queries

### Sessões no período

Novo método:

```ts
trainingSessionService.getPatientSessionsInDateRange(patientId, startDate, endDate)
```

```text
where patientId == X
where scheduledDate >= start
where scheduledDate <= end
```

`getPatientSessions` antigo permanece para Histórico/calendário (ainda lê o histórico inteiro e filtra no cliente). Estatísticas **não** o usa.

### Índice Firestore (obrigatório)

Em `firestore.indexes.json`:

```json
{
  "collectionGroup": "trainingSessions",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "patientId", "order": "ASCENDING" },
    { "fieldPath": "scheduledDate", "order": "ASCENDING" }
  ]
}
```

Deploy:

```bash
firebase deploy --only firestore:indexes
```

**Não há fallback silencioso** para 6 leituras do histórico inteiro. Se o índice não existir, a aba mostra erro + retry.

### Execuções

```ts
TrainingExerciseExecutionService.listBySession(sessionId)
```

Lê `trainingSessions/{sessionId}/exerciseExecutions`.

`listForSessions(sessionIds)` existe, mas o loader de Estatísticas faz, por sessão, `exercises` + `executions` em `Promise.all` para não serializar duas N+1.

### Collection group (oportunidade futura)

`collectionGroup('exerciseExecutions')` **não** é usado nesta etapa.

Os docs de execução **não** guardam `patientId` / `scheduledDate`. Filtrar por paciente exigiria schema novo. Sem isso, collection group leria execuções de todos os pacientes.

---

## 4. Dataset

`TrainingStatsDataset` reúne:

* `sessions` — cada sessão com estado de conclusão derivado
* `completion` — programadas / concluídas / puladas / agendadas / taxa
* `series` — séries done / skipped / pending a partir de `exerciseExecutions`
* `weeklyCompleted` — 4 semanas, sessões concluídas
* `exercises` — `ExerciseEvolutionSummary[]` agrupado por `exerciseId` (ExerciseDB)
* `sessionsWithExecutions` — cobertura série a série

Identidade:

```text
exerciseId     → movimento ao longo do tempo
exerciseDocId  → ocorrência naquela sessão
```

Sem `exerciseId`: a ocorrência **não** entra na progressão longitudinal (não agrupa por nome traduzido).

---

## 5. KPIs

| KPI | Fórmula | Nome antigo |
| --- | --- | --- |
| Treinos concluídos | sessões com conclusão `done` | — |
| Taxa de conclusão | concluídos / programados | **não** é “Aderência” |
| Séries realizadas | séries `status === 'done'` nas execuções | — |
| Sessões no período | todas as sessões do recorte | — |

**Conclusão de sessão** (ETAPA 05 não chama `markSession`):

1. `session.status === 'skipped'` → pulada
2. `session.status === 'done'` → concluída
3. senão, se todos os exercícios são `done` ou `skipped` e pelo menos um `done` → concluída
4. todos `skipped` → pulada
5. resto → agendada

Sem sessões: empty state, **não** `0%`.

Aderência à prescrição (reps/carga ponderada) **não** foi inventada nesta etapa.

---

## 6. Progressão por exercício

Lista exercícios com pelo menos uma série:

```text
status === 'done'
actualLoadKg !== null
```

Ordenação: última execução mais recente. Busca client-side por nome se houver muitos cards.

Card: última carga, maior carga, variação %, sessões com carga, “Ver evolução”.

---

## 7. Regra da carga por sessão

Por ocorrência (`exerciseDocId`):

```text
maior actualLoadKg entre séries done com carga informada
```

Essa carga representa a sessão no resumo longitudinal (pirâmide 20/25/30/35 → 35 kg).

**Última carga** do exercício: maior carga da ocorrência mais recente que tenha carga válida.

**Maior carga:** `max` de todas as séries done com carga no período.

**Variação:** `(última − primeira) / primeira * 100`, só se primeira > 0. Senão `—`.

Não se chama “ganho de força”. UI: “Variação” / “Evolução da carga”.

`null` **nunca** vira `0 kg`.

Série skipped não entra na maior carga. Exercício skipped não entra no ranking de carga; no modal pode aparecer “Exercício pulado”.

---

## 8. Modal

Recebe `ExerciseEvolutionSummary` já derivado. Sem refetch.

* KPIs do exercício
* Gráfico Recharts (já no `package.json`): X = data da sessão, Y = maior carga da ocorrência
* Histórico cronológico (mais antigo primeiro)
* Por série: Prescrito (`prescribed*`) × Realizado; skipped = “Pulou”, não 0 reps

Mobile: `100dvh`, scroll interno, toque.

---

## 9. Prescrito × realizado

O modal e o detalhe do Histórico usam o **snapshot da execução**, não a prescrição atual da sessão.

Histórico ganhou só essa tabela por ocorrência. Sem gráfico longitudinal na aba Histórico.

---

## 10. Treinos antigos

Sessões anteriores à ETAPA 05 (marcar Feito no card, sem `exerciseExecutions`):

* entram nos KPIs de sessão, se a conclusão derivada for `done`
* **não** entram em progressão de carga
* nenhum valor prescrito é inventado como realizado

Indicador discreto: “Dados de carga disponíveis em N sessões”.

---

## 11. Performance antes/depois

Cenário aproximado: 100 sessões no histórico, ~30 no recorte de 90 dias, UID simples.

| | Antes | Depois |
| --- | --- | --- |
| `getPatientSessions` | × 6, cada uma lendo **todas** as sessões | × 0 |
| `getPatientSessionsInDateRange` | — | × 1 (× 2 só se UID composto e a 1ª query vazia) |
| `getSessionExercises` | N+1 **por janela** (overlap 7d ⊂ 30d ⊂ 4 semanas) | × 1 por sessão **do período**, uma vez |
| `exerciseExecutions` | 0 | × 1 por sessão do período |
| Leituras estimadas (100 sessões totais / 30 no período) | ~800–1800 (auditoria) | ~1 + 30 + 30 = 61 |

N+1 restante: uma listagem de exercises e uma de executions **por sessão do período**. Aceitável nesta etapa. Não é repetido por KPI/modal.

Filtro 30 / 90 / 180 dias: um dataset por troca de período.

---

## 12. Mobile

KPIs em uma coluna. Cards de progressão compactos. Modal em sheet (`items-end` no mobile) com `max-h-[100dvh]` e scroll.

---

## 13. Permissões

Somente leitura em todos os hosts. Nenhuma mutação nesta aba.

Paciente vê os próprios dados; personal/médico/nutri vêem o paciente aberto se já tiverem acesso ao Personal.

Médico/nutri no Metaadmin continuam **sem** poder adicionar exercício do catálogo (read-only de Criar). Isso é independente desta etapa.

---

## 14. Testes

`lib/personal/trainingStats.spec.ts`

* período local (não UTC)
* conclusão done / skipped / todos done / mistura / todos skipped
* 10 programadas / 8 done / 1 skipped / 1 scheduled → 80%
* empty → taxa `null`
* pirâmide → max 35
* skipped series fora do max
* `null` não vira 0
* 30 → 32 → 35 → +16,67%
* 35 → 32 → variação negativa
* flexão sem carga fora do ranking
* duas ocorrências do mesmo `exerciseId` na mesma sessão
* snapshot `prescribed*` da execução
* card Feito sem execution: conta sessão, não inventa carga
* gráfico semanal conta sessões, não exercícios

---

## 15. Limitações

* Query de sessões exige o índice composto; sem deploy, a aba falha de forma visível.
* N+1 por sessão permanece (subcollections).
* Collection group de `exerciseExecutions` não é viável sem `patientId` no doc.
* Sessão pode ficar `scheduled` no Firestore mesmo concluída; o helper deriva conclusão pelos exercícios.
* Sem `exerciseId` ExerciseDB não há série longitudinal.
* Período só 30 / 90 / 180 dias (default 90). Sem calendário custom.
* Aba no menu continua **Estatísticas**. “Evolução” fica para decisão futura.
* Sem KPI “Aderência à prescrição” até o produto definir a fórmula.

---

## Renomear a aba?

Faz sentido no futuro chamar de **Evolução**, porque a aba agora responde “como o treino evolui no tempo”. Não foi renomeada nesta etapa.
