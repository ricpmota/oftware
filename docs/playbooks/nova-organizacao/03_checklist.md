# Nova Organização — Checklist Oficial

**Tipo:** checklist operacional  
**Uso:** antes de marcar uma Organização como **Ativa** em produção

Marque cada item. Itens marcados com ⚙️ exigem ação técnica; 📋 exigem validação humana.

---

## Fase 0 — Comercial

| # | Item | Resp. | Status |
|---|------|-------|--------|
| 0.1 | 📋 Lead White Label qualificado | Comercial | ☐ |
| 0.2 | 📋 Contrato assinado | Comercial | ☐ |
| 0.3 | 📋 Domínio desejado confirmado com cliente | Comercial | ☐ |
| 0.4 | 📋 Escopo definido (médicos, produtos, integrações) | Produto | ☐ |

---

## Fase 1 — Criar Organização

| # | Item | Resp. | Status |
|---|------|-------|--------|
| 1.1 | ⚙️ `organizationId` definido (slug único, imutável) | Engenharia | ☐ |
| 1.2 | ⚙️ Registro no registry da plataforma | Engenharia | ☐ |
| 1.3 | ⚙️ Documento `organizations/{organizationId}` criado | Engenharia | ☐ |
| 1.4 | 📋 Nome comercial validado com cliente | Operações | ☐ |
| 1.5 | 📋 Status inicial = Rascunho | Operações | ☐ |

---

## Fase 2 — Branding

| # | Item | Resp. | Status |
|---|------|-------|--------|
| 2.1 | ⚙️ Seed de branding executado | Engenharia | ☐ |
| 2.2 | 📋 Nome público = nome da **organização** (não do médico) | Operações | ☐ |
| 2.3 | 📋 Logo principal enviado e aprovado | Cliente | ☐ |
| 2.4 | 📋 Cores primária / secundária definidas | Cliente | ☐ |
| 2.5 | 📋 Favicon e OG image configurados | Operações | ☐ |
| 2.6 | ⚙️ `siteUrl` aponta para domínio oficial | Engenharia | ☐ |
| 2.7 | 📋 Páginas públicas (aplicação, conclusão) revisadas visualmente | QA | ☐ |
| 2.8 | ⚙️ Branding salvo em `organizations/{id}.branding` | Engenharia | ☐ |

---

## Fase 3 — Primeiro Médico

| # | Item | Resp. | Status |
|---|------|-------|--------|
| 3.1 | ⚙️ Médico cadastrado com `organizationId` correto | Engenharia | ☐ |
| 3.2 | 📋 CRM e dados profissionais validados | Operações | ☐ |
| 3.3 | ⚙️ Médico verificado / aprovado | Engenharia | ☐ |
| 3.4 | 📋 Médico consegue acessar MetaAdmin | QA | ☐ |
| 3.5 | 📋 Página `/dr/[slug]` exibe marca da org | QA | ☐ |
| 3.6 | 📋 Credenciais entregues ao cliente | Operações | ☐ |

---

## Fase 4 — Domínio e Infraestrutura

| # | Item | Resp. | Status |
|---|------|-------|--------|
| 4.1 | ⚙️ DNS configurado (A/CNAME → Vercel) | Engenharia | ☐ |
| 4.2 | ⚙️ Domínio adicionado no Vercel | Engenharia | ☐ |
| 4.3 | ⚙️ Host registrado em `organizationRegistry` (`hosts[]`) | Engenharia | ☐ |
| 4.4 | ⚙️ SSL ativo (HTTPS) | Engenharia | ☐ |
| 4.5 | ⚙️ Variáveis de ambiente revisadas | Engenharia | ☐ |
| 4.6 | 📋 Domínio acessível externamente | QA | ☐ |

---

## Fase 5 — Firebase

| # | Item | Resp. | Status |
|---|------|-------|--------|
| 5.1 | ⚙️ Firestore Rules compatíveis com nova org | Engenharia | ☐ |
| 5.2 | ⚙️ Auth: médico consegue login | QA | ☐ |
| 5.3 | ⚙️ Storage: upload de fotos/branding funciona | QA | ☐ |
| 5.4 | ⚙️ Backfill `organizationId` executado (dry run → exec) | Engenharia | ☐ |
| 5.5 | 📋 Auditoria Saúde da Plataforma ≥ meta de cobertura | Operações | ☐ |

---

## Fase 6 — Rotas e Jornada do Paciente

| # | Item | Rota | Status |
|---|------|------|--------|
| 6.1 | Portal paciente | `/meta` | ☐ |
| 6.2 | Check-in aplicação | `/aplicacao/[token]` | ☐ |
| 6.3 | Conclusão tratamento | `/conclusao/[token]` | ☐ |
| 6.4 | Página médico | `/dr/[slug]` | ☐ |
| 6.5 | Prescrição pública | `/prescricao/documento` | ☐ |
| 6.6 | MetaAdmin | `/metaadmin` | ☐ |
| 6.7 | MetaNutri / MetaPersonal | `/metanutri`, `/metapersonal` | ☐ |
| 6.8 | 📋 Marca da org visível em **todas** as rotas acima | QA | ☐ |
| 6.9 | 📋 Oftware **não** aparece na jornada do paciente | QA | ☐ |

---

## Fase 7 — Operação

| # | Item | Resp. | Status |
|---|------|-------|--------|
| 7.1 | 📋 E-mails automáticos testados (aplicação, leads) | QA | ☐ |
| 7.2 | 📋 Calendário de aplicações operacional | QA | ☐ |
| 7.3 | 📋 Leads clínicos aparecem no MAG (org) | QA | ☐ |
| 7.4 | 📋 NPS configurado | Operações | ☐ |
| 7.5 | 📋 Contratos (se aplicável) | Operações | ☐ |
| 7.6 | 📋 Dashboard da org exibe métricas | QA | ☐ |

---

## Fase 8 — Ativar

| # | Item | Resp. | Status |
|---|------|-------|--------|
| 8.1 | 📋 Checklist completo revisado por 2 pessoas | Operações | ☐ |
| 8.2 | ⚙️ Status da org = **Ativa** | Engenharia | ☐ |
| 8.3 | 📋 Cliente notificado (go-live) | Comercial | ☐ |
| 8.4 | 📋 Suporte de acompanhamento agendado (7 dias) | Sucesso | ☐ |

---

## Fase 9 — Pós go-live

| # | Item | Resp. | Status |
|---|------|-------|--------|
| 9.1 | 📋 Primeiro paciente cadastrado com sucesso | Cliente | ☐ |
| 9.2 | 📋 Primeira aplicação registrada | Cliente | ☐ |
| 9.3 | ⚙️ Monitoramento de erros (24–48h) | Engenharia | ☐ |
| 9.4 | 📋 Retrospectiva de onboarding documentada | Produto | ☐ |

---

## Critérios de bloqueio (não ativar se)

- ❌ Branding incompleto ou com nome de médico no lugar da org
- ❌ Domínio não responde em HTTPS
- ❌ Primeiro médico sem `organizationId`
- ❌ Cobertura de auditoria crítica (< 90% — ajustar meta conforme política)
- ❌ Rotas públicas exibem marca Oftware ou quebrada

---

## Registro de execução

| Campo | Valor |
|-------|-------|
| Organização | |
| organizationId | |
| Data go-live | |
| Responsável técnico | |
| Responsável operacional | |
| Observações | |

---

## Referências

- [01_fluxo_funcional.md](./01_fluxo_funcional.md)
- [02_fluxo_tecnico.md](./02_fluxo_tecnico.md)
- [04_roadmap.md](./04_roadmap.md)
