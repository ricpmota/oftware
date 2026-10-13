# MetaPsi × MetaNutri — Auditoria de Paridade Visual

**Etapa:** 6.2 → **6.3.1** … → **6.3.8** → **6.3.9 (revisão visual final) concluída**  
**Data auditoria:** 2026-09-17  
**Atualização 6.3.1:** 2026-09-17  
**Atualização 6.3.2:** 2026-09-17  
**Atualização 6.3.3:** 2026-09-17  
**Atualização 6.3.4:** 2026-09-17  
**Atualização 6.3.5:** 2026-09-17  
**Atualização 6.3.6:** 2026-09-17  
**Atualização 6.3.7:** 2026-09-17  
**Atualização 6.3.8:** 2026-09-17 — somente auditoria (sem implementação)  
**Atualização 6.3.9:** 2026-09-17 — revisão visual final  
**Regra:** `/metanutri` é a referência visual oficial. `/metapsi` deve parecer adaptação profissional do Nutri (textos/dados/ACL diferentes; shell visual igual).  

---

## Changelog 6.3.9 (revisão visual final)

| Item | Decisão |
|------|---------|
| Escopo | Consolidação 6.3.1–6.3.8; só resíduos visuais |
| Placeholders Fin/Cal | Chrome empty Nutri (`rounded-lg` + ícone) + copy neutra |
| Conclusão 6.3.8 | Inalterada — sem implementar Financeiro/Calendário |
| Teste | `lib/metapsi/metaPsiVisualFinalParity.spec.ts` |
| Browser | Não autenticado nesta sessão — validação estrutural |

---

## Changelog 6.3.8 (Financeiro + Calendário — auditoria)

| Item | Decisão |
|------|---------|
| Escopo | READ-ONLY — nenhum código funcional alterado |
| Documento | `docs/metapsi/METAPSI_FINANCEIRO_CALENDARIO_AUDIT.md` |
| Financeiro | Classificação **B**; UI `ProfissionalFinanceiroSection` compartilhada Nutri/Personal; dados por collection de papel |
| Calendário | Classificação **C**; UI parcial; consultas = stacks `nutri*` / `medico*`; Personal sem meetings |
| Recomendação | **MANTER PLACEHOLDER** em ambos até mini-etapas futuras |
| Psi atual | Continua `EmptyPanel` em Financeiro/Calendário |

---

## Changelog 6.3.7 (Meu Perfil)

| Item | Decisão |
|------|---------|
| Referência | `meu-perfil` em `app/metanutri/page.v2.tsx` (~5419+) |
| Chrome | Gradient green-teal, avatar 12/14, chips tabs, footer Salvar |
| Tabs | Dados Iniciais / Endereço / Cidades — **OMITIR** Assinatura, Meu Link, WhatsApp |
| Campos Psi | Nome, email RO, especialidade RO, CRM, UF, RQE, telefone, gênero, Instagram |
| Endereço | CEP + ViaCEP Buscar (padrão Nutri) |
| Cidades | `VerificationCidadesFields` (domínio verificação compartilhado) |
| Save | `Salvar Perfil` + Save/Loader2 + feedback success/error no footer |
| Aprovação | `updatePerfil` não toca `isVerificado`/`status` |
| Testes | `lib/metapsi/metaPsiMeuPerfilParity.spec.ts` |

---

## Changelog 6.3.6 (Comunicação)

| Item | Decisão |
|------|---------|
| Componente | Mesmo `OrganizacaoComunicacaoGmailPanel` (sem painel paralelo) |
| Desktop | Wrapper `hidden min-w-0 w-full md:block` igual Nutri; sem card dashed mobile |
| Modal mobile | `z-[70]` + safe-area + `hideHeaderTitle` + `h-full` (6.1 preservado) |
| Ícone | `Mail` (já 6.3.1) |
| Branding | `resolveAssinaturaLogoUrl({ logoMainUrl, shellLogoUrl })` — branding org 6.3.1 |
| Papel | `role: 'psiquiatra'` + display “Psiquiatra” |
| Registro | `formatRegistroProfissional('psiquiatra', { numero, uf })` → CRM/UF |
| Destinatários | `loadDestinatariosMetapsi` (ACL `paciente_psiquiatra` ativo) |
| Notify | `alert(msg)` alinhado ao Nutri |
| Testes | `metaPsiComunicacaoParity.spec.ts` + ACL/mobile/shell existentes |

