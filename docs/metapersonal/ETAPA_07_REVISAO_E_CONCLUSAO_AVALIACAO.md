# Etapa 07 — Revisão final, resumo e conclusão da avaliação

**Data:** 2026-07-26  
**Base:** Etapas 03–06

---

## Objetivo

Concluir formalmente a Avaliação Inicial para Atividade Física: resumo estruturado, revisão por bloco, confirmação e `status: completed`.

```text
A avaliação concluída não gera treino automaticamente.
A conclusão apenas prepara uma fonte estruturada e confiável para etapas futuras.
```

---

## Arquivos criados

| Arquivo | Papel |
| --- | --- |
| `lib/avaliacaoAtividadeFisica/buildAssessmentSummary.ts` | Builder puro do summary |
| `lib/avaliacaoAtividadeFisica/summaryLabels.ts` | Labels humanos + `SAFETY_REASON_LABELS` |
| `components/avaliacaoAtividadeFisica/AvaliacaoAtividadeFisicaReview.tsx` | UI das 5 seções + editar |
| `docs/metapersonal/ETAPA_07_REVISAO_E_CONCLUSAO_AVALIACAO.md` | Este doc |

## Arquivos alterados

| Arquivo | Mudança |
| --- | --- |
| `types/avaliacaoAtividadeFisica.ts` | `AvaliacaoAtividadeFisicaSummary`, `finalConfirmationAccepted`, `completed` |
| `lib/avaliacaoAtividadeFisica/questionsBasic.ts` | Steps `final_review` / `completion_confirmation`, progresso, blocos de edição |
| `services/avaliacaoAtividadeFisicaService.ts` | `completeAssessment` idempotente |
| `AvaliacaoAtividadeFisicaQuestionnaire.tsx` | Revisão, edição por bloco, confirmação, sucesso |
| `AvaliacaoAtividadeFisicaGate.tsx` | Libera só com `status === 'completed'` |

**Não alterados:** rules, feature flag, metaadmin, metapersonal, IA, treinos, calendário, whitelabel.

---

## Modelo do summary

Estrutura versionada (`version: 1`) com blocos:

- `goalProfile`
- `routine`
- `trainingProfile`
- `environment`
- `clinicalSafety`
- `safetyAssessment` (`requiresProfessionalAttention` + `reasons[]`)

Códigos estruturados — sem textos de UI e sem IA.

---

## Builder

```ts
buildPhysicalActivityAssessmentSummary(answers, safety)
```

Puro, determinístico, arrays → `[]`, ausentes → `null`.

---

## Revisão

Cinco seções recolhíveis com labels humanos e botão Editar:

1. Objetivos e experiência → `primary_goal`
2. Rotina → `available_days`
3. Preferências → `body_priorities`
4. Ambiente → primeiro step respondível do bloco
5. Segurança → `safety_overview`

Atenção profissional: card neutro + labels de `SAFETY_REASON_LABELS` (sem códigos técnicos).

---

## Edição por bloco

Estado local `reviewBlock`. Ao terminar o último step do bloco → `final_review`.  
Não libera Personal. Não muda `status` para completed.

---

## Conclusão

`completion_confirmation` + checkbox `finalConfirmationAccepted`.

`completeAssessment`:

1. merge answers  
2. recalcula `safety`  
3. recalcula `summary`  
4. `status: completed`, `currentStep: completed`, `progressPercent: 100`, `completedAt`  
5. idempotente se já completed  

Falha → permanece na confirmação, erro inline.

---

## Gate definitivo

Libera somente se `assessment.status === 'completed'`.

Não libera: draft, `safety_complete`, `needs_review`, marcos intermediários.

Preserva: paciente only, personal/embed/metapersonal, feature flag.

---

## Progresso

Total inclui `final_review` + `completion_confirmation`.  
`safety_complete` ≈ fim do bloco clínico (não 100%).  
`completed` = 100%.

---

## Compatibilidade

| Situação | Comportamento |
| --- | --- |
| Draft 03–06 | Retoma no step |
| `safety_complete` | Abre revisão |
| Refresh mid-edição | Retoma step salvo |
| Respostas anteriores | Intactas (merge) |

---

## Testes

1. Retomadas 03–06 e `safety_complete` → review.  
2. Builder puro / labels / condicionais ocultos na UI.  
3. Editar bloco e voltar à revisão.  
4. Checkbox obrigatório; falha mantém tela.  
5. Conclusão: status/step/progress/completedAt/safety/summary.  
6. Idempotência.  
7. Gate só com completed.  
8. Sem IA / treino / metaadmin / rules.

---

## Limitações / dívidas

- Sem edição pós-conclusão nem histórico de versões.  
- Sem fluxo `needs_review` profissional.  
- Gestação ainda omitida (Etapa 06).  
- `questionsBasic.ts` concentra Etapas 03–07.

## Próximos passos

Atualizar avaliação concluída · histórico · contexto IA / gerador (Etapa 08) · revisão profissional.
