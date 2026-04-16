# Etapa 5 — Inventário detalhado por superfície

Este documento complementa **`MAP_ROTAS_*`** com foco em **implementação visual**. Para rotas com arquivos gigantes (`app/meta/page.tsx`, `metaadmin`, etc.), listamos **padrões dominantes** + arquivos satélite.

---

## 5.1 Home `/` — `app/page.tsx`

| Região | Seletor / bloco | Cores (Tailwind ou hex) | Mobile | Desktop |
|--------|-----------------|-------------------------|--------|---------|
| Loading | fullscreen | `bg-white/90`; SVG cinzas + verde `#10B981` | igual | igual |
| Fundo | `AnimatedBackground` | `blue-50`, `purple-50`, `orange-50`; RGBA roxo/azul/laranja | igual | igual |
| Header | logado | `white/80`, `border-gray-200/50`, gradiente título | `md:hidden` / `hidden md:block` | layout expandido |
| Carrossel banner | | altura `h-48` vs `md:h-[320px]` | menor | maior |
| Card Oftware | | barra `purple/blue/orange`; slides `gray-50/200` | textos menores | textos `md:` |
| Grid 4 personas | | ver seção 3.2 da Etapa 3 | 2 colunas | 2 colunas + mais ar |
| Modais login | por persona | espelham gradiente + `50/100/200` + CTA 600–700 | scroll/long form | mais ar |

---

## 5.2 Meta paciente `/meta` — `app/meta/page.tsx`

**Tamanho:** dezenas de milhares de tokens no arquivo.

| Família visual | Padrão típico | Onde aparece |
|----------------|---------------|--------------|
| Neutro clínico | `gray-50`–`900`, `white` | Cards, tabelas, formulários |
| Ação positiva | `green-*` | Confirmação, alguns CTAs |
| Informação | `blue-*` | Links, destaques |
| Alerta | `red-*`, `amber-*` | Erros, pendências |
| Indicação / encaminhamento | `blue-50`, `purple-50`, `blue-200` | Bloco link ref |

**Sub-rotas:**

| Rota | Arquivo | Notas de cor |
|------|---------|--------------|
| `/meta/nutri` | `app/meta/nutri/page.tsx` | Wizard/plano: verdes, azuis, cards brancos |
| `/meta/personal` | `app/meta/personal/page.tsx` | Emerald/teal + tabs |
| `/meta/layout` | `app/meta/layout/page.tsx` | Cards escolha layout: `blue-500 to purple-600`, etc.; loading `green-600` spinner |
| `/meta/banner/[id]` | `app/meta/banner/[id]/page.tsx` | `gray-50`, `green-600` spinner/botão, `white` conteúdo |

**Layouts alternativos (paciente logado):**

| Arquivo | Hero / cards (resumo) |
|---------|------------------------|
| `LayoutModerno.tsx` | Gradiente `blue → purple → pink`; cards azul claro, peso com verde |
| `LayoutInterativo.tsx` | Hero `orange → pink → purple`; 4 cards coloridos; seções blue/green |

---

## 5.3 MetaAdmin `/metaadmin` — `app/metaadmin/page.tsx`

| Padrão | Classes frequentes |
|--------|-------------------|
| Shell | `bg-gray-50` ou branco, sidebar escura/neutra conforme trecho |
| Primário | `bg-green-600`, `hover:bg-green-700` |
| Tabela header | `bg-gray-50`, `divide-gray-200` |
| Mobile bottom nav | `bg-white`, `border-gray-200` |
| Dark em JSX | muitas classes `dark:` — **validar** com build real (globals pode forçar claro) |

---

## 5.4 MetaNutri `/metanutri`

| Superfície | Arquivo | Cores |
|------------|---------|-------|
| Shell v2 | `page.v2.tsx` | Alinhado admin + **emerald** em detalhes; bottom bar mobile |
| Deep link paciente | `nutri/[pacienteId]/page.tsx` | Gradiente página `emerald-50 / teal-50`; avatar `emerald → teal` |
| KPIs | `components/KpiCard.tsx` | emerald, amber, rose, blue, slate |

---

## 5.5 MetaPersonal `/metapersonal`

| Superfície | Arquivo | Cores |
|------------|---------|-------|
| v2 | `page.v2.tsx` | `ui.*` emerald/teal; bottom nav; `dark:` em vários blocos |

---

## 5.6 MetaAdminGeral `/metaadmingeral`

| Superfície | Arquivo | Cores |
|------------|---------|-------|
| Principal | `page.tsx` | Mesmo padrão verde/cinza admin; **sem** bottom tabs — drawer mobile |
| Redirect OftPay | `oftpay/page.tsx` | Spinner `green-600`, `gray-50` |

---

## 5.7 Componentes que “contaminam” várias telas

| Componente | Arquivo | Impacto |
|------------|---------|---------|
| NutriContent | `components/NutriContent.tsx` | Bio, planos, charts — muitas cores |
| FAQChat | `components/FAQChat.tsx` | Chat flutuante |
| CalendarioAplicacoes | `components/CalendarioAplicacoes.tsx` | Cores por status de dia |
| Recharts | vários | `stroke`/`fill` nos JSX |

---

## 5.8 Próximo passo

**`ETAPA_06_COMPONENTES_BIBLIOTECA_E_DEPENDENCIAS.md`**
