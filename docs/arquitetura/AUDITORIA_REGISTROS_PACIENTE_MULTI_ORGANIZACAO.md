# Auditoria técnica — registros de paciente e multi-organização

**Data:** 2026-07-13  
**Escopo:** somente investigação e documentação do comportamento atual.  
**Fora de escopo:** implementação de transferência, migração, alteração de campos/coleções/regras, correções.

**Método:** leitura de tipos, serviços, rotas, componentes, `firestore.rules` e playbooks. Nenhuma escrita no Firestore. Conclusões citam arquivos; quando algo não foi possível confirmar no código, está em **§G Incertezas**.

---

## A. Resumo executivo

Hoje o paciente clínico vive em um documento monolítico `pacientes_completos/{pacienteId}`. O vínculo operacional com o médico é **um único campo**: `medicoResponsavelId` (com grafias legado). A organização existe como **campo sombra** `organizationId` (quase sempre `'metodo'`), gravado em creates, **sem filtro nas listagens clínicas**.

Não existe feature de “transferência de paciente”. O que existe é:

1. **Aceitar solicitação** no MetaAdmin → pode sobrescrever `medicoResponsavelId` para o médico logado.
2. **Desvincular** → zera o médico no mesmo documento.
3. **Abandono** → copia o doc para `pacientes_abandono/{id}`, zera médico e remove de `pacientes_completos`.

A maior parte do prontuário, exames, plano, evoluções, fotos e bioimpedância **está dentro do documento (ou subcoleções sob o mesmo id)**. Quem “vê” o paciente nas listas de MetaAdmin é quem bathe em `where('medicoResponsavelId','==',medicoId)`.

Já financeiro (`pagamentos_pacientes`), prescrições, lembretes, filas WhatsApp, CRM/leads e vários vínculos nutri/personal usam **outras chaves** (`pacienteId`, `medicoId`, `doctorId`, ids compostos). Uma troca simples só do responsável (e/ou `organizationId`) **não alinha esses satélites**.

Nas regras Firestore, qualquer usuário autenticado tem R/W amplo (catch-all). Isolamento médico/paciente é **camada de app** (parcial) e **UX de query**, não ACL de banco.

Em linguagem simples: o paciente é um dossiê único “do Método/plataforma”, emprestado a um médico por vez; organização ainda não é fronteira real de acesso clínico.

---

## B. Diagrama atual

```text
Auth (Firebase)
 ├─ Paciente: uid ↔ pacientes_completos.userId (e/ou email)
 ├─ Médico:   uid ↔ medicos.userId → medicos/{medicoId}
 └─ Nutri/Personal: docs próprios + tabelas de vínculo

pacientes_completos/{pacienteId}          ← CADASTRO PRINCIPAL (pessoa/dossiê clínico)
 ├── medicoResponsavelId ─────────────────► medicos/{medicoId}     [1 médico ativo]
 ├── organizationId (shadow, create) ─────► registry estático 'metodo' (não filtra lista)
 ├── status / statusTratamento
 ├── dadosIdentificacao / dadosClinicos / estiloVida
 ├── examesLaboratoriais[] / examesDeImagem[]
 ├── planoTerapeutico (+ conclusaoTratamento.depoimento)
 ├── evolucaoSeguimento[] / marcoZero / alertas / indicadores
 ├── bioimpedanciaRegistros (runtime)
 ├── timeline/{eventoId}                   [sub]
 ├── nutricao/...                            [sub]
 ├── progressPhotos / progressPhotoPreferences [sub]
 ├── solicitacoesExames/{id}               [sub]  ← grava medicoId do solicitante
 ├── documentos/{id}                       [sub]  ← contratos; medicoId no doc
 └── orcamentosTerapeuticos/{id}          [sub]  ← comercial; medicoId + org shadow

Coleções irmãs (não ficam “dentro” do paciente):
 ├── pagamentos_pacientes/{pacienteId}     [sem medicoId tipado]
 ├── prescricoes/{id}                      [medicoId obrigatório + pacienteId?]
 ├── lembretes/{id}                        [medicoId + pacienteId]
 ├── aplicacao_links/{token}               [pacienteId; sem medicoId]
 ├── conclusao_links/{token}               [pacienteId + medicoId]
 ├── relatorio_paciente_links/{token}      [pacienteId]
 ├── classificacao_profissionais/{pacienteId}_medico_{medicoId}
 ├── leads_medico / solicitacoes_medico / indicacoes   [medicoId dono]
 ├── paciente_nutricionista / paciente_personal_trainer
 ├── whatsapp_automation_queue             [doctorId + patientId + organizationId]
 ├── whatsapp_auto_aplicacao_envios        [id medicoId_pacienteId_...]
 ├── email_automation_queue                [lead-centric; organizationId]
 └── vendas_avulsas                       [medicoId — sem paciente]

Abandono:
 └── pacientes_abandono/{pacienteId}      (cópia; medicoResponsavelId null)
```

