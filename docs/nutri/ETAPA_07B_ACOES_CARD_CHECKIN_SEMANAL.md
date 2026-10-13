# ETAPA 07B — Ações em ícones no card de Check-in Semanal

Ajuste pontual de UX no Calendário do MetaNutri. Não altera KPIs, filtros, polling, elegibilidade, D0/D+1, questionário, links públicos nem `/aplicacao`.

---

## 1. Referência MetaAdmin

Cards de aplicação em `ProfissionalCalendarioSection`:

- header `flex items-center justify-between`
- nome à esquerda
- ícones à direita: `gap-1.5` (mobile) / `gap-2` (desktop)
- ícone visual 16px mobile / 18px desktop
- área: `p-1.5 rounded-md` mobile, `p-2 rounded-lg` desktop
- `title` + `aria-label`
- futuro: ícone visível e desabilitado, sem clique silencioso

O card Nutri copia posição, tamanho, spacing e disabled. Não copia seringa nem ações clínicas da aplicação.

---

## 2. Novos ícones (Lucide)

| Ordem | Ícone | `aria-label` / `title` | Ação |
|---|---|---|---|
| 1 | `ClipboardList` | Preencher Check-in | `CheckInSemanalNutriView` `intent=create` `mode=nutritionist` |
| 2 | `MessageSquare` (`CalendarioWhatsAppAplicacaoIcon`) | Enviar pelo WhatsApp | `openNutriCheckInWhatsApp` → `ensure` link → `buildNutriCheckInWhatsAppMessage` → `wa.me` |
| 3 | `History` | `Evolução Nutricional` | `CheckInSemanalNutriEvolucao` do paciente |

Sem emoji. Sem texto abaixo dos ícones.

---

## 3. Regras por status

Helper: `resolveWeeklyNutritionCheckInCardActions`.

| Status | Preencher | WhatsApp convite | Histórico |
|---|---|---|---|
| pending / due_today / overdue | ativo | ativo se houver telefone | ativo |
| upcoming | ativo (política anterior do card) | desabilitado: “Disponível no dia do Check-in” | ativo |
| completed | desabilitado: “Check-in já respondido” | desabilitado: não reenvia convite | ativo |

Clique no **corpo** do card completed abre o resultado daquela semana (`intent=view`). Clique no **nome** continua abrindo o paciente.

---

## 4. WhatsApp manual

Inalterado:

```text
ensureNutriCheckInPublicLink
→ buildNutriCheckInWhatsAppMessage
→ wa.me do telefone do paciente
```

Sem modal. Sem botão Copiar link. Token idempotente da ETAPA 05 permanece.

- sem telefone: ícone desabilitado + “Paciente sem WhatsApp cadastrado”
- falha automática (`!`): manual continua ativo
- automação global OFF: manual continua
- completed: ícone de convite desabilitado

Badges (raio / check / `!`) continuam no ícone de mensagem. São estado, não ação.

---

## 5. Remoção de Copiar link

Removido só o controle visual do card.

Continuam: `nutri_checkin_links`, `ensureNutriCheckInPublicLink`, `/checkin-nutri/{token}`, WhatsApp automático e manual.

---

## 6. Histórico / Evolução Nutricional

O ícone History abre a **Evolução Nutricional** (`CheckInSemanalNutriEvolucao`, ETAPA 08A).

O calendário de semanas (`CheckInSemanalNutriHistorico`) permanece **dentro** dessa visão. Clique numa semana ou em “Ver detalhes” abre `CheckInSemanalNutriView` `intent=view`.

---

## 7. Mobile

Ícone 16px, área mínima ~36px (`min-h/min-w-[36px]`). Copy visível para falha e ausência de telefone (não depende só de hover).

---

## 8. Acessibilidade

Cada ícone tem `title` e `aria-label`. Desabilitados não disparam a ação. `CalendarioWhatsAppAplicacaoIcon` usa o `title` como `aria-label`.

---

## 9. Arquivos alterados

- `lib/nutri/checkInSemanalNutriOperational.ts` — `resolveWeeklyNutritionCheckInCardActions`
- `lib/nutri/checkInSemanalNutriOperational.spec.ts`
- `components/nutri/checkin-semanal/WeeklyNutritionCheckInOperationalCard.tsx`
- `components/profissional/ProfissionalCalendarioSection.tsx`
- `components/metaadmin/CalendarioWhatsAppAplicacaoIcon.tsx` — `aria-label` a partir do `title`
- `docs/nutri/ETAPA_07B_ACOES_CARD_CHECKIN_SEMANAL.md`

---

## 10. Testes

`ETAPA 07B — ações do card`: pending, overdue, upcoming, completed, sem telefone, falha automática, automação off, `wa.me` com `/checkin-nutri/{token}`.
