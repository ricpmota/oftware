# CURSOR PROMPT — Melhorar Modal Overlay do Treino (Cronograma) + Timers dentro dele (mobile-first)

Contexto
- Rota: `/personal`
- Arquivo: `page.tsx` (PersonalPage)
- Você já tem:
  - Modal overlay do calendário: `selectedSessionForDetail && <div className="fixed inset-0 bg-black/50 ..."> ...` fileciteturn13file2L34-L37
  - Botão “Iniciar treino” dentro do hero inline chamando `startWorkout(...)` fileciteturn13file7L38-L41
  - Bottom sheet “Treino em andamento” já renderizado quando `isWorkoutRunning` fileciteturn13file0L20-L27
- Objetivo: **manter o modal overlay** (você gostou) e deixá-lo mais premium mobile + incluir **Timers** (cronômetro do treino + descanso) acessíveis direto no modal.

Regras
- NÃO alterar services/Firestore/tipos/rotas/modelos.
- Manter ações Feito / Pulei / Desfazer e notas como já existem.
- Tailwind + lucide.
- Mobile-first.

---

## ETAPA 0 — Parar de duplicar UI (não mexe em regra de negócio)
Hoje existe modal overlay E também um “detalhe inline” na mesma aba Cronograma. Isso confunde e gera inconsistência.
- Mantenha o modal overlay como “fonte principal”.
- Na aba Cronograma, o bloco inline `/* Detalhe do treino inline (padrão Hoje) — sem modal */` deve virar apenas uma mensagem “Selecione um treino” OU ser removido.
- Importante: **não remova o modal overlay**.

Aceite
- Cronograma: clique em sessão abre o overlay, sem duplicação de detalhes.

---

## ETAPA 1 — Modal overlay com cara de app (mobile-first)
O modal atual está com cara de “web modal” (centered, rounded-lg).
Quero 2 comportamentos:
1) **Mobile (< md):** modal vira **bottom-sheet** (ancorado embaixo), com `rounded-t-3xl`, altura 85vh.
2) **Desktop (>= md):** mantém centralizado max-w-2xl.

Faça
- Troque o container interno:
  - mobile: `fixed inset-0 ... justify-end p-0` e sheet `h-[85vh] rounded-t-3xl`
  - desktop: `md:justify-center md:p-4` + `md:rounded-2xl md:max-w-2xl`
- Header do modal deve ser **sticky**:
  - topo com título + data
  - botão X
  - abaixo: chips status + mini progresso

Aceite
- No celular, abre como sheet bonito, desliza conteúdo com scroll interno.
- No desktop, permanece central.

---

## ETAPA 2 — Adicionar “Timer Bar” no modal (sem inventar tela nova)
Quero dentro do modal um bloco fixo (sticky) chamado **“Treino em andamento”** com 2 estados:
- Estado A: treino não iniciado → botão “Iniciar” (play) + mostra descanso padrão.
- Estado B: treino iniciado → mostra:
  - Cronômetro **count up** (tempo total do treino)
  - Botão Pausar/Continuar
  - Botão Reset (opcional)
  - Toggle som (Volume2 / VolumeX)
  - Configuração rápida do descanso (chips 30/45/60/90/120)

Implementação recomendada (leve)
- Reutilize os mesmos estados do bottom sheet, sem criar lógica duplicada:
  - `isWorkoutRunning`, `activeRunSession`, `workoutElapsedSec` (se existir)
  - `restSecondsLeft`, `isRestRunning`
  - `restDefaultSec`, `restSoundEnabled`
- Se já existe a bottom sheet, **não renderizar a bottom sheet quando o modal estiver aberto** (para não ter 2 overlays):
  - criar flag `isSessionDetailModalOpen = !!selectedSessionForDetail`
  - condicionar render do bottom sheet: `isWorkoutRunning && !isSessionDetailModalOpen`

Aceite
- Timer aparece dentro do modal e funciona.
- Não fica “modal + bottom sheet” ao mesmo tempo.

---

## ETAPA 3 — Lógica do cronômetro (count up) dentro do modal
Se ainda não existir no código:
- Criar `workoutElapsedSec` + `workoutStartAtRef` + `useEffect` com setInterval 1s
- Ao clicar “Iniciar” no modal:
  - `startWorkout(selectedSessionForDetail, firstPendingExerciseId)`
  - inicia cronômetro

Aceite
- Ao iniciar, o tempo sobe 00:01, 00:02…

---

## ETAPA 4 — Descanso (countdown) + alerta visual + som
- No modal, ao marcar um exercício como **Feito**:
  - iniciar descanso automaticamente:
    - usar `exercise.prescription.restSec` se existir
    - senão usar `restDefaultSec`
- No fim do descanso:
  - mostrar badge “Descanso finalizado”
  - tocar beep se som habilitado (Web Audio API)

Aceite
- Countdown aparece e chega em 0.
- Alerta final claro + beep (quando habilitado).

---

## ETAPA 5 — Melhorar a lista de exercícios dentro do modal (ficar igual “Hoje”)
Hoje os itens no modal estão “quadrados” (`rounded-lg` + border). fileciteturn13file4L56-L60
Quero:
- Card “Próximo exercício” no topo (media-first vertical), igual ao padrão da aba Hoje.
- A lista completa vira accordion “Ver todos”.
- Cada item compacto:
  - índice em pill pequena (não bolão)
  - nome + prescrição
  - ações Feito/Pulei em botões pequenos.

Aceite
- Modal fica com hierarquia: TimerBar -> Próximo -> Ver todos.

---

## ETAPA 6 — Micro UX (faz diferença no mobile)
- Tap fora do sheet fecha? (SIM, mas só no backdrop; não fechar ao scroll)
- Swipe down para fechar? (NÃO nesta versão, evita bug)
- Manter `max-h` + scroll interno suave.

---

## Checklist final
- [ ] Mantém overlay modal do calendário.
- [ ] Modal vira bottom-sheet no mobile.
- [ ] Timer Bar dentro do modal (count up + descanso + som + descanso padrão).
- [ ] Não existe bottom sheet simultâneo ao modal.
- [ ] Lista de exercícios com padrão “Hoje”.

Fim.
