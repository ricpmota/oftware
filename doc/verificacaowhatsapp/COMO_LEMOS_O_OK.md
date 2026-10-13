# Como lemos o “OK” do Canal Chat — e por que ainda pode falhar

**Data:** 23/08/2026  
**Objetivo:** documentar o fluxo **real** de hoje (não o desejado), para enxergar o que quebra quando o paciente responde `Ok` e nada acontece.

Se o OK não confirma o paciente, **quase nunca é “o texto Ok não foi reconhecido”**. O reconhecimento de `Ok` / `OK` / `ok` / `OK ✅` já está no código. O que costuma falhar é o **passo anterior**: a mensagem **não chega** na Oftware.

---

## 1. O que deveria acontecer

1. Canal Chat (WhatsApp do sistema, sessão `system_canal_chat`) envia o pedido: *responda apenas OK*.
2. Paciente responde `Ok` no WhatsApp.
3. A VM WPPConnect dispara um POST para a Oftware.
4. A Oftware autentica o POST, interpreta o JSON, acha o paciente pelo telefone e grava:
   - `canalChatVerified: true`
   - `canalChatVerifiedAt`
   - `canalChatPhoneKey`
5. Se houver cobrança pendente (`pendingCanalChatAction`), a cobrança é enviada na sequência.
6. A aba **Verificação** no metaadmingeral lista quem tem `canalChatVerified == true`.

Se qualquer hop entre 2 e 4 falhar, o Firestore não muda, a aba fica vazia e a cobrança não sai.

---

## 2. Como lemos a resposta hoje (código)

Não lemos a conversa no celular. **Não há inbox.** Só existe um webhook:

```
Paciente → WhatsApp → WPPConnect (VM)
                      → POST https://www.oftware.com.br/api/whatsapp/inbound?secret=...
                      → processCanalChatInbound()
                      → Firestore pacientes_completos
```

Arquivos:

| Peça | Arquivo |
|------|---------|
| Endpoint | `app/api/whatsapp/inbound/route.ts` |
| Parser do JSON | `lib/whatsapp/canalChatInboundMessage.ts` |
| Gravação + busca do paciente | `services/canalChatInboundService.ts` |
| Secret na URL | `lib/whatsapp/webhookSecret.ts` |
| Config da VM | `infra/whatsapp/wppconnect/config.runtime.js` |
| Sessão institucional | `lib/whatsapp/canalChatOwner.ts` (`canal_chat` / `system_canal_chat`) |

### 2.1 Autenticação

O WPPConnect **não envia** header `x-webhook-secret` (`axios.post(url)` sem extraHeaders). Por isso o secret vai na **query**:

`https://www.oftware.com.br/api/whatsapp/inbound?secret=<WHATSAPP_INBOUND_WEBHOOK_SECRET>`

A Oftware aceita secret em:

- query `?secret=` ou `?token=`
- header `x-webhook-secret` (se algum dia existir)
- `Authorization: Bearer …`

O valor tem que ser **o mesmo** na Vercel (`WHATSAPP_INBOUND_WEBHOOK_SECRET`) e na VM (`WHATSAPP_INBOUND_WEBHOOK_SECRET` + `WEBHOOK_URL`).

Sem secret na Vercel → HTTP 503.  
Secret errado / ausente na URL → HTTP 401.  
**Nenhum dos dois grava verificação.**

### 2.2 O que extraímos do JSON

O WPPConnect manda o objeto da mensagem + `event` + `session`. Extraímos:

| Campo | Onde olhamos |
|-------|----------------|
| Evento | `event`, `eventName`, `wook` |
| Sessão | `session`, `sessionName`, `sessionId` |
| Texto | `body`, `content`, `text`, `caption`, `conversation` |
| Tipo | `type` (`chat` = texto) |
| Telefone | `from`, `senderPn`, `sender.id`, `chatId`, `to` (se `fromMe`) |
| Grupo | `isGroupMsg` / `@g.us` |

