# Etapa 12 — Sumário Executivo (para decisão do Diretor)

## 12.1 O que será decidido nesta entrega

1. Definir **paleta alvo** (primária, secundária, neutros e acentos) em hex.
2. Decidir se Home e Apps usam **uma marca única** ou **acentos por persona/área**.
3. Decidir regra para **gradientes** (onde são permitidos e onde não são).
4. Garantir **contraste mínimo AA** em textos sobre fundos coloridos e botões primários.
5. Aprovar exceções (ex.: cores de gráficos e dados clínicos que podem exigir paleta própria).

## 12.2 Por que a cor hoje “não troca sozinha”

- Existem tokens globais em `app/globals.css` (`--background`, `--foreground`), mas o restante do produto usa principalmente **classes Tailwind com cores fixas** (ex.: `bg-green-600`, `from-purple-500 to-orange-500`) e também alguns **hex hardcoded**.
- Existem overrides que forçam **modo claro** e neutralizam o uso de `dark:` no CSS global.

Conclusão: a implementação final depende de **substituir cores por tokens** (ou estender o Tailwind para mapear tokens) e ajustar os principais componentes que espalham cor.

## 12.3 Decisão-chave (marcar uma opção)

### Home `/` (cards: Médico, Paciente, Nutricionista, Personal)

- [ ] **Unificar**: todos os cards com **mesma primária da marca** (diferenciação via ícone/ilustração).
- [ ] **Manter diferenciação**: cards com primárias/gradientes diferentes por persona (definir cores exatas).

### Apps logados (`/meta`, `/metaadmin`, `/metanutri`, `/metapersonal`, `/metaadmingeral`)

- [ ] **Uma primária** para todo o produto (mais consistente).
- [ ] **Primária por área** (Admin verde / Nutri esmeralda / Personal teal / Home multicolor).

## 12.4 Check rápido de consistência visual (Definition of Done)

Para cada rota abaixo, validar em `320px`, `768px`, `1280px`:

- [`/`](Home): loading, hero, cards, modais.
- [`/meta`](Paciente): seleção de layout (modern/minimal/interativo), menus/CTAs, encaminhamento.
- [`/meta/nutri`](wizard/plano/check-in).
- [`/meta/personal`](tabs).
- [`/metaadmin`](Médico/Admin): sidebar e telas de menu (pelo menos 1 cenário por seção).
- [`/metanutri`](Nutri): KPIs, listagem, acesso negado/sucesso.
- [`/metanutri/nutri/[pacienteId]`](Paciente Nutri): header, variação peso (verde/âmbar/neutral), conteúdo.
- [`/metapersonal`](Personal): abas e menu inferior mobile.
- [`/metaadmingeral`](Admin Geral): drawer mobile + menus principais.
- [`/metaadmingeral?menu=oftpay`](redirect): spinner e tela final.

Critérios:

- [ ] Botão primário com cor aprovada, hover coerente e `focus-visible` visível.
- [ ] Estados (erro/sucesso/aviso/info) com cor e sem ambiguidade (ideal: ícone + texto).
- [ ] Gráficos legíveis (não só vermelho/verde).
- [ ] Nenhum “flash” do tema antigo em loading.

## 12.5 Onde preencher a paleta

Preencher em **hex**:

- `docs/marketing-diretor/ETAPA_04_PALETA_ALVO_TOKENS_FORMULARIO.md`

## 12.6 Próximos passos (só após sua aprovação)

1. Engenharia executa conforme:
   - `docs/marketing-diretor/ETAPA_09_HANDOFF_ENGENHARIA_ORDEM_DE_OBRA.md`
2. QA valida via:
   - `docs/marketing-diretor/ETAPA_10_QA_MATRIZ_100_CHECKLIST.md`

## 12.7 Campos de aprovação (preencher)

| Campo | Valor |
|-------|-------|
| Nome do Diretor de Marketing | |
| Data | |
| Versão paleta (ex.: `Osoftware 2026-Q2`) | |
| Aprovação unificação (S/N) | |
| Observações | |

