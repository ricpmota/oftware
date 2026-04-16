# Reestruturação da UI do /metanutri para igualar ao /metaadmin

## Objetivo
Reorganizar completamente a página `/metanutri` para ter a mesma estrutura, layout e funcionalidades visuais do `/metaadmin`, adaptadas para o contexto do nutricionista (read-only para pacientes).

## Estrutura de Menu

### Menu Lateral (Sidebar)
- **Home** - Dashboard com estatísticas e visões gerais
- **Médicos** - Lista de médicos vinculados e pacientes compartilhados
- **Pacientes** - Visualização read-only dos pacientes compartilhados
- **Financeiro** - Controle financeiro dos pacientes do nutricionista
- **Calendário** - Aplicações dos pacientes + receitas financeiras

### Menu Superior (Header)
- **Meu Perfil** - Configurações do perfil do nutricionista
- **Meu Link** - Link de indicação/referral do nutricionista
- **Sair** - Logout

---

## ETAPAS DE IMPLANTAÇÃO

### ETAPA A0 — Preparação e arquivo de controle ✅

**Status:** Em andamento

**Tarefas:**
- [x] Criar este arquivo METANUTRI_UI_REWORK.md
- [ ] Mapear componentes do /metaadmin para reaproveitar
- [ ] Definir enums/itens do menu do Nutri
- [ ] Preparar estrutura sem mudar comportamento

**Componentes Reutilizáveis Identificados:**

### 1. Componentes de UI Geral (✅ Disponíveis)
- **`KpiCard`** (`components/KpiCard.tsx`) - Cards de estatísticas/KPI
- **`TrendLine`** (`components/TrendLine.tsx`) - Linhas de tendência para gráficos
- **`StackedBars`** (`components/StackedBars.tsx`) - Gráficos de barras empilhadas
- **`LabRangeBar`** (`components/LabRangeBar.tsx`) - Barra de ranges de exames laboratoriais
- **`AlertBadges`** (`components/AlertBadges.tsx`) - Badges de alerta
- **`ProgressPill`** (`components/ProgressPill.tsx`) - Pills de progresso

### 2. Componentes de Paciente (reaproveitar lógica do /metaadmin)
**Componentes a extrair/adaptar do `/metaadmin/page.tsx`:**
- **Modal de visualização de paciente** - Reaproveitar estrutura, adaptar para read-only
- **Tabela/lista de pacientes** - Reaproveitar grid e filtros
- **Visualização de exames laboratoriais** - Reaproveitar seção completa
- **Visualização de aplicações** - Reaproveitar timeline/lista
- **Visualização de check-ins nutricionais** - Reaproveitar componente `NutriContent`
- **Visualização de planos nutricionais** - Reaproveitar estrutura do modal de nutri

**Componentes existentes:**
- **`NutriContent`** (`components/NutriContent.tsx`) - Pode ser usado para visualização

### 3. Componentes de Financeiro (reaproveitar do /metaadmin)
**Extrair do `/metaadmin/page.tsx`:**
- **Modal de pagamento** - Adaptar para contexto do nutri
- **Lista de pagamentos** - Reaproveitar tabela e filtros
- **Gráficos financeiros** - Usar KpiCard e gráficos existentes

### 4. Componentes de Calendário (reaproveitar do /metaadmin)
**Componentes:**
- **`CalendarioAplicacoes`** (`components/CalendarioAplicacoes.tsx`) - Calendário de aplicações
- **Lógica de receitas financeiras** - Extrair do /metaadmin

### 5. Componentes de Layout (a criar baseado no /metaadmin)
**Estrutura a replicar:**
- **Sidebar responsiva** - Desktop (colapsável) + Mobile (hidden)
- **Header superior** - Menu dropdown (Meu Perfil, Meu Link, Sair)
- **Bottom navigation** - Mobile only (5 itens principais)
- **Content area** - Área principal com renderContent()

