# Possibilidades de envio automático via WhatsApp — MetaAdmin e MetaAdminGeral

**Tipo:** documento de produto / roadmap exploratório  
**Data:** julho/2026  
**Escopo:** ideias e priorização — **não é especificação de implementação**  
**Público:** produto, engenharia e operação Oftware  

---

## 1. Objetivo

Mapear **onde e como** o envio automático de WhatsApp pode agregar valor no ecossistema Oftware, considerando:

- o que **já existe** hoje;
- o que já roda por **e-mail** e poderia ter par WhatsApp;
- diferenças entre **`/metaadmin`** (médico / organização) e **`/metaadmingeral`** (governança global);
- limites técnicos, legais e de experiência do paciente.

Este documento serve como **menu de possibilidades** para decidir o que entra no roadmap — não como compromisso de entrega.

---

## 2. Baseline — o que já temos

### 2.1 Infraestrutura

| Elemento | Situação |
|----------|----------|
| Servidor WPPConnect | Central em `https://whatsapp.oftware.com.br` (VM + disco persistente) |
| Sessão por médico | `org_{organizationId}_doctor_{doctorId}` |
| Conexão | QR Code no **Meu Perfil → WhatsApp** do médico |
| Escopo consciente | Envio autorizado pelo Oftware — **sem CRM, inbox ou leitura de conversas** |
| Log | `whatsapp_message_logs` + histórico de `whatsapp_auto_aplicacao_envios` |
| Auth | Token por sessão (`wppSessionToken` server-only) |

### 2.2 Funcionalidade implementada (MetaAdmin)

| Caso de uso | Status | Detalhe |
|-------------|--------|---------|
| Lembrete de **aplicação no dia** | ✅ Em produção | Cron `send-whatsapp-aplicacao` (1 paciente/minuto/médico); horário configurável (Brasília); link público de aplicação |
| Envio de **teste manual** | ✅ | Validação da sessão conectada |
| **Log** de envios | ✅ | Aba Log no perfil do médico |
| Badges no **calendário** | ✅ | Ícones de automático / enviado / falha |

### 2.3 Paralelo por e-mail (já no sistema)

Vários fluxos automáticos **já existem por e-mail** via crons ZeptoMail. São candidatos naturais a “também por WhatsApp” ou “só WhatsApp se o paciente não tiver e-mail”:

| Cron / fluxo | Função |
|--------------|--------|
| `send-email-aplicacao` | Lembrete de aplicação (manhã + reforços) |
| `send-email-agenda-diario` | Agenda do dia para o médico/paciente |
| `send-email-agenda-semanal` | Visão semanal de aplicações |
| `send-email-conclusao-lembrete` | Lembrete de conclusão de tratamento |
| `send-email-aniversariante` | Mensagem de aniversário |
| `send-automatic-emails` | Campanha de leads (e-mail 1–5) |
| `send-automatic-emails-leads-nutri-personal` | Campanha nutri/personal |
| Diversos `send-email-*` pontuais | Boas-vindas, solicitação médico, plano editado, prescrição, etc. |

O WhatsApp **não substitui** automaticamente esses e-mails hoje — cada caso exigiria produto, consentimento e engenharia próprios.

---

## 3. Princípios para qualquer nova automação

Antes de escolher casos de uso, vale fixar regras que já orientam a arquitetura atual:

1. **Remetente = WhatsApp do médico** — a mensagem chega como se o consultório enviasse; reforça confiança e vínculo clínico.
2. **Opt-in implícito no tratamento** — paciente com telefone no prontuário e em tratamento ativo; considerar flag explícita `aceitaWhatsApp` no futuro.
3. **Sem spam** — respeitar janela de horário (ex.: 8h–20h Brasília), intervalo entre envios (hoje: 1/min no automático de aplicação) e limite diário por médico.
4. **Mensagem transacional** — lembrete, confirmação, link de ação; evitar marketing agressivo no número pessoal do médico.
5. **Idempotência** — um envio por evento (ex.: uma aplicação/dia), com registro em log e retry controlado.
6. **Fallback** — se WhatsApp falhar ou médico desconectado: manter e-mail ou apenas registrar falha (como hoje).
7. **LGPD** — telefone é dado sensível; logs com preview truncado; política de retenção; direito de opt-out.
8. **MetaAdminGeral não envia no lugar do médico** — governança, templates, métricas e alertas; o disparo continua na sessão do médico (exceto cenários futuros com **número institucional** da organização, ainda não modelados).

