# ETAPA 01 — Fundação da responsividade tablet no `/metapersonal`

**Data:** 2026-08-22  
**Escopo:** somente `/metapersonal` e o layout estrutural necessário.  
**Não implementado nesta etapa:** sidebar compacta, dashboard/cards, treinos, revisão geral de modais.

---

## Objetivo

O chrome do `/metapersonal` deixava de ser mobile em `lg` (1024px). iPads em landscape (1024 / 1180) recebiam sidebar completa, offset de conteúdo e composição de desktop cedo demais.

Esta etapa cria o contrato:

```text
Mobile  → Tablet  → Desktop  → Large Desktop
```

sem redesenhar telas internas.

---

## Arquivos analisados

| Arquivo | Papel |
| --- | --- |
| `app/metapersonal/layout.tsx` | Layout da rota; antes só repassava `children` |
| `app/metapersonal/page.tsx` | Wrapper que carrega a v2 |
| `app/metapersonal/page.v2.tsx` | Shell: sidebar, header, bottom nav, `main`, offset, overflow |
| `app/metapersonal/metapersonal-shell.css` | **Novo** — contrato do shell (`min-width: 0`, slots de navegação) |
| `components/metapersonal/MetapersonalHomeLeadsPipeline.tsx` | Conteúdo de leads; sem alteração (não é chrome) |
| `components/profissional/dashboard/ProfissionalDashboardHome.tsx` | Dashboard compartilhado; sem alteração (grid interno fica para etapa própria) |
| `app/globals.css` | `overflow-x: hidden` no `html`/`body` (global; **não alterado**) |
| `docs/MAP_ROTAS_HOME_META_METANUTRI_METAPERSONAL_ADMIN.md` | Documentava `lg` (1024px) como divisor mobile/desktop |

Não foram alterados: `/meta`, `/metaadmin`, `/metanutri`, `/metaadmingeral`.

---

## Arquivos modificados

| Arquivo | Mudança |
| --- | --- |
| `app/metapersonal/metapersonal-shell.css` | **Novo** — fundação CSS do shell |
| `app/metapersonal/layout.tsx` | Importa o CSS e envolve a rota em `.mp-shell-root` |
| `app/metapersonal/page.v2.tsx` | Chrome estrutural: `lg` → `xl`, padding fluido, overflow na origem, slots `data-mp-nav` |
| `docs/responsividade/ETAPA_01_TABLET_METAPERSONAL_FUNDACAO.md` | Este documento |

---

## Breakpoints identificados anteriormente

O divisor estrutural era **`lg` = 1024px** (Tailwind padrão).

| Prefixo | Largura | Uso anterior no `/metapersonal` |
| --- | --- | --- |
| *(base)* | &lt; 640px | Mobile |
| `sm:` | ≥ 640px | Ajustes pontuais de conteúdo |
| `md:` | ≥ 768px | Tabelas vs cards em algumas listas |
| **`lg:`** | **≥ 1024px** | **Sidebar desktop, some header/bottom nav, `ml-64`, modal do paciente “embutido”** |
| `xl:` | ≥ 1280px | Quase não usado no chrome |
| `2xl:` | ≥ 1536px | Não usado no chrome |

Isso fazia iPad (768–1180) e iPad landscape 1024 receberem layout de desktop.

Há ainda `isMobile` em JS (`window.innerWidth < 1024`) para **interação** (abrir paciente em rota vs modal). Não foi alterado: não é o chrome visual. Ver dívida na ETAPA 02.

---

## Breakpoints adotados

Preferência: breakpoints **já existentes** do Tailwind, sem mudar o tema global.

| Conceito de produto | Faixa pedida | Prefixo Tailwind | Largura real |
| --- | --- | --- | --- |
| Mobile | &lt; 768px | base | &lt; 768px |
| Tablet | 768px – 1199px | `md` até `&lt; xl` | 768px – 1279px |
| Desktop | ≥ 1200px | `xl` | ≥ 1280px |
| Large desktop | ≥ 1536px | `2xl` | ≥ 1536px |

**Por que `xl` (1280) e não 1200px?** Para não criar um breakpoint customizado global que afetaria `/meta`, `/metaadmin` e `/metanutri`. A diferença 1200–1279px permanece em chrome de tablet nesta etapa.

**Regra:** não usar `lg` (1024px) como definição de desktop no **shell** do `/metapersonal`.

Classes `lg:` de conteúdo (listas, cards, pastas internas de modais, treinos) **não** foram substituídas em massa. Ficam para etapas seguintes.

---

## Alterações realizadas

### 1. Container principal

- Wrapper da rota: `.mp-shell-root` + `.mp-shell-frame` com `min-w-0`, `w-full`, `max-w-full`.
- Área de conteúdo: `.mp-shell-main` / `.mp-shell-content` fluida, sem `max-w-*` fixo no chrome.
- View `personal` embutida continua full-bleed (`p-0`).

### 2. Padding horizontal

Progressão no `<main>` (não no body):

```text
px-4 py-4
md:px-5 md:py-5
xl:px-6 xl:py-6     → desktop permanece 24px (equivalente ao p-6 anterior)
2xl:px-8            → large desktop
```

Header mobile/tablet: `px-4 md:px-5`.  
Banner de perfil incompleto: `mx-4 md:mx-5 xl:mx-6` (alinha com o conteúdo).

### 3. Overflow

