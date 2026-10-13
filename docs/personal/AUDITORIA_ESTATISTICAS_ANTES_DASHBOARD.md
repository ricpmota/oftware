# Auditoria — aba Estatísticas (antes de um Dashboard de Evolução)

**Sistema:** operacional (`PersonalPageContent` → `trainingSessions`).  
**Não alterado nesta tarefa:** nenhum código, Firestore, UI, gráfico ou query.  
**Fonte de verdade:** código atual.  
**Data:** 2026-08-16.

Documentos lidos antes da auditoria:

- `docs/personal/ESTRUTURA_MONTAR_TREINO.md`
- `docs/personal/ETAPA_01_PRESCRICAO_POR_SERIE.md`
- `docs/personal/ETAPA_02_CRIAR_TREINO_DESKTOP.md`
- `docs/personal/ETAPA_03_BIBLIOTECA_TREINOS.md`
- `docs/personal/ETAPA_04_IMPORTAR_SALVAR_MODELO.md`
- `docs/personal/ETAPA_05_EXECUCAO_SERIE_A_SERIE.md`

Onde a documentação de etapa divergir do código, vale o código.

---

## 1. Resumo executivo

A aba **Estatísticas** (`activeTab === 'estatisticas'`) já existe no Personal/Metapersonal. Não é um dashboard de evolução. É um resumo curto de **constância de exercícios marcados como feitos**.

O que ela faz hoje, na prática:

1. Dois cards chamados **Aderência** (7 dias e 30 dias).
2. Um bloco de barras CSS chamado **Treinos feitos por semana (últimas 4 semanas)**.

O cálculo real **não** é “sessões concluídas / sessões prescritas”. Também **não** é aderência à prescrição (kg/reps realizados vs prescritos). É:

```text
exercícios com status === 'done'
÷
todos os exercícios das sessões do período
× 100
```

As barras semanais **não** contam treinos. Contam o mesmo: quantidade de exercícios `done` naquela janela de 7 dias.

Não há filtro de período escolhível, não há biblioteca de gráfico, não há loading, não há edição, não há `exerciseExecutions`, não há carga, volume, streak, tempo médio nem progressão por exercício.

A copy da tela promete mais do que o código entrega: o subtítulo diz “constância e **evolução** semanal”. Evolução de carga **não existe**.

**Conclusão antecipada:** não precisamos de uma terceira aba “Dashboard”. Estatísticas já é o lugar certo para análise longitudinal — hoje ela só está vazia de evolução. Histórico já é a lista cronológica. Criar Dashboard ao lado de Estatísticas duplicaria frequência/conclusão.

---

## 2. Onde aparece

A aba faz parte de `abasPersonal` em `PersonalPageContent`. Não é gated por papel. Quem abre a tela Personal vê as seis seções: Hoje, Cronograma, + Criar, Histórico, **Estatísticas**, Configurações.

Não é editável em nenhum host. É só leitura. Médico/nutri veem os mesmos números do paciente/personal.

| Superfície | Estatísticas aparece? | Editável? | Dados mostrados |
| --- | --- | --- | --- |
| `/meta/personal` (app do paciente) | Sim | Não | Aderência 7d/30d + barras 4 semanas do **aluno logado** |
| `/meta` pasta Personal (paciente, `embedded`) | Sim | Não | Idem, `pacienteProp` |
| `/metapersonal` pasta 9 do modal (`fromMetapersonalEmbedded`) | Sim | Não | Dados do **aluno** aberto |
| `/metapersonal?view=personal&pacienteId=` (fullscreen) | Sim | Não | Idem |
| `/metaadmin` pasta 11 (`PersonalPacienteSharePanel`, read-only) | Sim | Não | Dados do aluno; médico não muta treino |
| `/metaadmin` overlay haltere (`metaadminFullscreen`) | Sim | Não | Idem |
| `/metanutri` pasta 9 do modal (`PersonalPageContent` read-only) | Sim | Não | Dados do aluno |
| `/metanutri` overlay haltere | Sim | Não | Idem |

**Não aparece** fora de `PersonalPageContent`. Não há tela paralela de stats de treino no motor determinístico (`WorkoutPlanDraft` / `PublishedTrainingPlan`) nem em `CalendarioTreinosPersonal`.

A Estatísticas de peso/IMC do `/meta` (paciente clínico) é **outro produto**. Não misturar.

Permissões relevantes:

