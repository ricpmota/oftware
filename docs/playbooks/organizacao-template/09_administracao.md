# Departamento — Administração

**Departamento oficial:** Administração  
**Nav MAG atual:** Configurações (`org-configuracoes`)

---

## Objetivo

**Governar a Organização** como entidade: dados cadastrais, integrações, status, permissões internas e configurações que não são Identidade visual nem operação clínica.

Administração responde: *como a org está configurada e quem pode o quê?*

---

## Responsabilidades

- Dados cadastrais da org (nome legal, ID, status ativa/rascunho/suspensa)
- Integrações (Google Calendar, assinatura, pagamentos, Meta)
- Configurações técnicas org-scoped (webhooks, APIs)
- Status de go-live e checklist operacional
- Logs e auditoria **da org** (não plataforma global)
- Políticas internas (retenção, backup export org)

---

## Submódulos previstos

| Submódulo | Descrição | Status |
|-----------|-----------|--------|
| **Dados da Organização** | Metadados registry, contatos | ✅ `organizacao-metodo` |
| **Integrações** | Calendar, e-mail, assinatura, Meta | 📋 coming soon |
| **Status da org** | Rascunho · Ativa · Suspensa | 📋 planejado |
| **Usuários admin org** | Gestores com acesso MAG org | 🔮 longo prazo |
| **Auditoria org** | Log ações admin org | 🔮 longo prazo |
| **Export / offboarding** | Backup dados ao encerrar org | 🔮 longo prazo |
| **Checklist go-live** | Validação pré-ativação | 📋 doc em nova-organizacao |

---

## Exemplos de funcionalidades

- Editar nome legal e contato da org
- Conectar Google Calendar para leads WL *(hoje redirect plataforma)*
- Ver `organizationId` e hosts registrados
- Suspender org (bloqueio acesso pacientes)
- Configurar webhook de eventos org
- Rodar checklist Nova Organização antes de ativar

---

## O que NÃO pertence a Administração

| Item | Departamento correto |
|------|---------------------|
| Logo, cores, domínio público | Identidade |
| Saúde da Plataforma (global) | Plataforma → Ferramentas |
| Backfill organizationId global | Plataforma |
| Cadastro nova org na plataforma | Plataforma → Organizações |
| Editar paciente individual | Pacientes / MetaAdmin |
| Preço tirzepatida | Negócio |
| Toggle anamnese IA | IA |
| Cores globais Oftware | Plataforma |

---

## Princípios

1. Administração **não** edita marca — encaminha Identidade
2. Suspender org é ação crítica — auditável
3. Integrações declararam escopo: org vs plataforma
4. Dados sensíveis (LGPD) exportáveis por org

---

## Referência atual

- Menu: `organizacao-metodo`, `org-config-integracoes` (coming soon)
- Registry: `lib/organization/organizationRegistry.ts`
- Playbook nascimento: [nova-organizacao/03_checklist.md](../nova-organizacao/03_checklist.md)
- Documento org Firestore: `organizations/{organizationId}`

---

## Relação com Plataforma

| Ação | Quem |
|------|------|
| Criar nova org | Plataforma (MAG → Organizações) |
| Configurar org existente | Administração (contexto org) |
| Auditoria cobertura orgId global | Plataforma → Saúde da Plataforma |
| Encerrar contrato WL | Plataforma + Administração |
