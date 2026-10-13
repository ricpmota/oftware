# Telefone internacional — Etapa 10 (inbound Canal Chat + auditoria final)

**Data:** 21 de setembro de 2026  
**Escopo:** matching inbound do Canal Chat internacional + auditoria final. Sem migração Firebase. Sem VM/Docker/WPPConnect. Sem ChatIA, `whatsappResponsavelPhone`, `instagramBio.whatsapp`, `whatsappContrato`, `telefoneEntrega`, EasySign. Outbound, paciente, profissionais, leads, indicação e solicitação **não** foram reabertos.

Anteriores: [`TELEFONE_INTERNACIONAL_ETAPA_9.md`](./TELEFONE_INTERNACIONAL_ETAPA_9.md).  
Auditoria de origem: [`AUDITORIA_WHATSAPP_TELEFONE_INTERNACIONAL.md`](../../AUDITORIA_WHATSAPP_TELEFONE_INTERNACIONAL.md).

---

## 1. Fluxo inbound antes

```
WPPConnect JID / senderPn
  → extractInboundPhone (dígitos 10–15)
  → canonicalizeInboundPhone = assertCanonicalWhatsappPhone
      (não prefixa 55; 9º dígito só se já começa com 55)
  → phoneLookupVariants (heurística BR 10/11)
  → Firestore IN em:
       canalChatPhoneKey
       dadosIdentificacao.telefone
       telefone (raiz)
  → phonesLikelyMatch (últimos 8 dígitos)
  → paciente
```

`phoneLookupVariants('17137326616')` gerava `17137326616` e `5517137326616` — **não** o nacional `7137326616`.  
Portugal `351912345678` não gerava `912345678`.

Com `canalChatPhoneKey` canônico: MATCH. Sem a chave: MISS para US/PT.

Além disso, `phonesLikelyMatch` pelos últimos 8 dígitos colidiria BR `557137326616` e US `17137326616`.

---

## 2. Problema US/PT

Paciente US `{ telefone: "7137326616", telefoneDdi: "1" }` não aparecia nas variants do inbound `17137326616`.  
Paciente PT `{ telefone: "912345678", telefoneDdi: "351" }` não aparecia nas variants de `351912345678`.

Não se adivinha país por comprimento. O inbound **já é canônico**.

---

## 3. Solução

Helper `lib/whatsapp/canalChatInboundPhoneMatch.ts`:

1. Canonicalizar inbound (`assertCanonicalWhatsappPhone`).
2. Fast-path: query `canalChatPhoneKey` com variants BR (inclui o canônico).
3. Parsear o canônico com **libphonenumber-js** (`+` + dígitos) → `callingCode` + `nationalNumber`.
4. Query `dadosIdentificacao.telefone` e root `telefone` com variants BR **+ nacional parseado**.
5. **Match final obrigatório:** `inboundPatientMatchesCanonical` = `tryResolvePhoneFromPacienteDoc(doc) === canonical` **ou** `canalChatPhoneKey` canônico/legado BR.

A query nacional só gera candidato. Sem `getDocs` da coleção inteira.

---

## 4. Parsing do canônico

`parseCanonicalWhatsappPhone` — não é um segundo resolver.

| Inbound | callingCode | nationalNumber |
|---------|-------------|----------------|
| `17137326616` | `1` | `7137326616` |
| `351912345678` | `351` | `912345678` |
| `5583988192848` | `55` | `83988192848` |

NANP: matching usa DDI `1` + nacional. `telefonePais` não é exigido.

PT nacional tem **9 dígitos** — o lookup de ident aceita o nacional parseado mesmo abaixo de 10 (mínimo 6). `canalChatPhoneKey` continua só com valores ≥ 10.

Não se infere “11 dígitos = EUA”.

---

## 5. Queries Firestore

Campos já usados (índices de campo único automáticos):

| Campo | Uso |
|-------|-----|
| `canalChatPhoneKey` | fast-path canônico + variants BR |
| `dadosIdentificacao.telefone` | legado BR + nacional parseado |
| `telefone` (raiz) | legado root |
| `canalChatChatId` | prioridade 1 (inalterada) |
| `pendingCanalChatAction.type` | fallback de cobrança pendente |

