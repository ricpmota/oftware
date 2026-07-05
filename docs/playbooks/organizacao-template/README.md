# Template Oficial de Organização — Oftware

**Status:** 🟡 Documentação oficial (Parte A)  
**Natureza:** blueprint de produto — **não altera código, menu ou runtime**

---

## Objetivo

Este template define **como qualquer Organização da Oftware será estruturada** — independentemente de ser Método Emagrecer, uma clínica ou uma futura org White Label.

Ele responde:

> *Onde cada funcionalidade da Organização deve viver?*

---

## Hierarquia oficial

```
Plataforma (Oftware)
    ↓
Organização (cliente White Label)
    ↓
Departamento (9 oficiais — este template)
    ↓
Funcionalidade (submódulo / tela / fluxo)
```

**Regra inviolável:**

> Nenhuma funcionalidade relacionada à Organização deve ser implementada sem pertencer **claramente** a um dos nove departamentos oficiais.

Se não encaixa em nenhum departamento, a funcionalidade provavelmente pertence à **Plataforma** ou ao **Patrimônio Global** — não à Organização.

---

## Os nove departamentos

| # | Departamento | Arquivo | Pergunta que responde |
|---|--------------|---------|------------------------|
| 1 | **Dashboard** | [01_dashboard.md](./01_dashboard.md) | Como está a org agora? |
| 2 | **Identidade** | [02_identidade.md](./02_identidade.md) | Quem somos visualmente e no domínio? |
| 3 | **Equipe** | [03_equipe.md](./03_equipe.md) | Quem trabalha na org? |
| 4 | **Pacientes** | [04_pacientes.md](./04_pacientes.md) | Quem tratamos e como captamos? |
| 5 | **Marketing** | [05_marketing.md](./05_marketing.md) | Como a org se comunica e atrai? |
| 6 | **Jornada** | [06_jornada.md](./06_jornada.md) | Como o paciente vive o tratamento? |
| 7 | **Negócio** | [07_negocio.md](./07_negocio.md) | Como a org opera financeiramente? |
| 8 | **IA** | [08_ia.md](./08_ia.md) | Como a inteligência artificial apoia a org? |
| 9 | **Administração** | [09_administracao.md](./09_administracao.md) | Como configuramos e governamos a org? |

---

## Relação com a navegação atual (MAG)

O MetaAdminGeral em produção usa departamentos **parcialmente alinhados** a este template. A evolução futura convergirá para os nove departamentos oficiais:

| Template oficial | Nav MAG atual (referência) | Observação |
|------------------|----------------------------|------------|
| Dashboard | `org-dashboard` | ✅ alinhado |
| Identidade | `org-marca` | Renomeação conceitual: Marca → Identidade |
| Equipe | `org-equipe` | ✅ alinhado |
| Pacientes | `org-pacientes` | ✅ alinhado |
| Marketing | `org-marketing` | ✅ alinhado |
| Jornada | `org-operacao` (parcial) | Calendário, aplicações, contratos, e-mails |
| Negócio | `org-financeiro` (parcial) | Financeiro + produtos org (ex.: tirzepatida) |
| IA | *(ainda sem dept dedicado)* | 📋 a criar |
| Administração | `org-configuracoes` | ✅ alinhado |

**Este template é o alvo.** O menu atual é implementação em transição.

---

## Como usar este template

### Para produto
Antes de definir escopo, identifique o **departamento** e leia o arquivo correspondente.

### Para engenharia (Cursor)
```
Leia docs/playbooks/organizacao-template/README.md
e o departamento [X] antes de implementar [funcionalidade].
Confirme que pertence à Organização, não à Plataforma.
```

### Para ChatGPT / nova janela
```
Leia docs/playbooks/organizacao-template/ e o departamento relevante.
Use docs/mapa-mental-oftware.md como contexto geral.
```

### Para novo Playbook de funcionalidade
Todo Playbook de módulo **org-scoped** deve declarar:

```markdown
Departamento: [nome]
Submódulo: [nome]
Não pertence a: [outros departamentos]
```

---

## O que NÃO pertence a uma Organização (via template)

| Item | Nível correto |
|------|---------------|
| Leads White Label (venda de org) | Plataforma → Organizações |
| Protocolos SISTEMA | Patrimônio Global |
| OftPay, Chat Inicial global | Patrimônio Global / Plataforma |
| Saúde da Plataforma (auditoria global) | Plataforma → Ferramentas |
| Cadastro de novas organizações | Plataforma → Organizações |
| Licenciamento SaaS Oftware | Plataforma |

---

## Relação com outros documentos

| Documento | Relação |
|-----------|---------|
| [mapa-mental-oftware.md](../../mapa-mental-oftware.md) | Contexto geral da plataforma |
| [company/01_DIRETOR_DE_ARQUITETURA.md](../../company/01_DIRETOR_DE_ARQUITETURA.md) | Princípios invioláveis |
| [nova-organizacao/](../nova-organizacao/README.md) | Como **nasce** uma org |
| **organizacao-template/** (este) | Como uma org **opera** no dia a dia |

---

## Próximas etapas (documentação + produto)

1. Validar template com time
2. Mapear cada menu MAG existente → departamento oficial
3. Criar Playbooks por submódulo (quando estratégico)
4. Convergir navegação MAG para os 9 departamentos
5. Garantir que toda feature nova declare seu departamento

**Nenhuma etapa acima altera runtime nesta Parte A.**

---

## Estrutura de arquivos

```
docs/playbooks/organizacao-template/
├── README.md              ← este arquivo
├── 01_dashboard.md
├── 02_identidade.md
├── 03_equipe.md
├── 04_pacientes.md
├── 05_marketing.md
├── 06_jornada.md
├── 07_negocio.md
├── 08_ia.md
└── 09_administracao.md
```
