# MetaPsi — Auditoria Financeiro + Calendário (ETAPA 6.3.8)

**Tipo:** auditoria arquitetural **READ-ONLY**  
**Data:** 2026-09-17  
**Portais comparados:** `/metanutri`, `/metapersonal`, `/metaadmin` (e org `/metaadmingeral` só como contraste)  
**Regra:** nenhuma implementação funcional; nenhuma alteração de código de produto nesta etapa.

---

## Resumo executivo

| Módulo | UI compartilhada? | Dados genéricos? | Classificação | Recomendação |
|--------|-------------------|------------------|---------------|--------------|
| **Financeiro** | Sim (`ProfissionalFinanceiroSection`) | Não — collections por papel | **B** | **MANTER PLACEHOLDER POR ENQUANTO** |
| **Calendário** | Parcial (`ProfissionalCalendarioSection`) | Não — stacks paralelos `nutri*` / `medico*` | **C** | **MANTER PLACEHOLDER POR ENQUANTO** |

**Conclusão:** chrome visual de Financeiro (e parcialmente de Calendário) já é “profissional”. O modelo de dados **não** é genérico (`professionalRole` / `professionalId`). Nutri e Personal compartilham **UI**, não a mesma collection. Psi não deve copiar Nutri “como está”; qualquer habilitação futura exige collection/API própria + gate `paciente_psiquiatra` ativo.

---

# FINANCEIRO

## 1. Implementação encontrada

| Portal | Entrada | Componente de página |
|--------|---------|----------------------|
| Nutri | `case 'financeiro'` em `app/metanutri/page.v2.tsx` | `ProfissionalFinanceiroSection` |
| Personal | `case 'financeiro'` em `app/metapersonal/page.v2.tsx` | **mesmo** `ProfissionalFinanceiroSection` |
| Médico | `financeiro` em `app/metaadmin/page.tsx` | UI própria + `pagamentos_pacientes` + vendas avulsas |
| Org | `OrganizationFinanceiroPanel` | agregação multi-médico (não é portal profissional) |
| Psi | `EmptyPanel` placeholder | sem backend |

Painel de edição por paciente (Nutri/Personal): `ControleFinanceiroPacientePanel` (modal ou embedded na pasta Financeiro do workspace).

## 2. Componentes

- `components/profissional/ProfissionalFinanceiroSection.tsx` — KPIs, calendário mensal de fluxos, lista, drill-down relatório.
- `components/profissional/ControleFinanceiroPacientePanel.tsx` — CRUD de parcelas/vendas no estado local + `onSave`.
- `components/metaadmin/FinanceiroRelatorioTransacoesPanel.tsx` — relatório reutilizado pelo section profissional.
- `lib/metaadmin/buildFinanceiroRelatorioTransacoes.ts` — agregações/status.
- `lib/profissional/controleFinanceiroParcelas.ts` — lógica de parcelas.

## 3. Services/hooks

- `services/pagamentoService.ts` — única fonte de persistência client-side.
- Sem hook React Query dedicado; load/save na página (`loadPagamentos`).

Métodos relevantes:

| Papel | Load | Save | Collection |
|-------|------|------|------------|
| Médico | `getPagamentoPorPacienteId` / `getAllPagamentos` | `salvarPagamento` | `pagamentos_pacientes` |
| Nutri | `getAllPagamentosNutricionista(uid)` | `salvarPagamentoNutricionistaPaciente` | `pagamentos_nutricionista_paciente` |
| Personal | `getAllPagamentosPersonalTrainer(uid)` | `salvarPagamentoPersonalTrainerPaciente` | `pagamentos_personal_trainer_paciente` |
| Psi | — | — | **inexistente** |

## 4. Collections (código real)

### A — Médico / tratamento

```text
Collection: pagamentos_pacientes
Documento: {pacienteId}
Owner: implícito (paciente; histórico médico)
Campo profissional: (não tipado no doc; legado médico)
Campo paciente: pacienteId (== docId)
Campo organização: não no doc de pagamento
Quem escreve: client MetaAdmin via PagamentoService.salvarPagamento
Quem lê: MetaAdmin, crons, relatório token, Meta paciente
ACL: Firestore catch-all (auth != null); gates de produto no client
```

### B — Nutricionista × paciente

