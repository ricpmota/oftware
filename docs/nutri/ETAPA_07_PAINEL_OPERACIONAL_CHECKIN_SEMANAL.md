# ETAPA 07 — Painel operacional do Check-in Semanal no Calendário MetaNutri

O centro operacional continua sendo `/metanutri → Calendário`. Esta etapa não cria página `Check-ins` nem `Dashboard Nutri`. Não cria collection de slots. Não altera o questionário V2, D0/D+1, elegibilidade da ETAPA 06 nem `/aplicacao`. Check-in Diário permanece desativado.

O nutricionista responde, sem abrir paciente por paciente: quantos Check-ins há na semana, quem já respondeu, quem aguarda, quem está atrasado, estado do WhatsApp e quem precisa de atenção clínica.

---

## 1. Objetivo

Enriquecer `ProfissionalCalendarioSection` com:

- resumo da **semana nutricional atual** (segunda a domingo);
- KPIs compactos;
- filtros operacionais;
- cards diferenciados por substatus;
- ordenação útil;
- polling leve enquanto o Calendário está visível.

Fonte da verdade de “respondido”: existe `checkinsSemanais/{weekKey}`. WhatsApp enviado **não** conta como concluído.

---

## 2. KPIs

Derivados em memória a partir dos slots **já carregados** pelo hook do calendário (mês visível ∪ semana atual). Sem query extra por KPI.

| KPI | Significado |
|---|---|
| Programados (`total`) | slots elegíveis da semana atual |
| Respondidos (`completed`) | existe registro clínico |
| Aguardando (`waiting`) | dia civil = hoje e ainda sem resposta (`due_today`) |
| Atrasados (`overdue`) | `scheduledDate < hoje` e ainda sem resposta |
| Atenção (`attention`) | `completed` **e** `getWeeklyNutritionCheckInFlags()` não vazio |
| WhatsApps enviados / falhou | badges de envio; não alteram `completed` |

Só entram slots elegíveis da ETAPA 06: schedule ativo, paciente `em_tratamento`, `scheduledDate` na vigência, vínculo válido.

Se `total = 0`: copy “Nenhum Check-in Semanal programado para este período.” — sem grade de zeros.

Se todos os slots que já chegaram à data foram respondidos: “Todos os Check-ins programados até agora foram respondidos.” Sem gamificação de desempenho do nutricionista.

---

## 3. Fórmula da taxa de resposta

```text
responseRate = round( completed / dueCount * 100 )
dueCount     = slots com scheduledDate <= hoje
```

Futuros (`scheduledDate > hoje`) **não** entram no denominador.

Exemplo: 10 slots, 4 completed, 1 pendente já na data, 5 futuros → `4/5 = 80%`, não `4/10`.

Se `dueCount = 0` (só futuros), a taxa não é exibida (`null`).

---

## 4. Substatus operacional

Helper puro: `resolveWeeklyNutritionCheckInOperationalStatus`.

Não altera os status clínicos `upcoming | pending | completed`.

| Substatus | Regra | Card |
|---|---|---|
| `completed` | existe registro | verde |
| `due_today` | sem registro e `scheduledDate === hoje` | vermelho (aguardando) |
| `overdue` | sem registro e `scheduledDate < hoje` | vermelho (atrasado) |
| `upcoming` | sem registro e `scheduledDate > hoje` | laranja |

No mesmo dia, depois do horário, o KPI continua **Aguardando** (`due_today`), não Atrasado. O atraso em horas aparece só no texto via `getWeeklyCheckInDelay(scheduledAt)`.

`completed` + flags continua **verde**, com alerta interno âmbar. Status operacional ≠ status clínico.

---

## 5. Filtros

Área dos Check-ins Semanais (não duplica a busca de paciente — reutiliza `BarraBuscaCalendario`):

- Todos
- Respondidos
- Aguardando (`due_today`)
- Atrasados
- Com atenção (só `completed` com flags)

Menu secundário (select): WhatsApp Todos / Enviado / Não enviado / Falhou.

KPIs da semana **não** mudam com o filtro. O filtro só altera as listas (semana no painel direito sem dia selecionado, e lista do dia).

“Com atenção” nunca classifica pendente. Sem respostas não há aderência baixa.

---

## 6. Ordenação

`sortWeeklyNutritionCheckInOperationalSlots`:

1. atrasados
2. pendentes de hoje
3. concluídos com atenção
4. concluídos
5. futuros

Desempate: data → horário → nome. No painel de um dia específico, a lista já está restrita àquele dia e depois ordenada assim.

---

## 7. Flags

Reuso de `getWeeklyNutritionCheckInFlags()`:

`low_adherence`, `low_protein`, `low_hydration`, `moderate_nausea`, `severe_nausea`, `moderate_constipation`, `severe_constipation`, `moderate_diarrhea`, `severe_diarrhea`, `low_energy`.

No card: no máximo 3 labels + `+N`. Sem interpretação clínica nova.

O filtro “Com atenção” substitui um bloco permanente “Precisam de atenção”.

---

## 8. Cards

| Estado | Conteúdo | Ações (ETAPA 07B) |
|---|---|---|
| Futuro | nome, Check-in Semanal, dia · hora, Programado | ícones: Preencher ativo; WhatsApp no dia; Histórico |
| Aguardando | Aguardando resposta, programado | ícones no canto superior direito |
| Atrasado | Check-in atrasado, programado, `N dia(s) de atraso` | ícones no canto superior direito |
| Concluído | semana, score, aderência, proteína, água, delta, até 3 flags | corpo abre resultado; Histórico completo; convite WhatsApp desabilitado |

Ações visuais: ver `docs/nutri/ETAPA_07B_ACOES_CARD_CHECKIN_SEMANAL.md`. Sem botões textuais Preencher / Copiar link / WhatsApp.

