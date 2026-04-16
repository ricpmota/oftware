# CURSOR PROMPT — Ajuste de treinos FUTUROS no Cronograma (Agendado + bloqueado) (v4 add-on)

## Objetivo
No Cronograma/Calendário:
- **Treinos futuros** devem aparecer como **AGENDADO** (visual neutro) e **não podem ser executados**.
- Não mostrar status por exercício (✓/✗/—) em datas futuras.
- Não permitir abrir overlay de execução / botões Feito/Pulei/Desfazer em treinos futuros.
- Não alterar Firestore/services/tipos/rotas.

---

## Onde ajustar (você já tem no page.tsx)
1) `CalendarioSemanalComponent` (lista “Eventos em ...” / seção “Treinos”) — hoje mostra bolinha ✓/✗/— por exercício.
2) `CalendarioComponent` (mensal) — pode ter lógica similar de listagem/markers.
3) Clique em treino chama `onSessionClick(session)` que abre o overlay detalhado.

---

# ETAPA 1 — Detectar “dia futuro” no calendário (sem mexer em dados)
No `CalendarioSemanalComponent`, você já normaliza `hoje` (setHours 0).

1) Crie:
```ts
const dayStart = new Date(effectiveDia);
dayStart.setHours(0,0,0,0);
const isFutureDay = dayStart.getTime() > hoje.getTime();
```

> Se existir “dia selecionado” por outro nome, use a mesma variável que já alimenta “Eventos em ...”.

---

# ETAPA 2 — Status dos exercícios: só para HOJE e PASSADO
Na lista de exercícios da seção “Treinos” (onde hoje renderiza o `<span>` com ✓/✗/—):
- Se `isFutureDay === true`:
  - **não renderize** o badge de status nem o title “Feito/Pulou/Não feito”.
  - Renderize apenas um bullet neutro (ou nada) + nome + prescrição.
  - Opcional: chip pequeno “Agendado” no topo da sessão (ver etapa 3).

- Se `isFutureDay === false`:
  - mantém o status atual como está.

Aceite:
- Ao navegar para dias futuros, não aparece ✓/✗/— em nenhum exercício.

---

# ETAPA 3 — Sessão (treino) futura deve aparecer como “Agendado”
Ainda dentro do painel “Treinos” do dia:
- Se `isFutureDay === true`:
  - Mostrar chip/badge “Agendado” (neutro) ao lado do nome do treino.
  - Não usar verde/vermelho de feito/pulou.
  - Se hoje existe cálculo de “percent done”, não mostrar percent em futuro (ou mostrar “—”).

Sugestão visual:
- Badge: `text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-gray-200`

Aceite:
- Treinos futuros sempre parecem “planejados”, nunca “executados”.

---

# ETAPA 4 — Bloquear execução de treino futuro (não abrir overlay)
Você disse: “Não podendo realizar o treino futuro”.

Então:
- No click do treino em calendário/painel (onde chama `onSessionClick(session)`):
  - Se `isFutureDay === true`, **não** chamar `onSessionClick`.
  - Em vez disso:
    - abrir um toast leve “Treino agendado — disponível no dia” (ou um badge temporário).
    - ou simplesmente não fazer nada.

Se for mais fácil centralizar:
- Ajustar `handleViewSessionDetail(session)` no `PersonalPage`:
  - calcular `isFutureSession` usando a data da própria session (se ela tiver campo de data) OU passando o `isFutureDay` do calendário.
  - se futuro: return + toast.

Aceite:
- Em datas futuras, tocar no treino não abre overlay/modal de exercício.

---

# ETAPA 5 — Ícone de treino no calendário: trocar “🏋️” por “Dumbbell”
No grid do calendário semanal (onde está `🏋️` dentro do círculo):
- Trocar por:
```jsx
<Dumbbell className="w-4 h-4 text-gray-700 dark:text-gray-200" />
```
- Manter o círculo neutro (sem emoji/ilustração), mais formal.

Aceite:
- Ícone de treino é apenas o peso (Dumbbell), com estilo discreto.

---

# Checklist final
- [ ] Dia futuro => sessão mostra “Agendado”.
- [ ] Dia futuro => exercícios não exibem ✓/✗/—.
- [ ] Dia futuro => clique NÃO abre overlay (treino bloqueado).
- [ ] Ícone do treino no calendário é Dumbbell (formal).

Fim.