---

## 4. Possibilidades no MetaAdmin (`/metaadmin`)

Organizado por módulo do painel do médico.

### 4.1 Calendário e tratamento (alta aderência)

| # | Possibilidade | Descrição | Ganho esperado | Complexidade | Observações |
|---|---------------|-----------|----------------|--------------|-------------|
| A1 | **Lembrete no dia da aplicação** | Link para registrar aplicação no dia previsto | Alto | — | ✅ **Já implementado** |
| A2 | **Lembrete 1 dia antes** | “Amanhã é dia da sua aplicação” + link | Alto | Média | Espelha reforço do e-mail; evita surpresa |
| A3 | **Aplicação atrasada (MISSED)** | Após data sem registro, mensagem de reengajamento | Alto | Média | Requer regra clara (ex.: D+1, D+3) |
| A4 | **Confirmação pós-registro** | Quando paciente preenche link público | Médio | Baixa | Webhook/evento no `ensureAplicacaoPublicUrl` |
| A5 | **Conclusão de tratamento** | Lembrete para fluxo de conclusão (par do cron de e-mail) | Alto | Média | Reutiliza `ensureConclusaoPublicUrl` |
| A6 | **Mudança de dose / plano** | Aviso quando médico altera esquema na semana seguinte | Médio | Média | Disparo sob demanda, não cron |
| A7 | **Semana cancelada / pausa** | Informar pausa programada no plano | Baixo | Baixa | Evento pontual |

### 4.2 Agenda e rotina clínica

| # | Possibilidade | Descrição | Ganho esperado | Complexidade | Observações |
|---|---------------|-----------|----------------|--------------|-------------|
| B1 | **Agenda diária do paciente** | Resumo das aplicações/compromissos do dia | Médio | Alta | Par do `send-email-agenda-diario` |
| B2 | **Agenda semanal** | Domingo: visão da semana | Médio | Alta | Par do `send-email-agenda-semanal` |
| B3 | **Aniversário** | Mensagem personalizada no dia | Médio | Baixa | Par do `send-email-aniversariante`; tom leve |
| B4 | **Lembrete de consulta presencial** | Se houver agenda de consultas no sistema | Médio | Alta | Depende de módulo de consultas maduro |

### 4.3 Pacientes, onboarding e vínculo

| # | Possibilidade | Descrição | Ganho esperado | Complexidade | Observações |
|---|---------------|-----------|----------------|--------------|-------------|
| C1 | **Boas-vindas ao paciente** | Após aceite da solicitação / início do tratamento | Alto | Média | Par do `send-email-bem-vindo` |
| C2 | **Solicitação recebida** | “Dr. X recebeu sua solicitação” | Médio | Baixa | Reduz ansiedade do lead-paciente |
| C3 | **Perfil incompleto** | Lembrete para completar anamnese / telefone | Médio | Média | Cron semanal por paciente incompleto |
| C4 | **Convite nutri / personal** | Quando médico vincula profissional ao paciente | Médio | Média | Mensagem com link `/meta/nutri` ou `/meta/personal` |
| C5 | **Reativação** | Paciente inativo há X semanas | Alto | Alta | Cuidado com tom; opt-out obrigatório |

### 4.4 Leads e captação (painel do médico)

