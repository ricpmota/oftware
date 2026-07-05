# Playbook — Nova Organização

**Status:** 🟡 Iniciado  
**Versão:** 1.0 (fundação documental)  
**Público:** produto, engenharia, operações, Cursor, ChatGPT

---

## O que é uma Organização?

Uma **Organização** representa uma **empresa cliente da plataforma Oftware**.

Ela é a unidade principal do **White Label**: uma clínica, instituto, programa ou rede que opera a jornada clínica **sob sua própria marca e domínio**, utilizando a infraestrutura da Oftware.

### Uma Organização possui

| Dimensão | O que inclui |
|----------|--------------|
| **Marca** | Nome, logos, cores, favicon, Open Graph, identidade visual |
| **Equipe** | Médicos, nutricionistas e personais vinculados à organização |
| **Pacientes** | Usuários finais da jornada clínica |
| **Configurações** | Integrações, produtos, contratos, regras operacionais |
| **Domínio** | Site e rotas públicas no host da organização |
| **Marketing** | Landing, banners, Instagram, funis de aquisição |
| **Operação** | Agenda, aplicações, e-mails, relatórios, contratos |
| **Financeiro** | Receitas, pagamentos e visão econômica da organização |
| **Jornada do Paciente** | `/meta`, check-ins, conclusão, prescrições, comunicação |

### O que uma Organização **não** é

- **Não é um médico.** O médico é profissional da equipe.
- **Não é a Oftware.** A Oftware é a fabricante e operadora da plataforma.
- **Não é patrimônio global.** Protocolos SISTEMA, OftPay, IA global etc. pertencem à plataforma, não à organização.

---

## Objetivo da Organização

O conceito de Organização existe para que a Oftware deixe de ser um sistema monolítico (Método Emagrecer) e se torne uma **plataforma SaaS multi-organização**.

### Por que isso importa

1. **White Label escalável** — cada cliente opera com marca própria.
2. **Isolamento de negócio** — equipe, pacientes e dados pertencem à organização.
3. **Governança centralizada** — a Oftware administra organizações via MetaAdminGeral.
4. **Experiência do paciente** — a jornada clínica acontece no domínio da organização, não no domínio Oftware.

A Organização será a **unidade principal de licenciamento, entrega e suporte** do produto White Label.

---

## Estrutura da Organização

```
OFTWARE (Plataforma)
│
├── Patrimônio Global
│   (protocolos SISTEMA, exames lab, bioimpedância, OftPay, Chat Inicial, IA global…)
│
└── Organizações
    │
    └── [Organização Ativa]  ← ex.: Método Emagrecer
        │
        ├── Marca · Domínio · Marketing · Operação · Financeiro
        │
        ├── Equipe
        │   ├── Médicos
        │   ├── Nutricionistas
        │   └── Personais
        │
        └── Pacientes
            └── Jornada clínica completa
```

### Hierarquia de responsabilidade

| Nível | Quem administra | Onde |
|-------|-----------------|------|
| Plataforma | Oftware | MetaAdminGeral (contexto Plataforma) |
| Organização | Oftware + gestor da org | MetaAdminGeral (contexto Organização) + MetaAdmin |
| Equipe | Organização | MetaAdmin |
| Paciente | Equipe + automações | `/meta` e fluxos por token |

---

## Organização de referência

A **primeira Organização White Label** da plataforma é:

**Método Emagrecer**

| Campo | Valor |
|-------|--------|
| ID | `metodo` |
| Domínio | https://www.ometodoemagrecer.com.br |
| Natureza | Uma organização com vários médicos (não white labels individuais) |

Todos os médicos atuais do Método (Dr. Ricardo Mota, Dr. Marcos César, Dr. Pedro Krishna, Dra. Vitória Furtunato) pertencem à **mesma organização**.

---

## Estado atual

O que já foi implementado na plataforma (fundação):

| Item | Status |
|------|--------|
| Conceito `organizationId` | ✅ Implementado (tipos, registry, backfill) |
| Registry estático de organizações | ✅ `metodo` como primeira org |
| MetaAdminGeral reorganizado (UX 2.0) | ✅ Plataforma → Organizações → Org Ativa |
| Organização Ativa (contexto de navegação) | ✅ Seletor + sidebar contextual |
| Dashboard da Organização | ✅ Métricas reais (Etapa 12.1) |
| Marca da Organização (MAG) | ✅ Painel de edição oficial |
| `organizations/{organizationId}.branding` | ✅ Proprietário oficial da marca |
| Dual read de branding (org → whiteLabel legado) | ✅ Consumidores server-side |
| Resolução de org por host | ✅ `resolveOrganizationFromHost` |
| Auditoria de cobertura `organizationId` | ✅ Saúde da Plataforma |
| Organização Método Emagrecer | ✅ Ativa em produção |
| Criação de nova organização (fluxo MAG) | ⏳ Planejado |
| Domínio / Vercel / Firebase por org | ⏳ Planejado |
| Filtro global por `organizationId` | ⏳ Parcial / em evolução |

---

## Próximas etapas (resumo)

1. **Nova Organização** — fluxo de criação no MetaAdminGeral
2. **Branding seed** — identidade inicial automática
3. **Primeiro Médico** — onboarding do profissional fundador
4. **Domínio** — DNS, host mapping, middleware
5. **Firebase** — projeto ou namespace por org (decisão arquitetural)
6. **Vercel** — deploy e variáveis por domínio
7. **White Label completo** — jornada comercial + operação + go-live

Detalhamento: [04_roadmap.md](./04_roadmap.md)

---

## Documentos deste Playbook

| Arquivo | Conteúdo |
|---------|----------|
| [00_visao_geral.md](./00_visao_geral.md) | Visão de produto — sem detalhe técnico |
| [01_fluxo_funcional.md](./01_fluxo_funcional.md) | Jornada do administrador e da organização |
| [02_fluxo_tecnico.md](./02_fluxo_tecnico.md) | Arquitetura, coleções, resolvers e fallbacks |
| [03_checklist.md](./03_checklist.md) | Checklist oficial de go-live |
| [04_roadmap.md](./04_roadmap.md) | Etapas concluídas, em andamento e planejadas |

---

## Como usar este Playbook

```
Leia o Playbook Nova Organização
```

Isso deve ser suficiente para recuperar o contexto completo do módulo de Organizações em qualquer conversa futura.
