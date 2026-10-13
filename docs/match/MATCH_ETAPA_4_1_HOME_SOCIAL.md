# Match Saudável — Etapa 4.1

A Home deixa de ser uma landing de tela cheia e passa a abrir nas pessoas da rede.

## Antes

`/meta/match` era um hero em `h-dvh`, sem scroll. A foto, o título com folga de 4 cm, os quatro pilares (Atividades, Conexões, Experiências, Bem-estar), o CTA e, no fim, um chip de texto e uma faixa pequena de avatares. Mensagens e Conexões eram dois links no rodapé do hero.

## Agora

A ordem é: header, hero compacto, Suas conexões, Querem se conectar, Mensagens recentes, navegação inferior.

Quem já tem conexão vê o hero em cerca de metade da primeira tela (`min(52dvh, 30rem)`, com mínimo de 22rem). Sem conexões, o hero fica um pouco maior (`min(68dvh, 36rem)`). A página rola na vertical. A foto continua `/matchsaudavel2.png`.

Os quatro pilares saíram da Home ativa. As ondas do hero também saíram, para não cobrirem o botão. “mais saudável” ficou em azul claro (`#D7E6FF`) porque, no recorte menor, o azul profundo `#0A1F44` some no degradê escuro da foto.

## Dados

Nenhuma API nova e nenhum schema novo. A Home autenticada e com onboarding concluído faz as mesmas três leituras de antes:

- `GET /api/meta/match/connections?limit=8` — carrossel
- `GET /api/meta/match/requests` — rostos e contagem; a faixa mostra até 8, o badge usa o total
- `GET /api/meta/match/messages` — até 3 linhas e o não lido do header e da barra

Fotos e nomes vêm do cartão público que essas rotas já devolvem.

## Empty states

Sem conexão: “Suas conexões aparecerão aqui.” e o texto de descobrir pessoas. Sem avatares inventados.

Interesse recebido igual a zero: a seção some.

Sem conversa: uma linha, “Suas conversas aparecerão aqui.” O CTA grande do hero não se repete.

## Navegação

`MatchSocialNav` fica fixa embaixo, com safe area, em Deep Blue. Itens: Descobrir (`/meta/match/discover`), Conexões (`/meta/match/connections`), Mensagens (`/meta/match/messages`), Perfil (`/meta/match/profile`). O item da rota atual usa Vital Green e `aria-current="page"`. O badge de mensagens usa o `unreadTotal` já calculado e só aparece se for maior que zero.

A barra entra na Home, na lista de conexões e na lista de mensagens. Não entra no chat, no Discovery, em Querem se conectar, no perfil de outra pessoa nem no perfil próprio: essas telas são full-screen e o perfil já tem o dock de seções. `MatchProfileStage` não foi alterado.

No desktop a barra vira uma dock central de até 480px, não uma faixa de ponta a ponta.

Tocar um rosto em Querem se conectar abre `/meta/match/requests?uid=`, e a tela full-screen começa nessa pessoa quando ela está na lista.

## Componentes

Reutilizados: `MatchHeader`, `MatchHero`, `MatchRecentConnections`, `MatchPrivacyNotice`, `MatchCommunityCards` (só antes do onboarding).

Novos: `MatchSocialNav`, `MatchHomeMessages`.

Chat, Discovery, pairKey, collections e regras não foram reescritos.
