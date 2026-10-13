# ETAPA 08B — Inteligência da carteira (MetaNutri)

Central de priorização clínica/operacional na Home do `/metanutri`. **Não** é dashboard BI. **Não** usa IA. **Não** altera a ETAPA 08A (tendência, recorrência, score, flags), o questionário V2, a semana de referência, WhatsApp, Calendário nem `/aplicacao`. Check-in Diário permanece desativado.

---

## 1. Auditoria da Home

| # | Achado |
|---|---|
| Entrada | `app/metanutri/page.tsx` → `page.v2.tsx`. Menu inicial: `home`. |
| Home anterior | Só `ProfissionalDashboardHome`: peso, tratamento, abandono, depoimentos, financeiro. Sem inteligência de Check-in Semanal. |
| Saudação | Já existe no sidebar (`Bem-vindo, {nome}`). A 08B não duplica o nome. |
| Pacientes em memória | `pacientesVisiveis` (`PacienteNutricionistaService.listPacientesVisiveisByNutri`) — vínculos **ativos**. |
| Carteira ativa | Somente `statusTratamento === 'em_tratamento'`. `pendente` / `concluido` / `abandono` continuam no dashboard existente e na lista de pacientes. |
| Desktop | Sidebar + conteúdo. KPIs da carteira em 4 colunas; atenção à esquerda; evolução positiva à direita. |
| Mobile | Bottom nav. KPIs 2×2. Listas em cards. Botão `Ver evolução` com área de toque ≥ 44px. Sem tabela larga. |
| Calendário | Continua respondendo “quem não respondeu”. Home **não** duplica pendências; só o atalho `Ver Calendário`. |
| `portfolioSignals` (08A) | `{ trend, recurringAttentionCount, latestScore }`. Insuficiente sozinho (sem flags atuais nem reasons). A 08B consome `buildWeeklyNutritionAnalytics()` completo. |

A Home existente **não foi substituída**. A visão da carteira entra **acima** do dashboard.

---

## 2. Classificação

Arquivo: `lib/nutri/checkInSemanalNutriPortfolio.ts`

```ts
classifyWeeklyNutritionPortfolioPatient(analytics)
```

Categorias **mutuamente exclusivas**:

| classification | Quando |
|---|---|
| `attention` | Qualquer condição de atenção (prevalece sobre improving/stable/insufficient). |
| `improving` | `trend === 'improving'` e sem condição de atenção. |
| `stable` | `trend === 'stable'` e sem condição de atenção. Nunca com 1 resposta. |
| `insufficient_data` | `trend === 'insufficient_data'` (0, 1 ou 2 respostas) e sem flag atual/recorrente de atenção. |

```
total = attention + improving + stable + insufficient_data
```

Tendência e recorrência **não são recalculadas**. Vêm da 08A (`WEEKLY_NUTRITION_TREND_WINDOW = 3`, recorrência nas últimas 4 respostas, mínimo 2).

---

## 3. O que eleva para atenção

Prioridade operacional (não é diagnóstico):

**Alta**

- `severe_nausea`, `severe_constipation`, `severe_diarrhea` (atual ou recorrente)

**Atenção**

- `low_adherence`, `low_protein`, `low_hydration`, `moderate_*`, `low_energy` (atual ou recorrente)

**Também atenção**

- `trend === 'declining'`
- `latestScore < 60` (limiar operacional alinhado a “score muito baixo”; preferimos a flag `low_adherence` para aderência, sem segundo threshold)

Attention **vence** improving: score 88 + tendência positiva + constipação grave recorrente → `attention`.

---

## 4. Reasons

Até 3, determinísticos, nessa ordem:

1. Flag recorrente (severa primeiro)
2. Flag severa atual
3. Tendência de piora + delta de score
4. Flags atuais de atenção (`Aderência baixa`, `Proteína baixa`, `Hidratação baixa`, …)
5. `Score baixo` se `< 60`

Nenhum texto gerado por IA.

---

## 5. priorityScore (somente ordenação; não aparece na UI)

| Sinal | Pontos |
|---|---|
| Flag severa atual | +5 |
| Flag severa recorrente | +5 |
| Moderate recorrente | +3 |
| Trend declining | +3 |
| `low_adherence` (atual ou recorrente) | +2 |
| Score `< 60` | +2 |
| Hidratação / proteína / energia baixa atual | +1 |
| Moderate atual | +1 |

Lista de atenção: top 6, ordenada por `priorityScore` (severe recorrente antes de hidratação isolada).

---

## 6. 0 / 1 / 2 respostas

| Respostas | Tendência 08A | Classificação 08B |
|---|---|---|
| 0 | `insufficient_data` | `insufficient_data` |
| 1 sem alerta | `insufficient_data` | `insufficient_data` |
| 1 com flag de atenção (ex.: náusea grave, aderência 25%) | `insufficient_data` | **`attention`** (alerta atual não é escondido) |
| 2 sem alerta | `insufficient_data` | `insufficient_data` (não vira estável) |
| 2 com flag de atenção | `insufficient_data` | **`attention`** |

---

## 7. KPIs e UI

```
Em acompanhamento | Evoluindo | Estáveis | Precisam de atenção
```

`insufficient_data` **entra no total** e aparece como texto secundário:

```
5 pacientes ainda não possuem dados suficientes para análise.
```

Percentual opcional no card Evoluindo (`57%`). Sem pizza, donut ou gauge.

**Atenção:** top 6 + “e mais N…”. Motivos do classificador. `Ver evolução` abre o mesmo `CheckInSemanalNutriEvolucao` da 08A.

