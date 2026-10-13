# Telefone internacional — Etapa 8 (leads)

**Data:** 21 de setembro de 2026  
**Escopo:** internacionalizar **somente** contratos de lead. Sem paciente, profissionais da Etapa 7, indicação, `solicitacao.telefonePaciente`, inbound Canal Chat, EasySign, VM, Docker, WPPConnect, `whatsapp_automation_queue`, `telefoneAviso`, CTA comercial Oftware. Sem migração Firebase.

Anteriores: [`TELEFONE_INTERNACIONAL_ETAPA_7.md`](./TELEFONE_INTERNACIONAL_ETAPA_7.md).  
Auditoria de origem: [`AUDITORIA_WHATSAPP_TELEFONE_INTERNACIONAL.md`](../../AUDITORIA_WHATSAPP_TELEFONE_INTERNACIONAL.md).

---

## 1. Contratos reais de lead encontrados

| Entidade | Tipo | Coleção | Campo telefone | Origem | UI criação | UI edição | WhatsApp | Matching |
|----------|------|---------|----------------|--------|------------|-----------|----------|----------|
| LeadMedico | `types/leadMedico.ts` | `leads_medico` | `telefone?` | cadastro paciente, cópia de solicitação, CRM | sem form de telefone próprio | sem editor de telefone no CRM | presets + `tel:` via `getLeadPhoneFields` | e-mail+médico; indicação por chave canônica |
| LeadProfissional | `types/leadProfissional.ts` | `leads_nutri` / `leads_personal` / `leads_psiquiatra` | `telefone?` | sync do paciente compartilhado | nenhuma (sync) | nenhuma | pipeline prefere paciente, senão lead | `vinculoId` |
| LeadWhiteLabel | `types/leadWhiteLabel.ts` | `leadsWhiteLabel` | `whatsapp` | landing pública + `POST /api/whitelabel/leads` + meeting | `WhiteLabelLeadPageClient` | CRM display (sem editor de número) | `buildLeadWhatsappUrl` / notify reunião | e-mail ou canônico vs cadastro onboarding |
| Lead (MetaAdmin Geral) | `types/lead.ts` | `leads` | `telefone?` | sync usuários Firebase (paciente ident ou médico) | nenhuma | nenhuma | `buildWhatsappUrl(phoneFieldsFromLead)` | `uid` |
| Mentoria | payload em `app/api/lead/route.ts` | `leads_mentoria` | `whatsapp` | `MentoriaLeadModal` | landing modal | nenhuma | e-mail interno | nenhum |

Não é contrato desta etapa:

- `settings.whatsappResponsavelPhone` — configuração do responsável da agenda white-label, não lead.
- `instagramBio.whatsapp` — CTA/perfil do médico.
- ChatIA Rafaela — formulário público + transcript; **não** cria LeadMedico / LeadProfissional / white-label.
- `whatsappContrato` do cadastro onboarding white-label — profissional/cadastro, não lead.

---

## 2. Coleções / campos adicionados

Somente documentos **novos ou regravados**. Sem backfill em massa.

| Coleção | Campos novos (opcionais) |
|---------|--------------------------|
| `leads_medico` | `telefoneDdi?`, `telefonePais?` |
| `leads_nutri` | `telefoneDdi?`, `telefonePais?` |
| `leads_personal` | `telefoneDdi?`, `telefonePais?` |
| `leads_psiquiatra` | `telefoneDdi?`, `telefonePais?` |
| `leads` (MAG) | `telefoneDdi?`, `telefonePais?` |
| `leadsWhiteLabel` | `whatsappDdi?`, `whatsappPais?` (`whatsapp` continua nacional; legado pode ter 55 prefixado) |
| `leads_mentoria` | `whatsappDdi?`, `whatsappPais?` |

`telefoneE164` **não** é gravado.

Lead antigo `{ telefone: "83988192848" }` continua válido = Brasil.

---

## 3. Helper de extração

