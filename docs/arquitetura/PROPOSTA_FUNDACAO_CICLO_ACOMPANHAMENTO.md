# Proposta de fundação — Ciclo / Relação de acompanhamento (Patient Care Relationship)

**Data:** 2026-07-14  
**Escopo:** somente arquitetura e documentação.  
**Fora de escopo:** código, coleções, migrations, writes, rules, interfaces runtime, UI, transferência.  
**Base:** [`AUDITORIA_REGISTROS_PACIENTE_MULTI_ORGANIZACAO.md`](./AUDITORIA_REGISTROS_PACIENTE_MULTI_ORGANIZACAO.md).

---

## 1. Resumo executivo

O Oftware hoje trata o paciente como **um dossiê global** (`pacientes_completos/{id}`) emprestado a **um médico por vez** via `medicoResponsavelId`, com `organizationId` apenas sombra. Não há histórico formal de “com quem / em qual org / em qual período” a relação assistencial existiu — só rastros parciais (`medicoResponsavelAnteriorId` no abandono, `historicoConclusoesTratamento` clínico, carimbos em satélites).

O conceito de **relação de acompanhamento** (*Patient Care Relationship* / *care cycle*) é **adequado** como fundação futura: separa a **identidade da pessoa** da **relação assistencial–contratual–comercial** com um médico (e, progressivamente, uma organização), sem exigir que o prontuário longitudinal seja fatiado agora.

Para **não alterar nenhum comportamento atual**, a fundação deve nascer como:

```text
DOCUMENTAÇÃO → (futuro) WRITE SHADOW observacional → dual-read opcional → source of truth
```

Nesta fase: **apenas documentação**. `medicoResponsavelId` e o restante do sistema **continuam mandando**. O ciclo **não** é ACL, **não** alimenta `getPacientesByMedico`, financeiro, depoimentos nem portal.

**Recomendação final (§20):** aprovar o *conceito* e esta nomenclatura/modelo mínimo; **não implementar** a coleção ainda até fechar as perguntas abertas (§19), sobretudo troca interna na mesma org e ownership financeiro.

---

## 2. Diagnóstico baseado na auditoria

Da auditoria:

| Achado | Implicação para o ciclo |
|--------|-------------------------|
| 1 paciente ↔ 1 `medicoResponsavelId` operacional | Ciclo modela o que o campo *não* guarda: histórico de relações |
| `organizationId` sombra, queries clínicas não filtram | Ciclo não pode assumir org como ACL já existente |
| Accept reatribui médico sem cascade | Transferência informal apaga rastro; ciclo precisaria registrar *depois* |
| Financeiro sem `medicoId` | Ciclo **sozinho** não resolve caixa; só ancora futuro |
| Depoimentos filtrados pelo responsável **atual** | Sem âncora de ciclo/médico emissor, marketing “muda de dono” |
| Contratos com `medicoId` sob o paciente | Relação legal já carimba médico; ciclo deve referenciar, não duplicar PDF |
| Rules abertas | Ciclo **nunca** deve ser usado como ACL antes de rules reais |
| Abandono move coleção; conclusão mantém médico | Encerramentos clínicos ≠ necessariamente “fim de relação de ownership” |

Referências: `types/obesidade.ts`, `services/pacienteService.ts`, `app/api/depoimentos-medico/route.ts`, `types/pagamento.ts`, `lib/documentos/contrato-tratamento/contratoTratamentoTypes.ts`, `firestore.rules`.

---

## 3. Definição — Paciente versus ciclo

### Diferenças

| Conceito | O que é | O que **não** é |
|----------|---------|-----------------|
| **Paciente** | Identidade + dossiê longitudinal (`pacientes_completos` / abandono) | Uma assinatura comercial; um médico |
| **Ciclo / relação de acompanhamento** | Período em que paciente + médico (principal) + org formam uma relação assistencial rastreável | Cópia do prontuário; o campo `medicoResponsavelId` |
| **Contrato** | Documento jurídico assinado (`.../documentos`) com `medicoId`+`pacienteId` | O ciclo em si; pode haver 0..N por ciclo |
| **Plano terapêutico** | Esquema clínico no paciente (`planoTerapeutico`, doses, metas) | Relação comercial completa; pode atravessar conclusões/renovações no modelo atual |
| **Organização** | Tenant lógico (registry + sombra); ainda fraco no ACL clínico | Substituto do médico responsável hoje |
| **Médico responsável** | Apontador operacional atual no dossiê | Histórico completo; ownership financeiro |
| **Transferência** | Evento futuro que **encerra** um ciclo e **abre** outro (política de dados) | Sinônimo de ciclo; o ciclo é o artefato, a transferência é o motivo/evento |

