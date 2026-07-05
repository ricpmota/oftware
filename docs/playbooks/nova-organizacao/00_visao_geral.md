# Nova Organização — Visão Geral

**Tipo:** documento de produto  
**Público:** stakeholders, produto, operações, novos membros do time

---

## Como nasce uma Organização?

Uma Organização nasce quando a **Oftware fecha um contrato White Label** com um cliente (clínica, instituto, médico empreendedor ou rede).

O ciclo de vida ideal:

1. **Lead comercial** — médico ou clínica demonstra interesse em ter sua própria organização na plataforma.
2. **Qualificação e proposta** — Oftware define escopo, domínio, equipe inicial e plano.
3. **Criação da Organização** — registro oficial na plataforma (MetaAdminGeral).
4. **Configuração da marca** — identidade visual, domínio, SEO.
5. **Primeiro médico** — profissional fundador entra na equipe.
6. **Ativação** — domínio publicado, jornada do paciente disponível.
7. **Crescimento** — novos profissionais, pacientes, marketing e operação.

Hoje, a plataforma opera com **uma organização ativa** (Método Emagrecer). O fluxo de **Nova Organização** ainda será construído — este documento define a visão alvo.

---

## Quem cria?

| Papel | Responsabilidade |
|-------|------------------|
| **Oftware (MetaAdminGeral)** | Cria a organização, define ID, domínio e configurações iniciais |
| **Comercial Oftware** | Conduz o lead White Label até o contrato |
| **Operações / Sucesso** | Acompanha onboarding e go-live |
| **Cliente (gestor da org)** | Valida marca, indica primeiro médico, aprova go-live |

A criação **nunca** parte do médico ou do paciente. Parte sempre da **Oftware**, como fabricante da plataforma.

---

## Quem administra?

### Plataforma (Oftware)

Administra **todas** as organizações via **MetaAdminGeral**:

- Lista de organizações
- Saúde da plataforma e cobertura de dados
- Patrimônio Global (protocolos, exames, IA, OftPay)
- Leads comerciais White Label (médicos interessados em comprar uma org)
- Configurações globais

### Organização (contexto ativo no MAG + MetaAdmin)

Administra **sua própria operação**:

- Marca e identidade
- Equipe (médicos, nutris, personais)
- Pacientes e leads clínicos
- Marketing, agenda, contratos, NPS
- Financeiro da organização (futuro)

### Médico

Administra **seus pacientes e sua prática** dentro da organização — **não** administra a organização como empresa.

---

## Plataforma × Organização × Médico

| | Plataforma (Oftware) | Organização | Médico |
|--|---------------------|-------------|--------|
| **O que é** | Fabricante SaaS | Empresa cliente | Profissional da equipe |
| **Marca visível ao paciente** | Não (ideal) | Sim | Parcial (página `/dr`) |
| **Administra organizações** | Sim | Não | Não |
| **Administra equipe** | Não | Sim (via org) | Compartilha pacientes |
| **Administra pacientes** | Agregado (MAG) | Sim | Sim (seus pacientes) |
| **Domínio** | oftware.com.br | org próprio | subpágina da org |
| **Painel principal** | MetaAdminGeral | MetaAdminGeral (org) + MetaAdmin | MetaAdmin |

### Regra de ouro

> **A Oftware não deve aparecer para o paciente durante a jornada clínica.**

O paciente vive a experiência da **Organização**, atendido pela **Equipe**.

---

## Como a marca funciona?

Cada Organização possui uma **marca oficial** centralizada:

- Nome público da organização (não o nome de um médico)
- Logos, cores, favicon, Open Graph
- URLs de páginas públicas (aplicação, conclusão, prescrição)
- Domínio principal (`siteUrl`)

A marca é **propriedade da Organização**, persistida em `organizations/{organizationId}.branding`.

### Princípios

1. **Uma marca por organização** — não por médico.
2. **O médico pode ter página pública** (`/dr/slug`), mas a identidade dominante é da org.
3. **Fallbacks existem** — durante a transição, camadas legadas (whiteLabel do médico, platformSettings) ainda alimentam a marca até consolidação total.
4. **Edição oficial no MAG** — contexto Organização → Marca.

---

## Como a Organização cresce?

### Fase 1 — Fundação
- Marca configurada
- Primeiro médico ativo
- Domínio publicado
- Primeiros pacientes em tratamento

### Fase 2 — Equipe
- Novos médicos entram na mesma organização
- Nutricionistas e personais vinculados
- Compartilhamento de pacientes entre profissionais

### Fase 3 — Operação
- Leads clínicos, agenda, aplicações
- Contratos, NPS, relatórios
- E-mails automáticos e marketing

### Fase 4 — Escala
- Múltiplos domínios ou unidades (futuro)
- Financeiro consolidado
- Integrações (Meta Business, pagamentos)
- IA e automações por organização

---

## Tipos de Organização

Uma Organização na Oftware pode representar:

- Programa de emagrecimento (ex.: Método Emagrecer)
- Clínica ou consultório
- Instituto ou hospital
- Rede de clínicas
- Médico individual empreendedor (com equipe própria)

O **tipo** influencia marketing e onboarding, mas a **estrutura técnica** é a mesma: Organização → Equipe → Pacientes.

---

## Relação com White Label

**White Label** é o **produto comercial** que a Oftware vende.  
**Organização** é a **unidade operacional** entregue ao cliente.

Todo cliente White Label recebe uma Organização.  
Nem toda Organização nasceu de um fluxo White Label automatizado (o Método é a org fundadora, anterior ao produto formalizado).

O Playbook **White Label** (planejado) detalhará a jornada comercial.  
Este Playbook **Nova Organização** detalha o nascimento operacional da org na plataforma.

---

## Leituras complementares

- [01_fluxo_funcional.md](./01_fluxo_funcional.md) — jornada passo a passo
- [README.md](./README.md) — definição oficial e estado atual
- [Arquitetura Oftware 2.0](../../arquitetura/ARQUITETURA_OFTWARE_2_0.md) — visão macro
