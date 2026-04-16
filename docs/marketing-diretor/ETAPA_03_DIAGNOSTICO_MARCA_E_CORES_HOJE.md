# Etapa 3 — Diagnóstico: marca visual e cores atuais

## 3.1 Camada global (todo o site)

**Arquivo:** `app/globals.css`

| Elemento | Valor hoje | Efeito na marca |
|----------|------------|-----------------|
| `--background` | `#ffffff` | Base teórica Tailwind |
| `--foreground` | `#171717` | Texto tema |
| `body` background | `#ffffff !important` | Fundo sempre branco |
| `body` color | `#111827` (gray-900) | Texto global escuro |
| Overrides `dark:*` | forçados para claro | Qualquer `dark:` no JSX pode ser **neutralizado** |

**Implicação para Marketing:** mudar só “marca no Figma” **não** muda o produto se o código continuar com classes `bg-green-600`, etc. É preciso **tokens + substituição** ou **tema Tailwind estendido**.

## 3.2 Home `/` — família “roxo / laranja / multicolor”

**Arquivo:** `app/page.tsx`

### Fundo e atmosfera

| Uso | Implementação |
|-----|----------------|
| Gradiente animado | `from-blue-50 via-purple-50 to-orange-50` |
| Orbes | `bg-purple-300/10`, `bg-orange-300/10` |
| Partículas inline | `rgba(139,92,246)`, `rgba(59,130,246)`, `rgba(249,115,22)` |
| Loading (balança) | Hex SVG: `#9CA3AF`, `#D1D5DB`, `#E5E7EB`, `#F3F4F6`, seta `#10B981` |

### Header logado

| Uso | Classes |
|-----|---------|
| Barra | `bg-white/80`, `border-gray-200/50` |
| Título gradiente | `from-purple-600 to-orange-600` |

### Card “O que é o Oftware”

| Uso | Classes |
|-----|---------|
| Borda superior | `from-purple-500 via-blue-500 to-orange-500` |
| Título | `from-purple-600 via-blue-600 to-orange-600` |
| Área slides | `bg-gray-50`, borda `gray-200`, hover `gray-100/80` |
| Indicadores carrossel | ativo: `from-purple-500 to-orange-500`; inativo: `gray-300` |
| Setas | hover `purple-600`, `purple-50` / `purple-100` |

### CTAs por persona (grid 2 colunas)

| Persona | Ícone (gradiente) | CTA hover / link | Modal borda | Botão principal |
|---------|-------------------|------------------|-------------|-----------------|
| Médico | `purple-500 → purple-700` | `purple-600` | `purple-200/50` | `purple-600 → purple-700` |
| Paciente | `orange-500 → orange-700` | `orange-600` | `orange-200/50` | `orange-600 → orange-700` |
| Nutricionista | `green-500 → green-700` | `green-600` | `green-200/50` | `green-600 → green-700` |
| Personal | `yellow-500 → yellow-700` | `yellow-600` | `yellow-200/50` | `yellow-600 → yellow-700` |

*(Há mais detalhes no modal de cada um — mesma lógica 50/100/200 + gradiente 600–700.)*

## 3.3 Paciente — três layouts (cores distintas nos heróis)

| Layout | Arquivo | Destaque |
|--------|---------|----------|
| Moderno | `components/layouts/LayoutModerno.tsx` | Hero `from-blue-600 via-purple-600 to-pink-600`; cards azul/verde |
| Interativo | `components/layouts/LayoutInterativo.tsx` | Hero `orange / pink / purple`; cards azul, verde, roxo, laranja-rosa |
| Minimalista | `components/layouts/LayoutMinimalista.tsx` | *(revisar arquivo — tons geralmente mais neutros)* |

## 3.4 Médico / admin clínica — família “verde”

**Arquivo:** `app/metaadmin/page.tsx` (e grande parte de `metaadmingeral`)

- Primários: `green-600`, `green-700`, focus ring `green-500`  
- Secundários: `blue-600` (editar), `red-600` (excluir)  
- Superfície: `bg-white`, `gray-50`, bordas `gray-200`  
- Loading: `border-green-600`

## 3.5 Nutricionista — família “esmeralda / teal”

**Arquivos:** `app/metanutri/page.v2.tsx`, `app/metanutri/nutri/[pacienteId]/page.tsx`

- Fundos: `from-emerald-50 via-white to-teal-50`  
- CTAs: `emerald-500`, `teal-600`  
- **KPI cards:** `components/KpiCard.tsx` — `emerald`, `amber`, `rose`, `blue`, `slate`

## 3.6 Personal — tokens locais emerald/teal

**Arquivo:** `app/metapersonal/page.v2.tsx` — objeto `ui` no topo (`from-emerald-500/5`, botões `emerald → teal`, etc.)

## 3.7 Oftalmologia / legado CSS raiz

**Arquivo:** `globals.css` (raiz do repo)

- Azuis Tailwind “clássicos” (`#3b82f6`, `#2563eb`, …), alertas vermelho/amarelo/azul, botões gradiente azul/verde.

Só afeta páginas que **importam** esse CSS (fluxo oftalmológico).

## 3.8 Síntese do diagnóstico

| Risco | Descrição |
|-------|-----------|
| **R1** | Três “primárias” psicológicas: roxo/laranja (home), verde (admin), esmeralda (nutri/personal) |
| **R2** | Overrides globais anulam dark mode — decisão consciente se lançar tema escuro de verdade |
| **R3** | Gráficos (Recharts) podem ter cores hardcoded fora da paleta |

## 3.9 Próximo passo

Preencher a **nova direção** em **`ETAPA_04_PALETA_ALVO_TOKENS_FORMULARIO.md`**.
