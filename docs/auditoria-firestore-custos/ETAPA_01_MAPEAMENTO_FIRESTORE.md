# ETAPA 01 - Mapeamento Firestore (Auditoria de Custos)

## 1) Resumo executivo

- Escopo auditado: `app`, `services`, `components`, `lib`, `hooks`, `contexts`, `utils` (sem mexer em UI, fluxos ou regras de negocio).
- Pontos de leitura mapeados (padroes diretos):
  - **322** chamadas client-side (`getDoc`, `getDocs`, `onSnapshot`) em **63** arquivos.
  - **41** chamadas server/admin de leitura (`collection(...).get()`) em **21** arquivos.
  - **Total mapeado nesta etapa: 363 pontos de leitura**.
- Distribuicao de risco (achados priorizados nesta etapa):
  - **CRITICO: 12**
  - **ALTO: 18**
  - **MEDIO: 14**
  - **BAIXO: 9**
- Principal suspeito para o volume de ~1,1 bilhao de reads:
  - **Rotas cron e dashboards administrativos que leem colecoes inteiras sem `limit`/paginacao + telas administrativas com multiplas leituras full-collection por carregamento**.
  - Em especial: `app/api/cron/send-automatic-emails-leads-nutri-personal/route.ts`, `app/api/cron/send-email-agenda-semanal/route.ts`, `app/api/leads-email-status/route.ts`, `app/api/indicadores-plataforma/route.ts`, `services/userService.ts`.

> Observacao: nao foram encontrados listeners `onSnapshot` relevantes de Firestore nas areas auditadas; o custo parece majoritariamente de **fetch repetido e leitura de colecao inteira**.

---

## 2) Tabela de achados

