# ETAPA 02 — Sidebar + Header tablet no `/metapersonal`

**Data:** 2026-08-22  
**Base:** `docs/responsividade/ETAPA_01_TABLET_METAPERSONAL_FUNDACAO.md`  
**Escopo:** navegação (sidebar compacta + header + offset). Sem dashboard, cards, treinos, tabelas ou revisão geral de modais.

---

## Objetivo

```text
Mobile  (< 768px)     → header + bottom nav existentes
Tablet  (md … xl)     → sidebar compacta 80px + header enxuto
Desktop (xl+)         → sidebar completa atual
```

---

## Arquivos alterados

| Arquivo | Mudança |
| --- | --- |
| `components/metapersonal/shell/metapersonalShellNav.ts` | **Novo** — ids, labels e itens de navegação do shell (reuso futuro em outros módulos, sem migrá-los agora) |
| `components/metapersonal/shell/MetapersonalTabletSidebar.tsx` | **Novo** — sidebar compacta (`hidden md:flex xl:hidden`, `w-20`) |
| `components/metapersonal/shell/MetapersonalTabletHeader.tsx` | **Novo** — header tablet (título + foto + primeiro nome, dropdown por clique) |
| `app/metapersonal/page.v2.tsx` | Liga os novos nós; mobile `md:hidden`; offset `md:pl-20`; Comunicação visível a partir de `md` |
| `app/metapersonal/metapersonal-shell.css` | Contrato de nav atualizado (slot tablet ativo) |
| `docs/responsividade/ETAPA_02_TABLET_METAPERSONAL_SIDEBAR_HEADER.md` | Este documento |

Não alterados: `/meta`, `/metaadmin`, `/metanutri`, `/metaadmingeral`.

---

## Breakpoints utilizados

Mesmo contrato da ETAPA 01 (Tailwind existente, sem breakpoint global em 1200px):

| Conceito | Prefixo | Largura CSS |
| --- | --- | --- |
| Mobile | base | &lt; 768px |
| Tablet | `md` até `&lt; xl` | 768px – 1279px |
| Desktop | `xl` | ≥ 1280px |
| Large desktop | `2xl` | ≥ 1536px |

`lg` (1024px) **não** é usado como desktop. iPad landscape 1024 permanece tablet.

A transição visual 1199 → 1200 pedida no produto ocorre no CSS em **1279 → 1280** (`xl`), igual à ETAPA 01.

---

## Sidebar anterior (ETAPA 01)

- Só existia a sidebar **desktop**: `hidden xl:block`, `w-64` / colapsada `w-16`.
- Tablet (768–1279) usava o chrome **mobile** (header + bottom nav).
- Conteúdo: `xl:pl-64` (ou `xl:pl-16` se colapsada). Sem offset no tablet.

---

## Sidebar tablet criada

Componente: `MetapersonalTabletSidebar`  
Slot: `data-mp-nav="tablet"`  
Visibilidade: `hidden md:flex xl:hidden`  
**Largura: `w-20` = 80px** (dentro da faixa 72–88px).

Conteúdo:

- Logo compacta: mesma URL da sidebar desktop (`resolveOrganizationShellLogoUrl`), em `h-8 w-8 object-contain` — sem novo arquivo de marca.
- Ícones dos 8 itens: Dashboard, Leads, Médicos, Pacientes, Financeiro, Calendário, Comunicação, WhatsApp.
- Sem labels permanentes, sem “Bem-vindo”, sem e-mail, sem badge Personal.
- Item ativo: `bg-white/10`, texto `#4CCB7A`, `border-r-2 border-[#4CCB7A]` (tokens já usados no desktop).
- Área clicável: `h-11 w-11` (44px). Ícone 22px.
- Tooltip: atributo nativo `title` + `aria-label` (mesma infra da sidebar desktop colapsada). Navegação é por clique/toque.
- Scroll: `overflow-y-auto` no `<nav>` se a altura for curta (landscape).
- `z-40`, `fixed inset-y-0 left-0` — mesmo empilhamento da sidebar desktop.

