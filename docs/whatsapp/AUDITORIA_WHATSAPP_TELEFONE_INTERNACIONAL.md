# Auditoria: WhatsApp e telefone internacional

**Tipo:** auditoria de código (somente leitura)  
**Data:** 21 de setembro de 2026  
**Escopo:** documentar o comportamento **atual**. Nenhuma alteração de produção, Firebase, formato de telefone ou migração foi feita.  
**Pergunta central:** *como um telefone salvo no Firebase se transforma no número que efetivamente recebe uma mensagem no WhatsApp?*

---

## 1. Arquitetura atual do WhatsApp

O Oftware **não envia WhatsApp a partir da Vercel**. O Next.js orquestra sessão, fila e texto; o envio real é feito por um **WPPConnect Server** central em VM, via HTTP.

```
UI (médico / metaadmingeral / cron)
        ↓
API Route Next.js (Vercel)
        ↓
serviço de negócio (extrai telefone do Firestore)
        ↓
normalizeWhatsappPhone()          ← AQUI o 55 é acrescentado
        ↓
sendPatientAutomationWhatsapp()   ← roteia médico vs Canal Chat
   ou sendTestMessage() direto
        ↓
whatsappProviderClient.sendTestMessage()
        ↓  (normalizeWhatsappPhone de novo — idempotente para BR)
resolveWhatsappChatId()
        ↓  GET /contact/pn-lid/{phone}@c.us
        ↓  GET /check-number-status/{phone}@c.us
        ↓  POST /send-message  { phone, isLid, message, options }
        ↓
WPPConnect Server (VM)  →  WhatsApp Web (Chromium)  →  destinatário
```

Há **dois canais paralelos** de “WhatsApp” no produto:

| Canal | O que é | O 55 entra? |
|-------|---------|-------------|
| **A — WPPConnect (automático / teste)** | Servidor envia a mensagem pela sessão do médico ou do Canal Chat | Sim, em `normalizeWhatsappPhone` |
| **B — `wa.me` (manual no browser)** | Abre o WhatsApp Web/app do *usuário logado* com texto pronto | Sim, em dezenas de concatenções `wa.me/55${...}` |

O canal A é o da tela **Teste de envio WhatsApp**. O canal B **não passa** pelo provider; apenas monta URL.

### Infraestrutura

- **Provider:** WPPConnect Server (`wppconnect/wppconnect-server`), não Meta Cloud API, não Baileys, não Evolution.
- **Hospedagem:** VM com disco persistente (`infra/whatsapp/vm/`), domínio documentado `https://whatsapp.oftware.com.br`.
- **Oftware chama** `WPP_SERVER_URL` + `WPP_SERVER_SECRET_KEY` (server-side). Sem a URL, o cliente entra em **mock**.
- **Sessão por médico:** `org_{organizationId}_doctor_{doctorId}` (fallback `doctor_{doctorId}`).
- **Canal Chat institucional:** owner `canal_chat`, sessão `system_canal_chat` (`lib/whatsapp/canalChatOwner.ts`). Usado para avisos do sistema e para não fazer self-send na sessão do médico.
- **Firestore de conexão:** coleção `whatsappConnections` (`services/whatsappConnectionService.ts`), `provider: 'wppconnect'`.
- **Logs:** `whatsapp_message_logs`.
- **Fila de automações:** `whatsapp_automation_queue`, consumida pelo cron `/api/cron/send-whatsapp-lembretes`.

Documentação já existente (não alterada):

- `docs/whatsapp/ARQUITETURA_WPPCONNECT_PRODUCAO.md`
- `docs/whatsapp/WPPCONNECT_SERVER_SETUP.md`
- `docs/whatsapp/POSSIBILIDADES_ENVIO_AUTOMATICO_WHATSAPP.md`

---

## 2. Fluxograma: Firebase → número enviado

```
pacientes_completos/{id}
  dadosIdentificacao.telefone
        │  exemplos observados no produto:
        │    "83988192848"
        │    "(83) 98819-2848"   ← máscara da anamnese
        │    (às vezes com espaços)
        ▼
leitura (Admin SDK ou cliente)
  candidatos: dadosIdentificacao.telefone,
              telefone, celular, phone, whatsapp, telefoneWhatsApp
        ▼
extrairTelefonePaciente() / tryNormalizePhone()
        ▼
normalizeWhatsappPhone(raw)
  1. digitsOnly = replace(/\D/g, '')
  2. se length ∈ {10, 11} E não começa com "55" → prefixar "55"
  3. applyBrazilMobileNinthDigit()  (só se já começa com 55 e nacional tem 10 dígitos)
  4. validar length ∈ [10, 15]
        ▼
número canônico de envio, ex.: 5583988192848
        ▼
sendTestMessage() chama normalizeWhatsappPhone de novo
        ▼
check-number-status  →  5583988192848@c.us
        ▼
POST /api/{session}/send-message
  body.phone = dígitos (ou LID)  — sem "+"
```

**Resposta à pergunta central:**

> O Firebase guarda o telefone **nacional brasileiro** (DDD + número, sem DDI).  
> No envio WPPConnect, **todo número com 10 ou 11 dígitos que não começa com `55` recebe o prefixo `55`**.  
> Esse é o único ponto central. Depois disso o provider só consulta/envia o dígito já normalizado.