Dificuldade principal e conquista ficam em **Ver resultado** (`CheckInSemanalNutriView`), para o card compacto não crescer.

Clique no nome abre o paciente com o mesmo `onOpenPaciente` das aplicações.

---

## 9. WhatsApp

Automação D0 + D+1 da ETAPA 06 **não muda**. Botão manual continua:

```text
ensure link → mensagem pronta → wa.me do paciente
```

Estados visíveis (ícone + texto; mobile não depende só de hover):

- Automação ativa (raio)
- `✓ WhatsApp enviado` — distinto de `✓` do check-in respondido
- `Falha no WhatsApp` — botão manual permanece
- `Paciente sem WhatsApp cadastrado`

Toggle global OFF: raio some/desliga como antes; manual continua. Log completo não entra no card.

---

## 10. Deltas

`compareWeeklyNutritionCheckIns(record, previousRecord)`.

`previousRecord` vem dos check-ins **já carregados** no intervalo (semana anterior do `weekKey`). Sem query extra.

No card compacto: só Score e Aderência (`↑ +N` / `↓ -N`).

---

## 11. Resumo diário

Ao selecionar uma data:

```text
Check-ins Semanais (N)
X respondidos · Y aguardando · Z atrasado(s)
```

Lista filtrada/ordenada. Se o filtro esvaziar a lista: “Nenhum check-in neste filtro.”

---

## 12. Resumo semanal

Painel **Check-ins da semana** acima do grid (semana nutricional corrente, independente do mês navegável).

Atualiza quando: paciente responde, nutricionista preenche, botão Atualizar, ou polling silencioso.

Sem dia selecionado, a coluna da direita lista os cards da semana corrente (já filtrados).

---

## 13. Polling

O Calendário do MetaAdmin **não** faz polling. Padrão reutilizado: intervalo + `document.visibilityState`, como em fluxos interativos existentes.

- intervalo: `WEEKLY_NUTRI_CHECKIN_POLL_MS = 25_000`
- só se o menu Calendário está montado **e** não está na vista “Dados” **e** a aba está `visible`
- chama `reload({ silent: true })` do hook atual + reload dos envios WhatsApp
- sem spinner; Atualizar continua disponível
- cleanup do `setInterval` e do `visibilitychange` no unmount (sair do menu desmonta o componente)

Não há segunda pilha de consultas. Não há polling em background fora do Calendário.

---

## 14. Performance

Intervalo carregado = `min(início do mês, início da semana atual)` … `max(fim do mês, fim da semana atual)`, mais a semana anterior para deltas.

KPIs, filtros e sort são helpers puros sobre esses slots. Sem N+1 por KPI.

Grid do mês: badge `feitos/total` com tooltip `3 de 5 check-ins respondidos`. Sem score no quadradinho.

---

## 15. Mobile

KPIs em grid 2×2: Respondidos, Aguardando, Atrasados, Atenção.

Estados de WhatsApp têm copy visível (não só `title`).

---

## 16. Desktop

Até 4 KPIs na horizontal, filtros abaixo. Sem redesign pesado do calendário.

---

## 17. Arquivos criados

- `lib/nutri/checkInSemanalNutriOperational.ts`
- `lib/nutri/checkInSemanalNutriOperational.spec.ts`
- `components/nutri/checkin-semanal/WeeklyNutritionCheckInOperationalPanel.tsx`
- `components/nutri/checkin-semanal/WeeklyNutritionCheckInOperationalCard.tsx`
- `docs/nutri/ETAPA_07_PAINEL_OPERACIONAL_CHECKIN_SEMANAL.md`

---

## 18. Arquivos alterados

- `components/profissional/ProfissionalCalendarioSection.tsx` — painel da semana, cards operacionais, resumo do dia, lista da semana sem dia selecionado, polling, tooltip do badge
- `components/nutri/checkin-semanal/useWeeklyNutritionCheckInCalendar.ts` — intervalo mês ∪ semana atual, `previousRecord`, `reload({ silent })`

Não alterados de propósito: questionário V2, rotas `/checkin-nutri`, cron D0/D+1, elegibilidade, `/aplicacao`, Check-in Diário (`CHECK_IN_DIARIO_NUTRI_ENABLED = false`).

---

## 19. Testes

`lib/nutri/checkInSemanalNutriOperational.spec.ts`:

- substatus completed / due_today / overdue / upcoming
- delay (hora / 1 dia / 2 dias)
- resumo 5 slots: 3 completed, 1 aguardando hoje, 1 overdue
- taxa 80% excluindo futuros
- WhatsApp sent/failed não altera completed
- atenção só em completed com flags
- compactação de flags (máx. 3 + extra)
- ordenação operacional
- filtros de status e WhatsApp
- polling só com calendário + documento visíveis
- Check-in Diário desativado

Regressão: specs das ETAPAS 03–06 (schedule, elegibilidade, link público).

---

## 20. Histórico pendente após o fim da vigência

Slots continuam **virtuais** (schedule + dados clínicos). Sem collection `nutri_checkin_occurrences`.

Se o último slot ficou `pending` e o tratamento terminou, o slot **deixa de ser gerado** porque a elegibilidade da ETAPA 06 não se aplica mais. O card “Não respondido” histórico **não** permanece, a menos que exista o documento clínico.

Completed antigo continua visível: o builder inclui histórico com registro mesmo fora da vigência.

Não foi criada persistência só para preservar pending histórico.

---

## 21. Próximos passos (não nesta etapa)

ETAPA 08 — Dashboard de evolução nutricional (score, aderência, proteína, água, atividade, dificuldades, conquistas ao longo do tratamento).
