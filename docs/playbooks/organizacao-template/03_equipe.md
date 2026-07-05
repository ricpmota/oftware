# Departamento — Equipe

**Departamento oficial:** Equipe  
**Nav MAG atual:** `org-equipe`

---

## Objetivo

Administrar os **profissionais da Organização**: médicos, nutricionistas e personais.

A equipe pertence à **Organização** — o médico não é dono do nutri nem do personal.

---

## Responsabilidades

- Cadastro, verificação e gestão de médicos
- Cadastro e verificação de nutricionistas
- Cadastro e verificação de personal trainers
- Vínculo profissional ↔ `organizationId`
- Solicitações pendentes (novos médicos)
- Compartilhamento de pacientes **dentro da mesma org**
- Páginas públicas profissionais (`/dr/[slug]`) no contexto da org

---

## Submódulos previstos

| Submódulo | Descrição | Status |
|-----------|-----------|--------|
| **Médicos** | Lista, CRM, verificação, edição, QR/link | ✅ `medicos` |
| **Nutricionistas** | Lista, verificação, vínculos | ✅ `nutricionistas` |
| **Personais** | Lista, verificação, vínculos | ✅ `personal_trainers` |
| **Solicitações** | Médicos aguardando aprovação | ✅ (integrado) |
| **Classificação / ranking** | Desempenho por profissional | 📋 parcial |
| **Convites equipe** | Onboarding de novo profissional | 📋 planejado |
| **Permissões por papel** | Gestor org vs médico vs nutri | 🔮 longo prazo |

---

## Exemplos de funcionalidades

- Aprovar / reprovar médico verificado
- Editar dados CRM, telefone, endereço
- Ver ranking de pacientes por médico
- Gerar link QR da página `/dr`
- Anamnese inteligente toggle por médico (transição → IA)
- Vincular nutri/personal a pacientes (via MetaAdmin do médico)

---

## O que NÃO pertence a Equipe

| Item | Departamento correto |
|------|---------------------|
| Dados clínicos do paciente | Pacientes / Jornada |
| Marca visual da org | Identidade |
| Leads de pacientes interessados | Pacientes |
| Leads WL (comprar org) | Plataforma |
| Financeiro do profissional | Negócio |
| Protocolos SISTEMA | Patrimônio Global |
| MetaAdmin operacional do dia a dia | MetaAdmin (superfície do médico) |

**Nota:** MetaAdmin é a **ferramenta do profissional**; Equipe no MAG é a **gestão agregada** da org sobre profissionais.

---

## Princípios

1. Todo profissional tem `organizationId` da org ativa
2. Busca de profissionais para compartilhamento → mesma org
3. Perfil público do médico **complementa** identidade da org — não substitui
4. Verificação é gate de qualidade antes de operar pacientes

---

## Referência atual

- Menus: `medicos`, `nutricionistas`, `personal_trainers`
- Serviços: `MedicoService`, `NutricionistaService`, `PersonalTrainerService`
- Filosofia equipe: `lib/organization/organizationTeam.ts`
