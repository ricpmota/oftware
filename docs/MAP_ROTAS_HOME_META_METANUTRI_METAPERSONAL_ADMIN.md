# Mapa detalhado — Home, Meta, MetaAdmin, MetaNutri, MetaPersonal, MetaAdminGeral  
**Domínio de referência:** `www.oftware.com.br`  
**Objetivo:** listar **rotas, subpáginas (estados), mobile vs desktop** e **onde as cores vivem no código**, para alinhar Marketing + UX + Dev.

> **Pacote completo para o Diretor de Marketing (etapas 0–11, formulários, QA, handoff):**  
> [`docs/marketing-diretor/00_LEIA_PRIMEIRO.md`](marketing-diretor/00_LEIA_PRIMEIRO.md)

---

## Legenda — breakpoints (Tailwind)

| Prefixo | Largura típica | Uso neste projeto |
|---------|----------------|-------------------|
| *(default)* | &lt; 640px | “Mobile primeiro” em várias telas |
| `sm:` | ≥ 640px | Ajustes de padding, mostrar/ocultar texto (“Voltar”) |
| `md:` | ≥ 768px | Home: coluna dupla; alguns blocos empilhados no mobile |
| `lg:` | ≥ 1024px | **Principal divisor:** sidebar desktop vs **menu inferior (mobile)** em MetaAdmin, MetaNutri, MetaPersonal |

**Comportamento global (`app/globals.css`):** modo escuro do SO está **desativado**; classes `dark:` podem existir no código mas o CSS global força aparência **clara** em muitos casos. Ao mudar marca, validar contraste nas telas reais.

---

# 1. Home — `/`

| Item | Detalhe |
|------|---------|
| **Arquivo** | `app/page.tsx` |
| **Auth** | Login Google (médico / paciente / nutri / personal) + modais por persona |

## 1.1 Layout mobile vs desktop

| Aspecto | Mobile (&lt; `md`) | Desktop (`md:`+) |
|---------|-------------------|------------------|
| Altura da página | `min-h-screen`, sem forçar altura fixa da viewport em alguns estados | `md:h-screen` no container principal quando modais fechados |
| Topo | Logo/menu compacto; **área “Oftware”** pode ser `md:hidden` em parte do header | `hidden md:block` para bloco extra do header |
| Área principal | **Coluna única:** carrossel/banner, card “O que é o Oftware”, grid 2 colunas de CTAs | **Duas colunas** (`md:flex-row`): esquerda ~48% (banner + card), direita grid de acesso |
| Banner/carrossel | Altura `h-48` | `md:h-[320px]` |
| Textos | `text-[11px]`, `text-xs`, ícones menores | `md:text-lg`, `md:text-xs`, mais espaçamento |
| CTAs inferiores | Grid 2×N, modais ocupam `col-span-2` | Mesma lógica com mais gap |
| Copy UI | “Toque para ver prévia” | “Clique para ver prévia” |

## 1.2 Blocos visuais principais (cores / identidade)

| Bloco | Classes / cores relevantes |
|-------|----------------------------|
| Loading fullscreen | `bg-white/90`, SVG balança: `#9CA3AF`, `#D1D5DB`, `#E5E7EB`, `#F3F4F6`, seta `#10B981` |
| Fundo animado | `from-blue-50 via-purple-50 to-orange-50`, partículas `rgba(139,92,246)`, `rgba(59,130,246)`, `rgba(249,115,22)` |
| Card topo Oftware | Borda superior `from-purple-500 via-blue-500 to-orange-500`, `border-gray-200`, `bg-white`, `bg-gray-50` nos slides |
| Botões persona | Gradientes **roxo** (médico), **laranja** (paciente), etc. (`from-purple-600 to-purple-700`, `text-orange-600`, …) |
| FAQ / modais | Depende dos componentes importados (`FAQChat`, `PreviewAreaModal`, …) |

## 1.3 Sub-“páginas” na Home (estados, mesma URL)

Não são rotas separadas, mas **estados de UI** que Marketing deve revisar:

- Tela inicial (escolha de perfil + banner).
- Modal **médico** / **paciente** / **nutricionista** / **personal** (fluxos de login e textos).
- Pós-login: redirecionamento para `/meta`, `/metaadmin`, `/metanutri`, `/metapersonal`, etc.

---

# 2. Meta (paciente) — `/meta`

