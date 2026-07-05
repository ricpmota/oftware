# Mapa Mental — Oftware 2.0

**Arquivo único de contexto** · compartilhe este documento ao abrir nova janela (Cursor, ChatGPT, novo dev)

> **Prompt sugerido:** *"Leia `docs/mapa-mental-oftware.md` e use como contexto permanente da plataforma."*

---

## Princípio oficial

> **O código implementa. A arquitetura organiza. Os Playbooks explicam. A documentação preserva o conhecimento.**

**Regra de ouro:** nenhuma funcionalidade estratégica começa pelo código. Começa pelo Playbook.

---

## O que é a Oftware?

Plataforma **SaaS multi-organização** de gestão clínica (obesidade / tirzepatida como eixo principal).

A Oftware é a **fabricante**. Cada **Organização** (clínica, programa, instituto) opera sob **marca e domínio próprios** (White Label).

**Primeira org:** Método Emagrecer (`organizationId: metodo`) · https://www.ometodoemagrecer.com.br

**Regra de produto:** a Oftware **não deve aparecer** para o paciente na jornada clínica.

---

## Mapa mental (hierarquia)

```
OFTWARE — Plataforma (fabricante)
│
├── Patrimônio Global (sem organizationId)
│   ├── Protocolos / Prescrições SISTEMA
│   ├── Exames laboratoriais · Bioimpedância (referências)
│   ├── Chat Inicial
│   ├── OftPay (cursos)
│   └── IA global
│
├── MetaAdminGeral — contexto PLATAFORMA
│   ├── Dashboard Oftware
│   ├── Organizações
│   │   ├── Organizações ativas (lista)
│   │   └── Leads White Label (médicos que querem comprar uma org)
│   ├── Produtos (OftPay, Meta Business)
│   ├── Ferramentas (Saúde da Plataforma)
│   └── Patrimônio Global
│
└── Organizações
    └── [Org Ativa] ex.: Método Emagrecer
        ├── MetaAdminGeral — contexto ORGANIZAÇÃO
        │   ├── Dashboard · Identidade · Equipe · Pacientes
        │   ├── Marketing · Jornada · Negócio · IA · Administração
        │   │   (template oficial: docs/playbooks/organizacao-template/)
        │
        ├── Equipe (Profissionais)
        │   ├── Médico → MetaAdmin (/metaadmin)
        │   ├── Nutri → MetaNutri (/metanutri)
        │   └── Personal → MetaPersonal (/metapersonal)
        │
        └── Pacientes → Jornada clínica (/meta, aplicação, conclusão…)
            └── Domínio da ORGANIZAÇÃO — nunca oftware.com.br
```

---

## Quatro níveis — quem é o quê

| Nível | O que é | Administra | Painel |
|-------|---------|------------|--------|
| **Plataforma** | Oftware, fabricante SaaS | Orgs, patrimônio global, WL comercial | MetaAdminGeral (Plataforma) |
| **Organização** | Empresa cliente (marca + domínio) | Equipe, pacientes, marca, operação | MAG (Org) + MetaAdmin |
| **Profissional** | Médico, nutri, personal da equipe | Seus pacientes e prática | MetaAdmin / MetaNutri / MetaPersonal |
| **Paciente** | Usuário final da jornada clínica | — | `/meta` no domínio da org |

**Não confundir:**
- **Organização** ≠ médico (médico é da equipe)
- **Lead White Label** ≠ lead clínico (WL = médico querendo comprar org; clínico = paciente interessado em tratamento)
- **Marca da Organização** ≠ whiteLabel legado do médico (oficial: `organizations/{id}.branding`)

---

## Princípios invioláveis (Diretor de Arquitetura)

1. **Arquitetura antes de implementação**
2. **Todo módulo estratégico nasce como Playbook**
3. **Toda configuração pertence a exatamente um nível** (Plataforma · Org · Profissional · Paciente)
4. **Plataforma nunca possui identidade de cliente**
5. **Marca pertence à Organização**
6. **Profissional administra apenas seu perfil** — não a org como empresa
7. **Compatibilidade antes de limpeza**
8. **Dual Read antes de remover legados**
9. **Pequenas migrações — nunca Big Bang**
10. **Reaproveitar antes de recriar**

---

