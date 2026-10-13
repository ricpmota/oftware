# Telefone internacional — Etapa 6 (paciente fechado + telas auxiliares)

**Data:** 21 de setembro de 2026  
**Escopo:** fechar fluxos restantes de **telefone de paciente** e **telas de teste auxiliares**. Sem internacionalizar cadastros de médico/nutri/personal/psi/leads. Sem migração Firebase, VM, Docker ou WPPConnect.

Anteriores: [`TELEFONE_INTERNACIONAL_ETAPA_5.md`](./TELEFONE_INTERNACIONAL_ETAPA_5.md).  
Auditoria de origem: [`AUDITORIA_WHATSAPP_TELEFONE_INTERNACIONAL.md`](./AUDITORIA_WHATSAPP_TELEFONE_INTERNACIONAL.md).

---

## Auditoria A–H (ocorrências vivas)

Classificação desta etapa. Só **A** e **B** foram alterados.

| Classe | O que é | Ação Etapa 6 |
|--------|---------|--------------|
| **A. paciente** | cadastro, anamnese, envio automático, fila, wa.me, check-in, lembrete, cobrança, exames, cardápio, calendário, Canal Chat notify, CRM paciente | já nas fontes centrais; conferido; nenhum `55${` vivo |
| **B. tela de teste** | `/api/metaadmin/whatsapp/send-test` e teste white-label da agenda | API MetaAdmin alinhada; lead white-label internacionalizado; responsável BR-only |
| **C. médico/profissional** | `Medico.telefone`, nutri/personal/psi, `telefoneAviso`, aviso de consulta ao profissional | **não alterado** |
| **D. lead** | LeadMedico, LeadProfissional, lead white-label, CRM 360 `cleanPhoneBr` | **não alterado** |
| **E. indicação/solicitação** | `telefonePaciente` / `pacienteTelefone` string BR | **não alterado** — auditado abaixo |
| **F. inbound** | `phoneLookupVariants` BR-cêntrico | **não alterado** — caracterizado US/PT |
| **G. infraestrutura/WPPConnect** | `normalizePhone` da sessão conectada, fallback `sendTestMessage` sem flag | **não alterado** |
| **H. backup/teste/morto** | `backupwhatsapp/`, `page.backup.*`, `app - Copia/` | **não alterado** |

---

## Telas auxiliares

### `/api/metaadmin/whatsapp/send-test`

**Tela de caller:** não há UI ativa.

A Central do médico (`WhatsappConnectionSection` / `WhatsappMessageLogPanel`) documenta:

> Envio manual de teste foi descontinuado — não exibir na Central.

Nenhum `fetch` vivo aponta para essa rota (exceto a própria API).  
A rota **permanece viva** (auth de médico + `sendWhatsappTestMessageForDoctor`).

**Decisão:** internacionalizar o **contrato da API** (mesmo padrão da Etapa 5), sem ressuscitar a UI.

```
{ telefone, telefoneDdi, telefonePais, message }
  → resolveWhatsappTestDestination
  → sendTestMessage(..., { phoneIsResolved: true })
```

`{ phone }` sem DDI continua aceito = legado BR.  
`phoneIsResolved` / `telefoneE164` do browser são ignorados.

UI ativa de teste do médico continua sendo a da Etapa 5:

`/api/metaadmingeral/automacoes/whatsapp/send-test`  
(`DoctorWhatsAppTestPanel`).

### White-label agenda `/api/metaadmingeral/whitelabel/agenda/whatsapp-test`

UI: `components/metaadmingeral/WhiteLabelAgendaSettingsPanel.tsx`.

| Destino | Origem do número | Decisão |
|---------|------------------|---------|
| **Lead** | digitação manual (`testLeadPhone`) | **internacionalizado** — `InternationalPhoneInput` + payload estruturado + `resolveWhatsappTestDestination` + `phoneIsResolved: true` |
| **Responsável** | `settings.whatsappResponsavelPhone` (cadastro BR-only, sem DDI) | **permanece BR** — não inventar DDI; `sendTestMessage` sem flag |