Por isso:

| Gravado / digitado | Após `normalizeWhatsappPhone` |
|--------------------|-------------------------------|
| `83988192848` | `5583988192848` |
| `(83) 98819-2848` | `5583988192848` |
| `5583988192848` | `5583988192848` (não duplica) |
| `17137326616` | **`5517137326616`** (tratado como BR de 11 dígitos) |

---

## 3. Onde o +55 / 55 está hardcoded

### 3.1 Função central (todos os envios WPPConnect passam aqui)

Arquivo: `services/whatsappProviderClient.ts`  
Função: `normalizeWhatsappPhone` (exportada)  
Linhas ~1397–1418

```ts
export function normalizeWhatsappPhone(raw: string): string {
  const digits = digitsOnly(raw);
  if (!digits) {
    throw new WhatsappProviderError('Informe um número de telefone válido.', 'INVALID_PHONE');
  }

  let normalized = digits;
  if ((normalized.length === 10 || normalized.length === 11) && !normalized.startsWith('55')) {
    normalized = `55${normalized}`;
  }

  normalized = applyBrazilMobileNinthDigit(normalized);

  if (normalized.length < 10 || normalized.length > 15) {
    throw new WhatsappProviderError(
      'Número inválido. Use DDI + DDD + número (ex.: 5583999999999).',
      'INVALID_PHONE',
    );
  }

  return normalized;
}
```

**Assunção implícita:** 10 ou 11 dígitos = Brasil sem DDI.

9º dígito brasileiro (mesmo arquivo, `applyBrazilMobileNinthDigit`, linhas ~281–296):

```ts
export function applyBrazilMobileNinthDigit(digits: string): string {
  if (!digits.startsWith('55')) return digits;
  const national = digits.slice(2);
  if (national.length === 10) {
    const ddd = national.slice(0, 2);
    const local = national.slice(2);
    if (/^[6-9]/.test(local)) {
      return `55${ddd}9${local}`;
    }
  }
  return digits;
}
```

Há uma **segunda** função interna `normalizePhone` (linhas ~322–335) usada só para ler o **número conectado da sessão** no WPP (não o destinatário). Também prefixa `55` quando `length >= 10` e `length <= 11`.

`sendTestMessage` (linha ~1818) **sempre** chama `normalizeWhatsappPhone` de novo, mesmo se o caller já normalizou. Para números BR isso é idempotente. Para um número internacional de 10–11 dígitos, o dano já ocorreu na primeira passagem (ou ocorre aqui, se o caller passou o valor cru).

### 3.2 Mensagem do teste do usuário

Arquivo: `services/whatsappProviderClient.ts`  
Função: `resolveWhatsappChatId`  
Linhas ~1584–1597

```ts
if (profile.numberExists === false) {
  throw new WhatsappProviderError(
    `O número ${phoneDigits} não está no WhatsApp. Confira DDI+DDD+número (com o 9º dígito).`,
    'INVALID_PHONE',
  );
}
```

`${phoneDigits}` já é o valor **depois** de `normalizeWhatsappPhone`. Por isso a UI mostrou `5517137326616` e não `17137326616`.

### 3.3 Helpers de `wa.me` (não passam pelo provider)

Estes **não enviam** pela sessão Oftware; abrem o WhatsApp do operador. Todos assumem Brasil:

| Arquivo | Função | Comportamento |
|---------|--------|----------------|
| `lib/paciente360/paciente360WhatsAppMessages.ts` | `cleanPhoneBr` | `startsWith('55') ? digits : \`55${digits}\`` |
| `lib/instagram/medicoWhatsAppUrl.ts` | `normalizeMedicoTelefoneWhatsApp` | igual |
| `lib/nutri/buildNutriCheckInWhatsAppMessage.ts` | `nutriCheckInWhatsAppHref` | igual |
| `components/metanutri/MetanutriPacienteWelcomeActions.tsx` | local | igual |
| `components/drprovisorio/PublicDoctorQuickInfo.tsx` | local | igual |
| `lib/whiteLabel/leadWhiteLabelNormalize.ts` | `normalizeLeadWhiteLabelWhatsApp` | igual |
| `lib/instagram/instagramBioConfig.ts` | local | igual |
| `lib/crm/leadContactHelpers.ts` | `getLeadPhoneDigits` | usa `cleanPhoneBr` |
| `app/meta/page.tsx` | ~1815 e ~8560 | `if (!startsWith('55')) '55' + ...` |
| `app/metaadmin/page.tsx` | dezenas de `https://wa.me/55${digits}` | **prefixo cego** (não checa se já tem 55) |
| `app/metanutri/page.v2.tsx` / `app/metapersonal/page.v2.tsx` | idem `wa.me/55${...}` | prefixo cego |
| `lib/paciente/patientDetailsMobileMetrics.ts` | `wa.me/55${...}` | prefixo cego |
| `components/profissional/ProfissionalCalendarioSection.tsx` | idem | prefixo cego |
| `components/metapsi/MetaPsiPacientesPanel.tsx` | idem | prefixo cego |
| `services/notificationService.ts` | `formatPhoneNumber` | produz `+55...` para o stub Twilio |

