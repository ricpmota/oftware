# Como Iniciar um Novo Módulo — Oftware

**Status:** guia obrigatório antes de implementação (Etapa 14)  
**Use este documento** toda vez que surgir ideia de funcionalidade estratégica.

---

## Antes de qualquer implementação

Responda **todas** as perguntas abaixo. Se alguma resposta for “não sei”, **pare** e esclareça antes de codar.

---

## 1. Nível arquitetural

> **O módulo pertence à Plataforma, Organização, Profissional ou Paciente?**

| Nível | Exemplos | Painel / superfície |
|-------|----------|---------------------|
| **Plataforma** | OftPay, Patrimônio Global, cadastro de orgs, saúde da plataforma | MetaAdminGeral (contexto Plataforma) |
| **Organização** | Marca, equipe, pacientes agregados, banners, NPS org | MetaAdminGeral (contexto Org) + MetaAdmin |
| **Profissional** | Agenda do médico, pacientes do médico, página `/dr` | MetaAdmin, MetaNutri, MetaPersonal |
| **Paciente** | Portal `/meta`, check-in, conclusão | Rotas públicas no domínio da org |
| **Patrimônio Global** | Protocolos SISTEMA, exames lab, Chat Inicial | Plataforma — **sem** `organizationId` |

**Regra:** toda configuração pertence a **exatamente um** nível.

---

## 2. Playbook

> **Existe Playbook para este módulo?**

- [ ] Sim — li o README e os fluxos
- [ ] Não — **criar Playbook primeiro** em `docs/playbooks/[modulo]/`
- [ ] Parcial — completar antes de implementar

**Sem Playbook = sem implementação estratégica.**

Modelo: [Nova Organização](../playbooks/nova-organizacao/README.md)

---

## 3. Arquitetura

> **Existe documentação arquitetural alinhada?**

- [ ] Li o [Diretor de Arquitetura](./01_DIRETOR_DE_ARQUITETURA.md)
- [ ] Li [Arquitetura Oftware 2.0](../arquitetura/ARQUITETURA_OFTWARE_2_0.md)
- [ ] Seção `02_fluxo_tecnico.md` do Playbook preenchida
- [ ] Decisões registradas se impacto transversal

---

## 4. Documentação existente

> **Existe documentação que já cobre parte disto?**

Verificar:

- [ ] [Glossário](./02_GLOSSARIO.md) — terminologia correta
- [ ] [Mapa dos Playbooks](../00_MAPA_DOS_PLAYBOOKS.md)
- [ ] `docs/arquitetura/` — decisões técnicas anteriores
- [ ] `docs/conhecimento/` — contexto legado (complementar)

**Reaproveitar** antes de recriar.

---

## 5. Impacto White Label

> **O módulo impacta o produto White Label?**

- [ ] Afeta como orgs são vendidas ou entregues?
- [ ] Afeta onboarding de nova org?
- [ ] Afeta domínio ou roteamento por host?
- [ ] N/A — sem impacto WL

Se **sim** → revisar [Playbook Nova Organização](../playbooks/nova-organizacao/README.md) e roadmap WL.

---

## 6. Impacto em branding

> **O módulo exibe ou altera identidade visual?**

- [ ] Usa Marca da Organização (`organizations.branding`)?
- [ ] Exposto ao **paciente** (jornada clínica)?
- [ ] Exposto apenas à **Plataforma** (Oftware)?
- [ ] Precisa de dual read com legado?

**Regra:** jornada do paciente = marca da **Organização**, nunca identidade Oftware dominante.

---

## 7. Impacto em organização

> **O módulo opera no contexto de uma Organização específica?**

- [ ] Sim — deve respeitar **Organização Ativa** no MAG
- [ ] Sim — deve filtrar por `organizationId`
- [ ] Não — é Patrimônio Global ou Plataforma pura

Se opera por org → navegação no contexto **Organização**, não Plataforma.

---

## 8. Impacto em organizationId

> **O módulo cria, lê ou altera dados com organizationId?**

- [ ] Novos documentos precisam de `organizationId`?
- [ ] Queries precisam filtrar por org?
- [ ] Backfill necessário em coleção existente?
- [ ] Impacto na auditoria (Saúde da Plataforma)?
- [ ] N/A

**Regras:**

- Nunca sobrescrever `organizationId` existente no backfill
- Migração pequena e incremental — nunca Big Bang
- Verificar cobertura antes de filtrar estritamente

---

## 9. Compatibilidade e legado

> **O módulo afeta código ou dados legados?**

- [ ] Existe dual read necessário?
- [ ] Menus / `?menu=` legados preservados?
- [ ] APIs existentes mantidas?
- [ ] Plano de remoção gradual do legado (se aplicável)?

**Compatibilidade antes de limpeza.**

---

## 10. Escopo de implementação

> **Qual o menor escopo que entrega valor?**

- [ ] MVP definido no Playbook
- [ ] Fora de escopo explicitamente listado
- [ ] Sem nova coleção Firestore se dados já existem
- [ ] Sem alterar Rules sem revisão
- [ ] Sem alterar runtime público sem validação

---

## Checklist rápido (copiar para PR ou issue)

```
[ ] Nível arquitetural definido: ___________
[ ] Playbook lido ou criado
[ ] Diretor de Arquitetura consultado
[ ] Glossário — termos corretos
[ ] Impacto WL avaliado
[ ] Impacto branding avaliado
[ ] Impacto organizationId avaliado
[ ] Compatibilidade / dual read planejado
[ ] Escopo mínimo definido
[ ] Documentação será atualizada ao concluir
```

---

## Fluxo visual

```
Nova ideia
    │
    ├─► Responder 10 perguntas acima
    │
    ├─► Bloqueio? → Esclarecer → Playbook / Arquitetura
    │
    ├─► Playbook OK? ──Não──► Criar em docs/playbooks/
    │
    ├─► Arquitetura OK? ──Não──► Documentar decisão
    │
    └─► Implementar (escopo mínimo)
            │
            └─► Validar → Atualizar documentação
```

---

## Para sessões de IA (Cursor / ChatGPT)

Prompt recomendado:

```
Leia:
1. docs/company/01_DIRETOR_DE_ARQUITETURA.md
2. docs/company/05_COMO_INICIAR_UM_NOVO_MODULO.md
3. docs/playbooks/[modulo]/README.md (se existir)

Depois implemente [descrição], respeitando o nível arquitetural [X].
```

---

## Quando pular este guia

Apenas para: bugfix pontual, typo, ajuste visual isolado, refactor interno sem impacto estratégico.

**Na dúvida, não pule.**

---

## Referências

- [03_PRINCIPIOS_DE_DESENVOLVIMENTO.md](./03_PRINCIPIOS_DE_DESENVOLVIMENTO.md) — fluxo completo
- [01_DIRETOR_DE_ARQUITETURA.md](./01_DIRETOR_DE_ARQUITETURA.md) — princípios invioláveis
- [02_GLOSSARIO.md](./02_GLOSSARIO.md) — termos oficiais