**Onde o vínculo realmente existe**

| Relação | Campo / mecanismo |
|--------|-------------------|
| Paciente ↔ médico ativo | `pacientes_completos.medicoResponsavelId` |
| Paciente ↔ org | `organizationId` sombra + (aspiracional) playbooks; **queries clínicas não usam** |
| Médico ↔ org | runtime `medicos.organizationId` / membership Método; registry estático |
| Financeiro ↔ paciente | doc id = `pacienteId` |
| Prescrição ↔ médico | `prescricoes.medicoId` |
| Depoimento público | filtro `where medicoResponsavelId == medicoId` no doc vivo |

---

## C. Tabela de coleções

| Módulo | Coleção/caminho | patientId | medicoId | organizationId | Proprietário aparente | Consulta atual | Risco em transferência |
|--------|-----------------|-----------|----------|----------------|----------------------|----------------|------------------------|
| Cadastro clínico | `pacientes_completos/{id}` | doc id | `medicoResponsavelId` | sombra create | Pessoa/dossiê + médico atual | `where medicoResponsavelId`; `getByEmail`/`userId` | Troca simples move lista e o blob clínico |
| Abandono | `pacientes_abandono/{id}` | doc id | null + `medicoResponsavelAnteriorId` | copiado se existia | Histórico abandono | merge em `getPacientesByMedico` | Accept moderno não restaura destes docs (gap) |
| Timeline | `.../timeline/{eventoId}` | implícito path | — | — | Evento sob paciente | subcollection | Segue paciente; autor médico não reescrito |
| Nutri | `.../nutricao/**` | path | — | — | Plano/check-in sob paciente | path | Segue paciente |
| Fotos | `.../progressPhotos` + GCS `patients/{id}/...` | path / storage | — | — | Paciente | path | Segue paciente |
| Sol. exames | `.../solicitacoesExames` | field + path | **sim** | — | Solicitação carimbada | subcol | Metadados sob paciente; `medicoId` fica stale |
| Contratos | `.../documentos` | field + path | **sim** | — | Contrato médico×paciente | subcol | Lista sob paciente; contratado no PDF/doc stale |
| Orçamentos | `.../orcamentosTerapeuticos` | path | **sim** | sombra | Comercial do médico | subcol | `medicoId` stale; valor segue path |
| Financeiro | `pagamentos_pacientes/{pacienteId}` | doc id | **não tipado** | — | Caixa do paciente | getDoc por ids da lista do médico | Novo médico herda via lista; antigo perde lista |
| Venda avulsa | `vendas_avulsas` | — | **sim** | — | Médico | `where medicoId` | Não segue paciente |
| Prescrições | `prescricoes` | opcional | **obrigatório** | — | Médico emissor | `ByMedico` / `ByPaciente` | Ficam no emissor; timeline paciente ainda vê |
| Lembretes | `lembretes` | sim | sim | — | Médico (ou nutri) | `where medicoId` | Órfãos no médico antigo |
| Links aplicação | `aplicacao_links` | sim | — | sombra | Token paciente | token / pacienteId | Continuam funcionando |
| Links conclusão | `conclusao_links` | sim | **sim** | sombra | Token + médico criação | token | Funciona; `medicoId` stale |
| Depoimentos API | derivado do paciente | — | via `medicoResponsavelId` | — | Médico **atual** | query responsável | Novo herda; antigo some da landing |
| Classificação ★ | `classificacao_profissionais` | no id | no id | — | Par paciente×médico | id composto | Antigas ficam no par antigo |
| CRM lead | `leads_medico` | — | **sim** | sombra | Médico | `medicoId` | Não acompanha troca clínica |
| Solicitação | `solicitacoes_medico` | opcional | **sim** | sombra | Pedido ao médico | medicoId/email | Aceitar reatribui paciente no UI |
| Indicações | `indicacoes` | opcional | **sim** | — | Médico / comissão | medicoId | Atribuição pode dessincronizar |
| Nutri share | `paciente_nutricionista` | sim | **sim** (quem compartilhou) | — | Vínculo ativo | by nutri | Acesso nutri sobrevive; campo stale |
| Personal share | `paciente_personal_trainer` | sim | **sim** | — | Vínculo ativo | by personal | Idem |
| WA queue | `whatsapp_automation_queue` | `patientId` | `doctorId` | **sim** | Automação médico×paciente | pending + scheduledFor | Id embute doctor; sem rebuild automático |
| WA envios | `whatsapp_auto_aplicacao_envios` | sim | sim | — | Log/idempotência | scan pacientes | Id antigo |
| Email queue | `email_automation_queue` | lead | doctor opcional | **sim** | Campanha lead/org | rebuild/org | Pouco acoplado à troca pós-conversão |
| WA sessão | `whatsappConnections/{doctorId}` | — | doctor | session org | Dispositivo do médico | doctorId | Não migra com paciente |

