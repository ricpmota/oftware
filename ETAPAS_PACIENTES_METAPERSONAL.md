# Etapas para Configurar Página Pacientes do /metapersonal

## Objetivo
Configurar a página Pacientes do `/metapersonal` igual à do `/metanutri`, adaptando todos os componentes, serviços e funcionalidades.

---

## ETAPA 1: Adicionar Imports Necessários

**Arquivo:** `app/metapersonal/page.v2.tsx`

### 1.1 Imports de Serviços
- [ ] Adicionar `PacientePersonalTrainerService` (já existe)
- [ ] Adicionar `PagamentoService`
- [ ] Adicionar `PacienteService`
- [ ] Adicionar `SolicitacaoPersonalTrainerService` (já existe)

### 1.2 Imports de Tipos
- [ ] Adicionar `PacienteVisivelPersonal` de `@/services/pacientePersonalTrainerService`
- [ ] Adicionar `PagamentoPaciente, ParcelaPagamento` de `@/types/pagamento`
- [ ] Adicionar `PacienteCompleto` de `@/types/obesidade`
- [ ] Adicionar `SolicitacaoPersonalTrainerDoc` de `@/features/metaPersonal/metaPersonal.types`

### 1.3 Imports de Componentes e Ícones
- [ ] Adicionar `KpiCard` (se necessário para Home)
- [ ] Adicionar ícones faltantes: `ChevronUp`, `Edit`, `Syringe`, `FlaskConical`, `FileText`, `BarChart3`, `Plus`, `Pill`, `User as UserIcon`

---

## ETAPA 2: Adicionar Estados para Seção Pacientes

**Arquivo:** `app/metapersonal/page.v2.tsx`

### 2.1 Estados Principais
- [ ] `pacientesVisiveis`: `PacienteVisivelPersonal[]` - Lista de pacientes compartilhados
- [ ] `loadingPacientesList`: `boolean` - Loading ao carregar pacientes
- [ ] `buscaPaciente`: `string` - Busca por nome/email
- [ ] `pagamentosPacientes`: `Record<string, PagamentoPaciente>` - Mapa de pagamentos por paciente
- [ ] `pacienteCardExpandido`: `string | null` - ID do paciente com card expandido (mobile)
- [ ] `pacienteDetalhesExpandido`: `string | null` - ID do paciente com detalhes expandidos (mobile)

### 2.2 Estados para Solicitações Pendentes
- [ ] `solicitacoesPendentes`: `SolicitacaoPersonalTrainerDoc[]` - Solicitações pendentes
- [ ] `loadingSolicitacoesPendentes`: `boolean` - Loading de solicitações

### 2.3 Estados para Modal de Visualização (se necessário)
- [ ] `showVisualizarPacienteModal`: `boolean` - Mostrar modal de visualização
- [ ] `pacienteVisualizando`: `PacienteCompleto | null` - Paciente sendo visualizado
- [ ] `pastaAtiva`: `number` - Pasta ativa no modal (se implementar modal completo)

### 2.4 Estados para Modal de Pagamento (se necessário)
- [ ] `showModalPagamento`: `boolean` - Mostrar modal de pagamento
- [ ] `pacientePagamentoSelecionado`: `PacienteCompleto | null` - Paciente selecionado para pagamento
- [ ] `dadosPagamento`: `PagamentoPaciente | null` - Dados do pagamento

---

## ETAPA 3: Implementar Funções de Carregamento

**Arquivo:** `app/metapersonal/page.v2.tsx`

### 3.1 Função loadPacientesList
- [ ] Criar função `loadPacientesList` usando `useCallback`
- [ ] Verificar se `user` e `personalTrainer` existem e se está verificado
- [ ] Chamar `PacientePersonalTrainerService.listPacientesVisiveisByPersonal(user.uid)`
- [ ] Atualizar `pacientesVisiveis` com os resultados
- [ ] Carregar pagamentos em background (sem bloquear renderização)
- [ ] Tratar erros adequadamente

### 3.2 Função loadPagamentos
- [ ] Criar função `loadPagamentos` usando `useCallback`
- [ ] Receber array de `PacienteCompleto[]`
- [ ] Para cada paciente, buscar pagamento usando `PagamentoService.getPagamentoPersonalTrainerPaciente`
- [ ] Atualizar `pagamentosPacientes` com os resultados
- [ ] Tratar erros silenciosamente (não bloquear UI)