### Respostas amarradas ao modelo atual

| Pergunta | Resposta proposta | Fundamentação no atual |
|----------|-------------------|------------------------|
| Paciente continua global? | **Sim.** Um login, um dossiê canônico (idealmente um doc por pessoa). | Upsert por `userId`/`email`; portal por email; audit: pessoa-plataforma |
| Ciclo = relação médico–paciente? | **Sim, com médico principal obrigatório** na fundação. | Operação hoje é 100% médico-cêntrica (`medicoResponsavelId`) |
| Ciclo = relação org–paciente? | **Também carrega `organizationId`**, mas a org **não** substitui o médico na fundação. | Org sombra; listagens por médico, não por org |
| Um ciclo com mais de um médico? | **Não na fundação.** Um `primaryDoctorId`. Outros profissionais = participantes futuros, não “segundo responsável”. | Sistema não tem co-responsáveis clínicos |
| Mais de um ciclo **ativo**? | **Não** no mesmo escopo (mesmo paciente). No máximo um `ACTIVE`. | Espelha a invariável atual de um responsável |
| Ciclos diferentes na mesma org? | **Sim** (ex.: A→B na mesma org, ou reabertura anos depois). | Accept na mesma org já “rouba” paciente sem rastro; ciclo cria rastro |
| Troca de médico na mesma org cria novo ciclo? | **Recomendação: sim** (fecha o anterior, abre novo). | Ownership de contrato/Rx/depoimento é médico-carimbado; manter o mesmo ciclo e só editar `primaryDoctorId` apaga a linhagem e repete o bug da reatribuição |
| Mudança entre orgs sempre cria novo ciclo? | **Sim.** | Mudança de tenant comercial/assistencial |
| Conclusão encerra o ciclo? | **Não automaticamente.** Hoje conclusão mantém `medicoResponsavelId` e lista o paciente. | `statusTratamento: 'concluido'` ≠ desvínculo |
| Abandono encerra o ciclo? | **Sim (fecha com motivo ABANDONED).** | `moverParaAbandono` zera médico e move coleção |
| Alta encerra o ciclo? | Se “alta” = conclusão clínica, **não** necessariamente a relação. Se “alta” = desligamento assistencial, **sim**. | Distinguir `statusTratamento` de ownership da relação |
| Renovação de tratamento? | **Continua o mesmo ciclo** se mesmo médico+org e relação comercial/assistencial contínua; novo ciclo só se houver **troca de médico/org** ou **reabertura após encerramento formal da relação**. | `historicoConclusoesTratamento` já prevê múltiplos ciclos clínicos *dentro* do mesmo vínculo médico |

```text
Paciente global (login + dossiê)
│
├── Ciclo 1 — CLOSED (endReason: ABANDONED ou COMPLETED_RELATIONSHIP…)
│   ├── organizationId: metodo
│   └── primaryDoctorId: medicoA
│
└── Ciclo 2 — ACTIVE
    ├── organizationId: clinica_x
    └── primaryDoctorId: medicoB
```

---

## 4. Nomenclatura recomendada

### Avaliação das opções

| Opção | Prós | Contras |
|-------|------|---------|
| `patient_care_cycles` | Familiar “ciclo” | “Cycle” ambíguo com ciclo clínico de dose/conclusão já existente no produto |
| `patient_care_relationships` | Clara relação assistencial; multi-especialidade | Nome longo |
| `patient_treatment_cycles` | — | “Treatment” parece protocolo medicamentoso / emagrecimento |
| `patient_treatment_relationships` | — | Idem |
| `acompanhamentos_paciente` | PT claro na UI | Mistura PT na coleção; inconsistente com docs técnicos em EN |
| `vinculos_assistenciais` | Preciso | “Vínculo” colide com nutri/personal já chamados vínculo |
| `ciclos_tratamento` | — | Colide com conclusão/ciclos terapêuticos |