**Atenção:** `https://wa.me/55${telefone}` **duplica** o 55 se o valor já estiver com DDI. `cleanPhoneBr` e `normalizeWhatsappPhone` não duplicam.

### 3.4 Lookup inbound do Canal Chat

`lib/whatsapp/canalChatInboundMessage.ts` → `phoneLookupVariants` (linhas ~332–354): gera variantes `55` + nacional, nacional sem 55, com/sem 9º dígito. Toda a lógica de matching inbound é **brasileira**.

### 3.5 Assinatura eletrônica (não WhatsApp, mas assume BR)

`lib/signature/bryEasySign/bryEasySignPhone.ts` → `formatEasySignPhoneE164`: 10–11 dígitos viram `+55...`.

---

## 4. Todos os arquivos envolvidos (produção)

Pastas `backupwhatsapp/`, `app - Copia/`, `*.backup.*` são cópias/legado e **não** entram no fluxo vivo. Listadas só para não confundir buscas.

### Núcleo WPPConnect

| Arquivo | Papel |
|---------|--------|
| `services/whatsappProviderClient.ts` | Cliente HTTP do WPP; `normalizeWhatsappPhone`; `sendTestMessage` |
| `services/whatsappPatientSendRouter.ts` | Roteia médico vs Canal Chat; chama `sendTestMessage` |
| `services/whatsappSendTestService.ts` | Teste manual por `doctorId` |
| `services/whatsappConnectionService.ts` | Firestore `whatsappConnections` |
| `lib/server/whatsappSessionAuth.server.ts` | Token Bearer por sessão |
| `lib/whatsapp/wppOutbound.ts` | Documenta resolução PN→LID |
| `lib/whatsapp/canalChatOwner.ts` | `canal_chat` / `system_canal_chat` |
| `lib/whatsapp/shouldRoutePatientSendViaCanalChat.ts` | Self-send → Canal Chat |
| `infra/whatsapp/wppconnect/config.runtime.js` | Config da VM |
| `infra/whatsapp/vm/` | Compose/disco da VM |

### APIs de envio / sessão

| Rota | Papel |
|------|--------|
| `app/api/metaadmingeral/automacoes/whatsapp/send-test/route.ts` | **Tela de teste** usada no relato |
| `app/api/metaadmin/whatsapp/send-test/route.ts` | Mesmo serviço; **nenhum frontend chama** (API órfã de UI) |
| `app/api/metaadmin/whatsapp/start-session/route.ts` | QR / conectar |
| `app/api/metaadmin/whatsapp/status/route.ts` | Status |
| `app/api/metaadmin/whatsapp/disconnect/route.ts` | Desconectar |
| `app/api/metaadmin/whatsapp/logs/route.ts` | Logs |
| `app/api/cron/send-whatsapp-lembretes/route.ts` | Motor da fila (1 min) |
| `app/api/cron/rebuild-whatsapp-queue/route.ts` | Rebuild diário da fila |
| `app/api/cron/send-whatsapp-aplicacao/route.ts` | No-op (migrado para a fila) |
| `app/api/cron/send-whatsapp-calendario-lembretes/route.ts` | Lembretes de calendário |
| `app/api/cron/send-whatsapp-cobranca-automatica/route.ts` | Cobrança automática |
| `app/api/metaadmin/pacientes/[pacienteId]/enviar-link-whatsapp/route.ts` | Link de cadastro |
| `app/api/metaadmin/solicitacoes/welcome-whatsapp/route.ts` | Boas-vindas |
| `app/api/metaadmin/financeiro/cobranca-whatsapp/route.ts` | Cobrança avulsa |
| `app/api/send-whatsapp-novo-lead-medico/route.ts` | Aviso ao médico (nova solicitação) |
| `app/api/send-whatsapp-compartilhamento-aceite/route.ts` | Aceite nutri/personal |
| `app/api/metanutri/pacientes/[pacienteId]/welcome-whatsapp/route.ts` | Boas-vindas nutri |
| `app/api/metaadmingeral/whitelabel/agenda/whatsapp-test/route.ts` | Teste agenda white-label |
| `app/api/whatsapp/inbound/route.ts` | Webhook inbound Canal Chat |
| `app/api/send-whatsapp/route.ts` | **Stub legado** (Twilio/Meta comentados; só simula). Regex `^\+55\d{2}\d{8,9}$` |

Rotas equivalentes de sessão existem em `metanutri`, `metapersonal` e `metaadmingeral/canal-chat`.

### Serviços que extraem telefone e enviam (todos usam `normalizeWhatsappPhone`)