```text
Collection: pagamentos_nutricionista_paciente
Documento: {nutricionistaId}_{pacienteId}
Owner: nutricionistaId (campo + prefixo do id)
Campo profissional: nutricionistaId
Campo paciente: pacienteId (+ pacienteIdRef)
Campo organização: não no pagamento
Quem escreve: client MetaNutri (PagamentoService)
Quem lê: MetaNutri (query where nutricionistaId == uid); também Meta paciente (leitura cruzada)
ACL: catch-all; filtro de UI = pacientesVisiveis (vínculo nutri)
```

### C — Personal × paciente

```text
Collection: pagamentos_personal_trainer_paciente
Documento: {personalTrainerId}_{pacienteId}
Owner: personalTrainerId
Campo profissional: personalTrainerId
Campo paciente: pacienteId
Campo organização: não no pagamento
Quem escreve/lê: espelho do Nutri no MetaPersonal
ACL: idem catch-all + pacientesVisiveis personal
```

**Não existe** `pagamentos_psiquiatra_paciente` nem campo `professionalRole`.

## 5. APIs

Financeiro profissional Nutri/Personal é **majoritariamente client Firestore**, não REST.

APIs relacionadas (cobrança/relatório — não são o core do menu Financeiro):

- `/api/metaadmin/financeiro/cobranca-whatsapp`
- `/api/relatorio-financeiro/[token]/dados` (lê `pagamentos_pacientes`)
- serviços `financeiroCobranca*` / WhatsApp

Não há `/api/metanutri/financeiro/*` de CRUD de parcelas.

## 6. Modelo de dados

Tipo compartilhado: `types/pagamento.ts` → `PagamentoPaciente` (parcelas, status, totais).  
Sem `organizationId` / `professionalRole` no tipo.  
Owner diferenciado só pelo **nome da collection** + campo `nutricionistaId` | `personalTrainerId` | (médico via `pagamentos_pacientes`).

## 7. Owner

Por vínculo profissional–paciente isolado (Nutri/Personal) ou por paciente (Médico).  
Não é “financeiro da organização” no portal Nutri/Personal.

## 8. Organização

Não scoped por `organizationId` no documento de pagamento. Isolamento prático = ID do profissional no docId/campo.

## 9. ACL/permissões

- **UI:** lista = pacientes já visíveis no portal (vínculo ativo).
- **Persistência:** client SDK; **Firestore rules** têm fallback:

```text
match /{document=**} {
  allow read, write: if request.auth != null && !isHydrationProtectedPath();
}
```

Qualquer usuário autenticado pode, em tese, ler/escrever collections de pagamento se souber IDs.  
Gates server-side **não** protegem o CRUD Nutri/Personal atual.

## 10. Comparação Nutri × Personal

| Aspecto | Nutri | Personal |
|---------|-------|----------|
| UI section | Idêntica | Idêntica (`accentClassName` amarelo) |
| Panel controle | Idêntico | Idêntico |
| Collection | `…_nutricionista_…` | `…_personal_trainer_…` |
| Campo owner | `nutricionistaId` | `personalTrainerId` |
| Tipo `PagamentoPaciente` | Mesmo | Mesmo |

→ Infraestrutura de **UI** profissional reutilizável; dados **duplicados por papel** (padrão já estabelecido).

## 11. Comparação com Médico

- Collection diferente (`pagamentos_pacientes`).
- Vendas avulsas (`VendaAvulsa` + `medicoId`).
- Relatório org (`buildOrganizationFinanceMetrics`) agrega médicos — **não** reutilizar para Psi.

## 12. Acoplamentos

- Campos `nutricionistaId` / `personalTrainerId` (não genéricos).
- Cobrança WhatsApp / crons referenciam collections Nutri/Personal/Médico explicitamente.
- Sem `psiquiatra` em unions de pagamento.

## 13. Chrome visual

`ProfissionalFinanceiroSection`: cards KPI (vendido/recebido/aberto), calendário mensal de fluxos, detalhe do dia, lista de pacientes com status, botão Gerenciar, mobile com valores compactos, relatório drill-down.  
Psi placeholder hoje: `EmptyPanel` dashed — **não** usa o chrome Nutri.

## 14. Mobile

**Parcial / pronto no Nutri:** `isMobile` tratado no section (calendário + formatação). Bottom nav Nutri inclui Financeiro.

## 15. Segurança

| Pergunta | Achado |
|----------|--------|
| Psi poderia ler dados de outro profissional alterando ID no client? | **Sim, em tese** — catch-all + query por `nutricionistaId` se souber o UID. |
| Classificação | **Requer hardening antes** (rules ou API server + ACL share) |