Cada query de telefone: `.limit(10)`.  
3 campos × 10 = **no máximo 30 documentos** por lookup de telefone.  
ChatId: até 5 IDs × `limit(5)`.  
Pending: só docs com ação de cobrança pendente (já era assim).

**Nenhum índice composto novo.**

---

## 6. Validação canônica final

```
inboundPatientMatchesCanonical(doc, inboundCanonical)
  1. canalChatPhoneKey → assertCanonical ou legado BR
  2. tryResolvePhoneFromPacienteDoc(doc) === inboundCanonical
```

`phonesLikelyMatch` **não** é mais usado no inbound (permanece no outbound / self-send).

---

## 7. Colisão BR × US

Mesmo nacional `7137326616`:

| Doc | Resolve | Inbound `17137326616` | Inbound `557137326616` |
|-----|---------|------------------------|-------------------------|
| BR legado sem DDI | `557137326616` | não | sim |
| US + DDI 1 | `17137326616` | sim | não |

Ambos podem voltar da query nacional; só o canônico passa.

---

## 8. canalChatPhoneKey

Escrita **existente** no aceite OK (`markPatientVerified`) e no outbound (`persistCanalChatInboundKeys`).

O **lookup não grava** a chave. Evita escrita inesperada só por ter sido encontrado. O próximo inbound US/PT sem key continua funcionando via nacional + validação. Depois do OK, a chave fica no fast-path como já era.

---

## 9. Legado

- Variants BR 10/11 em `phoneLookupVariants` **mantidas**.
- Root `telefone` sem DDI = Brasil via `tryResolvePhoneFromPacienteDoc`.
- Inbound `5583988192848` continua achando `{ telefone: "83988192848" }`.
- Chave armazenada como nacional BR ainda casa via `resolveLegacyBrazilWhatsappPhone`.

---

## 10. Testes inbound

`lib/whatsapp/telefoneInternacionalEtapa10.spec.ts` — A–O (parse, lookup nacional, matching, colisão, E164, root, NANP, inválido) + wiring + regressão de contratos.

---

## 11. Auditoria global (ocorrências vivas)

| Padrão | Classificação |
|--------|----------------|
| `55${` em `phoneLookupVariants` | **E inbound** — legado BR intencional |
| `55${` em `normalizeLeadWhiteLabelWhatsApp` | **F** — persistência legado landing |
| `55${` em `whatsappProviderClient` (sessão) | **H** — normalização da sessão WPP |
| `55${` em `cleanPhoneBr` | **F** CRM display/tel: legado |
| `55${` EasySign BRy | **G** integração BR-only |
| `wa.me/55` em backups | **I** morto |
| `normalizeWhatsappPhone(` provider + aviso médico fallback + contato chat + prontuário médico fallback | **B/F** legado após structured fail |
| `resolveLegacyBrazilWhatsappPhone` | **A/E** fallback ident/root e inbound key |
| `cleanPhoneBr` | **C/F** CRM; wa.me de lead já usa `buildWhatsappUrl` |
| `slice(0,11)` / `length === 10/11` em CPF, máscara display, variants BR | **F/display** — não é envio internacional |
| `telefoneDdi` / `telefonePais` / `phoneIsResolved` | contratos internacionalizados A–E |

Nenhum `55${` incorreto nos fluxos de paciente/profissional/lead/indicação/solicitação/inbound **internacionalizados**.

---

## 12. Hardcodes brasileiros restantes (vivos, corretos)

- CTA Oftware `wa.me/5583988192848`
- Variants inbound BR
- `normalizeWhatsappPhone` / `resolveLegacyBrazilWhatsappPhone` como legado
- Sessão WPPConnect
- EasySign `+55`
- `cleanPhoneBr` CRM
- Máscaras 10/11 de **display** e CPF
- `whatsappResponsavelPhone`, `whatsappContrato`, `telefoneEntrega`, Instagram bio, ChatIA

---

## 13. Riscos BR-only conhecidos