Causa: sidebar `fixed` + conteúdo `flex-1` com **`margin-left: 16rem`**. A caixa ficava `100% + 256px` e o overflow era mascarado com `overflow-x-hidden` no main.

Correção:

- `lg:ml-64` / `lg:ml-16` → **`xl:pl-64` / `xl:pl-16`** (padding-left, `box-border`)
- removido `overflow-x-hidden` do main do `/metapersonal`
- `min-w-0` no flex para filhos poderem encolher

**Não** foi colocado `overflow-x-hidden` no `body` (já existia em `app/globals.css` para o app inteiro; não foi mexido para não afetar outras rotas).

### 4. Sidebar — só preparação

- Visível a partir de **`xl`**, não mais `lg`.
- `data-mp-nav="desktop"` no aside atual.
- Comentário + contrato CSS para `data-mp-nav="tablet"` (sidebar compacta). **Não renderizada nesta etapa.**

Arquitetura prevista:

```text
Mobile   → header + bottom nav atuais          [data-mp-nav="mobile"]
Tablet   → sidebar compacta (ETAPA 02)         [data-mp-nav="tablet"]
Desktop  → sidebar completa                    [data-mp-nav="desktop"]
```

Nesta etapa, tablet **continua com a navegação mobile** (header + bottom nav). Deixa de receber a sidebar completa.

### 5. Modal de paciente (acoplado ao chrome)

O overlay “embutido” ao lado da sidebar (`left-64`, fundo transparente, full-bleed) só faz sentido quando a sidebar desktop existe. Essas classes passaram de `lg:` para `xl:`.

Entre 1024px e 1279px o modal (quando não é tela cheia) fica como overlay central (`max-w-7xl`), em vez de ocupar o lugar de uma sidebar que não está visível.

Modais de nutrição, prescrições, financeiro, etc. **não** foram revisados.

### 6. Comunicação desktop

Painel inline (`OrganizacaoComunicacaoGmailPanel` no menu Comunicação) alinhado ao chrome: `hidden xl:block`. No tablet, Mensagens continua no dropdown do header (fluxo mobile).

---

## Comportamento por faixa

### Mobile (&lt; 768px)

- Header superior + bottom nav (Home, Leads, Pacientes, Financeiro, Calendário).
- Sem sidebar.
- Conteúdo em coluna, `px-4`.
- Interação existente preservada (menu, stack, `isMobile` inalterado).

Larguras de teste: **375px**, **430px**.

### Tablet (768px – 1279px)

- Mesmo chrome mobile (ETAPA 01). **Não** recebe sidebar completa.
- Padding `md:px-5`.
- Conteúdo usa a largura do viewport, sem offset de 256px.
- iPad / iPad Air / iPad landscape 1024 / 1180 deixam de ser tratados como desktop no **shell**.

Larguras de teste: **768, 820, 834, 1024, 1180, 1199**.  
**1200px** ainda é tablet no CSS (`xl` = 1280). Aceito para não criar breakpoint global.

### Desktop (≥ 1280px)

- Sidebar completa (`w-64` / colapsada `w-16`).
- Sem header mobile e sem bottom nav.
- Offset do conteúdo via `pl-64` / `pl-16`.
- Padding `xl:px-6` (= 24px, como o `p-6` anterior).
- Modal de paciente volta a preencher a área ao lado da sidebar.

Larguras de teste: **1366, 1440**.

### Large desktop (≥ 1536px)

- Mesmo chrome de desktop.
- `2xl:px-8` no conteúdo.

Largura de teste: **1536px**.

---

## O que não foi feito (de propósito)

- Sidebar compacta / header específicos de tablet → **ETAPA 02**
- Grids e cards do dashboard (`ProfissionalDashboardHome` ainda usa `lg:` internamente; componente compartilhado)
- Área de treinos (GIFs, séries, superséries, montagem)
- Revisão geral de modais
- Troca em massa de `lg:` em listas (tabela vs card)
- Alteração de `isMobile` / `matchMedia('(min-width: 1024px)')` (interação, não chrome)
- Firebase, APIs, auth, design system, cores

---

## Pontos da ETAPA 02

**Sidebar + Header específicos para tablet** (`768px` – `&lt; xl`):

1. Renderizar `[data-mp-nav="tablet"]` com `hidden md:block xl:hidden` (sidebar compacta).
2. Esconder `[data-mp-nav="mobile"]` a partir de `md` (ou só o bottom nav; decidir header).
3. Ajustar `xl:pl-64` para um offset intermediário em `md` (ex. `md:pl-16 xl:pl-64`) quando a compacta existir.
4. Avaliar alinhar `isMobile` (hoje 1024px) com `xl` (1280px), para o modal de paciente e o atalho de treino não tratarem 1024–1279 como desktop de interação.
5. Header de tablet (identidade + ações), sem copiar o desktop.
6. Não redesenhar dashboard, treinos nem demais modais nessa etapa — só navegação.

---

## Critério de sucesso (ETAPA 01)

- [x] Breakpoint estrutural documentado e aplicado no chrome (`xl` = desktop)
- [x] Tablet (768–1279) deixa de receber sidebar/offset de desktop
- [x] Container principal fluido (`min-w-0`, sem max-width rígido no shell)
- [x] Overflow estrutural corrigido na origem (padding vs margin), sem `overflow-x-hidden` no main
- [x] Mobile (&lt; 768) mantém navegação atual
- [x] Desktop (≥ 1280) permanece próximo do visual anterior
- [x] Arquitetura pronta para sidebar compacta na ETAPA 02