---

## D. Mapa de acessos

Premissa da coluna “após troca”: **apenas** `medicoResponsavelId` e/ou `organizationId` no doc do paciente mudam; satélites não são reescritos.

| Tipo de dado | Paciente vê? | Médico atual vê? | Médico antigo veria após troca? | Nova organização herdaria? |
|--------------|--------------|------------------|----------------------------------|----------------------------|
| Cadastro / prontuário embutido | Sim (`/meta` por email) | Sim (lista + modal) | Não na lista MetaAdmin | Só se médico B for da org (MAG dashboard via médicos, não via patient.org) |
| Timeline / nutri / fotos | Sim (UI) | Sim | Não via lista | Mesmo |
| Exames lab/imagem | Sim (com vínculo) | Sim; API imagem exige responsável | APIs gated: **não** (upload/signed write) | Sem barreira org no gate |
| Sol. exames (histórico) | Via prontuário | Via paciente | Se abrir doc por id (rules abertas) — **incerto no produto**; lista normal: não | — |
| Prescrições | `PrescricoesPacienteTab` by `pacienteId` | Lista própria by `medicoId` | Continua dono na lista do emissor; some do paciente “dele” | — |
| Aplicações / plano | Sim | Sim (calendário derivado) | Não no calendário dele | Rebuild WA precisa médico novo |
| Financeiro `pagamentos_pacientes` | Em modal aplicações | Via ids dos pacientes dele | Perde (some da lista) | Herda indevidamente se B listar o paciente |
| Vendas avulsas | Não | Suas vendas | Continua com A | Não |
| Contratos subcol | Portal contratos | UI paciente | Texto/PDF ainda com A; lista sob paciente → B enxerga path | — |
| Depoimentos landing | — | API responsável atual | Some da landing de A | Landing de B pode mostrar |
| Lembretes | — | Seus lembretes | Ficam com A (órfãos clínicos) | — |
| WA pending antigo | — | Sessão A | Podem disparar na sessão A até skip/rebuild | Org do queue item stale |
| Lead CRM | — | Seu CRM | Lead fica em A | Não |
| Nutri/personal ativo | Portal separado | Compartilhamento | Vínculo permanece; dados novos sob paciente | Cross-org: **não desenhado** |

---

## E. Consequências da troca simples

Simulação conceitual (sem write):

```ts
medicoResponsavelId: medicoA → medicoB
organizationId: organizacaoA → organizacaoB
```

