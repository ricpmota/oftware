# Etapa 04 — Perfil do treino

**Data:** 2026-07-26  
**Base:** `docs/metapersonal/ETAPA_03_QUESTIONARIO_BASICO_AVALIACAO_ATIVIDADE_FISICA.md`

---

## Resumo

Expandimos a Avaliação Inicial para Atividade Física com preferências de treino (“Como esse paciente gosta de treinar?”), sem equipamentos, estrutura física ou dados clínicos.

- mesmos documento / collection / service da Etapa 03;
- novos campos flat em `answers`;
- novos steps após o bloco básico;
- progresso unificado (Etapa 03 + 04);
- drafts com `currentStep: basic_complete` retomam em `body_priorities` sem perder respostas.

---

## Arquivos alterados

| Arquivo | Mudança |
| --- | --- |
| `types/avaliacaoAtividadeFisica.ts` | Campos Etapa 04 + `AVALIACAO_TRAINING_PROFILE_COMPLETE_STEP` |
| `lib/avaliacaoAtividadeFisica/questionsBasic.ts` | Opções, steps de perfil, progresso total, validação |
| `components/avaliacaoAtividadeFisica/AvaliacaoAtividadeFisicaQuestionnaire.tsx` | UI dos novos steps; fim em `training_profile_complete` |
| `components/avaliacaoAtividadeFisica/AvaliacaoAtividadeFisicaGate.tsx` | Libera Personal só com `training_profile_complete` (mínimo necessário) |
| `docs/metapersonal/ETAPA_04_PERFIL_DO_TREINO.md` | Este doc |

**Não alterados (escopo):** Feature Flag, Firestore Rules, Service, `/metaadmin`, `/metapersonal`, IA, geração de treino, whitelabel.

> **Gate:** a alteração é mínima e obrigatória. Se o gate continuasse liberando em `basic_complete`, a Etapa 04 nunca seria exibida.

---

## Novos campos em `answers`

| Campo | Tipo | Notas |
| --- | --- | --- |
| `bodyPriorities` | `string[]` | Ordenado (1ª→3ª). `full_body` exclusivo |
| `preferredModalities` | `string[]` | Multi; `no_preference` exclusivo |
| `preferredIntensity` | `string \| null` | Preferência, não autorização clínica |
| `cardioPreference` | `string \| null` | |
| `preferredCardioActivities` | `string[]` | Condicional |
| `preferredCardioOther` | `string \| null` | Se `other` |
| `favoriteExercisesText` | `string \| null` | Opcional |
| `avoidedExercisesText` | `string \| null` | Opcional; motivo em etapa clínica |
| `trainingBarriers` | `string[]` | Multi; `nothing` exclusivo |
| `trainingBarrierOther` | `string \| null` | Se `other` |

Sem reorganização em `basic` / `trainingProfile` (fica para Etapa 08).

---

## Novos steps

| Step | Condicional |
| --- | --- |
| `body_priorities` | — |
| `preferred_modalities` | — |
| `preferred_intensity` | — |
| `cardio_preference` | — |
| `cardio_activities` | Se cardio ≠ `dislike` e ≠ `no_preference` |
| `favorite_exercises` | — (opcional) |
| `avoided_exercises` | — (opcional) |
| `training_barriers` | — |

Marco de fim do bloco: `currentStep: training_profile_complete` (ainda `status: draft`).

Fluxo contínuo: após `training_location` → `body_priorities` (sem desbloquear Personal).

---

## Regras de UX / validação

### Prioridades corporais
- Máximo 3 regiões (exceto `full_body` sozinho).
- `Corpo inteiro` (`full_body`) é exclusivo.
- Ordem = ordem de toque; badges 1ª / 2ª / 3ª prioridade.
- Persistido já ordenado em `bodyPriorities`.

### Modalidades
- Multi; `Não tenho preferência` (`no_preference`) exclusivo.

### Intensidade
- Preferência declarada apenas.

### Cardio
- Preferência → atividades aeróbicas (condicional).
- `Outro` exige texto.

### Exercícios
- Favoritos e evitados: texto livre opcional.

### Barreiras
- Multi; `Nada costuma atrapalhar` (`nothing`) exclusivo.
- `Outro` exige texto.

---

## Progresso

```txt
progress = (índice_step_visível + 1) / total_steps_visíveis(Etapa03 + Etapa04)
```

- `basic_complete` (marco legado) → ~ metade do total.
- `training_profile_complete` → 100%.
- Quem concluiu só a Etapa 03 continua vendo ~50% ao retomar o perfil.

---

## Compatibilidade com drafts da Etapa 03

| Situação | Comportamento |
| --- | --- |
| Draft no meio do bloco básico | Retoma no `currentStep` salvo; answers intactas |
| `currentStep = basic_complete` | Gate mostra questionário; resume → `body_priorities` |
| Refresh mid-perfil | Retoma no step salvo; merge de answers via `saveStep` |
| Answers Etapa 03 | Nunca apagadas; novos campos só acrescentam |

Sem migração, sem nova collection, sem novo documento.

---

## Critérios de aceite (checklist)

- [x] Prioridades (máx. 3, full_body exclusivo, ordem)
- [x] Modalidades (multi + no_preference exclusivo)
- [x] Intensidade
- [x] Cardio + atividades condicionais
- [x] Favoritos / evitados opcionais
- [x] Barreiras (multi + nothing exclusivo)
- [x] Draft Etapa 03 íntegro
- [x] `basic_complete` continua no perfil
- [x] Progresso unificado
- [x] Fora de escopo não alterado (service/rules/flag/IA/admin)

---

## Testes executados

Validação manual / lógica (regras no banco de perguntas + UI):

1. **Prioridades** — toques ordenam; 4º bloqueado; full_body limpa demais.
2. **Modalidades** — no_preference exclusão mútua.
3. **Intensidade** — single select persistido.
4. **Cardio** — `dislike` / `no_preference` omitem `cardio_activities`.
5. **Textos** — favoritos/evitados opcionais avançam vazios.
6. **Barreiras** — `nothing` exclusivo; `other` exige texto.
7. **Compat** — draft com answers Etapa 03 + `basic_complete` inicia perfil sem reset.
8. **Gate** — `basic_complete` não libera Personal; `training_profile_complete` libera.

---

## Próximas etapas (não nesta entrega)

Equipamentos / ambiente · clínico (dores, lesões, cirurgias) · revisão · IA / gerador (Etapa 08).
