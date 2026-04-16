# Relatório de cores — Diretor de Marketing (Oftware)

**Objetivo:** centralizar **todas as cores que hoje impactam a identidade visual**, separadas por **área do sistema**, para permitir uma **troca completa de paleta** com rastreabilidade (onde alterar no código e o que validar na interface).

**Como usar este documento**
1. Preencha a coluna **Nova cor (hex)** com a paleta aprovada.
2. Marque **Prioridade** (P0 = marca global; P1 = produto; P2 = detalhe).
3. Após aprovação, o time técnico aplica nos arquivos indicados em **Onde alterar**.

---

## 1. Visão executiva (para Marketing)

| Tema | Situação hoje | Risco na troca |
|------|----------------|----------------|
| **Base (fundo/texto)** | Modo claro forçado; poucas variáveis globais (`--background`, `--foreground`) | Mudar só variáveis pode **não** mudar telas que usam Tailwind direto (`bg-blue-500`, etc.) |
| **Tailwind + overrides** | Há regras que **forçam** fundo branco e texto escuro (inclui anulação de `dark:`) | Nova paleta escura ou alto contraste exige **revisar** essas regras |
| **Oftalmologia (`globals.css` raiz)** | Muitas cores **fixas em hex** (botões, alertas, tabelas) | Troca de marca **obriga** atualizar este arquivo (ou migrar para tokens) |
| **Componentes React** | Cores espalhadas em classes Tailwind e alguns hex | Checklist por produto (Meta, Nutri, OftPay, etc.) |

**Recomendação de processo:** definir **tokens de marca** (primária, secundária, neutros, sucesso, aviso, erro, info) e só depois mapear cada tela para esses tokens — evita “azul em 50 lugares diferentes”.

---

## 2. Sistema A — **App global (Next.js + Tailwind v4)**

**Arquivo principal:** `app/globals.css`  
**Papel:** variáveis CSS, tema inline do Tailwind, corpo da página e **regras globais** que sobrepõem dark mode.

### 2.1 Tokens globais (`:root`)

| Token / uso | Cor atual (hex) | Nova cor (hex) | Observação |
|-------------|-----------------|----------------|------------|
| `--background` (base tema) | `#ffffff` | | Ligado a `--color-background` no `@theme inline` |
| `--foreground` (texto tema) | `#171717` | | Ligado a `--color-foreground` |
| `body` background | `#ffffff` | | `!important` |
| `body` texto | `#111827` | | Equiv. gray-900, `!important` |

### 2.2 Overrides de modo escuro / consistência

Estas regras **forçam** aparência clara e podem **anular** intenções de design se não forem revistas:

| Regra (resumo) | Cor / efeito atual | Nova cor / decisão | Onde |
|----------------|-------------------|-------------------|------|
| `[class*="dark:bg-"]` | fundo `#ffffff` | | `app/globals.css` |
| Textos dark → claros forçados | `#111827` | | idem |
| Bordas dark | `#e5e7eb` | | idem |
| `.bg-gray-800/900/700` | forçado para `#ffffff` | | idem |
| Texto branco em fundo branco/cinza claro | vira `#111827` | | idem |
| Texto branco em botões / fundos coloridos | mantém `#ffffff` | | idem |

### 2.3 Estados de UI (exemplo já no CSS)

| Elemento | Cor atual | Nova cor | Arquivo |
|----------|-----------|----------|---------|
| Campos desabilitados (`.paciente-abandono-view`) fundo | `#f3f4f6` | | `app/globals.css` |
| Campos desabilitados texto | `#6b7280` | | idem |

*(Há mais animações no mesmo arquivo; não alteram cor de marca.)*

---

## 3. Sistema B — **Oftalmologia / prescrição / fluxos `.oftalmo-*`**

**Arquivo principal:** `globals.css` (raiz do repositório) — estilos específicos oftalmológicos + componentes utilitários.

### 3.1 Página oftalmológica (texto e fundos Tailwind simulados)

| Contexto | Cor atual | Nova cor | Classe / seletor |
|----------|-----------|----------|------------------|
| Texto padrão página | `#1f2937` | | `.oftalmo-page` |
| Fundo branco forçado | `white` | | `.oftalmo-page .bg-white` |
| Fundo “blue-50” | `#eff6ff` | | `.bg-blue-50` |
| Fundo “green-50” | `#f0fdf4` | | `.bg-green-50` |
| Fundo “purple-50” | `#faf5ff` | | `.bg-purple-50` |
| Títulos (h1–h6) | `#1f2937` | | vários |
| Corpo (p, span, etc.) | `#374151` | | vários |
| Texto em card azul claro | `#1e40af` | | `.bg-blue-50` descendents |
| Inputs | texto `#1f2937`, fundo branco | | `.oftalmo-page input/...` |
| Botões (genérico) texto | `white` | | `.oftalmo-page button` |
| Gray utilities | `#6b7280`, `#374151`, `#1f2937` | | `.text-gray-600/700/800` |