### 6. Componentes Adicionais
- **`FAQChat`** (`components/FAQChat.tsx`) - Chat de FAQ (pode usar)
- **`DashboardEvolucao`** (`components/DashboardEvolucao.tsx`) - Dashboard de evolução

**Enums/Constantes do Menu:**

```typescript
type MenuNutri = 'home' | 'medicos' | 'pacientes' | 'financeiro' | 'calendario';

const MENU_ITEMS: Array<{
  id: MenuNutri;
  label: string;
  icon: React.ComponentType;
  mobileLabel?: string;
}> = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'medicos', label: 'Médicos', icon: Stethoscope },
  { id: 'pacientes', label: 'Pacientes', icon: Users },
  { id: 'financeiro', label: 'Financeiro', icon: DollarSign },
  { id: 'calendario', label: 'Calendário', icon: Calendar },
];

const HEADER_MENU_ITEMS: Array<{
  id: string;
  label: string;
  icon: React.ComponentType;
  action: () => void;
}> = [
  { id: 'perfil', label: 'Meu Perfil', icon: UserCircle, action: () => setActiveMenu('meu-perfil') },
  { id: 'link', label: 'Meu Link', icon: LinkIcon, action: () => setShowLinkModal(true) },
  { id: 'sair', label: 'Sair', icon: LogOut, action: () => handleLogout() },
];
```

**Services Já Disponíveis:**
- `PacienteNutricionistaService` - Lista pacientes compartilhados
- `SolicitacaoNutricionistaService` - Gerencia solicitações
- `MedicoService` - Busca médicos vinculados
- `PacienteService` - Busca dados de pacientes (read-only)
- `PagamentoService` - Dados financeiros (se necessário adaptar)

---

### ETAPA A1 — Estrutura de layout idêntica ao /metaadmin ✅

**Status:** Concluída

**O que foi feito:**
- ✅ Criado arquivo `app/metanutri/page.v2.tsx` com estrutura completa de layout
- ✅ Implementado estados de navegação (activeMenu, sidebarCollapsed, showProfileDropdown, isMobile)
- ✅ Adicionada persistência de activeMenu no localStorage
- ✅ Criada função renderContent() com placeholders para todas as seções
- ✅ Sidebar desktop implementada (colapsável, igual ao /metaadmin)
- ✅ Header superior com menu dropdown (Meu Perfil, Meu Link, Sair)
- ✅ Bottom navigation mobile com os 5 itens principais
- ✅ Responsividade desktop + mobile garantida
- ✅ Sem queries ou services nesta etapa (apenas estrutura)

**Arquivos criados:**
- `app/metanutri/page.v2.tsx` - Nova estrutura de layout (não substitui o atual ainda)

**Como testar:**
1. O arquivo `page.v2.tsx` está criado mas não está ativo (arquivo atual `page.tsx` continua funcionando)
2. Para testar a nova estrutura, será necessário substituir `page.tsx` pelo `page.v2.tsx` na ETAPA A2+
3. Estrutura está preparada para receber funcionalidades existentes

**Próximos passos (ETAPA A2+):**
- Migrar modais e funcionalidades do `page.tsx` atual para `page.v2.tsx`
- Substituir `page.tsx` para usar a nova estrutura
- Implementar funcionalidades reais em cada seção

**Estrutura Base:**
```
<div className="flex h-screen">
  {/* Sidebar Desktop */}
  <aside className="hidden lg:block fixed left-0 top-0 h-full w-64">
    {/* Logo, menu items, perfil */}
  </aside>

  {/* Main Content */}
  <main className="flex-1 lg:ml-64">
    {/* Header Superior Mobile/Desktop */}
    <header className="bg-white shadow">
      {/* Logo mobile, menu dropdown perfil */}
    </header>

    {/* Content Area */}
    <div className="p-6">
      {renderContent()}
    </div>
  </main>

  {/* Bottom Navigation Mobile */}
  <nav className="lg:hidden fixed bottom-0 left-0 right-0">
    {/* Menu items mobile */}
  </nav>
</div>
```

---