| Módulo | Classificação | O que aconteceria |
|--------|---------------|-------------------|
| Lista pacientes MetaAdmin | antigo perde; novo herda | `getPacientesByMedico` A esvazia o caso; B passa a listar |
| Lista MAG | continua funcionando | Ainda em `getAllPacientes`; filtro por médico muda |
| Prontuário / evoluções / anamnese | novo herda (todo o blob) | Embutido no doc |
| Exames lab/imagem + Storage | novo herda; path permanece | Gates `requireMedicoPacienteMetaadmin` passam a B |
| Sol. exames | parcial: path segue; carimbo stale | `medicoId` da solicitação continua A |
| Prescrições | registro “preso” ao emissor + paciente ainda vê | `ByMedico(B)` não traz Rx de A; `ByPaciente` traz |
| Aplicações / plano / peso / bio / fotos | novo herda | Derivados do doc |
| Links `/aplicacao` | continua funcionando | Só `pacienteId` |
| Financeiro paciente | novo herda indevidamente (pela lista); antigo perde acesso de UI | Doc sem `medicoId` |
| Vendas avulsas | inalterado em A | — |
| Orçamentos terapêuticos | path sob paciente → B vê; `medicoId` stale | Mistura clínico/comercial |
| Contratos | B vê subcoleção; PDF/contratado = A | Documento juridicamente de A |
| Depoimentos | novo herda indevidamente na API; antigo perde landing | Filtro `medicoResponsavelId` |
| Classificação ★ | órfã no par antigo | Id `paciente_medico_A` |
| Agenda calendário (dose) | novo herda | Recalcula do plano |
| Lembretes | órfãos em A | `where medicoId==A` |
| WhatsApp queue | órfão / envio em nome antigo até rebuild | id contém `doctorId` A; **sem hook** de rebuild na troca |
| WhatsApp envios D0 | idempotência antiga | ids com A |
| E-mail leads | geralmente inalterado pós-conversão | fila `lead_*` |
| Nutri/personal | continuam vendo paciente | vínculo por `pacienteId`; `medicoId` share stale |
| CRM leads/solicitações | ficam com A | Não reescritos |
| Portal paciente | continua funcionando; médico exibido = B | Load por email/`userId` |
| Relatórios / analytics | comportamento misto | Métricas por responsável atual vs carimbos históricos |
| Permissões rules | inalteradas (já abertas) | — |
| Arquivos GCS | paths por paciente; acesso via APIs gated | — |
| Só `organizationId` | quase inócuo para ACL clínica | Portal/MetaAdmin não filtram; filas usam org do médico/queue |

**Classificação resumida usada acima:**  
*continua funcionando* · *novo herda indevidamente* · *antigo perde* · *órfão* · *duplicidade possível* · *incerto*

---

## F. Pontos críticos

1. **Não há transferência; há reatribuição informal** via accept no MetaAdmin (`app/metaadmin/page.tsx`), sem cascade em satélites.
2. **`organizationId` no paciente não é fronteira de acesso** (`shadowOrganizationId.ts`: “leituras ainda não filtram”).
3. **Financeiro e depoimento seguem o `medicoResponsavelId` atual nas UIs/APIs de listagem**, mesmo que o valor financeiro “pertença” à relação comercial antiga — conflito direto com a intenção futura “A fica com financeiro/depoimento; B não recebe”.
4. **Prescrições, lembretes, WA queue, leads, shares** usam `medicoId`/`doctorId` próprio → ficam inconsistentes numa troca simples.
5. **Firestore rules autenticado = R/W global** (`firestore.rules` catch-all) — qualquer desenho de transferência hoje não tem ACL de banco confiável.
6. **Unicidade de paciente frágil:** upsert por `userId` pega só `docs[0]`; MetaAdmin cria `userId` sintético (`uid_timestamp`); sem unique de CPF/email.
7. **Abandono moderno vs accept:** `moverParaAbandono` remove de `completos`; accept resolve só em `completos` → retorno de abandono pela solicitação pode falhar.
8. **Depoimentos públicos** mudam de “dono de marketing” na troca do responsável (`app/api/depoimentos-medico/route.ts`).
9. **Filas WhatsApp** embutem `doctorId` no id determinístico; rebuild existe como API/cron, **não** como efeito colateral de mudança de responsável.
10. **Contratos assinados** embutem médico contratado; trocar responsável não re-assina nem versiona cadeia legal.

---

## G. Incertezas

| Item | Por quê |
|------|---------|
| Quantos pacientes em produção têm `organizationId` ausente vs `'metodo'` | Exige query/admin read; não executado nesta auditoria |
| Documentos legado só com `medicoResponsavelID` | Código lê ambas; prevalência desconhecida |
| `pagamentos_personal_trainer_paciente` | Usado em UI; métodos canônicos ausentes do `pagamentoService` atual |
| Conteúdo exato de todos os docs em `digitalSignatureRequests` ligados a paciente | Fluxo BRy/EasySign espalhado; não inventariado campo a campo |
| Se MAG “exclui” pacientes de outra org na aba pacientes | Lista carrega todos; dashboards usam recorte por médicos da org — comportamento de filtro UI pode variar |
| IA memória (`ia_memory_system.md`) na troca de médico | Doc menciona refresh; hook automático no accept **não confirmado** no código de accept |
| Campos runtime extras no paciente (`preferenciaLayout`, etc.) | Existem fora do type estrito; inventário completo open-ended |
| Comissões pagas vs `planoIndicacao` após “venda” | Modelo de indicação vs caixa — detalhe pós-pagamento não fechado aqui |
| White-label agenda slots reservados vs paciente clínico | Agenda WL é de lead/slot; pouca sobreposição comprovada com `pacientes_completos` |