- `blockProfessionalMutations` / `professionalReadOnly` **não** escondem a aba.
- Personal trainer **vê** as métricas do aluno; não “edita estatísticas” (não há o que editar).
- Configurações (timer/lembretes) é outra aba; PT não pode salvar lembretes do paciente. Isso não afeta Estatísticas.

Drift de doc: `ESTRUTURA_MONTAR_TREINO.md` ainda descreve Metanutri pasta 9 como só `CalendarioTreinosPersonal`. No código atual a pasta 9 do Metanutri já embute `PersonalPageContent` (portanto Estatísticas também).

---

## 3. Arquivos envolvidos

Não existe `components/personal/Estatisticas*.tsx`. Tudo vive no monolito da página.

| Arquivo | Responsabilidade na aba Estatísticas |
| --- | --- |
| `app/meta/personal/page.tsx` | Estado (`adherence7d`, `adherence30d`, `treinosPorSemana`), `loadEstatisticas`, JSX da aba, tab `estatisticas` no menu |
| `services/trainingSessionService.ts` | `getPatientSessions(patientId, {startDate,endDate})` e `getSessionExercises(sessionId)` |
| `types/trainingSession.ts` | `TrainingSession.status`, `TrainingSessionExercise.status` |
| Ícone `BarChart3` (lucide-react) | Só o ícone da tab. **Não** desenha gráfico |

Arquivos que **não** participam da aba, apesar de parecerem candidatos:

| Arquivo | Por que não entra |
| --- | --- |
| `services/trainingExerciseExecutionService.ts` | Só get/getOrCreate/save na execução. Sem listagem. Estatísticas não chama. |
| `lib/personal/trainingExecutionSeries.ts` | Helpers da ETAPA 05 (`getSeriesProgress`, actual vs prescribed). Não usados aqui. |
| `components/personal/run/WorkoutRunSeriesPanel.tsx` | Modal de execução. |
| `lib/personal/trainingExerciseSeries.ts` | Prescrição `series[]` / `loadKg`. `getSessionExercises` normaliza a prescrição, mas Estatísticas ignora e só lê `exercise.status`. |
| `avaliacaoAtividadeFisica` | Motor / anamnese. Fora. |
| `trainingSessionExecutions` (motor publicado) | Outro domínio. Fora. |
| `personal_trainers/{uid}/planos_treino` | Biblioteca. Fora. |
| Qualquer lib de gráfico (`recharts`, `chart.js`, etc.) | Não usada nesta aba. |

Hosts que apenas **embutem** a página (não calculam stats):

- `app/metapersonal/page.v2.tsx`
- `app/metaadmin/page.tsx` + `components/metaadmin/paciente-modal/PersonalPacienteSharePanel.tsx`
- `app/metanutri/page.v2.tsx`
- `app/meta/page.tsx` (pasta Personal do paciente)

---

## 4. Fonte dos dados

### 4.1 Coleções realmente lidas

```text
trainingSessions                    (query where patientId == X, filtro de data em memória)
trainingSessions/{sessionId}/exercises   (N+1 por sessão do período)
```

Campos usados:

| Campo | Uso |
| --- | --- |
| `TrainingSession.id` | Chave para buscar exercícios |
| `TrainingSession.scheduledDate` | Recorte 7d / 30d / 4 janelas de 7 dias |
| `TrainingSessionExercise.status` | Só `'done'` entra no numerador |

Campos **não** usados pela aba, embora venham no documento:

- `TrainingSession.status` (`scheduled` / `done` / `skipped`)
- `prescription.series[]`, `loadKg`, `reps`, `restSec`
- `trainerNote`, `patientNotes`, `trainerNotes`
- `recurrenceGroupId`
- GIFs, `exerciseId`, nome do exercício

### 4.2 Coleções **não** lidas

```text
trainingSessions/{sessionId}/exerciseExecutions     ← ETAPA 05
trainingSessionExecutions                           ← motor publicado
avaliacaoAtividadeFisica
personal_trainers/.../planos_treino
trainingReminderPrefs
```

### 4.3 PatientId

```ts
patientId = paciente?.userId || pacienteIdFromQuery || user?.uid
```

Se `userId` tem formato `uid_timestamp` e a primeira busca volta vazia, tenta o UID base. Mesmo fallback de Histórico/Cronograma.

### 4.4 Datas

`loadEstatisticas` usa `Date.toISOString().split('T')[0]`, **não** `toLocalYYYYMMDD` (usado em Hoje/Cronograma). No fuso Brasil isso pode deslocar o dia. Bug pré-existente; não corrigido nesta auditoria.