`@lid` **sozinho não é telefone**. Sem `senderPn` (ou equivalente), descartamos: `telefone_ausente`.

### 2.3 O que conta como OK

Depois de trim, caixa alta e tirar pontuação/emoji/markdown:

- aceita: `OK`, `ok`, `Ok`, `OK ✅`, `Ok.`, `ok!`, `*Ok*`
- rejeita: `ok obrigado`, `está ok`, `ok doutor`, `O K`

Se o texto não vira exatamente `OK` → `nao_ok`. O paciente **não é confirmado**.

### 2.4 Como achamos o paciente

Coleção: `pacientes_completos`.

1. Query `in` em `canalChatPhoneKey`, `dadosIdentificacao.telefone`, `telefone` (variantes 55 / DDD / 9º dígito).
2. Se vazio: pacientes com `pendingCanalChatAction.type == PAYMENT_CHARGE` e telefone equivalente.

Telefone formatado no cadastro (`(83) 99999-9999`) **não casa** na query `in` (Firestore exige igualdade). O fallback da pendência existe para esse caso, mas **só se a cobrança já pediu OK** (gravou pendência + `canalChatPhoneKey`).

### 2.5 O que gravamos no sucesso

```
canalChatVerified: true
canalChatVerifiedAt: serverTimestamp()
canalChatVerifiedByMessageId?: ...
canalChatPhoneKey?: telefone do inbound
```

A aba Verificação consulta **somente** `canalChatVerified == true`. Se esse campo não existir no doc, a lista fica vazia — mesmo que o paciente tenha respondido.

---

## 3. Motivos de ignore (log `[CanalChat] inbound`)

A Oftware **sempre responde 200** se o secret passou. “Funcionou o HTTP” ≠ “confirmou o paciente”.

Olhar `reason` no log da Vercel (`[whatsapp/inbound]` / `[CanalChat] inbound`):

| `reason` | Significado | O que fazer |
|----------|-------------|-------------|
| *(não há log nenhum)* | O POST **não chegou** | Problema na VM / webhook / 401 antes do parser |
| `payload_invalido` | JSON sem from/texto/sessão úteis | Precisamos do JSON cru |
| `grupo` | Mensagem de grupo | Ignorar |
| `nao_texto` | Áudio, figurinha, imagem, etc. | Pedir para digitar OK |
| `nao_ok` | Texto ≠ OK | Ver `text` no log (primeiros 12 chars) |
| `mensagem_propria` | `fromMe` sem telefone de destino | Payload LID / fromMe |
| `sessao_nao_canal_chat` | `session` não é `system_canal_chat` | Webhook de outra sessão |
| `telefone_ausente` | `from` é `@lid` sem número real | Precisa `senderPn` ou outro campo |
| `paciente_nao_encontrado` | Número não bate com nenhum doc | Cadastro / `canalChatPhoneKey` |

---

## 4. Por que “eu mando Ok e não funciona” — hipótese mais provável

Ordem de probabilidade **hoje**:

### A. O webhook não dispara (mais comum)

A sessão `system_canal_chat` foi conectada **antes** de existir `webhookUrl` no `start-session`. O WPPConnect usa:

```
client.config.webhook  ||  config.webhook.url (WEBHOOK_URL da VM)
```

Se os dois estiverem vazios, **o Ok nunca sai da VM**. A Oftware não vê nada.

Mitigação no código: ao abrir **Automações → Canal Chat → Conexão**, tentamos reaplicar o webhook (`ensureSessionWebhook` → `start-session` sem QR novo). Isso **só vale depois do deploy** e se a VM aceitar o POST.

`WEBHOOK_URL` na VM também precisa existir e o container precisa ter sido recriado depois de preencher o `.env`.

### B. 401 — secret diferente

VM anexa `?secret=` com o valor da VM. Vercel compara com o valor da Vercel. Se forem diferentes, o inbound recusa **antes** de ler o Ok.

