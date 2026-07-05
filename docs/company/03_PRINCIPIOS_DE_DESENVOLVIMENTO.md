# Princípios de Desenvolvimento — Oftware

**Status:** fluxo oficial de trabalho (Etapa 14)  
**Aplica-se a:** funcionalidades estratégicas, novos módulos, mudanças arquiteturais

---

## Princípio central

> **O código implementa. A arquitetura organiza. Os Playbooks explicam. A documentação preserva o conhecimento.**

Nenhuma funcionalidade estratégica começa pelo código.

---

## Fluxo oficial

```
Ideia
  ↓
Playbook
  ↓
Arquitetura
  ↓
Implementação
  ↓
Validação
  ↓
Atualização da documentação
```

Cada etapa **bloqueia** a seguinte até estar minimamente completa.

---

## Etapa 1 — Ideia

**O que acontece:** surge necessidade de produto, negócio ou operação.

**Perguntas obrigatórias:**

- A quem serve? (Plataforma, Organização, Profissional, Paciente)
- Qual problema resolve?
- Impacta White Label, branding ou `organizationId`?
- Já existe algo parecido no sistema?

**Saída:** decisão de **prosseguir** ou **descartar** + nível arquitetural identificado.

**Não fazer:** abrir IDE e codar.

---

## Etapa 2 — Playbook

**O que acontece:** documentação oficial do módulo em `docs/playbooks/[modulo]/`.

**Estrutura mínima:**

| Arquivo | Conteúdo |
|---------|----------|
| `README.md` | O que é, objetivo, estado atual |
| `00_visao_geral.md` | Visão de produto (sem código) |
| `01_fluxo_funcional.md` | Jornada do usuário |
| `02_fluxo_tecnico.md` | Arquitetura e integrações |
| `03_checklist.md` | Validação e go-live |
| `04_roadmap.md` | Etapas futuras |

**Saída:** Playbook revisado e registrado no [Mapa dos Playbooks](../00_MAPA_DOS_PLAYBOOKS.md).

**Referência:** [Playbook Nova Organização](../playbooks/nova-organizacao/README.md)

---

## Etapa 3 — Arquitetura

**O que acontece:** decisões técnicas alinhadas ao [Diretor de Arquitetura](./01_DIRETOR_DE_ARQUITETURA.md).

**Checklist:**

- [ ] Nível arquitetural confirmado (Plataforma / Org / Profissional / Paciente)
- [ ] Configuração tem **um único dono**
- [ ] Impacto em branding mapeado
- [ ] Impacto em `organizationId` mapeado
- [ ] Legado identificado — plano de dual read, se aplicável
- [ ] Migração é **pequena e incremental** (não Big Bang)
- [ ] Dados existentes serão **reaproveitados** antes de criar novos

**Saída:** seção `02_fluxo_tecnico.md` do Playbook preenchida + atualização em `docs/arquitetura/` se decisão transversal.

---

## Etapa 4 — Implementação

**O que acontece:** código materializa o Playbook.

**Regras:**

- **Escopo mínimo** — resolver o problema, não reinventar
- **Convenções existentes** — ler código adjacente antes de escrever
- **Sem duplicar lógica pesada** — props, helpers, serviços existentes
- **Compatibilidade** — não quebrar deep links, menus legados, produção
- **Sem alterar Firestore Rules** sem revisão explícita
- **Sem Big Bang** — feature flags, aliases, dual read quando necessário

**Saída:** PR ou commit focado, referenciando etapa do Playbook.

---

## Etapa 5 — Validação

**O que acontece:** checklist do Playbook + testes manuais/automáticos.

**Checklist mínimo:**

- [ ] Fluxo funcional do Playbook percorrido
- [ ] Menus e `?menu=` legados funcionam
- [ ] Branding correto (org vs plataforma)
- [ ] Nenhuma regressão em produção conhecida
- [ ] Testes unitários para lógica crítica nova

**Saída:** módulo aprovado para merge/deploy.

---

## Etapa 6 — Atualização da documentação

**O que acontece:** documentação **acompanha** o código — nunca fica defasada.

**Atualizar:**

| O quê | Onde |
|-------|------|
| Estado atual do módulo | Playbook `README.md` + `04_roadmap.md` |
| Novos termos | [02_GLOSSARIO.md](./02_GLOSSARIO.md) |
| Decisão arquitetural transversal | `docs/arquitetura/` |
| Épico concluído | [04_ROADMAP_DA_PLATAFORMA.md](./04_ROADMAP_DA_PLATAFORMA.md) |
| Índice de playbooks | [00_MAPA_DOS_PLAYBOOKS.md](../00_MAPA_DOS_PLAYBOOKS.md) |

**Saída:** conhecimento permanente — recuperável por qualquer pessoa ou IA sem depender de conversa anterior.

---

## O que NÃO exige Playbook completo

Correções pontuais de bug, typos, ajustes visuais menores e refactors internos sem impacto estratégico.

**Na dúvida:** trate como estratégico e crie/atualize o Playbook.

---

## Papéis

| Papel | Responsabilidade no fluxo |
|-------|---------------------------|
| **Produto** | Ideia, Playbook (visão + funcional), validação |
| **Arquitetura** | Diretor de Arquitetura, fluxo técnico, guardrails |
| **Engenharia** | Implementação escopada, testes |
| **Operações** | Checklist de go-live, pós-produção |
| **IA (Cursor/ChatGPT)** | Ler Company + Playbook **antes** de codar |

---

## Anti-padrões (proibidos)

| Anti-padrão | Por quê |
|-------------|---------|
| Codar primeiro, documentar depois (ou nunca) | Perda de conhecimento |
| Criar coleção/API sem perguntar o nível arquitetural | Dívida estrutural |
| Remover legado sem dual read | Regressão em produção |
| Big Bang migration | Risco alto, rollback difícil |
| Marca do médico como org | Quebra White Label |
| Feature só na memória do dev | Bus factor = 1 |

---

## Diagrama resumido

```
┌─────────┐    ┌───────────┐    ┌─────────────┐    ┌────────┐
│  Ideia  │ →  │ Playbook  │ →  │ Arquitetura │ →  │ Código │
└─────────┘    └───────────┘    └─────────────┘    └────────┘
                     ↑                                    │
                     └──────── Documentação ← Validacao ←─┘
```

A documentação **não é etapa final opcional**. É parte contínua do ciclo.