Perfil **não** ficou na sidebar tablet: o header compacto concentra foto + dropdown (toque). No desktop o perfil permanece na sidebar.

---

## Header tablet

Componente: `MetapersonalTabletHeader`  
`sticky top-0 z-30`, `h-14`, `hidden md:flex xl:hidden`.

- Título da seção (`truncate`, `min-w-0 flex-1`): Dashboard, Leads, …, WhatsApp quando a aba correspondente está ativa.
- Perfil compacto: foto + primeiro nome (`truncate`). Dropdown por **clique/toque** (overlay para fechar). Itens: Meu Perfil, Meu Link, Sair.
- Sem WhatsApp no header (está na sidebar compacta).
- Sem atalho de estrelas de avaliação no header tablet (permanece no header mobile e na sidebar desktop).

Header mobile: inalterado, agora `md:hidden` (antes `xl:hidden`).

---

## Offset do conteúdo

| Faixa | Offset | Chrome |
| --- | --- | --- |
| &lt; 768px | `pl-0` + `pb-20` (bottom nav) | header + bottom nav |
| 768–1279px | `md:pl-20` (80px) + `md:pb-0` | sidebar compacta + header |
| ≥ 1280px | `xl:pl-64` ou `xl:pl-16` se colapsada | sidebar completa |

Padding continua via `padding-left` (ETAPA 01), não `margin-left`.

---

## Comportamento por faixa

### Mobile (&lt; 768px)

Igual ao existente:

- Header com nome, Personal, estrelas, WhatsApp, perfil.
- Bottom nav: Home, Leads, Pacientes, Financeiro, Calendário.
- Sem sidebar.
- Comunicação via modal Mensagens no dropdown.

Testes: **375px**, **430px**.

### Tablet (768–1279px)

- Sidebar 80px com ícones.
- Header 56px com título + perfil compacto.
- Sem bottom nav.
- Conteúdo usa a largura restante (~viewport − 80px).
- Comunicação inline a partir de `md` (dependência direta: o item passou a existir na sidebar).

Testes: **768, 820, 834, 1024, 1180, 1199**.  
**1200px** ainda é tablet no CSS (`xl` = 1280).

Portrait / landscape (só a largura manda):

| Viewport | Esperado |
| --- | --- |
| 768×1024 | tablet |
| 820×1180 | tablet |
| 834×1194 | tablet |
| 1024×768 | tablet |
| 1180×820 | tablet |
| 1194×834 | tablet |

### Desktop (≥ 1280px)

Sidebar completa, logo + textos, perfil na base, sem header/bottom mobile/tablet. Visual preservado.

Testes: **1366, 1440, 1536**.

---

## Ajuste mínimo fora de sidebar/header

Painel de Comunicação (`OrganizacaoComunicacaoGmailPanel`) era `hidden xl:block`. Com o item na sidebar tablet, a tela ficaria em branco entre 768 e 1279. Passou a `hidden md:block`. Sem mudança de regras de negócio.

Modal de paciente: **não alterado**. Continua overlay no tablet e “embutido” ao lado da sidebar só em `xl`.

---

## Problemas deixados para próximas etapas

- Grids/KPIs/cards do dashboard no tablet (ETAPA 03).
- Listas de pacientes, tabelas vs cards (`lg:` interno).
- Treinos / GIFs / séries.
- Modais (nutrição, prescrições, paciente) ainda usam `lg:` em splits internos.
- `isMobile` em JS continua `window.innerWidth < 1024` (interação, não chrome). Abrir paciente em 1024–1279 ainda segue o caminho “desktop” de JS.
- Atalho de avaliações (estrelas) não está no header tablet.
- Transição produto 1199/1200 vs CSS `xl` 1280 — decisão da ETAPA 01, mantida.

---

## Próxima etapa (não implementar agora)

**ETAPA 03 — Dashboard / Home do `/metapersonal` no Tablet**

Cards, KPIs, grids, pacientes e blocos principais.