| Item | Detalhe |
|------|---------|
| **Arquivo principal** | `app/meta/page.tsx` (~10k+ linhas) |
| **Query params úteis** | `?layout=modern|minimal|interactive` (ou similar), `?ref=` (indicação) |

## 2.1 Sub-rotas HTTP

| URL | Arquivo | Função |
|-----|---------|--------|
| `/meta` | `app/meta/page.tsx` | App do paciente (dashboard, gráficos, mensagens, NPS, bioimpedância, etc.) |
| `/meta/nutri` | `app/meta/nutri/page.tsx` | Fluxo nutricional do **paciente**: wizard → plano → check-in diário |
| `/meta/personal` | `app/meta/personal/page.tsx` | Treinos / personal (tabs: hoje, cronograma, criar, histórico, estatísticas, config/lembretes) |
| `/meta/layout` | `app/meta/layout/page.tsx` | **Escolha de layout** do dashboard (Moderno / Minimalista / Interativo) → salva e redireciona para `/meta?layout=...` |
| `/meta/banner/[id]` | `app/meta/banner/[id]/page.tsx` | Visualização de banner por ID (`bg-white`, header sticky, spinner `border-green-600`) |

## 2.2 Meta `/meta` — “subpáginas” lógicas (dentro da mesma rota)

O paciente vê conteúdo diferente conforme **layout salvo** e **estado da conta**:

| Estado / área | Observação visual |
|---------------|-------------------|
| **Layout Moderno** | `components/layouts/LayoutModerno.tsx` |
| **Layout Minimalista** | `components/layouts/LayoutMinimalista.tsx` |
| **Layout Interativo** | `components/layouts/LayoutInterativo.tsx` |
| Trecho “encaminhamento” | Card `from-blue-50 to-purple-50`, `border-blue-200`, ícones `text-blue-600` |
| Gráficos / laboratório / bioimpedância | `recharts`, `LabRangeBar`, `BodyMapOverlay`, `BioImpedanciaDisplay`, etc. |
| FAQ embutido | `FAQChat` + categorias paciente |

**Mobile vs desktop em `/meta`:** o arquivo usa muitas classes responsivas (`sm:`, `md:`, `lg:`) e componentes pesados; para auditoria de cor, priorizar **header**, **cards de resumo**, **abas** e **CTAs primários**.

## 2.3 `/meta/nutri` — fluxos (subpáginas por estado)

| View (`view`) | Conteúdo |
|---------------|----------|
| `loading` | Splash até carregar paciente |
| `wizard` | Questionário (passos); pode incluir formulário peso/altura |
| `plano` | Plano nutricional gerado |
| `checkin` | Check-in diário |

Cores: predominantemente Tailwind (verdes/azuis/cinzas conforme seções do formulário).

## 2.4 `/meta/personal` — abas (subpáginas)

| Tab | ID |
|-----|-----|
| Hoje | `hoje` |
| Cronograma | `cronograma` |
| Criar treino | `criar` |
| Histórico | `historico` |
| Estatísticas | `estatisticas` |
| Config / lembretes | `config` (e variações no código) |

**Design local:** objeto `ui` em `page.tsx` com tokens **emerald/teal** (`from-emerald-500/5`, botões `from-emerald-500 to-teal-500`, cards com `dark:` — lembrar override global).

---

# 3. MetaAdmin (médico + admin clínica) — `/metaadmin`

| Item | Detalhe |
|------|---------|
| **Arquivo** | `app/metaadmin/page.tsx` |
| **Backup** | `app/metaadmin/page.backup.tsx` (não é rota ativa) |

## 3.1 Dois “modos” de usuário

1. **Médico** — menu focado em estatísticas, pacientes, financeiro, vínculos, etc.  
2. **Admin da clínica** — residentes, locais, serviços, escalas, trocas, férias, cadastros.

## 3.2 Itens de menu — perfil **médico** (sidebar / inferior mobile)

| ID menu | Descrição resumida |
|---------|-------------------|
| `estatisticas` | KPIs, gráficos, leads, indicadores |
| `nutricionistas` | Lista / vínculos nutri |
| `personal` | Personal trainers |
| `vinculos` | Sub-abas nutri + personal |
| `pacientes` | Gestão de pacientes |
| `meus-pacientes` | Visão restrita de pacientes |
| `financeiro` | Pagamentos, parcelas, resumo (mobile: labels abreviados “Total/Pago/Em aberto”) |
| `calendario` | Calendário de aplicações / agenda |
| `mensagens` | Mensagens |
| `tirzepatida` | *(Redireciona para estatísticas em alguns fluxos — validar produto)* |
| `encaminhados` | Indicações / encaminhamentos |
| `meu-perfil` | Perfil do médico |

