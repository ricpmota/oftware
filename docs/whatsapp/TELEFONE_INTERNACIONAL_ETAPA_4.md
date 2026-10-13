# Telefone internacional — Etapa 4 (links manuais wa.me)

**Data:** 21 de setembro de 2026  
**Escopo:** fonte única para `https://wa.me/{canonico}` e rewire dos callers **vivos**. Sem WPPConnect, VM, Docker, fila, anamnese, `InternationalPhoneInput`, tela TESTE DE ENVIO, inbound Canal Chat ou migração Firebase. Sem seletor de país em CRM/médicos/nutri/personal/psi/leads.

Anteriores: [`TELEFONE_INTERNACIONAL_ETAPA_3.md`](./TELEFONE_INTERNACIONAL_ETAPA_3.md).

---

## 1. Helper central

Arquivo: `lib/phone/buildWhatsappUrl.ts`

| Função | Papel |
|--------|--------|
| `buildWhatsappUrl({ telefone, telefoneDdi, telefoneE164 }, message?)` | Monta `https://wa.me/{digitos}`. Mensagem via `encodeURIComponent`. Inválido/vazio → `null`. |
| `buildPatientWhatsappUrl(paciente, message?)` | Lê `dadosIdentificacao.telefone` + `telefoneDdi` + `telefoneE164` (fallback `paciente.telefone`). |
| `phoneFieldsFromPaciente` | Extrai os três campos sem a tela conhecer a regra. |
| `resolveWhatsappCanonicalDigits` | Dígitos ou `null` (engole `InternationalPhoneError`). |

Internamente **só** chama `tryResolveInternationalPhone` (`lib/whatsapp/resolveInternationalPhone.ts`). Não duplica DDI, legado BR, 9º dígito, E164 nem limpeza.

Path: somente dígitos canônicos (sem `+`, espaços, parênteses, hífens).  
`telefonePais` **não** entra no wa.me.

---

## 2. wa.me alterados (vivos)

Não foi feito replace cego `wa.me/55` → `wa.me/`. Cada caller passou pelo helper.

### A. Paciente (DDI/E164 estruturado)

| Superfície | Arquivo |
|------------|---------|
| Lista / cards / depoimento / aplicação / conclusão / pagamento / aniversário / calendário desktop+mobile | `app/metaadmin/page.tsx` |
| Lista pacientes MetaNutri + boas-vindas | `app/metanutri/page.v2.tsx`, `components/metanutri/MetanutriPacienteWelcomeActions.tsx` |
| Lista pacientes MetaPersonal | `app/metapersonal/page.v2.tsx` |
| Lista MetaPsi | `components/metapsi/MetaPsiPacientesPanel.tsx` |
| Aniversário calendário profissional | `components/profissional/ProfissionalCalendarioSection.tsx` |
| Métricas mobile do prontuário | `lib/paciente/patientDetailsMobileMetrics.ts` |
| Lista vínculo nutri/personal | `components/metaadmin/PacienteVinculoListItem.tsx` |
| Check-in semanal (href + extração) | `lib/nutri/buildNutriCheckInWhatsAppMessage.ts`, `lib/nutri/openNutriCheckInWhatsApp.ts`, `useWeeklyNutritionCheckInCalendar.ts`, `CheckInSemanalNutriWeekPicker.tsx` |
| Welcome nutri (número já canônico do extractor) | `lib/nutri/agenda/welcomeMessage.ts` (`telefoneE164`) |
| CRM 360 / presets | `lib/paciente360/paciente360WhatsAppMessages.ts`, `Paciente360QuickActions`, `Paciente360SheetHeader`, `LeadWhatsAppPresetModal` |
| CRM profissional (paciente vinculado) | `components/crm/profissional/LeadsProfissionalPipelineCard.tsx` |
| `getLeadPhoneDigits` | Prefere ident do paciente; senão lead com legado BR |

### B. Médico / profissional (sem `telefoneDdi` no contrato)

`buildWhatsappUrl({ telefone })` = fallback legado BR.

| Superfície | Arquivo |
|------------|---------|
| Médico no MetaNutri / MetaPersonal | `page.v2.tsx` |
| Personal / nutri no Metaadmin | `app/metaadmin/page.tsx` |
| Nutri / personal / psi + detalhes | `app/metaadmingeral/page.tsx` |
| Cotação / card do médico em `/meta` | `app/meta/page.tsx` |
| Dr. provisório | `PublicDoctorQuickInfo.tsx` |
| Instagram hub | `lib/instagram/medicoWhatsAppUrl.ts` |
| Bio Instagram (armazenamento BR) | `normalizeInstagramBioWhatsApp` via resolver |

### C. Lead

| Superfície | Comportamento |
|------------|----------------|
| CRM médico 360 | Ident do paciente se existir; senão `lead.telefone` legado BR |
| CRM profissional | Idem |
| Metaadmingeral lista de leads | `buildWhatsappUrl({ telefone: lead.telefone })` — lead **sem DDI** |
| White-label lead URL | `getLeadWhiteLabelWhatsAppUrl` → helper; `normalizeLeadWhiteLabelWhatsApp` continua BR-only para máscara/cadastro |

