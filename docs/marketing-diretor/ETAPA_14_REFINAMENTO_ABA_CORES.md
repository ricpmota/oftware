# Etapa 14 — Refinamento da aba “Cores do Sistema”

## Objetivo desta etapa

Transformar a tela atual de “Cores do Sistema” em um painel premium de governança de identidade visual, com:

- validações (hex, contraste e similaridade semântica)
- presets executivos
- previews mais realistas de contexto
- metadados de governança (nome, versão, observações, updatedAt)

## Escopo técnico (sem impacto no sistema inteiro)

- Nenhuma cor do produto foi substituída fora desta aba.
- Persistência continua localStorage (por enquanto), agora com estrutura contendo `metadata + tokens`.

## Arquivo alterado

- `components/systemColors/SystemColorsTab.tsx`

## O que foi adicionado/alterado

1. Governança
   - campos: `name`, `version`, `notes`, `updatedAt`
   - export/import JSON agora inclui metadados junto com os tokens

2. Validações
   - validação técnica de `hex` em cada campo (feedback visual)
   - cálculo de contraste (WCAG) para:
     - texto principal vs fundo principal
     - texto secundário vs superfície card
     - texto inverse vs botão primário (estimado pela média do gradiente)
   - alerta/bloqueio de saving se cores semânticas (success/warning/danger/info) ficarem muito parecidas

3. Presets
   - botões com clique único:
     - `Osoftware Atual`
     - `Premium Saúde`
     - `Corporativo Sóbrio`
     - `Alto Contraste`

4. Preview
   - manteve o preview geral e adicionou:
     - dashboard (KPIs)
     - tabela
     - badges de sucesso/alerta/erro/info
     - formulário e botões (primário e secundário)

## Próximo passo (fora do escopo desta etapa)

- Persistir a configuração globalmente (ex.: Firestore)
- Gerar CSS variables globais e consumir tokens para substituir hardcodes/classes no sistema inteiro