- `services/whatsappRemindersService.ts` — fila: aplicação D0/D-1/atrasada, injetável, aniversário, conclusão, check-in nutri
- `services/whatsappAutoAplicacaoService.ts` — legado da aplicação do dia (fila passou a ser a fonte)
- `services/whatsappNutriCheckInQueue.ts`
- `services/boasVindasTratamentoWhatsappService.ts`
- `services/whatsappPacienteCadastroLinkService.ts`
- `services/calendarioLembreteWhatsappService.ts`
- `services/financeiroCobrancaWhatsappService.ts`
- `services/cobrancaAutomaticaWhatsappService.ts`
- `services/compartilhamentoAceiteWhatsappService.ts`
- `services/solicitacaoMedicoAvisoWhatsappService.ts` — telefone do **médico**, não do paciente
- `lib/metaadmin/agenda/consultaReminderService.ts`
- `lib/nutri/agenda/consultaReminderService.ts`
- `lib/nutri/agenda/nutriWelcomeWhatsappService.ts`
- `lib/nutri/prontuario/prontuarioConsultaMedicoNotifyService.ts`
- `lib/nutri/cardapio/cardapioPacienteNotifyService.ts`
- `lib/nutri/hidratacao/hydrationCheckInNotify.server.ts` → `pacienteCanalChatNotifyCore`
- `lib/metaadmin/examesLaboratoriaisPacienteNotifyService.ts`
- `lib/metaadmin/pacienteCanalChatNotifyCore.ts`
- `lib/whiteLabel/notifyWhiteLabelMeetingWhatsApp.ts`
- `services/canalChatPendingPaymentService.ts`
- `services/canalChatInboundService.ts`

Padrão repetido de extração (cópia em vários arquivos):

```ts
const candidatos = [
  dadosIdentificacao?.telefone,
  data.telefone,
  data.celular,
  data.phone,
  data.whatsapp,
  data.telefoneWhatsApp,
];
for (const raw of candidatos) {
  try { return normalizeWhatsappPhone(raw); } catch { continue; }
}
```

Não há uma função compartilhada única de extração — há **várias cópias** do mesmo bloco. A normalização, porém, **é central** (`normalizeWhatsappPhone`).

---

## 5. Funções responsáveis por normalização

| Função | Arquivo | Quando roda | Prefixa 55? |
|--------|---------|-------------|-------------|
| **`normalizeWhatsappPhone`** | `whatsappProviderClient.ts` | Todo envio WPP + extração | Sim, se 10 ou 11 dígitos |
| `applyBrazilMobileNinthDigit` | idem | Depois do prefixo, só DDI 55 | Insere 9º dígito BR |
| `normalizePhone` (interna) | idem | Telefone da sessão conectada | Sim, 10–11 dígitos |
| `extrairTelefonePaciente*` | vários serviços | Leitura Firestore | Chama a central |
| `cleanPhoneBr` | `paciente360WhatsAppMessages.ts` | CRM / wa.me | Sempre se não começa 55 |
| `formatTelefone` | `lib/meta/metaChatInicial/helpers.ts` (e duplicata nutri) | Input anamnese | **Não.** Máscara `(DD) 9XXXX-XXXX`, max 11 dígitos |
| `pacienteTemTelefoneParaWhatsapp` | `buildNovoPacienteCompleto.ts` | Elegibilidade | Só `replace(/\D).length >= 10` |
| `phoneLookupVariants` | `canalChatInboundMessage.ts` | Inbound | Gera 55 + nacional |
| `formatEasySignPhoneE164` | `bryEasySignPhone.ts` | Assinatura BRy | `+55` em 10–11 dígitos |
| `NotificationService.formatPhoneNumber` | `notificationService.ts` | Stub Twilio | `+55` |

**Fonte da verdade de envio WPPConnect hoje:** `normalizeWhatsappPhone`.  
**Fonte da verdade de armazenamento:** `dadosIdentificacao.telefone` (string livre / máscara BR).

---

## 6. Fluxo da tela TESTE DE ENVIO WHATSAPP

### Onde está a UI

- Componente: `components/metaadmingeral/automacoes/AutomacoesDashboardPanel.tsx`
- Função interna: `DoctorWhatsAppTestPanel` (a partir da linha 87)
- Título na tela: **“Teste de envio WhatsApp”**
- Botão: **“Enviar teste”** (linha 244)
- Input: `type="tel"`, **sem máscara**, placeholder `5511999999999`
- Estado: `const [phone, setPhone] = useState('')` — o valor sai **exatamente** como digitado

Não há outra UI com esse texto. A rota do médico `POST /api/metaadmin/whatsapp/send-test` existe, mas **nenhum componente a chama**.

### Passo a passo do botão (provado no código)

1. **Valor do input**  
   Exemplo do teste: `17137326616` (11 caracteres, só dígitos).

2. **Endpoint**  
   `POST /api/metaadmingeral/automacoes/whatsapp/send-test`  
   Body: `{ doctorId, phone, message }`  
   (`AutomacoesDashboardPanel.tsx` linhas 115–127)

3. **Backend recebe**  
   `app/api/metaadmingeral/automacoes/whatsapp/send-test/route.ts`  
   `phone = body.phone.trim()` — sem normalizar.

4. **Serviço**  
   `sendWhatsappTestMessageForDoctor` (`whatsappSendTestService.ts`)  
   Só faz `input.phone.trim()`. Encaminha cru para o provider.

5. **Onde o 55 é acrescentado**  
   `sendTestMessage` → `normalizeWhatsappPhone(phone)`  
   `17137326616`.length === 11 e não começa com `55` → `55` + número = **`5517137326616`**.  
   `applyBrazilMobileNinthDigit`: nacional tem 11 dígitos, então **não** insere 9.

