# Etapa 15 — Geração e aplicação de tokens globais (CSS variables)

## Objetivo

Criar infraestrutura para que a configuração definida na aba **“Cores do Sistema”** seja carregada do `localStorage` e aplicada como **CSS variables globais**, sem substituir cores no restante do sistema (ainda).

## O que foi criado

### 1) Função de aplicação
- `lib/systemColors/applySystemColors.ts`
- `applySystemColors(tokens)`
  - faz `style.setProperty` em `document.documentElement`
  - mapeia tokens para variáveis CSS

### 2) Tipos e defaults
- `lib/systemColors/systemColorsTokens.ts`
  - `SystemColorsTokens`, `SystemColorsMetadata`
  - `defaultSystemColorsTokens`
  - `SYSTEM_COLORS_STORAGE_KEY`

### 3) Loader de inicialização
- `components/systemColors/SystemColorsCssVarsLoader.tsx`
  - roda no boot via `useEffect`
  - lê `localStorage` (`metadata + tokens` ou tokens direto)
  - aplica tokens via `applySystemColors`
  - fallback seguro: aplica `defaultSystemColorsTokens`

### 4) Integração no app
- `app/layout.tsx`
  - inseriu `<SystemColorsCssVarsLoader />` dentro do `<body>`

## Variáveis globais geradas

O loader aplica estas variáveis em `document.documentElement`:

- `--brand-primary`
- `--brand-secondary`
- `--brand-accent`
- `--brand-gradient-from`
- `--brand-gradient-via`
- `--brand-gradient-to`

- `--surface-background`
- `--surface-card`
- `--surface-modal`
- `--surface-sidebar`
- `--surface-navbar`

- `--text-primary`
- `--text-secondary`
- `--text-inverse`

- `--border-default`
- `--border-focus`

- `--state-success`
- `--state-warning`
- `--state-danger`
- `--state-info`

- `--chart-1`
- `--chart-2`
- `--chart-3`
- `--chart-4`
- `--chart-5`

## Como será consumido depois

Em seguida, vamos:
1. Referenciar essas variáveis no `app/globals.css` / Tailwind `@theme inline`.
2. Substituir classes Tailwind e/ou hex hardcoded em componentes (gradualmente, por risco/impacto).

## Riscos / limitações remanescentes

- `useEffect` roda após hidratação: variáveis podem aparecer ligeiramente depois do carregamento inicial.
  - Como nesta etapa não substituímos cores, não há “flash” visual relevante.
  - No futuro, se quiser zero flash, será necessário injetar um script inicial no `head` para setar variáveis antes do render.

