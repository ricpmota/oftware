# Departamento — Jornada

**Departamento oficial:** Jornada  
**Nav MAG atual:** Operação (`org-operacao`) — convergência futura

---

## Objetivo

Definir e operar **como o paciente vive o tratamento** dentro da Organização — do check-in à conclusão.

Jornada é o **coração clínico-operacional** da org: aplicações, agenda, contratos, comunicações de tratamento, relatórios clínicos.

---

## Responsabilidades

- Calendário e agendamento de aplicações
- Check-ins por token (`/aplicacao`, `/conclusao`)
- Evolução e acompanhamento clínico (visão org agregada)
- Contratos de tratamento
- E-mails **operacionais** de tratamento (não marketing)
- Relatórios clínicos e operacionais
- Produtos usados no protocolo (ex.: tirzepatida — gestão org)
- Portal do paciente `/meta` (experiência — config via Identidade)

---

## Submódulos previstos

| Submódulo | Descrição | Status |
|-----------|-----------|--------|
| **Calendário** | Aplicações agendadas, status e-mail | ✅ `calendario` |
| **Aplicações / check-in** | Links token, fotos evolução, scores | ✅ rotas públicas |
| **Conclusão tratamento** | Fluxo fim de ciclo | ✅ `/conclusao/[token]` |
| **Contratos** | Tratamento, assinatura, sync status | ✅ `contratos` |
| **E-mails operacionais** | Cron aplicação, agenda, aniversário | ✅ `emails` |
| **Relatórios** | Clínicos, evolução agregada | ✅ `relatorios` |
| **Produtos org** | Tirzepatida preços, doses | ✅ `tirzepatida` |
| **Prescrições** | Documentos públicos validação | ✅ `/prescricao/documento` |
| **Dashboard evolução** | Gráficos peso, adesão | ✅ parcial |
| **Marco zero / fotos** | Evolução visual paciente | ✅ implementado |

---

## Exemplos de funcionalidades

- Enviar e-mail de aplicação semanal
- Ver calendário de doses por paciente
- Gerar link de check-in para semana N
- Assinar contrato de tratamento (Bry/sandbox)
- Relatório tokenizado para paciente
- Configurar preço tirzepatida da org
- Monitorar adesão (MISSED vs OK)

---

## O que NÃO pertence a Jornada

| Item | Departamento correto |
|------|---------------------|
| Lista admin de todos pacientes | Pacientes |
| Captação de leads | Pacientes / Marketing |
| Logo na página de aplicação | Identidade |
| Cadastro de médico | Equipe |
| Faturamento e receita | Negócio |
| NPS pós-tratamento | Pacientes |
| Protocolos SISTEMA (catálogo global) | Patrimônio Global |
| Anamnese inteligente (motor IA) | IA ( consome em Jornada ) |
| Chat Inicial global | Patrimônio Global |

---

## Princípios

1. Jornada acontece no **domínio da org**
2. Tokens públicos devem carregar **branding da org**
3. E-mails operacionais ≠ campanhas marketing
4. MetaAdmin do médico é superfície primária; MAG Jornada é **visão agregada org**

---

## Referência atual

- Menus: `calendario`, `contratos`, `emails`, `relatorios`, `tirzepatida`
- Componentes: `CalendarioAplicacoes`, `AplicacaoCheckInPageClient`, `RelatoriosSection`
- APIs: `/api/aplicacao/[token]/*`, `/api/conclusao/[token]/*`
