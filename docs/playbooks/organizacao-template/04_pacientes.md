# Departamento — Pacientes

**Departamento oficial:** Pacientes  
**Nav MAG atual:** `org-pacientes`

---

## Objetivo

Administrar o **universo de pacientes e prospects clínicos** da Organização: quem está em tratamento, quem está no funil e como medimos satisfação.

Diferente de **Jornada** (como o tratamento acontece) e **Equipe** (quem cuida).

---

## Responsabilidades

- Lista e gestão agregada de pacientes da org
- Status de tratamento (pendente, em tratamento, concluído, abandono)
- **Leads clínicos** — interessados em tratamento com médicos da org
- NPS — satisfação de pacientes e médicos
- Pacientes compartilhados entre profissionais da org
- Visão consolidada para gestão (MAG) — detalhe clínico no MetaAdmin

---

## Submódulos previstos

| Submódulo | Descrição | Status |
|-----------|-----------|--------|
| **Pacientes** | Lista, filtros, edição admin, doses, subcoleções | ✅ `pacientes` |
| **Leads clínicos** | Pipeline por status, qualificação | ✅ `leads` |
| **NPS** | Score, distribuição, respostas | ✅ `nps` |
| **Pacientes compartilhados** | Métrica cross-profissional | ✅ parcial |
| **Segmentação** | Tags, cohorts, risco churn | 📋 planejado |
| **Importação / export** | CSV, migração de base | 🔮 longo prazo |

---

## Exemplos de funcionalidades

- Filtrar pacientes por médico, status, cidade
- Pipeline Kanban de leads (não qualificado → qualificado)
- Taxa de conversão lead → paciente
- Dashboard NPS geral e por persona
- Ver evolução de peso agregada (estatísticas legadas)
- Editar dados cadastrais admin de paciente

---

## O que NÃO pertence a Pacientes

| Item | Departamento correto |
|------|---------------------|
| Check-in semanal de aplicação | Jornada |
| Calendário de aplicações agendadas | Jornada |
| Portal `/meta` do paciente | Jornada |
| Leads White Label (médico querendo org) | Plataforma |
| Cadastro de médico | Equipe |
| Pagamento do paciente | Negócio |
| Prescrição e protocolo | Jornada |
| Banners de captação | Marketing |

**Regra:** *Lead clínico* = paciente/prospect de tratamento. *Lead WL* = comprador de organização.

---

## Princípios

1. Paciente pertence à **Organização** via `organizationId` + `medicoResponsavelId`
2. MAG = visão **agregada**; MetaAdmin = operação **individual**
3. NPS mede relacionamento — não substitui outcome clínico
4. Leads clínicos nunca misturados com leads WL

---

## Referência atual

- Menus: `pacientes`, `leads`, `nps`
- Alias legado estatísticas detalhadas → migrado para Dashboard org
- Serviços: `PacienteService`, `LeadService`, `NPSService`