### Recomendação

| Uso | Nome |
|-----|------|
| Coleção técnica (Firestore, futuro) | `patient_care_relationships` |
| Tipo TypeScript (futuro) | `PatientCareRelationship` |
| Interface (PT-BR) | **Acompanhamento** (plural: Acompanhamentos) |
| Documentação | Relação de acompanhamento / Patient Care Relationship |
| Alias informal | “care relationship” (evitar “care cycle” em docs técnicos para não colidir com ciclo de conclusão) |

### Campos de referência (nomes)

| Campo | Nome recomendado | Nota |
|-------|------------------|------|
| Id do paciente | `patientId` | Alinhar satélites novos; no legado PT continua `pacienteId` |
| Médico principal | `primaryDoctorId` | Evitar só `doctorId` ambíguo com sessão WA; espelha responsabilidade |
| Organização | `organizationId` | Já usado em sombra/automações |
| Ciclo anterior/próximo | `previousRelationshipId` / `nextRelationshipId` | Encadeamento opcional |
| Ref. no satélite futuro | `careRelationshipId` | Nome estável cross-módulo |

**Não** usar `medicoResponsavelId` dentro do documento do ciclo — esse nome permanece exclusivo do dossiê paciente (fonte operacional atual).

---

## 5. Modelo mínimo

### Campos classificados

| Campo | Classificação | Motivo |
|-------|---------------|--------|
| `id` | obrigatório | Doc id |
| `patientId` | obrigatório | Âncora pessoa |
| `primaryDoctorId` | obrigatório *quando ACTIVE e quando backfill tiver médico* | Espelha modelo médico-cêntrico; null só em CLOSED legado sem médico |
| `organizationId` | obrigatório na fundação (com default explícito `'metodo'` no backfill conceitual) | Preparar multi-org; hoje sombra |
| `status` | obrigatório | `ACTIVE` \| `CLOSED` |
| `startedAt` | obrigatório | Início da relação |
| `endedAt` | obrigatório se CLOSED | |
| `endReason` | útil na fundação se CLOSED | Evita status explosivo |
| `createdAt` / `updatedAt` | obrigatório | Auditoria mínima |
| `source` | útil posteriormente / útil já no backfill | `RUNTIME` \| `LEGACY_BACKFILL` \| `SOLICITACAO` \| … |
| `createdBy` | útil posteriormente | uid/email/admin |
| `startReason` | útil posteriormente | `ACCEPT` \| `CREATE` \| `TRANSFER_IN` \| … |
| `previousRelationshipId` / `nextRelationshipId` | útil posteriormente | Encadeamento de transferência |
| `legacyBackfill` | útil posteriormente | Metadados de qualidade do backfill |
| `current` / `active` boolean | **perigoso** | Duplica `status === 'ACTIVE'`; risco de drift |
| `contractIds[]` | **perigoso** | Duplica fonte; contrato deve apontar para o ciclo |
| `transferId` | útil posteriormente | Só quando existir evento de transferência |
| Valores, parcelas, depoimento texto | **desnecessário / perigoso** | Não misturar financeiro/marketing no ciclo |
| Lista de profissionais | desnecessário na fundação | Participantes futuros |

### Modelo mínimo recomendado (conceitual — não implementar)

