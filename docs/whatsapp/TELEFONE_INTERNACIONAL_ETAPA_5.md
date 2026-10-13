# Telefone internacional — Etapa 5 (tela TESTE DE ENVIO WHATSAPP)

**Data:** 21 de setembro de 2026  
**Escopo:** seletor internacional na tela de teste de envio. Sem pacientes, anamnese, Identificação, `wa.me`, fila, inbound, cadastros de profissional, VM, Docker ou migração Firebase.

Anteriores: [`TELEFONE_INTERNACIONAL_ETAPA_4.md`](./TELEFONE_INTERNACIONAL_ETAPA_4.md).

---

## Decisão de contrato

O browser **não** envia `phoneIsResolved`.  
O browser **não** envia `telefoneE164`.

Payload da tela:

```ts
{
  doctorId: string;
  telefone: string;      // nacional
  telefoneDdi: string;   // "55" | "1" | "351" | …
  telefonePais: string;  // "BR" | "US" | "PT" | …
  message: string;
}
```

Fonte da verdade: **servidor**.

```
UI (InternationalPhoneInput + isValidIdentificacaoPhone)
  → POST estruturado
  → resolveWhatsappTestDestination({ telefone, telefoneDdi })
       = resolveInternationalPhone(...)   // ignora E164 do client
  → sendTestMessage(..., { phoneIsResolved: true })
  → POST /api/:session/send-message   (WPPConnect, inalterado)
```

`telefonePais` vai no body para auditoria/UI; **não** deriva DDI na resolução.

`/api/metaadmin/whatsapp/send-test` (tela do médico, sem seletor nesta etapa) continua enviando `phone`. O serviço mapeia para `{ telefone: phone }` sem DDI = legado BR.

---

## UI

`DoctorWhatsAppTestPanel` em `components/metaadmingeral/automacoes/AutomacoesDashboardPanel.tsx`.

Campo antigo (`Telefone de destino` + `type="tel"`) substituído por `InternationalPhoneInput` (`variant="dark"`). Sem segundo seletor. Sem redesign.

Default ao abrir: 🇧🇷 +55.

Estado só na tela (não vai para Firestore de paciente/médico/conexão):

```ts
{ telefone: "", telefoneDdi: "55", telefonePais: "BR" }
```

Botão **Enviar teste** desabilitado se `!isValidIdentificacaoPhone`.

---

## Segunda normalização

O serviço **não** chama `normalizeWhatsappPhone`.  
Resolve uma vez e marca `phoneIsResolved: true`.  
`17137326616` não recebe `55`.

---

## Validação

`isValidIdentificacaoPhone` / `libphonenumber-js` (já da Etapa 2).  
Não valida por 10/11 dígitos.

| País | Nacional | Canônico |
|------|----------|----------|
| BR +55 | 83988192848 | 5583988192848 |
| US +1 | 7137326616 | 17137326616 |
| PT +351 | 912345678 | 351912345678 |

---

## Mensagem de erro WPP

O check `numberExists === false` e o mapeamento `userFacingSendError` (número inexistente) são **compartilhados** com automações de paciente, já internacionais desde a 1.5.

Impacto avaliado: o texto antigo (“DDI+DDD+9º dígito”) estava errado para EUA/PT também nesses fluxos.

Texto único, neutro:

> O número informado não está disponível no WhatsApp. Confira o país e o número informado.

Outras mensagens (sessão instável, QR, etc.) não mudaram.

---

## Persistência

Nada gravado em `pacientes_completos`, `medicos` ou `whatsappConnections` a partir desta tela.

O log de mensagem de teste (`registrarWhatsappMessageLog`, tipo `test`) já existia e continua registrando o **canônico** após o envio — não grava DDI/país.

---

## Arquivos

| Arquivo | Mudança |
|---------|---------|
| `lib/whatsapp/resolveWhatsappTestDestination.ts` | **Novo** — resolve só telefone+DDI |
| `lib/whatsapp/resolveWhatsappTestDestination.spec.ts` | **Novo** — A–K |
| `components/metaadmingeral/automacoes/AutomacoesDashboardPanel.tsx` | `InternationalPhoneInput` |
| `app/api/metaadmingeral/automacoes/whatsapp/send-test/route.ts` | body estruturado |
| `services/whatsappSendTestService.ts` | resolve no server + `phoneIsResolved: true` |
| `services/whatsappProviderClient.ts` | mensagem número inexistente (neutra) + comentário da flag |
| `lib/whatsapp/resolveInternationalPhone.etapa15.spec.ts` | wiring da tela de teste atualizado |

Não alterados: `infra/whatsapp`, Docker, VM, fila, inbound, Identificação, anamnese, `wa.me`.

---

## VM / WPPConnect

O POST `/send-message` é o mesmo. Chegam:

- BR `5583988192848`
- US `17137326616`
- PT `351912345678`
