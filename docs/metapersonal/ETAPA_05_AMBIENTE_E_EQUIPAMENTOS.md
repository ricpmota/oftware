# Etapa 05 — Ambiente e equipamentos disponíveis

**Data:** 2026-07-26  
**Base:**  
- `docs/metapersonal/ETAPA_03_QUESTIONARIO_BASICO_AVALIACAO_ATIVIDADE_FISICA.md`  
- `docs/metapersonal/ETAPA_04_PERFIL_DO_TREINO.md`

---

## Resumo

Expandimos a avaliação para entender o que o paciente realmente terá disponível para treinar, usando o `trainingLocation` já coletado na Etapa 03 (sem perguntar o local de novo).

- mesmo documento / collection / service;
- novos campos flat em `answers`;
- steps condicionais por local;
- progresso unificado (Etapas 03 + 04 + 05);
- `training_profile_complete` retoma em `environment_overview`;
- gate libera temporariamente em `environment_complete`.

---

## Arquivos alterados

| Arquivo | Mudança |
| --- | --- |
| `types/avaliacaoAtividadeFisica.ts` | Campos Etapa 05 + `AVALIACAO_ENVIRONMENT_COMPLETE_STEP` |
| `lib/avaliacaoAtividadeFisica/questionsBasic.ts` | Opções, steps de ambiente, progresso, validação |
| `components/avaliacaoAtividadeFisica/AvaliacaoAtividadeFisicaQuestionnaire.tsx` | UI Etapa 05; fim em `environment_complete` |
| `components/avaliacaoAtividadeFisica/AvaliacaoAtividadeFisicaGate.tsx` | Libera Personal só com `environment_complete` |
| `docs/metapersonal/ETAPA_05_AMBIENTE_E_EQUIPAMENTOS.md` | Este doc |

**Não alterados:** collection, service, Firestore Rules, feature flag, `/metaadmin`, `/metapersonal`, compartilhamento, IA, sessões, calendário.

---

## Campos adicionados em `answers`

| Campo | Tipo | Notas |
| --- | --- | --- |
| `gymStructureLevel` | `string \| null` | full / medium / small / condo / unknown / not_chosen |
| `gymAvailableAreas` | `string[]` | `unknown` exclusivo |
| `homeTrainingSpace` | `string \| null` | |
| `availableEquipment` | `string[]` | `none` e `unknown` exclusivos |
| `availableEquipmentOther` | `string \| null` | Se `other` |
| `equipmentAccessFrequency` | `string \| null` | Só com equipamentos concretos |
| `outdoorEnvironment` | `string[]` | |
| `outdoorEnvironmentOther` | `string \| null` | Se `other` |
| `floorExerciseAvailability` | `string \| null` | Ambiente, não clínico |
| `environmentImpactNoiseRestriction` | `string \| null` | Ambiente, não clínico |
| `environmentNotes` | `string \| null` | Opcional |

Não usamos `environmentType` (já existe `trainingLocation`).  
Não usamos booleanos clínicos (`canUseFloorExercises` / `needsQuietTraining`).

---

## Steps adicionados

| Step | Condicional |
| --- | --- |
| `environment_overview` | Sempre (informativo) |
| `gym_structure` | `gym` \| `gym_and_home` \| `condo_gym` |
| `gym_areas` | idem |
| `home_space` | `home` \| `gym_and_home` |
| `available_equipment` | Sempre |
| `equipment_access` | Equipamentos concretos (≠ none/unknown) |
| `outdoor_spaces` | Somente `outdoors` |
| `floor_exercises` | Sempre |
| `environment_noise` | Sempre |
| `environment_notes` | Sempre (opcional) |

Marco: `currentStep: environment_complete` (ainda `status: draft`).

---

## Condicionais por local

| `trainingLocation` | Estrutura/áreas | Casa | Equipamentos | Outdoor |
| --- | --- | --- | --- | --- |
| `gym` | sim | — | sim | — |
| `home` | — | sim | sim | — |
| `gym_and_home` | sim | sim | sim | — (não assume externo) |
| `condo_gym` | sim | — | sim | — |
| `outdoors` | — | — | sim | sim |
| `other` | — | — | sim | — |

---

## Regras de equipamentos

- Multi seleção.
- `none` exclusivo → limpa outros + `equipmentAccessFrequency`.
- `unknown` exclusivo → limpa outros + frequência.
- `other` exige `availableEquipmentOther`.
- Frequência só aparece com equipamentos concretos.

---

## Progresso

```txt
progress = (índice_step_visível + 1) / total(Etapa03 + Etapa04 + Etapa05)
```

Marcos:

| Marco | Percentual |
| --- | --- |
| `basic_complete` | fim do bloco 03 / total |
| `training_profile_complete` | fim dos blocos 03+04 / total |
| `environment_complete` | 100% (etapas já implementadas) |

---

## Compatibilidade

| Situação | Comportamento |
| --- | --- |
| Draft no meio da Etapa 03/04 | Retoma no `currentStep`; answers intactas |
| `training_profile_complete` | Gate mostra questionário; resume → `environment_overview` |
| Refresh mid-ambiente | Retoma no step salvo |
| Answers 03/04 | Nunca apagadas; merge só acrescenta |

Sem migração, sem nova collection.

---

## Gate (mudança mínima)

Antes: liberava em `training_profile_complete`.  
Agora: libera temporariamente em `environment_complete`.

Preservado: modo paciente apenas; personal / embed / metapersonal não bloqueados; feature flag intacta.

---

## Testes executados

Validação lógica no banco de perguntas + revisão do fluxo UI:

1. Condicionais por `trainingLocation` (gym / home / gym_and_home / outdoors / other).
2. Equipamentos: none / unknown exclusivos; other exige texto; access condicional.
3. Áreas da academia: unknown exclusivo.
4. Outdoor só em `outdoors`.
5. Overview sem resposta própria avança com save.
6. Notes / favoritos opcionais.
7. Marcos de progresso recalculados com 3 blocos.
8. Gate: `training_profile_complete` não libera; `environment_complete` libera.

---

## Dívidas técnicas

```text
questionsBasic.ts agora contém Etapas 03, 04 e 05.
Avaliar renomear ou dividir somente em uma futura etapa de refatoração controlada.
```

Não renomeado nesta entrega.

---

## Fora de escopo

Dores, lesões, cirurgias, sintomas, restrições médicas, IA, geração de treino, `/metaadmin`, `/metapersonal`, service, rules, feature flag.

---

## Próximos passos

Etapa de segurança clínica → revisão → conclusão definitiva (`status: completed`) → contexto para IA / gerador.