```ts
// Conceito apenas — não criar types/ no repositório nesta fase
type PatientCareRelationshipStatus = 'ACTIVE' | 'CLOSED';

type PatientCareRelationshipEndReason =
  | 'ABANDONED'
  | 'UNLINKED'
  | 'COMPLETED_RELATIONSHIP' // desligamento assistencial explícito (≠ só statusTratamento concluido)
  | 'TRANSFERRED'
  | 'REPLACED_PRIMARY_DOCTOR' // troca interna / accept que reatribui
  | 'ORG_CHANGED'
  | 'UNKNOWN_LEGACY';

interface PatientCareRelationship {
  id: string;
  patientId: string;
  primaryDoctorId: string | null;
  organizationId: string;
  status: PatientCareRelationshipStatus;
  startedAt: Timestamp;
  endedAt: Timestamp | null;
  endReason: PatientCareRelationshipEndReason | null;
  source: 'LEGACY_BACKFILL' | 'RUNTIME' | 'UNKNOWN';
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

Manter o documento **pequeno**. Extensões (`participants`, `transferId`, `startReason`) em fases seguintes.

---

## 6. Fonte da verdade por fase

| Informação | Fonte atual | Fase fundação (shadow) | Fase futura possível |
|------------|-------------|------------------------|----------------------|
| Médico responsável atual | `pacientes_completos.medicoResponsavelId` (+ legado) | **Continua o paciente** | Ciclo `ACTIVE.primaryDoctorId` sincronizado *depois* |
| Organização atual | sombra `organizationId` / defaults `metodo` | **Continua o paciente** (mesmo fraco) | Ciclo ACTIVE + membership médico |
| Histórico de médicos | quase inexistente (`medicoResponsavelAnteriorId` parcial) | Ciclos CLOSED + ACTIVE | ciclos |
| Histórico de orgs | inexistente | ciclos | ciclos |
| Início do acompanhamento | implícito (`dataCadastro`, accept) | ciclo `startedAt` (observacional) | ciclo |
| Encerramento relação | abandono/desvínculo; conclusão **não** desliga | ciclo CLOSED + `endReason` | ciclo |
| Motivo | `motivoAbandono`, UI | `endReason` (+ detalhe futuro) | ciclo |

### Regra explícita — Fase inicial

```text
FASE 0 (agora): apenas documentação.
FASE 1 (futuro imediato de código, se aprovado): WRITE SHADOW.
  - medicoResponsavelId e organizationId do paciente continuam sendo a fonte OPERACIONAL.
  - O ciclo é HISTÓRICO / OBSERVACIONAL.
  - Nenhuma query de produto depende do ciclo.
  - Divergência ciclo ACTIVE vs paciente.medicoResponsavelId = relatório, não auto-correção.
```

### Como impedir inconsistência **sem** sincronização

1. **Invariante documental:** em Fase 1, o ciclo ACTIVE é *derivado* do paciente, nunca o contrário.
2. **Proibir** writes que “corrigem” `medicoResponsavelId` a partir do ciclo.
3. Job/relatório `validatePatientCareRelationshipConsistency()` emite alerta se:
   - há 0 ou >1 ACTIVE por `patientId`;
   - ACTIVE.primaryDoctorId ≠ paciente.medicoResponsavelId (normalizando grafias legado);
   - ACTIVE.organizationId ≠ paciente.organizationId (quando ambos existem).
4. **Não** confiar no ciclo para ACL até rules + fonte invertida (fase posterior).

---

## 7. Máquina de estados

### Opção A — muitos status (`ACTIVE`, `COMPLETED`, `ABANDONED`, `TRANSFERRED`, …)

Simples na aparência; ambígua na prática (`COMPLETED` clínico vs contratual; `TRANSFERRED` é evento).

### Opção B (recomendada) — status binário + motivo

```text
status: ACTIVE | CLOSED
endReason: ABANDONED | UNLINKED | COMPLETED_RELATIONSHIP | TRANSFERRED
         | REPLACED_PRIMARY_DOCTOR | ORG_CHANGED | UNKNOWN_LEGACY | null