## 16. Custo de generalização

**MÉDIO** — espelhar o padrão Personal: novos métodos no `PagamentoService` + collection `pagamentos_psiquiatra_paciente` + wiring no Psi + **obrigatório** gate `paciente_psiquiatra` ativo e preferencialmente API/rules.

## 17. Classificação A/B/C/D

**B — REUTILIZÁVEL COM PEQUENA GENERALIZAÇÃO**

UI A-like; dados C-like. No conjunto = B (caminho Personal já prova a generalização mínima).

## 18. Recomendação

```text
MANTER PLACEHOLDER POR ENQUANTO
```

Motivo: falta collection Psi, falta hardening ACL, e habilitação prematura reutilizaria catch-all inseguro. Próximo passo só após mini-etapa de generalização + gate.

---

# CALENDÁRIO

## 1. Implementação encontrada

| Portal | UI principal | Consultas clínicas |
|--------|--------------|--------------------|
| Nutri | `ProfissionalCalendarioSection` | Sim — `nutriAvailability` + `/api/metanutri/agenda/*` |
| Personal | `ProfissionalCalendarioSection` | **Não** — sem `consultas`; foco lembretes |
| Médico | `MetaadminCalendario*` / workspace agenda | Sim — `medicoAvailability` + `/api/metaadmin/agenda/*` |
| Psi | `EmptyPanel` | — |

## 2. Componentes

- `components/profissional/ProfissionalCalendarioSection.tsx` — grade mensal, dia, lembretes, opcional consultas, check-in nutricional, hidratação.
- `EditarConsultaCalendarioModal`, `CalendarioDiaDetalheModal`, confirmações.
- Nutri-only flags: `enableWeeklyNutritionCheckIns`, `enableHydrationAdherenceAlerts` + componentes em `components/nutri/checkin-semanal/*`, `hidratacao/*`.
- MetaAdmin: família `components/metaadmin/agenda/*` (paralela, não compartilhada 1:1 com Nutri).

## 3. Services/hooks

**Nutri:** `lib/nutri/agenda/*` (`availabilityService`, `meetingService`, `agendaSettingsService`, …), `nutriAgendaAuthFetch`, `requireNutricionistaMetaNutri`.  
**Médico:** `lib/metaadmin/agenda/*` (espelho com `medicoId`).  
**Personal:** sem stack de meetings; `LembreteService` com `personalTrainerId`.  
**White-label:** `lib/whiteLabel/agenda*` (org) — outra camada.

## 4. Collections (código real)

### Nutri

```text
Collection: nutriAvailability
Documento: slot id (nutriSlotDocId)
Owner: nutricionistaId
Professional ID: nutricionistaId
Professional role: implícito nutricionista
Patient ID: pacienteId? (opcional no tipo)
Organization ID: não no slot
Start/End: date + startTime + endTime (strings locais)
Timezone: UI/helpers usam America/Sao_Paulo (Brasília); settings médico mencionam explicitamente
Status: NutriAvailabilityStatus (+ realizada?, reserved via paciente)
Created by: engine/API com auth nutri
Read/Write gate: API Bearer + requireNutricionistaMetaNutri; ownership check nutricionistaId === auth.uid
```

Relacionadas: `nutriAgendaSettings`, `nutriAvailabilityRules`, `nutriCalendarExceptions`, `nutriConsultaLinks`.

### Médico

```text
Collection: medicoAvailability (+ medicoAgendaSettings, Rules, Exceptions)
Professional ID: medicoId
Gate: require agenda médico (paralelo ao Nutri)
```

### Personal

Sem collection de availability própria no Calendário do portal; eventos = **lembretes**.

### Lembretes (ambos Nutri/Personal)

Collection `lembretes` com `nutricionistaId` **ou** `personalTrainerId` — não genérico.

## 5. APIs

`/api/metanutri/agenda/**` — settings, rules, exceptions, availability CRUD, meetings list/update.  
Todas gated por `requireNutricionistaMetaNutri` (doc `nutricionistas/{authUid}`).

`/api/metaadmin/agenda/**` — espelho médico.

**Não existe** `/api/metapsi/agenda/*`.

## 6. Modelo de evento

Dois conceitos no Calendário Nutri:

1. **Consulta clínica** — slot em `nutriAvailability` com paciente reservado (`pacienteId`, nome, etc.).
2. **Lembrete / compromisso** — `lembretes` (tags, WhatsApp).
3. **Extras Nutri** — check-in semanal nutricional + adesão hidratação (não clínicos Psi).

