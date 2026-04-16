# Etapa 9 — Handoff para engenharia (ordem de obra)

**Pré-requisito:** Etapa 4 preenchida e aprovada.

## 9.1 Fase 0 — Fundação (1 PR)

| Ordem | Arquivo | Ação |
|-------|---------|------|
| 1 | `app/globals.css` | Mapear `--background`, `--foreground` para tokens da Etapa 4; revisar overrides `dark:` se a nova marca precisar de tema escuro real |
| 2 | Decisão | Introduzir `:root { --brand-primary: ... }` e consumir via `@theme inline` OU manter substituição gradual de classes |

## 9.2 Fase 1 — Home (1 PR)

| Arquivo | Escopo |
|---------|--------|
| `app/page.tsx` | Fundo animado, header, card Oftware, 4 CTAs, modais, loading SVG |

## 9.3 Fase 2 — Componentes compartilhados (1–2 PRs)

| Arquivo |
|---------|
| `components/KpiCard.tsx` |
| `components/layouts/LayoutModerno.tsx` |
| `components/layouts/LayoutInterativo.tsx` |
| `components/layouts/LayoutMinimalista.tsx` |

## 9.4 Fase 3 — Apps grandes (vários PRs por área)

| Prioridade | Rota | Arquivo |
|------------|------|---------|
| P0 | Paciente | `app/meta/page.tsx` (por blocos: sidebar, cards, gráficos) |
| P0 | Médico | `app/metaadmin/page.tsx` |
| P1 | Nutri | `app/metanutri/page.v2.tsx`, `app/metanutri/nutri/[pacienteId]/page.tsx` |
| P1 | Personal | `app/metapersonal/page.v2.tsx` |
| P1 | Admin geral | `app/metaadmingeral/page.tsx` |
| P2 | Sub-meta | `app/meta/nutri/page.tsx`, `app/meta/personal/page.tsx`, `app/meta/layout/page.tsx`, `app/meta/banner/[id]/page.tsx` |

## 9.5 Fase 4 — CSS legado

| Arquivo | Quando |
|---------|--------|
| `globals.css` (raiz) | Se fluxo oftalmológico permanecer ativo |

## 9.6 Fase 5 — Gráficos e terceiros

- Buscar `#` e `stroke`/`fill` em componentes Recharts.  
- Atualizar `BioImpedanciaDisplay`, `LabRangeBar` conforme paleta de dados (Etapa 6).

## 9.7 Critérios de aceite técnico

- [ ] Build sem erros  
- [ ] Nenhum flash de cor errada no loading  
- [ ] `focus-visible` visível em botões (acessibilidade teclado)  

## 9.8 Próximo passo

Rodar **`ETAPA_10_QA_MATRIZ_100_CHECKLIST.md`** em staging/produção.
