# Etapa 1 — Índice, cronograma e responsáveis

## 1.1 Objetivo do projeto de rebranding

Definir e aplicar uma **paleta e sistema de tokens** coerentes em:

- Site público (home)  
- App paciente (`/meta` e sub-rotas)  
- App médico (`/metaadmin`)  
- App nutricionista (`/metanutri`)  
- App personal (`/metapersonal`)  
- Admin geral (`/metaadmingeral`)

## 1.2 Fases sugeridas (ajustar à realidade)

| Fase | Duração sugerida | Entregável | Dono principal |
|------|------------------|------------|----------------|
| **A — Descoberta** | 1–2 semanas | Leitura etapas 1–3; workshop com produto | Marketing |
| **B — Definição** | 1–2 semanas | Etapa 4 preenchida + moodboard aprovado | Marketing + Design |
| **C — Especificação** | 1 semana | Tokens nomeados; exceções (gráficos, estados) | Design + Dev front |
| **D — Implementação** | 2–4 semanas | PRs por área (Etapa 9) | Engenharia |
| **E — QA** | 1 semana | Etapa 10 100% verde | Marketing + QA |

## 1.3 RACI resumido

| Atividade | Responsável | Aprovador | Consultado | Informado |
|-----------|-------------|-----------|------------|-----------|
| Paleta primária/secundária | Marketing | Direção | Produto | Todos |
| Contraste WCAG (AA) | Design/Dev | Marketing | — | — |
| Alteração em `app/globals.css` | Dev | Tech lead | Marketing | — |
| Copy em modais críticos | Marketing | Produto | Jurídico (se saúde) | — |
| Release em produção | Dev/Prod | — | Marketing | Clientes internos |

## 1.4 Critérios de “pronto” (Definition of Done)

- [ ] Etapa 4 assinada (PDF ou e-mail formal).  
- [ ] Nenhuma tela P0 da Etapa 10 com falha de contraste.  
- [ ] Spinners/loading alinhados à cor primária (hoje mistura verde).  
- [ ] Documentação atualizada (link para tokens finais).

## 1.5 Próximo passo

Abrir **`ETAPA_02_ONBOARDING_PRODUTO_E_PERSONAS.md`**.
