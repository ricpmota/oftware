# Etapa 6 — Componentes, biblioteca e dependências de cor

## 6.1 Princípio

Mudar cor em **um** componente pode alterar **várias rotas**. Esta etapa lista os **maiores multiplicadores**.

---

## 6.2 Componentes de layout (paciente)

| Componente | Caminho | O que muda com rebranding |
|------------|---------|---------------------------|
| LayoutModerno | `components/layouts/LayoutModerno.tsx` | Hero gradiente, cards de métricas |
| LayoutMinimalista | `components/layouts/LayoutMinimalista.tsx` | *(revisar)* tons geralmente mais neutros |
| LayoutInterativo | `components/layouts/LayoutInterativo.tsx` | Hero multicolor, 4 KPIs coloridos, gráficos |

**Ação Marketing:** decidir se os **3 layouts** continuam com “personalidades” visuais diferentes ou se **unificam** sob tokens `brand-*`.

---

## 6.3 Cards e métricas

| Componente | Caminho | Tokens hoje |
|------------|---------|-------------|
| KpiCard | `components/KpiCard.tsx` | Badge: emerald, amber, rose, blue, slate; trend green/red/gray |
| ProgressPill | `components/ProgressPill.tsx` | *(grep ao implementar)* |
| AlertBadges | `components/AlertBadges.tsx` | Semânticos |

---

## 6.4 Dados clínicos / gráficos

| Área | Arquivos típicos | Observação |
|------|------------------|------------|
| Curvas de peso | `TrendLine`, Recharts em `meta` / `metaadmin` | Cores de linha por série |
| Laboratório | `LabRangeBar.tsx` | Faixas e cores de status |
| Bioimpedância | `BioImpedanciaDisplay.tsx`, `BodyMapOverlay.tsx` | Mapa corporal, barras |

**Marketing:** definir **paleta de dados** (3–5 cores distinguíveis + daltonismo).

---

## 6.5 Chat e suporte

| Componente | Caminho |
|------------|---------|
| FAQChat | `components/FAQChat.tsx` |
| ModalDadosPacienteChat | `components/ModalDadosPacienteChat.tsx` |

---

## 6.6 Calendários e agenda

| Componente | Caminho |
|------------|---------|
| CalendarioAplicacoes | `components/CalendarioAplicacoes.tsx` |
| CalendarioTreinosPersonal | `components/CalendarioTreinosPersonal.tsx` |
| ScheduleCalendar (OftReview) | `components/oftreview/ScheduleCalendar.tsx` |

---

## 6.7 Banners dinâmicos

| Componente | Caminho |
|------------|---------|
| BannerRenderer | `components/BannerRenderer.tsx` |

Conteúdo vem do Firestore — **cores dentro do JSON/HTML** do banner escapam ao CSS global.

---

## 6.8 Dependências externas que afetam cor

| Pacote / uso | Nota |
|--------------|------|
| **Tailwind CSS v4** | Cores via classes utilitárias; tema em `app/globals.css` (`@theme inline`) |
| **lucide-react** | Ícones herdam `text-*` do pai |
| **Recharts** | Cores nos props dos componentes |

---

## 6.9 Ordem sugerida de atualização (resumo)

1. Tokens globais + semânticos (`success`, `danger`, …)  
2. `KpiCard`, botões primários compartilhados  
3. Layouts Moderno / Interativo / Minimalista  
4. Páginas monolíticas (`meta`, `metaadmin`) por **seção** (sidebar primeiro, depois conteúdo)

Detalhe em **Etapa 9**.

---

## Próximo passo

**`ETAPA_07_COMUNICACAO_TOM_VOZ_E_ASSETS.md`**