### D. White-label / marketing (número já canônico)

`oftwareWhatsAppCta`, `instagramFounderWhatsApp`: `telefoneE164: 5583988192848`. Textos **inalterados**.

`rafaela-albuquerque/siteConfig.ts`: landing jurídica com E164 fixo `5583987700107` — **não alterado** (número já completo, fora do produto de pacientes).

### E. Share sem número (`wa.me/?text=`)

Mantidos de propósito (não há destinatário): `/meta` share, Aplicação, Conclusão, Marco Zero, `CanalChatShareButton`.

---

## 3. Callers que passaram a usar resolução internacional

Todos os da tabela A. Check-in passa `phoneFields` (DDI/E164) para não reaplicar 10/11=BR em `17137326616`.

Canal Chat `buildContatoChatWhatsAppUrl`: dígitos **já canônicos** da conexão → `telefoneE164`. Inbound/WPP **não** mudaram.

---

## 4. `wa.me/55` / `` `55${` `` que permaneceram

### Vivos — nenhum `wa.me/55${variavel}`

Busca pós-implementação: **zero** ocorrências vivas de `wa.me/55${`.

### Prefixador `55` que resta (não é wa.me de paciente)

| Ocorrência | Classificação | Motivo |
|------------|---------------|--------|
| `cleanPhoneBr` | entidade / helper BR-only | Ainda usado em teste de máscara CRM. **Não** monta mais wa.me de paciente. |
| `normalizeLeadWhiteLabelWhatsApp` | lead white-label sem DDI | Máscara/cadastro BR. URL passou pelo helper. |
| `lib/whatsapp/canalChatInboundMessage.ts` variantes `55${}` | inbound — fora desta etapa | Matching de chat. Não mexer. |
| `services/whatsappProviderClient.ts` | WPPConnect — fora desta etapa | Pipeline de envio. Não mexer. |
| CTA fallback `wa.me/5583988192848` | intencionalmente brasileiro | Número comercial Oftware já canônico (só fallback se o helper retornar null). |
| Specs `https://wa.me/5583…` / `5511…` | testes de regressão BR | Esperado. |
| `app/metaadmin/page.backup*`, `pagebackup*`, `app - Copia/` | legado morto/backup | Não alterar. |

---

## 5. Entidades ainda sem DDI estruturado (Brasil-only)

Não foi criado seletor de país nestes cadastros (Etapa futura, se necessário):

| Entidade | Contrato | wa.me nesta etapa |
|----------|----------|-------------------|
| `Medico` | `telefone?: string` | legado BR |
| Nutricionista / Personal / Psiquiatra | `telefone` nacional | legado BR |
| `LeadMedico` / `LeadProfissional` / `types/lead.ts` | só `telefone` | legado BR, **exceto** quando há paciente vinculado com ident |
| Lead white-label | WhatsApp nacional BR | legado BR |
| Instagram bio do médico | WhatsApp nacional BR | legado BR |
| Indicação / solicitação (`telefonePaciente` string) | sem DDI no objeto | legado BR |
| Canal Chat (telefone da conexão) | já canônico / BR | `telefoneE164`; inbound intocado |

Paciente (`DadosIdentificacao`) **já tem** `telefoneDdi` / `telefoneE164` / `telefonePais` desde as Etapas 1–3.

---

## 6. Testes

`lib/phone/buildWhatsappUrl.spec.ts` — A–I obrigatórios + J regressão das Etapas 1–3.

Também: CRM 360 com ident EUA; specs existentes de welcome, check-in (`11999998888` ainda via `{ telefone }` = legado BR), contato chat, paciente360 BR.

---

## 7. Retrocompatibilidade

Paciente antigo:

```ts
{ telefone: "83988192848" }  // sem telefoneDdi
```

→ `https://wa.me/5583988192848`

Ausência de DDI continua significando Brasil.

Paciente EUA:

```ts
{ telefone: "7137326616", telefoneDdi: "1" }
```

→ `https://wa.me/17137326616` (nunca `55…`).

---

## 8. WPPConnect / VM / Firebase

**Não alterados.** Sem `infra/whatsapp`, Docker, `sendTestMessage`, `whatsappPatientSendRouter`, `whatsapp_automation_queue`, inbound, migração.

Mensagens/textos/templates/emojis/CTAs: **somente o destino do link** mudou.

---

## Riscos antes da Etapa 5

- Leads **órfãos** (sem paciente) e profissionais continuam BR-only: um número dos EUA cadastrado só em `lead.telefone` ainda recebe 55.
- Indicação/solicitação guardam telefone em string solta — sem DDI.
- `cleanPhoneBr` / `normalizeLeadWhiteLabelWhatsApp` ainda prefixam 55 se alguém as reutilizar como “WhatsApp universal”.
- Share `wa.me/?text=` não escolhe destinatário (comportamento antigo).
- Extração da fila WPPConnect já estava na 1.5; Etapa 4 não cobre envio automático.