**Evolução positiva:** até 3 pacientes `improving`, por maior `scoreDelta`. Sem ranking/gamificação.

**Estáveis:** só no KPI.

**Operação:** atalho `Ver Calendário`. Contagens de atrasados **não** foram copiadas (evita duplicar queries do Calendário).

Empty states:

- Nenhum `em_tratamento` → “Nenhum paciente em acompanhamento no momento.”
- Todos `insufficient_data` → “Sua carteira ainda não possui Check-ins Semanais suficientes…”
- Falha de analytics → banner na visão da carteira; o dashboard existente continua.

---

## 8. Estratégia de dados (sem N+1)

**Problema:** 100 pacientes × 52 check-ins seria N+1 inaceitável.

**Escolha:** documento derivado por nutricionista+paciente.

Não havia summary/snapshot reutilizável (último check-in não está denormalizado no paciente; analytics 08A é on-demand).

### Collection

```
nutri_weekly_portfolio_summaries/{nutritionistId}__{patientId}
```

Query da Home: **1 leitura** `where nutritionistId == uid`.

Payload derivado (não duplica histórico): `latestWeekKey`, `latestScore`, `latestAdherence`, `trend`, `trendDelta`, `scoreDelta`, `classification`, `priorityScore`, `reasons`, `recurringAttentionCount`, `updatedAt`.

Cálculo **sempre** via:

1. `buildWeeklyNutritionAnalytics(últimos 8 check-ins)`
2. `classifyWeeklyNutritionPortfolioPatient()`

Lookback 8 cobre janela de tendência (3) e recorrência (4).

### Backfill

Primeira visita: summaries ausentes são gerados em lotes de 15 (cada um lê no máximo 8 check-ins + 1 write). Depois a Home fica em 1 query.

Paciente elegível sem summary (backfill falhou) conta como `insufficient_data` para o total não furar.

Summaries de pacientes `concluido`/`abandono`/`pendente` são **ignorados** na montagem (filtro pela lista elegível em memória).

### Atualização (sem cron)

| Fluxo | Onde |
|---|---|
| Save/edit cliente (`/meta`, MetaNutri, MetaAdmin) | `saveCheckInSemanalNutri` → refresh fire-and-forget |
| Delete | `deleteCheckInSemanalNutri` → refresh |
| Link público | `saveCheckInSemanalNutriFromPublicLink` → refresh admin |
| Save do paciente sem `nutritionistId` | refresh de summaries existentes `where patientId == id` |

Falha no summary **não** falha o save clínico. Consistência eventual (refresh da Home) é aceitável.

---

## 9. Performance (~100 ativos)

| Momento | Queries |
|---|---|
| Home quente | 1 (`nutritionistId`) |
| Home fria, 100 sem summary | ~7 lotes de 15 × (1 leitura de até 8 check-ins + 1 write) |
| Save de check-in | 1 leitura lookback 8 + 1 write de summary, assíncrono |

Não há `for each patient → 52 check-ins`.

---

## 10. Mobile / desktop

| | Mobile | Desktop |
|---|---|---|
| KPIs | 2×2 | 4 colunas |
| Atenção | cards empilhados | coluna principal |
| Evolução positiva | abaixo | coluna secundária |
| Ver evolução | botão largo | botão no card |

---

## 11. Arquivos

**Criados**

- `lib/nutri/checkInSemanalNutriPortfolio.ts`
- `lib/nutri/checkInSemanalNutriPortfolio.spec.ts`
- `lib/nutri/checkInSemanalNutriPortfolioSummary.ts`
- `lib/nutri/checkInSemanalNutriPortfolioSummaryStore.ts`
- `lib/nutri/checkInSemanalNutriPortfolioSummary.server.ts`
- `components/metanutri/NutritionPortfolioOverview.tsx`
- `docs/nutri/ETAPA_08B_INTELIGENCIA_CARTEIRA_METANUTRI.md`

**Alterados**

- `app/metanutri/page.v2.tsx` — Home passa a incluir a visão da carteira acima do dashboard
- `lib/nutri/checkInSemanalNutriStore.ts` — refresh após save/delete
- `lib/nutri/checkInSemanalNutriPersist.server.ts` — refresh após link público
- `firestore.rules` — collection do summary
- `components/nutri/checkin-semanal/CheckInSemanalNutriOverlay.tsx` — `size="wide"` opcional (wizard inalterado)

**Não alterados (08A / operação)**

- `checkInSemanalNutriAnalytics.ts`, flags, score, questions, week, WhatsApp, calendário operacional, `/aplicacao`, Check-in Diário (`false`)

---

## 12. Testes

`lib/nutri/checkInSemanalNutriPortfolio.spec.ts`

- improving sem flag → improving
- stable sem flag → stable
- declining → attention
- improving + severe recorrente → attention
- 1 resposta sem alerta → insufficient_data
- 1 resposta com flag severa → attention
- 2 respostas sem alerta ≠ stable
- score `< 60` → attention
- soma das 4 categorias = total
- severe recorrente ordena antes de hidratação isolada
- só `em_tratamento` é elegível
- summary de paciente não elegível não entra
- Check-in Diário continua `false`

---

## 13. Próximos passos (fora desta etapa)

- Briefing por IA a partir dos mesmos `reasons` / `portfolioSignals` (não agora)
- Filtros Todos / Evoluindo / Estáveis / Atenção / Sem dados numa visão completa
- Contagem de check-ins atrasados na Home, se no futuro os dados do Calendário já estiverem em memória
- Índice composto só se o Firestore exigir (hoje a query é igualdade simples em `nutritionistId`)