Não há `limit` na query. `getPatientSessions` faz `getDocs` de **todas** as sessões do paciente e filtra `startDate`/`endDate` no cliente.

---

## 5. KPIs atuais

Não há componente `KpiCard`. São dois cards inline + um bloco de barras.

| KPI | Texto mostrado | Fórmula real | Fonte | Período |
| --- | --- | --- | --- | --- |
| Aderência 7 dias | Label `Aderência` + título `Últimos 7 dias` + `{n}%` + barra de progresso | `doneExercises7d / totalExercises7d * 100`. `total` = todos os docs em `exercises` das sessões com `scheduledDate` em `[hoje-7, hoje]`. `done` = `ex.status === 'done'`. Se `total === 0` → `0` (mostra `0%`, não `--`) | `trainingSessions` + `exercises` | últimos 7 dias a partir de `hoje` (via `toISOString`) |
| Aderência 30 dias | Label `Aderência` + título `Últimos 30 dias` + `{n}%` + barra | Idem com `[hoje-30, hoje]` | idem | 30 dias |
| Treinos por semana | Título `Treinos feitos por semana (últimas 4 semanas)`. Labels `Semana 4` … `Semana 1`. Número na barra = `count` | **Não é número de treinos.** Para cada janela de 7 dias: soma `exercises.filter(status === 'done').length`. Largura da barra: `min((count / 7) * 100, 100)%` — o `7` é um teto visual **fixo de 7 exercícios feitos**, não 7 treinos nem 7 dias treinados | idem | 4 janelas: `hoje-(i*7+6)` … `hoje-i*7` para `i = 3..0` |

Detalhes semânticos importantes:

1. **Skipped não entra no numerador**, mas entra no denominador. Pular exercício **baixa** a “aderência”.
2. Exercício `pending` de sessão ainda `scheduled` também baixa a taxa (treino de hoje não iniciado conta como “não aderiu”).
3. `TrainingSession.status === 'done'` **não** é consultado. Uma sessão marcada feita com exercícios sem `status` não sobe o KPI.
4. Marcar Feito no card da aba Hoje (fora do modal) **sim** alimenta este KPI, porque grava `exercises.status`. A ETAPA 05 documenta que isso **não** gera `exerciseExecutions`.
5. `adherenceDisplay` (`adherence7d > 0 ? …% : '--'`) é calculado no header e **nunca renderizado**. Código morto.

Inventário visual completo da aba (não há mais nada abaixo):

| Nome exibido | Componente | Cálculo | Fonte | Período |
| --- | --- | --- | --- | --- |
| `Resumo de performance` | `<div>` intro | nenhum | — | — |
| `Acompanhe sua constância e evolução semanal.` | subtítulo | nenhum (copy) | — | — |
| `Aderência` / `Últimos 7 dias` | card | ver tabela KPI | `exercises.status` | 7d |
| `Aderência` / `Últimos 30 dias` | card | ver tabela KPI | `exercises.status` | 30d |
| `Treinos feitos por semana (últimas 4 semanas)` | barras CSS | exercícios `done` por janela | `exercises.status` | 4×7d |

**Não existem na UI:** treinos concluídos (contagem de sessões), treinos pendentes, taxa de conclusão de sessão, frequência semanal de sessões, streak, tempo médio, exercícios realizados (lista), volume, carga, PR.

---

## 6. Gráficos atuais

Não há `recharts` / `chart.js` / SVG chart. O único “gráfico” é HTML/CSS.

| Nome/título | Tipo | Eixo X | Eixo Y | Dados de entrada | Transformação | Período | Interação | Biblioteca |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Treinos feitos por semana (últimas 4 semanas) | barras horizontais (`div` + `width %`) | `Semana {4 - index}` (Semana 4 = mais antiga, Semana 1 = mais recente) | quantidade de exercícios `done` | `treinosPorSemana: number[]` (4 inteiros) | largura = `count/7*100`, cap 100%. Se `count === 0` a barra fica vazia sem número | 4 janelas de 7 dias, sem overlap intencional de 1 dia (`hoje-6..hoje`, `hoje-13..hoje-7`, …) | nenhuma (não clicável) | nenhuma |

Os cards de aderência também têm uma **barra de progresso** (não é gráfico de série temporal): `width = clamp(percent, 0, 100)%`.

Se `treinosPorSemana` ainda é `[]` (estado inicial), o bloco do título aparece **sem barras**. Não há spinner.

---