## 3.3 Itens de menu / telas — perfil **admin**

| ID / caso | Descrição |
|-----------|-----------|
| `residentes` | Lista de residentes |
| `locais` | Locais |
| `servicos` | Serviços por local |
| `escalas` | Escalas |
| `cadastrar-residente` | Formulário |
| `cadastrar-local` | Formulário |
| `cadastrar-servico` | Formulário |
| `criar-escala` | Fluxo de criação |
| `troca` | Trocas de plantão |
| `ferias` | Férias |
| *(demais casos no `switch`)* | Mesmo padrão visual: `bg-white`, `shadow`, `green-600` em primários, tabelas `gray-50/200` |

## 3.4 Mobile vs desktop — `/metaadmin`

| Mobile (`lg:hidden`) | Desktop (`lg:`+) |
|----------------------|------------------|
| **Barra fixa inferior** com ícones dos menus principais (`fixed bottom-0 … border-t`) | Sidebar lateral expandida/recolhida |
| Header compacto com `Menu` / `X` | Mais espaço para título e ações |
| Blocos de gráfico / bioimpedância com variantes `lg:hidden` (layouts empilhados ou placeholders) | Layout em colunas, gráficos lado a lado |
| Tabelas largas: scroll horizontal | Mais colunas visíveis |

**Cores recorrentes:** `green-600/700` (ações primárias e spinners), `blue-600` (links/editar), `red-600` (excluir), `gray-*` (fundo de página e bordas), estrelas `yellow-400` (classificação).

---

# 4. MetaNutri — `/metanutri`

| Item | Detalhe |
|------|---------|
| **Rota ativa** | `app/metanutri/page.tsx` → **sempre renderiza** `page.v2.tsx` |
| **Legado** | `page.legacy.tsx` (não usado no export atual) |

## 4.1 Menus principais (sidebar desktop / barra inferior mobile)

| `activeMenu` | Conteúdo típico |
|--------------|-----------------|
| `home` | KPIs (`KpiCard`), resumo, atalhos |
| `medicos` | Médicos, solicitações de vínculo, abas |
| `pacientes` | Lista, modais de visualização, bioimpedância, gráficos |
| `financeiro` | Pagamentos por paciente |
| `calendario` | Calendário (ex.: treinos personal relacionados) |
| `meu-perfil` | Perfil do nutricionista |

**Persistência:** `localStorage` chave `metanutri_activeMenu` (ao testar, limpar storage se menu “grudar”).

## 4.2 Sub-rota — ficha nutri por paciente

| URL | Arquivo |
|-----|---------|
| `/metanutri/nutri/[pacienteId]` | `app/metanutri/nutri/[pacienteId]/page.tsx` |

**Layout:** fundo `from-emerald-50 via-white to-teal-50`, header sticky `bg-white/90`, avatar `from-emerald-500 to-teal-600`, card principal com `NutriContent` (`modoNutricionista`).

**Mobile vs desktop:**

| Mobile | Desktop |
|--------|---------|
| Header em coluna (`flex-col`), botão voltar só ícone ou texto curto | `sm:flex-row`, divisor vertical, texto “Voltar” visível (`hidden sm:inline`) |
| Cards de peso/variação em `flex-wrap` | Mesmos blocos com mais espaço horizontal |

## 4.3 Mobile vs desktop — shell `/metanutri`

Igual padrão MetaAdmin: **`lg:hidden`** header topo + **`fixed bottom`** navegação; desktop sidebar.

---

# 5. MetaPersonal — `/metapersonal`

| Item | Detalhe |
|------|---------|
| **Rota ativa** | `page.tsx` com `Suspense` → **`page.v2.tsx`** |

## 5.1 Áreas principais

- Seleção de paciente (personal trainer).
- **Modal / painel Personal:** abas `activeTabPersonal`: `hoje`, `cronograma`, `criar`, `historico`, `estatisticas`, `lembretes`.
- **Nutrição do aluno (quando aplicável):** `activeTabNutricao`: `plano`, `checkins`, `estatisticas`, `chatnutri`.