| # | Possibilidade | Descrição | Ganho esperado | Complexidade | Observações |
|---|---------------|-----------|----------------|--------------|-------------|
| D1 | **Novo lead no pipeline** | Notificar **médico** (não paciente) de novo lead | Alto | Baixa | WhatsApp do médico para si mesmo ou segundo número |
| D2 | **Follow-up automático ao lead** | Sequência 1–3 mensagens ao lead com telefone | Alto | Alta | Risco de spam; preferir opt-in explícito |
| D3 | **Lead qualificado** | Mensagem de boas-vindas + link cadastro | Médio | Média | Substituir/complementar e-mail de campanha |
| D4 | **Link público do médico** | Envio do `/dr/...` após primeiro contato | Médio | Baixa | Pode ser manual + template |

### 4.5 Financeiro

| # | Possibilidade | Descrição | Ganho esperado | Complexidade | Observações |
|---|---------------|-----------|----------------|--------------|-------------|
| E1 | **Parcela a vencer** | D-3 e D-0 | Alto | Média | Módulo financeiro já existe no MetaAdmin |
| E2 | **Parcela em atraso** | D+3, D+7 com tom escalonado | Alto | Média | Sensível; template aprovado pelo médico |
| E3 | **Confirmação de pagamento** | Quando status muda para pago | Médio | Baixa | Evento síncrono |

### 4.6 Exames, prescrições e conteúdo clínico

| # | Possibilidade | Descrição | Ganho esperado | Complexidade | Observações |
|---|---------------|-----------|----------------|--------------|-------------|
| F1 | **Solicitação de exame** | Link para upload / lembrete de jejum | Médio | Média | Integração com módulo de exames |
| F2 | **Resultado disponível** | “Seu exame foi registrado” (sem dado clínico no WhatsApp) | Médio | Média | Privacidade: só link para área logada |
| F3 | **Prescrição / tirzepatida** | Link PDF ou instruções de compra | Médio | Alta | Cuidado regulatório; médico revisa template |
| F4 | **Lembrete bioimpedância** | Próxima medição prevista | Baixo | Média | Nicho |

### 4.7 Mensagens in-app e coordenação

| # | Possibilidade | Descrição | Ganho esperado | Complexidade | Observações |
|---|---------------|-----------|----------------|--------------|-------------|
| G1 | **Nova mensagem do médico** | Push via WhatsApp quando há msg não lida | Alto | Média | Paciente volta ao `/meta`; não duplicar texto longo |
| G2 | **Encaminhamento / indicação** | Agradecer quem indicou novo paciente | Baixo | Baixa | Evento raro |
| G3 | **NPS pós-tratamento** | Link pesquisa satisfação | Médio | Baixa | Par do módulo NPS |

### 4.8 Configuração no perfil do médico (produto)

| # | Possibilidade | Descrição |
|---|---------------|-----------|
| H1 | **Central de automações** | Um painel por tipo (aplicação, financeiro, leads…) com switch + horário |
| H2 | **Templates editáveis** | Médico personaliza texto com variáveis `{nome}`, `{link}`, `{dose}` |
| H3 | **Pré-visualização** | Ver mensagem antes de ativar automação |
| H4 | **Opt-out por paciente** | Flag no prontuário “não enviar WhatsApp” |
| H5 | **Relatório no Log** | Filtros por tipo, status, período (evolução da aba Log atual) |

---

## 5. Possibilidades no MetaAdminGeral (`/metaadmingeral`)

O admin geral **não opera o WhatsApp de cada paciente** diretamente; atua em **política, visibilidade, templates globais e saúde da plataforma**.

### 5.1 Governança e visibilidade

| # | Possibilidade | Descrição | Ganho esperado | Complexidade |
|---|---------------|-----------|----------------|--------------|
| I1 | **Dashboard WhatsApp global** | Envios/dia, taxa de falha, médicos conectados vs desconectados | Alto | Média |
| I2 | **Alertas operacionais** | E-mail/Slack interno quando servidor WPP cai ou fila de falhas > X% | Alto | Baixa |
| I3 | **Auditoria por organização** | White label: volume por `organizationId` | Médio | Média |
| I4 | **Log agregado (somente leitura)** | Suporte consulta envios sem ver conteúdo clínico completo | Médio | Média |

