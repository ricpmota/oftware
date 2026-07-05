# Diretor de Arquitetura — Oftware 2.0

**Status:** documento fundacional (Etapa 14)  
**Natureza:** filosofia de produto e arquitetura — **não é documentação de código**

---

## Papel da Arquitetura

A Arquitetura da Oftware existe para **proteger a evolução da plataforma**.

Ela garante que:

- A Oftware continue sendo uma **plataforma SaaS multi-organização**, não um monólito de um único cliente.
- Cada decisão respeite a **hierarquia correta** de responsabilidades.
- Novas funcionalidades **não destruam** o que já funciona em produção.
- O conhecimento **não dependa** de memória individual, conversas ou contexto de IDE.

A Arquitetura não é burocracia. É o **sistema imunológico** da plataforma.

---

## Visão

A Oftware é a **fabricante** de uma plataforma clínica White Label.

Cada **Organização** (clínica, programa, instituto) opera sob **sua própria marca e domínio**, utilizando a infraestrutura da Oftware.

O **paciente** vive a jornada clínica da Organização — não da Oftware.

---

## Hierarquia oficial

```
Plataforma (Oftware)
    ↓
Patrimônio Global
    ↓
Organizações
    ↓
Equipe (Profissionais)
    ↓
Pacientes
```

Cada nível possui **responsabilidades exclusivas**. Nenhum nível absorve o papel de outro.

---

## Princípios invioláveis

### 1. Arquitetura antes de implementação

Nenhuma funcionalidade estratégica começa pelo código.

Começa pela **compreensão do nível arquitetural** a que pertence e pelo **Playbook** correspondente.

### 2. Todo módulo nasce como Playbook

Antes de escrever uma linha de código para um módulo estratégico, deve existir um Playbook com:

- visão de produto
- fluxo funcional
- fluxo técnico (quando aplicável)
- checklist de validação
- roadmap do módulo

O Playbook é a **visão oficial do produto**. O código apenas materializa essa visão.

### 3. Toda configuração pertence a exatamente um nível

Antes de criar ou mover uma configuração, pergunte:

> *Isso pertence à Plataforma, à Organização, ao Profissional ou ao Paciente?*

Não existe configuração “genérica” ou “no meio do caminho”.

| Exemplo correto | Nível |
|-----------------|-------|
| Protocolos SISTEMA | Patrimônio Global (Plataforma) |
| Cores e logo da clínica | Organização |
| CRM do médico | Profissional (dentro da org) |
| Preferências do paciente | Paciente |

### 4. Plataforma nunca possui identidade de cliente

A Oftware **não** deve aparecer como marca dominante na jornada clínica do paciente.

- Home institucional, vendas, mentorias → Oftware
- `/meta`, aplicações, conclusão, prescrições → **Organização**

“Powered by Oftware” pode existir como crédito discreto — nunca como identidade principal.

### 5. Marca pertence à Organização

Logos, cores, favicon, Open Graph, domínio e nome público são **propriedade da Organização**.

- Fonte oficial: `organizations/{organizationId}.branding`
- O nome público da org **não** é o nome de um médico
- Página `/dr/[slug]` é do profissional; a identidade dominante é da org

### 6. Profissional administra apenas seu perfil

O médico, nutricionista ou personal:

- **administra** seus pacientes, agenda e prática clínica
- **não administra** a Organização como empresa
- **não possui** marca que substitua a marca da org

MetaAdmin pertence à **Organização**. MetaAdminGeral pertence à **Plataforma**.

### 7. Compatibilidade antes de limpeza

Código legado que funciona em produção **não é removido** por estética ou impaciência.

Primeiro garantimos que o novo caminho funciona. Depois, gradualmente, desativamos o legado.

### 8. Dual Read antes de remover legados

Ao migrar uma fonte de dados (ex.: `whiteLabel` do médico → `organizations.branding`):

1. **Ler** a nova fonte primeiro
2. **Mesclar** com a fonte legada (dual read)
3. Validar em produção
4. Só então **desativar** a fonte antiga

Nunca cortar o legado antes de provar que o novo caminho cobre todos os consumidores.

### 9. Pequenas migrações — nunca Big Bang

Migrações de dados seguem o padrão:

- diagnóstico (dry run)
- backfill incremental
- auditoria de cobertura
- validação
- repetição

Nunca “migrar tudo de uma vez num fim de semana”.

### 10. Reaproveitar antes de recriar

Antes de criar nova coleção, nova API ou nova lógica:

- Os dados **já existem** em algum lugar?
- A lógica **já é carregada** em alguma tela?
- Existe **helper** ou **serviço** que pode ser estendido?

Duplicação é dívida arquitetural.

---

## O que a Arquitetura protege

| Ameaça | Proteção |
|--------|----------|
| Monólito disfarçado de multi-org | `organizationId`, registry, filtros por org |
| Marca do médico substituindo marca da org | Branding oficial da organização |
| Oftware visível ao paciente | Regra de domínio e identidade |
| Perda de contexto entre sessões | Company + Playbooks + Glossário |
| Regressões em produção | Compatibilidade, dual read, migrações pequenas |
| Funcionalidades órfãs sem dono | Configuração em exatamente um nível |

---

## Decisões que exigem validação arquitetural

Antes de implementar, escale para revisão arquitetural se:

- Cria nova coleção Firestore
- Altera Firestore Rules
- Introduz novo domínio ou host
- Move configuração entre níveis (Plataforma ↔ Organização)
- Remove código legado ainda em uso
- Afeta jornada do paciente ou branding
- Impacta MetaAdminGeral ou MetaAdmin

---

## Relação com outros documentos

| Documento | Papel |
|-----------|-------|
| [02_GLOSSARIO.md](./02_GLOSSARIO.md) | Vocabulário oficial |
| [03_PRINCIPIOS_DE_DESENVOLVIMENTO.md](./03_PRINCIPIOS_DE_DESENVOLVIMENTO.md) | Fluxo de trabalho |
| [../arquitetura/ARQUITETURA_OFTWARE_2_0.md](../arquitetura/ARQUITETURA_OFTWARE_2_0.md) | Estrutura técnica |
| [../playbooks/](../playbooks/) | Visão funcional por módulo |

---

## Compromisso

Quem desenvolve na Oftware — humano ou IA — deve internalizar:

> **O código implementa. A arquitetura organiza. Os Playbooks explicam. A documentação preserva o conhecimento.**

Este documento é a **constituição** da plataforma. Em caso de dúvida, prevalece o princípio arquitetural — não a conveniência do momento.
