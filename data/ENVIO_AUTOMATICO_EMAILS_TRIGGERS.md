# Envio automático de e-mails – triggers e rotas

Cada módulo de e-mail pode ser disparado por **cron** (agendado) ou por **evento** (quando algo acontece na aplicação). Abaixo, onde cada um é executado e qual rota chamar.

---

## 1. Cron (agendado)

Chamar periodicamente (ex.: a cada hora ou diário) via agendador (Vercel Cron, etc.).

| Cron route | O que faz | Config (emails/config) |
|------------|-----------|--------------------------|
| `GET /api/cron/send-automatic-emails` | Envia leads médico (email1..5) para usuários sem médico | `envioAutomatico.ativo` |
| `GET /api/cron/send-automatic-emails-leads-nutri-personal` | Envia leads_nutri e leads_personal (email1..5) para quem ainda não tem nutricionista/personal; exclui quem já tem médico | `envioAutomaticoLeadsNutri.ativo`, `envioAutomaticoLeadsPersonal.ativo` (emails/config) |
| `GET /api/cron/send-email-agenda-diario` | Agenda diária para médicos | — |
| `GET /api/cron/send-email-agenda-semanal` | Agenda semanal para médicos | — |
| `GET /api/cron/send-email-aplicacao` | Lembretes de aplicação (antes/dia) | — |
| `GET /api/cron/send-email-aniversariante` | E-mail de parabéns no dia do aniversário do paciente (template aniversariante_parabenizar) | — |

*(Futuro: cron para agenda_nutri e agenda_personal diário/semanal; lembretes consulta_nutri e treino_personal.)*

---

## 2. Evento (chamar quando algo acontece)

Chamar a rota no momento em que o evento ocorre (ex.: ao aceitar solicitação).

| Evento | Rota | Payload |
|--------|------|--------|
| Solicitação médico aceita | `POST /api/send-email-solicitado-medico` | `{ solicitacaoId }` |
| Solicitação nutricionista aceita | `POST /api/send-email-solicitado-nutri` | `{ solicitacaoId }` |
| Solicitação personal aceita | `POST /api/send-email-solicitado-personal` | `{ solicitacaoId }` |
| Plano de tratamento editado (médico) | (já existente no fluxo do app) | — |
| Plano editado pelo nutricionista | `POST /api/send-email-plano-editado-nutri` | `{ pacienteId, nutricionistaId }` |
| Plano editado pelo personal | `POST /api/send-email-plano-editado-personal` | `{ pacienteId, personalId }` |
| Novo lead escolheu médico | (já existente: novo_lead_medico) | — |
| Nutricionista pediu vínculo | `POST /api/send-email-nutri-pediu-vinculo` | `{ medicoId, nutricionistaId, pacienteId }` |
| Personal pediu vínculo | `POST /api/send-email-personal-pediu-vinculo` | `{ medicoId, personalId, pacienteId }` |
| Novo lead escolheu nutricionista | `POST /api/send-email-novo-lead-nutri` | `{ nutricionistaId, leadId }` |
| Novo lead escolheu personal | `POST /api/send-email-novo-lead-personal` | `{ personalId, leadId }` |
| Paciente leu recomendações (médico) | (já existente) | — |
| Paciente leu recomendações (nutri) | `POST /api/send-email-recomendacoes-lidas-nutri` | `{ pacienteId, nutricionistaId }` |
| Aluno confirmou presença (personal) | `POST /api/send-email-presenca-confirmada-personal` | `{ alunoId, personalId }` |
| Novo cadastro (bem-vindo geral) | (já existente: send-email-bem-vindo) | — |
| Médico salva perfil 1ª vez | (já existente) | — |
| Nutricionista salva perfil 1ª vez | `POST /api/send-email-bem-vindo-nutri` | `{ nutricionistaId }` |
| Personal salva perfil 1ª vez | `POST /api/send-email-bem-vindo-personal` | `{ personalId }` |
| Lead avulso (admin) | (já existente) | — |
| Lead avulso nutri/personal | Chamar ao criar lead sem nutri/personal (mesmo fluxo do lead_avulso) | — |

As rotas marcadas como “(já existente)” já estão implementadas ou integradas ao fluxo atual; as outras podem ser criadas seguindo o padrão de `send-email-solicitado-medico` e lendo o template em `emails/<docId>` (ex.: `solicitado_nutri_boas_vindas`).

---

## 3. Onde os templates são salvos

Todos os templates são gravados na collection **emails** do Firestore. Os IDs dos documentos seguem o padrão `<modulo>_<templateKey>` (ex.: `leads_nutri_email1`, `solicitado_nutri_boas_vindas`). A lista completa está em `data/emailConfigNovosModulos.ts` (`NOVOS_MODULOS_EMAIL_DOCS`).