---

## Changelog 6.3.5 (Workspace)

| Item | Decisão |
|------|---------|
| Referência | Modal inline Nutri em `app/metanutri/page.v2.tsx` (~6844+) |
| Destino | `MetaPsiPacienteWorkspaceModal` (gate/tabs Psi preservados) |
| Pastas | Classes `mn-pastas*` + `data-mn-pastas-open` + CSS `metanutri-shell.css` |
| Active | `bg-green-100 text-green-700 border-r-2 border-green-500` (igual Nutri) |
| Mobile tabs | `border-green-500 bg-green-50 text-green-700` |
| Backdrop | `bg-black/50`; desktop `z-[80]`; mobile `z-[9999]` fullscreen |
| Header | `PacienteModalHeader` (sem vazamento de dados durante loading/ACL fail) |
| Loading | Spinner verde Nutri (não texto-only) |
| Erro | CTA `green-600` + Fechar neutro (sem indigo) |
| ACL | `assertPsiquiatraCanOpenPaciente` antes de conteúdo |
| Tabs | IDs 1–10 inalterados; sem Financeiro; pasta inicial Identificação |
| Psiquiatria | `PsiquiatriaContent mode="owner"` — sem clínica nova |
| Testes | `lib/metapsi/metaPsiPacienteWorkspaceParity.spec.ts` + gate specs |

**Fontes principais**

| Portal | Shell | CSS shell |
|--------|-------|-----------|
| Nutri | `app/metanutri/page.v2.tsx` | `app/metanutri/metanutri-shell.css` |
| Psi | `app/metapsi/page.v2.tsx` | importa o **mesmo** CSS via `app/metapsi/layout.tsx` |

---

## Changelog 6.3.4 (Pacientes)

| Item | Decisão |
|------|---------|
| Header | `Pacientes` + “Pacientes compartilhados com você” (Nutri) |
| Solicitações | `SolicitacoesPacientesCarousel` (só se pendentes > 0) |
| Busca | input + ícone Search + filtro médico |
| Lista | tabela desktop + cards mobile |
| ACL | só `paciente_psiquiatra` ativo |
| Encerrar | `endCompartilhamento` + confirm (não remove vínculo médico) |
| Workspace | abre existente; **sem** redesign interno |
| Omitido | perda de peso / semanas / financeiro Nutri |

---

## Changelog 6.3.3 (Médicos)

| Item | Decisão |
|------|---------|
| Tabs | **IGUAL** Nutri: Médicos Vinculados / Solicitações / Buscar Médicos + badges |
| Header | `Médicos` + tabs underline green |
| Busca | grid Estado+Cidade + Botão Buscar green; cards `rounded-xl` |
| Solicitações | Recebidas + Enviadas; Aceitar/Rejeitar/Cancelar Nutri |
| Vinculados | cards + `VinculoFotoAvatar`; expand pacientes ACL |
| Workspace | `MetaPsiPacienteWorkspaceModal` |
| Services | inalterados (`SolicitacaoVinculoPsiquiatraMedicoService`) |
| SplitView Nutri | **não reutilizado** (acoplado cardápio/treino) — chrome espelhado |

---

## Changelog 6.3.2 (Início)

