# Ícones do perfil — Match Saudável

Biblioteca visual dos destaques do perfil. Um único arquivo PNG contém todos os desenhos. O componente mostra só o recorte pedido.

Esta etapa não coloca os destaques em cima da fotografia do perfil.

## Asset

| | |
| --- | --- |
| Arquivo servido | `public/match/profile-icons.png` |
| URL | `/match/profile-icons.png` |
| Origem | `public/icones-match.png` (cópia, sem fatiar) |
| Dimensões | 1536 × 1024 px |
| Formato | PNG 32 bpp com canal alfa |

Não existem `cycling.png`, `running.png` nem outros recortes soltos. O navegador baixa a sprite uma vez.

## Transparência

O fundo é alfa de verdade. Amostras do arquivo: alfa mínimo 0, máximo 254, pixels com alfa 0, cantos transparentes. Não há um xadrez desenhado por cima do desenho. Visualizadores que pintam transparência de preto mostram um fundo preto; isso não está no arquivo.

## Grade real

A prancha não é 7 × 5. A primeira faixa tem 7 ícones. As quatro seguintes têm 8. Total: **39**.

Uma divisão em colunas iguais mistura vizinhos, porque a primeira linha tem outro ritmo e os desenhos não ficam no centro da célula. O registry guarda o retângulo medido de cada desenho (pixels com alfa acima de 28).

Faixas usadas só para contar, não para recortar:

| Linha | Y aproximado | Quantidade |
| --- | --- | --- |
| 0 identidade | 73–246 | 7 |
| 1 atividades | 298–460 | 8 |
| 2 experiências | 499–641 | 8 |
| 3 estilo de vida | 680–805 | 8 |
| 4 social | 845–979 | 8 |

A oitava figura da linha de atividades é um sol (`sun`). Ela não estava na lista conceitual de 7 colunas. Foi incluída e documentada, sem forçar a linha a ter 7 células.

## Registry

`components/meta/match/icons/matchProfileIcons.ts`

Toda coordenada da sprite fica aí. Cada item tem:

- `label` — texto em português, só para exibição
- `category` — `identity`, `activity`, `experience`, `lifestyle` ou `social`
- `row`, `column` — posição visual
- `x`, `y`, `width`, `height` — retângulo medido na imagem
- `offsetX`, `offsetY` — deslocamento em pixels do viewport
- `scale` — tamanho relativo ao recorte, 1 preenche o lado maior

IDs estáveis. O rótulo não é identificador.

### Identidade

`married`, `single`, `relationship`, `individual`, `connections`, `family`, `pets`.

`married`, `single` e `relationship` descrevem vínculo. Não são interesses e não entram em `MATCH_INTERESTS`. O componente visual é o mesmo; o dado continua separado. `MATCH_IDENTITY_ICON_IDS` lista esses cinco primeiros.

`family` e `pets` usam o mesmo id da taxonomia de interesses.

### Atividades

`running`, `cycling`, `gym`, `swimming`, `hiking`, `camping`, `beach`, `sun`.

Os cinco primeiros e `beach` repetem ids de `MATCH_INTERESTS`. `camping` e `sun` existem só na sprite.

### Experiências

`travel`, `traveler`, `photography`, `gastronomy`, `coffee`, `cooking`, `wine`, `music`.

`travel`, `photography`, `gastronomy`, `coffee` e `cooking` repetem ids da taxonomia. `traveler`, `wine` e `music` são só da sprite.

### Estilo de vida

`wellbeing`, `healthy_life`, `mind`, `sleep`, `reading`, `technology`, `gaming`, `cinema`.

Os nomes da prancha “wellness” e “healthy lifestyle” foram registrados como `wellbeing` e `healthy_life`, que já existem em `matchTaxonomy.ts`. Não há um segundo id para o mesmo conceito. `mind`, `sleep`, `gaming` e `cinema` são só da sprite. `reading` e `technology` repetem a taxonomia.

### Social

`groups`, `conversation`, `podcast`, `instruments`, `adventure`, `nautical`, `health`, `goals`.

`groups` é o mesmo id do objetivo de conexão na taxonomia, não um interesse. Os demais são só da sprite.

`INTERESTS_WITH_PROFILE_ICON` lista os interesses cujo id já existe no registry.

## Cálculo do recorte

`MatchProfileIcon` cria um quadrado de `size` com `overflow: hidden`. Dentro, um bloco absoluto usa a sprite como `background-image`.

1. O retângulo medido ganha 4 px de folga de cada lado, para não cortar o antialias.
2. `fit = (size / maior lado do retângulo) * scale`.
3. A sprite inteira é desenhada em `1536 * fit` por `1024 * fit`.
4. `left` e `top` colocam o centro do retângulo no centro do quadrado e somam `offsetX` e `offsetY`.

Não há canvas, recorte em JavaScript, base64 nem um pedido por ícone.

## Offsets

Nenhum ícone precisou de `offsetX`, `offsetY` ou `scale` diferente de `0` / `0` / `1` na primeira calibração. O retângulo medido já isola o desenho. Ajuste futuro é só no registry.

## Componente

`components/meta/match/icons/MatchProfileIcon.tsx`

```tsx
<MatchProfileIcon icon="cycling" size={28} />
```

- `decorative` vale `true` por padrão e aplica `aria-hidden="true"`.
- Com `decorative={false}`, o elemento vira `img` e o `aria-label` vem do `label` do registry.
- Id desconhecido não quebra a página. Em desenvolvimento, `console.warn`. No lugar, o `Sparkles` já usado no projeto. Nenhum pedaço da sprite aparece.

Uso futuro, ainda não ligado ao perfil:

```tsx
profileHighlights.map((icon) => (
  <MatchProfileIcon key={icon} icon={icon} size={28} />
))
```

## Página de calibração

`/meta/match/dev/icons`

Mostra todos os ids, em grade, sobre fundo azul e sobre fundo branco, com rótulo e id. Não há link na landing, no header nem na navegação do paciente. `robots` está `noindex`.

## Como adicionar um ícone

1. Medir o retângulo na sprite (não inventar coluna igual).
2. Incluir o id em `MATCH_PROFILE_ICONS`, com categoria, linha, coluna, retângulo, offset e escala.
3. Se o conceito já existe na taxonomia, reutilizar o mesmo id.
4. Abrir `/meta/match/dev/icons` e corrigir só `offsetX`, `offsetY` ou `scale` se o recorte encostar no vizinho.
5. Não criar um PNG separado.

## Limitações

- A grade visual não é regular. `row` e `column` não bastam para posicionar.
- O sol da linha de atividades não estava na lista inicial de sete colunas.
- `wellbeing` e `healthy_life` substituem os nomes conceituais `wellness` e `healthy_lifestyle`.
- Os destaques ainda não aparecem na fotografia do perfil.
- Estado civil da sprite (`married`, `single`, `relationship`) não substitui os ids do formulário (`single`, `married`, `divorced`, `widowed`, `undisclosed`). Só os dois primeiros coincidem.
