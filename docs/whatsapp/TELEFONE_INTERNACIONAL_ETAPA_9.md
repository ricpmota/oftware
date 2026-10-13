# Telefone internacional — Etapa 9 (indicação + solicitação)

**Data:** 21 de setembro de 2026  
**Escopo:** internacionalizar **somente** indicação de paciente e solicitação de acompanhamento/médico. Sem inbound Canal Chat, sem paciente fora do fluxo criado pela solicitação, sem profissionais, sem leads fora da cópia solicitação→LeadMedico, sem white-label/mentoria, Instagram bio, ChatIA, `whatsappResponsavelPhone`, `whatsappContrato`, EasySign, VM, Docker, WPPConnect, `whatsapp_automation_queue`. Sem migração Firebase.

Anteriores: [`TELEFONE_INTERNACIONAL_ETAPA_8.md`](./TELEFONE_INTERNACIONAL_ETAPA_8.md).  
Auditoria de origem: [`AUDITORIA_WHATSAPP_TELEFONE_INTERNACIONAL.md`](../../AUDITORIA_WHATSAPP_TELEFONE_INTERNACIONAL.md).

---

## 1. Contratos encontrados

### Indicação

| Item | Valor |
|------|--------|
| Tipo | `types/indicacao.ts` `Indicacao` |
| Coleção | `indicacoes` |
| Serviço | `services/indicacaoService.ts` |
| Campo nacional | `telefonePaciente` (pessoa indicada; matching) |
| Quem indicou | `indicadoPorTelefone?` — snapshot do ident do paciente logado, **não** é input manual |
| UI `/meta` aba Encaminhar | **share-link** (`/dr/{medico}/paciente/{indicador}`). O formulário antigo `handleSalvarIndicacao` + máscara 10/11 **não é renderizado** |
| Telefone vivo da pessoa indicada | `/dr/[...slug]` e, se o indicado já está no META, modal de solicitação |
| Matching | `getIndicacaoPorTelefone` → `findMatchingIndicacao` (canônico derivado) |
| virouVenda | `PacienteService.createOrUpdatePaciente` no **create** de `pacientes_completos` |
| CRM | `buildIndicacaoByPhoneMap` / `findIndicacaoForLead` |
| wa.me | MetaAdmin Encaminhados via `buildIndicacaoWhatsappUrl` |

### Solicitação

| Item | Valor |
|------|--------|
| Tipo | `types/solicitacaoMedico.ts` `SolicitacaoMedico` |
| Coleção | `solicitacoes_medico` |
| Serviço | `services/solicitacaoMedicoService.ts` |
| Campo nacional | `pacienteTelefone?` |
| UI | `/meta` “Seu telefone” / “Seu número de telefone” (dois modais); `/dr/[...slug]` “Seu número de telefone”; chat inicial **copia ident** (já internacionalizado nas Etapas 2–3) |
| Criação de paciente | `/dr` e `executarEnvioSolicitacaoMedico` em `/meta` quando ainda não há `pacientes_completos` |
| LeadMedico | `pickLeadMedicoPhoneWrite` em `lib/metaadmin/loadLeadsMedicoData.ts` |
| Boas-vindas | `services/boasVindasTratamentoWhatsappService.ts` |
| Aviso ao médico | `solicitacaoMedicoAvisoWhatsappService` — destino **médico** (Etapa 7; não reaberto) |
| wa.me | MetaAdmin Encaminhados + carrossel |

Não é contrato desta etapa: EasySign `telefonePaciente`, backups (`pagebackup`, `app - Copia`), inbound Canal Chat.

---

## 2. Coleções

Somente documentos **novos ou regravados**. Sem backfill.

| Coleção | Campos novos (opcionais) |
|---------|--------------------------|
| `indicacoes` | `telefonePacienteDdi?`, `telefonePacientePais?`, `indicadoPorTelefoneDdi?`, `indicadoPorTelefonePais?` |
| `solicitacoes_medico` | `pacienteTelefoneDdi?`, `pacienteTelefonePais?` |
| `pacientes_completos` | DDI/país só quando a solicitação **cria** o paciente (campos já existentes da Etapa 2) |
| `leads_medico` | DDI/país copiados da solicitação quando não há ident (campos já existentes da Etapa 8) |

`telefoneE164` **não** é gravado. Chave canônica **não** é persistida.

---

## 3. Campos adicionados

Padrão nacional + DDI opcional. Nunca concatenar DDI em `telefonePaciente` / `pacienteTelefone`.

US novo:

```json
{ "telefonePaciente": "7137326616", "telefonePacienteDdi": "1", "telefonePacientePais": "US" }
```

BR legado:

```json
{ "telefonePaciente": "83988192848" }
```

---

## 4. UI indicação

A aba Encaminhar em `/meta` **não** coleta telefone da pessoa indicada: gera link. Restaurar o form antigo seria redesenho — fora do escopo.

O telefone da pessoa indicada é coletado em:

- `app/dr/[...slug]/page.tsx` — `InternationalPhoneInput`, Brasil default.

`handleSalvarIndicacao` (código morto) passou a validar com `isValidIdentificacaoPhone` e persistir DDI **se** for reativado, sem recriar o form.

---

## 5. UI solicitação

`InternationalPhoneInput` existente, Brasil default, layout mantido:

| Superfície | Arquivo |
|------------|---------|
| Modal “Seu telefone” | `app/meta/page.tsx` |
| Modal “Seu número de telefone” | `app/meta/page.tsx` |
| Página pública do médico | `app/dr/[...slug]/page.tsx` |