## 7. Filtros/períodos

**Não há UI de filtro.**

Não existem chips `7 dias / 30 dias / 90 dias / Semana / Mês / Ano / Todos`.

| Recorte | Como entra | Escolhível? |
| --- | --- | --- |
| 7 dias | hardcoded em `loadEstatisticas` | Não |
| 30 dias | hardcoded | Não |
| 4 semanas | hardcoded | Não |
| Lifetime | não | — |
| Mês / ano | não nesta aba (existem no **Histórico**, calendário mês/semana) | — |

A informação **não** é lifetime. É sempre janela recente fixa.

A janela de 7 dias da aderência (`hoje-7` → `hoje`) **não coincide** exatamente com “Semana 1” das barras (`hoje-6` → `hoje`). São dois recortes diferentes.

---

## 8. Relação com Histórico

### Função atual de cada aba (uma frase)

| Aba | Função atual |
| --- | --- |
| **Hoje** | Executar o treino do dia selecionado na faixa Seg–Dom (progresso do dia, GIF, iniciar, marcar feito/pulei). |
| **Cronograma** | Calendário mês/semana de sessões futuras e passadas + detalhe da sessão (também aplicações/pagamentos se toggles ligados). |
| **Histórico** | Lista cronológica das sessões **já realizadas ou puladas** (ou com pelo menos um exercício done/skipped), com calendário de recorte e detalhe da prescrição. |
| **Estatísticas** | Dois percentuais de exercícios `done` (7d/30d) e quatro contagens semanais de exercícios `done`. |
| **+ Criar** | Montar/editar sessões e biblioteca. Fora desta auditoria. |
| **Configurações** | Timer local + lembretes. Fora desta auditoria. |

### Como o Histórico escolhe o que mostrar

`loadHistorico` busca `trainingSessions` dos **últimos 365 dias** (`toISOString`), depois:

```text
historicoSessionsRealizadas =
  status === 'done'
  OR status === 'skipped'
  OR algum exercício da sessão tem status done|skipped
```

Sessões puramente `scheduled` sem exercício marcado **não** entram. Há N+1 em `getSessionExercises` só para sessões que ainda não são `done`/`skipped`.

UI do Histórico:

- Toggle **Mês / Semana**
- Calendário (`CalendarioComponent` / `CalendarioSemanalComponent`) só com sessões “realizadas”
- Card **Treinos realizados** + badge `{n} registros` no período (dia clicado, ou semana, ou mês)
- Lista: título, data, `patientNotes`, badge Feito / Pulou / Agendado
- Detalhe: mesmo padrão Hoje/Cronograma — progresso `%` de exercícios `done`, “Próximo exercício”, “Ver todos os exercícios” com resumo de **prescrição** (`formatTrainingSeriesSummary`) e badge Feito/Pulei
- **Imprimir treino** (prescrição, ETAPA 05B)
- **Não** mostra `actualReps` / `actualLoadKg`

### Matriz de informação

| Informação | Hoje | Cronograma | Histórico | Estatísticas |
| --- | ---: | ---: | ---: | ---: |
| Sessões (lista) | do dia | do mês/semana | realizadas 365d, filtradas pelo calendário | não |
| Datas | faixa Seg–Dom | calendário | calendário + lista | implícitas nos recortes 7/30/4sem |
| Status da sessão | sim | sim | sim (Feito/Pulou/Agendado) | não usa |
| Status do exercício (done/skipped) | sim (ação) | sim (detalhe) | sim (detalhe) | só agrega `done` |
| Exercícios (lista/GIF) | sim | sim | sim no detalhe | não |
| Séries prescritas | resumo | resumo | resumo | não |
| Cargas prescritas | no resumo se houver | idem | idem | não |
| Cargas realizadas | só no modal de execução | não | não | não |
| Notas (`patientNotes`) | — | — | na lista | não |
| `trainerNote` | na execução | — | não no detalhe atual | não |
| Execução série a série | modal (ETAPA 05) | não | não | não |
| Frequência | progresso do dia | dots no calendário | `{n} registros` no período | barras “por semana” (na verdade exercícios) |
| Aderência % | `%` do treino do dia (`done/total` exercícios) | `%` da sessão aberta | `%` da sessão aberta | `%` 7d e 30d (mesma fórmula, agregado) |
| Volume / tonelagem | não | não | não | não |

---

## 9. Dados da ETAPA 05 já utilizados

**Nenhum, nesta aba.**

