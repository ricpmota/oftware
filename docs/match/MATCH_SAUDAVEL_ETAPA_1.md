# Match Saudável — Etapa 1

A capa visual foi evoluída na [Etapa 1.1](./MATCH_SAUDAVEL_ETAPA_1_1.md). O acesso pela Home e a rota continuam os desta etapa.

## Objetivo

Abrir a experiência visual do Match Saudável dentro da área do paciente `/meta`, sem funcionalidade social e sem leitura de dados clínicos.

Nesta etapa existem apenas:

- o símbolo M no header da Home `/meta`;
- a rota `/meta/match`;
- a landing visual (header, hero, ondas, texto, tipos de conexão, CTA inerte e aviso de privacidade).

## Arquitetura utilizada

A Home `/meta` é o client component `app/meta/page.tsx`. O header mobile da Home e o bottom navigation (Home, Exames, Aplicações, Nutri, Personal) vivem nesse arquivo. O header desktop da Home é `components/meta/home/MetaPatientHeader.tsx`, renderizado só em `lg` e só na aba Home (`estatisticas`).

`app/meta/layout.tsx` não envolve as páginas com navegação. Ele só resolve metadata e devolve `children`.

Por isso `/meta/match` é uma rota irmã, no mesmo padrão de `/meta/personal`: não herda o menu clínico e não exige alteração no bottom navigation compartilhado.

A landing não consulta autenticação, Firestore, APIs nem o prontuário. Quem entra pelo ícone da Home já passou pelo fluxo existente de `/meta`. O botão voltar chama `router.push('/meta')`, o mesmo padrão de navegação já usado na área do paciente.

## Arquivos criados

- `app/meta/match/page.tsx`
- `components/meta/match/MatchLandingPage.tsx`
- `components/meta/match/MatchHeader.tsx`
- `components/meta/match/MatchHero.tsx`
- `components/meta/match/MatchAnimatedWaves.tsx`
- `components/meta/match/match-waves.css`
- `components/meta/match/MatchConnectionTypes.tsx`
- `components/meta/match/MatchPrivacyNotice.tsx`
- `components/meta/match/MatchLogo.tsx`
- `components/meta/match/MatchHomeEntryButton.tsx`
- `docs/match/MATCH_SAUDAVEL_ETAPA_1.md`

## Arquivos alterados

- `components/meta/home/MetaPatientHeader.tsx` — botão do Match antes do sino, só no header desktop da Home.
- `app/meta/page.tsx` — o mesmo botão no header mobile da Home (`activeMenu === 'estatisticas'`), antes do sino.

Lembretes e avatar permanecem com o comportamento anterior.

## Rota criada

`/meta/match`

Metadata da página: título `Match Saudável`, descrição `Conexões para uma vida melhor.`

## Assets utilizados

Arquivos já existentes, sem recriação:

- `/match.png` (`public/match.png`) — logo oficial.
- `/casalmatch.png` (`public/casalmatch.png`) — fotografia do hero.

`match.png` é 1080×1920, com faixas pretas. O símbolo M ocupa aproximadamente x 48–1043 e y 485–1231. `MatchLogo` recorta esse miolo com `overflow: hidden` e posicionamento absoluto. O asset não é editado.

No header da Home o M tem cerca de 26px de altura (largura ~35px, proporção do símbolo) dentro de um alvo de toque de 44×44px, com `aria-label="Abrir Match Saudável"`. Não há texto “Match” no header.

`casalmatch.png` (1536×1024) preenche a largura da coluna com `next/image` (`fill`), `object-fit: cover` e `object-position: center`. O quadro usa `aspect-ratio: 6/5`, o que recorta cerca de 10% de cada lado e mantém a altura inteira da foto. Os dois rostos ficam na faixa central da imagem, fora desse recorte.

## Implementação das ondas

Três camadas de SVG inline, animadas só com CSS (`transform`). Não há PNG, GIF, vídeo nem JavaScript por frame.

- Camada 1: Vital Green `rgba(76, 203, 122, 0.08)`, 12s.
- Camada 2: Deep Blue `rgba(10, 31, 68, 0.04)`, 16s.
- Camada 3: branco, 10s.