---

## H. Arquivos relevantes

### Tipos
- `types/obesidade.ts` — `PacienteCompleto`, exames, plano, evolução
- `types/pagamento.ts` — `PagamentoPaciente`, `VendaAvulsa`
- `types/prescricao.ts`
- `types/lembrete.ts`
- `types/whatsappAutomationQueue.ts`
- `types/solicitacaoMedico.ts` / leads / nutricionista / personal (features)

### Serviços centrais
- `services/pacienteService.ts` — create/update, listagens, abandono, desvínculo
- `services/solicitacaoMedicoService.ts`
- `services/pagamentoService.ts`
- `services/prescricaoService.ts`
- `services/lembreteService.ts`
- `services/aplicacaoService.ts`
- `services/leadMedicoService.ts`
- `services/indicacaoService.ts`
- `services/whatsappAutomationQueueService.ts`
- `services/whatsappConnectionService.ts`
- `services/bioImpedanciaService.ts`
- `services/pacienteNutricionistaService.ts` / `solicitacaoNutricionistaService.ts`
- `services/pacientePersonalTrainerService.ts` / `solicitacaoPersonalTrainerService.ts`

### Organização
- `lib/organization/organizationRegistry.ts`
- `lib/organization/shadowOrganizationId.ts`
- `lib/organization/organizationTeam.ts`
- `lib/organization/isMetodoOrganizationMember.ts`
- `lib/migrations/organizationBackfillCollections.ts`

### Autorização / server
- `firestore.rules`
- `lib/server/metaadminExamesImagemGate.ts` — `requireMedicoPacienteMetaadmin`
- `lib/server/requirePacienteSelfGate.ts`
- `lib/metaadmin/requireMetaAdminGeral.ts`
- `lib/server/whatsappMedicoContext.server.ts` — `resolveMedicoOrganizationId`
- `lib/server/firebaseAdminOftware.ts`

### UI / fluxos
- `app/meta/page.tsx` — portal paciente, abandono, create
- `app/metaadmin/page.tsx` — accept, desvínculo, calendário, pagamentos
- `app/metaadmingeral/page.tsx` — `getAllPacientes`
- Componentes prontuário MetaAdmin (`app/metaadmin/components/paciente-modal/prontuario/*`)
- `components/metaadmin/ExamesImagemPacientePanel.tsx`, `SolicitarExamesModal.tsx`
- `components/meta/PrescricoesPacienteTab.tsx`

### APIs notáveis
- `app/api/depoimentos-medico/route.ts`
- `app/api/aplicacao/link/route.ts`, `lib/aplicacao/ensureAplicacaoPublicLink.ts`
- `app/api/conclusao/link/route.ts`, `lib/conclusao/ensureConclusaoPublicLink.ts`
- `app/api/metaadmin/exames-imagem-*.ts`
- Crons: `app/api/cron/send-whatsapp-aplicacao`, `send-whatsapp-lembretes`, `rebuild-whatsapp-queue`, `send-email-aplicacao`, `rebuild-email-queue`, …

### Contratos
- `lib/documentos/contrato-tratamento/*`
- `lib/contratos/contratoTirzepatidaTemplate*.ts`

### Docs relacionados
- `docs/playbooks/organizacao-template/04_pacientes.md`
- `docs/playbooks/nova-organizacao/02_fluxo_tecnico.md`
- `docs/oi/03_MAPEAMENTO_FIRESTORE_OI.md`
- `docs/arquitetura/ETAPA_3_FUNDACAO_ORGANIZACAO.md`

### Funções centrais buscadas e **não existentes** com esses nomes
`getPatientContext`, `resolvePatient`, `requirePatientAccess`, `getMedicoContext`, `getOrganizationContext` — equivalentes parciais listados na §2 abaixo.

---

## Detalhamento por tema (pedidos 1–18)

### 1. Documento principal do paciente

