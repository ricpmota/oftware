# CURSOR PROMPT — Redesign “Hoje” (mobile-first) • Oftware /personal

## Objetivo
Deixar a aba **Hoje** com aparência **premium**, **mobile-first** e com identidade própria (não “template”), **sem** mexer em regras de negócio, serviços, Firestore, tipos ou rotas.

## Regras (não quebrar)
- NÃO alterar: regras de negócio, trainingSessionService, estrutura de dados, queries, tipos, rotas.
- NÃO remover: marcar **Feito / Pulei / Desfazer**, **notas**, **seletor de sessões**.
- Mantém: Tailwind + lucide-react, dark mode consistente.
- Mudanças são **só de UI/UX** (classes, layout, componentes locais).
- Qualquer extração para componentes só depois de estabilizar o visual.

---

## Diagnóstico rápido do problema atual (para guiar as mudanças)
O visual está “genérico” porque os cards usam repetidamente:
- `rounded-2xl shadow-sm border bg-white dark:bg-gray-800`
- spacing e hierarquia de texto parecidas em tudo

**Meta do redesign:** criar um **sistema visual pequeno** (tokens + 3 componentes UI) e aplicar, para que a tela ganhe identidade.

---

# ETAPAS (faça em sequência, commit a cada etapa)

## ETAPA 0 — Mini “design system” local (no MESMO page.tsx)
**Objetivo:** parar de repetir classes genéricas e criar identidade.

1) Crie um objeto de tokens no topo do arquivo (const ui = {...}) com strings Tailwind:
- `surface`: fundo do app (gradiente sutil no topo, sólido no resto)
- `card`: base do card (sem shadow “template”; use ring + blur)
- `cardAlt`: variação (para listas)
- `pill`: chip padrão
- `btnPrimary`, `btnGhost`, `btnDanger`, `btnSuccess`
- `hairline`: bordas finas “premium” (`border-white/10` etc no dark)

2) Crie 3 componentes **locais** (ainda no mesmo arquivo):
- `<Surface>`: wrapper da aba Hoje com fundo “premium”
- `<Card>`: aceita `variant="solid|glass"` e `className`
- `<PrimaryCTA>`: botão com estilo único (nada de emerald puro chapado)

**Importante:** nesta etapa, não mude o layout ainda. Só crie tokens + componentes e aplique de leve (substituindo o básico) para garantir que nada quebre.

---

## ETAPA 1 — Surface + Hero “full-bleed” (a cara do app)
**Objetivo:** o topo precisa parecer app nativo, não painel web.

Troque o Hero atual por esta estrutura (mobile-first):
1) `Surface` com topo “full-bleed”:
- Um background com gradiente sutil + brilho (ex.: `bg-gradient-to-b from-emerald-500/10 via-transparent to-transparent`)
- Uma “mancha”/blur decorativa (div absoluta com `blur-3xl opacity-30`)

2) Hero dentro de `Card variant="glass"` com:
- Linha 1: “Treino de hoje” (small) + microbadge com **status** (Agendado/Concluído/Pulado)
- Linha 2: título grande (`text-2xl font-semibold leading-tight`)
- Linha 3: meta compacta: `X exercícios • Y% • feitos/total`

3) Progresso: substitua a barra simples por **Progress Capsule**:
- Um “pill” horizontal com track e fill dentro (ainda barra), mas com:
  - track com `bg-white/10` no dark e `bg-black/5` no light
  - fill com gradiente (`bg-gradient-to-r from-emerald-500 to-teal-400`)
  - um texto “Hoje: 40%” alinhado à direita

4) CTA principal “Iniciar treino”:
- Estilo único: gradiente + leve glow + ícone play.
- No estado concluído, vira “Treino concluído ✅” com estilo neutro (não cinza feio).

**Não mude a lógica do scroll.** Só o visual e hierarquia.

---

## ETAPA 2 — Card “Próximo exercício” estilo app (mídia primeiro)
**Objetivo:** o card atual parece “lista web”. Precisamos “produto” e foco no toque.