| Item | Decisão |
|------|---------|
| `ProfissionalDashboardHome` | **Não reutilizado inteiro** — acoplado a tratamento/peso/financeiro Nutri |
| Chrome KPI | **REUTILIZAR** `DashboardHeroKpi` + `DashboardKpiCard` (mesmo grid) |
| Pacientes ativos | SoT `paciente_psiquiatra` status ativo |
| Médicos | `medicoVinculadoIds` (vínculo efetivo) |
| Compartilhamentos pendentes | `listPendingRequestsByPsiquiatra` |
| Vínculos recebidos | `listPendingVinculoRequestsByPsiquiatra` |
| Novos (30d) | `dataCompartilhamento` na janela |
| Atalhos / Pendências | **ADAPTAR** com destinos Psi reais |
| Filtro Meus/Oftware, peso, nutrição, financeiro, demografia tratamento | **OMITIR LEGITIMAMENTE** |
| Agenda / consultas fake | **OMITIR** |
| Loading | skeleton estruturado (não “Carregando…”) |

---

## Changelog 6.3.1 (shell)

Itens **resolvidos** nesta etapa (sem alterar conteúdo Início/Médicos/Pacientes/Workspace):

| Item | Antes | Depois |
|------|-------|--------|
| Logo org | hardcode `/oftware-site-novo2.png` | `GET /api/metapsi/organization-branding` + `resolveOrganizationShellLogoUrl` (fallback `/logo.png`) |
| Cor sidebar | `NAVY` constante | `organizationSecondaryColor` via branding |
| Início ícone | `Home` | `LayoutDashboard` |
| Comunicação ícone | `MessageSquare` | `Mail` |
| Meu Perfil no nav | item principal | só footer “Perfil” + dropdown |
| Header mobile | hamburger + MetaPsi + Brain | nome + Brain + verificação + avatar (padrão Nutri) |
| Bottom nav | ausente | Início / Médicos / Pacientes / Comunicação + safe-area + `pb-20` |
| Dropdown | header só texto | avatar 12×12 + separador + Sair SVG; Mensagens `lg:hidden` |
| Tablet | drawer mobile | `mn-sidebar hidden md:block` + `data-mn-nav-open` (igual Nutri) |
| Assinatura chat logo | vazio | branding org (efeito colateral do shell) |

**Mantido legítimo:** sem estrelas/classificação; sem Leads/Alimentos/WhatsApp/Meu Link; Brain só como identidade Psiquiatria.

**Testes:** `lib/metapsi/metaPsiShellChrome.spec.ts` (A–J).

---

## Matriz de paridade (resumo)

| Área | Nutri | Psi | Paridade | Severidade | Ação |
|------|-------|-----|----------|------------|------|
| Shell sidebar (`mn-sidebar`) | page.v2 + shell.css | page.v2 + mesmo CSS | **IGUAL** (6.3.1) | — | Feito |
| Logo org | `resolveOrganizationShellLogoUrl` | mesmo padrão + API metapsi | **IGUAL** (6.3.1) | — | Feito |
| Ícones nav | Lucide | Lucide homologados | **IGUAL** (6.3.1) | — | Feito |
| Header mobile | Nome + ícone papel + verificação | Nome + Brain + verificação | **IGUAL** estrutura (6.3.1) | — | Feito |
| Bottom nav mobile | Home/Leads/… | Início/Médicos/Pacientes/Comunicação | **IGUAL** chrome; itens Psi legítimos | — | Feito |
| Dropdown perfil | Foto + Meu Perfil + Meu Link + Sair | Foto + Meu Perfil + Mensagens + Sair | **AJUSTE** chrome OK; Link ausente = legítimo | P3 residual | — |
| Início | `ProfissionalDashboardHome` | `MetaPsiDashboardHome` (Hero+KPI Nutri) | **IGUAL** chrome; dados Psi (6.3.2) | — | Feito |
| Médicos | UI rica | `MetaPsiMedicosVinculoPanel` tabs Nutri | **IGUAL** chrome (6.3.3) | — | Feito |
| Pacientes | Carousel + cards | carousel + tabela/cards Nutri | **IGUAL** chrome (6.3.4) | — | Feito |
| Workspace paciente | `mn-pastas` | `MetaPsiPacienteWorkspaceModal` + `mn-pastas*` | **IGUAL** chrome (6.3.5) | — | Feito |
| Comunicação desktop | GmailPanel + Mail | GmailPanel + Mail | **IGUAL** chrome (6.3.6) | — | Feito |
| Comunicação mobile | Modal Mensagens | Modal + bottom/dropdown | **IGUAL** chrome (6.3.6) | — | Feito |
| Meu Perfil | Gradiente + 6 abas | Gradiente + 3 abas Psi | **IGUAL** chrome (6.3.7); tabs extras Nutri omitidas | — | Feito |
| Financeiro / Calendário | Operacional Nutri/Personal | Placeholder Psi | **AUDITORIA 6.3.8** — ver `METAPSI_FINANCEIRO_CALENDARIO_AUDIT.md` | — | Placeholder mantido |
| Leads / Alimentos / WhatsApp | Existem | Não | DIFERENÇA LEGÍTIMA | — | Não copiar |

