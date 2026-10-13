# ETAPA 04 — Cronograma e calendário do Check-in Semanal Nutri

Agendamento por paciente no MetaNutri: dia da semana + horário → slots virtuais no **Calendário** (menu operacional do `/metanutri`; não há página com o nome “Cronograma”).

Não implementado: WhatsApp, token público, cron, fila, e-mail. Questionário V2 e Check-in Diário (desativado) não foram alterados. `/aplicacao` intacto.

---

## 1. Auditoria do modelo de Aplicações (MetaAdmin)

Referência apenas — nenhum arquivo de aplicação foi modificado.

- Configuração: `pacientes_completos/{id}.planoTerapeutico` (`injectionDayOfWeek`, `startDate`, `datasAplicacaoIndividuais`).
- Slots: **virtuais em memória** via `listarAplicacoesPlanejadasNoPeriodo` / `buildSemanasEsquemaDoses`. Não existe collection de slots.
- Calendário: pacientes do médico carregados; slots filtrados pelo mês visível.
- Preenchido: match com `evolucaoSeguimento` (data ±3 dias + dose).
- Cores: verde = feito; laranja = futuro vazio; vermelho = atrasado/hoje vazio.
- Timezone do grid: `Date` civil local. Automações WhatsApp usam `lib/time/brasilTimezone.ts` (`America/Sao_Paulo`).

Padrão copiado conceitualmente: **config persistida + slots derivados + match com o registro clínico + três cores**. Sem reutilizar collections, tokens ou `evolucaoSeguimento`.

---

## 2. Arquitetura escolhida

```text
nutri_checkin_schedules/{nutritionistId}_{patientId}
        ↓
calendário pede o mês visível
        ↓
helpers calculam weekKeys (segunda→domingo) e scheduledDate
        ↓
slots virtuais (sem gravar checkinsSemanais)
        ↓
match: existe checkinsSemanais/{weekKey} ?
```

O menu `/metanutri` → **Calendário** (`ProfissionalCalendarioSection`) recebe os cards. A configuração por paciente fica na área Nutri (`CheckInSemanalNutriScheduleEditor`), aberta ao visualizar o paciente (fluxo Calendário → paciente → Nutri, ou Pacientes → Nutri).

---

## 3. Path de persistência

```text
nutri_checkin_schedules/{nutritionistId}_{patientId}
```

Uma query: `where('nutritionistId', '==', uid)`. Pertence ao par nutricionista + paciente, não ao médico.

---

## 4. Schema

```ts
{
  patientId: string
  nutritionistId: string
  enabled: boolean
  weekday: 0 | 1 | 2 | 3 | 4 | 5 | 6
  time: "HH:mm"
  timezone: "America/Sao_Paulo"
  createdAt / updatedAt: Timestamp
  createdBy: string
}
```

`enabled` ausente no documento é tratado como `false`.

---

## 5. Weekday

Convenção **JavaScript `Date.getDay()`**, centralizada em `lib/nutri/checkInSemanalNutriSchedule.ts`:

```text
0 = domingo
1 = segunda
…
6 = sábado
```

UI ordena segunda → domingo.

---

## 6. Timezone

Constante `BRASIL_TIMEZONE` em `lib/time/brasilTimezone.ts` (`America/Sao_Paulo`).

- `scheduledDate` é data civil `YYYY-MM-DD` (aritmética da semana, sem relógio).
- Status upcoming/pending compara o instante com `brasiliaWallTimeToInstant(date, time)`.

---

## 7. Cálculo de `scheduledDate`

`weekKey` = segunda da semana. Offset a partir da segunda:

```text
domingo → +6
segunda → +0
…
sábado → +5
```

Exemplo: `weekKey = 2026-08-17`, domingo → `2026-08-23`.

---

## 8. Relação com `weekKey`

Identidade clínica continua `checkinsSemanais/{weekKey}`. `scheduledDate` é só o dia do card/agendamento, nunca o ID.

---

## 9. Geração de slots

`buildWeeklyNutritionCheckInSlotsForRange` gera slots só para o intervalo do mês visível (mais a semana anterior, para virada de mês). Nada é escrito no Firestore além do schedule.

---

