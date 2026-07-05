# Quando cada e-mail é enviado — rotas e gatilhos

Referência para conferir se o comportamento automático está alinhado com o produto. Todos os envios transacionais passam por **ZeptoMail** (`lib/email/transporter.ts`), exceto onde indicado.

**Crons com limite por execução:** `CRON_ZEPTO_MAX_SENDS_PER_RUN` (padrão 25), `CRON_EMAIL_DELAY_MS` (padrão 1200 ms). Resposta JSON pode incluir `truncadoPorLimiteZepto: true` quando a fila continua na próxima rodada.

**Fuso dos horários no `vercel.json`:** o Vercel Cron usa **UTC**. Ajuste mental para horário de Brasília (UTC−3) quando comparar com o negócio.

---

## 1. Crons agendados (`vercel.json`)

| Rota | Schedule (UTC) | Quando envia | Documento(s) Firestore (`emails/…`) | Condições / notas |
|------|----------------|--------------|-------------------------------------|-------------------|
| `GET /api/cron/send-automatic-emails` | `*/5 * * * *` (a cada 5 min) | Sequência **Leads médico**: `email1`…`email5` | `leads_email1` … `leads_email5` (fallback legado: `email1`…`email5`) | `emails/config` → `envioAutomatico.ativo === true`. Usuário Auth **sem** solicitação médico aceita e **sem** `pacientes_completos` com médico; datas mínimas conforme regra no código (ex.: 1h, 24h, 72h, 7d, 14d após cadastro). |
| `GET /api/cron/send-automatic-emails-leads-nutri-personal` | *(não está no `vercel.json` atual — agendar se quiser)* | **Leads Nutri** e **Leads Personal** (`email1`…`email5`) | `leads_nutri_email1` … `leads_nutri_email5`, `leads_personal_email1` … `leads_personal_email5` | `emails/config`: `envioAutomaticoLeadsNutri.ativo` e/ou `envioAutomaticoLeadsPersonal.ativo`. Exclui quem já tem nutri/personal aceito e quem já tem fluxo médico. |
| `GET /api/cron/send-email-aplicacao` | `0 8 * * *` e `0 12,16 * * *` | **Aplicação Tirzepatida**: 1 dia antes + no dia | `aplicacao_aplicacao_antes`, `aplicacao_aplicacao_dia` | Percorre `pacientes_completos` com plano; compara datas do calendário de doses com **amanhã** e **hoje**; deduplica por `email_envios`. |
| `GET /api/cron/send-email-conclusao-lembrete` | `15 8 * * *` | **Lembrete** no dia previsto de conclusão | `conclusao_tratamento_lembrete_conclusao` | Paciente em tratamento/concluído, data prevista = hoje, sem duplicata no dia, sem peso final já registrado. |
| `GET /api/cron/send-email-agenda-diario` | `0 7 * * *` | **Agenda diária** para **médicos** | `agenda_agenda_diario` | Médicos com pacientes em tratamento e aplicações/pagamentos **no dia**. |
| `GET /api/cron/send-email-agenda-semanal` | `0 13 * * 0` (domingo 13:00 UTC) | **Agenda semanal** para **médicos** | `agenda_agenda_semanal` | Itens da semana (domingo–sábado calculado no código). |
| `GET /api/cron/send-email-aniversariante` | *(não está no `vercel.json` — agendar manualmente)* | Parabéns aniversariante | `aniversariante_parabenizar` | Pacientes com data de nascimento = dia/mês **hoje** (lógica em fuso Brasília no cron), com médico e e-mail. |

**Outros crons no `vercel.json` que não enviam estes e-mails de template:**

- `GET /api/cron/daily-notifications` — notificações agendadas internas (`ScheduledNotificationService`), não é o mesmo fluxo dos templates da pasta E-mails.
- `GET /api/cron/atualizar-conversao` — métricas/conversão de leads, sem envio de e-mail desta lista.

---

## 2. Envio por evento (API `POST` / fluxo da aplicação)

Chamada quando algo acontece na UI ou em serviço. Caminhos conferidos no repositório (principalmente `fetch('/api/send-email-…')`).