`lib/whatsapp/resolveLeadPhone.ts` — **não** é um resolver novo. Só adapta o contrato de lead a `resolveInternationalPhone` / `buildWhatsappUrl` / `buildTelHref`.

| Função | Papel |
|--------|--------|
| `phoneFieldsFromLead` | `telefone` ou `whatsapp` + DDI equivalente |
| `tryResolvePhoneFromLeadDoc` | canônico ou null |
| `leadPhoneWriteFields` | grava DDI só se já veio no payload |
| `persistWhiteLabelWhatsAppFromPayload` | DDI estruturado **ou** legado `normalizeLeadWhiteLabelWhatsApp` |
| `leadCanonicalMatchKey` / `leadsPhonesMatch` | comparação canônica (não persistida) |
| `leadPhoneWriteFieldsFromIdent` | paciente → lead sem concatenar DDI em `telefone` |
| `buildLeadWhatsappUrl` / `buildLeadTelHref` | URLs |

---

## 4. Formulários internacionalizados

Reuso de `InternationalPhoneInput` existente. Brasil default 🇧🇷 +55.

| Superfície | Arquivo |
|------------|---------|
| Landing white-label (passo WhatsApp) | `components/whitelabel/WhiteLabelLeadPageClient.tsx` |
| Mentoria (modal público, variant `dark`) | `components/mentoria/MentoriaLeadModal.tsx` |

LeadMedico / LeadProfissional / MAG `leads` **não** têm formulário manual de telefone — o número vem de paciente/sync.

Validação: `isValidIdentificacaoPhone` (Portugal 9 dígitos + 351 válido). Sem 10/11 dígitos universais nessas UIs.

---

## 5. Landing pages afetadas

- **White-label** (`WhiteLabelLeadPageClient`): cria `leadsWhiteLabel`. Input BR mascarado substituído por `InternationalPhoneInput`. Layout do wizard, UTMs/`origemCampanha`, tracking e steps preservados.
- **Mentoria** (`MentoriaLeadModal` → `leads_mentoria`): idem, variant dark.
- **ChatIA Rafaela**: **não** alterada (não cria os contratos desta etapa).
- **Cadastro onboarding** (`whatsappContrato`): **não** alterado.

---

## 6. APIs

| Endpoint | Comportamento |
|----------|----------------|
| `POST /api/whitelabel/leads` | Prefere `whatsapp` + `whatsappDdi` + `whatsappPais`. Legado só `whatsapp` → `normalizeLeadWhiteLabelWhatsApp` (55 prefixado, Brasil). |
| `submitWhiteLabelLeadWithMeeting` | Igual. |
| `POST /api/lead` (mentoria) | Payload estruturado opcional; legado sem DDI = Brasil. |

Servidor valida/resolve. Não confia em número concatenado do browser quando há DDI.

---

## 7. CRM

- CRM médico 360: `getLeadPhoneFields` prefere `dadosIdentificacao` do paciente vinculado; senão lead com DDI.
- Pipeline médico/profissional: `buildTelHref` / `buildWhatsappUrl` com campos estruturados.
- White-label CRM: display `formatLeadWhiteLabelContactDisplay`; link wa.me no sheet; busca inclui canônico.
- `cleanPhoneBr` **não** é mais usado em tel:/wa.me de lead. A função permanece em `paciente360WhatsAppMessages.ts` (spec legado) — **não apagada**.

---

## 8. wa.me

Todos os leads internacionalizados usam `buildWhatsappUrl` / `buildLeadWhatsappUrl`.

| Caso | URL |
|------|-----|
| US `7137326616` + DDI `1` | `https://wa.me/17137326616` |
| PT `912345678` + `351` | `https://wa.me/351912345678` |
| BR legado `83988192848` sem DDI | `https://wa.me/5583988192848` |

Nenhum caller de lead internacional concatena `55`.

---

## 9. tel:

`buildTelHref` / `buildLeadTelHref`:

- US → `tel:+17137326616`
- PT → `tel:+351912345678`
- BR legado → `tel:+5583988192848`

---

## 10. Display