```text
Estatísticas atual NÃO conhece os dados série a série da ETAPA 05.
```

`TrainingExerciseExecutionService` só é chamado no fluxo de **correr o treino** (`startWorkout` / concluir / pular série) em `page.tsx`. `loadEstatisticas` não importa o service.

A aba **Histórico** também **não** foi alterada na ETAPA 05 (o próprio doc da etapa diz isso). Continua lendo `exercises.status` e prescrição, não `exerciseExecutions`.

O que a ETAPA 05 *indiretamente* pode afetar Estatísticas: ao concluir a **última série** do exercício, o código ainda chama `trainingSessionService.markExercise`, gravando `exercises.status = 'done'|'skipped'`. Esse campo legado é o único que Estatísticas enxerga. Séries individuais, cargas reais e skips parciais desaparecem no agregado.

---

## 10. Dados da ETAPA 05 ainda não utilizados

Subcollection:

```text
trainingSessions/{sessionId}/exerciseExecutions/{exerciseDocId}
```

Campos disponíveis e **não lidos** por Estatísticas/Histórico:

| Campo | Insight candidato (não implementado) |
| --- | --- |
| `series[].prescribedReps` / `prescribedLoadKg` / `prescribedRestSec` | o que foi pedido naquele dia (snapshot congelado) |
| `series[].actualReps` / `actualLoadKg` | o que o aluno fez |
| `series[].status` (`pending` / `done` / `skipped`) | séries concluídas vs puladas |
| `series[].completedAt` | ordem temporal intra-exercício |
| `exerciseId` (ExerciseDB) | agrupar o mesmo movimento ao longo das semanas |
| `exerciseDocId` | ocorrência (o mesmo `exerciseId` pode aparecer 2× na sessão) |
| `status` do exercício de execução | `pending` / `in_progress` / `done` / `skipped` |
| `prescribedTrainerNote` | irrelevante para KPI de carga |

Helpers já existentes em `lib/personal/trainingExecutionSeries.ts` (prontos, sem UI de stats):

- `getSeriesProgress` → `{ done, skipped, pending, total }`
- `getExerciseExecutionStatus`
- `isExerciseExecutionDone`

Service **não** tem `listByPatient` nem `listBySession`. Para um dashboard futuro seria preciso `getDocs` da subcollection por sessão (mais um N+1) ou um índice/agregado novo. Esta auditoria **não** propõe schema.

### Insights calculáveis com confiança **se** a execução passou pelo modal

| Insight | Confiável hoje? | Observação |
| --- | --- | --- |
| Última carga realizada | Sim, se houver `actualLoadKg` em série `done` | Feito no card da aba Hoje **não** cria o doc |
| Maior carga realizada (PR) | Sim, no universo das execuções persistidas | Não cobre treinos só marcados no card |
| Carga média | Sim, média de `actualLoadKg` não-nulos | Flexão/prancha com `null` devem ser excluídas, não zeradas |
| Reps realizadas | Sim | `actualReps` |
| Séries concluídas / puladas | Sim | `getSeriesProgress` |
| Taxa de conclusão das séries | Sim | `done / (done+skipped)` ou `done/total` — produto precisa escolher o denominador |
| Evolução da carga | Sim, ordenando sessões por `scheduledDate` + `exerciseId` | Recorrência é cópia; identidade é `exerciseId`, não um “slot” estável |
| Comparação prescrito × realizado | Sim | snapshot vs actual na mesma série |
| Aderência real à prescrição | Parcial | dá para % séries done e desvio de kg/reps; não há RPE |

Limitações documentadas na ETAPA 05 que contaminam qualquer dashboard:

- Marcar Feito/Pulei nos cards **não** gera log série a série.
- Série já `done`/`skipped` não é reeditável.
- Sem cascade se o personal editar a prescrição depois.
- Sem listagem pronta por paciente.

---

## 11. Duplicidades atuais

**Há sobreposição conceitual, não dois dashboards iguais.**

| Tema | Onde aparece hoje | É duplicata? |
| --- | --- | --- |
| “O aluno treinou neste período?” | Histórico: lista + `{n} registros`. Estatísticas: % e barras | **Parcial.** Mesma pergunta, unidades diferentes (sessões vs exercícios `done`) |
| `%` de exercícios feitos | Hoje (1 sessão), Cronograma (1 sessão), Histórico (1 sessão), Estatísticas (agregado 7d/30d) | **Mesma fórmula**, granularidade diferente. Estatísticas é o único agregado multi-sessão |
| Calendário mês/semana | Cronograma (todas as sessões) e Histórico (só realizadas) | Duplicata de **widget**, recortes diferentes. Estatísticas não tem calendário |
| Copy “evolução” | Só Estatísticas (texto) | Promete o que não calcula |

