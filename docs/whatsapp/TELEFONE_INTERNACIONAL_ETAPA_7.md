# Telefone internacional — Etapa 7 (profissionais)

**Data:** 21 de setembro de 2026  
**Escopo:** internacionalizar **somente** telefones de profissionais (médico, nutricionista, personal, psiquiatra) e `telefoneAviso` relacionado a profissional. Sem refactor de paciente. Sem leads, indicação ou solicitação. Sem migração Firebase, VM, Docker ou WPPConnect.

Anteriores: [`TELEFONE_INTERNACIONAL_ETAPA_6.md`](./TELEFONE_INTERNACIONAL_ETAPA_6.md).  
Auditoria de origem: [`AUDITORIA_WHATSAPP_TELEFONE_INTERNACIONAL.md`](./AUDITORIA_WHATSAPP_TELEFONE_INTERNACIONAL.md).

---

## Contratos encontrados

Os quatro profissionais usam `telefone` no **raiz** do documento (não em `dadosIdentificacao`). Tipos distintos; mesmo padrão de campos.

| Entidade | Tipo | Coleção Firebase | Campo legado |
|----------|------|------------------|--------------|
| Médico | `Medico` (`types/medico.ts`) | `medicos` | `telefone?: string` |
| Nutricionista | `NutricionistaDoc` (`features/metaNutri/metaNutri.types.ts`) | `nutricionistas` | `telefone: string` |
| Personal | `PersonalTrainerDoc` (`features/metaPersonal/metaPersonal.types.ts`) | `personal_trainers` | `telefone: string` |
| Psiquiatra | `PsiquiatraDoc` (`features/metaPsi/metaPsi.types.ts`) | `psiquiatras/{authUid}` | `telefone: string` |
| Aviso de calendário | `Lembrete` (`types/lembrete.ts`) | `lembretes` | `telefoneAviso?: string` |

Persistência: DDI **não** entra dentro de `telefone`. `telefoneE164` **não** é gravado por padrão.

---

## Campos adicionados (opcionais)

| Contrato | Campos |
|----------|--------|
| `Medico` | `telefoneDdi?`, `telefonePais?` |
| `NutricionistaDoc` | `telefoneDdi?`, `telefonePais?` |
| `PersonalTrainerDoc` | `telefoneDdi?`, `telefonePais?` |
| `PsiquiatraDoc` | `telefoneDdi?`, `telefonePais?` |
| `Lembrete` | `telefoneAvisoDdi?`, `telefoneAvisoPais?` |
| `InstagramHubMedicoPublic` | `telefoneDdi?`, `telefonePais?` |
| `MeuPerfilMedicoFormFields` | `telefoneDdi?`, `telefonePais?` |

Profissional antigo `{ telefone: "83988192848" }` continua significando Brasil. Sem migração.

---

## Helper central

`lib/whatsapp/resolveProfessionalPhone.ts`

| Função | Papel |
|--------|--------|
| `phoneFieldsFromProfessional` | Extrai `telefone` / `telefoneDdi` / `telefoneE164` do doc raiz |
| `tryResolvePhoneFromProfessionalDoc` | `resolveInternationalPhone` (E164 → DDI+nacional → legado BR) |
| `professionalPhoneWriteFields` | Grava DDI **somente** se o formulário já tiver |
| `buildProfessionalWhatsappUrl` | `buildWhatsappUrl` com campos do profissional |
| `tryResolveTelefoneAviso` | Resolve `telefoneAviso` + DDI opcional do lembrete |
| `telefoneAvisoWriteFieldsFromProfessional` | Copia telefone estruturado do perfil para o lembrete |

`lib/phone/buildTelHref.ts`: `tel:+{canônico}` — separado de `wa.me`.

Nenhum resolver novo. Sem 55 / 9º dígito / E164 duplicados.

---

## Formulários com InternationalPhoneInput