### 3.3 Função loadSolicitacoesPendentes
- [ ] Criar função `loadSolicitacoesPendentes` usando `useCallback`
- [ ] Verificar se `user` existe
- [ ] Buscar solicitações pendentes usando `SolicitacaoPersonalTrainerService.listPendentesByPersonal`
- [ ] Atualizar `solicitacoesPendentes`
- [ ] Tratar erros

### 3.4 UseEffects para Carregar Dados
- [ ] Adicionar useEffect para carregar pacientes quando entrar na seção 'pacientes'
- [ ] Adicionar useEffect para carregar solicitações pendentes quando entrar na seção 'pacientes'
- [ ] Adicionar useEffect para carregar pagamentos quando pacientes mudarem (se necessário)

---

## ETAPA 4: Implementar Handlers de Ações

**Arquivo:** `app/metapersonal/page.v2.tsx`

### 4.1 Handler para Aceitar Solicitação
- [ ] Criar `handleAceitarSolicitacao(requestId: string)`
- [ ] Chamar `SolicitacaoPersonalTrainerService.approveShareRequest(requestId)`
- [ ] Recarregar solicitações e pacientes após sucesso
- [ ] Mostrar mensagem de erro se falhar

### 4.2 Handler para Rejeitar Solicitação
- [ ] Criar `handleRejeitarSolicitacao(requestId: string)`
- [ ] Pedir motivo da rejeição (opcional) via prompt
- [ ] Chamar `SolicitacaoPersonalTrainerService.rejectShareRequest(requestId, motivo)`
- [ ] Recarregar solicitações após sucesso
- [ ] Mostrar mensagem de erro se falhar

### 4.3 Handler para Cancelar Compartilhamento
- [ ] Criar `handleCancelarCompartilhamento(item: PacienteVisivelPersonal)`
- [ ] Pedir confirmação com detalhes do que será feito
- [ ] Chamar `SolicitacaoPersonalTrainerService.endCompartilhamento`
- [ ] Recarregar lista de pacientes após sucesso
- [ ] Mostrar mensagem de sucesso

### 4.4 Handler para Visualizar Paciente
- [ ] Criar `handleVisualizarPaciente(paciente: PacienteCompleto)`
- [ ] Atualizar `pacienteVisualizando` e `showVisualizarPacienteModal`
- [ ] Resetar `pastaAtiva` para 1 (se implementar modal completo)

---

## ETAPA 5: Implementar Renderização da Seção Pacientes

**Arquivo:** `app/metapersonal/page.v2.tsx` (dentro do `renderContent`, case 'pacientes')

### 5.1 Estrutura Base
- [ ] Substituir conteúdo placeholder por estrutura completa
- [ ] Adicionar título "Pacientes" e descrição
- [ ] Adicionar filtro de busca por nome/email

### 5.2 Seção de Solicitações Pendentes
- [ ] Verificar se há `solicitacoesPendentes.length > 0`
- [ ] Renderizar card amarelo com alerta
- [ ] Listar cada solicitação com:
  - Nome do paciente (ou ID truncado)
  - Nome do médico e data
  - Botões "Aceitar" e "Rejeitar"
- [ ] Conectar botões aos handlers

### 5.3 Filtro de Busca
- [ ] Adicionar input de busca com ícone Search
- [ ] Conectar ao estado `buscaPaciente`
- [ ] Filtrar pacientes por nome completo, nome ou email

### 5.4 Estados de Loading e Empty
- [ ] Mostrar spinner quando `loadingPacientesList === true`
- [ ] Mostrar mensagem se não estiver verificado
- [ ] Mostrar mensagem se não houver pacientes compartilhados
- [ ] Mostrar mensagem se busca não retornar resultados

### 5.5 Ordenação
- [ ] Ordenar pacientes filtrados alfabeticamente por nome completo

---

## ETAPA 6: Implementar Tabela Desktop

**Arquivo:** `app/metapersonal/page.v2.tsx` (dentro do case 'pacientes')

### 6.1 Estrutura da Tabela
- [ ] Criar tabela com classes Tailwind (hidden lg:block)
- [ ] Adicionar cabeçalhos: Item, Data de Cadastro, Nome, Telefone, Status, Perda Peso, Semanas, Ações

