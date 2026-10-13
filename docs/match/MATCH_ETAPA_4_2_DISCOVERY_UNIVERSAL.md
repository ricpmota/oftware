# Match Saudável — Etapa 4.2

Discovery universal com perfil social mínimo. O onboarding deixa de ser a única porta de entrada e passa a enriquecer o perfil.

## Auditoria

Os candidatos saíam só de `match_profiles` com `status == active` e `onboardingCompleted == true`. Quem nunca abriu o Match não tinha esse documento e não aparecia.

O uid do Match é o uid do Firebase Auth. O prontuário fica em `pacientes_completos`, ligado por `userId`. Lá existem nome, endereço, telefone, e-mail e pastas clínicas. A foto do Google não está nesse documento: ela fica em `photoURL` do Firebase Auth e só é lida no servidor com `getAuthAdmin().getUser`.

O produto já tratava o perfil social como opt-in. A pessoa só passava a existir para os outros ao concluir o onboarding. `pacientes_completos` não é uma lista social.

## Decisão de privacidade

Não há varredura de `pacientes_completos` nem `listUsers()` no Discovery. Publicar nome, cidade e foto de quem nunca aceitou aparecer mudaria o consentimento em silêncio.

O opt-in continua obrigatório. Ele acontece em um destes pontos:

1. Concluir o onboarding, como já acontecia.
2. Ligar **Aparecer no Match**. Isso publica só o perfil mínimo, sem bio, interesses, atividades, conquistas ou objetivos.

Desligar o interruptor tira a pessoa do Discovery. Não apaga perfil, conexões nem mensagens.

## Elegível

Uid válido do Firebase Auth, nome público resolvido, não é o próprio usuário, não está bloqueado, não tem conexão ativa nem pedido pendente, não está com `status: paused` e não desligou `discoverable`.

Sem nome, o interruptor não publica o perfil.

## Perfil mínimo

`match_discovery_profiles/{uid}` guarda somente:

- `uid`
- `displayName`
- `photoUrl`, quando houver
- `city` e `state`, quando houver
- `discoverable`
- `updatedAt`

A ordem da foto é: foto principal do Match, depois `photoURL` https do Firebase Auth, depois a inicial do nome. A imagem do Google não é copiada para o Storage.

Nome e cidade vêm, nesta ordem, do `match_profiles`, da projeção já salva, de `dadosIdentificacao.nomeCompleto` e `endereco.cidade` / `endereco.estado`, e do `displayName` do Auth. Nenhum outro campo do prontuário é lido para o cartão.

O cartão público continua sendo o de `buildMatchViewerCard`. Se existe `match_profiles`, ele vence. A projeção só preenche nome, cidade, estado e foto que ainda não existam.

Cidade é comparada por uma chave sem acento, sem caixa e sem sufixo ` - PB`. O texto mostrado não é reescrito. Se a única coisa em comum é a cidade, o Discovery mostra **Mesma cidade**. Interesses e conquistas continuam no motor atual. Não há score.

## Performance

A lista lê até 60 projeções com `discoverable == true` e a página já existente de `match_profiles` ativos. A ordenação é em memória: mesma cidade, depois afinidades, depois `updatedAt`. Não há índice composto novo. A igualdade em `discoverable` usa o índice automático.

## Regras

`match_discovery_profiles` está negado para leitura e escrita do cliente, e fora do fallback autenticado. As regras não foram publicadas.

## O que não mudou

Chat, mensagens, momento da conexão, barra inferior, conquistas e ícones do perfil. O dock do perfil de outra pessoa esconde seções vazias. A Home, se já houver interesse recebido, mostra esses rostos mesmo antes do onboarding completo.