Não foi criado resolver novo.

Envio automático de reunião white-label (`notifyWhiteLabelMeetingWhatsApp`) continua BR-only: o lead cadastrado ainda não tem `telefoneDdi`. Fora do escopo A/B.

---

## Matriz dos fluxos de paciente

Contrato de prova:

| Caso | Nacional | DDI | Canônico |
|------|----------|-----|----------|
| BR legado | `83988192848` | (ausente) | `5583988192848` |
| BR novo | `83988192848` | `55` | `5583988192848` |
| US | `7137326616` | `1` | `17137326616` |
| PT | `912345678` | `351` | `351912345678` |

| Fluxo | BR legado | BR novo | US | PT | Status |
|-------|-----------|---------|----|----|--------|
| Cadastro / anamnese (`InternationalPhoneInput`) | 5583988192848 | 5583988192848 | 17137326616 | 351912345678 | OK internacional |
| Identificação | idem | idem | idem | idem | OK internacional |
| Envio automático (aplicação, boas-vindas paciente, cadastro link) | extractor | extractor | extractor | extractor | OK internacional |
| Fila (`item.phone` + `phoneIsResolved`) | 5583988192848 | 5583988192848 | 17137326616 | 351912345678 | OK internacional |
| wa.me (`buildPatientWhatsappUrl`) | wa.me/5583988192848 | idem | wa.me/17137326616 | wa.me/351912345678 | OK internacional |
| Check-in nutri | extractor / `buildWhatsappUrl` com DDI | idem | idem | idem | OK internacional |
| Lembrete consulta paciente (médico e nutri) | `tryResolvePhoneFromPacienteDoc` | idem | idem | idem | OK internacional |
| Cobrança (automática + avulsa Canal Chat) | extractor + `phoneIsResolved` | idem | idem | idem | OK internacional |
| Exames laboratoriais notify | extractor | idem | idem | idem | OK internacional |
| Cardápio notify | extractor | idem | idem | idem | OK internacional |
| Calendário lembrete **paciente** | extractor | idem | idem | idem | OK internacional |
| Calendário `telefoneAviso` (profissional) | legado BR | legado BR | n/a | n/a | BR-only intencional |
| Canal Chat notify paciente | extractor | idem | idem | idem | OK internacional |
| CRM paciente (lista / cards wa.me) | `buildPatientWhatsappUrl` | idem | idem | idem | OK internacional |
| CRM 360 `cleanPhoneBr` (tel:/legado) | prefixa 55 | prefixa 55 | erraria se usado | erraria | BR-only; wa.me já usa helper |
| EasySign BRy (`formatEasySignPhoneE164`) | +55 | +55 | não é WhatsApp | não é WhatsApp | não aplicável (assinatura) |
| Teste MetaAdmin Geral (Etapa 5) | 5583988192848 | 5583988192848 | 17137326616 | 351912345678 | OK internacional |
| Teste MetaAdmin `/send-test` (API) | 5583988192848 | 5583988192848 | 17137326616 | 351912345678 | OK internacional (sem UI) |
| White-label test **lead** | 5583988192848 | 5583988192848 | 17137326616 | 351912345678 | OK internacional |
| White-label test **responsável** | legado BR | legado BR | n/a | n/a | BR-only intencional |
| Indicação / solicitação | máscara BR | máscara BR | não | não | BR-only intencional (Etapa futura) |
| Inbound Canal Chat lookup | variantes BR | variantes BR | E164 + falso `55…` | só E164 | caracterizado; ver seção inbound |
| Médico / nutri / personal / psi / leads | — | — | — | — | BR-only intencional |

**Paciente (entidade `pacientes_completos` / Identificação / envios automáticos / wa.me) está fechado.**  
Não há fluxo vivo de paciente que force `55` ignorando `telefoneDdi`.

Ressalvas que **não** são cadastro de paciente internacionalizado:

