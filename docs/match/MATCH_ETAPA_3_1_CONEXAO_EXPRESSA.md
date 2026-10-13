# Match Saudável — Etapa 3.1

Conexão expressa. Um toque demonstra interesse. O segundo toque, do outro lado, cria a conexão.

## Fluxo antigo

Conectar abria um painel com motivo, mensagem opcional e o botão Enviar solicitação. Se a outra pessoa já tinha pedido, a API respondia `incoming_pending` e pedia outro toque em Aceitar conexão. Solicitações era uma lista de cartões.

## Fluxo novo

No Discovery, **X** só mostra a próxima pessoa. Não grava pedido, ignorado nem bloqueio.

**Conectar** chama `POST /api/meta/match/requests` com `{ toUid }`. O servidor decide:

- sem pedido ativo: cria `pending` e responde `interest_sent`
- pedido pendente enviado por mim: `already_sent`
- pedido pendente recebido por mim: na mesma transação marca `accepted` e cria `match_connections/{pairKey}` ativo, responde `connected`
- conexão já ativa: `already_connected`
- bloqueio: `blocked`

`interest_sent` mostra “Conexão solicitada” e, cerca de 450 ms depois, avança. `connected` mostra “Vocês se conectaram.” e só continua quando a pessoa toca Continuar.

Motivo e mensagem deixaram de ser obrigatórios e o formulário saiu da tela. Pedidos antigos podem continuar com `reason` e `message`. Um interesse novo não grava esses campos.

## X

Discovery: próxima pessoa, sem backend.

Querem se conectar (`/meta/match/requests`): ignora o pedido (`ignored`), não cria conexão e não avisa quem enviou. A próxima pessoa entra na hora.

`ignored` e `cancelled` não são interesse ativo. A pessoa pode voltar ao Discovery. Um novo Conectar abre outro `pending` no mesmo `pairKey`.

## Tela de quem quer se conectar

Uma pessoa por vez, no mesmo `MatchProfileStage` do Discovery, modo `incoming-request`. O texto é “Quer se conectar com você”. Na home, o atalho se chama “Querem se conectar”. A rota continua `/meta/match/requests`.

Quem tem pedido pendente, conexão ativa ou bloqueio continua fora do Discovery.

## Segurança

O cliente não decide se virou conexão. A transação lê bloqueio, conexão e pedido antes de escrever. Dois toques seguidos não criam dois documentos: o id é o `pairKey`. O botão fica desabilitado enquanto a chamada está em andamento.

As rules locais continuam com leitura e escrita negadas ao cliente em `match_connection_requests`, `match_connections` e `match_blocks`. Elas não foram publicadas no deploy que só enviou índices. Esse deploy de rules segue pendente. Não publicar neste passo.

Chat e swipe entre pessoas não entram nesta etapa. O carrossel de fotos da mesma pessoa permanece.