### ETAPA A2 — Ativar v2 + Home (Nutri) com widgets e dados mínimos ✅

**Status:** Concluída

**O que foi feito:**
- ✅ Criado wrapper `app/metanutri/page.tsx` que ativa o v2 com segurança
- ✅ Criado `app/metanutri/page.legacy.tsx` como referência (código original preservado)
- ✅ Atualizado `app/metanutri/page.v2.tsx` com:
  - Carregamento completo do nutricionista
  - Home implementada com KPIs reais:
    - Pacientes compartilhados (contador real via `PacienteNutricionistaService`)
    - Médicos vinculados (contador real via `nutricionista.medicoVinculadoIds.length`)
    - Receita total (real, calculada dos pagamentos dos pacientes compartilhados)
    - Receita do mês atual (real, calculada das parcelas pagas no mês)
  - Placeholders para bases gerais (demografia, geografia, perda de peso)
  - Modais principais implementados:
    - Modal "Meu Perfil" (edição de registro e cidades)
    - Modal "Meu Link" (geração de link de referral)
    - Modal "Visualizar Paciente" (read-only, dados básicos)
  - Performance otimizada (máximo 3 queries: nutri doc, vínculos, pagamentos)

**Arquivos criados/alterados:**
- `app/metanutri/page.tsx` - Wrapper que ativa v2 (substitui o antigo)
- `app/metanutri/page.v2.tsx` - Versão completa com Home implementada
- `app/metanutri/page.legacy.tsx` - Placeholder para referência (código original no git)

**Como testar:**
1. Acessar `/metanutri` - deve abrir no layout novo (v2)
2. Navegar pelo menu (Home, Médicos, Pacientes, Financeiro, Calendário)
3. Verificar Home mostra KPIs reais:
   - Contador de pacientes compartilhados
   - Contador de médicos vinculados
   - Receita total e do mês (se houver pacientes com pagamentos)
4. Testar modais:
   - Menu superior → "Meu Perfil" → abrir modal de perfil
   - Menu superior → "Meu Link" → gerar/copiar link
   - Menu superior → "Sair" → fazer logout
5. Verificar responsividade (desktop sidebar + mobile bottom nav)

**Dados Reais Implementados:**
- ✅ Total de pacientes compartilhados (via `PacienteNutricionistaService.listActiveVinculosByNutri`)
- ✅ Receitas financeiras do nutricionista (via `PagamentoService.getAllPagamentos` filtrado por pacientes compartilhados)
- ✅ Total de médicos vinculados (via `nutricionista.medicoVinculadoIds.length`)

**Placeholders Implementados:**
- ✅ Demografia dos pacientes (Base geral Oftware) - layout pronto, dados "Em breve"
- ✅ Demografia geográfica (Base geral Oftware) - layout pronto, dados "Em breve"
- ✅ Estatística de perda de peso (Base geral Oftware) - layout pronto, dados "Em breve"

**Performance:**
- ✅ Máximo 3 queries na Home:
  1. Nutri doc (já carregado no useEffect inicial)
  2. Vínculos ativos (`PacienteNutricionistaService.listActiveVinculosByNutri`)
  3. Pagamentos (`PagamentoService.getAllPagamentos` - uma única query, filtrado no cliente)
- ✅ Sem N+1 queries
- ✅ Skeleton loading durante carregamento dos KPIs

**Modais Preservados:**
- ✅ Modal "Meu Perfil" - funcional, permite editar registro e cidades
- ✅ Modal "Meu Link" - funcional, gera link de referral para médicos vinculados
- ✅ Modal "Visualizar Paciente" - funcional, mostra dados básicos read-only
- ⚠️ Modal completo de paciente (com todas as pastas) será migrado na ETAPA A4

**Pendências:**
- ⚠️ Modal completo de visualização de paciente (com todas as pastas) será implementado na ETAPA A4
- ⚠️ Outras seções (Médicos, Pacientes, Financeiro, Calendário) continuam com placeholders

---

### ETAPA A3 — Médicos (Nutri) ✅