\*Painel de mensagens compartilhado; ACL/destinatários Psi legítimos.

---

## 1. Arquitetura global Nutri

- Monólito `page.v2.tsx` (~9k+ linhas) com shell + conteúdo por `activeMenu`.
- Sidebar `fixed`, navy `organizationSecondaryColor`, classes `mn-sidebar*`.
- Tablet: trilho 64px + overlay (`data-mn-nav-open` + CSS).
- Mobile: header rico + **bottom nav**; sidebar `hidden md:block`.
- Conteúdo: `md:pl-16` / `xl:pl-64`, `bg-gray-50`, `pb-20` no mobile.
- Feature menus extras: Leads, Alimentos, WhatsApp.

## 2. Arquitetura global Psi

- `page.v2.tsx` enxuto + painéis em `components/metapsi/*`.
- **Já reutiliza** `mn-sidebar` e `metanutri-shell.css` (bom ponto de partida).
- Mobile: hamburger + drawer; **sem** bottom nav Nutri.
- Main: `md:ml-16` / `xl:ml-64` (Nutri usa `pl-*` no content wrapper — diferença estrutural menor).
- Menus: Home, Médicos, Pacientes, Financeiro, Calendário, Meu Perfil (também no nav), Comunicação.

## 3. Sidebar

| Aspecto | Nutri | Psi | Nota |
|---------|-------|-----|------|
| Largura collapsed | `w-16` / `xl:w-16` | igual | OK |
| Largura expandida | `xl:w-64` | igual | OK |
| Background | `style={{ backgroundColor: organizationSecondaryColor }}` | `NAVY` constante | Preferir branding org |
| Classes | `mn-sidebar*` | mesmas | OK |
| Active | `bg-white/10 text-[#4CCB7A] border-r-2` | igual | OK |
| User block | Bem-vindo + shield + badge + **estrelas** | Bem-vindo + shield + badge | Estrelas = legítimo ausente se Psi não tiver classificação |
| Footer perfil | Sim | Sim | OK |

## 4. Logo

| Nutri | Psi |
|-------|-----|
| `sidebarOrganizationLogoSrc` (marca da org) | `/oftware-site-novo2.png` fixo |
| Alt com `publicName` | Alt “Oftware” |

**Ação:** portar `resolveOrganizationShellLogoUrl` + fetch branding (como Nutri/Personal).

## 5. Ícones do menu

| Menu Nutri | Ícone Nutri | Menu Psi | Ícone Psi | Igual padrão? | Correção |
|------------|-------------|----------|-----------|---------------|----------|
| Dashboard | `LayoutDashboard` | Início | `Home` | Não | Usar `LayoutDashboard` (label pode ficar “Início” ou “Dashboard”) |
| Leads | `Kanban` | — | — | Legítimo ausente | — |
| Médicos | `Stethoscope` | Médicos | `Stethoscope` | Sim | — |
| Pacientes | `Users` | Pacientes | `Users` | Sim | — |
| Financeiro | `DollarSign` | Financeiro | `DollarSign` | Sim | — |
| Calendário | `Calendar` | Calendário | `Calendar` | Sim | — |
| Comunicação | `Mail` | Comunicação | `Mail` | Sim | — |
| Alimentos | `Apple` | — | — | Legítimo | — |
| WhatsApp | `MessageCircle` | — | — | Legítimo | — |
| (footer) Perfil | `UserCircle` | Meu Perfil **no nav** + footer | `UserCircle` | Parcial | Tirar “Meu Perfil” do nav principal; só footer (como Nutri) |
| — | — | Header mobile Brain | `Brain` | Específico | OK como marca Psi no header, não no item genérico |