6. **Número que chega ao WPP**  
   `GET /api/{session}/check-number-status/5517137326616@c.us`  
   (e antes `GET .../contact/pn-lid/5517137326616@c.us`)  
   Payload de envio: `{ phone: phoneForSend, isLid, message, options: { createChat, waitForAck } }`  
   Sem `+`. Sem espaços.

7. **Origem da mensagem de erro**  
   WPP devolve `numberExists === false`.  
   Oftware lança:  
   `O número ${phoneDigits} não está no WhatsApp. Confira DDI+DDD+número (com o 9º dígito).`  
   com `phoneDigits = 5517137326616`.  
   O JSON `{ ok: false, error }` volta ao frontend e o painel mostra `feedback.text`.

### Por que `17137326616` virou `5517137326616`

Não há transformação no input nem na API. A regra é:

> Se o número tem **10 ou 11 dígitos** e **não começa com 55**, prefixar 55.

`17137326616` parece um número dos EUA (`1` + área `713` + linha), mas o código **não conhece DDI**. Onze dígitos = “celular BR sem país”. O 55 é colado. O check-number consulta um destino que não existe no WhatsApp, e a mensagem de erro já exibe o valor adulterado.

Se o usuário tivesse digitado `13055551234` (E.164 EUA sem `+`), o mesmo ocorreria: `5513055551234`.  
Se tivesse digitado `351912345678` (12 dígitos), o prefixo **não** seria aplicado (só 10/11). Portugal “completo” passaria; EUA de 11 dígitos não.

---

## 7. Fluxo da anamnese inicial

O paciente informa o telefone no **passo 1** do chat/wizard inicial.

### Componentes

| Superfície | Arquivo | Campo |
|------------|---------|--------|
| Chat inicial (modal) | `components/ModalDadosPacienteChat.tsx` (~1629–1664) | `dadosIdentificacao.telefone` |
| Wizard | `components/meta/MetaPacienteWizard.tsx` (~485–507) | idem |
| Persistência | `app/meta/page.tsx` → `PacienteService.createOrUpdatePaciente` | coleção `pacientes_completos` |

Texto do bot (`lib/meta/metaChatInicial/constants.ts`): “melhor telefone… com DDD”.

### Máscara / validação / 55

Máscara (`lib/meta/metaChatInicial/helpers.ts`):