`ConsultaCalendarioItem.pacienteId` é **opcional** no tipo UI.

## 7. Profissional

Sempre `nutricionistaId` / `medicoId` / (lembrete) `personalTrainerId`.  
`avisoAudience` tipado só como `'nutricionista' | 'personal'` — **sem `psiquiatra`**.

## 8. Paciente

- Em consultas Nutri: associado ao slot; listagens usam `pacientesVisiveis`.
- Não há gate `paciente_psiquiatra` (não existe stack Psi).
- Evento sem paciente: lembretes podem existir; consultas tipicamente com paciente no fluxo de agendamento.

## 9. Organização

Agenda Nutri/Médico não exige `organizationId` no slot; isolamento = ID do profissional.

## 10. ACL/permissões

- **Meetings Nutri:** server-side (token + doc nutri + ownership no update).
- **Lembretes:** client Firestore + catch-all.
- **Personal calendar:** sem meetings API.

Futuro Psi (critério, não implementado): criar/abrir evento com paciente **só** se `paciente_psiquiatra.status === 'ativo'`; histórico pode permanecer se o modelo guardar `pacienteId` sem apagar.

## 11. Consulta × evento

Nutri = **ambos** (consultas + lembretes + features nutri).  
Personal = **evento/compromisso** (lembretes), sem motor de consultas.  
Médico = consultas clínicas paralelas.

## 12. Histórico

Slots/lembretes não são apagados automaticamente ao encerrar vínculo (pelo código de agenda analisado). UI futura Psi pode filtrar novos por ACL e manter leitura histórica — arquitetura **suporta** se não houver hard-delete no end share.

## 13. Comparação Nutri × Personal

| | Nutri | Personal |
|--|-------|----------|
| Section UI | Sim | Sim |
| `consultas` prop | Sim | Não |
| Check-in/hidro | Sim | Não |
| APIs agenda | Sim | Não |
| Lembretes | `nutricionistaId` | `personalTrainerId` |

Mesmo componente; **comportamento divergente** por props.

## 14. Comparação com MetaAdmin

Stacks **duplicados** (medico* vs nutri*), não um módulo único `professionalId`/`professionalRole`. White-label agenda é terceira variante (org).

## 15. Timezone

Helpers `lib/time/brasilTimezone.ts` (`America/Sao_Paulo`). Calendário profissional usa datas locais/`ymdLocal`; confirmação médico cita “horário de Brasília”. Não há timezone por usuário/org no modelo Nutri.

## 16. Chrome visual

Grade mensal, toolbar, busca, cards do dia, modais de edição, Recharts em trechos, mobile com detalhe do dia.  
Psi hoje: placeholder — **não** espelha chrome.

## 17. Mobile

**Parcial:** `isMobile` no section; Nutri tem atalhos para detalhe paciente. Agenda completa é densa (desktop-first com adaptações).

## 18. Segurança

| Pergunta | Achado |
|----------|--------|
| Criar/abrir consulta Nutri sem ser nutri? | Bloqueado na API (`requireNutricionistaMetaNutri`). |
| Lembretes / dados auxiliares | Catch-all — **Requer hardening** se Psi for escrito client-side. |
| Classificação meetings Nutri | **Seguro para o papel nutri** (server gate); **não reutilizável por Psi** sem nova API. |

## 19. Custo de generalização

- Só chrome + lembretes (estilo Personal): **MÉDIO** (audience `psiquiatra` + ACL destinatários).
- Agenda de consultas (espelho nutri/medico): **ALTO** (collections, APIs, settings, WhatsApp, links, ownership).
- Unificar médico+nutri+psi num engine genérico: **ALTO**.

## 20. Classificação A/B/C/D

**C — FORTEMENTE ACOPLADO**

UI parcialmente genérica; dados e features Nutri/Médico fortemente acoplados; Personal já optou por **não** levar consultas.

## 21. Recomendação

```text
MANTER PLACEHOLDER POR ENQUANTO
```

Motivo: consultas exigem stack novo ou fork caro; features Nutri (check-in/hidro) não se aplicam; audience/ACL Psi inexistentes. Não reutilizar APIs MetaNutri.

---

# DECISÃO PARA `/metapsi`

## Financeiro