## Fluxo de desenvolvimento

```
Ideia → Playbook → Arquitetura → Implementação → Validação → Atualizar documentação
```

**Antes de codar, responder:**
- Pertence a Plataforma, Organização, Profissional ou Paciente?
- Existe Playbook?
- Impacta White Label, branding ou organizationId?
- Precisa dual read / compatibilidade com legado?

---

## Estado atual (fundação implementada)

| Área | Status |
|------|--------|
| Arquitetura Oftware 2.0 (doc mestre) | ✅ |
| `organizationId` + registry + backfill + auditoria | 🔵 parcial |
| MetaAdminGeral UX 2.0 (Plataforma / Org Ativa) | ✅ |
| Dashboard da Organização (métricas reais) | ✅ |
| Marca oficial `organizations/{id}.branding` | ✅ |
| Dual read branding (org → whiteLabel legado) | ✅ |
| Hub Organizações + Leads WL na Plataforma | ✅ |
| Org Método Emagrecer em produção | ✅ |
| Fluxo "Nova Organização" no MAG | 📋 planejado |
| Filtro estrito global por org | 📋 planejado |
| Documentação Company (Etapa 14) | ✅ |

---

## Rotas importantes

| Rota | Quem | Domínio |
|------|------|---------|
| `/metaadmingeral` | Admin Oftware | Plataforma |
| `/metaadmin` | Médico (org) | Org |
| `/meta` | Paciente | Org |
| `/metanutri` · `/metapersonal` | Nutri · Personal | Org |
| `/aplicacao/[token]` · `/conclusao/[token]` | Paciente (token) | Org |
| `/dr/[slug]` | Público (médico) | Org |
| `/oftpay` | Aluno / produto educacional | Plataforma |

---

## Código de referência (quando for implementar)

| Módulo | Caminho |
|--------|---------|
| Organização (tipos, registry, host) | `lib/organization/` |
| Branding oficial | `lib/organization/getOrganizationBranding.server.ts` |
| Dual read white label | `lib/whiteLabel/resolveMedicoWhiteLabelWithMetodo.server.ts` |
| Nav MetaAdminGeral | `lib/metaadmingeral/metaAdminGeralNavUx.ts` |
| Dashboard org (métricas) | `lib/metaadmingeral/buildOrganizationDashboardMetrics.ts` |
| MAG (página principal) | `app/metaadmingeral/page.tsx` |
| Auditoria orgId | `/api/metaadmingeral/audit/platform-health` |

---

## Documentação completa — onde ir a fundo

### 🏢 Company — filosofia e processo
`docs/company/`

| Arquivo | Quando ler |
|---------|------------|
| [README.md](./company/README.md) | Porta de entrada detalhada |
| [01_DIRETOR_DE_ARQUITETURA.md](./company/01_DIRETOR_DE_ARQUITETURA.md) | **Sempre** — constituição da plataforma |
| [02_GLOSSARIO.md](./company/02_GLOSSARIO.md) | Termos oficiais |
| [03_PRINCIPIOS_DE_DESENVOLVIMENTO.md](./company/03_PRINCIPIOS_DE_DESENVOLVIMENTO.md) | Fluxo de trabalho |
| [04_ROADMAP_DA_PLATAFORMA.md](./company/04_ROADMAP_DA_PLATAFORMA.md) | Visão macro longo prazo |
| [05_COMO_INICIAR_UM_NOVO_MODULO.md](./company/05_COMO_INICIAR_UM_NOVO_MODULO.md) | **Antes de implementar** qualquer módulo |

### 🏗️ Arquitetura — estrutura técnica
`docs/arquitetura/`

| Arquivo | Conteúdo |
|---------|----------|
| [ARQUITETURA_OFTWARE_2_0.md](./arquitetura/ARQUITETURA_OFTWARE_2_0.md) | Documento mestre multi-org |
| [ETAPA_3_FUNDACAO_ORGANIZACAO.md](./arquitetura/ETAPA_3_FUNDACAO_ORGANIZACAO.md) | Fundação organizationId, equipe |

### 📘 Playbooks — visão funcional por módulo
`docs/playbooks/` · índice: [00_MAPA_DOS_PLAYBOOKS.md](./00_MAPA_DOS_PLAYBOOKS.md)