Layout (mobile):
1) Card vira **media card vertical** (não horizontal):
- GIF em cima com proporção 16:9 (`aspect-video`) + `rounded-2xl`
- Overlay no canto: chip “Próximo”
- Overlay sutil no rodapé da mídia (gradiente) para legibilidade

2) Embaixo da mídia:
- Nome do exercício maior (`text-lg font-semibold`)
- Chips pequenos (target + equipamento) usando `ui.pill` (não cinza padrão)
- Prescrição em 1 linha (ex.: `3×10 • 60s`), estilo “caption premium”

3) Ações:
- Área de botões em “action bar” fixa dentro do card (duas colunas):
  - Feito = botão **success** (gradiente leve, não verde chapado)
  - Pulei = botão **danger** (outline + background sutil, não vermelho chapado)
- Botões com `active:scale-[0.99]` e `transition` para sensação “nativa”.

Quando não houver próximo exercício:
- Mostre um card de celebração com ícone e 2 micro CTAs: “Ver exercícios” (abre accordion) e “Adicionar nota” (scroll até notas).

---

## ETAPA 3 — “Ver todos” vira lista premium (sem “cards iguais”)
**Objetivo:** evitar repetição de card e sensação template.

1) O accordion permanece, mas o conteúdo vira **lista** com separadores:
- Em vez de card gigante com fundo colorido, use:
  - linha com mini thumb (quadrado 56x56), título, meta (sets×reps), e status chip.
  - separador hairline (`ui.hairline`).
- Para “feito” e “pulei”: adicione **accent bar** lateral de 2px (verde/vermelho) e badge pequeno, sem pintar o card todo.

2) Ao tocar numa linha, ela expande inline (detalhes):
- Chips + botões Feito/Pulei/Desfazer aparecem no expand (apenas 1 linha expandida por vez).
- Isso reduz “altura” e deixa mais app-like.

**A lógica de marcar/desfazer continua igual**, só reposiciona UI.

---

## ETAPA 4 — Seletor de sessões: vira “segmented pills” sticky
**Objetivo:** quando existem várias sessões hoje, o usuário precisa trocar rápido.

1) Transforme o seletor em uma faixa sticky logo abaixo do hero:
- `position: sticky; top: (altura do header)`
- fundo com blur (`backdrop-blur`) e hairline

2) Pills:
- selecionado com gradiente leve e brilho
- não selecionado com background translúcido (não cinza sólido)
- texto secundário menor com data/status

---

## ETAPA 5 — Notas como “sheet” (mais nativo no mobile)
**Objetivo:** textarea grande em card parece formulário web.

1) Em mobile, as notas aparecem como card compacto com preview de 1–2 linhas e botão “Editar”.
2) Ao clicar “Editar”, abre **Bottom Sheet** (modal) com:
- textarea grande
- botão “Salvar” fixo no rodapé
- estados: Salvando… + spinner (já existe)
3) Em desktop, pode manter inline (sem sheet).

---

## ETAPA 6 — Polimento final (micro detalhes que tiram o “template”)
Checklist obrigatório:
- Menos `shadow-*`. Preferir `ring-1 ring-black/5` (light) e `ring-white/10` (dark).
- Mais “glass”: `bg-white/70 backdrop-blur` (light) e `bg-gray-900/40 backdrop-blur` (dark).
- Ícones consistentes (tamanho 18–20 no mobile).
- Espaçamento vertical: hero (16), próximo (12), lista (12), notas (12) — sem `space-y-6` em tudo.
- Tipografia: título sessão 2xl, headers 18–20, captions 12–13.
- Botões: mesma altura (44px), raio consistente, estados active/disabled bonitos.

---

# O que NÃO fazer nesta entrega
- NÃO criar “1 exercício por tela”, timer, cronômetro, áudio, lembretes novos.
- NÃO mexer em calendário, histórico, estatísticas.
- NÃO alterar a forma como exercícios são buscados/salvos.

---

## Saída esperada
Ao final, a aba Hoje deve parecer **app premium**:
- Topo com personalidade (surface + hero)
- Próximo exercício “mídia primeiro”
- Lista compacta com expand, sem card repetido
- Seletor sticky elegante
- Notas em bottom sheet no mobile
- Dark mode com contraste perfeito
