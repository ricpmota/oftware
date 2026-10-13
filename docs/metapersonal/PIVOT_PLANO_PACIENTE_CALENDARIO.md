# Pivot: plano no fluxo do paciente → calendário Personal

**Data:** 2026-07-27  
**Motivo:** correção de produto — o paciente não depende de personal para gravar treino; o calendário canônico é o das abas Criar / Cronograma / Hoje.

---

## Decisão

```text
Avaliação concluída
  → motor gera draft
  → paciente revisa e grava
  → trainingSessions (mesmo contrato do Criar)
  → bolinhas / Cronograma / Hoje / Iniciar treino
```

- **Não** é o personal quem autoriza a primeira gravação.
- Personal (quando houver) pode regenerar/ajustar via `WorkoutPlanDraftPreview`.
- UI paralela de `PublishedTrainingPlan` / `/meta/personal/treino` **não** aparece no paciente.

---

## O que mudou

| Antes (Etapas 12–13) | Agora |
| --- | --- |
| Publicar → `publishedTrainingPlans` | Gravar → `trainingSessions` |
| Execução em rota `/treino` | Execução no **Hoje** (já existente) |
| Painel “Meu plano” acima das abas | Removido do paciente |
| Gate liberava após `completed` | Após `completed`, revisão do plano até `patientPlanCalendar.savedAt` |

---

## Arquivos principais

- [`components/avaliacaoAtividadeFisica/AvaliacaoAtividadeFisicaGate.tsx`](../../components/avaliacaoAtividadeFisica/AvaliacaoAtividadeFisicaGate.tsx) — fluxo avaliação → revisão → Personal
- [`components/trainingPlan/PatientWorkoutPlanReview.tsx`](../../components/trainingPlan/PatientWorkoutPlanReview.tsx) — UI do paciente
- [`services/patientTrainingCalendarService.ts`](../../services/patientTrainingCalendarService.ts) — gravação
- [`lib/trainingEngine/materializeDraftToTrainingSessions.ts`](../../lib/trainingEngine/materializeDraftToTrainingSessions.ts) — mapeamento de datas/exercícios
- Campo `patientPlanCalendar` em `avaliacaoAtividadeFisica`

---

## Chaves

- Avaliação / draft: `pacientes_completos.id`
- `trainingSessions.patientId`: Auth UID (`paciente.userId`), igual à aba Criar

---

## Collections legadas

`publishedTrainingPlans` e `trainingSessionExecutions` permanecem no código (flag/off), sem UI no paciente nesta correção.

---

## Aceite

1. Paciente sem personal conclui avaliação → revisa → grava → vê treinos nas bolinhas.
2. Não há segundo calendário no Hoje.
3. Iniciar treino do Hoje usa as sessões gravadas.
4. Personal trainer ainda vê avaliação + prévia para regenerar; não bloqueia o paciente.
5. Gravação no modelo Criar: cada bloco = um nome + dias da semana (ex. Costas seg+qui; Peito ter+sex), cada um com seu `recurrenceGroupId`.
6. Após o primeiro treino gravado (ou se o personal já criou treinos), apagar séries **não** remonta treino automático — evita gravar por cima do personal.
7. Médico e personal: tela principal = abas do paciente; anamnese em “Ver anamnese”; plano gerado oculto se `patientPlanCalendar.savedAt`.