| E-mail / caso | Rota HTTP | Gatilho (onde encontramos no código) | Documento Firestore típico |
|---------------|-----------|--------------------------------------|----------------------------|
| Boas-vindas após aceitar solicitação **médico** | `POST /api/send-email-solicitado-medico` | `app/metaadmin/page.tsx` | `solicitado_medico_boas_vindas` |
| Boas-vindas após aceitar **nutricionista** | `POST /api/send-email-solicitado-nutri` | `app/metanutri/page.v2.tsx` | `solicitado_nutri_boas_vindas` |
| Boas-vindas após aceitar **personal** | `POST /api/send-email-solicitado-personal` | `app/metapersonal/page.v2.tsx` | `solicitado_personal_boas_vindas` |
| **Nutri** pediu vínculo ao médico | `POST /api/send-email-nutri-pediu-vinculo` | `metanutri/page.v2.tsx` | `nutri_pediu_vinculo_aviso_medico` |
| **Personal** pediu vínculo ao médico | `POST /api/send-email-personal-pediu-vinculo` | `metapersonal/page.v2.tsx` | `personal_pediu_vinculo_aviso_medico` |
| **Plano** editado (médico, paciente Tirzepatida) | `POST /api/send-email-plano-editado` | `app/metaadmin/page.tsx` | `em_tratamento_plano_editado` |
| **Novo médico** solicitando cadastro (aviso gestor) | `POST /api/send-email-novo-lead-medico-gestor` | `app/metaadmin/page.tsx` (primeiro salvar perfil) | `novo_lead_medico_novo_lead` |
| **Novo lead** para o médico | `POST /api/send-email-novo-lead-medico` | `services/solicitacaoMedicoService.ts` | `novo_lead_para_medico_novo_lead` |
| Paciente leu **recomendações** (aviso médico) | `POST /api/send-email-check-recomendacoes` | `app/meta/page.tsx` | `check_recomendacoes_recomendacoes_lidas` |
| **Conclusão** — parabéns + relatório (após médico concluir) | `POST /api/send-email-conclusao-tratamento` | `app/metaadmin/page.tsx` | `conclusao_tratamento_conclusao_tratamento` |
| **Lead avulso** (gestor Metaadmin geral) | `POST /api/send-email-lead-avulso` | `app/metaadmingeral/page.tsx`, `contexts/AuthContext.tsx` | `lead_avulso_novo_lead` |
| **Bem-vindo** (geral / médico conforme payload) | `POST /api/send-email-bem-vindo` | `AuthContext.tsx`, `metaadmin/page.tsx` | `bem_vindo_bem_vindo_geral`, `bem_vindo_bem_vindo_medico` |
| **Aplicação** (reutiliza template antes/dia) | `POST /api/send-email-aplicacao` | `services/emailAplicacaoService.ts` (e possíveis chamadas pontuais) | `aplicacao_aplicacao_antes` / `aplicacao_aplicacao_dia` |
| **Novidades** (massa / específicos) | `POST /api/send-email-novidades` | `components/EmailManagement.tsx` | `novidades_novidade` |
| **Teste / disparo manual** de lead (sequência médica) | `POST /api/send-email-lead` | `EmailManagement.tsx`, `LeadsEmailDashboard.tsx` | docs `leads_*` |
| **Lead Mentoria** (formulário site) | `POST /api/lead` | Landing/API lead (não é `send-email-*`) | `mentoria_lead` |
| **E-mail genérico** (notificações) | `POST /api/send-email` | `services/notificationService.ts`, `notificationServicemeta.ts` | *(definido pelo chamador)* |

---

## 3. Rotas `POST` existentes — gatilho **não** encontrado no frontend/serviços deste repo

As APIs abaixo leem templates em `emails/<docId>` conforme `data/emailConfigNovosModulos.ts`, mas **não há `fetch` para elas** em `app/`, `components/` ou `services/` (busca feita em mar/2026). Para virarem “automáticas”, é preciso chamá-las no fluxo correspondente (salvar plano nutri, novo paciente nutri, etc.) ou criar cron.

