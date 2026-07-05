# Roadmap da Plataforma — Oftware

**Status:** visão macro de longo prazo (Etapa 14)  
**Natureza:** épicos estratégicos — **não** lista de tarefas de engenharia

Para roadmaps detalhados por módulo, consulte os Playbooks (ex.: [Nova Organização](../playbooks/nova-organizacao/04_roadmap.md)).

---

## Legenda

| Status | Significado |
|--------|-------------|
| ✅ Em produção | Entregue e operacional |
| 🔵 Em evolução | Fundação pronta; refinamento ativo |
| 📋 Planejado | Próximo ciclo estratégico |
| 🔮 Longo prazo | Visão; sem compromisso de data |

---

## Arquitetura

**Objetivo:** plataforma SaaS multi-organização sólida, evolutiva e documentada.

| Marco | Status |
|-------|--------|
| Arquitetura Oftware 2.0 (documento mestre) | ✅ |
| `organizationId` — tipos, registry, backfill | 🔵 |
| Documentação estratégica (Company) | 🔵 |
| Mapa de Playbooks | 🔵 |
| Middleware multi-host completo | 📋 |
| Filtro estrito por org em todas as queries | 📋 |
| Auth claims por organização | 🔮 |
| Observabilidade por org | 🔮 |

---

## Organizações

**Objetivo:** nascer, configurar, operar e escalar organizações White Label.

| Marco | Status |
|-------|--------|
| Organização Método Emagrecer (org #1) | ✅ |
| Registry estático + branding oficial | ✅ |
| MetaAdminGeral UX 2.0 (Plataforma / Org Ativa) | ✅ |
| Dashboard da Organização | ✅ |
| Marca da Organização (MAG + Firestore) | ✅ |
| Dual read branding | ✅ |
| Playbook Nova Organização | 🔵 |
| Hub Organizações + Leads WL | ✅ |
| Fluxo “Nova Organização” no MAG | 📋 |
| Domínio / Vercel / Firebase por org | 📋 |
| Multi-org em escala (10+ orgs) | 🔮 |

---

## White Label

**Objetivo:** vender, entregar e operar organizações como produto B2B.

| Marco | Status |
|-------|--------|
| Método como primeira org WL | ✅ |
| Leads White Label (CRM comercial) | ✅ |
| Playbook White Label | 📋 |
| Contrato digital + assinatura | 📋 |
| Onboarding automatizado pós-venda | 📋 |
| Self-service de configuração | 🔮 |

---

## Marketplace

**Objetivo:** ecossistema de produtos e serviços entre organizações e patrimônio global.

| Marco | Status |
|-------|--------|
| Conceito no Patrimônio Global | 📋 |
| Playbook Marketplace | 📋 |
| Catálogo transacional | 🔮 |
| Revenue share por org | 🔮 |

---

## Financeiro

**Objetivo:** visão econômica por organização e consolidada na plataforma.

| Marco | Status |
|-------|--------|
| Pagamentos paciente (existente) | ✅ |
| Dashboard financeiro org no MAG | 📋 |
| Billing SaaS por org | 🔮 |
| Relatórios consolidados plataforma | 🔮 |

---

## IA

**Objetivo:** inteligência artificial global (patrimônio) com extensões por organização.

| Marco | Status |
|-------|--------|
| Anamnese inteligente | ✅ |
| Documentação arquitetura IA | 🔵 |
| Playbook IA | 📋 |
| IA por org (prompts, toggles) | 🔮 |
| Self-improvement engine | 🔮 |

---

## OftPay

**Objetivo:** produto educacional e monetização de conteúdo científico.

| Marco | Status |
|-------|--------|
| Cursos e apostilas | ✅ |
| Questões / laudo-exames IA | 🔵 |
| Playbook OftPay | 📋 |
| Integração com org (white label educacional) | 🔮 |

---

## Meta Business

**Objetivo:** integrações Meta (Instagram, WhatsApp) para marketing e CRM.

| Marco | Status |
|-------|--------|
| Painel Meta Business (MAG) | ✅ |
| Playbook Meta Business | 📋 |
| Instagram bio por org | 📋 |
| WhatsApp CRM integrado | 🔮 |

---

## CRM

**Objetivo:** funis comerciais e relacionamento — separados por contexto.

| Marco | Status |
|-------|--------|
| CRM Leads White Label | ✅ |
| CRM Leads clínicos (pacientes) | ✅ |
| Playbook CRM unificado | 📋 |
| Automações de nurturing | 🔮 |

---

## Relacionamento

**Objetivo:** comunicação contínua entre org, equipe e paciente.

| Marco | Status |
|-------|--------|
| Mensagens paciente-equipe | ✅ |
| E-mails automáticos (cron) | ✅ |
| NPS | ✅ |
| Playbook Onboarding Paciente | 📋 |
| Central de relacionamento por org | 🔮 |

---

## Aplicativos

**Objetivo:** experiências mobile e PWA da jornada clínica.

| Marco | Status |
|-------|--------|
| Web responsiva (`/meta`) | ✅ |
| PWA / app nativo | 🔮 |
| Push notifications por org | 🔮 |

---

## Documentação (meta-épico)

**Objetivo:** conhecimento permanente, independente de pessoas ou conversas.

| Marco | Status |
|-------|--------|
| Arquitetura Oftware 2.0 | ✅ |
| Company (Etapa 14) | 🔵 |
| Playbook Nova Organização | 🔵 |
| Playbooks restantes | 📋 |
| Documentação sempre atualizada (processo) | 🔵 |

---

## Horizonte estratégico

```
2025–2026   Fundação multi-org + Método + documentação
2026        Nova Organização + White Label comercial
2027+       Escala (multi-org) + Marketplace + Financeiro SaaS
Longo prazo Plataforma self-service + IA por org + mobile
```

---

## Manutenção deste documento

Atualizar quando um **épico** mudar de status (não a cada PR).

Responsável: produto + arquitetura, em conjunto.
