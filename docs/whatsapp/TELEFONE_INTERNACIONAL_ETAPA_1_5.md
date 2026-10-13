# Telefone internacional — Etapa 1.5 (pipeline WPPConnect)

**Data:** 21 de setembro de 2026  
**Escopo:** eliminar a dupla normalização no envio WPPConnect. Sem UI, sem seletor de país, sem `wa.me`, sem anamnese, sem migração Firebase, sem alteração da VM.

Etapa anterior: [`TELEFONE_INTERNACIONAL_ETAPA_1.md`](./TELEFONE_INTERNACIONAL_ETAPA_1.md).  
Auditoria: [`AUDITORIA_WHATSAPP_TELEFONE_INTERNACIONAL.md`](./AUDITORIA_WHATSAPP_TELEFONE_INTERNACIONAL.md).

---

## Cru vs resolvido

Dois conceitos, duas funções:

| Conceito | Quando | Função | Heurística 10/11 = Brasil |
|----------|--------|--------|---------------------------|
| **Cru / legado** | string digitada, campo antigo sem DDI | `resolveLegacyBrazilWhatsappPhone` / `normalizeWhatsappPhone` | **sim** |
| **Canônico / E.164** | saída do resolver, fila, JID inbound, `telefoneE164` | `assertCanonicalWhatsappPhone` | **não** |

O país **nunca** é adivinhado por dígitos (`"começa com 1 = EUA"`). Só há dois caminhos válidos para internacional:

1. dados estruturados (`telefoneDdi` e/ou `telefoneE164`);
2. flag explícita `phoneIsResolved: true` no envio.

Pipeline:

```
Firestore
  → resolveInternationalPhone / tryResolvePhoneFromPacienteDoc
  → telefone canônico
  → sendTestMessage(..., { phoneIsResolved: true })
  → WPPConnect
```

Nunca:

```
resolveInternationalPhone(...)
  → normalizeWhatsappPhone(...)   ← reaplicava 55 em 11 dígitos
  → WPPConnect
```

---

## `sendTestMessage`

API de menor risco para callers existentes: **parâmetro opcional**, default legado.

```ts
sendTestMessage(sessionId, token, phone, message, {
  phoneIsResolved?: boolean;
})
```

| Caller | `phoneIsResolved` | Resultado |
|--------|-------------------|-----------|
| omitido / `false` | legado | `83988192848` → `5583988192848` |
| `true` | canônico | `17137326616` → `17137326616` (nunca `5517137326616`) |

Internamente:

```
resolvePhoneForWhatsappSend(phone, options?.phoneIsResolved === true)
```

Não foi criada uma função irmã (`sendResolvedWhatsappMessage`) para não duplicar o único POST `/send-message`.

### Callers

**Canônico (`phoneIsResolved: true`):**

- `whatsappPatientSendRouter` (todas as automações de paciente)
- `cobrancaAutomaticaWhatsappService`
- `financeiroCobrancaWhatsappService`
- `canalChatPendingPaymentService`

**Legado (intencional nesta etapa):**

- `whatsappSendTestService` — tela **TESTE DE ENVIO WHATSAPP** (ainda sem seletor de país)
- `app/api/metaadmingeral/whitelabel/agenda/whatsapp-test/route.ts`
- `lib/whiteLabel/notifyWhiteLabelMeetingWhatsApp.ts`

Na tela de teste, digitar `17137326616` **ainda** pode virar Brasil até a Etapa 2 (seletor).

---

## Extractores server-side

`tryResolvePhoneFromPacienteDoc(doc)` lê, nesta ordem:

1. `dadosIdentificacao.telefoneE164`
2. `dadosIdentificacao.telefoneDdi` + `telefone` (nacional; fallback `celular` / `whatsapp` da ident)
3. legado BR em `telefone` / `celular` / `phone` / `whatsapp` / `telefoneWhatsApp`

Serviços ligados ao helper (somente fluxos WPPConnect/server-side):

