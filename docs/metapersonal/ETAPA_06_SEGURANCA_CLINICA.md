# Etapa 06 — Segurança clínica, dores, lesões e sintomas

**Data:** 2026-07-26  
**Base:** Etapas 03, 04 e 05 (`docs/metapersonal/ETAPA_0{3,4,5}_*.md`)

---

## Objetivo

Coletar informações de segurança (dor, lesão, cirurgia, sintomas, restrições) para adaptar o futuro treino e sinalizar necessidade de revisão profissional.

```text
Esta etapa coleta informações e cria sinais de atenção.
Ela não realiza diagnóstico, liberação clínica ou contraindicação definitiva.
```

---

## Arquivos alterados

| Arquivo | Mudança |
| --- | --- |
| `types/avaliacaoAtividadeFisica.ts` | Campos clínicos + `AVALIACAO_SAFETY_COMPLETE_STEP` + reason codes |
| `lib/avaliacaoAtividadeFisica/buildSafetyAssessment.ts` | Função pura `buildSafetyAssessment` |
| `lib/avaliacaoAtividadeFisica/questionsBasic.ts` | Steps/opções/progresso/validação Etapa 06 |
| `services/avaliacaoAtividadeFisicaService.ts` | `saveStep` aceita `safety` opcional; limpezas condicionais |
| `components/.../AvaliacaoAtividadeFisicaQuestionnaire.tsx` | UI clínica + confirmação + mensagens |
| `components/.../AvaliacaoAtividadeFisicaGate.tsx` | Libera em `safety_complete` |
| `docs/metapersonal/ETAPA_06_SEGURANCA_CLINICA.md` | Este doc |

**Não alterados:** feature flag, rules, `/metaadmin`, `/metapersonal`, compartilhamento, IA, treinos, calendário.

---

## Campos adicionados

Dor: `currentPainLevel`, `painRegions`, `painRegionOther`, `painTriggers`, `painTriggerOther`, `painFunctionalImpact`  
Lesão: `hasRelevantInjury`, `injuryDetails`, `injuryCurrentlyLimitsMovement`  
Cirurgia: `hasRelevantSurgery`, `surgeryDetails`, `surgeryTiming`  
Movimento: `movementLimitations`, `movementLimitationOther`  
Sintomas: `balanceFallHistory`, `shortnessOfBreathOnLightEffort`, `chestSymptomsDuringEffort`, `dizzinessOrFaintingDuringEffort`, `palpitationsDuringExercise`  
Orientação: `uncontrolledBloodPressureAdvice`, `hasProfessionalExerciseRestriction`, `professionalExerciseRestrictionDetails`  
Outros: `additionalSafetyNotes`, `safetyAnswersConfirmed`  
Reservado: `pregnancyStatusForExercise` (não perguntado nesta entrega)

---

## Steps

`safety_overview` → `current_pain` → (condicionais de dor) → `relevant_injury` → (condicionais) → `relevant_surgery` → (condicionais) → `movement_limitations` → `balance_falls` → `shortness_of_breath` → `chest_symptoms` → `dizziness_fainting` → `palpitations` → `blood_pressure_advice` → `professional_restriction` → (detalhes) → `additional_safety_notes` → `safety_confirmation` → `safety_complete`

### Condicionais

| Gatilho | Steps extras |
| --- | --- |
| dor ≠ `none` | regiões, gatilhos, impacto |
| lesão recovered/recovering/current | detalhes + limitação de movimento |
| cirurgia ≠ `no` | detalhes + tempo |
| restrição profissional ≠ `no` | detalhes obrigatórios |

### Gestação

**Não implementada.** O Gate/Questionnaire não recebem `sexoBiologico` com regra segura. Campo reservado no tipo; evoluir quando o filtro puder ser determinado sem presumir gênero pelo nome.

### Mapa corporal

Seleção por lista (sem mapa gráfico). Evolução futura.

---

## Objeto `safety`

```ts
buildSafetyAssessment(answers) → {
  requiresProfessionalAttention: boolean;
  reasons: string[]; // códigos estruturados, sem duplicata
}
```

Persistido via `saveStep({ safety })` durante o bloco clínico e na conclusão.

### Critérios (exemplos de códigos)

| Condição | Código |
| --- | --- |
| Dor forte | `severe_current_pain` |
| Dor impede atividades | `pain_prevents_activities` |
| Lesão atual/recuperação | `active_injury` |
| Lesão limita movimento | `injury_limits_movement` |
| Cirurgia &lt; 6 meses | `recent_surgery` |
| Limitações de movimento | `movement_limitation` |
| Desequilíbrio frequente | `frequent_balance_problem` |
| Queda no último ano | `recent_fall` |
| Dispneia frequente / repouso | `shortness_of_breath_*` |
| Sintomas torácicos atuais | `chest_symptoms` |
| Tontura frequente / quase-desmaio / desmaio | `dizziness_or_fainting` |
| Palpitações frequentes | `frequent_palpitations` |
| PA descontrolada (orientação) | `uncontrolled_blood_pressure_advice` |
| Restrição profissional | `professional_exercise_restriction` |

Texto livre **não** gera atenção automaticamente (sem regex/IA).

---

## Mensagens de interface

Se `requiresProfessionalAttention`:

- mensagem neutra de revisão profissional;
- se peito/dispneia em repouso, desmaio ou dor forte → orientação reforçada para procurar atendimento (sem diagnóstico).

Confirmação: “Preciso revisar” volta ao `safety_overview` preservando respostas.

---

## Progresso

```txt
(índice + 1) / total(Etapa03 + 04 + 05 + 06)
```

Marcos: `basic_complete` · `training_profile_complete` · `environment_complete` · `safety_complete` (= 100% das etapas implementadas).  
`status` permanece `draft`.

---

## Compatibilidade

| Situação | Comportamento |
| --- | --- |
| Draft 03/04/05 | Retoma no step; answers intactas |
| `environment_complete` | Resume → `safety_overview` |
| Refresh mid-segurança | Retoma step salvo |
| Conclusão | `safety_complete` + `safety` calculado |

---

## Gate

Libera Personal temporariamente em `safety_complete` (antes: `environment_complete`).  
Preserva: paciente only, personal/embed/metapersonal, feature flag.

---

## Testes

1. Condicionais de dor/lesão/cirurgia/restrição + limpezas.
2. `buildSafetyAssessment` puro, multi-razões, sem flags em respostas negativas.
3. Confirmação → review volta ao overview.
4. Gate não libera em `environment_complete`.
5. Retomada `environment_complete` → `safety_overview`.
6. Mensagem reforçada só em sintomas intensos/repouso/desmaio.

---

## Limitações / dívidas

- Gestação omitida até filtro biológico seguro.
- Sem mapa corporal gráfico.
- `questionsBasic.ts` concentra Etapas 03–06 (dívida de rename/split).
- Texto livre não marca atenção automaticamente.

---

## Fora de escopo

Diagnóstico · liberação clínica · IA · geração de treino · metaadmin · metapersonal · rules · feature flag.

## Próximos passos

Revisão final → `status: completed` → contexto para IA / gerador.