| Item | Valor atual |
|------|-------------|
| Coleção | `pacientes_completos` |
| Caminho | `pacientes_completos/{pacienteId}` |
| `patientId` | Firestore document id (`PacienteCompleto.id`) |
| Auth | `userId` ← Firebase Auth UID (intenção); MetaAdmin pode gravar `userId` sintético |
| Médico | `medicoResponsavelId` (+ legado `medicoResponsavelID` / `medicoresponsavelid`) |
| Organização | `organizationId` (não tipado em `PacienteCompleto`; create via `shadowOrganizationFields()` → `'metodo'`) |
| Status conta | `status: 'ativo' \| 'inativo' \| 'arquivado'` — **`arquivado` só no type; uso produtivo não encontrado** |
| Status cuidado | `statusTratamento: 'pendente' \| 'em_tratamento' \| 'concluido' \| 'abandono'` |
| Bloqueio / transferência | **Não existem** campos para isso |
| Pessoa vs org | Documento **plataforma/pessoa-dossiê**; org é sombra, não tenant clínico |
| Multi-doc mesmo user | Possível (upsert não atômico; create MetaAdmin sintético; email sem unique) |
| Anti-duplicidade | Soft: `where userId` / `getPacienteByEmail` → primeiro doc; **sem CPF unique** |

Exemplo de interface (campos sensíveis omitidos além do necessário):

```ts
// types/obesidade.ts
export interface PacienteCompleto {
  id: string;
  userId: string;
  email: string;
  nome: string;
  medicoResponsavelId: string | null;
  status: 'ativo' | 'inativo' | 'arquivado';
  statusTratamento: 'pendente' | 'em_tratamento' | 'concluido' | 'abandono';
  medicoResponsavelAnteriorId?: string | null;
  medicoRecomendadoId?: string | null;
  // + pastas clínicas (dadosIdentificacao, dadosClinicos, exames*, planoTerapeutico, evolucaoSeguimento, ...)
}
```

Colateral abandono: `pacientes_abandono/{mesmoId}`.

### 2. Resolução de contexto

| Necessidade | Como funciona hoje | Arquivos |
|-------------|--------------------|----------|
| Médico responsável | Campo no paciente | `types/obesidade.ts`, listagens |
| Org atual do paciente | Campo sombra; **não** usado para decisão clínica | `shadowOrganizationId.ts` |
| Médico logado | `medicos where userId == auth.uid` | MetaAdmin / gates |
| Org ativa | Registry + defaults `'metodo'`; WhatsApp via `resolveMedicoOrganizationId` | `organizationRegistry.ts`, `whatsappMedicoContext.server.ts` |
| Paciente pertence ao médico? | Lista by responsável; APIs seletas com igualdade | `pacienteService`, `metaadminExamesImagemGate` |
| Outro médico abre? | Client rules permitem; produto lista não; APIs gated negam | rules + gates |
| MAG vê todos? | `getAllPacientes` + e-mail gate MAG | `metaadmingeral/page.tsx`, `requireMetaAdminGeral` |
| Paciente self | Portal por **email**; APIs `requirePacienteSelf` (uid/email) | `app/meta/page.tsx`, `requirePacienteSelfGate.ts` |

**Não há** `getPatientContext` / `resolvePatient` / `requirePatientAccess` / `getMedicoContext` / `getOrganizationContext` com esses nomes.

### 3. Cadastro e edição (fluxos)

| Fluxo | Onde | Serviço / coleção | Campos | Colaterais / automações |
|-------|------|-------------------|--------|-------------------------|
| Criar (portal) | `/meta` | `createOrUpdatePaciente` → `pacientes_completos` | + `organizationId` sombra; médico null comum | — |
| Criar (MetaAdmin) | `metaadmin/page` | idem; `userId` sintético | `medicoResponsavelId` do perfil | — |
| Editar | MetaAdmin modal / portal / MAG | `createOrUpdatePaciente` update | várias pastas; **não** força org | — |
| Vincular médico | Accept solicitação UI | update `medicoResponsavelId` + `aceitarSolicitacao` | status sol `aceita` | cancela outras pendentes |
| Vincular org | só create/backfill | sombra / migration | `organizationId` | leituras não filtram |
| Desvincular | MetaAdmin | `desvincularPacienteDoMedico` | null nos campos médico | encerra shares; apaga sols |
| Abandono | `/meta` | `moverParaAbandono` | move coleção; médico null | delete sols |
| Conclusão | MetaAdmin / token conclusão | update `statusTratamento` + `planoTerapeutico.conclusaoTratamento` | médico **permanece** | emails/WA conclusão se configurados |
| Reativar | accept legado se abandono ainda em `completos` | reset evolve/plan | → `em_tratamento` | **gap** vs `pacientes_abandono` |
| Reject sol | MetaAdmin | pode zerar médico se era o dono | — | — |