### 5.2 Templates e políticas por organização

| # | Possibilidade | Descrição | Ganho esperado | Complexidade |
|---|---------------|-----------|----------------|--------------|
| J1 | **Biblioteca de templates** | Admin define textos padrão por org (Método, clínicas WL) | Alto | Média |
| J2 | **Horário permitido global** | Ex.: nenhum envio antes das 7h ou após 21h | Médio | Baixa |
| J3 | **Limite de envios/dia/médico** | Proteção anti-ban WhatsApp | Alto | Baixa |
| J4 | **Feature flags por org** | Habilitar/desabilitar categorias (financeiro, leads…) | Alto | Média |

### 5.3 Onboarding e adoção

| # | Possibilidade | Descrição | Ganho esperado | Complexidade |
|---|---------------|-----------|----------------|--------------|
| K1 | **Lembrete ao médico desconectado** | E-mail + banner: “Conecte seu WhatsApp para lembretes automáticos” | Alto | Baixa |
| K2 | **Ranking de adoção** | % médicos conectados por organização | Médio | Baixa |
| K3 | **Wizard no MetaAdminGeral** | Material de treinamento / vídeo QR Code | Baixo | Baixa |

### 5.4 Leads, marketing e white label

| # | Possibilidade | Descrição | Ganho esperado | Complexidade | Risco |
|---|---------------|-----------|----------------|--------------|-------|
| L1 | **Campanha leads WL por org** | Número **institucional** da org (futuro), não do médico | Alto | Muito alta | Alto — modelo diferente do atual |
| L2 | **Integração Meta Business API** | Canal oficial para marketing | Alto | Muito alta | Custo + aprovação Meta |
| L3 | **Espelhar campanhas e-mail 1–5** | WhatsApp na jornada de leads Firebase | Médio | Alta | Spam / bloqueio |
| L4 | **Agendamento reunião WL** | Confirmação WhatsApp (`schedule-meeting`) | Baixo | Média | Baixo |

### 5.5 Módulos já existentes no admin geral

| Módulo | Oportunidade WhatsApp |
|--------|------------------------|
| **Calendário global** | Visão de falhas de envio automático em todas as aplicações do dia |
| **E-mails** | Tela “par e-mail ↔ WhatsApp” — qual automação tem canal duplicado |
| **Leads** | Métricas: lead com telefone vs sem; conversão por canal |
| **NPS** | Disparo da pesquisa via sessão do médico (config global) |
| **Relatórios** | Export CSV de logs WhatsApp por período |
| **Médicos** | Coluna “WhatsApp conectado” + data última verificação |
| **Contratos** | Lembrete assinatura pendente (se telefone no contrato) |

---

## 6. Matriz de priorização sugerida

Legenda: **Impacto** no tratamento/retenção · **Esforço** de engenharia · **Risco** (spam, ban, LGPD).

### Onda 1 — curto prazo (encaixa na arquitetura atual)

| Item | Onde | Por quê |
|------|------|---------|
| A2 Lembrete 1 dia antes | MetaAdmin | Extensão natural do cron de aplicação |
| A3 Aplicação atrasada | MetaAdmin | Alto impacto clínico |
| A5 Conclusão de tratamento | MetaAdmin | Já existe lógica e e-mail |
| H1/H4 Config + opt-out por paciente | MetaAdmin | Base para tudo |
| I1 Dashboard + K1 alerta desconexão | MetaAdminGeral | Operação e adoção |
| K2 % médicos conectados | MetaAdminGeral | KPI simples |

### Onda 2 — médio prazo

| Item | Onde | Por quê |
|------|------|---------|
| C1 Boas-vindas paciente | MetaAdmin | Onboarding |
| E1/E2 Financeiro | MetaAdmin | Receita |
| G1 Nova mensagem in-app | MetaAdmin | Retorno ao app |
| J1 Templates por org | MetaAdminGeral | White label |
| H2 Templates editáveis | MetaAdmin | Personalização |
| B3 Aniversário | MetaAdmin | Baixo esforço |