Não há dois cards “Treinos concluídos” idênticos. Estatísticas **nem mostra** contagem de sessões `done`.

O risco futuro (o que esta auditoria quer evitar):

```text
Estatísticas → frequência + treinos concluídos
Dashboard   → frequência + treinos concluídos
```

Isso **ainda não existe**, mas existiria se a ETAPA 09 nascesse como aba nova sem absorver Estatísticas.

---

## 12. Lacunas

### O que Estatísticas **NÃO** mostra hoje

- carga por exercício
- evolução da carga
- carga máxima / PR
- reps executadas (`actualReps`)
- comparação prescrito × realizado
- volume de treino / tonelagem
- progressão semanal de carga (só “exercícios done” mal rotulados)
- exercícios mais executados
- aderência ao prescrito (kg/reps)
- séries concluídas vs puladas
- histórico longitudinal do mesmo exercício
- treinos concluídos (contagem de sessões)
- treinos pendentes
- streak de dias
- tempo médio de treino
- filtro de período
- drill-down (clicar na semana / no exercício)
- loading / empty state honesto (“ainda não há exercícios no período” vs `0%`)

### Volume

**Não existe** conceito de `volume`, `tonelagem` ou `total load` no Personal operacional (`lib/personal/*`, `services/trainingSessionService.ts`, aba Estatísticas).

Não inventar fórmula nesta auditoria. Só registrar: o dado bruto (`actualLoadKg * actualReps` por série) passaria a existir **depois** de ler `exerciseExecutions`; hoje a UI não calcula.

### Aderência — dois significados

| Conceito | Existe hoje? | Onde |
| --- | --- | --- |
| Sessão concluída (`TrainingSession.status === 'done'`) | Campo existe; **Estatísticas ignora** | Histórico/Hoje mostram o badge |
| Exercícios marcados feitos / total de exercícios | **Sim — é o KPI atual, chamado “Aderência”** | Estatísticas 7d/30d; também a barra da sessão em Hoje/Histórico |
| Aderência real à prescrição (4 séries prescritas, 3 done, 1 skipped; 32 kg vs 30 kg) | **Não.** Estatísticas não consegue representar isso | exigiria `exerciseExecutions` |

O nome **Aderência** hoje é enganoso: é taxa de conclusão de exercícios no período, misturando sessões futuras-do-dia, skipped e pending.

---

## 13. Performance

### Como carrega

`loadEstatisticas` dispara quando `activeTab === 'estatisticas'` **duas vezes** (dois `useEffect` independentes: um genérico de tab, outro “quando paciente carrega”). Sem debounce. Sem cache entre 7d e 30d.

Não há `loadingEstatisticas`. A UI mostra `0%` e título das semanas até o async terminar.

### Query real de `getPatientSessions`

```text
getDocs( trainingSessions where patientId == X )  // TODAS as sessões do aluno
depois filter startDate/endDate no cliente
```

Cada chamada, mesmo pedindo 7 dias, **lê o histórico inteiro** daquele `patientId`. Sem `limit`.

`loadEstatisticas` chama isso **6 vezes**:

1. janela 7d
2. janela 30d
3–6. quatro semanas

Se o UID composto falhar, pode dobrar (mais 6).

Depois, **N+1** em `getSessionExercises` para:

- cada sessão da janela 7d
- cada sessão da janela 30d (**inclui de novo as de 7d**)
- cada sessão de cada uma das 4 semanas (**de novo as mesmas**)

Cada `getSessionExercises` = `getDocs` da subcollection `exercises` (N docs do treino). Normaliza `prescription.series[]` e **descarta** tudo isso, ficando só com `status`.

**Não** faz N+1 em `exerciseExecutions` (porque não lê).

### Estimativa para 100 `trainingSessions`

Hipótese: 100 sessões no aluno; ~12 nos últimos 30 dias; ~3 nos últimos 7 dias; as 4 semanas cobrem as mesmas ~12.

Leituras de **sessão** (documentos de `trainingSessions`):

```text
6 × 100 = 600 leituras de sessão
```

(porque cada `getPatientSessions` materializa as 100)

Leituras de **exercício** (subcollection), se 12 sessões no mês e ~8 exercícios:

