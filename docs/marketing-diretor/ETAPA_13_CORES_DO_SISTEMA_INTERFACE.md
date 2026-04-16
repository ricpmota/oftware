# Etapa 13 — Interface: “Cores do Sistema” (base de tokens)

## 13.1 O que foi criado

Foi adicionada uma nova “aba”/seção dentro de **`/metaadmingeral`** chamada **`Cores do Sistema`**.

Ela permite ao Diretor de Marketing definir e salvar um conjunto estruturado de cores por **tokens**, com:

- color pickers (hex)
- preview visual por grupo
- preview geral simulando telas (desktop e mobile)
- persistência no navegador

Importante: **não altera** nenhuma cor do sistema ainda (a configuração é usada apenas na prévia desta página).

## 13.2 Onde fica no código

- UI (nova): `components/systemColors/SystemColorsTab.tsx`
- Aba/roteamento dentro do Admin Geral: `app/metaadmingeral/page.tsx`
  - novo `activeMenu`: `cores-do-sistema`
  - novo `case` no `switch (activeMenu)`
  - inclusão de menu item no drawer mobile

## 13.3 Estrutura de dados (schema)

O schema é `SystemColorsTokens` (TypeScript), estruturado em grupos:

- `brand`
  - `primary` (string hex)
  - `secondary` (string hex)
  - `accent` (string hex)
  - `gradient`:
    - `from` (hex)
    - `via` (hex opcional)
    - `to` (hex)
- `surface`
  - `background` (hex)
  - `card` (hex)
  - `modal` (hex)
  - `sidebar` (hex)
  - `navbar` (hex)
- `text`
  - `primary` (hex)
  - `secondary` (hex)
  - `inverse` (hex) (texto sobre superfícies coloridas)
- `border`
  - `default` (hex)
  - `focus` (hex)
- `state`
  - `success` (hex)
  - `warning` (hex)
  - `danger` (hex)
  - `info` (hex)
- `chart`
  - `c1`..`c5` (5 hex para séries/gráficos)

## 13.4 Persistência (local config)

As definições são salvas em **`localStorage`**:

- `STORAGE_KEY`: `oftware_system_colors_tokens_v1`

Botões:

- `Salvar`: valida hex e grava no `localStorage`
- `Reset`: retorna ao `defaultTokens` e remove da storage
- `Exportar JSON`: copia o JSON completo para a área de transferência
- `Importar JSON`: aplica um JSON no formato do schema

## 13.5 Como será consumido depois (tokens globais)

Na próxima fase técnica, a ideia é:

1. Reutilizar o mesmo schema `SystemColorsTokens`.
2. Gerar um mapeamento para CSS variables globais (exemplo):
   - `--brand-primary`
   - `--surface-background`
   - `--text-primary`
   - `--border-default`
   - `--state-success`
   - `--chart-1`..`--chart-5`
3. Consumir essas variáveis em:
   - `app/globals.css` (`:root` / `@theme inline` do Tailwind)
   - e substituir gradualmente classes Tailwind hardcoded e/ou hex hardcoded por tokens.

Observação: por enquanto a página só “simula” usando `style={{ background: ... }}` no preview.

## 13.6 Próximos passos sugeridos

1. **Definição oficial da paleta**: Diretor completa a Etapa 4 (hex) e escolhe como quer a marca (unificada vs por área).
2. **Geração de tokens**: engenharia passa a derivar `defaultTokens` da paleta aprovada (para não depender do localStorage).
3. **Aplicação progressiva**:
   - primeiro tokens globais em `app/globals.css`
   - depois substituição em componentes/rotas de maior impacto
4. **QA de regressão visual** usando a matriz da Etapa 10.