| Playbook | Status | Caminho |
|----------|--------|---------|
| **Template de Organização** | 🟡 iniciado | [playbooks/organizacao-template/README.md](./playbooks/organizacao-template/README.md) |
| **Nova Organização** | 🟡 iniciado | [playbooks/nova-organizacao/README.md](./playbooks/nova-organizacao/README.md) |
| White Label | ⚪ planejado | — |
| Novo Médico | ⚪ planejado | — |
| Onboarding Paciente | ⚪ planejado | — |
| Marketplace · Financeiro · IA · OftPay · Meta Business | ⚪ planejados | — |

**Nova Organização — arquivos:**
- [00_visao_geral.md](./playbooks/nova-organizacao/00_visao_geral.md) — produto
- [01_fluxo_funcional.md](./playbooks/nova-organizacao/01_fluxo_funcional.md) — jornada
- [02_fluxo_tecnico.md](./playbooks/nova-organizacao/02_fluxo_tecnico.md) — arquitetura
- [03_checklist.md](./playbooks/nova-organizacao/03_checklist.md) — go-live
- [04_roadmap.md](./playbooks/nova-organizacao/04_roadmap.md) — etapas

### 📚 Complementar (legado / especializado)
| Pasta | Uso |
|-------|-----|
| [00_mapa_mestre_oftware.md](./00_mapa_mestre_oftware.md) | Entidades e produtos (legado) |
| `docs/conhecimento/` | Jornadas, regras de negócio |
| `docs/marketing-diretor/` | Identidade visual |

---

## Ordem de leitura recomendada

```
1. Este arquivo (mapa-mental-oftware.md)     ← você está aqui
2. company/01_DIRETOR_DE_ARQUITETURA.md
3. company/02_GLOSSARIO.md
4. arquitetura/ARQUITETURA_OFTWARE_2_0.md
5. Playbook do módulo em questão
6. Código
```

---

## Prompts prontos para nova janela

**Contexto geral:**
```
Leia docs/mapa-mental-oftware.md e use como contexto permanente da Oftware 2.0.
```

**Novo módulo:**
```
Leia docs/mapa-mental-oftware.md e docs/company/05_COMO_INICIAR_UM_NOVO_MODULO.md.
Antes de codar, confirme o nível arquitetural e se existe Playbook.
```

**Organizações / White Label:**
```
Leia docs/mapa-mental-oftware.md e docs/playbooks/nova-organizacao/README.md.
```

**Implementação na MAG:**
```
Leia docs/mapa-mental-oftware.md.
Respeite: Plataforma vs Organização Ativa, organizationId, dual read, compatibilidade ?menu= legados.
Não alterar Firestore Rules sem pedido explícito.
```

---

## Glossário rápido

| Termo | Definição em uma linha |
|-------|------------------------|
| **Plataforma** | Oftware fabricante — MetaAdminGeral contexto Plataforma |
| **Organização** | Empresa cliente WL — marca, equipe, pacientes, domínio |
| **Organização Ativa** | Org selecionada no MAG (`activeOrganizationId`) |
| **Patrimônio Global** | Recursos compartilhados sem `organizationId` |
| **White Label** | Produto B2B — cliente opera com marca própria |
| **Lead WL** | Médico interessado em **comprar** uma org |
| **Lead clínico** | Paciente interessado em **tratamento** |
| **Marca da Org** | `organizations/{id}.branding` — fonte oficial |
| **Dual Read** | Ler fonte nova + mesclar legado antes de remover |
| **Playbook** | Doc oficial de produto antes do código |
| **MetaAdminGeral** | Admin plataforma + orgs (MAG) |
| **MetaAdmin** | Admin operacional do médico (org) |
| **organizationId** | ID canônico imutável da org (ex.: `metodo`) |

Glossário completo: [company/02_GLOSSARIO.md](./company/02_GLOSSARIO.md)

---

## Manutenção

Ao evoluir a plataforma, atualizar **nesta ordem**:

1. Playbook do módulo
2. `company/04_ROADMAP_DA_PLATAFORMA.md`
3. Este arquivo (estado atual + links)
4. Glossário (se novo termo)

---

*Última consolidação: Etapa 14 — Documentação Estratégica · Oftware 2.0*