### 3.2 Alertas

| Tipo | Fundo (gradiente) | Borda / destaque | Nova paleta |
|------|-------------------|------------------|-------------|
| Erro | `#fef2f2` → `#fee2e2` | `#dc2626` | `.alert-error` |
| Aviso | `#fffbeb` → `#fef3c7` | `#d97706` | `.alert-warning` |
| Info | `#eff6ff` → `#dbeafe` | `#2563eb` | `.alert-info` |

### 3.3 Botões de ação

| Botão | Gradiente atual | Hover (gradiente + sombra) | Nova paleta |
|-------|-----------------|----------------------------|-------------|
| Primário | `#3b82f6` → `#1d4ed8` | `#2563eb` → `#1e40af` + `rgba(59,130,246,0.3)` | `.btn-primary` |
| Sucesso | `#10b981` → `#059669` | `#059669` → `#047857` + `rgba(16,185,129,0.3)` | `.btn-success` |

### 3.4 Prescrição e semântica (+ / −)

| Estado | Cor | Nova cor |
|--------|-----|----------|
| Positivo | `#059669` | `.prescription-positive` |
| Negativo | `#dc2626` | `.prescription-negative` |

### 3.5 Tabelas, sintomas, diagnóstico, comparação, bullets

| Uso | Cores principais (hex) | Observação |
|-----|------------------------|------------|
| Bordas tabela / sintomas | `#e5e7eb`, hover `#d1d5db` | Neutros |
| Cabeçalho tabela | fundo `#f9fafb`, texto `#374151` | |
| Checkbox marcado | `#2563eb` | |
| Tag diagnóstico | fundo `#dbeafe`, texto `#1e40af`, borda `#bfdbfe` | |
| Tag selecionada | fundo `#3b82f6`, borda `#2563eb`, texto branco | |
| Destaque comparação | fundo `#fef3c7`→`#fde68a`, borda `#f59e0b` | |
| Diferença | `#dc2626` / positivo `#059669` | |
| Bullets | azul `#3b82f6`, amarelo `#f59e0b`, vermelho `#dc2626` | |

### 3.6 Impressão

| Item | Cor | Decisão Marketing |
|------|-----|-------------------|
| Página | fundo branco, texto preto | `@media print` |
| Bordas / header | `#000` | |

---

## 4. Sistema C — **Cópia legada / espelho**

| Arquivo | Ação |
|---------|------|
| `app - Copia/globals.css` | Espelho de `app/globals.css` — **alinhar** ou remover para não haver duas “verdades”. |
| `globals - Copia.css` | Espelho de `globals.css` — idem. |

---

## 5. Sistema D — **Produtos e áreas (checklist de validação visual)**

As telas usam **classes Tailwind** (`bg-*`, `text-*`, `border-*`) e alguns **hex em TSX**. Após definir a nova paleta, validar **ao menos uma tela representativa** de cada linha:

| Área / produto | Rotas / pastas (referência) | O que observar |
|----------------|----------------------------|----------------|
| Meta / admin | `app/meta/`, `app/metaadmin/`, `app/metaadmingeral/` | headers, cards, CTAs |
| MetaNutri / MetaPersonal | `app/metanutri/`, `app/metapersonal/` | gráficos, abas, estados |
| OftPay / OftReview | `app/oftpay/`, `components/oftpay/`, `components/oftreview/` | chat, vídeo, calendário |
| Páginas públicas / token | `app/conclusao/`, `app/aplicacao/`, `app/relatorio/` | confiança, legibilidade |
| Oftalmologia | páginas que importam estilos da raiz `globals.css` | alertas, botões, impressão |

---

## 6. Plano de execução (Marketing + Tech)

1. **Marketing:** preenche este documento (hex + nome do token).
2. **Marketing:** define regra de **contraste** (WCAG) para texto sobre primária/secundária.
3. **Tech:**  
   - Atualiza `app/globals.css` (tokens + overrides, se ainda fizer sentido).  
   - Atualiza `globals.css` (oftalmologia).  
   - Substitui gradualmente classes Tailwind “soltas” por tokens (opcional, reduz dívida).
4. **QA:** percorre checklist da seção 5 em **desktop + mobile**.
5. **Entrega:** congelar paleta em **versão** (ex.: “Paleta 2026-Q1”) e anexar PDF deste arquivo preenchido.

---

## 7. Registro de aprovação

| Campo | Valor |
|-------|--------|
| Data | |
| Responsável Marketing | |
| Versão da paleta | |
| Observações | |

---

*Documento gerado para apoiar mudança completa de cores. Arquivos citados existem no repositório na data da elaboração.*