- `whatsappRemindersService` (enqueue da fila)
- `whatsappAutoAplicacaoService`
- `whatsappPacienteCadastroLinkService`
- `whatsappNutriCheckInQueue`
- `cobrancaAutomaticaWhatsappService`
- `financeiroCobrancaWhatsappService`
- `calendarioLembreteWhatsappService` (`extrairTelefonePacienteDoc`; `telefoneAviso` livre continua legado)
- `boasVindasTratamentoWhatsappService` (doc; fallback da solicitação continua legado)
- `compartilhamentoAceiteWhatsappService`
- `nutriWelcomeWhatsappService`
- `pacienteCanalChatNotifyCore`
- `examesLaboratoriaisPacienteNotifyService`
- `cardapioPacienteNotifyService`
- `lib/metaadmin/agenda/consultaReminderService`
- `lib/nutri/agenda/consultaReminderService`
- `canalChatInboundService` (doc + JID inbound via `assertCanonicalWhatsappPhone`)

**Não alterados (proposital):**

- avisos ao **médico** (`solicitacaoMedicoAvisoWhatsappService`, `prontuarioConsultaMedicoNotifyService`)
- `lib/contatochat/contatoChatPhone.ts` (`wa.me`)
- `backupwhatsapp/**`
- UI / anamnese / CRM client-side

---

## Fila `whatsapp_automation_queue`

A fila **já armazenava** `phone` normalizado no enqueue. O risco era o **consumidor** chamar `sendTestMessage` → `normalizeWhatsappPhone` de novo.

Correção:

1. Enqueue passa a gravar o canônico via `tryResolvePhoneFromPacienteDoc`.
2. Consumo (`whatsappRemindersService`) envia `item.phone` por `sendPatientAutomationWhatsapp`.
3. O router sempre chama `sendTestMessage(..., { phoneIsResolved: true })`.

| Item na fila | Consumo |
|--------------|---------|
| `17137326616` | `17137326616` — **não** prefixa 55 |
| `5583988192848` | `5583988192848` — filas BR antigas iguais |

Nenhuma migração de documentos da fila. Itens BR existentes já estão com DDI 55.

---

## Testes

Arquivo: `lib/whatsapp/resolveInternationalPhone.etapa15.spec.ts`  
(além de `resolveInternationalPhone.spec.ts` da Etapa 1)

| # | Caso | Esperado |
|---|------|----------|
| A | legado cru `83988192848` | `5583988192848` |
| B | mascarado `(83) 98819-2848` | `5583988192848` |
| C | DDI 55 + nacional | `5583988192848` |
| D | DDI 1 + `7137326616` | `17137326616` |
| E | EUA já resolvido no send | WPPConnect recebe `17137326616` |
| F | DDI 351 + `912345678` | `351912345678` |
| G | `telefoneE164` EUA | `17137326616` |
| H | `telefoneE164` BR | `5583988192848` |
| I | fila EUA | não adiciona 55 |
| J | fila antiga BR | permanece igual |

A tela de teste **sem** `phoneIsResolved` continua prefixando 55 em `17137326616` (comportamento legado documentado).

---

## Retrocompatibilidade

- Paciente antigo `{ telefone: "83988192848" }` → `5583988192848`.
- Nenhum campo novo obrigatório.
- Nenhuma escrita automática em Firestore.
- Nenhuma migração de documentos.
- Callers de `sendTestMessage(..., "83988192848")` **sem** a flag continuam Brasil.

---

## O que esta etapa **não** mudou

- UI de Identificação, anamnese, MetaPacienteWizard, ModalDadosPacienteChat
- seletor de país
- `wa.me`
- CRM client-side, MetaNutri / MetaPersonal / MetaPsi UI
- VM / Docker / WPPConnect (`infra/whatsapp`)
- documentos existentes do Firebase

---

## Risco residual (antes da Etapa 2)

A tela **TESTE DE ENVIO WHATSAPP** ainda não tem DDI. Número internacional digitado cru (11 dígitos) continua sendo tratado como Brasil. Isso é esperado até o seletor.

Número internacional **só** no campo `telefone` (sem `telefoneDdi` / `telefoneE164`) também cai no legado BR. A Etapa 2 precisa gravar DDI ou E164 na Identificação.
