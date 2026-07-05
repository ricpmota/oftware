# Documentação da Oftware

**Status:** porta de entrada oficial (Etapa 14)  
**Público:** fundadores, produto, engenharia, operações, Cursor, ChatGPT, novos desenvolvedores

> **Arquivo único para nova janela:** [../mapa-mental-oftware.md](../mapa-mental-oftware.md)

---

## O que deve ser lido antes de abrir qualquer arquivo do projeto?

Leia nesta ordem:

| Ordem | Documento | Por quê |
|-------|-----------|---------|
| **1** | [01_DIRETOR_DE_ARQUITETURA.md](./01_DIRETOR_DE_ARQUITETURA.md) | Filosofia, princípios e regras invioláveis da plataforma |
| **2** | [02_GLOSSARIO.md](./02_GLOSSARIO.md) | Vocabulário único — evita ambiguidade em todo o time |
| **3** | [../arquitetura/ARQUITETURA_OFTWARE_2_0.md](../arquitetura/ARQUITETURA_OFTWARE_2_0.md) | Modelo mental e hierarquia da plataforma |
| **4** | [../00_MAPA_DOS_PLAYBOOKS.md](../00_MAPA_DOS_PLAYBOOKS.md) | Índice de Playbooks e demais documentação |
| **5** | Playbook do módulo em questão | Visão funcional antes de codar |
| **6** | Código | Implementação — nunca o primeiro passo |

> **Atalho para IA:** *"Leia docs/company/01_DIRETOR_DE_ARQUITETURA.md e o Playbook [nome]"*

---

## Princípio oficial

> **O código implementa. A arquitetura organiza. Os Playbooks explicam. A documentação preserva o conhecimento.**

Toda nova funcionalidade estratégica da plataforma deve respeitar essa estrutura **antes** de iniciar implementação.

---

## Três níveis de documentação

A documentação da Oftware está organizada em três camadas complementares:

### 1. Company (`docs/company/`)

**Documentação da empresa, da filosofia e do modo de trabalhar.**

Responde: *por que* a plataforma existe, *como* pensamos, *quais* princípios governam decisões.

| Documento | Conteúdo |
|-----------|----------|
| [README.md](./README.md) | Esta porta de entrada |
| [01_DIRETOR_DE_ARQUITETURA.md](./01_DIRETOR_DE_ARQUITETURA.md) | Filosofia e princípios arquiteturais |
| [02_GLOSSARIO.md](./02_GLOSSARIO.md) | Termos oficiais da plataforma |
| [03_PRINCIPIOS_DE_DESENVOLVIMENTO.md](./03_PRINCIPIOS_DE_DESENVOLVIMENTO.md) | Fluxo Ideia → Playbook → Código |
| [04_ROADMAP_DA_PLATAFORMA.md](./04_ROADMAP_DA_PLATAFORMA.md) | Visão macro de longo prazo |
| [05_COMO_INICIAR_UM_NOVO_MODULO.md](./05_COMO_INICIAR_UM_NOVO_MODULO.md) | Checklist antes de implementar |

### 2. Arquitetura (`docs/arquitetura/`)

**Documentação técnica da plataforma.**

Responde: *como* a plataforma é estruturada, quais camadas existem, quais decisões técnicas foram tomadas.

Documentos principais:
- [ARQUITETURA_OFTWARE_2_0.md](../arquitetura/ARQUITETURA_OFTWARE_2_0.md) — documento mestre
- [ETAPA_3_FUNDACAO_ORGANIZACAO.md](../arquitetura/ETAPA_3_FUNDACAO_ORGANIZACAO.md) — fundação multi-org
- Documentos de IA, runtime, analytics (módulos específicos)

### 3. Playbooks (`docs/playbooks/`)

**Documentação funcional de cada grande módulo.**

Responde: *o que* o módulo faz, *quem* usa, *qual* fluxo seguir, *como* validar go-live.

Índice: [00_MAPA_DOS_PLAYBOOKS.md](../00_MAPA_DOS_PLAYBOOKS.md)

Playbook iniciado: [Nova Organização](../playbooks/nova-organizacao/README.md)

---

## Outras pastas em `docs/`

| Pasta | Função | Observação |
|-------|--------|------------|
| `conhecimento/` | Contexto legado de produto, jornadas, regras de negócio | Complementar; preferir Company + Playbooks para decisões novas |
| `marketing-diretor/` | Padronização visual e cronograma de marca | Específico de identidade visual |
| `auditoria-firestore-custos/` | Auditoria técnica de custos Firestore | Referência operacional pontual |

Essas pastas **não substituem** Company, Arquitetura ou Playbooks. São acervos históricos ou especializados.

---

## Como usar no dia a dia

| Situação | O que ler |
|----------|-----------|
| Novo no time | Company completo → Arquitetura 2.0 → Glossário |
| Nova funcionalidade estratégica | [05_COMO_INICIAR_UM_NOVO_MODULO.md](./05_COMO_INICIAR_UM_NOVO_MODULO.md) → criar/atualizar Playbook |
| Sessão Cursor / ChatGPT | Diretor de Arquitetura + Playbook do módulo |
| Decisão de produto | Diretor + Glossário (terminologia correta) |
| Refatoração grande | Arquitetura + princípios (compatibilidade, dual read, pequenas migrações) |
| Go-live de org | Playbook Nova Organização → checklist |

---

## Manutenção

A documentação **acompanha** a evolução do sistema — não é escrita uma vez e esquecida.

Ao concluir uma etapa relevante:
1. Atualizar o Playbook do módulo
2. Atualizar o roadmap em `04_ROADMAP_DA_PLATAFORMA.md`
3. Adicionar termos novos ao glossário, se necessário
4. Registrar decisões arquiteturais em `docs/arquitetura/`

---

## Relação entre as camadas

```
Company          →  POR QUÊ e COMO PENSAMOS
     ↓
Arquitetura      →  COMO ESTÁ ESTRUTURADO
     ↓
Playbooks        →  O QUE CADA MÓDULO FAZ
     ↓
Código           →  IMPLEMENTAÇÃO
```

Nenhuma camada substitui outra. Todas são necessárias.