- fallback de boas-vindas com `sol.pacienteTelefone` (solicitação, classe E);
- fallback `tryLegacyPhone` em lembrete de consulta se o doc do paciente não existir;
- inbound: match por `dadosIdentificacao.telefone` nacional US/PT não entra nas variants (depende de `canalChatPhoneKey`).

---

## Auditoria `dadosIdentificacao.telefone`

Toda leitura viva que resulta em WhatsApp de **paciente** passa por uma destas fontes:

- `tryResolvePhoneFromPacienteDoc`
- `resolveInternationalPhoneFromIdentificacao`
- `buildPatientWhatsappUrl` / `buildWhatsappUrl` com DDI/E164

Nenhum desses arquivos concatena `55${` nem chama `normalizeWhatsappPhone(paciente.dadosIdentificacao.telefone)` ignorando DDI.

Leituras de `dadosIdentificacao.telefone` **que não são WhatsApp de envio**:

| Arquivo | Uso | Classe |
|---------|-----|--------|
| `lib/crm/loadLeadsProfissionalData.ts` `pickPhone` | dígitos para card de lead profissional | display / D |
| `app/metaadmin/page.tsx` extração de dígitos em aplicação/conclusão | guarda de “tem telefone”; o href é `buildPatientWhatsappUrl` | A (já OK) |
| `lib/signature/bryEasySign/*.server.ts` | campo `phone` do signatário BRy | não aplicável |
| `app/api/consulta-nutri/[token]/agendar/route.ts` | fallback `pacientePhone` nacional no agendamento | A: o send usa `tryResolvePhoneFromPacienteDoc` no doc primeiro |

---

## Indicação / solicitação (não implementado)

### Indicação

| Pergunta | Resposta |
|----------|----------|
| Onde nasce | `/meta` aba **Indicar** (`app/meta/page.tsx`) |
| Quem digita | o paciente logado, telefone de **outra pessoa** |
| Validação | `validarTelefone`: 10 ou 11 dígitos (máscara BR) |
| Onde salva | `Indicacao.telefonePaciente: string` via `IndicacaoService` (só dígitos nacionais) |
| Vira `paciente_completo`? | matching em `PacienteService.createOrUpdatePaciente` por `dadosIdentificacao.telefone` == `telefonePaciente`; marca `virouVenda` |
| Dispara WhatsApp automático? | não no create; wa.me no MetaAdmin via `buildWhatsappUrl({ telefone })` = fallback BR |
| Máscara BR? | sim (`formatarTelefone` / `formatPhoneNumber`) |
| Precisa DDI no futuro? | **sim** — tipo `Indicacao` + UI `/meta` + matching por canônico, etapa própria |

`indicadoPorTelefone` (quem indicou) é o mesmo contrato BR string.

### Solicitação de médico

| Pergunta | Resposta |
|----------|----------|
| Onde nasce | `/meta` fluxo “solicitar acompanhamento” (`telefonePaciente` state) |
| Quem digita | o próprio paciente, muitas vezes **antes** da Identificação internacional |
| Onde salva | `solicitacao.pacienteTelefone`; pode criar `paciente_completo` só com `telefone` nacional |
| WhatsApp | boas-vindas: doc do paciente primeiro; fallback `normalizeWhatsappPhone(sol.pacienteTelefone)` = BR; wa.me MetaAdmin `buildWhatsappUrl({ telefone: solicitacao.pacienteTelefone })` |
| Aviso | `solicitacaoMedicoAvisoWhatsappService` avisa o **médico** (classe C) |

Não foi adicionado seletor nesta etapa.

---

## Inbound Canal Chat (caracterização)

Lógica **não** alterada.

`findPatientsByWhatsappPhone`:

1. `canonicalizeInboundPhone` (`assertCanonicalWhatsappPhone` — não prefixa 55 em 11 dígitos que já vieram no JID);
2. `phoneLookupVariants` (heurística BR 10/11);
3. query `in` em `canalChatPhoneKey`, `dadosIdentificacao.telefone`, `telefone`;
4. filtro `phonesLikelyMatch` só nos docs **já retornados**.