| Tela | Arquivo |
|------|---------|
| Wizard de verificação do médico | `components/metaadmin/MetaMedicoWizard.tsx` |
| Wizard nutri / personal / psi | `components/meta/MetaNutriPersonalWizard.tsx` |
| Meu Perfil MetaAdmin | `app/metaadmin/page.tsx` |
| Meu Perfil MetaNutri | `app/metanutri/page.v2.tsx` |
| Meu Perfil MetaPersonal | `app/metapersonal/page.v2.tsx` |
| Meu Perfil MetaPsi | `app/metapsi/page.v2.tsx` |
| Edição de médico (MetaAdmin Geral) | `app/metaadmingeral/page.tsx` |
| Telefone do aviso (novo lembrete) | `components/metaadmin/ModalNovoLembrete.tsx` |

Validação: `isValidIdentificacaoPhone` (Portugal 9 dígitos com +351 é válido). Completeness dos wizards deixou de exigir 10 dígitos BR.

Design de cada formulário mantido. Brasil default visual: 🇧🇷 +55.

---

## Display

`InternationalPhoneDisplay` / `formatInternationalPhoneDisplay` já existiam (paciente). Cards de lista de profissional **não** foram redesenhados. O seletor internacional nos formulários cobre o display ao abrir o cadastro.

---

## wa.me

Callers vivos de profissional passaram a usar `phoneFieldsFromProfessional`:

- `app/metaadmin/page.tsx` — nutri e personal vinculados
- `app/metaadmingeral/page.tsx` — nutri / personal / psi (não leads)
- `app/meta/page.tsx` — médico
- `app/metanutri/page.v2.tsx` e `app/metapersonal/page.v2.tsx` — médico vinculado

Exemplos:

| Caso | URL |
|------|-----|
| US `7137326616` + DDI `1` | `https://wa.me/17137326616` |
| PT `912345678` + DDI `351` | `https://wa.me/351912345678` |
| legado `83988192848` sem DDI | `https://wa.me/5583988192848` |

Leads / indicação / solicitação **não** foram alterados.

---

## tel:

Nenhum `tel:` vivo de profissional (os `tel:` restantes são CRM lead e Paciente 360). Helper `buildTelHref` disponível:

- US → `tel:+17137326616`
- PT → `tel:+351912345678`
- BR legado → `tel:+5583988192848`

Não mistura `wa.me` com `href tel:`.

---

## Avisos automáticos ao profissional

| Serviço | Antes | Agora |
|---------|-------|--------|
| `solicitacaoMedicoAvisoWhatsappService` | `normalizeWhatsappPhone` em strings soltas | `tryResolvePhoneFromProfessionalDoc`; conexão = canônico / legado |
| `prontuarioConsultaMedicoNotifyService` | idem | idem |
| `consultaReminderService` (médico) | `digitsOnly(telefone)` nacional ≥ 10 | copia `telefoneAviso` + DDI/país do doc |
| `consultaReminderService` (nutri) | idem | idem |
| `calendarioLembreteWhatsappService.resolveAvisoPhone` | `normalizeWhatsappPhone(telefoneAviso)` | `tryResolveTelefoneAviso` |

Médico US no perfil: WhatsApp `17137326616` — nunca `557137326616` / `5517137326616`.

Profissional antigo sem DDI: comportamento Brasil inalterado.

---

## telefoneAviso

Duas origens:

1. **Automática (consulta):** o lembrete copia `telefone` + `telefoneDdi`/`telefonePais` do profissional. Cron resolve estruturado.
2. **Manual (`ModalNovoLembrete`):** `InternationalPhoneInput`; DDI só persiste se o usuário editou/já havia DDI. String solta legada = Brasil.

Fallback de conexão WhatsApp (sem telefone no perfil) permanece legado: não adivinha país.

---

## Instagram / CTA