### Onda 3 — longo prazo ou modelo diferente

| Item | Onde | Por quê |
|------|------|---------|
| B1/B2 Agenda diária/semanal | MetaAdmin | Alto volume de mensagens |
| D2 Campanha leads automática | MetaAdmin | Risco + consentimento |
| L1/L2 Número institucional / Meta API | MetaAdminGeral | Nova arquitetura |
| F3 Prescrição automática | MetaAdmin | Compliance |

---

## 7. Modelo técnico recomendado (evolução)

Para não criar um cron por caso de uso:

```
┌─────────────────────────────────────────────────────────┐
│  Eventos (cron, Firestore trigger, ação do médico)      │
└──────────────────────────┬──────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────┐
│  whatsappAutomationEngine                               │
│  - fila por medicoId                                    │
│  - regras: horário, opt-out, idempotência               │
│  - templates + variáveis                                │
└──────────────────────────┬──────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────┐
│  withWhatsappProviderAuth → sendMessage                   │
│  registrarWhatsappMessageLog                            │
└─────────────────────────────────────────────────────────┘
```

**Tipos de automação** (enum futuro): `aplicacao_dia`, `aplicacao_d1`, `aplicacao_atrasada`, `conclusao`, `financeiro_vencimento`, `aniversario`, `teste`, etc.

**Configuração** (Firestore): expandir `whatsappConnections` ou criar `whatsapp_auto_settings/{doctorId}` com mapa por tipo.

---

## 8. O que não recomendamos (por ora)

| Ideia | Motivo |
|-------|--------|
| Inbox / CRM WhatsApp no MetaAdmin | Fora do escopo; custo e compliance |
| Respostas automáticas com IA no WhatsApp do médico | Risco clínico e jurídico |
| Disparo em massa para base de leads sem opt-in | Banimento e LGPD |
| MetaAdminGeral enviar como se fosse cada médico sem sessão | Viola modelo atual |
| Substituir todos os e-mails por WhatsApp | E-mail continua fallback e canal formal |

---

## 9. Dependências e checklist antes de cada nova automação

- [ ] Paciente tem telefone válido (normalização BR)?
- [ ] Médico com `status === connected`?
- [ ] Automação habilitada nas configurações do médico?
- [ ] Paciente sem opt-out?
- [ ] Horário dentro da janela permitida?
- [ ] Evento ainda não registrado no log (idempotência)?
- [ ] Mensagem revisada (template padrão ou custom)?
- [ ] Fallback se falhar (e-mail / só log)?

---

## 10. Resumo executivo

| Área | Melhor aposta |
|------|----------------|
| **MetaAdmin** | Dobrar a aposta em **jornada de tratamento** (aplicação, atraso, conclusão) e depois **financeiro + onboarding** |
| **MetaAdminGeral** | **Visibilidade, políticas e templates** — não disparo direto ao paciente |
| **Arquitetura** | Motor único de automações com tipos configuráveis, reaproveitando WPPConnect e logs existentes |
| **Já entregue** | Lembrete de aplicação no dia + teste + log — base sólida para Onda 1 |

---

## 11. Referências no repositório

| Tema | Caminho |
|------|---------|
| Arquitetura WPPConnect | `docs/whatsapp/ARQUITETURA_WPPCONNECT_PRODUCAO.md` |
| UI conexão + log | `components/metaadmin/WhatsappConnectionSection.tsx` |
| Motor automático aplicação | `services/whatsappAutoAplicacaoService.ts` |
| Cron WhatsApp | `app/api/cron/send-whatsapp-aplicacao/route.ts` |
| Logs | `services/whatsappMessageLogService.ts` |
| Crons e-mail (paralelos) | `vercel.json` + `app/api/cron/` |
| Mapa módulos | `docs/00_mapa_mestre_oftware.md` |

---

*Documento vivo — revisar após cada entrega de automação e feedback dos médicos piloto.*