```

| Estado | Na fundação? | Notas |
|--------|--------------|-------|
| `ACTIVE` | sim | |
| `CLOSED` + `ABANDONED` | sim | Alinha abandono atual |
| `CLOSED` + `UNLINKED` | sim | Alinha `desvincularPacienteDoMedico` |
| `CLOSED` + `COMPLETED_RELATIONSHIP` | útil | Só quando a *relação* for encerrada; **não** = automático em `statusTratamento: concluido` |
| `CLOSED` + `TRANSFERRED` | só quando transferência existir | Preferir **motivo**, não status irmão |
| `PENDING` | adiar | Solicitação já vive em `solicitacoes_medico` |
| `ARCHIVED` / `CANCELLED` | adiar | Redundantes com CLOSED + motivo |
| `TRANSFERRED` como status | evitar | É `endReason` |

**Reativação:** não reabrir o mesmo doc. **Novo** `ACTIVE` + `previousRelationshipId` apontando ao CLOSED. Evita reescrever histórico.

**Conclusão clínica (`concluido`):** ciclo pode permanecer `ACTIVE` (como o médico permanece na lista hoje). Encerrar relação é ato explícito futuro (ou abandono/desvínculo/transferência).

---

## 8. Compatibilidade com módulos atuais

| Módulo | Depende do ciclo na fundação? | Pode usar futuramente? | Classificação | Risco |
|--------|------------------------------:|-----------------------:|---------------|-------|
| `getPacientesByMedico` | Não | Filtro por ciclo ACTIVE (fase SoT) | Nenhuma alteração na fundação | Usar cedo demais quebra lista |
| Portal `/meta` | Não | Histórico de acompanhamentos | Nenhuma alteração / leitura futura opcional | — |
| MetaAdmin | Não | Badge “desde…”, timeline relações | Leitura futura opcional | — |
| MetaAdminGeral | Não | Auditoria/backfill/divergências | Leitura futura opcional | — |
| Prontuário | Não | Stamp `careRelationshipId` em eventos novos | Adaptação antes da transferência | Inferência por período em legado |
| Exames | Não | Autoria + ciclo em solicitações | Adaptação antes da transferência | — |
| Aplicações / plano | Não | Contexto de relação | Não deve *depender* do ciclo para derivar doses | — |
| Prescrições | Não | Filtro/ownership por ciclo | Adaptação antes da transferência | Já tem `medicoId` |
| Contratos | Não | Campo `careRelationshipId` no doc | Adaptação antes da transferência | Não espelhar IDs no ciclo |
| Financeiro | Não | Conta por ciclo | **Obrigatório resolver antes de transferência real** | Herança indevida atual |
| Depoimentos | Não | Filtrar por médico/ciclo congelado | Adaptação antes da transferência | Bug marketing na reatribuição |
| Agenda / lembretes | Não | Lembretes por relação | Adaptação parcial | Lembretes já médico-scoped |
| WhatsApp / e-mail | Não | Rebuild keyed por relação | Adaptação antes da transferência | Filas com `doctorId` |
| Nutri / personal | Não | Participantes ou fim de share | Adaptação na transferência | Shares sobrevivem hoje |
| CRM / leads | Não | Permanece do captador | **Não deve depender do ciclo** para owning do lead | — |
| Relatórios | Não | Séries por relação | Leitura futura | — |
| Arquivos / Storage | Não | Path continua paciente | Nenhuma alteração | Paths ok |

**Regra:** a fundação **não** exige `careRelationshipId` em nenhum módulo.

---

## 9. Estratégia conceitual de legado (não implementar)

Backfill futuro conceitual (idempotente): um `ACTIVE` ou `CLOSED` por paciente “principal”, `source: LEGACY_BACKFILL`.

### Matriz de casos

| Caso | Backfill automático? | Revisão? | Sugestão conceitual |
|------|---------------------:|----------|---------------------|
| Em tratamento + médico válido + org presente/ausente | Sim | — | ACTIVE; org default `metodo` se ausente |
| Concluído + médico ainda setado | Sim | Opcional | ACTIVE (espelha lista atual) **ou** CLOSED se política futura divergir — **abrir pergunta de produto** |
| Desvinculado (`medicoResponsavelId` null) em `completos` | Sim | — | CLOSED `UNLINKED`; `primaryDoctorId` null ou último conhecido se existir rastro |
| Em `pacientes_abandono` | Sim | — | CLOSED `ABANDONED`; usar `medicoResponsavelAnteriorId` |
| Grafia `medicoResponsavelID` | Sim (normalizar na leitura) | — | |
| Sem organizationId | Sim | — | `metodo` + flag `legacyBackfill.orgInferred` |
| Médico inexistente / órfão | Não pleno | **Sim** | CLOSED `UNKNOWN_LEGACY` ou ACTIVE com doctor null + alerta |
| userId/email duplicados | Não | **Sim** | Não inventar um ciclo por documento cego sem consolidar identidade |
| org não migrada / WL incompleto | Parcial | **Sim** | Preferir org do médico se resolvível (`resolveMedicoOrganizationId`), senão `metodo` + alerta |
| Sem médico e não abandono | Sim cauteloso | Preferível | CLOSED ou ACTIVE sem doctor **proibido** se ACTIVE — preferir CLOSED |

**Idempotência conceitual:** id determinístico do backfill, ex. `legacy_{patientId}_v1`, para não duplicar em reexecução.

---

## 10. Mesma organização versus organizações diferentes

### Troca interna (A→B, mesma org)

| Opção | Avaliação |
|-------|-----------|
| Só editar `primaryDoctorId` no mesmo ciclo | **Rejeitada para fundação.** Apaga linhagem; contratos/Rx/depoimentos do A ficam sem âncora de período; replica o accept atual |
| Fechar ciclo A + abrir ciclo B (`REPLACED_PRIMARY_DOCTOR`) | **Recomendada.** Histórico claro; pronto para ownership futuro |
| Financeiro/contratos mudam automaticamente? | **Não.** Continuam carimbados; política de *visão* é fase posterior |

### Mudança entre organizações (orgA+A → orgB+B)

- Sempre **fecha** + **abre** (`ORG_CHANGED` / `TRANSFERRED`).
- Contratos e financeiro **não migram** por si; ciclo novo não herda arrays.
- Autoria clínica histórica permanece no dossiê do paciente; **leitura** cross-ciclo é política (recomendação §12).

### Regra consistente

```text
Qualquer mudança de primaryDoctorId OU organizationId operacional
⇒ encerra o ciclo ACTIVE e cria um novo ACTIVE.
Nunca “patch” silencioso do médico principal no mesmo documento ACTIVE.
```

Risco de permitir edição in-place: inconsistência irrecuperável entre carimbos satélites e cabeçalho do ciclo.

---

## 11. Relação com contrato

Com base em `ContratoTratamentoDocumentoRecord` (`medicoId`, `pacienteId`, status de assinatura, hashes/PDFs):

| Pergunta | Recomendação |
|----------|--------------|
| Um ciclo pode ter vários contratos? | **Sim** (rascunho, vigente, renovação, aditivo) |
| Contrato aponta para ciclo? | **Sim, futuramente** via `careRelationshipId` opcional |
| Ciclo armazena `contractIds`? | **Não** (anti-duplicação) |
| Renovação / aditivos | Novos docs de contrato; mesmo ciclo se relação ACTIVE |
| Contrato não assinado | Pode existir sob o ciclo; **não** bloquear existência do ciclo |
| Ciclo antes da assinatura? | **Sim** — hoje accept/create não exigem contrato assinado |
| Assinatura condição para novo ciclo? | **Não na fundação.** Poderá ser regra de *transferência* por org, não do modelo base |

Direção segura: **relação 1:N ciclo→contratos na navegação; 1:1 opcional contrato→ciclo no documento do contrato.**

---

## 12. Relação com prontuário

- Prontuário **permanece do paciente** (monólito + subcols).
- Fundão **não** copia nem parte o prontuário.
- Futuro: novos eventos/exames/Rx podem receber `careRelationshipId` + conservar `authorDoctorId` / org.
- Legado: inferência por `startedAt`/`endedAt` do ciclo (aproximada; declarar incerteza).
- Leitura: paciente vê todos os ciclos; médico do ciclo ACTIVE lê histórico clínico necessário (política futura); médico de ciclo CLOSED **não** lê registros *futuros* após `endedAt` (política futura — não implementada).
- Ciclo adiciona **contexto e autoria**, não storage clínico.

---

## 13. Relação com financeiro

- Fundação do ciclo **não muda** `pagamentos_pacientes`.
- Futuro desejável: ledger com `careRelationshipId` (e/ou conta financeira 1:1 com ciclo) para impedir herança na lista do novo médico.
- Ciclo **nunca** deve guardar valores/parcelas/status de pagamento.
- Legado: permanece 1 doc por `pacienteId` até projeto de ownership dedicado.
- **Obrigatório antes de transferência real:** ownership financeiro ≠ lista por `medicoResponsavelId`; senão B herda caixa (auditoria §E/F).

---

## 14. Relação com depoimentos

Hoje: texto no paciente + API `where medicoResponsavelId == medicoId` (+ classificação `pacienteId_medico_{medicoId}`).

| Âncora | Papel |
|--------|-------|
| Paciente | Autor da mensagem / titular dos dados |
| Médico (emissor da relação) | Destinatário de marketing / reputação |
| Ciclo | Congela *em qual relação* o depoimento foi gerado |
| Org | Branding secundário |
| Autorização de imagem/marketing | Flag/consentimento separado |

Futuro mínimo: `careRelationshipId` + `doctorId` no momento da conclusão (imutáveis). API deixa de usar só o responsável **atual**. Fundação **não** altera a API.

---

## 15. Relação com equipe multidisciplinar

- Ciclo: **um** `primaryDoctorId`.
- Participantes (nutri, personal, psicologia…): **fase posterior** (subcoleção ou docs de share com `careRelationshipId`).
- Vínculos atuais (`paciente_nutricionista`, etc.) **permanecem intactos** na fundação.
- Se transferência automática deve encerrar shares: **decisão de produto na feature de transferência**, não na fundação.
- Fundão **não** precisa resolver equipe agora.

---

## 16. Riscos e mitigações

| Risco | Mitigação |
|-------|-----------|
| Duas fontes de verdade | Fase shadow: paciente manda; ciclo deriva; sem dual-write “corrigindo” paciente |
| Ciclo ACTIVE ≠ médico do paciente | Relatório de divergência; sem auto-fix |
| Backfill incorreto | Idempotência; casos órfãos/duplicados em quarentena |
| Pacientes duplicados | Backfill só após política de merge; senão um ciclo por doc + alerta de identidade |
| Ciclo sem médico ACTIVE | Invariante: ACTIVE exige `primaryDoctorId` (exceto proibido — forçar CLOSED) |
| Org errada (`metodo` default) | Flag `orgInferred`; resolução via médico quando possível |
| Módulos adotam ciclo cedo e desigual | Feature flag + checklist §17; ban em PR de queries de produto na fase 1 |
| Queries/índices/custo Firestore | Sem índices extras até shadow write; coleção só escrita event-driven |
| Abstração abandonada | Só implementar shadow após §19 fechado e flag off by default |
| Uso como ACL com rules abertas | Explicitamente proibido até `firestore.rules` por ownership |

---

## 17. Progressão documental → source of truth

```text
0. DOCUMENTATION ONLY          ← estamos aqui
1. WRITE SHADOW                ciclo gravado em eventos espelho; flag OFF default
2. SHADOW READ (admin only)    MAG vê histórico/divergências; produto não
3. DUAL READ (opt-in org)      UI secundária; paciente/lista ainda por medicoResponsavelId
4. SOURCE OF TRUTH             medicoResponsavelId derivado do ACTIVE (ou dual-write controlado)
5. TRANSFER FEATURE            endReason TRANSFERRED + políticas de dados
```

Comparativo:

| Modo | Writes ciclo | Reads produto | Risco |
|------|--------------|---------------|-------|
| documentation only | não | não | Zero runtime |
| shadow read | não | admin | Zero se não houver dados |
| **shadow write** | sim, espelho | não | Drift se eventos incompletos — mitigar com validator |
| dual read | sim | parcial | Inconsistência UX |
| source of truth | sim | sim | Só após invariantes + rules |

**Recomendação de progressão:** 0 → 1 → 2 → (pausar para ownership financeiro/depoimento) → 3 → 4 → 5.

---

## 18. Critérios de aprovação e rejeição

### Aprovar a fundação *conceitual* (este doc) se

- [x] Não exige alterar queries/acesso/financeiro/contratos/portal atuais.
- [x] Modelo mínimo &lt; ~12 campos essenciais.
- [x] Um ACTIVE por paciente (invariante clara).
- [x] Status binário + endReason.
- [x] Paciente permanece global.
- [x] Nomenclatura multi-especialidade.
- [x] Shadow-only como primeira fase de código possível.
- [x] Backfill conceitual idempotente e com quarentena.

### Rejeitar implementação de código se

- Qualquer PR fizer produto depender do ciclo antes da fase SoT.
- Houver dual-write “corrigindo” `medicoResponsavelId` a partir do ciclo.
- Ciclo incluir arrays financeiros/contratuais/depoimento.
- ACTIVE sem médico for permitido.
- Troca de médico editar in-place o mesmo ACTIVE.
- Ciclo for citado como ACL com rules atuais.
- Transferência for acoplada na mesma entrega da fundação.

### Critérios para aprovar *implementação* da coleção (fase 1)

- Perguntas §19 mínimas respondidas (itens A–D).
- Flag `PATIENT_CARE_RELATIONSHIPS_ENABLED` (ou por org) default false.
- Validator server-side sem writes corretivos.
- Zero mudança em `getPacientesByMedico`, depoimentos API, pagamentos.

---

## 19. Perguntas ainda abertas

| ID | Pergunta | Impacto |
|----|----------|---------|
| A | Em `statusTratamento: concluido`, o backfill cria ACTIVE ou CLOSED? | Legado em massa |
| B | Desvínculo vs abandono: mensagens de `endReason` na UI | Vocabulário |
| C | Troca interna A→B: sempre novo ciclo? (doc recomenda sim — precisa buy-in) | Modelo |
| D | Quem pode fechar relação sem abandono (alta administrativa)? | MAG / médico |
| E | Paciente vê histórico de ciclos na V1 de UI? | Portal |
| F | Médico CLOSED lê prontuário pós-`endedAt`? | Privacidade |
| G | Shares nutri/personal ao transferir | Equipe |
| H | Consolidação de pacientes duplicados antes do backfill? | Dados |
| I | `organizationId` do ciclo: sempre do paciente, sempre do médico, ou fail-closed? | Multi-org |

---

## 20. Funções conceituais futuras (não implementar)

```ts
// Server-preferred: Admin SDK, só leitura
resolveCurrentPatientCareRelationship(patientId): Relationship | null
  // Entrada: patientId
  // Saída: ciclo ACTIVE se existir e flag/shadow permitir; senão null
  // Fase 1: NÃO substitui leitura de medicoResponsavelId
  // Writes: nunca