Onde o lead tem DDI estruturado: `formatInternationalPhoneDisplay` / `formatLeadWhiteLabelContactDisplay` (ex.: 🇺🇸 +1 …). Cards não foram redesenhados. White-label legado sem DDI continua na máscara BR de `formatLeadWhiteLabelWhatsAppDisplay`.

---

## 11. Matching / deduplicação

- Chave: `leadCanonicalMatchKey` = saída de `resolveInternationalPhone` (não persistida).
- Com DDI nos dois lados: compara canônico.
- Sem DDI: fallback Brasil.
- `7137326616` BR legado ≠ `7137326616` + DDI `1` (US).
- `matchLeadCadastro`: deixa de usar `normalizeLeadWhiteLabelWhatsApp` no lead com DDI; cadastro onboarding (`whatsappContrato`) continua BR-only.
- `findIndicacaoForLead`: lookup canônico. Indicação em si **não** foi internacionalizada; o mapa também indexa o canônico BR do `telefonePaciente` para não perder match legado.

---

## 12. Conversão lead → paciente

**Não existe** fluxo que crie `pacientes_completos` a partir de LeadMedico / LeadProfissional / white-label / mentoria.

O inverso **paciente → LeadMedico** (`createLeadFromPacienteCadastro` + sync profissional) **copia** `telefoneDdi` / `telefonePais`. Nunca grava `17137326616` dentro de `telefone`.

---

## 13. White-label

- Novo doc: `whatsapp` nacional + `whatsappDdi` / `whatsappPais`.
- Legado: `whatsapp` pode já vir `55…` sem DDI → Brasil via `resolveInternationalPhone`.
- `normalizeLeadWhiteLabelWhatsApp` **não** é mais a fonte universal do WhatsApp do lead. Resta para: payload legado da API; cadastro onboarding (`whatsappContrato`, fora do escopo).
- `whatsappResponsavelPhone`: **fora**. Ramo responsável do notify continua legado BR.

---

## 14. WhatsApp automático

`notifyWhiteLabelMeetingWhatsApp`:

- **Lead:** `tryResolvePhoneFromLeadDoc` → `sendTestMessage(..., { phoneIsResolved: true })`. US/PT não recebem 55.
- **Responsável:** `settings.whatsappResponsavelPhone` inalterado (sem `phoneIsResolved`).

---

## 15. Lazy backfill

Abrir lead legado sem editar **não** grava DDI. `leadPhoneWriteFields` / persist white-label só escrevem DDI se o payload já trouxer. Formulário novo BR, ao digitar no `InternationalPhoneInput`, persiste DDI 55.

---

## 16. Hardcodes restantes (lead / adjacentes)

| Item | Status |
|------|--------|
| `normalizeLeadWhiteLabelWhatsApp` | legado BR (API sem DDI + cadastro onboarding) |
| `cleanPhoneBr` | sem caller de lead internacional; não apagada |
| `whatsappResponsavelPhone` | BR-only (não é lead) |
| ChatIA Rafaela `leadPhoneInput` | BR-only (não cria lead desta etapa) |
| `instagramBio.whatsapp` | fora (perfil médico) |
| `whatsappContrato` | fora (cadastro profissional) |
| Indicação `telefonePaciente` | fora (Etapa 9+) |
| `solicitacao.pacienteTelefone` | fora; se não houver paciente ident, o lead copia só o nacional |

---

## 17. Testes

`lib/whatsapp/telefoneInternacionalEtapa8.spec.ts` — matriz A–X sobre os contratos reais.

Também regressão das Etapas 1–7 (suite WhatsApp/phone existente).

---

## 18. Ausência de migração Firebase

Nenhum script de migração. Docs antigos sem DDI continuam Brasil. Só writes novos/editados ganham `telefoneDdi` / `whatsappDdi`.

---

## 19. Ausência de alteração VM / WPPConnect

`infra/whatsapp`, Docker, VM e o provider WPPConnect **não** foram modificados nesta etapa. O envio automático do lead já internacionalizado entrega dígitos canônicos com `phoneIsResolved: true`.
