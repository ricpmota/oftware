# Match Saudável — Etapa 3

Discovery, afinidades, solicitações e conexões. Sem chat e sem swipe de aprovação.

## O que foi reutilizado

- `MatchProfileStage` nos modos `self`, `discovery` e `connection`.
- Dock, painéis e animação já existentes (Framer Motion, mesma mola dos depoimentos).
- `profile-icons.png` para ícones sociais e `icones-perfil.png` para a navegação.
- `MatchAchievementBadge` para medalhas e para afinidades de conquista.
- `buildMatchViewerCard` com audiência `public`, respeitando `showAge`, `showCity`, `showInterests`, `showAvailability`, `showJourney` e visibilidade das medalhas.

Viver e Rotina continuam fora do dock, como pedido depois da etapa 2.2. A sprite e o registry não mudaram.

## Fluxo

1. Home: se o onboarding não terminou, o botão continua **Quero fazer parte** e abre `/meta/match/onboarding`.
2. Se `onboardingCompleted` é verdadeiro, o botão vira **Descobrir conexões** e abre `/meta/match/discover`.
3. A pessoa ocupa a tela. Setas laterais só trocam o perfil. Passar adiante não rejeita.
4. O chip **coisas em comum** abre o mesmo painel do perfil.
5. **Conectar +** abre o motivo e uma mensagem opcional de até 300 caracteres.
6. A outra pessoa vê a solicitação em `/meta/match/requests`, aceita ou ignora, e pode abrir o perfil.
7. Aceitar cria uma única conexão em `/meta/match/connections`.

Mensagens aparece na home apenas como rótulo, sem rota e sem backend.

## Coleções

`match_connection_requests/{pairKey}`

- `pairKey`: uids ordenados e unidos por `_`
- `fromUid`, `toUid`, `users`
- `reason.id`, `reason.labelSnapshot`
- `message` opcional
- `status`: `pending` | `accepted` | `ignored` | `cancelled`
- `createdAt`, `updatedAt`, `respondedAt`

`match_connections/{pairKey}`

- `users`, `pairKey`, `createdFromRequestId`
- `status`: `active`
- `connectedAt`

`match_blocks/{pairKey}`

- Reservado. Sem tela nesta etapa. Se o documento existir, o par sai do discovery e não pode solicitar conexão.

## Quem aparece

Perfil `status === active`, `onboardingCompleted === true`, outro uid, sem bloqueio, sem conexão ativa e sem solicitação `pending` nos dois sentidos.

Filtros aplicados: `ageMin`/`ageMax` (idade calculada no servidor, data de nascimento não vai para o cliente) e `discoveryPreferences.connectionGoals` quando a lista não está vazia. `my_city` e `nearby` comparam cidade e estado em texto. `radiusKm` não é calculado: não há coordenada. `showMe` não é aplicado: o perfil social não guarda sexo.

Ordem: mais afinidades primeiro, depois `updatedAt`, depois uid. Nada disso aparece como porcentagem.

Lotes de até 20 documentos, no máximo 12 pessoas por resposta, até 3 páginas internas.

## Afinidade

`getMatchCommonalities` compara só IDs. Interesses e disponibilidade só entram se os dois perfis compartilham essa parte. Conquistas e objetivos só entram se estão públicos. Atividade e objetivo de conexão entram pelos IDs salvos. Rótulos parecidos com IDs diferentes não contam.

## Segurança

O cliente não lê o perfil dos outros: `match_profiles` continua só do dono. Discovery, envio, aceite e ignorar passam por API com token Firebase e Admin SDK.

Aceitar e enviar rodam em transaction. O aceite grava `accepted` e cria a conexão no mesmo passo. O remetente não marca `accepted`. Documento do par impede duas solicitações `pending`. Se a solicitação inversa já existe, a API responde `incoming_pending` e a tela oferece aceitar.

Regras: `match_connection_requests`, `match_connections` e `match_blocks` com `read, write: if false` para o cliente. O catch-all autenticado não cobre esses caminhos. As regras foram alteradas no arquivo e **não foram publicadas**.

## Índices

Em `firestore.indexes.json`, ainda sem deploy:

- `match_profiles`: `status` + `updatedAt` desc
- `match_connection_requests`: `toUid` + `status`
- `match_connection_requests`: `fromUid` + `status`
- `match_connections`: `users` array-contains + `status`

## Limitações da V1

- Sem chat, notificação, GPS, score ou bloqueio na interface.
- `nearby` não usa quilômetros.
- `showMe` fica para quando houver um dado social de quem a pessoa quer ver, sem copiar dado clínico.
- Ignorar não avisa o remetente. A pessoa pode voltar ao discovery.
- Perfis ativos sem `updatedAt` não entram na ordenação até serem salvos de novo.

## Próxima etapa

Publicar regras e índices. Bloqueio na interface. Mensagens a partir de uma conexão `active`.