### 6.2 Cálculos por Paciente
Para cada paciente na lista, calcular:
- [ ] **Perda de Peso**: baseline (medidasIniciais ou weekIndex 1) vs último peso
- [ ] **IMC**: calcular e determinar emoji e cor da borda
- [ ] **Semanas**: total de semanas do plano vs semanas aplicadas
- [ ] **Status**: status do tratamento (em_tratamento, concluido, abandono, pendente)
- [ ] **Telefone**: formatar e criar link WhatsApp

### 6.3 Renderização de Linhas
- [ ] Renderizar cada paciente como linha da tabela
- [ ] Mostrar avatar com emoji IMC e borda colorida
- [ ] Mostrar nome completo
- [ ] Mostrar telefone com link WhatsApp (se disponível)
- [ ] Mostrar badge de status com cores apropriadas
- [ ] Mostrar perda de peso (formato: +X.X kg ou -X.X kg)
- [ ] Mostrar semanas (formato: X de Y) com barra de progresso
- [ ] Botão "Visualizar" que abre modal

### 6.4 Estilos e Interações
- [ ] Adicionar hover effect nas linhas
- [ ] Usar cores consistentes com tema (amarelo/laranja para Personal Trainer)

---

## ETAPA 7: Implementar Cards Mobile

**Arquivo:** `app/metapersonal/page.v2.tsx` (dentro do case 'pacientes')

### 7.1 Estrutura Base dos Cards
- [ ] Criar container de cards (lg:hidden)
- [ ] Para cada paciente, criar card com borda e sombra
- [ ] Adicionar efeito de gradiente quando expandido

### 7.2 Cabeçalho do Card
- [ ] Mostrar avatar com emoji IMC e borda colorida
- [ ] Mostrar nome completo
- [ ] Mostrar badges: Status, Status Financeiro (clicável), Perda de Peso
- [ ] Botão de expandir/recolher (ChevronDown/ChevronUp)

### 7.3 Conteúdo Expandido
Quando `pacienteCardExpandido === item.pacienteId`:
- [ ] Mostrar data de cadastro
- [ ] Mostrar telefone com link WhatsApp
- [ ] Mostrar informações de semanas (X de Y) com barra de progresso
- [ ] Mostrar informações adicionais relevantes

### 7.4 Seção de Detalhes Expandidos
Quando `pacienteDetalhesExpandido === item.pacienteId`:
- [ ] Mostrar informações clínicas iniciais (peso, altura, IMC)
- [ ] Mostrar evolução (se implementar gráficos)
- [ ] Botão para fechar detalhes

### 7.5 Botões de Ação
- [ ] Botão "Visualizar" (abre modal)
- [ ] Botão "Exibir Detalhes do Tratamento" (expande detalhes)
- [ ] Botão "Cancelar Compartilhamento" (Excluir) - apenas quando expandido

### 7.6 Status Financeiro Clicável
- [ ] Badge de status financeiro deve abrir modal de pagamento
- [ ] Passar dados do pagamento para o modal (ou criar novo se não existir)

---

## ETAPA 8: Adaptar Cores e Temas

**Arquivo:** `app/metapersonal/page.v2.tsx`

### 8.1 Cores Principais
- [ ] Substituir cores verdes (metanutri) por amarelo/laranja (metapersonal)
- [ ] Manter consistência: `bg-yellow-600`, `text-yellow-700`, `border-yellow-200`, etc.
- [ ] Ajustar focus rings: `focus:ring-yellow-500`

### 8.2 Badges e Status
- [ ] Manter cores de status iguais (verde=em_tratamento, azul=concluido, vermelho=abandono, amarelo=pendente)
- [ ] Ajustar apenas cores de tema (botões principais, bordas, etc.)

---

## ETAPA 9: Verificar Serviços e Métodos

### 9.1 Verificar SolicitacaoPersonalTrainerService
- [ ] Confirmar que `approveShareRequest` existe
- [ ] Confirmar que `rejectShareRequest` existe
- [ ] Confirmar que `endCompartilhamento` existe
- [ ] Confirmar que `listPendentesByPersonal` existe
- [ ] Se algum método não existir, criar ou adaptar

### 9.2 Verificar PagamentoService
- [ ] Confirmar que `getPagamentoPersonalTrainerPaciente` existe
- [ ] Se não existir, criar método similar ao `getPagamentoNutricionistaPaciente`
- [ ] Verificar estrutura de dados retornada

