# ETAPA 08A — Evolução Nutricional Individual (MetaNutri)

Visão individual do paciente: como ele está evoluindo nutricionalmente. **Não** é o dashboard da carteira (ETAPA 08B). Não usa IA. Não cria collection. Não altera questionário V2, score, WhatsApp, D0/D+1, elegibilidade nem `/aplicacao`. Check-in Diário permanece desativado.

---

## 1. Auditoria

| # | Achado |
|---|---|
| Área individual | Modal do paciente no MetaNutri → aba Nutrologia → `NutriContent` (`embedded`). Abas: Plano Nutri, Cardápio, **Evolução Nutricional** (antes Histórico), ChatNutri. |
| Abrir paciente | `handleVisualizarPaciente(paciente, 8)` em `app/metanutri/page.v2.tsx`. |
| Histórico anterior | `CheckInSemanalNutriHistorico`: calendário Mon→Dom com faixa da semana respondida. Continua **dentro** da Evolução. |
| Ícone History (07B) | Overlay do Calendário. Passa a abrir `CheckInSemanalNutriEvolucao` (mesmo componente da aba do paciente). |
| Persistência | `pacientes_completos/{id}/nutricao/dados/checkinsSemanais/{weekKey}` via `loadWeeklyNutritionCheckIns`. |
| Campos V2 reais | `aderenciaPlano`, `diasProteinaMeta`, `diasFrutasVegetais`, `alimentacaoForaPlano`, `diasMetaAgua`, GI (`nauseas`/`constipacao`/`diarreia`), `energiaSemana`, `sessoesAtividadeFisica`, `principalDificuldadeTipo` + `Outra`, `principalConquistaTipo` + `Outra`, `observacoes`. Sono/suplementos são só V1. |
| Score | `calcularScoreCheckInSemanalNutri` — **não alterado**. |
| Aderência | Slider persistido 0–100 (`aderenciaPlano`). |
| Flags | Somente `getWeeklyNutritionCheckInFlags()`. |
| Deltas 08A | Última respondida vs respondida imediatamente anterior (pula semana sem resposta). Nunca score 0 fictício. |
| Semana de tratamento | `calcularSemanaAtualTratamento(paciente)` a partir de `planoTerapeutico.startDate`. Omitida se não houver startDate. |
| Gráficos | Projeto já usa **recharts**. MetaNutri/Calendário já importam `LineChart`/`BarChart`. |
| Desktop/mobile | NutriContent: sidebar vs abas empilhadas. Evolução: KPIs 4 colunas / 2×2. |
| Query | Um paciente, `pageSize: 52`. Sem N+1 da carteira. O calendário interno continua buscando o mês visível. |

**Semana de referência do preenchimento** (correção desta etapa): segunda a sábado o check-in descreve a **semana anterior**; no domingo, a semana que está fechando (alinha D0/card de domingo). Helpers: `getNutritionCheckInReferenceWeek`, `isNutritionCheckInFillableWeek`. O `weekKey` do slot do calendário **não** muda.

---

## 2. Arquitetura

```
HOME METANUTRI     → carteira (08B futura)
CALENDÁRIO         → operação
PACIENTE           → Evolução Nutricional (08A)
```

```
History / aba Evolução
        ↓
CheckInSemanalNutriEvolucao
        ↓
buildWeeklyNutritionAnalytics(checkIns)   // puro
        +
CheckInSemanalNutriHistorico              // calendário
        +
CheckInSemanalNutriView intent=view       // Ver detalhes
```

Cálculo fora do JSX. A mesma camada alimentará a 08B.

---

## 3. Acesso

| Origem | Destino |
|---|---|
| Calendário → ícone History | overlay com `CheckInSemanalNutriEvolucao` |
| Paciente MetaNutri → aba Evolução Nutricional | mesmo componente (`activeTab === 'historico'`) |
| MetaAdmin / MetaPersonal | mesma aba, somente leitura (`capabilities.create === false`) |

Não foi criada `/metanutri/dashboard-paciente/[id]`.

---

## 4. Analytics

`lib/nutri/checkInSemanalNutriAnalytics.ts`

`buildWeeklyNutritionAnalytics(checkIns)` ordena por `weekKey` e ignora semanas sem documento.

Retorno conceitual: `latest`, `previous`, `deltas`, `trend`, `scoreSeries`, `adherenceSeries`, `habits`, `attentionFlags`, `difficulties`, `otherDifficulties`, `achievements`, `otherAchievements`, `history`, `portfolioSignals`.

`portfolioSignals` expõe `trend`, `recurringAttentionCount` e `latestScore` para a 08B. **Não** classifica a carteira (`evoluindo` / `estável` / `precisa de atenção`) nesta etapa.

---

## 5. latest / previous

- `latest` = última resposta (`weekKey` mais recente).
- `previous` = resposta imediatamente anterior na lista de **respondidas**.
- Se S2 não existe, previous de S3 é S1.

---

## 6. Deltas

Comparar última respondida vs anterior respondida:

| Indicador | Campo V2 |
|---|---|
| Score | `score` |
| Aderência | `aderenciaPlano` |
| Hidratação | `diasMetaAgua` (`n/7`) |
| Atividade | `sessoesAtividadeFisica` (`Nx`; 8 → `7+x`) |
| Proteína | `diasProteinaMeta` |
| Energia | `energiaSemana` (`n/5`) |

Uma resposta: delta `null`. Não inventar valores.

---

## 7. Tendência

Janela: **últimas 3 respostas** (`WEEKLY_NUTRITION_TREND_WINDOW`).

| Respostas | Resultado |
|---|---|
| 0–2 | `insufficient_data` (“Dados ainda insuficientes”; 1 resposta: “Primeiro Check-in registrado”) |
| 3+ | `último − primeiro` da janela: `≥ +4` → `improving`; `≤ −4` → `declining`; senão `stable` |