## 10–11. Status e match

Fonte da verdade: existência do documento `checkinsSemanais/{weekKey}` (mesmo com score 0).

```text
existe check-in → completed (prioridade)
senão scheduledAt > agora → upcoming (laranja)
senão → pending (vermelho)
```

---

## 12–13. Cards e cores

Lista **Check-ins Semanais** no painel do dia. Badge teal no grid (`feitos/total`).

| status | visual | copy |
|---|---|---|
| upcoming | laranja | Programado |
| pending | vermelho | Aguardando resposta |
| completed | verde | Score + aderência; Ver resultado |

Pendente/futuro: **Preencher Check-in** abre o wizard existente (`mode = nutritionist`). Concluído: **Ver resultado** abre `CheckInSemanalNutriView` / details da ETAPA 03.

---

## 14. Alteração de cronograma

Sem check-in: o slot da semana usa o novo dia/horário. Com check-in: o card permanece na `scheduledDate` gravada; `weekKey` / autoria não mudam.

Ao salvar um check-in novo, se ainda não houver `scheduledDate`, o store preenche com a data planejada do schedule ativo (merge da ETAPA 02 não sobrescreve valor existente).

---

## 15. Desativação

`enabled = false` não gera slots upcoming/pending. Slots **completed** daquele paciente ainda aparecem no mês (histórico). Documentos clínicos não são apagados.

Pacientes sem documento de schedule: **Não configurado** / Configurar. Nada é ativado em massa.

---

## 16. Segurança

Escrita do schedule exige vínculo ativo (`PacienteNutricionistaService.listActiveVinculosByNutri`). Só `viewerRole = nutritionist` vê o editor (`configureSchedule`). Doctor / personal / patient não configuram.

Se o vínculo for removido, o paciente some de `pacientesVisiveis` e os slots deixam de ser montados para aquele nutri (o documento de schedule pode permanecer; não opera).

---

## 17. Performance

1. Uma query de schedules do nutricionista.
2. Check-ins só dos pacientes **com schedule**, em lotes de 15, `weekKey` no intervalo do mês (~4–6 semanas). Não há N+1 por dia nem histórico completo.

---

## 18. Índices Firestore

- `nutri_checkin_schedules` + `nutritionistId ==`: índice simples automático.
- Subcollection `checkinsSemanais` + `weekKey` range: índice simples automático.
- **Nenhum collectionGroup** nesta etapa.

---

## 19. Arquivos criados

- `lib/nutri/checkInSemanalNutriSchedule.ts`
- `lib/nutri/checkInSemanalNutriScheduleStore.ts`
- `lib/nutri/checkInSemanalNutriSchedule.spec.ts`
- `components/nutri/checkin-semanal/CheckInSemanalNutriScheduleEditor.tsx`
- `components/nutri/checkin-semanal/useWeeklyNutritionCheckInCalendar.ts`
- `docs/nutri/ETAPA_04_CRONOGRAMA_CALENDARIO_CHECKIN_SEMANAL.md`

---

## 20. Arquivos alterados

- `lib/time/brasilTimezone.ts` — export `BRASIL_TIMEZONE`
- `lib/nutri/checkInSemanalNutriCapabilities.ts` — `configureSchedule`
- `lib/nutri/checkInSemanalNutriStore.ts` — preenche `scheduledDate` na criação
- `components/NutriContent.tsx` — editor no paciente (nutricionista)
- `components/profissional/ProfissionalCalendarioSection.tsx` — cards (opt-in)
- `app/metanutri/page.v2.tsx` — liga o calendário Nutri

Não alterados: `lib/aplicacao/*`, `app/aplicacao/*`, questionário V2, flag do diário.

---

## 21. Testes

`lib/nutri/checkInSemanalNutriSchedule.spec.ts`: todos os dias da semana; virada de mês e de ano; upcoming/pending/completed; prioridade do completed; disable; mudança domingo→sábado; papéis; diário off; `/aplicacao` intacto.

---

## 22. Próximos passos

- `/checkin-nutri/{token}`
- WhatsApp automático no `scheduledDate` + horário
- Cron/fila

O agendamento desta etapa já responde **quem / quando / qual weekKey / status**.