### 9.3 Verificar PacientePersonalTrainerService
- [ ] Confirmar que `listPacientesVisiveisByPersonal` existe (já existe)
- [ ] Verificar estrutura de retorno `PacienteVisivelPersonal`

---

## ETAPA 10: Testes e Validações

### 10.1 Testes Funcionais
- [ ] Testar carregamento de pacientes quando entrar na seção
- [ ] Testar busca por nome
- [ ] Testar busca por email
- [ ] Testar aceitar solicitação pendente
- [ ] Testar rejeitar solicitação pendente
- [ ] Testar cancelar compartilhamento
- [ ] Testar visualização de paciente (se modal implementado)
- [ ] Testar expansão de cards no mobile
- [ ] Testar clique no status financeiro

### 10.2 Testes de UI
- [ ] Verificar responsividade (desktop vs mobile)
- [ ] Verificar cores e temas
- [ ] Verificar estados de loading
- [ ] Verificar mensagens de empty state
- [ ] Verificar ordenação alfabética

### 10.3 Testes de Performance
- [ ] Verificar que pagamentos carregam em background
- [ ] Verificar que não há bloqueios na renderização
- [ ] Verificar que busca é performática

---

## ETAPA 11: Modal de Visualização (Opcional - Fase 2)

Se quiser implementar modal completo de visualização (similar ao metanutri):

### 11.1 Estrutura do Modal
- [ ] Criar modal com múltiplas pastas/tabs
- [ ] Implementar navegação entre pastas
- [ ] Adicionar botão de fechar

### 11.2 Conteúdo do Modal
- [ ] Pasta 1: Informações básicas
- [ ] Pasta 2: Evolução e gráficos (se necessário)
- [ ] Pasta 3: Tratamento e prescrições (se necessário)
- [ ] Pasta 4: Pagamentos (se necessário)

---

## ETAPA 12: Modal de Pagamento (Opcional - Fase 2)

Se quiser implementar modal de pagamento completo:

### 12.1 Estrutura do Modal
- [ ] Criar modal para gerenciar pagamentos
- [ ] Formulário com campos: status, forma de pagamento, valor total, parcelas
- [ ] Botões de salvar e cancelar

### 12.2 Funcionalidades
- [ ] Carregar dados existentes do pagamento
- [ ] Permitir edição de parcelas
- [ ] Salvar usando `PagamentoService.savePagamentoPersonalTrainerPaciente`
- [ ] Atualizar lista após salvar

---

## Notas Importantes

1. **Cores**: Manter consistência com tema amarelo/laranja do Personal Trainer
2. **Serviços**: Verificar se todos os métodos necessários existem nos serviços
3. **Tipos**: Usar tipos corretos (`PacienteVisivelPersonal` ao invés de `PacienteVisivelNutri`)
4. **Performance**: Carregar pagamentos em background para não bloquear UI
5. **Mobile First**: Garantir que cards mobile funcionem bem
6. **Acessibilidade**: Manter aria-labels e títulos apropriados

---

## Ordem de Implementação Recomendada

1. **ETAPA 1** - Imports (base)
2. **ETAPA 2** - Estados (base)
3. **ETAPA 3** - Funções de carregamento (lógica)
4. **ETAPA 9** - Verificar serviços (garantir que tudo existe)
5. **ETAPA 4** - Handlers (lógica)
6. **ETAPA 5** - Estrutura base da seção (UI)
7. **ETAPA 6** - Tabela desktop (UI)
8. **ETAPA 7** - Cards mobile (UI)
9. **ETAPA 8** - Ajustar cores (polimento)
10. **ETAPA 10** - Testes (validação)
11. **ETAPAS 11-12** - Modais (opcional, fase 2)

---

## Checklist Final

- [ ] Todos os imports adicionados
- [ ] Todos os estados criados
- [ ] Todas as funções de carregamento implementadas
- [ ] Todos os handlers implementados
- [ ] Seção de pacientes renderizando corretamente
- [ ] Tabela desktop funcionando
- [ ] Cards mobile funcionando
- [ ] Cores adaptadas para tema Personal Trainer
- [ ] Serviços verificados e funcionando
- [ ] Testes básicos realizados
- [ ] Sem erros de TypeScript
- [ ] Sem erros de lint