| Origem | Tratamento |
|--------|------------|
| `Medico.telefone` no hub white-label | DDI estruturado via `phoneFieldsFromProfessional` |
| Override `instagramBio.whatsapp` | canônico já persistido (`telefoneE164` na resolução); formulário da bio permanece BR-only |
| CTA comercial Oftware (`5583988192848`) | **não alterado** (`getInstagramFounderWhatsAppUrl`) |

Não se confunde telefone do médico com o CTA fixo da Oftware.

---

## Lazy backfill

- Abrir profissional antigo: UI mostra 🇧🇷 +55 e máscara BR.
- Fechar sem editar o telefone: **não** grava `telefoneDdi`.
- Editar/salvar o telefone: permitido gravar `telefoneDdi: "55"` + `telefonePais: "BR"`.
- `professionalPhoneWriteFields` e `updatePerfil` ignoram DDI vazio.

Nenhuma migração em lote.

---

## Coleções que **podem** passar a conter DDI

Só em documentos **novos ou editados** (não há backfill em massa):

- `medicos`
- `nutricionistas`
- `personal_trainers`
- `psiquiatras`
- `lembretes` (`telefoneAvisoDdi` / `telefoneAvisoPais`)

---

## Hardcodes / fluxos que permanecem BR-only (e por quê)

| Ocorrência | Por quê permanece |
|------------|-------------------|
| Leads (`LeadMedico`, `LeadProfissional`, CRM, white-label responsável) | Fora do escopo (Etapa 8+) |
| Indicação / `solicitacao.telefonePaciente` | Fora do escopo |
| `instagramBio.whatsapp` (campo override da bio) | String canônica separada do telefone do médico; formulário da bio não foi internacionalizado |
| `formatTelefone` BR (`slice(0, 11)`) em helpers de verificação | Já não é usado nos wizards internacionalizados; permanece para outros callers BR |
| `cleanPhoneBr` no CRM | Lead / paciente 360 — fora do escopo profissional |
| `normalizeWhatsappPhone` como fallback de **conexão** WhatsApp | Sessão WPPConnect; 10/11 = BR legado. Perfil com DDI tem prioridade |
| `cadastroMedico` `telefoneEntrega` (white-label) | Telefone de entrega do cadastro público, não o telefone do profissional no doc `medicos` |
| Paciente / anamnese / Identificação | Fechados nas Etapas 1–6; não reabertos |

Nenhum fluxo internacionalizado de profissional ignora `telefoneDdi` quando o campo existe.

---

## Testes

`lib/whatsapp/telefoneInternacionalEtapa7.spec.ts` — matriz A–V + wiring: **27 passaram**.

Regressão WhatsApp/telefone (Etapas 1–7, `lib/whatsapp` + `lib/phone` + anamnese): **234 passaram**.

---

## Confirmações

- **Não houve migração Firebase.** Documentos antigos sem DDI continuam válidos.
- **VM / Docker / WPPConnect / `infra/whatsapp` / `whatsapp_automation_queue` não foram alterados.**
- **Estrutura de `pacientes_completos` não foi alterada.**
- **EasySign BRy não foi alterado.**

---

## Riscos antes da Etapa 8

1. **Leads e indicação/solicitação** ainda são Brasil-only: um lead US digitado como 10 dígitos vira `55…`.
2. **Override da bio Instagram** (`instagramBio.whatsapp`) ainda normaliza como BR se alguém colar um nacional sem DDI.
3. **Fallback da sessão WhatsApp** (conexão sem telefone no perfil) trata 10/11 dígitos como BR — número US de 11 dígitos na sessão, sem DDI no perfil, seria prefixado com 55.
4. **Lembretes antigos** só com `telefoneAviso` nacional continuam BR no cron; só os novos/editados carregam DDI.
5. Cards/listas de profissional ainda mostram o nacional cru (sem bandeira) — só os formulários usam o display internacional.
6. `telefoneEntrega` do cadastro white-label público permanece 10/11 BR.
