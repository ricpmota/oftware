# Departamento — Dashboard

**Departamento oficial:** Dashboard  
**Ordem na org:** 1 (home da Organização Ativa)

---

## Objetivo

Ser a **porta de entrada operacional** da Organização no MetaAdminGeral.

Responde em segundos: *como está a org?* — equipe, pacientes, leads, saúde dos dados e atalhos para ação.

---

## Responsabilidades

- Consolidar **métricas reais** da organização (não placeholders)
- Exibir status da org (ativa, domínio, identidade resumida)
- Oferecer **atalhos rápidos** para departamentos críticos
- Sinalizar **saúde dos dados** (`organizationId`, links públicos)
- **Não** substituir relatórios analíticos profundos (isso é Jornada ou Negócio)

---

## Submódulos previstos

| Submódulo | Descrição | Status |
|-----------|-----------|--------|
| **Visão geral** | Cards de métricas (equipe, pacientes, leads, NPS) | ✅ implementado (`org-dashboard`) |
| **Resumo da org** | Domínio, status, solicitações pendentes | ✅ parcial |
| **Saúde dos dados** | Cobertura orgId, links públicos (via auditoria) | ✅ parcial |
| **Atalhos rápidos** | Marca, Equipe, Pacientes, Calendário, etc. | ✅ implementado |
| **Alertas operacionais** | Pendências críticas (contratos, aplicações) | 📋 planejado |
| **Comparativo temporal** | Evolução mês a mês | 📋 planejado |
| **Export / snapshot** | PDF ou link executivo para gestor | 🔮 longo prazo |

---

## Exemplos de funcionalidades

- Total de médicos, nutricionistas, personais (com verificados)
- Total de pacientes (em tratamento, pendentes, concluídos)
- Leads clínicos ativos
- NPS geral
- Pacientes internos / compartilhados
- Solicitações de médico pendentes
- Links para Identidade, Equipe, Pacientes, Administração

---

## O que NÃO pertence a Dashboard

| Item | Departamento correto |
|------|---------------------|
| Editar logo ou cores | Identidade |
| Cadastrar médico | Equipe |
| Lista detalhada de pacientes | Pacientes |
| Pipeline de leads (Kanban) | Pacientes |
| Calendário de aplicações | Jornada |
| Faturamento detalhado | Negócio |
| Configurar domínio DNS | Identidade / Administração |
| Toggles de IA | IA |
| Leads White Label (venda de org) | Plataforma |

---

## Princípios

1. **Métricas reais** — reaproveitar dados já carregados; não duplicar queries pesadas
2. **Leitura rápida** — gestor entende a org em &lt; 30 segundos
3. **Ação imediata** — todo card ou seção leva a um departamento
4. **Escopo org** — filtrado por `organizationId` quando migração estiver completa

---

## Referência atual

- Menu: `org-dashboard` (alias legado: `estatisticas`)
- Componente: `OrganizationDashboardPanel`
- Métricas: `buildOrganizationDashboardMetrics.ts`
