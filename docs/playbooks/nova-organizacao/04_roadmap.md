# Nova Organização — Roadmap

**Tipo:** planejamento de produto  
**Atualizado:** fundação documental (Playbook v1.0)

---

## Legenda

| Status | Significado |
|--------|-------------|
| ✅ Concluído | Entregue e em produção |
| 🔵 Em andamento | Desenvolvimento ou documentação ativa |
| 📋 Planejado | Próximo ciclo definido |
| 🔮 Longo prazo | Visão, sem data |

---

## ✅ Concluído

### Arquitetura e fundação

| Etapa | Descrição |
|-------|-----------|
| Etapa 0 | Documento mestre Arquitetura Oftware 2.0 |
| Etapa 3 | Fundação: tipos, registry, equipe, patrimônio global |
| organizationId | Tipos, backfill, auditoria, classificação |
| Registry | Método Emagrecer como org #1 (`metodo`) |
| Host resolver | `resolveOrganizationFromHost` |
| Dual read URLs | Compat Etapa 2 tenant → organization |

### MetaAdminGeral

| Etapa | Descrição |
|-------|-----------|
| Etapa 11.1 | Marca oficial — `organizations/{id}.branding` |
| Etapa 11.2 | Dual read branding (org → whiteLabel legado) |
| Etapa 12 | Navegação UX 2.0 — Plataforma / Organização |
| Etapa 12.1 | Dashboard da Organização com métricas reais |
| Nav contextual | Organização Ativa, departamentos, aliases `?menu=` |
| Patrimônio Global | Chat Inicial, exames, protocolos, bio |
| Hub Organizações + Leads WL (Plataforma) | ✅ |

### Branding Método

| Item | Descrição |
|------|-----------|
| API branding | GET/PATCH + upload |
| Painel MAG | OrganizationBrandingPanel |
| OG / metadata | Site Método com branding org |
| Consolidação | Seed idempotente + repair publicName |

### Documentação

| Item | Descrição |
|------|-----------|
| Playbook Nova Organização | Este playbook (fundação) |
| Mapa dos Playbooks | `docs/00_MAPA_DOS_PLAYBOOKS.md` |

---

## 🔵 Em andamento

| Item | Descrição | Próximo passo |
|------|-----------|---------------|
| Cobertura organizationId | Backfill parcial; auditoria no MAG | Aumentar cobertura antes de multi-org |
| Filtro por org no MAG | Métricas globais hoje; filtro estrito futuro | Definir política por coleção |
| Playbook Nova Organização | Estrutura criada | Validar com time + evoluir com implementação |

---

## 📋 Planejado (curto / médio prazo)

### Nova Organização — fluxo MAG

| # | Etapa | Descrição |
|---|-------|-----------|
| 1 | **Criar org no MAG** | Formulário Nova Organização (nome, id, domínio) |
| 2 | **Registry dinâmico** | Firestore como fonte de orgs (além de registry estático) |
| 3 | **Branding seed automático** | Ao criar org, executar seed oficial |
| 4 | **Primeiro médico** | Wizard pós-criação: cadastro médico fundador |
| 5 | **Checklist integrado** | UI do checklist no MAG |
| 6 | **Status da org** | Rascunho → Ativa → Suspensa |

### Domínio e infra

| # | Etapa | Descrição |
|---|-------|-----------|
| 7 | **Domínio** | UI de configuração + validação DNS |
| 8 | **Vercel** | Automação ou runbook de domínio customizado |
| 9 | **Middleware multi-org** | Host → org em todas as rotas clínicas |
| 10 | **Firebase** | Decisão e implementação multi-tenant |

### White Label comercial

| # | Etapa | Descrição |
|---|-------|-----------|
| 11 | **Playbook White Label** | Jornada comercial completa |
| 12 | **CRM → Org** | Lead WL convertido dispara criação de org |
| 13 | **Contrato digital** | Assinatura e termos por org |

### MetaAdmin por org

| # | Etapa | Descrição |
|---|-------|-----------|
| 14 | **Filtro estrito** | Todas as queries filtram por `organizationId` |
| 15 | **MetaAdmin org-scoped** | Médico vê apenas sua org |
| 16 | **Roles org** | Gestor da org vs. médico vs. admin Oftware |

### Produto e marketing

| # | Etapa | Descrição |
|---|-------|-----------|
| 17 | **Landing por org** | Página pública configurável |
| 18 | **Instagram por org** | Bio links com branding |
| 19 | **Banners org-scoped** | Marketing isolado por org |
| 20 | **Financeiro org** | Receitas e pagamentos por organização |

---

## 🔮 Longo prazo

| Área | Visão |
|------|-------|
| **Multi-org em escala** | Dezenas de organizações com onboarding self-service |
| **Marketplace** | Produtos e serviços entre orgs e patrimônio global |
| **IA por org** | Modelos e prompts customizados por organização |
| **Unidades / filiais** | Sub-organizações dentro de uma rede |
| **Self-service WL** | Cliente configura marca e domínio sem engenharia |
| **Billing automático** | Cobrança SaaS por org (Stripe / similar) |
| **Compliance** | LGPD, audit log, exportação por org |
| **Org templates** | Clínica, programa, hospital — presets de configuração |

---

## Dependências entre etapas

```
Playbook Nova Organização (doc) ✅
        ↓
Criar org no MAG 📋
        ↓
Branding seed automático 📋
        ↓
Primeiro médico 📋
        ↓
Domínio + Vercel + Middleware 📋
        ↓
Backfill / auditoria org 📋
        ↓
Ativação (checklist) 📋
        ↓
White Label comercial completo 🔮
```

---

## Organização Método — dívidas conhecidas

Itens a resolver **na org fundadora** antes de replicar para novas orgs:

| Item | Situação |
|------|----------|
| Cobertura organizationId | Parcial — usar Saúde da Plataforma |
| Filtro MAG por org | Métricas ainda globais |
| Registry estático | Só `metodo` — precisa evoluir |
| Middleware | Host Método hardcoded parcialmente |
| whiteLabel legado | Dual read ativo; consolidação gradual |

---

## Como atualizar este roadmap

1. Ao concluir uma etapa de engenharia → mover para **Concluído** com número da etapa.
2. Ao iniciar implementação → mover para **Em andamento**.
3. Novas ideias → **Planejado** ou **Longo prazo** com descrição de produto.
4. Nunca remover histórico — riscar ou mover, não apagar.

---

## Playbooks relacionados (planejados)

| Playbook | Relação |
|----------|---------|
| White Label | Antecede comercialmente a Nova Organização |
| Novo Médico | Segue criação da org |
| Onboarding Paciente | Segue primeiro médico ativo |
| Financeiro | Paralelo após org ativa |

Ver índice: [docs/00_MAPA_DOS_PLAYBOOKS.md](../../00_MAPA_DOS_PLAYBOOKS.md)