**Status:** Concluída

**O que foi feito:**
- ✅ Implementada seção "Médicos" no `renderContent()` do `page.v2.tsx`
- ✅ Carregamento otimizado de médicos vinculados (sem N+1):
  - Busca TODOS os médicos vinculados de `nutricionista.medicoVinculadoIds` (não apenas os que têm pacientes compartilhados)
  - Busca vínculos de pacientes e dados dos médicos em paralelo (`Promise.all`)
  - Passo A: Buscar vínculos ativos do nutri (`PacienteNutricionistaService.listActiveVinculosByNutri`)
  - Passo B: Agregar pacientes por médico (criar mapa `medicoId -> pacienteIds[]`)
  - Passo C: Carregar dados dos médicos em lote (`Promise.all` com `MedicoService.getMedicoById` para todos os `medicoVinculadoIds`)
  - Resultado: Lista todos os médicos vinculados, mesmo os que têm 0 pacientes compartilhados
- ✅ UI implementada:
  - Título e subtítulo
  - Campo de busca (filtra por nome ou email do médico)
  - Tabela com colunas: Médico, Pacientes em Comum, Status do Vínculo, Ação
  - Empty states apropriados (sem verificação, sem vínculos, sem resultados na busca)
- ✅ Modal "Pacientes em Comum" implementado:
  - Abre ao clicar em "Ver Pacientes"
  - Lista pacientes compartilhados com o médico selecionado
  - Mostra nome, data de compartilhamento, status e diagnóstico
  - Botão "Visualizar" abre modal read-only do paciente (já existente)
  - Carregamento otimizado (busca pacientes em lote via `PacienteService.getPacienteById`)
- ✅ Performance:
  - Sem N+1 queries (agregação no cliente, busca em lote)
  - Cache implícito (dados carregados apenas quando necessário)
  - Loading states apropriados

**Arquivos alterados:**
- `app/metanutri/page.v2.tsx` - Seção médicos implementada + modal de pacientes em comum

**Como testar:**
1. Acessar `/metanutri` → Menu "Médicos"
2. Validar lista de médicos vinculados aparece corretamente
3. Validar contador de pacientes por médico está correto
4. Testar busca (filtrar por nome ou email)
5. Clicar em "Ver Pacientes" em um médico
6. Validar modal lista pacientes em comum corretamente
7. Clicar em "Visualizar" em um paciente
8. Validar modal read-only do paciente abre corretamente
9. Verificar empty states (sem médicos vinculados, sem pacientes em comum)

**Dados e Filtros:**
- ✅ Só considera pacientes com `paciente_nutricionista.status == 'ativo'`
- ✅ Mostra TODOS os médicos que estão em `nutricionista.medicoVinculadoIds` (mesmo os que têm 0 pacientes compartilhados)
- ✅ Filtra médicos verificados e ativos
- ✅ Ordena por quantidade de pacientes (maior primeiro), depois por nome (alfabético)

**Ajustes de UI:**
- ✅ **Removido email do médico** (desktop e mobile)
- ✅ **Adicionado link WhatsApp do médico** (quando há telefone)
  - Link formatado: `https://wa.me/55{telefone_sem_caracteres}`
  - Ícone `MessageSquare` verde clicável
  - Exibido abaixo do CRM (desktop) e abaixo dos badges (mobile)
- ✅ **Placeholder de busca atualizado:** "Buscar médico por nome..." (removido "ou email")
- ✅ **Filtro de busca atualizado:** Busca apenas por nome (removido filtro por email)

**Performance:**
- ✅ Máximo 2 queries principais:
  1. Vínculos ativos do nutri (`PacienteNutricionistaService.listActiveVinculosByNutri`)
  2. Dados dos médicos em lote (`Promise.all` com `MedicoService.getMedicoById`)
- ✅ Busca de pacientes em comum apenas quando abre o modal (lazy loading)
- ✅ Sem N+1 queries (agregação no cliente)

