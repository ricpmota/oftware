# Etapa 16 — Conectar tokens globais ao CSS/Tailwind

## Objetivo

Expor os tokens globais (definidos pela aba “Cores do Sistema” e aplicados via loader em CSS variables) no **tema do Tailwind**, preparando o consumo oficial por todo o sistema **sem** substituir cores em páginas/componentes existentes.

## Alteração feita

### Arquivo principal
- `app/globals.css`

## O que mudou no CSS base

1. **Defaults de CSS variables no `:root`**
   - Foram adicionadas variáveis com valores padrão para garantir fallback seguro, mesmo antes do `localStorage loader` rodar.

2. **Mapeamento para o tema do Tailwind (`@theme inline`)**
   - Foram criados aliases `--color-*` apontando para as variáveis globais:
     - `brand-*`
     - `surface-*`
     - `text-*`
     - `border-*`
     - `state-*`
     - `chart-1..chart-5`

## Como os tokens ficaram expostos (nomes de consumo)

Depois desta etapa, o padrão recomendado para consumo futuro (sem migração massiva agora) é:

- Brand:
  - `bg-brand-primary`, `text-brand-secondary`, `border-brand-accent`
  - Gradientes (futuro):
    - `from-brand-gradient-from`, `via-brand-gradient-via`, `to-brand-gradient-to`

- Surface:
  - `bg-surface-background`, `bg-surface-card`, `bg-surface-modal`
  - `bg-surface-sidebar`, `bg-surface-navbar`

- Text:
  - `text-text-primary`, `text-text-secondary`, `text-text-inverse`

- Border:
  - `border-border-default`, `focus:border-border-focus`

- State (semântico):
  - `bg-state-success`, `text-state-warning`, `border-state-danger`, etc.

- Chart:
  - `bg-chart-1..bg-chart-5` (para builds futuras de gráficos consistentes)

## O que já está pronto para a próxima etapa

- Tailwind agora enxerga os tokens via `@theme inline`, então etapas futuras podem trocar:
  - `bg-green-600` -> `bg-state-success` (ou `bg-brand-primary`, dependendo da regra)
  - hardcodes e `from-*/to-*` -> gradientes baseados em `brand-gradient-*`

## Riscos / limitações

- O projeto força “modo claro” via JS no `app/layout.tsx`. Isso não impede a criação das variáveis/tokens, mas pode afetar futura adoção de dark.
- Pode existir warning do linter sobre `@theme` (Tailwind v4 CSS at-rule). Isso não afeta runtime.