```ts
export function formatTelefone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return digits.replace(/(\d{0,2})/, (_, a) => (a ? `(${a}` : ''));
  return digits.replace(/(\d{2})(\d{0,5})(\d{0,4})/, (_, a, b, c) => `(${a}) ${b}${c ? '-' + c : ''}`);
}
```

| Pergunta | Resposta atual |
|----------|----------------|
| Máscara brasileira? | **Sim.** `(DD) 9XXXX-XXXX` |
| Limite de caracteres? | **11 dígitos** (`slice(0, 11)`). Impede DDI e números longos |
| Validação de DDD? | **Não** há lista de DDDs. Só comprimento |
| Regex brasileira? | Implícita na máscara (2 + 8/9). Mensagem: “Informe um telefone válido com DDD.” |
| Inclusão automática de 55 na anamnese? | **Não.** O 55 só entra no envio |
| Valor salvo no Firebase? | A string **mascarada**, ex. `(83) 98819-2848`. `createOrUpdatePaciente` não stripa dígitos. Em edição pelo médico pode ficar `83988192848` cru. Ambos viram `83988192848` após `replace(/\D/g)` |

Validação (`lib/meta/metaChatInicial/validation.ts` passo 1):

```ts
const tel = (p.dadosIdentificacao?.telefone || '').replace(/\D/g, '');
if (tel.length < 10) return 'Informe um telefone válido com DDD.';
```

Mínimo 10, máximo 11. Um número PT/US completo **não cabe** neste campo hoje.

O `ChatIA.tsx` tem nome+telefone, mas é **lead da Rafaela** (landing), não anamnese de paciente. Também exige “DDD, mínimo 10 dígitos”.

---

## 8. Fluxo da edição do paciente

### Onde o médico vê/edita

- Aba **Identificação** do modal de paciente em `/metaadmin`.
- Leitura: `components/metaadmin/paciente-modal/PacienteIdentificacaoTabContent.tsx` (input `readOnly` de `id.telefone`).
- Edição: `components/metaadmin/paciente-modal/PacienteIdentificacaoTabEdit.tsx` (linhas 347–364).

```tsx
<FieldLabel>Telefone</FieldLabel>
<input
  type="tel"
  value={id?.telefone || ''}
  onChange={(e) =>
    setPaciente({
      ...paciente,
      dadosIdentificacao: { ...paciente.dadosIdentificacao, telefone: e.target.value },
    })
  }
/>
```

| Aspecto | Comportamento atual |
|---------|---------------------|
| Máscara | **Nenhuma** |
| Carga | Valor cru do Firestore, como estiver |
| Save | `PacienteService.createOrUpdatePaciente(pacienteEditando)` — persiste a string digitada |
| Assume BR? | O campo em si não. Quem assume BR é o envio (`normalizeWhatsappPhone`) e os botões `wa.me/55${...}` no mesmo modal |

Há também uso de `dadosIdentificacao.telefone` para botões “Enviar no WhatsApp” (depoimento, aniversário, pagamento, aplicação) em `app/metaadmin/page.tsx`, sempre no padrão `wa.me/55${digits}`.

`pacienteTemTelefoneParaWhatsapp` considera válido qualquer valor com ≥ 10 dígitos.

---

## 9. Fluxos automáticos e manuais de WhatsApp

Quase todos os envios **server-side** fazem:

`Firestore.telefone` → `normalizeWhatsappPhone` → `sendPatientAutomationWhatsapp` → `sendTestMessage`.

Exceções: cobrança avulsa/automática e white-label meeting chamam `sendTestMessage` direto (ainda assim normalizam antes ou dentro de `sendTestMessage`). Canal Chat inbound não envia; só casa telefone.

### 9.1 Fila / cron (sessão do médico, fallback Canal Chat se o telefone for o do próprio médico)

| Automação | Origem do telefone | Transformação |
|-----------|--------------------|---------------|
| Aplicação do dia / D-1 / atrasada | `pacientes_completos.dadosIdentificacao.telefone` | `normalizeWhatsappPhone` na montagem da fila |
| Injetável dia / D-1 | idem | idem |
| Aniversário | idem | idem |
| Conclusão de tratamento | idem | idem |
| Check-in semanal nutri | idem | idem |
| Rebuild fila | `GET /api/cron/rebuild-whatsapp-queue` | mesma extração |

Cron de disparo: `GET /api/cron/send-whatsapp-lembretes` → `processDueWhatsappAutomationQueue`. O item da fila **já guarda `phone` normalizado**.

### 9.2 Eventos pontuais (Canal Chat ou médico)

| Fluxo | Telefone de | Arquivo |
|-------|-------------|---------|
| Boas-vindas ao aceitar solicitação | paciente | `boasVindasTratamentoWhatsappService.ts` |
| Link de cadastro incompleto | paciente | `whatsappPacienteCadastroLinkService.ts` |
| Confirmação / lembrete de consulta (médico) | paciente e/ou médico | `lib/metaadmin/agenda/consultaReminderService.ts` |
| Consulta nutri | paciente | `lib/nutri/agenda/consultaReminderService.ts` |
| Welcome nutri | paciente | `nutriWelcomeWhatsappService.ts` |
| Cardápio | paciente | `cardapioPacienteNotifyService.ts` |
| Exames laboratoriais | paciente | `examesLaboratoriaisPacienteNotifyService.ts` |
| Prontuário consulta → médico | médico | `prontuarioConsultaMedicoNotifyService.ts` |
| Hidratação check-in | paciente | `hydrationCheckInNotify.server.ts` |
| Cobrança avulsa (botão financeiro) | paciente | `financeiroCobrancaWhatsappService.ts` |
| Cobrança automática (cron vencimento) | paciente | `cobrancaAutomaticaWhatsappService.ts` |
| Lembrete de calendário | `telefoneAviso` e opcionalmente paciente | `calendarioLembreteWhatsappService.ts` |
| Nova solicitação (aviso ao médico) | `medicos.telefone` | `solicitacaoMedicoAvisoWhatsappService.ts` |
| Compartilhamento aceite nutri/personal | paciente | `compartilhamentoAceiteWhatsappService.ts` |
| Reunião white-label | lead / responsável | `notifyWhiteLabelMeetingWhatsApp.ts` |

### 9.3 Manuais via `wa.me` (não WPP)

CRM leads, lista de pacientes, calendário, depoimento, pagamento, check-in nutri manual, landing `/dr`, Instagram bio, etc. Todos prefixam 55 no client.

### Conclusão da pergunta “é central ou cada fluxo mexe sozinho?”

- **Envio WPPConnect:** centralizado em `normalizeWhatsappPhone`. Os fluxos não reinventam o 55; só copiam o *extractor*.
- **`wa.me`:** **não** passa pela função central. Cada tela concatena `55` do seu jeito (com ou sem `startsWith`).
- **Anamnese/cadastro:** não coloca 55; limita a 11 dígitos nacionais.

---

## 10. Formato atual armazenado no Firebase

**Coleção:** `pacientes_completos`  
**Campo:** `dadosIdentificacao.telefone` (`types/obesidade.ts`, `telefone?: string`)

Contrato de fato (não está escrito como E.164):

- Brasil **sem DDI**
- DDD (2) + número (8 ou 9)
- Pode estar mascarado `(83) 98819-2848` ou só dígitos `83988192848`
- **Não** há campo `ddi`, `countryCode` ou `telefoneE164`
- Campos irmãos às vezes lidos no envio: `telefone` / `celular` / `phone` / `whatsapp` / `telefoneWhatsApp` na raiz do doc (legado)

Exemplo canônico do produto: `83988192848` → envio `5583988192848`.

Inbound do Canal Chat também grava `canalChatPhoneKey` (já normalizado com 55) para lookup posterior.

---

## 11. Dependências que assumem telefone brasileiro

1. `normalizeWhatsappPhone`: 10/11 dígitos = BR.  
2. `applyBrazilMobileNinthDigit`: só DDI 55.  
3. Máscara `formatTelefone` + `slice(0, 11)`.  
4. Validação “com DDD”, mínimo 10.  
5. Placeholders `(11) 99999-9999` / `5511999999999`.  
6. Mensagens de erro “DDI+DDD+número (com o 9º dígito)”.  
7. `wa.me/55${...}` em massa.  
8. `phoneLookupVariants` e `phonesLikelyMatch` (últimos 8 dígitos / 9º dígito BR).  
9. Display `formatTelefoneBrDisplay` / `formatContatoChatPhoneDisplay` (`+55 (DD) ...`).  
10. Leads white-label e EasySign.  
11. `pacienteTemTelefoneParaWhatsapp` (≥ 10 dígitos, sem DDI).  
12. Stub `/api/send-whatsapp` regex `^\+55\d{2}\d{8,9}$`.

Não há validação de DDD contra a lista oficial (11, 21, 83…). Qualquer 10–11 dígitos é aceito como BR.

---

## 12. Riscos de simplesmente remover o +55

Se `normalizeWhatsappPhone` **parar** de prefixar 55, **sem** migrar dados e **sem** DDI no cadastro:

| Efeito | Gravidade |
|--------|-----------|
| `83988192848` iria ao WPP como nacional. Check-number / send-message falhariam ou cairiam em JID errado | **Alta** — quebra 100% dos pacientes atuais |
| Fila já persistida com `phone: 5583...` continuaria ok até o rebuild; itens novos quebrariam | Alta |
| `wa.me` manuais continuariam com 55 (código separado) — comportamento **inconsistente** | Média |
| Números já gravados *com* 55 (13 dígitos) seguiriam funcionando | — |
| Teste com `17137326616` deixaria de virar `5517...` (efeito colateral “positivo”, mas não é o objetivo) | — |
| Canal Chat inbound perderia variantes 55 vs nacional | Alta |

**Não remover o prefixo.** Qualquer mudança precisa de regra de retrocompatibilidade (abaixo) e de tratar `wa.me` na mesma etapa.

---

## 13. Pontos que precisarão mudar no futuro (internacionais)

Sem implementar agora; lista de impacto:

**Cadastro / UI**

- `formatTelefone` e duplicata em `lib/meta/metaNutriPersonalVerificacao`
- `ModalDadosPacienteChat` e `MetaPacienteWizard` (slice 11 + placeholder BR)
- `validateMetaChatStep` / resume (`tel.length < 10`)
- `PacienteIdentificacaoTabEdit` / `TabContent`
- Máscaras de nutri/personal/psi/CRM/leads/Instagram/white-label

**Envio**

- `normalizeWhatsappPhone` e `applyBrazilMobileNinthDigit`
- `sendTestMessage` (mensagem de erro “DDI+DDD+9º dígito”)
- Placeholder da tela de teste (`5511999999999`)
- Todos os `wa.me/55` e `cleanPhoneBr`

**Dados / matching**

- `phoneLookupVariants`, `phonesLikelyMatch`, `canalChatPhoneKey`
- `pacienteTemTelefoneParaWhatsapp`
- EasySign E.164
- Display BR-only (`formatTelefoneBrDisplay`, `formatContatoChatPhoneDisplay`)

**Produto**

- Seletor de país na anamnese e na Identificação (pedido futuro A/B)
- Default 🇧🇷 +55
- Envio com E.164 completo (C)

---

## 14. Estratégia de retrocompatibilidade possível (sem implementar, sem migrar agora)

Objetivo: conviver com `telefone = "83988192848"` **e** com `351912345678` / `13055551234`.

### Heurística só no envio (mínimo, frágil)

```
dígitos = strip(telefone)
se começa com 55 e length 12–13 → BR já com DDI
se length 10 ou 11 → assumir BR, prefixar 55   ← comportamento ATUAL
se length 12–15 e não começa com 55 → tratar como E.164 estrangeiro (não prefixar)
```

Isso **já é quase o código atual**. Portugal 12 dígitos já passaria. O que **quebra** é:

- EUA **com** DDI: `1` + 10 dígitos = **11 dígitos** → hoje vira `55` + EUA (o bug do teste).
- EUA **sem** DDI: 10 dígitos → indistinguível de um fixo/celular BR antigo.

Heurística **não** diferencia `83988192848` (BR) de `3055551234` (US) sem um DDI explícito.

### Estratégia recomendada para o futuro (ainda não fazer)

1. **Não migrar em massa** os documentos antigos.
2. Acrescentar no cadastro (quando for a hora):
   - `dadosIdentificacao.telefoneDdi` (ex. `"55"`, `"1"`, `"351"`) **ou**
   - `dadosIdentificacao.telefoneE164` (ex. `"5583988192848"`)
3. **Leitura de envio:**
   - se existir E.164 / DDI explícito → usar isso;
   - senão → regra legado: 10/11 dígitos = Brasil (`55`).
4. UI: seletor de país default BR; o campo nacional continua parecido com o de hoje para quem não muda nada.
5. Pacientes antigos: DDI ausente = `55`. Zero rewrite no Firestore.
6. Quando um registro for **editado** na Identificação/anamnese nova, aí sim gravar DDI (ou E.164) daquele paciente — *lazy backfill*, não job.

Como distinguir visualmente depois, sem migração:

| Sinal | Interpretação |
|-------|----------------|
| Sem `telefoneDdi` / sem E.164, 10–11 dígitos | Legado BR |
| `telefoneDdi === "55"` | BR explícito |
| `telefoneDdi !== "55"` | Internacional |
| 12–15 dígitos começando com 55 | BR já com DDI (raro no cadastro atual) |
| 12–15 dígitos não-55 | Provável internacional já completo (não existe no cadastro paciente hoje) |

O caso **impossível** de resolver só com string: US de 10 dígitos vs BR de 10 dígitos. Por isso o seletor de país na UI é necessário; a heurística sozinha não basta.

---

## 15. Fonte da verdade recomendada (futuro)

### Opção A — DDI separado + telefone nacional

```
telefoneDdi: "55"
telefone: "83988192848"
```

**Vantagens**

- Mapeia 1:1 o seletor `[🇧🇷 +55 ▼] [telefone]`.
- Legado: DDI vazio ⇒ 55. **Não precisa migrar.**
- Máscara nacional pode continuar específica por país.
- Evita colisão EUA 11 dígitos vs BR 11 dígitos.

**Desvantagens**

- Dois campos para manter consistentes.
- Envio precisa **compor** E.164 (`ddi + nacional`).
- Relatórios/buscas por telefone continuam precisando da composição.

### Opção B — um único E.164 (`5583988192848` / `+5583988192848`)

**Vantagens**

- Um campo; WhatsApp/WPP já consomem dígitos.
- Padrão internacional.

**Desvantagens com os dados atuais**

- Os documentos **não** estão em E.164.
- Gravar E.164 no mesmo `telefone` mistura legado `839...` com novo `55839...` / `1305...`.
- Sem DDI na UI, o operador não sabe o que editar.
- EUA 10 dígitos ainda seria prefixado 55 se alguém salvar só a parte nacional.

### Opção C — híbrida (recomendada)

- **UI / cadastro:** DDI separado (default 55) + número nacional.  
- **Envio / Canal Chat / logs:** E.164 derivado (`ddi + dígitos nacionais`), sem `+`.  
- **Firestore legado:** `dadosIdentificacao.telefone` permanece como está.  
- **Campo novo (quando implementar):** `telefoneDdi` (e opcionalmente `telefoneE164` denormalizado no save).  
- **Regra de leitura (única função futura no lugar do if 10/11):**

  1. Se `telefoneE164` existir → usar.  
  2. Senão se `telefoneDdi` existir → `ddi + digits(telefone)`.  
  3. Senão → comportamento **atual** (`normalizeWhatsappPhone`).

Isso preserva `83988192848`, desbloqueia `+1 305 …` / `+351 …`, e concentra a mudança em **uma** função de resolução — hoje espalhada em `normalizeWhatsappPhone` + dezenas de `wa.me`.

**Não usar** “telefone completo só no WhatsApp, cadastro continua só BR” como estado permanente: o teste `17137326616` mostra que qualquer input de 10–11 dígitos é interpretado como Brasil.

---

## Apêndice A — Payload enviado ao provider (sem secrets)

Config lida em runtime (valores **não** reproduzidos):

- `WPP_SERVER_URL` — base, ex. documentado `https://whatsapp.oftware.com.br`
- `WPP_SERVER_SECRET_KEY` — só servidor
- `WHATSAPP_MOCK_MODE`

Endpoints WPP usados no envio:

```
GET  /api/:session/check-connection-session
GET  /api/:session/contact/pn-lid/{phone}@c.us
GET  /api/:session/check-number-status/{phone}@c.us
POST /api/:session/send-message
     {
       phone: "<digits ou lid user>",
       isGroup: false,
       isNewsletter: false,
       isLid: boolean,
       message: "<texto>",
       options: { createChat: true, waitForAck: true }
     }
```

O `+` **não** é enviado. O DDI entra como dígitos `55...`. O 55 é acrescentado **antes** da chamada HTTP, no Oftware, não na VM.

---

## Apêndice B — Resposta direta ao teste `17137326616`

```
input UI          17137326616
    ↓ trim
API body.phone    17137326616
    ↓ sendWhatsappTestMessageForDoctor (sem formatar)
    ↓ sendTestMessage
normalizeWhatsappPhone
    length 11, !startsWith("55")  →  "55" + "17137326616"
    ↓
check-number      5517137326616@c.us
    numberExists: false
    ↓
erro              "O número 5517137326616 não está no WhatsApp. Confira DDI+DDD+número (com o 9º dígito)."
```

Arquivo da concatenação: `services/whatsappProviderClient.ts`, função `normalizeWhatsappPhone`, condição `length === 10 || length === 11`.  
Arquivo da frase: o mesmo, função `resolveWhatsappChatId`.

---

## Apêndice C — O que esta auditoria não fez

- Não alterou código, Firebase, máscaras nem formato de telefone.  
- Não propôs script de migração.  
- Não inspecionou documentos reais no Firestore (apenas o contrato no código e os exemplos fornecidos).  
- Não leu secrets / tokens da VM.

**Próximo passo (quando autorizado):** desenhar a UI do seletor de país e a função única de resolução E.164 com fallback legado — ainda sem gravar DDI nos pacientes antigos.