## 6. Header

- **Nutri mobile:** identidade profissional (ícone papel + shield + nome + tipo + estrelas) + ações.
- **Psi mobile:** Menu / “MetaPsi” + Brain / spacer — mais genérico.
- Desktop: nenhum dos dois tem top bar global além do conteúdo da página.

## 7. Perfil / dropdown

- Nutri: avatar 12×12 no header do dropdown, Meu Perfil, Meu Link, separador, Sair (SVG).
- Psi: header só texto; Meu Perfil; Mensagens (`xl:hidden`); Sair Lucide.
- **Mensagens no dropdown** é alinhado ao Personal (6.1); Nutri não tem — diferença legítima de entrada mobile se mantida, ou mover só para Comunicação.

## 8. Início

- Nutri: `ProfissionalDashboardHome` + `NutritionPortfolioOverview` (dados reais).
- Psi (6.3.2): `MetaPsiDashboardHome` — mesmo grid Hero+4 KPIs (`DashboardHeroKpi`/`DashboardKpiCard`), atalhos e pendências com dados reais Psi.
- **Legítimo omitido:** tratamento/peso/financeiro/filtro Oftware/agenda.

## 9. Médicos

- Nutri: H1 + tabs (Vinculados / Solicitações / Buscar) + filtros estado/cidade + cards densos + SplitView desktop.
- Psi (6.3.3): mesmas tabs/cards/empty/loading; pacientes por médico via ACL `paciente_psiquiatra` ativo; workspace Psi.
- **Legítimo:** sem `ProfissionalVinculadosSplitView` (acoplado a cardápio/treino Nutri); especialidade só se existir no doc.

## 10. Pacientes

- Nutri: H1 + subtítulo + carousel solicitações + busca/filtro médico + tabela desktop + cards mobile (com peso/financeiro).
- Psi (6.3.4): mesma composição; `SolicitacoesPacientesCarousel`; ACL SoT; encerrar via `endCompartilhamento`.
- **Legítimo omitido:** perda de peso / semanas / financeiro Nutri.
- Workspace → **corrigido na 6.3.5**.

## 11. Workspace do paciente

- Ambos: modal fullscreen/docked, `PacienteModalHeader`, pastas laterais, tabs mobile horizontais.
- Nutri: classes `mn-pastas*` + CSS tablet; pasta 14 Psiquiatria; pasta Financeiro.
- Psi **6.3.5:** mesmo chrome `mn-pastas*` / green active / spinner / CTA verde; z-[80]/z-[9999].
- Pastas Psi: ids 1–10 (Psiquiatria = 9); Nutri inclui Financeiro e ordem Psiquiatria=14 — **legítimo**.

## 12. Tabs do paciente

Ícones Lucide alinhados (User, ClipboardList, FileText, Flask, Scale, Syringe, Pill, Utensils, Brain, Dumbbell).  
Psi reutiliza conteúdos RO; shell pastas alinhado em 6.3.5.

## 13. Financeiro

- Nutri: operacional.
- Psi: placeholder dashed.
- Paridade: **AUSENTE** (não implementar agora).

## 14. Calendário

- Idem Financeiro.

## 15–16. Comunicação