Regra determinística, sem IA.

---

## 8. Score

Série só com semanas respondidas e `score` numérico. Eixo Y 0–100. Semana sem resposta **não** entra como 0. Tooltip: semana (S1…), período, score.

---

## 9. Aderência

Série das respostas com `aderenciaPlano`. Barras compactas (não segundo gráfico 3D). Sem zero fictício para semana pulada.

---

## 10. Hábitos

Campos reais: proteína (`diasProteinaMeta`), hidratação (`diasMetaAgua`), atividade (`sessoesAtividadeFisica`), energia (`energiaSemana`). Valor atual + delta + mini sparkline das respostas existentes.

---

## 11. Flags

Somente IDs de `getWeeklyNutritionCheckInFlags`:

`low_adherence`, `low_protein`, `low_hydration`, `moderate_nausea`, `severe_nausea`, `moderate_constipation`, `severe_constipation`, `moderate_diarrhea`, `severe_diarrhea`, `low_energy`.

Não é diagnóstico. É recorrência observada.

---

## 12. Recorrência

Helper: `buildWeeklyNutritionAttentionTrends(checkInsNewestFirst)`.

- Janela: **últimas 4 respostas** (`WEEKLY_NUTRITION_ATTENTION_WINDOW`).
- `recurring = occurrences >= 2` (`WEEKLY_NUTRITION_RECURRING_MIN`).
- Isolado (1/4): badge simples.
- Recorrente: destaque “Recorrente · 3 das últimas 4 respostas”.

Problema de 5 meses atrás fora da janela **não** vira alerta atual. O histórico completo continua na lista/calendário.

---

## 13. Dificuldades

Agrega `principalDificuldadeTipo` em todo o histórico carregado, exceto `sem_dificuldade`. Ordena por frequência.

---

## 14. Conquistas

Igual, com `principalConquistaTipo`, exceto `sem_conquista`.

---

## 15. “Outra”

Textos livres **não** viram um único balde “Outra”. Cada texto aparece em “Outras dificuldades relatadas” / “Outras conquistas relatadas”. Sem NLP.

---

## 16. Histórico

Lista decrescente (mais recente primeiro) com score, delta vs respondida anterior e **Ver detalhes** → `CheckInSemanalNutriView` `intent=view`.

Abaixo: `CheckInSemanalNutriHistorico` (calendário), reutilizado.

---

## 17. Empty states

| Respostas | UI |
|---|---|
| 0 | “Ainda não há Check-ins Semanais suficientes…” |
| 1 | KPIs sem delta; “Primeiro Check-in registrado”; tendência insuficiente |
| 2 | Deltas ok; tendência “Dados ainda insuficientes” |
| 3+ | Tendência calculada |

---

## 18. Responsividade

Desktop: KPIs em linha, gráfico amplo, blocos em duas colunas (dificuldades/conquistas). Mobile: KPIs 2×2, gráfico `ResponsiveContainer`, seções empilhadas. Nada depende só de hover (títulos, valores e deltas visíveis).

---

## 19. Performance

Busca só o paciente aberto (`loadWeeklyNutritionCheckIns`, 52). Calendário interno busca o mês. Sem varrer a carteira.

---

## 20. Arquivos criados

- `lib/nutri/checkInSemanalNutriAnalytics.ts`
- `lib/nutri/checkInSemanalNutriAnalytics.spec.ts`
- `components/nutri/checkin-semanal/CheckInSemanalNutriEvolucao.tsx`
- `docs/nutri/ETAPA_08A_EVOLUCAO_NUTRICIONAL_INDIVIDUAL.md`

---

## 21. Arquivos alterados

- `lib/nutri/checkInSemanalNutriWeek.ts` — semana de referência do preenchimento
- `lib/nutri/canEditWeeklyNutritionCheckIn.ts` — paciente só edita a semana fillable
- `lib/nutri/checkInSemanalNutriOperational.ts` — `historyTitle`
- `components/nutri/checkin-semanal/CheckInSemanalNutriCta.tsx`
- `components/nutri/checkin-semanal/CheckInSemanalNutriView.tsx`
- `components/nutri/checkin-semanal/CheckInSemanalNutriHistorico.tsx`
- `components/NutriContent.tsx` — aba Evolução + default week
- `components/profissional/ProfissionalCalendarioSection.tsx` — History → Evolução
- specs de semana, operacional e 07B docs

**Não alterados:** questionário V2, fórmula do score, WhatsApp, D0/D+1, fila, elegibilidade, `/aplicacao`, Check-in Diário.

---

## 22. Testes

`lib/nutri/checkInSemanalNutriAnalytics.spec.ts`: empty, 1 resposta, 2 respostas, semana pulada, ordem cronológica vs histórico, tendência, recorrência 3/4, flags só do helper, Outra por texto, conquistas, hábitos, `sem_dificuldade`/`sem_conquista`.

Semana de referência: `checkInSemanalNutriWeek.spec.ts` + `canEditWeeklyNutritionCheckIn` (ETAPA 02).

Regressão: Check-in Diário `false`; Histórico continua montável; View/ícones 07B/WhatsApp/Calendário/polling intactos.

---

## 23. Preparação para ETAPA 08B

`portfolioSignals` + `trend` + `attentionFlags.recurring` permitem classificar depois:

- evoluindo
- estável
- precisa de atenção

A 08A **não** implementa essa classificação nem a Home inteligente da carteira.

Uma futura etapa de IA poderá narrar os mesmos números (“aderência melhorou, constipação recorrente”). Esta etapa não chama Gemini/OpenAI.