Log Vercel: `[whatsapp/inbound] unauthorized` com `hasQuerySecret: true|false`.

### C. A mensagem chega, mas o telefone não casa

WhatsApp atual manda `@lid`. Sem número, `telefone_ausente`.  
Ou o número chega, mas o Firestore tem `(83) 9…` e não tem `canalChatPhoneKey` → `paciente_nao_encontrado`.

### D. Texto não é só OK

Menos provável se a pessoa digitou `Ok`. O parser já aceita variações curtas. Frases longas ainda são recusadas de propósito.

---

## 5. Como descobrir em 10 minutos qual hop quebrou

Fazer **nesta ordem**. Sem isso, chutar parser é perda de tempo.

### 5.1 A Oftware recebeu o POST?

Vercel → projeto → Logs → filtrar `whatsapp/inbound` **no segundo** em que o paciente mandar Ok.

- **Nada:** webhook não sai da VM (A) ou 401 nem aparece (URL errada / container antigo).
- **`unauthorized`:** secret (B).
- **`ignored` + `reason`:** a mensagem chegou; usar a tabela da seção 3.
- **`verified` / `already_verified`:** o campo foi gravado; se a aba Verificação está vazia, é outro bug (query/campo).

### 5.2 A VM está postando?

No servidor WPPConnect, ao responder Ok:

```bash
docker compose logs -f --tail=100
```

Procurar `Error calling Webhook` (401, 404, ECONNREFUSED, timeout).  
Silêncio total no envio → `webhook.url` da sessão provavelmente `null`.

Conferir `.env` da VM:

```
WEBHOOK_URL=https://www.oftware.com.br/api/whatsapp/inbound
WHATSAPP_INBOUND_WEBHOOK_SECRET=<igual à Vercel>
```

Depois de editar:

```bash
docker compose up -d --force-recreate
```

A sessão WhatsApp **não precisa** escanear QR de novo só por recriar o container, se os volumes `tokens` / `userDataDir` estiverem montados. Ainda assim, abrir **Conexão** no metaadmingeral para reaplicar o webhook na sessão viva.

### 5.3 Teste sintético (prova o parser, não a VM)

Com o secret da Vercel:

```bash
curl -sS -X POST "https://www.oftware.com.br/api/whatsapp/inbound?secret=SEU_SECRET" \
  -H "Content-Type: application/json" \
  -d "{
    \"event\": \"onmessage\",
    \"session\": \"system_canal_chat\",
    \"from\": \"55XXXXXXXXXXX@c.us\",
    \"body\": \"Ok\",
    \"type\": \"chat\",
    \"isGroupMsg\": false,
    \"fromMe\": false
  }"
```

Trocar `55XXXXXXXXXXX` pelo telefone do paciente (só dígitos, com 55).

Esperado: `{"ok":true,"status":"verified","patientId":"..."}`.  
Aí o parser e o Firestore estão ok. Se o Ok **real** ainda falha, o problema é 100% VM/payload real (LID, session, webhook).

Se o curl já vier `paciente_nao_encontrado`, o cadastro do telefone não casa — aí não é webhook.

### 5.4 Firestore

No doc `pacientes_completos/{id}`:

- `canalChatVerified` é `true`?
- `canalChatPhoneKey` existe?
- `pendingCanalChatAction` ainda está lá?

Verificação vazia + campo `true` = bug da aba.  
Campo ausente = inbound nunca confirmou.

---

## 6. O que podemos fazer para isso passar a funcionar

Três camadas. A primeira é operação; as outras são código.

### Camada 1 — operação (fazer agora, sem código novo)

1. Conferir na Vercel: `WHATSAPP_INBOUND_WEBHOOK_SECRET` preenchido.
2. Conferir na VM: `WEBHOOK_URL` + o **mesmo** secret; recriar container.
3. Abrir metaadmingeral → Automações → Canal Chat → **Conexão** (reaplica webhook).
4. Mandar Ok de novo e olhar log Vercel **na hora**.
5. Rodar o `curl` da seção 5.3 com o telefone real do paciente.