- Mesmo `OrganizacaoComunicacaoGmailPanel` + `loadDestinatarios*`.
- Desktop/mobile Psi OK pós 6/6.1/6.3.1.
- **6.3.6:** chrome desktop = Nutri (sem card dashed); `onNotify` = `alert`; branding assinatura via org shell; CRM/UF; role `psiquiatra`.
- Copy modal (“compartilhamento ativo”) e ausência de `onAbrirPacienteAnexo` = diferenças legítimas / residual funcional.

## 17. Meu Perfil

- **6.3.7:** chrome alinhado ao Nutri (header, chips, inputs focus green, footer Salvar).
- Tabs Psi: Dados Iniciais / Endereço / Cidades.
- **OMITIR LEGITIMAMENTE:** Assinatura Digital, Meu Link, WhatsApp.
- Campos domínio: CRM/UF/RQE, especialidade RO, e-mail RO.
- Documentos de verificação permanecem no wizard de aprovação (ETAPA 1.1), não no Perfil.

## 18–23. Cards / Botões / Badges / Empty / Loading / Modais

- Cards Nutri: `bg-white shadow rounded-lg` / `rounded-2xl`.
- Psi: mistura `rounded-2xl border shadow-sm` e dashed EmptyPanel.
- Primary: ambos `green-600`; workspace Psi erro alinhado (6.3.5).
- Badges status: Psi usa pills green/amber; Nutri mais variado (amber carousel, etc.).
- Loading: Nutri skeletons; workspace Psi spinner verde (6.3.5).
- Modais vínculo/paciente: Psi mais simples; mensagens modal alinhado ao Personal/Nutri Gmail.

## 24. Tokens

- Pouca dependência de `--brand-*` nos dois; navy via style inline.
- Hardcodes `gray-*`, `green-*`, `#4CCB7A`, `#E8EDED` compartilhados na sidebar.
- Psi: `NAVY = ORGANIZATION_METODO_SECONDARY_COLOR` sem fetch dinâmico de branding.

## 25. Tipografia

- Títulos página: ambos `text-2xl font-bold text-gray-900`.
- Sidebar: `text-sm font-medium` / labels `#E8EDED`.
- Divergência maior nos empty states e densidade de subtítulos.

## 26. Responsividade

| Faixa | Nutri | Psi | Gap |
|-------|-------|-----|-----|
| Mobile | Header + bottom nav | Header mínimo + drawer | P1 |
| Tablet | CSS `mn-sidebar` trilho | Mesmo CSS + drawer open | OK base |
| Desktop | xl expand | xl expand | OK |

## 27. Componentes duplicados (desnecessários a médio prazo)

- `EmptyPanel` / `KpiCard` locais no Psi vs padrões do dashboard Nutri.
- ~~Workspace aside sem `mn-pastas*`~~ → **feito 6.3.5**

## 28. Componentes compartilháveis / já compartilhados

**Direto:** `OrganizacaoComunicacaoGmailPanel`, `PacienteModalHeader`, tabs RO metaadmin, `metanutri-shell.css`, classes `mn-sidebar*` / `mn-pastas*`.  
**Com props:** `ProfissionalDashboardHome` (dados Psi), padrões de busca/tabs Médicos, carousel solicitações.  
**Específico Psi:** ACL gates, `MetaPsiPsiquiatriaTab`, services `paciente_psiquiatra`, pastas id mapping.

## 29. Diferenças funcionais legítimas

- Sem Leads / Alimentos / WhatsApp / Assinatura digital / Meu Link (até existirem).
- ACL paciente só via share ativo.
- KPIs financeiros/agenda ainda não.
- Badge “Psiquiatra”; Brain no header mobile.
- Auto-vínculo/mesmo login liberado para testes.

## 30–34. Severidades

### P0
Nenhum bloqueio visual crítico de layout quebrado detectado na auditoria estática.

### P1 (pendentes pós-6.3.1)
1. ~~Logo/branding org~~ → **feito 6.3.1**  
2. ~~Ícones/ordem do menu~~ → **feito 6.3.1**  
3. ~~Header mobile + bottom nav~~ → **feito 6.3.1**  
4. ~~Início sem shell do dashboard Nutri~~ → **feito 6.3.2**  
5. ~~Médicos chrome visual~~ → **feito 6.3.3**  
6. ~~Pacientes chrome visual~~ → **feito 6.3.4**  
7. ~~Workspace: `mn-pastas` + loading + CTA verde~~ → **feito 6.3.5**  