| Inbound JID | Variants atuais | Nacional no doc | Query por `dadosIdentificacao.telefone` | Match se `canalChatPhoneKey` = E164 | `phonesLikelyMatch` pós-doc |
|-------------|-----------------|-----------------|------------------------------------------|--------------------------------------|-----------------------------|
| `17137326616` | `17137326616`, `5517137326616`, `1737326616` | `7137326616` **não** está nas variants | miss | hit | true |
| `351912345678` | `351912345678` | `912345678` **não** está | miss | hit | true |
| `5583988192848` | inclui `83988192848` | hit legado | hit | hit | true |

Conclusão: US/PT **associam** quando o outbound já gravou `canalChatPhoneKey` canônico (fluxo Canal Chat normal).  
**Não** associam só pelo nacional em `dadosIdentificacao.telefone`. Isso é limite da heurística 10/11 = Brasil, não um bug novo do resolver.

Testes L/M em `telefoneInternacionalEtapa6.spec.ts` e `canalChatInboundMessage.spec.ts`.

---

## Hardcodes `55` restantes (vivos)

Não é “restaram N”. Cada categoria tem motivo.

### `55${` (código vivo, fora backup)

| Arquivo | Função | Entidade | Motivo | Status |
|---------|--------|----------|--------|--------|
| `services/whatsappProviderClient.ts:324` | `normalizePhone` | sessão WPP conectada (wid) | número **do aparelho** devolvido pelo WPP, não destino de paciente | G — não alterar |
| `lib/whiteLabel/leadWhiteLabelNormalize.ts:8` | `normalizeLeadWhiteLabelWhatsApp` | lead white-label | cadastro BR-only | D — futura etapa lead |
| `lib/paciente360/paciente360WhatsAppMessages.ts:22` | `cleanPhoneBr` | lead CRM 360 (tel:/legado) | wa.me já usa `buildWhatsappUrl`; esta fn é prefixador BR | D — morto para WhatsApp; vivo para tel: |
| `lib/signature/bryEasySign/bryEasySignPhone.ts:21` | `formatEasySignPhoneE164` | signatário BRy | contrato de assinatura, não WPP | não aplicável WhatsApp |
| `lib/whatsapp/canalChatInboundMessage.ts:345–351` | `phoneLookupVariants` | inbound | heurística BR 10/11 | F — caracterizado |
| `services/notificationService.ts:355` e `notificationServicemeta.ts:355` | `formatPhoneNumber` | display indicação/solicitação | UI `+55`, não envio | E — display BR |

### `wa.me/55` vivo

**Zero** em `app/`, `components/`, `lib/`, `services/`.  
Só backups (`app/metaadmin/page.backup.pacientes.tsx`, `app - Copia/`, etc.) e asserts de teste (`wa.me/5583988192848`).

### `normalizeWhatsappPhone(` vivo

| Arquivo | Entidade | Motivo | Status |
|---------|----------|--------|--------|
| `services/whatsappProviderClient.ts` | definição | wrapper do resolver sem DDI = BR | G |
| `lib/contatochat/contatoChatPhone.ts` | telefone da conexão / “salvar contato” | profissional, não paciente | C/G |
| `services/boasVindasTratamentoWhatsappService.ts` | fallback `sol.pacienteTelefone` | solicitação (E); doc do paciente já usa extractor | E |
| `services/calendarioLembreteWhatsappService.ts` | `telefoneAviso` | profissional Canal Chat | C |
| `lib/nutri/prontuario/prontuarioConsultaMedicoNotifyService.ts` | médico | aviso ao médico | C |
| `services/solicitacaoMedicoAvisoWhatsappService.ts` | médico | aviso ao médico | C |

### `cleanPhoneBr`

Só a definição + spec. Nenhum caller de produção de WhatsApp.

### `resolveLegacyBrazilWhatsappPhone`

Fallback de lembrete de consulta (paciente **sem** doc) e telefone de aviso do profissional. Intencional.

### `sendTestMessage` sem `phoneIsResolved`

Preservado de propósito:

