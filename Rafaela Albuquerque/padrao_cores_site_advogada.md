# Padrão de Cores do Site — Baseado na Logo

Este arquivo foi criado com base na tonalidade predominante da logo enviada.
A identidade visual observada trabalha principalmente com:

- **Azul petróleo suave / turquesa elegante** da assinatura gráfica
- **Cinza grafite suave** do nome principal
- **Branco / cinza muito claro** como base limpa e sofisticada

## 1. Cores principais extraídas da logo

### Cor primária
- **Nome:** Azul assinatura
- **Hex:** `#4099B3`
- **Uso recomendado:** botões principais, links, destaques, ícones, linhas finas, títulos secundários, detalhes visuais

### Cor secundária
- **Nome:** Cinza institucional
- **Hex:** `#656263`
- **Uso recomendado:** títulos principais, textos institucionais, menu, rodapé, subtítulos escuros

### Cor de fundo base
- **Nome:** Branco suave
- **Hex:** `#FFFFFF`
- **Uso recomendado:** fundo principal do site

## 2. Escala expandida para o sistema do site

### Escala do azul
- `#EAF5F8` → fundo muito leve de cards e blocos informativos
- `#CFE7EE` → hover muito suave, fundos de destaque discretos
- `#8CC3D3` → bordas suaves e detalhes complementares
- `#4099B3` → cor primária oficial
- `#2F7F96` → hover de botão principal
- `#245F70` → títulos sobre fundo claro quando quiser mais contraste

### Escala do cinza
- `#F7F7F7` → fundo alternado de seções
- `#E9E7E7` → bordas leves
- `#C9C6C7` → divisórias e elementos desabilitados
- `#656263` → texto institucional principal
- `#4E4B4C` → texto mais forte
- `#2F2D2E` → títulos escuros de alto contraste

## 3. Aplicação sugerida no layout

### Fundo do site
- Fundo principal: `#FFFFFF`
- Fundo alternado de seção: `#F7F7F7`
- Cards: `#FFFFFF`
- Bordas dos cards: `#E9E7E7`

### Tipografia
- Título principal: `#2F2D2E`
- Subtítulo institucional: `#656263`
- Texto comum: `#4E4B4C`
- Texto suave / apoio: `#8A8788`

### Botões
#### Botão principal
- Fundo: `#4099B3`
- Texto: `#FFFFFF`
- Hover: `#2F7F96`

#### Botão secundário
- Fundo: `#FFFFFF`
- Texto: `#4099B3`
- Borda: `#4099B3`
- Hover: `#EAF5F8`

### Links e detalhes
- Link padrão: `#4099B3`
- Hover de link: `#2F7F96`
- Ícones de destaque: `#4099B3`
- Linhas decorativas: `#8CC3D3`

## 4. Sensação visual da marca

A paleta transmite:

- elegância
- feminilidade discreta
- sofisticação
- leveza
- clareza
- confiança
- atendimento humanizado

## 5. Direção visual recomendada para o site

O site deve seguir uma estética:

- **clean e refinada**
- com bastante espaço em branco
- com uso de linhas finas
- com botões arredondados de forma elegante
- com poucos elementos pesados
- com sensação de escritório premium, humano e acolhedor

## 6. CSS Variables prontas

```css
:root {
  --color-primary: #4099B3;
  --color-primary-hover: #2F7F96;
  --color-primary-soft: #EAF5F8;
  --color-primary-border: #8CC3D3;

  --color-secondary: #656263;
  --color-text: #4E4B4C;
  --color-text-strong: #2F2D2E;
  --color-text-soft: #8A8788;

  --color-background: #FFFFFF;
  --color-background-alt: #F7F7F7;
  --color-border: #E9E7E7;
  --color-disabled: #C9C6C7;

  --color-card: #FFFFFF;
  --color-link: #4099B3;
}
```

## 7. Prompt para o Cursor aplicar no site

Use este padrão de cores em todo o site, mantendo o layout atual, sem alterar a estrutura funcional da página.

Objetivo visual:
Criar uma identidade elegante, leve, feminina e sofisticada, inspirada exatamente na logo enviada.

Regras:
- usar `#4099B3` como cor principal da marca
- usar `#656263` como cor institucional para tipografia e elementos sóbrios
- manter fundo branco e seções alternadas em `#F7F7F7`
- evitar cores vibrantes fora dessa paleta
- deixar os botões principais em azul da marca com hover mais escuro
- deixar textos principais em cinza grafite suave
- aplicar bordas discretas e aparência premium
- preservar o layout existente e alterar apenas identidade visual, cores, bordas, estados de hover e detalhes gráficos

## 8. Observação estratégica

Essa paleta funciona muito bem para:

- landing page jurídica
- site institucional de advocacia
- página de serviços premium
- formulário de contato sofisticado
- página com foco em autoridade, clareza e confiança

