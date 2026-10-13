# ETAPA 06 — Elegibilidade de tratamento + WhatsApp automático do Check-in Semanal Nutri

O Check-in Semanal Nutri só existe operacionalmente enquanto o paciente está **em tratamento** e a `scheduledDate` da semana cai na **vigência** derivada do plano. O MetaNutri envia o **mesmo** link da ETAPA 05 (`/checkin-nutri/{token}`) no dia e horário do cronograma de cada paciente.

Não há D-1 nesta V1. Check-in Diário permanece desativado. `/aplicacao` e o questionário V2 não foram alterados.

---

## 1. Regra de elegibilidade

Novo slot (upcoming/pending) só é gerado se:

1. `schedule.enabled = true`
2. `paciente.statusTratamento = em_tratamento`
3. `scheduledDate` está no intervalo `[treatmentStart, treatmentEnd]` (inclusive)

`enabled` é necessário, mas não suficiente.

Histórico concluído (`checkinsSemanais/{weekKey}`) **permanece** mesmo fora da vigência ou com status diferente. A regra é não gerar novos slots — não apagar histórico.

---

## 2. Status de tratamento

Enum real em `types/obesidade.ts`:

| Valor | Elegível para novos slots / WhatsApp |
|---|---|
| `em_tratamento` | sim, se estiver na vigência |
| `pendente` | não |
| `concluido` | não |
| `abandono` | não |

Não existe `pausado` nem `cancelado` no paciente. `paciente360.pausado` é outro tipo e **não** entra nesta regra.

---

## 3. Cálculo da vigência

Helper: `lib/nutri/checkInSemanalNutriTreatmentEligibility.ts`

```text
getNutritionTreatmentWindow(patient)
isWeeklyNutritionCheckInEligible({ patient, scheduledDate, hasRecord? })
```

Não existe campo canônico `dataFimTratamento`. `planoTerapeutico.startDate` / `dataInicioTratamento` alimentam o esquema de doses, mas o **fim** é derivado das ocorrências planejadas.

### Ordem

1. **Tirzepatida:** `buildSemanasEsquemaDoses` — primeira e última `dataExibicao` de semanas **não** canceladas e **não** de conclusão.
2. **Injetáveis:** `listarInjetaveisPlanejadosNoPeriodo` sobre o plano (`injetaveisAplicacoes`).
3. **Combinado:** `min(inícios)` → `max(fins)`.
4. **Fallback:** se não houver datas suficientes → `window = null` → **não elegível** (não gera cards infinitos).

Interseção semanal (V1, previsível):

> gera o slot se `scheduledDate` daquela semana está dentro da vigência.

---

## 4. Aplicações (Tirzepatida)

Usa a arquitetura já existente (`buildSemanasEsquemaDoses`). A semana de conclusão do esquema **não** entra na vigência nutricional.

---

## 5. Injetáveis

Usa `listarInjetaveisPlanejadosNoPeriodo`. Primeira e última ocorrência planejada (não cancelada) entram na união da vigência.

---

## 6. Tratamento combinado

Tirzepatida até 30/09 + injetável até 20/10 → vigência operacional até a **última** ocorrência (ex.: 20/10), desde que `statusTratamento = em_tratamento`.

---

## 7. Filtro de slots

`buildWeeklyNutritionCheckInSlotsForRange` aceita `eligibilityByPatient`.

`useWeeklyNutritionCheckInCalendar` monta a vigência de cada paciente visível e só gera upcoming/pending elegíveis.

Aplicações, injetáveis e `evolucaoSeguimento` **não** mudam. Esta regra vale só para o card nutricional.

O schedule pode permanecer `enabled = true` após o tratamento. Sem elegibilidade, não há slot novo.

---

## 8. Aba Automações (MetaNutri)

`/metanutri` → WhatsApp → Automações:

**Check-in Semanal Nutri**

> Envie automaticamente ao paciente o link do Check-in Semanal no dia e horário definido no acompanhamento nutricional.

Não há seletor de horário global neste card. Texto:

> Os envios serão realizados no dia e horário configurados no Check-in Semanal de cada paciente.

---

## 9. Toggle global

Setting em `automationDoctorSettings` (`doctorId` = uid do nutricionista).

- `automationId`: `nutri_checkin_semanal_whatsapp`
- Liberação da org: seed em `AUTOMATION_ORGANIZATION_SETTINGS_SEED` (Método)

Se o toggle estiver `false`, nenhum envio automático ocorre, mesmo com schedules ativos.

---

## 10. Schedule individual

Dia da semana + horário continuam na área Nutri do paciente (`nutri_checkin_schedules`).

Dois níveis:

```text
automação global ON
+ schedule.enabled
+ paciente em_tratamento e dentro da vigência
+ vínculo ativo
```

Paciente sem schedule não entra na fila. Paciente com schedule fora do tratamento também não.

---

## 11. WhatsApp manual

No card pending/upcoming: ícone WhatsApp (mesmo padrão visual da aplicação: raio / check / !).

1. `ensureNutriCheckInPublicLink` via `POST /api/checkin-nutri/link`
2. `buildNutriCheckInWhatsAppMessage`
3. abre `wa.me` (mesmo canal manual dos aniversariantes do MetaNutri)

**Copiar link** permanece. WhatsApp enviado **não** pinta o card de verde.

---

## 12. Mensagem

`lib/nutri/buildNutriCheckInWhatsAppMessage.ts`

D0: convite da semana + `{url}`.  
Atraso 24h: lembrete de que ainda não houve resposta + `{url}`.