Enquanto o log da Vercel não mostrar `[whatsapp/inbound]` no instante do Ok, **não adianta mexer no parser**.

### Camada 2 — evidência do payload real (código pequeno, alto valor)

Hoje o log só guarda `text` (12 chars), `phoneTail` e `reason`. Não vemos o JSON do WPPConnect.

Gravar, só para Canal Chat e só em ignore, um recorte seguro:

- chaves do JSON
- `event`, `session`, `type`, `from`, `fromMe`
- se existe `senderPn` / `body`
- **não** gravar o secret, mídia, nem o texto completo se for longo

Com um único Ok real no log, paramos de adivinhar LID vs session vs body.

### Camada 3 — plano B se o webhook da sessão viva não existir

O WPPConnect **não entrega inbound confiável** em sessões antigas sem `webhook` no `client.config`. Alternativas:

| Opção | Prós | Contras |
|-------|------|---------|
| **B1. Poll de não lidas** (cron 30–60s, só sessão `system_canal_chat`) | Funciona mesmo sem webhook | Atraso; precisa API `get-all-unread` / chats; mais carga na VM |
| **B2. Forçar start-session com webhook** (já tentamos no status) | Usa o canal oficial | Só funciona se a API da VM atualizar `client.config.webhook` sem derrubar a sessão |
| **B3. Confirmação no app** (botão “confirmei no WhatsApp”) | Independente de webhook | Não prova que foi o paciente no número certo |
| **B4. Aceitar qualquer texto curto** (`ok`, `sim`, `confirmo`) | Menos `nao_ok` | Não resolve webhook morto |

Recomendação: **B1 só depois** de A/B/C da seção 4 estarem descartados com log. Polling é muleta operacional, não o desenho certo.

### Camada 4 — telefone / LID

Se o log mostrar `telefone_ausente`:

- pedir ao WPPConnect um campo de número real (`senderPn`); ou
- ao **enviar** o pedido de OK, guardar o `chatId` devolvido pelo send (pode ser `@lid`) em `canalChatPhoneKey` / `canalChatChatId` e casar inbound por esse id, não pelo DDI.

Isso é o único jeito robusto com LID, porque o WhatsApp deixou de mandar `@c.us` em muitos chats.

---

## 7. Checklist do próximo teste de Ok

Imprimir e marcar:

- [ ] Deploy da Oftware com o inbound atual no ar
- [ ] Secret igual na Vercel e na VM
- [ ] `WEBHOOK_URL` na VM apontando para `/api/whatsapp/inbound`
- [ ] Container recriado depois do `.env`
- [ ] Tela Conexão do Canal Chat aberta (status connected)
- [ ] Pedido de OK enviado para o paciente (para gravar `canalChatPhoneKey`)
- [ ] Paciente respondeu só `Ok`
- [ ] Log Vercel no mesmo minuto: colar `status` / `reason` / `keys`
- [ ] Log VM: se houve `Error calling Webhook`
- [ ] Resultado do `curl` sintético com o telefone do paciente

O item **obrigatório** para o próximo ajuste de código é o log Vercel (ou a prova de que ele **não existe**). Sem isso, qualquer mudança no parser é chute.

---

## 8. Resumo

Lemos o Ok **só** se a VM postar em `/api/whatsapp/inbound` com secret certo. O código então exige texto = OK, sessão Canal Chat, telefone extraível e paciente no Firestore.

Se você manda Ok e a aba Verificação continua vazia, o próximo fato a obter não é “aceitar mais sinônimos de Ok”. É: **o POST apareceu na Vercel?** Se não, o WPPConnect não está avisando a Oftware. Se sim, o `reason` do log diz exatamente o que falta (telefone, paciente, sessão, texto).
