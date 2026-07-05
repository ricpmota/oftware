# Glossário Oficial — Oftware 2.0

**Status:** vocabulário único da plataforma (Etapa 14)  
**Regra:** use estes termos exatamente como definidos. Em caso de conflito com documentos antigos, **prevalece este glossário**.

---

## Níveis da arquitetura

### Plataforma

A **Oftware** como fabricante e operadora do SaaS.

Administra organizações, patrimônio global, licenciamento, monitoramento e configurações que **não pertencem a nenhum cliente específico**.

**Painel:** MetaAdminGeral (contexto Plataforma)  
**Domínio típico:** oftware.com.br  
**Não possui** identidade de cliente na jornada clínica.

---

### Patrimônio Global

Recursos compartilhados por **todas** as organizações, **sem** `organizationId`.

Exemplos: protocolos SISTEMA, exames laboratoriais (referências), bioimpedância (referências), OftPay, Chat Inicial, templates globais, IA global.

**Pertence à:** Plataforma  
**Administração:** MetaAdminGeral → Patrimônio Global

---

### Organização

Unidade de negócio cliente da plataforma. Representa uma **empresa** — clínica, programa, instituto, consultório ou rede — que opera a jornada clínica sob **marca e domínio próprios**.

**Não é** um médico. **Não é** a Oftware.

Possui: marca, equipe, pacientes, configurações, domínio, marketing, operação, financeiro e jornada do paciente.

**ID canônico:** `organizationId` (ex.: `metodo`)  
**Primeira org:** Método Emagrecer

---

### Organização Ativa

A organização **selecionada no momento** no MetaAdminGeral para administração contextual.

Ao entrar em uma org, a sidebar muda para o contexto da Organização (Marca, Equipe, Pacientes, etc.).

**Estado:** `activeOrganizationId`  
**Deep link:** `?menu=...&org=metodo`

---

### Equipe

Conjunto de **profissionais** vinculados a uma Organização: médicos, nutricionistas e personais.

Todos pertencem à **mesma org**. O médico **não é dono** do nutricionista nem do personal.

Compartilham pacientes **dentro da mesma organização**.

---

### Profissional

Indivíduo da equipe clínica: **médico**, **nutricionista** ou **personal trainer**.

Administra sua prática e seus pacientes. **Não administra** a Organização como empresa.

**Painéis:** MetaAdmin (médico), MetaNutri, MetaPersonal

---

### Paciente

Usuário final da **jornada clínica**: tratamento, evolução, aplicações, nutrição, treino, mensagens.

Vive a experiência da **Organização**, no **domínio da Organização**.

**Portal:** `/meta`

---

## Produto e comercial

### White Label

Produto comercial da Oftware: licenciamento da plataforma para que um cliente opere com **marca própria**.

Todo cliente White Label recebe uma **Organização**. White Label é o **produto vendido**; Organização é a **unidade entregue**.

---

### Lead White Label

Médico ou clínica **interessado em adquirir uma Organização** na plataforma (lead B2B comercial).

**Não confundir** com lead clínico (paciente interessado em tratamento).

**Onde vive:** MetaAdminGeral → Plataforma → Organizações → Leads White Label

---

### Lead clínico

Pessoa interessada em **tratamento** com um médico da organização.

**Onde vive:** MetaAdminGeral → Organização Ativa → Pacientes → Leads

---

## Identidade e marca

### Marca da Organização

Identidade visual e verbal oficial de uma Organização: nome, logos, cores, favicon, Open Graph, domínio, páginas públicas.

**Proprietário:** Organização  
**Fonte oficial:** `organizations/{organizationId}.branding`  
**Edição:** MetaAdminGeral → Organização → Marca

---

### Branding

Conjunto técnico e visual da marca: campos persistidos, resolvers, fallbacks e dual read.

**Branding da org** ≠ **whiteLabel legado do médico** (este último está em transição).

---

### Dual Read

Padrão arquitetural: ler **primeiro** a fonte nova (branding da org), **depois** mesclar com fonte legada (whiteLabel do médico) para compatibilidade durante migração.

---

## Documentação e processo

### Playbook

Documento oficial de produto que descreve **como um módulo funciona** antes da implementação.

Estrutura típica: README, visão geral, fluxo funcional, fluxo técnico, checklist, roadmap.

**Localização:** `docs/playbooks/[modulo]/`

---

### Arquitetura Oftware 2.0

Modelo oficial da plataforma como SaaS multi-organização.

Documento mestre: `docs/arquitetura/ARQUITETURA_OFTWARE_2_0.md`

---

### Company

Camada de documentação da **empresa e da filosofia**: princípios, glossário, roadmap macro, guias de início.

**Localização:** `docs/company/`

---

## Painéis administrativos

### MetaAdminGeral (MAG)

Painel de **administração da Plataforma** e das **Organizações**.

Pertence exclusivamente à Oftware. Administra orgs, patrimônio global, leads WL, saúde da plataforma.

**Dois contextos:** Plataforma | Organização Ativa

---

### MetaAdmin

Painel **operacional da Organização** para o médico.

Gestão de pacientes, plano terapêutico, calendário, financeiro do paciente, equipe.

**Pertence à:** Organização (não à Plataforma, não ao médico individual como empresa)

---

## Métricas e operação

### Dashboard da Organização

Home contextual no MAG ao selecionar uma Organização.

Exibe métricas reais: equipe, pacientes, leads, NPS, saúde dos dados, atalhos operacionais.

**Menu:** `org-dashboard` (alias legado: `estatisticas`)

---

### Jornada do Paciente

Conjunto de experiências do paciente na plataforma: portal `/meta`, check-ins de aplicação, conclusão de tratamento, prescrições, nutrição, treino, mensagens.

Deve ocorrer no **domínio da Organização**, com **marca da Organização**.

---

### organizationId

Identificador canônico e imutável de uma Organização.

Presente (ou em migração) nos documentos Firestore de equipe, pacientes, links públicos e demais entidades org-scoped.

**Auditoria:** Saúde da Plataforma (cobertura %)

---

## Produtos complementares

### OftPay

Produto educacional da Oftware: cursos, apostilas, questões.

**Nível:** Patrimônio Global / Produto da Plataforma

---

### Meta Business

Integrações com ecossistema Meta (Instagram, WhatsApp, CRM).

**Nível:** Produto da Plataforma (com features futuras por org)

---

## Termos a evitar (ambíguos)

| Evitar | Usar |
|--------|------|
| “White label do médico” (como org) | Organização + página `/dr` do profissional |
| “Lead” (sem qualificador) | Lead White Label **ou** Lead clínico |
| “Admin” (genérico) | MetaAdminGeral **ou** MetaAdmin |
| “Sistema” (genérico) | Plataforma **ou** Organização **ou** módulo específico |
| “Marca do médico” (como org) | Marca da Organização + perfil público do profissional |
| “Estatísticas” (menu legado) | Dashboard da Organização |

---

## Manutenção

Ao introduzir novo conceito na plataforma:

1. Definir termo único neste glossário
2. Usar consistentemente em Playbooks, código (nomes de variáveis) e conversas
3. Atualizar tabela “Termos a evitar” se necessário