Não menciona Tirzepatida nem aplicação. Primeiro nome via `primeiroNomePaciente`.

---

## 13. Fila

Motor existente: `whatsapp_automation_queue` + `processDueWhatsappAutomationQueue` (`/api/cron/send-whatsapp-lembretes`).

Enqueue: `services/whatsappNutriCheckInQueue.ts`, chamado no rebuild do nutricionista.

`scheduledFor` = `scheduledDate` da semana + `schedule.time` em `America/Sao_Paulo` (D0).  
Atraso = D0 + 1 dia, mesmo relógio.

Não há horário global da automação.

Rebuild da org passa `professionalRole` do setting — nutricionista não é mais varrido como médico.

---

## 14. D0

`milestone: d0`  
`dateKey: weekKey`  
Fila: `nutri_checkin_semanal_whatsapp_{nutriId}_{patientId}_{weekKey}_d0`

Envia exatamente no dia/horário do paciente.

---

## 15. Atraso 24h

`milestone: dplus1`  
Um único lembrete, 24h depois do D0. Sem repetição. Sem D-1.

---

## 16. Deduplicação

Id determinístico da fila existente (`buildWhatsappAutomationQueueId`).  
Ledger próprio de aplicação (`whatsapp_auto_aplicacao_envios`) **não** é usado.

Antes de enviar: se existe `checkinsSemanais/{weekKey}` → skip.

---

## 17. Revalidações do worker

No momento do envio, não se confia na fila antiga:

- org ainda libera a automação
- toggle do nutricionista ligado
- WhatsApp conectado
- schedule ainda `enabled`
- vínculo ativo (`paciente_nutricionista`)
- `statusTratamento = em_tratamento`
- `scheduledDate` ainda na vigência
- check-in da semana ainda não existe
- telefone válido (sem telefone → skip daquele item, worker segue)

---

## 18. Badges

Card Nutri reutiliza `CalendarioWhatsAppAplicacaoIcon`:

- raio: automação global ativa
- check: item da fila `sent`
- !: `failed`

Texto discreto `✓ WhatsApp enviado` no card **pending**. Status clínico continua pending até existir o documento da semana.

---

## 19. Arquivos criados

- `lib/nutri/checkInSemanalNutriTreatmentEligibility.ts`
- `lib/nutri/checkInSemanalNutriTreatmentEligibility.spec.ts`
- `lib/nutri/checkInSemanalNutriWhatsApp.ts`
- `lib/nutri/buildNutriCheckInWhatsAppMessage.ts`
- `lib/nutri/checkInSemanalNutriYmd.ts`
- `lib/nutri/planNutriCheckInWhatsAppQueue.ts`
- `lib/nutri/planNutriCheckInWhatsAppQueue.spec.ts`
- `lib/nutri/shouldSendNutriCheckInWhatsApp.ts`
- `lib/nutri/shouldSendNutriCheckInWhatsApp.spec.ts`
- `lib/nutri/openNutriCheckInWhatsApp.ts`
- `services/whatsappNutriCheckInQueue.ts`
- `app/api/metanutri/automacoes/whatsapp-queue/rebuild-patient/route.ts`
- `app/api/metanutri/automacoes/checkin-envios/route.ts`
- `docs/nutri/ETAPA_06_WHATSAPP_AUTOMATICO_CHECKIN_SEMANAL.md`

---

## 20. Arquivos alterados

- `lib/nutri/checkInSemanalNutriSchedule.ts` — filtro `treatmentEligible`
- `components/nutri/checkin-semanal/useWeeklyNutritionCheckInCalendar.ts`
- `components/nutri/checkin-semanal/CheckInSemanalNutriScheduleEditor.tsx` — rebuild da fila ao salvar
- `components/profissional/ProfissionalCalendarioSection.tsx` — WhatsApp + badges
- `lib/metaadmingeral/automationCenterCatalog.ts`
- `lib/metaadmingeral/automationCenterTemplates.ts`
- `lib/metaadmingeral/automationOrganizationSettings.ts`
- `lib/metaadmingeral/automationDoctorGovernance.ts`
- `services/automationDoctorSettingsService.ts`
- `services/whatsappRemindersService.ts` — fila + worker (branch Nutri, **nunca** `ensureAplicacaoPublicUrl` neste automationId)
- `app/api/metanutri/automacoes/settings/route.ts`
- `app/api/checkin-nutri/[token]/atualizar/route.ts` — skip da fila ao responder
- `components/metaadmin/MetaAdminDoctorAutomationsPanel.tsx`
- `components/metaadmin/WhatsappMessageLogPanel.tsx`
- `services/automationCenterLogsService.ts`
- `types/automationCenter.ts`
- `types/whatsappMessageLog.ts`

---

## 21. Testes

Elegibilidade: em tratamento + dentro; antes do início; depois do fim; `concluido`; `abandono`; sem datas; combinado Tirzepatida+injetável; calendário de setembro vazio se o tratamento termina em agosto; histórico `hasRecord` permanece.

Fila: D0 + atraso 24h; já respondido não enfileira; schedule off / concluído não enfileira.

Worker (puro): automação off; schedule off; fora da vigência; vínculo removido; sem telefone; já respondido.

Check-in Diário: flag continua `false` nos specs das etapas anteriores.

---

## 22. Próximos passos

- D-1 (fora desta V1)
- Template editável específico do atraso (hoje o worker usa o helper `atrasado`)
- Rebuild automático ao mudar o plano terapêutico do médico (hoje a vigência é relida no worker e no calendário)
- Chip de filtro de logs só para Check-in Nutri