| Arquivo | Linha aproximada | Tipo de leitura | Area do sistema | Risco | Problema identificado | Impacto provavel | Correcao sugerida |
|---|---:|---|---|---|---|---|---|
| `app/api/cron/send-automatic-emails-leads-nutri-personal/route.ts` | 148, 185, 191, 222, 246, 251 | API route (admin `.get()`) em colecoes inteiras | CRM/leads + automacao | **CRITICO** | Le varias colecoes completas em uma execucao (`leads`, `solicitacoes_medico`, `pacientes_completos`, `email_envios`, `nutricionistas`, `personal_trainers`) | Explosao de Read Ops por job; alto trafego de saida | Filtro incremental por janela (`updatedAt`), `limit`, processamento por lote, documento-resumo para elegibilidade |
| `app/api/cron/send-email-agenda-semanal/route.ts` | 180, 184, 188 | API route (admin `.get()`) full-collection | Agenda/relatorios | **CRITICO** | Carrega todos medicos, pacientes e pagamentos por execucao | Custo linear com crescimento da base | Precomputar agenda por medico (doc resumo), leitura por medico alvo, paginacao |
| `app/api/leads-email-status/route.ts` | 103, 129, 141, 238 | API route (admin `.get()`) full-collection | CRM/leads | **CRITICO** | Le snapshots globais para montar status | Muitas reads recorrentes em tela de status | Endpoint paginado, filtros obrigatorios, cache curto server-side |
| `app/api/indicadores-plataforma/route.ts` | 72, 73 | API route (admin `.get()`) full-collection | Dashboard/home | **CRITICO** | Indicadores calculados lendo tudo (`pacientes_completos` + `pacientes_abandono`) | Read Ops e Data Transfer altos em endpoint de alto acesso | Materializar indicadores em documento agregado atualizado por trigger/cron |
| `services/userService.ts` | 12, 214, 277, 318, 367, 531, 717, 753, 1056, 1144, 1469, 1538, 1805, 1858 | Client `getDocs` full-collection repetido | Admin/operacional | **CRITICO** | Multiplas funcoes com leitura total de colecao (`users`, `residentes`, `locais`, `servicos`, `escalas`, `ferias`, `trocas`) | Alto custo por abertura de paginas e acoes de admin | Introduzir filtros, `limit`, cache em memoria por sessao, e endpoints agregados |
| `services/userService.ts` | 1469-1489 e 1805+ | Client com leitura duplicada | Feriados/ferias | **CRITICO** | Busca todas as ferias e depois filtra no cliente; existe metodo alternativo repetindo o mesmo padrao | Duplicacao de reads sem necessidade | Unificar consulta com `where`, remover fallback full-scan em producao |
| `app/metaadmingeral/page.tsx` | 622, 638, 657 | Client via service full-scan | Metaadmin geral | **ALTO** | Carrega trocas/ferias completas para depois filtrar em memoria | Alto custo em cada carga de tela/admin | Carregar somente pendentes com query dedicada e `limit` |
| `app/meta/page.tsx` | 1360-1439 | Client `getDocs` (queries sem `limit`) | Meta/paciente | **ALTO** | Busca vinculos e solicitacoes em multiplas colecoes sem limitacao explicita | Read Ops acima do necessario por acesso | Aplicar `limit(1)` onde logica usa apenas primeiro registro |
| `app/meta/page.tsx` | 1963 e 2185 | Subcolecao inteira (`progressPhotos`) | Fotos/aplicacoes | **ALTO** | Carrega todas fotos da subcolecao e ordena no cliente | Alto Data Transfer (imagens + metadados), reprocessamento | Paginar por data (`orderBy + limit + startAfter`), carregar detalhes sob demanda |
| `app/metaadmin/components/paciente-modal/prontuario/ProntuarioTab.tsx` | 407-411, 429 | Subcolecoes por modal | Prontuario/timeline | **ALTO** | Ao abrir modal, busca colecoes inteiras de fotos e solicitacoes de exames | Multiplica reads por abertura de modal | Carregamento lazy por aba + `limit` inicial + paginacao |
| `app/metaadmin/components/paciente-modal/prontuario/prontuarioService.ts` | 269-270 | Query sem `limit` | Prontuario/timeline | **ALTO** | Lista todos eventos ativos sem pagina | Crescimento progressivo do custo por paciente antigo | Paginar timeline (`orderBy` + `limit` + `startAfter`) |
| `app/metanutri/page.v2.tsx` | 1117-1118 | Query full-collection | MetaNutri/vinculos | **CRITICO** | Busca TODAS solicitacoes e filtra no cliente | Muito custo em base crescente | Query server-side com `where` por nutricionista/status + indice composto |
| `app/metapersonal/page.v2.tsx` | 1385-1391 | Query sem pagina | MetaPersonal/vinculos | **ALTO** | Busca vinculos ativos por paciente sem limites e possivel repeticao por navegacao | Leituras repetidas | Cache por paciente + `limit(1)` quando usado como status |
| `app/meta/personal/page.tsx` | 1186-1190, 1218-1222 | Duas queries sequenciais | Meta/personal | **ALTO** | Duas consultas por paciente para status de pagamento/vinculo | Multiplicacao de reads por render/acesso | Consolidar em endpoint unico resumido |
| `components/NutriContent.tsx` | 2237-2239 | Query de subcolecao sem `limit` | Check-ins/nutricao | **ALTO** | Carrega check-ins completos e ordena no cliente | Read Ops e transferencia elevadas em historico grande | `orderBy + limit` inicial, paginacao, carregar historico sob demanda |
| `services/solicitacaoVinculoNutriMedicoService.ts` | 234-235 | Full-collection | Vinculos Nutri-Medico | **CRITICO** | Metodo le colecao inteira de solicitacoes | Escala muito mal com crescimento | Substituir por queries filtradas por ator/status |
| `services/solicitacaoNutricionistaService.ts` | 515, 525, 568, 590 | Multipla leitura por fluxo | Solicitacoes | **ALTO** | Multiplos `getDocs` por acao sem cache | Read bursts em fluxos de aprovacao/listagem | Consolidar consultas e cache de curto prazo |
| `services/solicitacaoPersonalTrainerService.ts` | 505, 540, 562, 620 | Multipla leitura por fluxo | Solicitacoes personal | **ALTO** | Mesmo padrao de repeticao de consultas | Alto custo acumulado | Consolidar + reduzir round-trips |
| `services/scheduledNotificationService.ts` | 129, 361, 369, 377 | Full-collection recorrente | Notificacoes/agenda | **ALTO** | Rotina busca colecoes inteiras (`escalas`, `residentes`, `servicos`, `locais`) | Custo recorrente por rotina | Filtragem temporal e snapshot incremental |
| `services/scheduledNotificationServicemeta.ts` | 129, 361, 369, 377 | Full-collection recorrente | Notificacoes/meta | **ALTO** | Duplicacao da estrategia acima em servico paralelo | Dobra custo operacional | Reaproveitar cache e reduzir escopo de leitura |
| `app/api/estatisticas-medico/route.ts` | 123, 128, 131, 146 | API route com full-scan parcial | Dashboard medico | **ALTO** | Mistura queries filtradas com `get()` total de colecao | Pode gerar alto custo em painel frequente | Materializar estatisticas por medico e periodo |
| `app/api/medicos-home/route.ts` | ~linhas de query (mapeado) | API route | Home medico | **MEDIO** | Leitura para montar home sem evidencias de pagina | Custo moderado em alto trafego | Cache server-side e recorte por campos necessarios |
| `app/api/aplicacao/[token]/fotos/route.ts` | chamadas multiplas (mapeado) | Subcolecao + filtros | Aplicacoes/fotos | **MEDIO** | Fluxo de fotos com multiplas leituras por token | Read/Data Transfer moderado-alto | Limitar historico retornado e carregar incremental |
| `app/meta/page.tsx` | 1087-1088 | `getDoc` pontual | Meta/paciente | **BAIXO** | Leitura unica de documento plano | Baixo isoladamente | Manter fetch unico com memoizacao por paciente |
| `services/patientService.ts` | 103, 139, 193 | Queries filtradas | Pacientes | **MEDIO** | Sem sinais de full-scan massivo, mas sem limit explicito | Crescimento gradual de custo | Adicionar `limit` em listagens e pagina |
| `services/chatNutriService.ts` | 81-83 | Query historico chat | Chat/IA | **MEDIO** | Carrega mensagens completas do dia | Custo cresce com volume de mensagens | Paginar por janela temporal (`limit` + cursor) |
| `app/meta/nutri/page.tsx` | 163, 219, 272 | `getDoc` pontual | Meta Nutri | **BAIXO** | Leituras unitarias por paciente/plano | Impacto baixo comparativo | Manter e cachear por sessao |