```text
7d:     3 sessões  × 8 = 24
30d:   12 sessões  × 8 = 96   (repete as 3)
4 sem: 12 sessões  × 8 = 96   (repete)
≈ 216 leituras de exercício
```

**Total da ordem de ~800–900 reads por abertura da aba**, sem contar o segundo `useEffect` (potencialmente ×2 → ~1600–1800).

Pior caso (100 sessões todas no último mês): da ordem de **milhares** de reads, ainda só para `status === 'done'`.

Colocar histórico série a série **em cima deste padrão** (mais um `getDocs` de `exerciseExecutions` por sessão, repetido 6 vezes) seria o caminho errado. Qualquer ETAPA 06/09 precisa de **uma** varredura de sessões do período + uma varredura de execuções, não o loop atual.

---

## 14. O que caberia na ETAPA 06

Pedido da ETAPA 06 no roadmap: **histórico de cargas e progressão por exercício**.

### Onde **não** deve nascer como aba nova

Uma aba “Dashboard” só com última carga / PR / sparkline, deixando Estatísticas com 7d/30d, duplica a pergunta “o aluno está evoluindo?”.

### Recomendação de superfície (código/UX atuais)

**D) Estatísticas + modal de detalhe do exercício**

Por quê:

- Estatísticas já é a única aba **agregada / longitudinal**. Está semanticamente vazia; é o slot certo.
- Histórico já é a **lista do que aconteceu naquele dia**. Lá cabe, no detalhe da sessão, o prescrito vs realizado **daquela ocorrência** (quando a ETAPA 06/Histórico passar a ler `exerciseExecutions`). Isso não substitui o longitudinal.
- Modal específico solto (só C) atende o exemplo do Supino, mas o personal precisa **descobrir** em quais exercícios evoluiu/estagnou. Isso pede uma lista/ranking na Estatísticas, depois o drill-down.

Interação futura do exemplo (não implementar agora):

```text
Estatísticas
  → lista “Progressão por exercício”
      Supino reto  ↑  última 32 kg  ·  máx 35 kg
  → toque
      Modal / painel
        Última sessão    32 kg
        Maior carga      35 kg
        05/08  30 kg
        12/08  32 kg
        19/08  35 kg
```

O mesmo modal pode ser aberto depois a partir do card do exercício no Histórico (“ver evolução”), sem segunda fonte de verdade.

**Histórico na ETAPA 06 (complemento, não o dono):** no detalhe da sessão, mostrar séries daquele dia (`prescribed` vs `actual`). Responde “o que aconteceu em 12/08?”, não “como o Supino evoluiu em 8 semanas?”.

Técnicas avançadas (ETAPA 07) e progressão assistida (ETAPA 08) continuam fora de Estatísticas até existirem dados.

---

## 15. Recomendação sobre Dashboard

```text
EVOLUIR Estatísticas
```

Não:

```text
CRIAR nova área
```

Não é necessário, neste momento:

```text
REORGANIZAR Estatísticas + Histórico
```

(as duas já têm funções distintas; Histórico não precisa virar gráfico.)

### Por quê não criar Dashboard

1. Já existem seis abas. A sétima repetiria frequência/conclusão.
2. Estatísticas **já se apresenta** como “Resumo de performance / constância e evolução” — o buraco é de dados, não de navegação.
3. O personal quer responder rápido: está treinando? aderindo? evoluindo? em quais exercícios? o que houve nas últimas sessões? Isso cabe em **duas** superfícies: Histórico (sessões) + Estatísticas (corte longitudinal).
4. Os KPIs atuais são fracos e mal nomeados; substituí-los/expandi-los na mesma aba é mais barato cognitivamente do que ensinar um terceiro destino.
5. Performance atual não aguenta um segundo consumidor N+1; o investimento deve ser **uma** leitura agregada, usada pela aba que já existe.

### Nomes (não alterar agora — só avaliação)

| Nome | Adequação hoje | Adequação se nascer progressão de carga |
| --- | --- | --- |
| Estatísticas | Genérico, mas já está no menu | Continua aceitável; “Stats” no mobile já é curto |
| Histórico | Correto para lista cronológica | Deve **permanecer** lista; não virar dashboard |
| Dashboard | Inglês / genérico; seria a 3ª aba | Evitar |
| Evolução | Melhor label futuro para a aba atual se o conteúdo virar carga/progressão | Candidato a rename **depois** que o conteúdo mudar, não antes |