`SolicitacaoMedicoService.aceitarSolicitacao` **não** altera o paciente — a reatribuição é no handler da página.

### 4–7. Prontuário, exames, Rx, aplicações

Ver tabela §C e agentes de detalhe. Síntese:

- **Prontuário clínico principal = campos do próprio paciente** (+ `timeline`, nutricao).
- **Exames:** arrays no doc + Storage `pacientes-exames-imagem/{pacienteId}/...` + sub `solicitacoesExames`.
- **Prescrições:** coleção separada; dono = `medicoId`; paciente visualiza por `pacienteId`.
- **Aplicações:** derivadas de `planoTerapeutico` + `evolucaoSeguimento`; links públicos sem `medicoId`.

Se só o responsável muda: blob clínico e links de aplicação **seguem**; Rx e carimbos **não**.

### 8. Financeiro

- Ledger paciente: `pagamentos_pacientes/{pacienteId}` — **sem `medicoId`** no type.
- MetaAdmin carrega pagamentos pelos **ids dos pacientes do médico**, não por query de médico no pagamento.
- Consequência transferência simples: **B herda o caixa do paciente; A perde na UI.**
- `vendas_avulsas` ficam em A.
- Orçamentos/kits/investimento: subcoleção comercial no paciente (`orcamentosTerapeuticos`) misturam clínica/comercial; `medicoId` no doc.

### 9. Contratos

- Path: `pacientes_completos/{pacienteId}/documentos`.
- Tipos: `ContratoTratamento*` com `medicoId`, `pacienteId`, status assinatura, hashes/PDFs.
- Contratado = médico; contratante = paciente (templates Tirzepatida).
- Imutabilidade prática: PDF/hash após assinado; metadados ainda listáveis sob o paciente → B vê o arquivo do contrato de A.

### 10. Depoimentos / fotos / marketing

- Texto: `planoTerapeutico.conclusaoTratamento.depoimento` (+ histórico de ciclos).
- API pública: pacientes `where medicoResponsavelId == medicoId` + filtro 5★ + flags.
- Fotos: subcoleção + `compartilharComMedico`.
- Risco: depoimento **migrate marketing** para B; classificação ★ composta não migra.

### 11. Agenda

- Aplicações: derivadas do plano do paciente (seguem B).
- `lembretes`: ficam com A.
- Pagamentos no calendário: via docs de pagamento do paciente (andam com lista).
- WL availability: outro domínio (slots/leads), `blocked` = slot.

### 12. WhatsApp / e-mail

- Queue WA: `doctorId`, `patientId`, `organizationId`; id determinístico inclui doctor.
- Rebuild APIs/crons existem; **não** amarrados a change de `medicoResponsavelId`.
- Sessão: `whatsappConnections` / `org_{org}_doctor_{doctor}`.
- Email queue: sobretudo leads; menos impacto pós-paciente convertido.

### 13. Nutri / personal

- Shares: `paciente_*` com `medicoId` do compartilhador.
- Acesso ativo por vínculo profissional×paciente — **sobrevive** à troca do responsável clínico.
- Transferência entre **organizações** não tem política: vínculos não são cancelados automaticamente.

### 14. CRM

- `leads_medico`, `solicitacoes_medico`, `indicacoes` são **do médico captador**.
- Conversão clínica definitiva: paciente com `medicoResponsavelId`.
- Lead **não** acompanha automaticamente a troca do dossiê clínico.

### 15. Portal do paciente

- Carga principal: `getPacienteByEmail(auth.email)` (exceto `?pacienteId=` nutri).
- Assume **um** médico responsável e não lê org do paciente.
- Prescrições de vários médicos: se existirem por `pacienteId`, a aba pode listá-las (coleção não filtra “só médico atual”).
- Dados antigos do blob **não somem** só porque org mudou.
- Gate frágil: rules abertas + `?pacienteId=` sem checagem forte de vínculo.

### 16. Rules e APIs

- Rules: auth ≠ null → R/W; catch-all cobre o restante.
- Admin SDK bypassa rules.
- Gates bons (exemplos): exames imagem metaadmin; `requirePacienteSelf`; MAG email.
- Risco explícito pedido: `patient.medicoResponsavelId === currentDoctorId` — usado em gates seletos; **lista MetaAdmin dependente desse campo**; troca remove acesso de UI do antigo e concede ao novo no blob.

