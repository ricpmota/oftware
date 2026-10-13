# Match Saudável — Etapa 4

Fluxo social oficial e chat de texto entre conexões ativas.

## Fluxo

Descobrir → Conectar → reciprocidade → conexão → mensagem.

1. **Descobrir** (`/meta/match/discover`). Uma pessoa em tela cheia. **X** só avança, sem gravar nada. **Conectar** é um toque.
2. **Querem se conectar** (`/meta/match/requests`). A mesma tela cheia. **X** marca o pedido como `ignored` e segue. **Conectar** devolve o interesse.
3. **Conexão**. Se já existia `pending` no sentido inverso, a mesma transação aceita o pedido e cria `match_connections/{pairKey}` com `status: active`.
4. **Vocês se conectaram.** Overlay com as duas fotos, uma linha verde e os botões Mensagem e Continuar descobrindo.
5. **Mensagens** (`/meta/match/messages` e `/meta/match/messages/[pairKey]`).

Não há formulário, motivo, mensagem obrigatória nem um segundo conceito de “aceitar conexão”.

## Quando a conversa nasce

A conexão não cria conversa. Abrir o chat vazio também não cria. O documento `match_conversations/{pairKey}` nasce na primeira mensagem enviada com sucesso.

O `pairKey` é o mesmo de pedidos, conexões e bloqueios: os dois uids ordenados e unidos por `_`. A conversa de A com B é a de B com A.

## Collections

`match_conversations/{pairKey}`

- `pairKey`
- `users`: `[uidA, uidB]`
- `lastMessage`: `{ text, senderUid, createdAt }`
- `lastMessageAt`
- `unreadCountByUid`: mapa `{ [uid]: number }`
- `createdAt`, `updatedAt`

`match_conversations/{pairKey}/messages/{messageId}`

- `senderUid` (sempre o uid autenticado)
- `text`
- `createdAt`

O id da mensagem é o `clientMessageId` enviado pelo app (`^[A-Za-z0-9_-]{8,80}$`). Reenvio do mesmo id não duplica a mensagem nem soma não lidas de novo.

V1 é só texto, no máximo 2000 caracteres, com trim. Vazio é recusado no cliente e no servidor.

## APIs

Todas exigem Bearer token. O uid vem da autenticação.

- `GET /api/meta/match/messages` — conversas com pelo menos uma mensagem, conexão ativa e sem bloqueio. Ordenação por `lastMessageAt` em memória.
- `GET /api/meta/match/messages/{pairKey}?before=` — até 40 mensagens, as mais recentes primeiro na query e devolvidas da mais antiga para a mais nova. Não cria conversa.
- `POST /api/meta/match/messages/{pairKey}` — `{ text, clientMessageId }`. Valida conexão ativa, bloqueio e participação. Cria conversa e mensagem na mesma transação.
- `POST /api/meta/match/messages/{pairKey}/read` — zera `unreadCountByUid` de quem está lendo.

Códigos de recusa: `invalid`, `blocked`, `inactive`, `forbidden`.

## Não lidas

O servidor incrementa `unreadCountByUid` da outra pessoa dentro da transação de envio. O cliente não escolhe o remetente nem o contador. Abrir a conversa chama a rota de leitura. Badge só aparece quando o total é maior que zero, na home e na lista.

## Tempo real

A conversa aberta escuta `match_conversations/{pairKey}/messages` com `onSnapshot`, ordenado por `createdAt`, limite 40. A lista escuta a coleção filtrada por `users array-contains` só como sinal e volta a buscar a API, para nome e foto continuarem passando pela privacidade do servidor.

Sem polling. Se as regras ainda não estiverem publicadas, o listener falha em silêncio e a API continua sendo a fonte.

## Paginação

Cada página tem 40 mensagens. Ao chegar perto do topo, o cliente pede `before` com o `createdAt` da mais antiga já carregada e preserva a posição do scroll. A lista de conversas lê até 80 documentos e ordena em memória, para não depender de índice composto ainda não publicado.

## Segurança

Mensagem nova exige conexão `active`, os dois uids no documento, e ausência de `match_blocks/{pairKey}` em qualquer direção. Conexão inativa ou bloqueio impede mensagem nova mesmo que a conversa antiga exista. Um terceiro não passa da checagem de participação.

O cliente não escreve `match_conversations` nem `messages`.

## Firestore Rules

Alteração local, **sem deploy**:

- `match_conversations/{pairKey}`: leitura se o uid autenticado está em `users`; escrita negada.
- `messages`: leitura se existe conexão ativa, o uid está em `users` e não existe bloqueio; escrita negada.
- `isMatchSocialPath` também cobre conversa e subcoleção, para o fallback autenticado não liberar escrita.

Pedidos, conexões e bloqueios continuam com leitura e escrita negadas no cliente.

As regras desta etapa, e as regras sociais anteriores que ainda não foram publicadas, ficam pendentes de deploy.

## Índices

Nenhum índice novo. A lista usa só `array-contains` em `users`. As mensagens usam `orderBy createdAt`, índice automático de campo único. Não ordenar `lastMessageAt` no Firestore nesta versão.

## Componentes

- `MatchConnectedMoment` — momento da conexão, com Mensagem e Continuar.
- `MatchMessagesScreen` — lista, busca local pelo nome, estado vazio.
- `MatchChatScreen` — bolhas, datas, envio, estados enviando / enviada / não enviada.
- `MatchConnectionRow` e o perfil conectado abrem o mesmo `pairKey`.
- A home habilita Mensagens e o ícone do cabeçalho.

## Limitações da V1

Sem imagem, áudio, chamada, presença, “digitando”, reação, resposta, edição, exclusão, stories ou feed. Sem desfazer conexão na interface: se a conexão deixar de estar `active`, novas mensagens já são recusadas. A lista não garante todas as conversas além das 80 mais recentemente retornadas pela query sem ordenação.