Enquanto os únicos números forem `% done` de exercícios, “Estatísticas” ainda descreve o que há. Quando houver progressão de carga, **Evolução** (ou **Estatísticas / Evolução** no aside) combina melhor. Não renomear nesta etapa.

Opção A (Histórico + Estatísticas + Dashboard) — **rejeitada**.  
Opção B (Histórico + Estatísticas = Dashboard de Evolução) — **escolhida**.  
Opção C — só faria sentido se Estatísticas fosse apagada e o conteúdo mudasse de sítio; custo alto, ganho zero.

---

## 16. UX desktop e mobile (referência)

Não há layout especial da aba por breakpoint.

| | Mobile | Desktop (`lg`, embed com aside) |
| --- | --- | --- |
| Como chega na aba | grade 6 células, shortLabel `Stats` | aside `Estatísticas` |
| Layout | `space-y-6`, scroll da coluna de conteúdo | igual, `lg:max-w-5xl` no `main` (Criar é a única aba que solta o max-width) |
| KPI | `grid-cols-1` → um card embaixo do outro | `md:grid-cols-2` → 7d e 30d lado a lado |
| Gráfico | barras full width | idem |
| Faixa Seg–Dom | visível acima (troca o dia do **Hoje**, não filtra Estatísticas) | sticky no embed; **não** altera os números da aba |
| Limitação | copy “sua constância” no PT/médico (fala como se fosse o aluno) | mesma copy |

Nenhum gráfico interativo. Nenhum empty state. Sem pull-to-refresh específico.

---

## 17. Mapa dos dados (atual)

```text
Firestore
  trainingSessions (todas do patientId)
       ↓  getPatientSessions  × 6  (filtro de data só no cliente)
  trainingSessions/{id}/exercises
       ↓  getSessionExercises  N+1  (7d + 30d + 4 semanas, com overlap)
       ↓
PersonalPageContent.loadEstatisticas
       ↓  doneCount / totalCount * 100
       ↓  quatro somas de exercises.done
       ↓
estado: adherence7d, adherence30d, treinosPorSemana
       ↓
aba estatisticas
       → card % 7d
       → card % 30d
       → barras CSS “Semana 4…1”
```

`exerciseExecutions` **não está neste mapa**.

---

## 18. Tabela final de responsabilidades (proposta)

| Área | Responsabilidade ideal | Não deve mostrar |
| --- | --- | --- |
| Hoje | Treino do dia: executar, marcar, timer, GIF | Gráficos de evolução, ranking de carga, lista de 365 dias |
| Cronograma | Agenda (o que está marcado e quando), detalhe da sessão futura/passada | KPIs longitudinais, PR, volume do mês |
| Histórico | O que **aconteceu** em cada treino: data, status, exercícios daquele dia, e no futuro prescrito vs realizado **da sessão** | Ranking “quais exercícios evoluíram”, gráfico de 8 semanas, frequência agregada como KPI principal |
| Estatísticas | Análise longitudinal: está treinando? com que constância? aderência (quando existir dado de série)? evolução de carga por exercício; volume se/quando definido | Lista dia-a-dia das sessões (isso é Histórico); montar treino; timer |
| Dashboard novo, se existir | **Não criar.** O conteúdo previsto para a ETAPA 09 deve entrar em Estatísticas | — |

Perguntas do personal e a aba dona:

| Pergunta | Aba |
| --- | --- |
| O paciente está treinando? | Estatísticas (frequência/constância) + Histórico (prova nas datas) |
| Está aderindo? | Estatísticas — hoje de forma fraca (`exercises.done`); no futuro com `exerciseExecutions` |
| Está evoluindo? | Estatísticas (ainda não) |
| Em quais exercícios evoluiu / estagnou? | Estatísticas + modal (ETAPA 06) |
| O que aconteceu nas últimas sessões? | Histórico |

---

## 19. Checklist para a próxima etapa (não fazer agora)

- Não criar `activeTab === 'dashboard'`.
- Não copiar os cards 7d/30d para outro lugar.
- Ao implementar cargas, corrigir o rótulo “Treinos feitos por semana” se a métrica continuar sendo exercícios.
- Ao implementar cargas, **não** reusar o N+1 sêxtuplo de `getPatientSessions`.
- Distinguir na UI: conclusão de sessão ≠ conclusão de exercício ≠ aderência à prescrição.
- Histórico: detalhe da sessão pode ganhar séries realizadas sem virar dashboard.
- Documentar depois o rename opcional Estatísticas → Evolução, só quando o conteúdo mudar.
