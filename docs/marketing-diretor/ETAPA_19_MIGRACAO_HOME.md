## Etapa 19 — Migrar a Home (`/`) para os tokens globais

### Objetivo
Aplicar a governança de cor (tokens globais) na Home do sistema com impacto visual controlado, substituindo cores fixas/gradientes antigos por tokens `brand/surface/text/border/state`, sem alterar estrutura, layout, lógica, copy e fluxo da rota.

### Escopo efetivamente migrado (Home somente)
Atualizado em `app/page.tsx`:
- `LoadingSpinner` específico da Home (fundo do overlay e cores internas do SVG)
- Fundo animado da Home (`AnimatedBackground`) incluindo gradiente animado e “partículas”
- Container principal da Home (`bg-surface-background`)
- Header da Home (fundo, border e títulos com gradiente por tokens)
- Seção “O que é o Oftware” (card principal, gradientes, textos e indicadores)
- Grade de 4 acessos (Médico/Paciente/Nutricionista/Personal) incluindo o estado expandido de cada card
- Toast de erro de login (mapeado para `state-danger`)
- Rodapé (“Copyright”) mapeado para `text-text-secondary`

### Cores fixas / gradientes substituídos
- Remoção de `text-gray-*`, `bg-gray-*`, `border-gray-*`, `bg-white/*` hardcoded na Home
- Gradientes fixos por cor (`from-purple|orange|green|yellow ...`) substituídos por:
  - gradientes oficiais do brand (`from-brand-gradient-from`, `via-brand-gradient-via`, `to-brand-gradient-to`)
  - variações de superfície (`bg-surface-*`, `border-border-default/*`)
- Toast de erro (`bg-red-*`, `text-red-*`) -> `bg-state-danger/15`, `border-state-danger/30`, `text-state-danger`

### Tokens que passaram a ser usados na Home
- `surface`: `bg-surface-background`, `bg-surface-card` (incluindo variações com opacidade)
- `text`: `text-text-primary`, `text-text-secondary`, `text-text-inverse`
- `border`: `border-border-default`, `border-border-focus`
- `state`: `text-state-success`, `text-state-warning`, `bg-state-danger/15` etc (principalmente em semântica e toast)
- `brand` (gradiente oficial): `from-brand-gradient-from via-brand-gradient-via to-brand-gradient-to`

### O que ficou de fora e por quê
- Componentes “chamados” pela Home, mas não pertencentes ao arquivo/escopo visual da Home em si, foram mantidos:
  - `PreviewAreaModal` (aberto pelos cards do “O que é o Oftware”)
  - `FAQChat`
- A migração desses componentes pode existir nas etapas seguintes (por rotas/components), para manter o impacto controlado e não aumentar risco de regressão visual em cascata.

### Riscos e pontos de atenção para QA visual
1. Contraste/legibilidade: a Home agora depende de tokens (principalmente `text-text-secondary` sobre fundos de superfície com opacidade).
2. Identidade visual por papel (Médico/Paciente/Nutri/Personal): antes havia paleta fixa por cor; agora os gradientes do “CTA/ícones” foram unificados via `brand` e os destaques semânticos foram mapeados para `state-*`.
3. Fundo animado de partículas usa `color-mix(...)` com tokens (validar em navegadores-alvo).

### Arquivo alterado
- `C:/oftware/app/page.tsx`

