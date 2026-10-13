# Match Saudável — Etapa 1.1

Evolução visual da landing em `/meta/match`. A Etapa 1 (acesso, rota e ícone na Home) permanece.

## Mudança de posicionamento

A capa deixa de sugerir namoro. O Match Saudável passa a ser apresentado como uma rede de conexões por estilo de vida: atividades, amizades, experiências, esportes, bem-estar e grupos. Relacionamento não é o protagonista e saiu da landing.

## Nova fotografia

A logo usada na interface é `/matchlogo.png`.

`/casalmatch.png` foi substituído por `/matchsaudavel2.png` (`public/matchsaudavel2.png`, 940×1672).

A foto mostra cinco pessoas caminhando e pedalando ao ar livre. O texto alternativo é: "Grupo de pessoas caminhando e pedalando juntas ao ar livre".

A logo é `/matchlogo.png`, com o mesmo recorte do símbolo M. O nome oficial continua Match Saudável.

## Hero

A página ocupa a altura da tela (`h-dvh`) e não rola na vertical. A foto preenche esse quadro. Título, pilares, botão, os três cards e o aviso de privacidade ficam na mesma vista, mais acima, sobre o degradê inferior.

Um degradê em código escurece o topo (~38% Deep Blue), deixa o meio quase transparente e fecha a base (~94% Deep Blue), para o texto branco sem apagar os rostos.

O header fica transparente sobre a foto. Voltar ainda vai para `/meta`. Mensagens e configurações continuam sem ação.

## Quatro pilares

No lugar de Relacionamento, Amizades e Companhia:

- Atividades (`PersonStanding`)
- Conexões (`Users`)
- Experiências (`Sparkles`)
- Bem-estar (`Leaf`)

Não são clicáveis. Não há ícone de coração.

## CTA

"Ativar meu Match" virou "Quero fazer parte". Fundo em gradiente da própria família do Vital Green (`#6CD492` → `#4CCB7A`). Texto em Deep Blue `#0A1F44` (contraste alto sobre o verde). O botão não navega, não grava dados e não abre modal.

## Cards de comunidade

`MatchCommunityCards` mostra três cartões translúcidos sobre Deep Blue:

- Pessoas reais
- Eventos e grupos
- Troca de experiências

Os três cards ficam lado a lado em uma grade de três colunas, sem carrossel e sem rolagem horizontal.

A frase "Da mesma jornada de saúde que você" não foi usada.

O aviso de privacidade permanece depois dos cards.

## Ondas

`MatchAnimatedWaves` continua com três camadas SVG e as durações de 12s, 16s e 10s, só com `transform`. As cores passaram a Vital Green e Deep Blue em baixa opacidade, na base da foto, sem a faixa branca da capa anterior. `prefers-reduced-motion: reduce` continua desligando a animação.

## Responsividade

Mobile first, coluna `max-width: 480px` centralizada no desktop, fundo externo `gray-50`. Sem menu clínico. Sem overflow horizontal da página; o scroll horizontal fica só na faixa dos cards.

## Arquivos alterados

- `components/meta/match/MatchLandingPage.tsx`
- `components/meta/match/MatchHeader.tsx`
- `components/meta/match/MatchHero.tsx`
- `components/meta/match/MatchAnimatedWaves.tsx`
- `components/meta/match/MatchConnectionTypes.tsx`
- `components/meta/match/MatchPrivacyNotice.tsx`
- `docs/match/MATCH_SAUDAVEL_ETAPA_1.md` — apontamento para esta etapa

## Arquivo criado

- `components/meta/match/MatchCommunityCards.tsx`
- `docs/match/MATCH_SAUDAVEL_ETAPA_1_1.md`

## O que não mudou

- `MatchHomeEntryButton.tsx` e o ícone M na Home
- `MatchHomeEntryButton.tsx` (o ícone da Home usa o mesmo `MatchLogo`, agora com `/matchlogo.png`)
- rota `/meta/match`
- retorno para `/meta`
- ausência do bottom navigation clínico
- Firestore, APIs e dados clínicos

Nenhuma funcionalidade social foi implementada.