- `notifyWhiteLabelMeetingWhatsApp` (lead/responsável BR);
- ramo **responsável** do teste white-label;
- qualquer caller C/D futuro.

Callers internacionais (paciente + telas A/B) passam `phoneIsResolved: true`.

---

## Entidades ainda Brasil-only

- Médico, nutricionista, personal, psiquiatra (`telefone` string)
- LeadMedico / LeadProfissional / lead white-label
- Instagram bio / CTA fundador
- Indicação / solicitação (`telefonePaciente`)
- `whatsappResponsavelPhone` da agenda white-label
- `telefoneAviso` do calendário
- Inbound variants 10/11
- EasySign BRy phone (não WhatsApp)

---

## Testes

Arquivo novo: `lib/whatsapp/telefoneInternacionalEtapa6.spec.ts` (27 testes, A–O).  
Caracterização inbound também em `lib/whatsapp/canalChatInboundMessage.spec.ts`.

Regressão das Etapas 1–5 + Etapa 6: **155/155** (`vitest` nos 8 arquivos de telefone internacional).

---

## Arquivos alterados

| Arquivo | Mudança |
|---------|---------|
| `app/api/metaadmin/whatsapp/send-test/route.ts` | contrato `telefone`+DDI; `{ phone }` legado |
| `app/api/metaadmingeral/whitelabel/agenda/whatsapp-test/route.ts` | lead: resolver + `phoneIsResolved`; responsável: legado |
| `components/metaadmingeral/WhiteLabelAgendaSettingsPanel.tsx` | `InternationalPhoneInput` no teste do lead |
| `lib/whatsapp/resolveWhatsappTestDestination.ts` | comentário (API MetaAdmin agora estruturada) |
| `services/whatsappSendTestService.ts` | comentário |
| `lib/whatsapp/telefoneInternacionalEtapa6.spec.ts` | **novo** A–O + regressão |
| `lib/whatsapp/canalChatInboundMessage.spec.ts` | caracterização US/PT |
| `docs/whatsapp/TELEFONE_INTERNACIONAL_ETAPA_6.md` | este arquivo |

Não alterados: VM, Docker, `infra/whatsapp`, WPPConnect, estrutura `pacientes_completos`, migração Firebase, `InternationalPhoneInput` (reutilizado), textos/templates de mensagem, cadastros C–D.

---

## Confirmações

- **Sem migração Firebase.**
- **Sem alteração VM / Docker / WPPConnect.**
- **Sem novo resolver.** Reuso: `InternationalPhoneInput`, `isValidIdentificacaoPhone`, `resolveInternationalPhone`, `resolveWhatsappTestDestination`, `buildWhatsappUrl`, `sendTestMessage(..., { phoneIsResolved: true })`.
- Fallback legado de `sendTestMessage` **não** foi removido.

---

## Recomendação de escopo da Etapa 7 (não implementada)

Com base **somente** nesta auditoria, a próxima fatia técnica natural **não** é inbound (caracterizado; só quebra US/PT sem `canalChatPhoneKey`) e **não** é EasySign.

É o bloco **C+D ainda BR-only que já dispara WhatsApp ou wa.me**:

1. Cadastro de **profissional** (médico / nutri / personal / psi) + `telefoneAviso` + avisos de consulta ao profissional (`normalizeWhatsappPhone` / `resolveLegacyBrazilWhatsappPhone`).
2. **Leads** (LeadMedico, LeadProfissional, lead white-label, `normalizeLeadWhiteLabelWhatsApp`, CRM 360 `cleanPhoneBr`, Instagram CTA).
3. Opcional na mesma onda ou na seguinte: **indicação/solicitação** (`telefonePaciente` + matching por dígitos nacionais) — nasce em `/meta` com máscara 10/11, vira paciente e wa.me BR.

Inbound US/PT (incluir nacional + E164 nas variants, sem adivinhar país) só se a Etapa 7 priorizar Canal Chat de resposta em pacientes internacionais que nunca receberam outbound. Não é bloqueio do cadastro de paciente — o paciente já está fechado no envio.
