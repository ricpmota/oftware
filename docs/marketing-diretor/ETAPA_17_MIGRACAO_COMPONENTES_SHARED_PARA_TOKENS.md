# Etapa 17 — Migrar biblioteca compartilhada de UI para tokens globais

## Objetivo

Substituir cores fixas/hardcoded nos **componentes compartilhados** existentes no projeto, para usar o padrão de tokens globais já exposto via Tailwind/CSS.

## Escopo (controlado)

Foram migrados apenas componentes reutilizados que concentram lógica visual de cor e status:

- `components/KpiCard.tsx`
- `components/AlertBadges.tsx`
- `components/ProgressPill.tsx`
- `components/LabRangeBar.tsx`
- `utils/expectedCurve.ts` (função compartilhada `getVarianceColorClasses`)

**Não** houve migração massiva de páginas, layout, lógica ou troca de componentes.

## Tokens e mapeamento usado

Com o objetivo de preservar semântica (verde/amarelo/vermelho/azul/padrões), aplicamos:

- `GREEN` -> `state-success`
- `YELLOW` -> `state-warning`
- `RED` -> `state-danger`
- `NA` -> neutro via `border-default`/`text-secondary`
- gradientes e demais cores ainda não foram convertidos em componentes de layout (por risco).

## O que mudou (por arquivo)

### `components/KpiCard.tsx`
- migrou:
  - `bg-white` -> `bg-surface-card`
  - `border-gray-200` -> `border-border-default`
  - `text-gray-*` -> `text-text-*`
  - badges:
    - `bg-emerald-100 text-emerald-700` -> `bg-state-success/15 text-state-success`
    - `bg-amber-100 text-amber-700` -> `bg-state-warning/15 text-state-warning`
    - `bg-rose-100 text-rose-700` -> `bg-state-danger/15 text-state-danger`
    - `bg-blue-100 text-blue-700` -> `bg-state-info/15 text-state-info`
    - `gray` -> `bg-border-default text-text-secondary`
  - variações:
    - `text-green-600` -> `text-state-success`
    - `text-red-600` -> `text-state-danger`

### `components/AlertBadges.tsx`
- migrou `alertConfig`:
  - `bg-red-100 text-red-700` -> `bg-state-danger/15 text-state-danger`
  - `bg-orange-100 text-orange-700` -> `bg-state-warning/15 text-state-warning`
  - `bg-pink-100 text-pink-700` -> `bg-state-info/15 text-state-info`
  - `bg-yellow-100 text-yellow-700` -> `bg-state-warning/15 text-state-warning`
  - `bg-purple-100 text-purple-700` -> `bg-state-success/15 text-state-success`

### `utils/expectedCurve.ts`
- migrou `getVarianceColorClasses`:
  - `bg-emerald-100 text-emerald-700` -> `bg-state-success/15 text-state-success`
  - `bg-amber-100 text-amber-700` -> `bg-state-warning/15 text-state-warning`
  - `bg-rose-100 text-rose-700` -> `bg-state-danger/15 text-state-danger`
  - `NA` -> `bg-border-default text-text-secondary`

### `components/ProgressPill.tsx`
- migrou:
  - `text-gray-*` -> `text-text-*`
  - “sem comparação” -> `text-text-secondary`
  - classes de cor continuam vindo de `getVarianceColorClasses` (que já foi migrada).

### `components/LabRangeBar.tsx`
- migrou:
  - fundo `bg-gray-200` -> `bg-border-default`
  - faixa verde `bg-green-500` -> `bg-state-success`
  - marcador `bg-green-600/bg-red-600` -> `bg-state-success/bg-state-danger`
  - labels:
    - `text-black` -> `text-text-primary`
    - `text-green-700/text-red-700` -> `text-state-success/text-state-danger`
    - sem valor -> `text-text-secondary`

## O que permaneceu fora e por quê

- Componentes de páginas e layouts (ex.: `app/meta/page.tsx`, `metaadmin/page.tsx`, `LayoutModerno.tsx`, etc.) **não foram migrados** para evitar risco em alto volume.
- Gráficos (Recharts) e demais telas com gradientes hardcoded ficaram fora do escopo por serem áreas de maior risco.

## Riscos / QA recomendado

1. **Compatibilidade Tailwind tokens**: garantir que `bg-state-success/15` e `text-state-success` etc. estão funcionais no build atual.
2. **Contraste**: checar badges e pills em páginas reais onde eram cores claras (emerald-100 etc.) e agora usam transparência (`/15`).
3. **Alertas clínicos**: `PREGNANCY_FLAG` trocou “pink/purple” por `state-info/success` (mantém semântica de estado, mas muda identidade visual específica do badge).