### 17–18. Dependências ocultas / hardcoded `metodo`

Padrões recorrentes:

- `shadowOrganizationFields()` em creates (paciente, médico, leads, solicitações, links…).
- Fallbacks `|| 'metodo'` / `METODO_ORGANIZATION_ID` em WhatsApp, branding, cutover email, nav MAG.
- `clinica_exemplo_wl` no registry e testes multi-org email.
- Nomes mistos: `medicoResponsavelId` vs `medicoId` vs `doctorId` vs `patientId`/`pacienteId` — **não unificados**.

Legado vs atual:

| Legado | Atual |
|-------|-------|
| Abandono ainda em `completos` | Move para `pacientes_abandono` |
| `medicoResponsavelID` | `medicoResponsavelId` (+ leitura defensiva) |
| Fluxo contrato médico_primeiro | paciente_primeiro default |
| Email cron legado | + `email_automation_queue` / cutover |
| WA envios D0 isolados | + fila `whatsapp_automation_queue` |

Mesma org vs orgs diferentes: **hoje a diferença prática quase não existe no ACL do paciente**, porque org não filtra clínica; muda branding/WA/email engine do **médico** e membership MAG.

---

## I. Recomendação preliminar

*(Sem desenhar a implementação.)*

### É possível adicionar transferência sem remodelar tudo?

**Parcialmente.** Dá para começar com um **evento de transferência auditável** + políticas de visibilidade **sem** migrar o blob clínico — desde que se aceite que o dossiê clínico permanece único.  
**Não** é seguro “só atualizar dois campos” e considerar o produto correto.

### O que pode permanecer intacto (com regras de leitura)

- Storage paths por `pacienteId`.
- Subcoleções clínicas sob o mesmo paciente (timeline, nutri, fotos), se a política for “um prontuário contínuo”.
- Links `aplicacao_links` (token por paciente).
- Catálogo de templates de prescrição (`medicoId: SISTEMA`).

### O que exige camada de autorização / ownership histórico

- Financeiro paciente (hoje herda com a lista).
- Depoimentos / landing (hoje herdam com responsável).
- Contratos assinados (dono legal ≠ responsável atual).
- Prescrições e recibos (emissor).
- Filas WhatsApp (doctor no id + sessão).
- Shares nutri/personal (continuidade vs cancelamento).
- CRM (permanência com captador).

### O que mistura clínico, financeiro e comercial

- `orcamentosTerapeuticos` / negociação (plano + valores).
- Conclusão (`conclusaoTratamento` junta clínico + depoimento + métricas).
- Calendário MetaAdmin (doses + parcelas + lembretes).
- Recibo médico dentro de `prescricoes` (`tipoDocumento: recibo_medico`).

### Resolver antes de qualquer desenvolvimento

1. Política de produto: snapshot vs leitura viva para o médico A; depoimento e financeiro **nunca** seguem B.
2. Modelo de status (`transferido`, arquivo no remetente, quem pode devolver).
3. Inventário de satélites a cancelar/rebuildar (WA, lembretes, shares).
4. Endurecer (ou pelo menos mapear) a lacuna das **Firestore rules** — senão transferência “segura” na UI é cosmético.
5. Fluxo abandono ↔ accept restaurando `pacientes_abandono` (gap atual).
6. Decisão multi-org real: patient.organizationId passa a valer ou o tenant continua sendo o médico?

---

## Apêndice — referência rápida de simulação (pedido 17)

| Módulo | Classificação na troca simples |
|--------|--------------------------------|
| Lista A / B | antigo perde · novo herda |
| Prontuário | novo herda (adequado se política for continuidade clínica) |
| Exames | novo herda · gates viram B |
| Prescrições | órfãs no emissor A · paciente ainda lista |
| Aplicações | novo herda · links ok |
| Financeiro paciente | **novo herda indevidamente** · antigo perde |
| Contratos | B vê arquivos · conteúdo legal de A |
| Depoimentos | **novo herda indevidamente** · antigo perde landing |
| Agenda dose | novo herda |
| Lembretes | órfãos A |
| WhatsApp | órfãos / possível envio A até rebuild |
| E-mail lead | ~inalterado |
| Nutri/personal | continuam (possível herança indevida de acesso) |
| CRM | preso em A |
| Portal | funciona · médico = B |
| Org field only | ~sem efeito ACL |

---

*Fim do relatório de auditoria. Nenhuma alteração de código, regra, índice ou dado foi realizada para produzi-lo.*
