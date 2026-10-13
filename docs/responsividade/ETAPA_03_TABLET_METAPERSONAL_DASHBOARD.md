# ETAPA 03 — Dashboard / Home do `/metapersonal` no Tablet

**Data:** 2026-08-22  
**Base:** ETAPA 01 (fundação) + ETAPA 02 (sidebar + header)  
**Escopo:** somente a Home (`activeMenu === 'home'`). Sem treinos, biblioteca, GIFs, séries ou modais de montagem.

---

## Objetivo

No intervalo tablet (`md` … `xl`), a Home deixa de receber o grid de **5 KPIs** que o `lg` (1024px) ativava. Passa a uma composição de **~2 colunas**, com sidebar compacta da ETAPA 02.

---

## Arquivos alterados

| Arquivo | Mudança |
| --- | --- |
| `app/metapersonal/page.v2.tsx` | `layoutPreset="tablet-shell"` na Home |
| `components/profissional/dashboard/ProfissionalDashboardHome.tsx` | Preset `tablet-shell` (grids, título, financeiro, cidades). Default `legacy` = MetaNutri intacto |
| `components/metaadmin/dashboard/DashboardHeroKpi.tsx` | `className` opcional (span do hero) |
| `components/metaadmin/dashboard/DashboardPortfolioSummary.tsx` | `legendClassName` opcional |
| `components/metaadmin/dashboard/DashboardWeightEvolution.tsx` | classes opcionais do cabeçalho/filtros |
| `components/metaadmin/dashboard/DashboardWeightFilters.tsx` | `className` opcional do grid |
| `components/metaadmin/dashboard/DashboardBaseSegmentedControl.tsx` | `buttonClassName` opcional (touch `min-h-11`) |
| `docs/responsividade/ETAPA_03_TABLET_METAPERSONAL_DASHBOARD.md` | Este documento |

Não alterados: `/meta`, `/metaadmin` (páginas), `/metanutri` (continua no preset `legacy`), `/metaadmingeral`.

---

## Cards / blocos identificados

A Home do `/metapersonal` é `ProfissionalDashboardHome`. Não há cards de treino nem atalhos “criar treino” nesta tela.

| Bloco | Tipo |
| --- | --- |
| Título “Dashboard” + médicos vinculados | Cabeçalho |
| Segmented control (Meus / Base org) | Ação |
| Hero “Total de pacientes” + sparkline | KPI principal |
| Pendentes / Em tratamento / Concluídos / Abandonos | KPIs |
| Aplicações (mg) + Perda de peso (kg) | Métricas (2 colunas) |
| Resumo da carteira (barra + 4 status) | Indicadores |
| Demografia (idade média, faixas, sexo) | Painel |
| Top cidades | Lista / barras |
| Evolução da perda de peso (gráfico + filtros) | Gráfico |
| Motivos de abandono | Lista |
| Experiência do paciente (depoimentos + avatar) | Carrossel de cards |
| Estatísticas financeiras (3 totais) | KPIs |

---

## Grids anteriores → novos (somente `tablet-shell`)

| Bloco | Antes | Tablet (`md`–`xl`) | Desktop (`xl+`) |
| --- | --- | --- | --- |
| KPIs (hero + 4 cards) | `grid-cols-2` → **`lg`: 5 colunas** | Hero largura total + **2×2** KPIs | 5 colunas (igual ao desktop atual) |
| Hero `col-span` | `col-span-2 lg:col-span-1` | `col-span-2` até `xl` | `xl:col-span-1` |
| Carteira (legenda) | `grid-cols-2 lg:grid-cols-4` | 2 colunas | 4 colunas |
| Financeiro | `md:grid-cols-3` | **2 colunas** (`xl`: 3) | 3 colunas |
| Filtros do gráfico | `sm:grid-cols-3` | **2 colunas** (`xl`: 3) | 3 colunas |
| Título + filtros do gráfico | `lg:flex-row` | Empilhado até `xl` | Lado a lado |
| Abandono + depoimentos | já `xl:grid-cols-[420px_1fr]` | Empilhado | 2 colunas |
| Demografia | já `xl:flex-row` | Empilhado | Linha |
| Tratamento mg/kg | já `md:grid-cols-2` | 2 colunas (adequado) | 2 colunas |

---

## Comportamento por faixa

### Mobile (&lt; 768px)

Preservado: stack, hero full width, KPIs 2 por linha, demais blocos em coluna. Título “Dashboard” visível (o header mobile mostra o nome do personal, não o da página).

### Tablet (768–1279px)

- Título H2 oculto (`md:hidden xl:block`) — o header da ETAPA 02 já mostra “Dashboard”.
- Hero em largura total; 4 KPIs em **2 por linha**, números `md:text-[34px]` / `[36px]` mantidos.
- Gráfico em largura 100%, filtros empilhados (2+1).
- Abandono e depoimentos um abaixo do outro (não coluna lateral estreita).
- Barras de cidades usam a largura recuperada (`max-w-none`).
- Segmented control com `min-h-11`.
- `space-y-5` (desktop volta a `xl:space-y-6`).

### Desktop (≥ 1280px)

Mesma composição de 5 KPIs, 4 legendas da carteira, financeiro em 3 colunas, demografia em linha, gráfico com filtros à direita.

---

## Componentes empilhados no tablet

- Evolução de peso: título acima, filtros abaixo (antes lado a lado em `lg`).
- Motivos de abandono → Experiência do paciente (já empilhava abaixo de `xl`).
- Demografia: idade média, faixas e sexo em coluna (já era `xl:flex-row`).

---

## KPIs alterados (distribuição apenas)

- Hero deixa de virar 1/5 da linha em 1024px.
- Os 4 status ficam 2+2 no tablet, não 4 estreitos.
- Financeiro: 2+1 no tablet, 3 no desktop.
- Tipografia dos valores **não** foi reduzida.

---

## Preset para não afetar o MetaNutri

`ProfissionalDashboardHome` é compartilhado com `/metanutri`.

```text
layoutPreset="legacy"         → default (lg = 5 KPIs, como hoje)
layoutPreset="tablet-shell"   → só /metapersonal
```

Props opcionais nos subcomponentes do dashboard (`className`, `legendClassName`, etc.) têm default igual ao visual anterior.

---

## Problemas encontrados / deixados para ETAPA 04

- Home **não** lista treinos, biblioteca nem “criar treino” — nada disso nesta etapa.
- Cards de depoimento continuam em carrossel horizontal (`w-[min(85%,20rem)]`); cabem bem no tablet, mas não viraram grid 2 colunas.
- `isMobile` no modal de depoimento (`window.innerWidth < 768`) não foi alterado (modal, fora do escopo).
- Transição produto 1199/1200 vs CSS `xl` 1280 — igual às etapas 01–02.
- Demais telas do módulo (pacientes, montagem de treino, GIFs, séries, superséries) **não** foram tocadas.

---

## Próxima etapa (não implementar agora)

**ETAPA 04 — Área de Treinos do `/metapersonal` no Tablet**

Biblioteca, GIFs, cards de exercício, seleção, séries, descanso, montagem, painéis laterais, preview e superséries.