```text
Classificação: B — REUTILIZÁVEL COM PEQUENA GENERALIZAÇÃO
Recomendação: MANTER PLACEHOLDER POR ENQUANTO
Motivo: UI ProfissionalFinanceiroSection reutilizável; falta collection psi + hardening (rules/API) + gate paciente_psiquiatra
Próxima etapa: 6.3.8A (só se priorizado) — PagamentoService psiquiatra + ACL + (ideal) rules/API
```

## Calendário

```text
Classificação: C — FORTEMENTE ACOPLADO
Recomendação: MANTER PLACEHOLDER POR ENQUANTO
Motivo: consultas = stacks nutri/medico; Personal já usa section sem consultas; Psi precisa ACL própria e não herda check-in nutricional
Próxima etapa: opcional 6.3.8B lembretes-only (Personal-like) OU 6.3.8C agenda clínica completa (ALTO custo) — não agora
```

## Riscos antes de implementação

1. Catch-all Firestore em pagamentos/lembretes.
2. Assumir `docId === authUid` (Nutri agenda usa `nutricionistas/{uid}` — Psi já usa `psiquiatras/{authUid}`, alinhado, mas médico histórico pode divergir).
3. Reutilizar `pagamentos_nutricionista_*` ou APIs `/api/metanutri/agenda` vazaria papel/ACL.
4. Calendário Nutri com check-in nutricional vazaria domínio Nutri no Psi.

## Arquivos que precisariam ser alterados futuramente (não nesta etapa)

- `services/pagamentoService.ts` (+ possivelmente rules/API)
- `app/metapsi/page.v2.tsx` (wiring)
- eventualmente `ProfissionalCalendarioSection` (`avisoAudience` + flags)
- novo `lib/metapsi/agenda/*` + `app/api/metapsi/agenda/*` se consultas
- `LembreteService` / tipos para `psiquiatraId`

## Collections que NÃO devem ser duplicadas indevidamente

- Não reutilizar `pagamentos_nutricionista_paciente` / `pagamentos_personal_trainer_paciente` / `pagamentos_pacientes` como “proxy” Psi.
- Não gravar em `nutriAvailability` / `medicoAvailability`.
- Se Financeiro Psi: **nova** `pagamentos_psiquiatra_paciente` (espelho do padrão Personal).
- Se agenda Psi: **nova** família `psiAvailability*` (ou engine genérico futuro) — não compartilhar slots Nutri.

## Gates que precisariam aceitar `psiquiatra`

- Novo `requirePsiquiatraMetaPsi` (espelho nutri) para qualquer API agenda.
- `hasActivePsiquiatraAccess` / `paciente_psiquiatra` ativo antes de criar evento/pagamento com paciente.
- Possível extensão `avisoAudience` / WhatsApp owner (fora do escopo se WhatsApp Psi continuar fora).

## O que deve permanecer placeholder

- Menu Financeiro e Calendário no `/metapsi` (EmptyPanel atual) até mini-etapas dedicadas.
- Sem ETAPA 7 clínica.

## Sequência recomendada (somente se/quando priorizado)

```text
1. Manter placeholders (agora) — 6.3.8 audit done
2. 6.3.8A — Financeiro Psi: collection + PagamentoService + ACL + hardening
3. 6.3.8B — (opcional) Calendário lembretes-only estilo Personal
4. 6.3.8C — (depois) Agenda clínica Psi com API própria + ACL
5. Não misturar com ETAPA 7
```

Não criar roadmap se produto decidir deixar placeholders longamente — a auditoria justifica **não implementar agora**.

---

## Paridade (separada)

| Dimensão | Financeiro | Calendário |
|----------|------------|------------|
| Visual | Chrome Nutri reutilizável | Chrome parcial; Nutri “cheio” ≠ Personal |
| Funcional | Parcelas/KPI iguais se houver dados | Consultas só Nutri/Médico |
| Dados | Collections por papel | Collections por papel |
| Permissões | Client + catch-all | Meetings server (nutri); lembretes client |

---

## Dependências observadas

- **Charts:** `recharts` (Calendário section)
- **Datas:** `ymdLocal`, `lib/time/brasilTimezone`, `toLocaleDateString('pt-BR')`
- **Moeda:** `toLocaleString('pt-BR')` inline
- **Calendar lib dedicada:** não (grade custom React)

---

## Status

**ETAPA 6.3.8 CONCLUÍDA — auditoria de Financeiro e Calendário finalizada; nenhuma implementação funcional realizada**