**Pendências:**
- ⚠️ Modal completo de visualização de paciente (com todas as pastas) será implementado na ETAPA A4

---

### ETAPA A4 — Pacientes (Nutri) read-only + Nutrição editável

**Status:** Em andamento (A4.1 concluída, ajustes de UI completos)

#### ETAPA A4.1 — Lista de Pacientes (completa mobile + desktop) ✅

**Status:** Concluída

**O que foi feito:**
- ✅ Implementada lista/tabela completa de pacientes na seção "Pacientes" (mobile + desktop)
- ✅ Campo de busca (filtra por nome completo, nome ou email)
- ✅ Ordenação alfabética por nome
- ✅ Fonte de dados: `PacienteNutricionistaService.listPacientesVisiveisByNutri` (carrega em lote)
- ✅ Carregamento automático de pagamentos dos pacientes compartilhados via `loadPagamentos`
- ✅ Estado `pagamentosPacientes` para armazenar dados financeiros

**Versão Desktop - Tabela:**
- ✅ Colunas completas (igual `/metaadmin`):
  - **Item** (número sequencial)
  - **Data de Cadastro** (data formatada)
  - **Nome** (com emoji circular baseado em IMC)
  - **Telefone** (link WhatsApp se disponível)
  - **Status** (badge de status de tratamento: Em Tratamento, Concluído, Abandono, Pendente)
  - **Perda Peso** (kg ganho/perdido desde o início)
  - **Semanas** (barra de progresso: X de Y semanas aplicadas)
  - **Ações** (botão Visualizar/Editar)
- ✅ Cálculo de IMC e emoji (baseado nas medidas iniciais ou últimas medições)
- ✅ Cálculo de perda de peso (último peso - peso inicial)
- ✅ Cálculo de semanas aplicadas (baseado em `evolucaoSeguimento`)
- ✅ Barra de progresso de semanas (com cores: verde ≥100%, azul ≥50%, amarelo <50%)

**Versão Mobile - Cards:**
- ✅ Cards completos (igual `/metaadmin`):
  - **Emoji circular** (baseado em IMC, com cor de borda)
  - **Nome do paciente**
  - **Badges de status**:
    - Status de tratamento (Em Tratamento, Concluído, Abandono, Pendente)
    - Perda de peso (kg, com cor: verde=perda, laranja=ganho)
  - **Barra de progresso de semanas** (quando houver plano terapêutico)
  - **5 botões de ação** (iguais ao `/metaadmin`):
    1. **Editar** (laranja) - Abre modal de visualização (read-only)
    2. **Aplicações** (azul) - Abre modal (placeholder)
    3. **Exames** (verde) - Abre modal (placeholder)
    4. **Nutri** (amarelo) - Abre modal (placeholder)
    5. **Excluir** (vermelho, desabilitado) - Nutricionista não pode excluir
- ✅ Layout responsivo com bordas coloridas e espaçamento adequado

**Ajustes de UI:**
- ✅ **Removido badge de pagamento** dos cards mobile e coluna da tabela desktop
  - Motivo: Pagamentos serão gerenciados na página Financeiro (entre Paciente e Nutri)
  - Mantido carregamento de `pagamentosPacientes` para uso futuro na página Financeiro
- ✅ Cálculos de IMC, perda de peso e semanas idênticos ao `/metaadmin`

**Arquivos alterados:**
- `app/metanutri/page.v2.tsx` - Seção pacientes implementada com lista completa mobile + desktop
  - Imports adicionados: `Edit`, `Syringe`, `FlaskConical`, `Trash2`, `FileText`, `MessageSquare`
  - Estado `pagamentosPacientes` adicionado
  - Função `loadPagamentos` implementada
  - Lista mobile e desktop completas

**Como testar:**
1. Acessar `/metanutri` → Menu "Pacientes"
2. **Desktop:** Verificar tabela com todas as colunas (Item, Data, Nome com emoji, Telefone, Status, Perda Peso, Semanas, Ações)
3. **Mobile:** Verificar cards com emoji, badges de status, perda de peso, barra de semanas e 5 botões
4. Testar busca (filtrar por nome ou email)
5. Validar ordenação alfabética
6. Verificar que não há badge/coluna de pagamento
7. Clicar em botões de ação (abre modal stub por enquanto)