Cada camada usa `ease-in-out infinite alternate`, com deslocamento pequeno (`translateX` cerca de 10–18px, `translateY` cerca de 2–6px). O contêiner corta o excesso horizontal para não gerar scroll.

`@media (prefers-reduced-motion: reduce)` zera a animação.

## Comportamento mobile

Pensado para 390–430px de largura. A coluna ocupa 100% até 480px. Sem overflow horizontal medido em 390×844 e 430×932.

O hero fica em largura total. O bloco branco sobrepõe levemente as ondas, com canto superior arredondado. O CTA e os tipos de conexão não navegam e não gravam dados.

## Comportamento desktop

A experiência fica centralizada em `max-width: 480px`. O fundo externo usa `bg-gray-50`, o mesmo cinza da Home `/meta`. O miolo continua branco, no formato de um app.

## Bottom navigation

Nenhuma alteração no menu Home / Exames / Aplicações / Nutri / Personal.

Esse menu está dentro de `app/meta/page.tsx` e só aparece nessa página. `/meta/match` não o renderiza. Outras rotas de `/meta` seguem iguais.

## Funcionalidades propositalmente não implementadas

Onboarding, perfil social, fotos, bio, preferências, descoberta, swipe, like, match, chat, bloqueio, denúncia, filtros, geolocalização, notificações, Firestore, Cloud Functions, APIs e qualquer leitura de dado clínico (peso, IMC, medicação, diagnóstico, tratamento, exames, bioimpedância, prontuário).

Mensagens, configurações e “Ativar meu Match” são visuais. Não abrem modal, não disparam `alert` e não navegam.

## Riscos encontrados

- A Home `/meta` é um arquivo muito grande. A mudança ficou restrita ao import e ao botão ao lado do sino.
- `/meta/match` não adiciona gate de autenticação novo. A página não lê dados. O acesso previsto é pelo ícone da Home já autenticada. Visitante sem sessão que abra a URL vê só a landing estática; o voltar cai em `/meta`, que mantém o redirecionamento já existente.
- `match.png` tem faixas pretas. Sem o recorte em CSS o M ficaria pequeno demais no header.
- Aviso pré-existente ao compilar `/meta`: `CONTRATO_PDF_MARGIN_X_MM` não exportado em `planoTerapeuticoSignaturePageLayout`. Não faz parte desta etapa e não foi alterado.

## Validação desta etapa

- `/meta/match` em 390×844 e 430×932: sem overflow horizontal. Hero em largura total, os dois rostos visíveis.
- Desktop 1280px: coluna de 480px centralizada, fundo `gray-50`, sem menu clínico.
- CTA “Ativar meu Match” não navega. Voltar executa `router.push('/meta')`.
- Animação da onda 1 confirmada em execução (`12s`, `transform`). Com `prefers-reduced-motion: reduce`, `animation-name: none`.
- ESLint dos arquivos novos: sem avisos.
- `tsc --noEmit` só nos arquivos do Match e no header: exit 0. O `tsc` do repositório inteiro abortou por falta de memória (exit 134), problema de ambiente, não destes arquivos.
- `next build` com heap de 8 GB: exit 0. A rota aparece como `ƒ /meta/match`. O build padrão, sem aumentar a memória, também abortou por heap (~2 GB). Warnings de import pré-existentes (`CONTRATO_PDF_MARGIN_X_MM`, webhook do canal de chat) não foram alterados.
- A Home autenticada não foi exercida no browser nesta sessão: sem login, `/meta` segue o redirecionamento já existente para `/`. O ícone foi inserido nos dois headers da Home e `/meta` compilou no dev server.

## Próximos passos

Etapa 2 ainda não foi iniciada. Caminho natural:

1. Definir a camada de dados social separada do prontuário.
2. Gate de acesso alinhado à sessão já usada em `/meta`, sem misturar dados clínicos.
3. Ligar “Ativar meu Match” a um onboarding social próprio.
4. Só então mensagens, configurações e descoberta.