**Decisão de prefill (item 13):** se o paciente logado já tem `dadosIdentificacao.telefone` (+ DDI/país), `abrirModalMedico` **preenche** o campo e o deixa visível. O chat inicial **não pede de novo**: `onCreateSolicitacao` copia ident via `solicitacaoPhoneWriteFieldsFromIdent`. Não escondemos o input no modal para não alterar a UX de quem ainda não tem ident.

Validação: `isValidIdentificacaoPhone`. Mensagem: `Informe um número de telefone válido.` Sem 10/11 dígitos / DDD / 9º dígito / `slice(0,11)` nesses fluxos.

---

## 6. Validação

Removida a regra universal 10/11 do fluxo de indicação (`validarTelefone` morto) e das UIs vivas de solicitação. Portugal 9 dígitos + 351 passa.

---

## 7. Matching indicação ↔ paciente

**Não** há query Firestore em telefone. Estratégia real (inalterada em escala):

1. Fast-path: `where('status', 'in', ['pendente', 'visualizada'])` — carrega candidatos.
2. Comparação client-side: `findMatchingIndicacao` → `resolveInternationalPhone` em ambos os lados.

Não foi criada chave persistida nem índice novo. Se o volume de pendentes crescer a ponto de precisar de canonical persistido, isso é decisão futura (migração) — **não** nesta etapa.

CRM: `buildIndicacaoByPhoneMap` indexa o canônico derivado. Nacional só entra no mapa se a indicação **não** tem DDI (legado), evitando colisão US `7137326616+1` vs BR `7137326616`.

---

## 8. virouVenda

`createOrUpdatePaciente` (novo doc) chama `getIndicacaoPorTelefone(ident)` com `telefone` + `telefoneDdi` do ident. US/PT casam com indicação estruturada. BR legado casa com indicação sem DDI. Sem regressão do matching nacional-only antigo para pares legado↔legado.

---

## 9. Solicitação → paciente

Criação (`/dr`, `/meta` executarEnvio): `identPhoneWriteFieldsFromSolicitacao` → `dadosIdentificacao.telefone` nacional + DDI/país opcionais. Nunca `17137326616` no campo nacional.

Aceite MetaAdmin: `mergeIdentPhonePreferExisting` — ident estruturado prevalece; senão copia a solicitação com DDI.

---

## 10. Solicitação → lead

`pickLeadMedicoPhoneWrite`: ident do paciente primeiro; senão `identPhoneWriteFieldsFromSolicitacao`. US/PT da solicitação chegam a `LeadMedico.telefone` + `telefoneDdi` + `telefonePais`.

---

## 11. Boas-vindas

Ordem:

1. Doc do paciente (`tryResolvePhoneFromPacienteDoc`)
2. Solicitação estruturada (`tryResolveSolicitacaoPhone`)
3. Solicitação legado BR (mesmo helper: sem DDI → Brasil)

Fallback US sem paciente: `7137326616` + `1` → `17137326616`. Envio já usa `sendPatientAutomationWhatsapp` com `phoneIsResolved: true`. Removido `normalizeWhatsappPhone` deste serviço.

---

## 12. wa.me

| Origem | Helper |
|--------|--------|
| Indicação (paciente indicado) | `buildIndicacaoWhatsappUrl` |
| Quem indicou | `buildIndicadoPorWhatsappUrl` |
| Solicitação | `buildSolicitacaoWhatsappUrl` |

Todos delegam a `buildWhatsappUrl` + `resolveInternationalPhone`. Nenhum `55${telefonePaciente}`.

Display com DDI: `formatIndicacaoPacientePhoneDisplay` / `formatSolicitacaoPhoneDisplay`. Legado sem DDI: máscara BR nacional, sem inventar bandeira.

---

## 13. indicadoPorTelefone

Snapshot informativo do ident de quem compartilhou o link (display, wa.me de “quem encaminhou”, `sourceContact` do referral). **Não** entra no matching da pessoa indicada. Sem input manual extra. Quando o ident do indicador tem DDI, o snapshot grava `indicadoPorTelefoneDdi` / `indicadoPorTelefonePais`.

---

## 14. Legado

Indicação `{ telefonePaciente: "83988192848" }` e solicitação `{ pacienteTelefone: "83988192848" }` = Brasil. Abrir/listar **não** grava DDI. Sem migração. virouVenda legado↔legado continua.

---

## 15. Hardcodes restantes (auditoria)

| Ocorrência | Classificação |
|------------|----------------|
| `handleSalvarIndicacao` (não renderizado) | internacionalizado no persist/validação; UI morta |
| EasySign `telefonePaciente` | fora do escopo |
| `telefonePacienteAplic` / conclusão de aplicação no MetaAdmin | paciente/aplicação, fora do escopo |
| Backups `pagebackup` / `app - Copia` | morto/backup |
| `formatPhoneNumber` local em Encaminhados | display legado de fallback se helper vazio |
| Inbound Canal Chat | fora do escopo (Etapa 10+) |
| Aviso ao médico | internacionalizado na Etapa 7; destino = profissional |

Nenhum envio internacional de indicação/solicitação ignora DDI nos caminhos vivos.

---

## 16. Testes

`lib/whatsapp/telefoneInternacionalEtapa9.spec.ts` — A–AB conforme o briefing (indicação, matching, virouVenda, solicitação, paciente, lead, boas-vindas, wa.me, aviso, regressão 1–8).

---

## 17. Ausência de migração

Nenhum script de backfill, nenhum índice novo, nenhum campo `canonical` persistido. Docs antigos sem DDI continuam válidos.

---

## 18. VM / WPPConnect

Inalterados (`infra/whatsapp/**`).