## 5.2 Mobile vs desktop

| Mobile | Desktop |
|--------|---------|
| `lg:hidden` header + **menu inferior fixo** (`fixed bottom-0 …`) | Sidebar / layout amplo |
| Gráficos e listas em coluna única | `lg:` colunas, mais dados visíveis |
| Vários `md:hidden` / `lg:hidden` para simplificar formulários (ex. criar treino) | Layout completo com mais campos lado a lado |

**Tokens visuais:** alinhados a **emerald/teal** + `gray` + estados de erro `red-*` (ver objeto `ui` no início de `page.v2.tsx`).

---

# 6. MetaAdminGeral — `/metaadmingeral`

| Item | Detalhe |
|------|---------|
| **Arquivo** | `app/metaadmingeral/page.tsx` |
| **Query** | `?menu=oftpay` abre direto a seção OftPay |

## 6.1 Sub-rota de redirecionamento

| URL | Comportamento |
|-----|----------------|
| `/metaadmingeral/oftpay` | `app/metaadmingeral/oftpay/page.tsx` → após auth, `replace('/metaadmingeral?menu=oftpay')` (apenas email owner) |

## 6.2 Menus da sidebar (conteúdo `switch (activeMenu)`)

| `activeMenu` | Nome / função |
|--------------|----------------|
| `estatisticas` | Dashboard geral (médicos, pacientes, agregados) |
| `medicos` | Cadastro / listagem médicos |
| `nutricionistas` | Nutricionistas |
| `personal_trainers` | Personals |
| `pacientes` | Pacientes globais |
| `leads` | Leads |
| `tirzepatida` | Preços / gestão tirzepatida |
| `emails` | Email (`EmailManagement`) |
| `calendario` | Calendário aplicações |
| `nps` | NPS |
| `banners` | Banners |
| `oftpay` | Usuários OftPay / cursos |
| `relatorios` | Relatórios |
| `troca` | Trocas |
| `ferias` | Férias |
| `mensagens` | Mensagens |
| `residentes`, `locais`, `servicos`, `escalas`, `cadastrar-*`, `criar-escala` | Gestão operacional (mesmo padrão visual MetaAdmin) |

## 6.3 Mobile vs desktop — `/metaadmingeral`

| Mobile | Desktop |
|--------|---------|
| **Sem** barra inferior fixa (diferente de MetaAdmin/MetaNutri/MetaPersonal) | Sidebar sempre acessível |
| `mobileMenuOpen`: overlay `bg-black/50`, gaveta `w-72 max-w-[85vw]` | Menu lateral completo |
| Header `lg:hidden` com hambúrguer | Layout estável |

**Cores:** mesmo padrão “admin”: spinners `border-green-600`, tabelas zebra `gray-50`, botões primários verdes.

---

# 7. Checklist rápido — o que validar em **cada rota** (Marketing)

Para **cada URL** acima, em **320px**, **768px** e **1280px**:

1. **Fundo da página** e **cartões** (branco vs cinza-claro).  
2. **Botão primário** (verde vs roxo vs gradiente — hoje há **três famílias**: home roxo/laranja, admin verde, nutri/personal esmeralda).  
3. **Links e estados de erro/sucesso** (vermelho, âmbar, verde).  
4. **Gráficos** (Recharts — cores de série podem estar em TSX).  
5. **Modais** (fundo escuro semitransparente, bordas).

---

# 8. Arquivos “âncora” para mudança de paleta por área

| Área | Arquivos prioritários |
|------|------------------------|
| Global | `app/globals.css` |
| Home | `app/page.tsx` |
| Meta paciente | `app/meta/page.tsx`, `components/layouts/Layout*.tsx`, `app/meta/nutri/page.tsx`, `app/meta/personal/page.tsx` |
| MetaAdmin | `app/metaadmin/page.tsx` |
| MetaNutri | `app/metanutri/page.v2.tsx`, `app/metanutri/nutri/[pacienteId]/page.tsx`, `components/KpiCard.tsx`, `components/NutriContent.tsx` |
| MetaPersonal | `app/metapersonal/page.v2.tsx` |
| MetaAdminGeral | `app/metaadmingeral/page.tsx` |

---

*Documento baseado na estrutura do repositório em março/2026. Rotas dinâmicas usam `[param]`; query strings podem adicionar estados sem novo arquivo.*