| Rota | Doc Firestore (exemplo) |
|------|-------------------------|
| `POST /api/send-email-plano-editado-nutri` | `em_tratamento_nutri_plano_editado` |
| `POST /api/send-email-plano-editado-personal` | `em_tratamento_personal_plano_editado` |
| `POST /api/send-email-novo-lead-nutri` | `novo_lead_nutri_novo_lead` |
| `POST /api/send-email-novo-lead-personal` | `novo_lead_personal_novo_lead` |
| `POST /api/send-email-recomendacoes-lidas-nutri` | `check_recomendacoes_nutri_recomendacoes_lidas` |
| `POST /api/send-email-presenca-confirmada-personal` | `check_presenca_personal_presenca_confirmada` |
| `POST /api/send-email-bem-vindo-nutri` | `bem_vindo_nutri_bem_vindo_nutricionista` |
| `POST /api/send-email-bem-vindo-personal` | `bem_vindo_personal_bem_vindo_personal` |

---

## 4. Templates na collection `emails` **sem** cron nem rota dedicada mapeada aqui

Configuráveis no Metaadmin geral (e em `NOVOS_MODULOS_EMAIL_DOCS`), mas **sem job automático** no código atual:

- **Consulta nutri** (`consulta_nutri_consulta_antes`, `consulta_nutri_consulta_dia`)
- **Treino personal** (`treino_personal_treino_antes`, `treino_personal_treino_dia`)
- **Agenda nutri / personal** (`agenda_nutri_*`, `agenda_personal_*`)
- **Lead avulso nutri / personal** (`lead_avulso_nutri_novo_lead`, `lead_avulso_personal_novo_lead`) — o fluxo atual usa só `lead_avulso_novo_lead` para o admin geral.

---

## 5. Lista rápida por documento Firestore (docId)

Útil para cruzar com a tela de e-mails.

| docId | Automático via |
|-------|----------------|
| `leads_email1` … `leads_email5` | Cron `send-automatic-emails` |
| `leads_nutri_email1` … `leads_nutri_email5` | Cron `send-automatic-emails-leads-nutri-personal` |
| `leads_personal_email1` … `leads_personal_email5` | Idem |
| `solicitado_medico_boas_vindas` | `POST send-email-solicitado-medico` |
| `solicitado_nutri_boas_vindas` | `POST send-email-solicitado-nutri` |
| `solicitado_personal_boas_vindas` | `POST send-email-solicitado-personal` |
| `em_tratamento_plano_editado` | `POST send-email-plano-editado` |
| `novo_lead_medico_novo_lead` | `POST send-email-novo-lead-medico-gestor` |
| `novo_lead_para_medico_novo_lead` | `POST send-email-novo-lead-medico` |
| `aplicacao_aplicacao_antes` / `aplicacao_aplicacao_dia` | Cron `send-email-aplicacao` + `POST send-email-aplicacao` |
| `lead_avulso_novo_lead` | `POST send-email-lead-avulso` |
| `check_recomendacoes_recomendacoes_lidas` | `POST send-email-check-recomendacoes` |
| `bem_vindo_bem_vindo_geral`, `bem_vindo_bem_vindo_medico` | `POST send-email-bem-vindo` |
| `novidades_novidade` | `POST send-email-novidades` |
| `agenda_agenda_semanal`, `agenda_agenda_diario` | Crons agenda semanal / diária |
| `aniversariante_parabenizar` | Cron `send-email-aniversariante` (se agendado) |
| `conclusao_tratamento_lembrete_conclusao` | Cron `send-email-conclusao-lembrete` |
| `conclusao_tratamento_conclusao_tratamento` | `POST send-email-conclusao-tratamento` |
| `mentoria_lead` | `POST /api/lead` |
| Demais docs em `NOVOS_MODULOS_EMAIL_DOCS` | Ver secções 3 e 4 |

---

## 6. Manutenção

- Ao adicionar cron no Vercel, use `GET` na rota (com `CRON_SECRET` / auth se o projeto exigir).
- Atualize este arquivo quando: incluir rota no `vercel.json`, ligar um `POST` novo no app, ou criar cron para nutri/personal agenda/consulta/treino.

Documento gerado a partir do código em `app/api`, `vercel.json` e `data/emailConfigNovosModulos.ts`.
