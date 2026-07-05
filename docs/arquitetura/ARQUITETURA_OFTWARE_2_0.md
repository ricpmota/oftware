# Arquitetura Oftware 2.0

## Plataforma Multi-Organização

**Status:** documento mestre (Etapa 0)  
**Objetivo:** registrar a arquitetura alvo da Oftware como plataforma SaaS multi-organização, antes de qualquer implementação de código.  
**Relacionado:** levantamento técnico da separação Oftware × Método Emagrecer; plano de fases 1–4 para domínio e roteamento.

---

## Visão

A Oftware deixa de ser um sistema utilizado apenas pelo Método Emagrecer e passa a ser uma **plataforma SaaS multi-organização**.

A **primeira organização oficial** da plataforma será o **Método Emagrecer**.

---

## Modelo mental

```
OFTWARE (plataforma)
    ↓
Patrimônio Global (protocolos SISTEMA, IA, OftPay, …)
    ↓
Organizações
    ↓
Método Emagrecer (organização #1)
    ↓
Equipe (médicos · nutricionistas · personais)
    ↓
Pacientes
```

| Nível | Papel |
|-------|--------|
| **Oftware** | Fabricante e operadora da plataforma (B2B, licenciamento, admin global) |
| **Patrimônio Global** | Recursos compartilhados por todas as organizações (sem `organizationId`) |
| **Organização** | Unidade de negócio que opera a jornada clínica sob sua marca e domínio |
| **Equipe** | Médicos, nutricionistas e personais **da organização** (não “do médico”) |
| **Médico** | Profissional da equipe; compartilha pacientes com colegas da mesma org |
| **Paciente** | Usuário final da jornada clínica |

> Detalhes Etapa 3: [ETAPA_3_FUNDACAO_ORGANIZACAO.md](./ETAPA_3_FUNDACAO_ORGANIZACAO.md) · Código: `lib/organization/`

---

## Oftware

A Oftware é a **fabricante da plataforma**.

### Pertencem à Oftware

- Home institucional
- Venda White Label
- Mentorias
- Cadastro de organizações
- MetaAdminGeral
- Gestão da plataforma
- Financeiro global
- Monitoramento
- IA global
- Marketplace futuro

### Princípio de produto

**A Oftware não deve aparecer para o paciente durante a jornada clínica.**

---

## Organização

A unidade principal do sistema passa a ser a **Organização**.

### Tipos de organização

Uma organização pode ser:

- Programa de emagrecimento
- Clínica
- Instituto
- Consultório
- Hospital
- Rede de clínicas
- Médico individual

### Atributos de uma organização

Cada organização possui:

- nome
- domínio
- logo
- cores
- favicon
- Open Graph
- landing page
- redes sociais
- produtos
- equipe
- configurações

> **Nota Etapa 3:** protocolos de catálogo SISTEMA pertencem ao **Patrimônio Global** da Oftware, não à organização. Ver `lib/organization/globalAssetRegistry.ts`.

---

## Organização inicial

A primeira organização será:

**Método Emagrecer**

| Campo | Valor |
|-------|--------|
| **Domínio** | [www.ometodoemagrecer.com.br](https://www.ometodoemagrecer.com.br) |
| **Natureza** | Uma única organização com vários médicos |

### Médicos atuais (mesma organização)

- Dr. Ricardo Mota
- Dr. Marcos César
- Dr. Pedro Krishna
- Dra. Vitória Furtunato

Todos pertencem à **mesma organização**. Eles **não** são white labels separados.

---

## Rotas operacionais da organização

Toda organização deverá poder usar as seguintes rotas no **domínio da organização**:

| Rota | Uso |
|------|-----|
| `/meta` | Portal do paciente |
| `/metaadmin` | Painel operacional da organização |
| `/metanutri` | Painel do nutricionista |
| `/metapersonal` | Painel do personal |
| `/aplicacao/[token]` | Check-in de aplicação |
| `/conclusao/[token]` | Conclusão de tratamento |
| `/relatorio/[token]` | Relatório do paciente |
| `/dr/[slug]` | Página pública do médico |
| `/instagram/[crmUf]` | Link da bio (Instagram) |
| `/prescricao/documento` | Validação pública de prescrição |
| `/contratos/documento` | Validação pública de contrato |

### Regra de domínio

Essas rotas devem funcionar no domínio da organização.

**Correto:**

`https://www.ometodoemagrecer.com.br/meta`

**Incorreto para a jornada do paciente:**

`https://www.oftware.com.br/meta`

---

## MetaAdmin

O **MetaAdmin pertence à Organização**, não individualmente ao médico.

Dentro do MetaAdmin, a organização administra:

- médicos
- pacientes
- nutricionistas
- personais
- produtos
- protocolos
- aplicações
- relatórios
- financeiro
- marketing
- IA

---

## MetaAdminGeral

O **MetaAdminGeral pertence exclusivamente à Oftware**.

Ele administra:

- organizações
- domínios
- leads white label
- licenciamento
- financeiro global
- configurações globais
- equipe Oftware
- monitoramento

O MetaAdminGeral **não** deve ser pensado como painel operacional do Método. Ele deve **administrar organizações**.

---

## Regra de ouro

Antes de desenvolver qualquer nova funcionalidade, responder:

1. Essa funcionalidade pertence à **Oftware** ou à **Organização**?
2. Ela é **global** ou **específica de uma organização**?
3. Ela funcionaria se existissem **1.000 organizações** usando a plataforma?

Se pertencer à organização, deve nascer preparada para funcionar em **qualquer organização futura**.

---

## Decisão arquitetural atual

A próxima implementação **não** será “separar o Método da Oftware” de forma improvisada.

A próxima implementação será transformar o **Método Emagrecer** na **primeira Organização completa** da arquitetura Oftware 2.0.

---

## Próximas fases

### Fase 1 — Domínio operacional

Fazer o domínio [www.ometodoemagrecer.com.br](https://www.ometodoemagrecer.com.br) servir as rotas operacionais **sem redirecionar** para [www.oftware.com.br](https://www.oftware.com.br).

### Fase 2 — Links e comunicações

Fazer links gerados pelo MetaAdmin, e-mails, WhatsApp, contratos, prescrições e relatórios saírem com o **domínio da organização**.

### Fase 3 — Multi-organização

Criar base técnica para **múltiplas organizações** futuras (resolução de tenant por domínio, origem pública configurável, modelo de dados).

**Etapa 3 (concluída):** fundação em `lib/organization/` — registry Método, Equipe (tipos), Patrimônio Global, URLs; sem Firestore.

### Fase 4 — MetaAdminGeral

Reorganizar o MetaAdminGeral para **administrar Organizações** (não operação clínica de um único cliente).

---

## Histórico do documento

| Data | Evento |
|------|--------|
| 2026-06 | Criação — Etapa 0, documento mestre antes da implementação |
| 2026-06 | Etapa 3 — fundação `lib/organization/`, Equipe, Patrimônio Global ([ETAPA_3_FUNDACAO_ORGANIZACAO.md](./ETAPA_3_FUNDACAO_ORGANIZACAO.md)) |
