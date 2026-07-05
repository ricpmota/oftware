# Mapa da Documentação — Oftware

**Status:** índice oficial (Etapa 14 — atualizado)  
**Objetivo:** centralizar **toda** a documentação estratégica da plataforma para humanos, Cursor e ChatGPT.

> **Nova janela / novo chat:** compartilhe apenas **[mapa-mental-oftware.md](./mapa-mental-oftware.md)** — arquivo único de contexto.

---

## Princípio oficial

> **O código implementa. A arquitetura organiza. Os Playbooks explicam. A documentação preserva o conhecimento.**

---

## Por onde começar?

**Leia antes de abrir qualquer arquivo do projeto:**

1. [company/01_DIRETOR_DE_ARQUITETURA.md](./company/01_DIRETOR_DE_ARQUITETURA.md)
2. [company/02_GLOSSARIO.md](./company/02_GLOSSARIO.md)
3. [arquitetura/ARQUITETURA_OFTWARE_2_0.md](./arquitetura/ARQUITETURA_OFTWARE_2_0.md)
4. Playbook do módulo (se existir)
5. Código

Porta de entrada completa: [company/README.md](./company/README.md)

---

## Três níveis de documentação

### 🏢 Company — `docs/company/`

**Documentação da empresa, da filosofia e do modo de trabalhar.**

| Documento | Conteúdo |
|-----------|----------|
| [README.md](./company/README.md) | Porta de entrada |
| [01_DIRETOR_DE_ARQUITETURA.md](./company/01_DIRETOR_DE_ARQUITETURA.md) | Filosofia e princípios invioláveis |
| [02_GLOSSARIO.md](./company/02_GLOSSARIO.md) | Vocabulário único |
| [03_PRINCIPIOS_DE_DESENVOLVIMENTO.md](./company/03_PRINCIPIOS_DE_DESENVOLVIMENTO.md) | Fluxo Ideia → Playbook → Código |
| [04_ROADMAP_DA_PLATAFORMA.md](./company/04_ROADMAP_DA_PLATAFORMA.md) | Visão macro de longo prazo |
| [05_COMO_INICIAR_UM_NOVO_MODULO.md](./company/05_COMO_INICIAR_UM_NOVO_MODULO.md) | Guia antes de implementar |

---

### 🏗️ Arquitetura — `docs/arquitetura/`

**Documentação técnica da plataforma.**

| Documento | Conteúdo |
|-----------|----------|
| [ARQUITETURA_OFTWARE_2_0.md](./arquitetura/ARQUITETURA_OFTWARE_2_0.md) | Documento mestre multi-org |
| [ETAPA_3_FUNDACAO_ORGANIZACAO.md](./arquitetura/ETAPA_3_FUNDACAO_ORGANIZACAO.md) | Fundação organizationId, equipe, patrimônio |
| `ia_*.md` | Módulos de inteligência artificial |

Complementar (legado): [00_mapa_mestre_oftware.md](./00_mapa_mestre_oftware.md)

---

### 📘 Playbooks — `docs/playbooks/`

**Documentação funcional de cada grande módulo.**

Filosofia: nenhuma funcionalidade estratégica começa pelo código — começa pelo Playbook.

| Playbook | Status | Descrição |
|----------|--------|-----------|
| **[Template de Organização](./playbooks/organizacao-template/README.md)** | 🟡 Iniciado | 9 departamentos oficiais — blueprint de toda org |
| **[Nova Organização](./playbooks/nova-organizacao/README.md)** | 🟡 Iniciado | Nascimento e go-live de uma org White Label |
| White Label | ⚪ Planejado | Jornada comercial completa |
| Novo Médico | ⚪ Planejado | Onboarding de profissional na org |
| Onboarding Paciente | ⚪ Planejado | Jornada do paciente |
| Marketplace | ⚪ Planejado | Ecossistema transacional |
| Financeiro | ⚪ Planejado | Modelo econômico por org |
| IA | ⚪ Planejado | IA global vs. por org |
| OftPay | ⚪ Planejado | Produto educacional |
| Meta Business | ⚪ Planejado | Integrações Meta |

---

## Relação entre os níveis

```
Company       →  POR QUÊ · COMO PENSAMOS · COMO TRABALHAMOS
     ↓
Arquitetura   →  COMO A PLATAFORMA É ESTRUTURADA
     ↓
Playbooks     →  O QUE CADA MÓDULO FAZ (visão funcional)
     ↓
Código        →  IMPLEMENTAÇÃO
```

| Pergunta | Onde responder |
|----------|----------------|
| Por que existe? | Company |
| Quem é responsável por quê? | Company + Glossário |
| Como está estruturado? | Arquitetura |
| Como nasce um módulo? | Company → 03 + 05 |
| Como funciona este módulo? | Playbook |
| Como está implementado? | Código + Playbook `02_fluxo_tecnico` |

---

## Legenda de status (Playbooks)

| Símbolo | Significado |
|---------|-------------|
| 🟢 Concluído | Playbook completo e validado |
| 🟡 Iniciado | Estrutura criada; em evolução |
| 🔵 Em andamento | Desenvolvimento ativo |
| ⚪ Planejado | Ainda não iniciado |

---

## Como usar no dia a dia

| Situação | Documentação |
|----------|--------------|
| Novo desenvolvedor | Company completo → Arquitetura 2.0 → Glossário |
| Nova funcionalidade | [05_COMO_INICIAR_UM_NOVO_MODULO.md](./company/05_COMO_INICIAR_UM_NOVO_MODULO.md) |
| Sessão Cursor / ChatGPT | Diretor de Arquitetura + Playbook do módulo |
| Go-live de org | Playbook Nova Organização → checklist |
| Decisão de produto | Diretor + Glossário |

---

## Outras pastas (complementares)

| Pasta | Uso |
|-------|-----|
| `conhecimento/` | Contexto legado — jornadas, regras de negócio |
| `marketing-diretor/` | Padronização visual |
| `auditoria-firestore-custos/` | Auditoria técnica pontual |

Preferir **Company + Arquitetura + Playbooks** para decisões novas.

---

## Manutenção

Ao concluir etapa relevante:

1. Atualizar Playbook do módulo
2. Atualizar [04_ROADMAP_DA_PLATAFORMA.md](./company/04_ROADMAP_DA_PLATAFORMA.md)
3. Adicionar termos ao [Glossário](./company/02_GLOSSARIO.md)
4. Registrar decisões em `docs/arquitetura/`

---

## Atalhos para IA

```
Leia docs/company/01_DIRETOR_DE_ARQUITETURA.md
Leia o Playbook Nova Organização
Leia docs/company/05_COMO_INICIAR_UM_NOVO_MODULO.md antes de implementar [módulo]
```
