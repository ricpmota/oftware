# Etapa 03 — Questionário básico, rascunho e retomada

**Data:** 2026-07-26  
**Base:** `docs/metapersonal/ETAPA_02_FUNDACAO_AVALIACAO_ATIVIDADE_FISICA.md`

---

## Resumo

Implementada a primeira versão funcional da Avaliação Inicial para Atividade Física em `/meta/personal`:

- tipos + collection `avaliacaoAtividadeFisica/{patientId}`;
- serviço de draft / saveStep;
- questionário do bloco básico (objetivos → local);
- retomada por `currentStep` + `answers`;
- gate somente no modo paciente, atrás da feature flag;
- rules específicas (com ressalva do fallback global).

---

## Arquivos criados

| Arquivo | Papel |
| --- | --- |
| `types/avaliacaoAtividadeFisica.ts` | Tipos + nome da collection + `basic_complete` |
| `services/avaliacaoAtividadeFisicaService.ts` | `getByPatientId`, `createDraft`, `saveStep` |
| `lib/avaliacaoAtividadeFisica/questionsBasic.ts` | Opções, steps visíveis, validação |
| `components/avaliacaoAtividadeFisica/AvaliacaoAtividadeFisicaQuestionnaire.tsx` | UI one-step |
| `components/avaliacaoAtividadeFisica/AvaliacaoAtividadeFisicaGate.tsx` | Gate + feature flag |
| `docs/metapersonal/ETAPA_03_QUESTIONARIO_BASICO_AVALIACAO_ATIVIDADE_FISICA.md` | Este doc |

## Arquivos modificados

| Arquivo | Mudança |
| --- | --- |
| `app/meta/personal/page.tsx` | Envolve `appShell` com `AvaliacaoAtividadeFisicaGate` (incl. portal fullscreen) |
| `firestore.rules` | Matcher `avaliacaoAtividadeFisica/{patientId}` |

**Não alterados:** `/whitelabel`, compartilhamento personal, `/metapersonal`, geração de treino, Etapa 01 painel.

---

## Modelo do documento

```txt
avaliacaoAtividadeFisica/{patientId}
```

`patientId` = id em `pacientes_completos`. Campos principais:

```ts
{
  id, patientId, userId, organizationId,
  status: 'draft' | 'completed' | 'needs_review',
  version: 1,
  currentStep, progressPercent,
  answers: AvaliacaoAtividadeFisicaBasicAnswers,
  safety: { requiresProfessionalAttention: false, reasons: [] },
  summary: null,
  startedAt, updatedAt, completedAt,
  createdBy: 'patient',
  lastUpdatedBy: 'patient'
}
```

### Convenção duração

“Mais de 90 minutos” → `sessionDurationMinutes: 100`.

### Fim do bloco básico

`currentStep: 'basic_complete'` + `progressPercent: 100` (ainda `status: 'draft'` até Etapa 06).

---

## Perguntas implementadas

| Step | Condicional |
| --- | --- |
| `primary_goal` (+ other text) | — |
| `secondary_goals` (máx. 3 / none exclusivo) | oculta objetivo principal |
| `experience` | — |
| `current_activity` | — |
| `current_activity_details` | só se `currentlyActive === true` |
| `current_frequency` | só se ativo |
| `available_days` | — |
| `preferred_days` (+ rotina variável) | limite = availableDays |
| `session_duration` | — |
| `duration_consistency` | — |
| `preferred_time` (+ time opcional) | — |
| `training_location` (+ other text) | — |

Não perguntados: equipamentos, dores, lesões, intensidade, cardio, etc.

---

## Salvamento (draft)

1. **Começar** → `createDraft` (idempotente se já existir).
2. **Continuar** → valida → `saveStep` merge de `answers` + `currentStep` = próximo + `progressPercent`.
3. Não salva a cada tecla; botão desabilitado + spinner durante save.
4. Erro: permanece na etapa com mensagem inline.

---

## Retomada

- Sem documento → saudação “Começar”.
- Draft (não `basic_complete`) → “Continuar avaliação” com answers + `currentStep`.
- `basic_complete` ou `completed` → Personal normal.
- Progresso no backend → refresh / outro dispositivo recupera.

---

## Gate e feature flag

```txt
NEXT_PUBLIC_PHYSICAL_ACTIVITY_ASSESSMENT_ENABLED=true
```

Padrão do repo: comparação estrita `=== 'true'`.

Gate **não** aplica se:

- flag ausente/false;
- `isPersonalTrainerMode`;
- `fromMetapersonal` / embed;
- sem `patientId` / `userId`.

Posição: após auth + paciente + `medicoResponsavelId`, envolvendo o shell (incluindo `createPortal` fullscreen).

---

## Firestore rules

Matcher dedicado com create/read/update pelo `userId` do dono; bloqueia mudança de `patientId` / `userId` / `createdBy`.

**Ressalva:** o fallback `match /{document=**} { allow read, write: if request.auth != null }` ainda faz OR com qualquer rule. A proteção forte completa exige reforma do fallback (fora do escopo). O matcher documenta a intenção e vale quando o fallback for restringido.

---

## Testes

### Estáticos / linter

Sem erros reportados nos arquivos novos e no `page.tsx` alterado.

### Checklist manual (flag ON)

1. Paciente sem doc → welcome com primeiro nome / fallback.  
2. Começar cria draft.  
3. Validações e condicionais.  
4. Continuar salva e avança.  
5. Refresh retoma.  
6. Bloco básico → “Ir para o Personal”.  
7. `/metapersonal?view=personal&pacienteId=` sem questionário.  
8. Flag OFF → Personal atual intacto.

---

## Limitações

- Sem `completed` formal (Etapa 06).
- Sem UI médico/personal (Etapa 07).
- Sem equipamentos / segurança clínica (04–05).
- Sem IA / geração de treino (08–09).
- Rules ainda sob influência do fallback global.

---

## Próximos passos (Etapa 04)

Ambiente, equipamentos, prioridades corporais, modalidade, intensidade, cardio, preferências/rejeições, barreiras — estendendo `answers` e o banco de steps sem quebrar o draft atual.