| Item | Ainda BR-only? | Permanecer? | Afeta WhatsApp internacional principal? | Etapa futura? | Risco |
|------|----------------|-------------|------------------------------------------|---------------|-------|
| `whatsappResponsavelPhone` | sim | sim (config agenda WL) | não (teste/responsável) | opcional | baixo |
| `instagramBio.whatsapp` | sim | sim (CTA médico) | não | opcional | baixo |
| `whatsappContrato` | sim (55 prefixado no cadastro WL) | sim por agora | matching cadastro×lead usa canônico se houver DDI no lead | opcional | médio |
| ChatIA Rafaela | sim | sim | não cria paciente/lead | opcional | baixo |
| `telefoneEntrega` | sim (máscara BR) | sim (entrega física) | não | opcional | baixo |
| EasySign BRy | sim | sim (API BR) | não envia WhatsApp Oftware | não | baixo |
| Fallback sessão WhatsApp | sim | sim | só sessão conectada | não | baixo |
| Lembretes: extractores já usam ident; fallback legado | estruturado + legado | sim | não se ident tiver DDI | não | baixo |
| Cards nacional cru | display | sim | não | polish | baixo |
| `cleanPhoneBr` | sim | tel:/CRM BR | wa.me lead já internacional | não | baixo |
| `normalizeLeadWhiteLabelWhatsApp` | legado landing sem DDI | sim | landing nova grava DDI | não | baixo |
| Matching indicação carrega todas pendentes | escala | sim nesta fase | US/PT casam canônico | se volume crescer | médio (escala, não correção de DDI) |

Nenhum desses **bloqueia** paciente/profissional/lead internacional no Canal Chat / fila / wa.me.

---

## 14. Matriz final

| DOMÍNIO | BR LEGADO | BR NOVO | US | PT | STATUS |
|---------|-----------|---------|----|----|--------|
| Paciente cadastro | OK | OK | OK | OK | OK internacional |
| Paciente anamnese | OK | OK | OK | OK | OK internacional |
| Paciente identificação | OK | OK | OK | OK | OK internacional |
| Paciente outbound | OK | OK | OK | OK | OK internacional |
| Paciente fila | OK | OK | OK | OK | OK internacional |
| Paciente wa.me | OK | OK | OK | OK | OK internacional |
| Paciente inbound | OK | OK | OK | OK | OK internacional |
| Profissional cadastro | OK | OK | OK | OK | OK internacional |
| Profissional wa.me | OK | OK | OK | OK | OK internacional |
| Profissional automático | OK | OK | OK | OK | OK internacional |
| Lead cadastro | OK | OK | OK | OK | OK internacional |
| Lead wa.me | OK | OK | OK | OK | OK internacional |
| Lead automático | OK | OK | OK | OK | OK internacional |
| Indicação | OK | OK | OK | OK | OK internacional |
| Indicação matching | OK | OK | OK | OK | OK internacional |
| Solicitação | OK | OK | OK | OK | OK internacional |
| Solicitação → paciente | OK | OK | OK | OK | OK internacional |
| Solicitação → lead | OK | OK | OK | OK | OK internacional |
| Teste WhatsApp | OK | OK | OK | OK | OK internacional |
| White-label lead | OK (55 prefixado legado) | OK | OK | OK | OK internacional |
| `whatsappResponsavelPhone` | OK | — | — | — | BR-only intencional |
| Instagram bio / ChatIA / contrato / entrega / EasySign | OK | — | — | — | BR-only intencional |
| VM / WPPConnect | recebe canônico | recebe canônico | recebe canônico | recebe canônico | não aplicável (inalterado) |

---

## 15. Regressão

Etapas 1, 1.5, 2, 3, 4, 5, 6, 7, 8, 9, 10 + `canalChatInboundMessage.spec.ts`.

---

## 16. Ausência de migração

Sem backfill, sem `telefoneCanonical` persistido, sem índice novo. Docs antigos sem DDI continuam Brasil.

---

## 17. VM / WPPConnect

Inalterados. O JID continua chegando igual; o matching no Next.js é que passou a entender o canônico.