### P2
Dropdown chrome alinhado (6.3.1); empty/skeleton; indigo residual em tabs internas (Exames); tipografia empty.

### P3
Placeholders Financeiro/Calendário; polimento copy abas perfil; Meu Link ausente (legítimo).

---

## Ordem recomendada de correção

1. ~~**6.3.1** Estrutura global~~ → **CONCLUÍDA**  
2. ~~**6.3.2** Início~~ → **CONCLUÍDA** (`MetaPsiDashboardHome`)  
3. ~~**6.3.3** Médicos~~ → **CONCLUÍDA**  
4. ~~**6.3.4** Pacientes~~ → **CONCLUÍDA**  
5. ~~**6.3.5** Workspace~~ → **CONCLUÍDA** (`mn-pastas*`, spinner, CTA verde)  
6. ~~**6.3.6** Comunicação~~ → **CONCLUÍDA** (chrome residual + branding)  
7. ~~**6.3.7** Meu Perfil~~ → **CONCLUÍDA** (chrome Nutri + campos Psi)  
8. ~~**6.3.8** Financeiro/Calendário~~ → **AUDITORIA CONCLUÍDA** (placeholders mantidos; ver doc dedicado)  
9. ~~**6.3.9** Revisão mobile/visual final~~ → **CONCLUÍDA**  

---

## ETAPA 6.3.9 — FINAL VISUAL REVIEW

### Revisado
Shell, Início, Médicos, Pacientes, Workspace, Comunicação, Meu Perfil, placeholders Fin/Cal, dropdown, bottom nav, loading/empty/modais (estrutural).

### Resíduos encontrados
| Ocorrência | Classificação | Ação |
|------------|---------------|------|
| EmptyPanel Fin/Cal dashed + copy “backend próprio” | **RESÍDUO** | Corrigido → empty Nutri + copy neutra |
| `MessageSquare` em WhatsApp pacientes | **LEGÍTIMA** (igual Nutri) | Mantido |
| `Brain` header mobile | **LEGÍTIMA** (identidade Psi) | Mantido |
| indigo em `MetaPsiExamesReadonlyTab` | **COMPONENTE** tab interna | Mantido (fora do shell) |
| “Carregando …” + spinner | **LEGÍTIMA** / acessível | Mantido |
| `MetaPsi` em layout title / nomes de componentes | **LEGÍTIMA** | Mantido |

### Resíduos corrigidos
- Placeholders Financeiro/Calendário: ícone DollarSign/Calendar, `rounded-lg border-gray-200 bg-gray-50`, copy sem “Em breve” / sem promessa.

### Diferenças legítimas
Sem Leads/Alimentos/WhatsApp/Meu Link; tabs perfil 3; ACL Psi; Fin/Cal placeholder (6.3.8); Brain header.

### Pendências manuais
Verificação visual lado a lado em browser autenticado (390/768/1024/1440).

### Z-index hierarchy (final)
| Camada | z |
|--------|---|
| Dropdown overlay | 40 |
| Dropdown / bottom nav | 50 |
| Comunicação modal | 70 |
| Workspace desktop docked | 80 |
| Workspace mobile fullscreen / bloqueio verificação | 9999 |

---

## Bugs Nutri observados (não copiar)

- `console.log` de debug em render de Médicos (`page.v2.tsx`).  
- Densidade/complexidade extrema do monólito (risco de regressão ao copiar trechos grandes).  
Documentar apenas; não corrigir Nutri nesta etapa.

---

**Status documento:** Série **6.3 CONCLUÍDA** (1–9). Paridade visual `/metapsi` × `/metanutri` fechada com diferenças funcionais legítimas. Placeholders Fin/Cal. Sem ETAPA 7.