validatePatientCareRelationshipConsistency(patientId | 'ALL'): ConsistencyReport
  // Detecta: 0/>1 ACTIVE; drift doctor/org; médico inexistente; CLOSED sem endedAt
  // Server-side; writes: nunca (só report)

getPatientCareRelationshipHistory(patientId): Relationship[]
  // Ordenado por startedAt; server ou client autenticado depois de ACL real
  // Writes: nunca

previewLegacyCareRelationshipBackfill(patientId | sample): PreviewRow[]
  // Dry-run: mostraria docs LEGACY_BACKFILL; nunca escreve nesta função
  // Marca AUTO vs REVIEW_REQUIRED
```

---

## 21. Critérios — matriz fechad (sintese módulos)

Ver §8. Em uma linha: **na fundação, nenhum módulo depende do ciclo; quase todos podem *ancorar* ownership depois; financeiro, depoimentos e WA/CRM são os maiores riscos se saltarem etapas.**

---

## 22. Recomendação final

| Decisão | Veredito |
|---------|----------|
| O conceito é adequado? | **Sim** |
| Nomenclatura | `patient_care_relationships` / `PatientCareRelationship` / UI “Acompanhamento” |
| Modelo mínimo | patientId + primaryDoctorId + organizationId + status ACTIVE\|CLOSED + datas + endReason + source + timestamps |
| Fonte da verdade inicial | **Paciente operacional; ciclo observacional** |
| Implementar coleção **agora**? | **Não** |
| Próximo passo | Fechar §19 (A–D); depois PR isolado de shadow write + validator, flag off, zero leitura em produto |

A fundação documental está pronta para alinhamento de produto. Implementar cedo demais, antes de ownership financeiro/depoimento e da regra “novo ciclo a cada troca de médico”, recria a reatribuição silenciosa que a auditoria já apontou — só que com uma coleção a mais para divergir.

---

*Documento exclusivamente arquitetural. Nenhum artefato de runtime foi criado ou alterado.*