**Pendências (próximas micro-etapas):**
- ⚠️ **A4.1.1:** Ajustar funcionalidade dos 5 botões na versão mobile:
  - **Editar** → Abrir modal completo de paciente (read-only exceto Nutrição)
  - **Aplicações** → Mostrar detalhes de aplicações do paciente
  - **Exames** → Mostrar exames laboratoriais do paciente
  - **Nutri** → Abrir aba Nutrição do modal (editável)
  - **Excluir** → Manter desabilitado (nutricionista não pode excluir)
- ⚠️ **A4.1.2:** Ajustar botão "Visualizar/Editar" na versão desktop (abrir modal completo)
- ⚠️ **A4.2:** Modal completo com todas as pastas (read-only exceto Nutrição)
- ⚠️ **A4.3:** Aba Nutrição editável com 3 subtabs (Plano/Cardápio, Check-ins, Estatísticas)
- ⚠️ **A4.4:** Integração com NutriPlanoService para salvar planos

**Tarefas restantes (A4.2 em diante):**
- [ ] Modal de paciente completo (reaproveitar componentes do /metaadmin)
- [ ] Mostrar todas as pastas/seções (igual metaadmin) - read-only
- [ ] Implementar aba Nutrição com 3 subtabs
- [ ] Plano Nutricional/Cardápio editável (usando NutriPlanoService)
- [ ] Check-ins (editável se já for)
- [ ] Estatísticas (visualização)
- [ ] Garantir performance (queries em lote)

---

### ETAPA A5 — Financeiro (Nutri)

**Status:** Pendente

**Tarefas:**
- [ ] Replicar UI do /metaadmin
- [ ] Filtrar apenas pacientes compartilhados
- [ ] Mostrar valores/controle financeiros do Nutri
- [ ] Garantir que nutri só vê dados dos pacientes compartilhados
- [ ] Verificar regras de segurança (já garantidas pelo Firestore rules)

---

### ETAPA A6 — Calendário (Nutri)

**Status:** Pendente

**Tarefas:**
- [ ] Mostrar aplicações dos pacientes compartilhados
- [ ] Mostrar receitas financeiras no calendário
- [ ] Replicar layout e comportamento do /metaadmin
- [ ] Reaproveitar componentes do calendário

---

### ETAPA A7 — Acabamento + padronização + QA

**Status:** Pendente

**Tarefas:**
- [ ] Revisar links do menu superior
- [ ] Ajustar responsividade (mobile + desktop)
- [ ] Revisar carregamentos/erros/skeletons
- [ ] Testar todas as funcionalidades
- [ ] Atualizar documentação final
- [ ] Revisar acessibilidade

---

## Notas Importantes

1. **Read-only**: Nutricionista não pode editar dados de pacientes, apenas visualizar
2. **Reaproveitamento**: Usar componentes do /metaadmin sempre que possível
3. **Services**: Usar services existentes, não duplicar lógica
4. **Performance**: Manter estratégias de queries em lote já implementadas
5. **Segurança**: Firestore rules já garantem acesso apenas a pacientes compartilhados

---

## Progresso

- [x] ETAPA A0 - Preparação ✅
- [x] ETAPA A1 - Layout ✅
- [x] ETAPA A2 - Ativar v2 + Home ✅
- [x] ETAPA A3 - Médicos ✅
- [x] ETAPA A4.1 - Lista de Pacientes ✅
- [ ] ETAPA A4.2+ - Modal completo + Nutrição editável
- [ ] ETAPA A5 - Financeiro
- [ ] ETAPA A6 - Calendário
- [ ] ETAPA A7 - QA

---

**Última atualização:** 2024 - ETAPA A4.1 concluída (Lista de Pacientes completa mobile + desktop, lista de Médicos simplificada)

