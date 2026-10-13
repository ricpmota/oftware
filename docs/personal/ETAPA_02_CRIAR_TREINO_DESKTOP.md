# ETAPA 02 — Criar Treino desktop profissional

**Sistema:** operacional (`PersonalPageContent` → `trainingSessions`).  
**Não alterado:** modelo `prescription.series[]` da ETAPA 01, motor determinístico, biblioteca de treinos, técnicas avançadas, abas Hoje/Cronograma/Histórico.

**Fonte de verdade:** código atual.  
**Data:** 2026-08-16.

---

## 1. Problema anterior

No desktop, a aba `+ Criar` era o layout mobile esticado:

- catálogo em tela cheia;
- rascunho escondido no FAB;
- edição de séries só no bottom sheet.

Produtivo no celular; lento no Metapersonal desktop (já apertado por sidebar do app + pastas do paciente + aside do Personal).

---

## 2. Layout desktop novo (`lg`, ≥1024px)

```
Nome / Único|Recorrente / Data / frequência   (topo, compartilhado)

┌───────────────┬────────────────────────────┐
│ Catálogo      │ Treino sendo montado       │
│ busca+filtros │ N exercícios · M séries    │
│ lista + GIF   │ [Salvar]  ● não salvas     │
│ [+] / ✓       │ cards com séries inline    │
│               │ drag · duplicar · remover  │
└───────────────┴────────────────────────────┘
```

Proporção aproximada: `minmax(280px, 0.85fr) / minmax(320px, 1.15fr)`.

`lg:max-w-5xl` da aba Criar no desktop foi removido para o split caber no painel embutido.

---

## 3. Componentes criados

| Arquivo | Papel |
| --- | --- |
| `components/personal/create/PersonalCreateWorkoutDesktop.tsx` | Grid das duas colunas |
| `components/personal/create/ExerciseCatalogPanel.tsx` | Busca, filtros, cards (`grid` mobile / `list` desktop) |
| `components/personal/create/WorkoutBuilderPanel.tsx` | Header sticky, contador, save, DnD |
| `components/personal/create/WorkoutExerciseBuilderCard.tsx` | Card expandível + GIF + `ExerciseSeriesEditor` |
| `lib/personal/workoutDraft.ts` | `draftId`, duplicar, reordenar, contador |

`ExerciseSeriesEditor` ganhou `variant="desktop"` (espaçamento); a regra de séries continua a da ETAPA 01.

---

## 4. Estado compartilhado

Uma única fonte:

```ts
selectedExercises: SelectedExerciseDraft[]
```

Mobile (FAB + sheet) e desktop (split) editam o mesmo array e o mesmo `prescription.series[]`.

Não existe `desktopSelectedExercises`.

---

## 5. Drag-and-drop

Biblioteca já existente: `@dnd-kit/core` + `@dnd-kit/sortable` (CRM/Kanban). **Nenhuma dependência nova.**

Handle `GripVertical` (não o card inteiro), para não brigar com inputs.

Ao soltar: `reorderSelectedExercises` → o save continua usando `order = index`.

---

## 6. `draftId`

Identidade local do item no rascunho:

```ts
draftId: "draft_ex_…"
id / exerciseId: ID ExerciseDB (ex. "0025")
```

`draftId` **não** vai para o Firestore.

Necessário para duplicar o mesmo ExerciseDB duas vezes no rascunho sem colidir no React/`remove`.

GIF **nunca** usa `draftId`. Continua `resolveExerciseDbId` → `/api/exercisedb/image?resolution=360`.

---

## 7. Duplicação

- Catálogo `[+]`: continua bloqueando se já existe aquele ExerciseDB id.
- Ação **Duplicar** no card: explícita; copia metadados + séries; gera novo `draftId` e novos `series.id` (`createTrainingSeriesId`).
- A cópia entra imediatamente abaixo do original.

`createSessionWithExercises` não deduplica por `exerciseId`; cada item vira um doc na subcollection.

---

## 8. Scroll

Na aba Criar (Novo Treino) em `lg`:

- o container de conteúdo usa `overflow-hidden`;
- catálogo rola internamente;
- builder rola internamente;
- header do builder é `sticky`.

Mobile mantém o scroll de página + FAB + sheet.

---

## 9. Responsividade

```
< lg   → catálogo em grid + FAB + bottom sheet (ETAPA 01)
>= lg  → split catálogo | builder; FAB hidden (`lg:hidden`)
```

---

## 10. Save

O botão desktop chama o mesmo `handleCreateSession`.

Validações inalteradas (título, data, exercícios, custom, `validateTrainingPrescription`).

Depois do save: limpa rascunho, `isWorkoutDraftDirty = false`, vai para Cronograma.

Edição de Treinos Salvos: recria docs e apaga os antigos, como antes. No desktop o painel direito já abre preenchido (sem abrir o sheet).

---

## 11. Dirty state

`isWorkoutDraftDirty` vira `true` em título, data, recorrência, add/remove/duplicar/reordenar/série.

`false` após save e ao carregar um treino para editar.

Trocar **Novo Treino → Treinos Salvos** com dirty pede confirmação simples. Sem bloqueio de navegação do browser.

---

## 12. Read-only

`blockProfessionalMutations` / `fromMetaadminEmbedded` / `professionalReadOnly`:

- catálogo não adiciona;
- sem drag handle;
- sem duplicar/remover;
- séries `readOnly`;
- sem CTA de salvar.

Permissões não foram alteradas.

---

## 13. Testes

Automáticos: `lib/personal/workoutDraft.spec.ts` (contador, duplicar, reorder, bloqueio do catálogo).

Manuais da spec: adicionar, editar série inline, 4ª série, remover série, drag, duplicar, GIF, recorrência, editar salvo, mobile FAB, metaadmin read-only.

---

## 14. Limitações

- Sem biblioteca / puxar plano / salvar modelo (ETAPA 03).
- Sem pirâmide automática nem técnicas avançadas.
- Sem execução série a série.
- Catálogo mobile e desktop são duas instâncias CSS (`lg:hidden` / `hidden lg:grid`); a oculta usa `display:none`.
- Entre 768px e 1023px vale a experiência mobile (FAB), alinhado ao breakpoint `lg` do sistema — não ao `isMobile` de 768px já existente no arquivo.