---

## 3) Ranking dos 10 maiores suspeitos de custo alto

1. `app/api/cron/send-automatic-emails-leads-nutri-personal/route.ts` (multiplas colecoes completas por execucao)
2. `services/userService.ts` (grande concentrador de full-collection reads e leituras duplicadas)
3. `app/api/cron/send-email-agenda-semanal/route.ts` (varredura total de medicos/pacientes/pagamentos)
4. `app/api/leads-email-status/route.ts` (status consolidado com full scan)
5. `app/api/indicadores-plataforma/route.ts` (indicadores com leitura integral de base)
6. `app/metanutri/page.v2.tsx` (consulta global de solicitacoes e filtro no cliente)
7. `app/metaadmin/components/paciente-modal/prontuario/ProntuarioTab.tsx` (subcolecoes completas em abertura de modal)
8. `app/meta/page.tsx` (carregamento completo de `progressPhotos` + consultas sem `limit`)
9. `services/scheduledNotificationService.ts` / `services/scheduledNotificationServicemeta.ts` (rotinas recorrentes full-scan)
10. `services/solicitacaoVinculoNutriMedicoService.ts` (metodo com `getDocs` de colecao inteira)

---

## 4) Plano de correcao em etapas (seguro, sem alterar UI)

### Etapa 2: Correcoes criticas sem alterar UI

- Remover consultas full-collection onde a regra usa subconjunto (ex.: `metanutri` e `solicitacaoVinculoNutriMedicoService`).
- Trocar filtros no cliente por `where` no servidor/query.
- Em rotas cron, aplicar processamento incremental por `updatedAt` + checkpoint.
- Eliminar leituras duplicadas no mesmo fluxo/request (memo por requisicao).

### Etapa 3: Paginacao e limites

- Padrao obrigatorio para listagens: `orderBy + limit + startAfter`.
- Timeline/prontuario/check-ins/progress photos: pagina inicial pequena e "carregar mais".
- Queries usadas apenas para validar existencia: `limit(1)`.

### Etapa 4: Cache e debounce

- Cache server-side curto para dashboards/indicadores (ex.: 30-120s).
- Cache client por sessao para metadados estaveis (medicos, locais, servicos).
- Debounce em buscas por nome/email e em modais com carregamento repetitivo.

### Etapa 5: Agregacoes e documentos resumo

- Criar docs de resumo para indicadores da home e status operacionais.
- Para cron de email/leads, manter colecao de "elegiveis" precomputada.
- Contadores agregados para totais recorrentes (pendencias, nao lidas, etc).

### Etapa 6: Monitoramento de reads por rota

- Instrumentar logs por rota/servico: `reads_estimated`, `docs_returned`, `payload_kb`, `duration_ms`.
- Definir alertas de anomalia (por rota e por hora/dia).
- Painel de custo interno por endpoint para identificar regressao rapidamente.

---

## 5) Checklist de seguranca desta etapa

- [x] Nenhum layout foi alterado.
- [x] Nenhum componente visual foi redesenhado.
- [x] Nenhuma regra de negocio foi removida.
- [x] Nenhuma rota foi renomeada.
- [x] Nenhuma migracao de banco foi feita.
- [x] Apenas foi criado o relatorio de auditoria.

---

## Observacoes finais da auditoria tecnica

- O perfil de custo atual indica **mais problema de modelagem de leitura do que de realtime listener**.
- O ganho mais rapido deve vir de:
  1) cortar full-scans em cron/admin,
  2) limitar/paginar timeline/fotos/historicos,
  3) mover consolidacoes para documentos resumo.
- A Etapa 2 pode ser executada com baixo risco funcional, sem alterar UX visual.