## Últimas Alterações (Atualização Recente)

### Ajustes na Lista de Pacientes (A4.1 - Conclusão)
- ✅ **Removido badge de pagamento:** Pagamentos serão gerenciados na página Financeiro (entre Paciente e Nutri)
- ✅ **Lista mobile completa:** Cards com emoji, badges de status/perda de peso, barra de semanas, 5 botões
- ✅ **Lista desktop completa:** Tabela com todas as colunas do `/metaadmin` (Item, Data, Nome, Telefone, Status, Perda Peso, Semanas, Ações)
- ✅ **Cálculos idênticos ao `/metaadmin`:** IMC, perda de peso, semanas aplicadas

### Ajustes na Lista de Médicos (A3 - Simplificação)
- ✅ **Removido email do médico** (desktop e mobile)
- ✅ **Adicionado link WhatsApp** do médico (quando há telefone)
- ✅ **Busca simplificada:** Apenas por nome (removido email)

### Próximos Passos Imediatos
1. **Ajustar funcionalidade dos 5 botões na versão mobile:**
   - Editar, Aplicações, Exames, Nutri, Excluir (desabilitado)
   - Cada botão deve abrir a seção correspondente no modal completo do paciente
2. **Ajustar modal de edição/visualização do paciente na versão desktop:**
   - Botão "Visualizar/Editar" deve abrir modal completo com todas as pastas
   - Modal read-only exceto aba Nutrição

---

## Mapeamento Detalhado de Componentes

### Componentes Prontos para Uso Imediato
✅ Componentes que já existem e podem ser importados diretamente:
- `KpiCard` - Dashboard/Home
- `TrendLine` - Gráficos de tendência
- `StackedBars` - Gráficos de barras
- `LabRangeBar` - Exames laboratoriais
- `AlertBadges` - Alertas e badges
- `ProgressPill` - Indicadores de progresso
- `CalendarioAplicacoes` - Calendário de aplicações

### Componentes a Adaptar do /metaadmin
📋 Lógica/estrutura a extrair e adaptar do `/metaadmin/page.tsx`:

1. **Modal de Paciente** (linhas ~2580-2600+)
   - Estrutura de pastas/abas
   - Visualização read-only de todas as seções
   - Remover botões de edição

2. **Tabela de Pacientes** (linhas ~4256+)
   - Grid/lista de pacientes
   - Busca e filtros
   - Cards de paciente

3. **Seção Financeiro** (linhas ~6119+)
   - Tabela de pagamentos
   - Modal de pagamento
   - Totais e resumos

4. **Seção Calendário** (linhas ~9414+)
   - Calendário mensal
   - Lista de aplicações por dia
   - Receitas financeiras

5. **Seção Home/Estatísticas** (linhas ~7337+)
   - Cards de KPI
   - Gráficos de demografia
   - Gráficos de perda de peso
   - Estatísticas financeiras

### Estrutura de Arquivos Sugerida

```
app/metanutri/
  └── page.tsx (reorganizado)

components/ (reaproveitar)
  ├── KpiCard.tsx ✅
  ├── TrendLine.tsx ✅
  ├── StackedBars.tsx ✅
  ├── LabRangeBar.tsx ✅
  ├── AlertBadges.tsx ✅
  ├── ProgressPill.tsx ✅
  ├── CalendarioAplicacoes.tsx ✅
  └── NutriContent.tsx ✅

services/ (já existentes)
  ├── pacienteNutricionistaService.ts ✅
  ├── solicitacaoNutricionistaService.ts ✅
  ├── pacienteService.ts ✅
  └── medicoService.ts ✅
```

### Checklist ETAPA A0
- [x] Criar arquivo METANUTRI_UI_REWORK.md
- [x] Mapear componentes reutilizáveis
- [x] Definir estrutura de menu
- [x] Mapear services disponíveis
- [ ] Verificar tipos/interfaces necessárias
- [ ] Documentar imports necessários
