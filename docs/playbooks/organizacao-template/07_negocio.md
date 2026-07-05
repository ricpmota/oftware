# Departamento — Negócio

**Departamento oficial:** Negócio  
**Nav MAG atual:** Financeiro (`org-financeiro`) + partes de Operação — convergência futura

---

## Objetivo

Administrar a **economia da Organização**: receitas, produtos comercializados, pagamentos e indicadores de negócio — sem confundir com operação clínica (Jornada) ou captação (Marketing/Pacientes).

Negócio responde: *a org é sustentável? quanto fatura? o que vende?*

---

## Responsabilidades

- Visão financeira consolidada da org
- Pagamentos de pacientes (por profissional / agregado)
- Produtos comercializados pela org (ex.: tirzepatida — aspecto **preço/receita**)
- Indicações, vendas avulsas, comissões
- Relatórios de faturamento (não clínicos)
- Métricas de conversão comercial (lead → pagante)
- Contratos comerciais (aspecto financeiro — detalhe legal em Jornada)

---

## Submódulos previstos

| Submódulo | Descrição | Status |
|-----------|-----------|--------|
| **Visão geral financeira** | Receita, ticket, inadimplência | 📋 coming soon |
| **Pagamentos paciente** | Status pagamento por paciente | ✅ parcial (estatísticas legadas) |
| **Indicações** | Programa referência | ✅ parcial |
| **Vendas avulsas** | Produtos/serviços pontuais | ✅ parcial |
| **Produtos — precificação** | Tirzepatida e futuros SKUs | ✅ `tirzepatida` (aspecto preço) |
| **Relatórios financeiros** | Export, período, profissional | 📋 planejado |
| **Billing org → Oftware** | Mensalidade SaaS WL | 🔮 longo prazo |

---

## Exemplos de funcionalidades

- Dashboard receita mensal da org
- Pagamentos pendentes por paciente
- Ranking médicos por faturamento
- Configurar preço de produto (tirzepatida)
- Relatório de indicações convertidas
- Export CSV financeiro para contabilidade

---

## O que NÃO pertence a Negócio

| Item | Departamento correto |
|------|---------------------|
| Calendário de aplicações | Jornada |
| Pipeline de leads clínicos | Pacientes |
| Licenciamento SaaS (Oftware cobrando org) | Plataforma |
| Financeiro global Oftware | Plataforma |
| Marca e pricing page marketing | Marketing |
| Protocolo clínico de doses | Jornada |
| NPS | Pacientes |
| Marketplace transacional futuro | Plataforma / épico Marketplace |

**Nota:** Tirzepatida aparece em **Jornada** (operacional clínico) e **Negócio** (precificação) — submódulos distintos, mesmo produto.

---

## Princípios

1. Dados financeiros filtrados por `organizationId`
2. MetaAdmin médico vê **seus** pacientes; MAG Negócio vê **org inteira**
3. Separar outcome clínico (Jornada) de outcome financeiro (Negócio)
4. Billing SaaS org↔Oftware é Plataforma, não Negócio da org

---

## Referência atual

- Menu: `org-financeiro-overview` (coming soon)
- Dados parciais em case `estatisticas` legado / dashboard org
- Serviços: pagamentos, indicações, vendas avulsas no MAG
