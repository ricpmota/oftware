# Protocolo de Padronização — Oftware

**Documento:** Direção de Marketing | **Atualizado:** Março/2026

---

## Índice rápido

1. [Workflow do agente](#workflow-do-agente)
2. [Paleta (4 cores apenas)](#1-paleta-4-cores-apenas)
3. [Dashboard: referência e snippets](#2-dashboard-referência-e-snippets)
4. [Erros frequentes](#3-erros-frequentes)
5. [Detalhes por tipo de página](#4-detalhes-por-tipo-de-página)

---

## Workflow do agente

**Antes de editar qualquer página, siga:**

1. **Identificar o tipo:** Landing (marketing) ou Dashboard (admin)?
2. **Abrir a referência:**
   - Dashboard → `app/metaadmingeral/page.tsx` (case `'estatisticas'`)
   - Landing → `app/page.tsx`
3. **Copiar padrões:** Use a referência como fonte de verdade. Se na referência está `bg-white/5`, use isso — não improvise.
4. **Validar:** Nenhum `text-gray-900`, `bg-blue-*`, `bg-pink-*`, `bg-purple-*` etc. em áreas de fundo escuro.

---

## 1. Paleta (4 cores apenas)

| Token       | Hex       | Uso |
|-------------|-----------|-----|
| Deep Blue   | `#0A1F44` | Fundo principal, tooltip de gráficos |
| Vital Green | `#4CCB7A` | CTAs, destaques, linhas de gráfico, ícones |
| Data Blue   | `#2F8FA3` | Gradientes, barras alternadas, acentos |
| Neutral White | `#E8EDED` | Texto em fundo escuro |

**Cores proibidas em dashboards** (usar só as 4 acima):  
`blue-*`, `indigo-*`, `purple-*`, `violet-*`, `pink-*`, `fuchsia-*`, `orange-*` (exceto estrelas), `amber-*` (exceto estrelas de classificação).

---

## 2. Dashboard: referência e snippets

**Arquivo de referência:** `app/metaadmingeral/page.tsx` — case `'estatisticas'`

### 2.1 Container principal (fundo escuro)
```tsx
className="bg-[#0A1F44]"
```

### 2.2 Cards
```tsx
className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-[#4CCB7A]/30 transition-colors"
```

### 2.3 Títulos e texto
```tsx
// Título principal
className="text-2xl font-bold text-[#E8EDED]"

// Título de seção
className="text-lg font-semibold text-[#E8EDED]"

// Texto secundário
className="text-sm text-[#E8EDED]/70"
className="text-xs text-[#E8EDED]/60"
```

### 2.4 Ícones em cards
```tsx
<div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#4CCB7A] to-[#2F8FA3] flex items-center justify-center">
  <Icone className="w-6 h-6 text-white" />
</div>
```

### 2.5 Barras de progresso (faixas etárias, cidades)
```tsx
// Track
className="w-32 bg-white/20 rounded-full h-2"

// Fill — alternar por item
style={{ width: `${porcentagem}%` }}
className="bg-[#4CCB7A] h-2 rounded-full"  // ou bg-[#2F8FA3]
```

### 2.6 Pipeline / colunas (Kanban)
- **Container da coluna:** `bg-white/5 border border-white/10 rounded-xl`
- **Header da coluna:** `bg-white/10` ou `bg-[#2F8FA3]/20` ou `bg-[#4CCB7A]/20` + `text-[#E8EDED]`
- **Card de item:** `bg-white/5 border border-white/10 hover:border-[#4CCB7A]/30`
- **Texto em card:** `text-[#E8EDED]`, detalhes `text-[#E8EDED]/70`

### 2.7 Gráficos (Recharts)

**Variáveis ao usar tema escuro:**
```tsx
const chartGridStroke = 'rgba(232,237,237,0.25)';
const chartTickFill = '#E8EDED';
const chartTooltipStyle = { 
  backgroundColor: '#0A1F44', 
  border: '1px solid rgba(255,255,255,0.1)', 
  borderRadius: '8px' 
};
const chartColors = { vitalGreen: '#4CCB7A', dataBlue: '#2F8FA3' };
```

**PieChart:**
```tsx
<linearGradient id="g1">
  <stop offset="0%" stopColor="#4CCB7A" />
  <stop offset="100%" stopColor="#2F8FA3" />
</linearGradient>
<linearGradient id="g2">
  <stop offset="0%" stopColor="#2F8FA3" />
  <stop offset="100%" stopColor="#0A1F44" />
</linearGradient>
```

**LineChart / BarChart:**
- `CartesianGrid stroke={chartGridStroke}`
- `XAxis tick={{ fill: chartTickFill }}`
- `YAxis tick={{ fill: chartTickFill }}`
- `Line stroke="#4CCB7A"` ou `stroke={chartColors.vitalGreen}`
- `Bar fill="#4CCB7A"` ou `fill="#2F8FA3"`
- `Tooltip contentStyle={chartTooltipStyle} labelStyle={{ color: '#E8EDED' }}`

**Cores de legendas:** `#4CCB7A` e `#2F8FA3` (alternar).

### 2.8 Loading spinner
```tsx
className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#4CCB7A]"
```

### 2.9 Menu inferior (mobile, tema escuro)
```tsx
className="fixed bottom-0 left-0 right-0 bg-[#0A1F44] border-t border-white/10"
// Item ativo
className="bg-white/10 text-[#4CCB7A]"
// Item inativo
className="text-[#E8EDED]/70"
```

### 2.10 Toggle tema (Lua/Sol)
- **Mobile:** header com `lg:hidden` — botão ao lado do perfil, visível apenas na Home.
- **Desktop:** menu lateral — botão ao lado do ícone de recolher, visível apenas na Home.
```tsx
// Condição para mostrar: activeMenu === 'estatisticas'
<button onClick={() => { setThemeHome(prev => prev === 'light' ? 'dark' : 'light'); localStorage.setItem('metaadmin_home_theme', ...); }}>
  {themeHome === 'light' ? <Moon /> : <Sun />}
</button>
// Estilo em tema escuro
className="text-[#E8EDED] hover:bg-white/10"
```

### 2.11 Menu lateral (desktop, tema escuro)
```tsx
// Quando activeMenu === 'estatisticas' && themeHome === 'dark'
className="bg-[#0A1F44]/95 backdrop-blur-md border-r border-white/10"
// Itens: header, user info, nav, bordas → border-white/10
// Item ativo (Home): bg-white/10 text-[#4CCB7A] border-r-2 border-[#4CCB7A]
// Item inativo: text-[#E8EDED]/80 hover:bg-white/10 hover:text-[#E8EDED]
// Texto user: text-[#E8EDED], secundário text-[#E8EDED]/70
```

### 2.12 Scrollbar (tema escuro)
- Classe em `app/globals.css`: `.metaadmin-home-dark-scroll` (mesmo estilo de `.metaadmingeral-page`).
- Aplicar no container principal quando `activeMenu === 'estatisticas' && themeHome === 'dark'`.
- Track: `#0A1F44`, thumb: `linear-gradient(180deg, #4CCB7A, #2F8FA3)`.

### 2.13 Botões de filtro (tema escuro)
```tsx
// Selecionado
className="bg-[#4CCB7A] text-[#0A1F44]"
// Não selecionado
className="bg-white/10 text-[#E8EDED]/80 hover:bg-white/20"
// Evitar azul no foco: adicionar
className="focus:outline-none focus:ring-2 focus:ring-[#4CCB7A] focus:ring-offset-2 focus:ring-offset-[#0A1F44]"
```

### 2.14 Modal em fundo escuro
- Modais abertos sobre tema escuro devem ter fundo sólido branco e texto preto.
- Usar `style={{ backgroundColor: '#ffffff' }}` para ignorar override `bg-white/5`.
- Texto: `text-black`, gráficos dentro do modal: eixos e labels em `#000000`, tooltip com fundo branco.

### 2.15 Demografia (idade, gênero, geográfica)
- Ver blocos em `metaadmingeral` case `'estatisticas'` — bloquinhos de Idade Média, Faixas Etárias, PieChart Gênero, Top Cidades.
- Padrão: `bg-white/5 rounded-xl p-4 border border-white/10` em cada sub-bloco.
- Barras: `#4CCB7A` e `#2F8FA3` alternados.

---

## 3. Erros frequentes

| Erro | Correção |
|------|----------|
| `text-gray-900` em fundo escuro | `text-[#E8EDED]` |
| `bg-white` em card de dashboard escuro | `bg-white/5` |
| `border-gray-200` em tema escuro | `border-white/10` |
| Gráfico com `stroke="#3b82f6"` ou cores variadas | Usar apenas `#4CCB7A` e `#2F8FA3` |
| Tooltip sem estilo | `contentStyle` + `labelStyle` com `#0A1F44` e `#E8EDED` |
| Grid de gráfico invisível em fundo escuro | `stroke="rgba(232,237,237,0.25)"` |
| Pipeline com `bg-gray-100`, `text-gray-700` | `bg-white/10`, `text-[#E8EDED]` |
| Demografia com `from-blue-50`, `bg-indigo-500` | `bg-white/5`, `#4CCB7A` / `#2F8FA3` |
| Botão azul no foco (tema escuro) | `focus:outline-none focus:ring-2 focus:ring-[#4CCB7A] focus:ring-offset-[#0A1F44]` |
| Modal com fundo transparente em tema escuro | `style={{ backgroundColor: '#ffffff' }}` + texto `text-black` |
| Scrollbar padrão em tema escuro | Classe `metaadmin-home-dark-scroll` no container principal |

---

## 4. Detalhes por tipo de página

### 4.1 Landing / marketing
- **Referência:** `app/page.tsx`
- **Header:** `components/landing/LandingPageHeader.tsx`
- CTA primário: `bg-[#4CCB7A] text-[#0A1F44]`
- CTA secundário: `border-[#E8EDED]/40 text-[#E8EDED]`
- Fundo hero: `from-[#0A1F44] via-[#0d2a5a] to-[#0A1F44]`

### 4.2 Dashboard / admin
- **Referência:** `app/metaadmingeral/page.tsx`
- **metaadmin:** `app/metaadmin/page.tsx` (case `'estatisticas'`) — replica padrões com toggle tema.
- Fundo: `bg-[#0A1F44]`
- Sidebar: `bg-[#0A1F44]/95`, links hover `text-[#4CCB7A]`
- Toggle Lua/Sol: mobile (header) e desktop (sidebar) — só na Home.
- Scrollbar tema escuro: classe `metaadmin-home-dark-scroll` em `globals.css`.
- Modais (fundo claro): manter `text-black` e `backgroundColor: '#ffffff'` para legibilidade.

### 4.3 Tema claro vs escuro (toggle)
- Se a página tiver toggle de tema, aplicar condição `isHomeDark` (ou equivalente).
- Quando escuro: usar todos os snippets da seção 2.
- Quando claro: manter padrão existente (gray-*, white, etc.).

---

## 5. Checklist rápida (dashboard escuro)

- [ ] Fundo `#0A1F44`
- [ ] Cards `bg-white/5 border-white/10`
- [ ] Textos `#E8EDED` / `#E8EDED`/70
- [ ] Sem `blue-*`, `pink-*`, `purple-*` etc.
- [ ] Gráficos: `#4CCB7A` e `#2F8FA3` apenas
- [ ] Tooltips com `backgroundColor: '#0A1F44'`, `labelStyle`
- [ ] Pipeline/cards de lead com `text-[#E8EDED]`
- [ ] Demografia igual à de `metaadmingeral`
- [ ] Toggle Lua/Sol em mobile e desktop (só na Home)
- [ ] Menu lateral desktop escuro quando tema escuro
- [ ] Scrollbar estilo metaadmingeral (`.metaadmin-home-dark-scroll`)
- [ ] Botões sem contorno azul no foco (`focus:ring-[#4CCB7A]`)
- [ ] Modais com fundo branco sólido e texto preto

---

## 6. Arquivos de referência

| Uso | Arquivo |
|-----|---------|
| Dashboard escuro (modelo) | `app/metaadmingeral/page.tsx` |
| Dashboard com toggle tema | `app/metaadmin/page.tsx` (case `'estatisticas'`) |
| Landing | `app/page.tsx` |
| Header landing | `components/landing/LandingPageHeader.tsx` |
| Globals (scrollbar, animações) | `app/globals.css` — `.metaadmingeral-page` e `.metaadmin-home-dark-scroll` |

---

## 7. Copy e tom de voz (resumo)

- **Base:** Método Emagrecer, processo, acompanhamento
- **Evitar:** linguagem genérica, promessas exageradas
- **Frases:** "Não vendemos dieta. Entregamos um sistema."

---

*Protocolo revisado para eficiência. Fonte de verdade: `metaadmingeral/page.tsx` (case estatisticas).*
