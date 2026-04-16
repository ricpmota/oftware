# ETAPAS - Implementação do Financeiro do /metapersonal

## Objetivo
Implementar a página Financeiro do `/metapersonal` igual à do `/metanutri`, adaptada para Personal Trainers. O financeiro é específico do Personal Trainer, não do Nutricionista nem do Médico.

---

## ANÁLISE DO ESTADO ATUAL

### O que já existe:
1. ✅ Estrutura básica do `/metapersonal` (page.v2.tsx)
2. ✅ Menu com item "Financeiro" (placeholder)
3. ✅ Função `loadPagamentos` básica (usa `getPagamentoPorPacienteId` individualmente - ineficiente)
4. ✅ Estados básicos de pagamento (`pagamentosPacientes`, `showModalPagamento`, etc.)

### O que falta:
1. ❌ Collection específica para pagamentos Personal Trainer-Paciente no Firestore
2. ❌ Métodos no `PagamentoService` para Personal Trainer (similar aos do Nutricionista)
3. ❌ Estados de filtros do financeiro (`buscaPacienteFinanceiro`, `filtroStatusPagamentoFinanceiro`)
4. ❌ UI completa do financeiro (cards de resumo, filtros, tabela)
5. ❌ Modal completo de gerenciamento de pagamento
6. ❌ Carregamento automático de pacientes quando entrar na seção financeiro
7. ❌ Integração com `pacientesVisiveis` para mostrar apenas pacientes do Personal Trainer

---

## ESTRUTURA DE DADOS

### Collection Firestore
- **Nome:** `pagamentos_personal_trainer_paciente`
- **Estrutura do documento:**
  - ID do documento: `{personalTrainerId}_{pacienteId}`
  - Campos:
    - `personalTrainerId`: string (ID do Personal Trainer - user.uid)
    - `pacienteId`: string (ID do paciente)
    - `statusPagamento`: 'negociacao' | 'iniciou_pagamento' | 'em_aberto' | 'pago'
    - `formaPagamento`: 'a_vista' | 'dividido' | 'cartao' | null
    - `valorTotal`: number
    - `valorPago`: number
    - `valorPendente`: number
    - `parcelas`: ParcelaPagamento[]
    - `observacoes`: string (opcional)
    - `dataUltimaAtualizacao`: Date
    - `dataVencimento`: Date (opcional)
    - `dataPagamento`: Date (opcional)

---

## ETAPAS DE IMPLEMENTAÇÃO

### ETAPA 1: Criar métodos no PagamentoService para Personal Trainer

**Arquivo:** `services/pagamentoService.ts`

**Tarefas:**
1. Adicionar constante da collection:
   ```typescript
   private static readonly COLLECTION_PERSONAL_TRAINER_PACIENTE = 'pagamentos_personal_trainer_paciente';
   ```

2. Criar método `salvarPagamentoPersonalTrainerPaciente`:
   - Similar a `salvarPagamentoNutricionistaPaciente`
   - Usar `personalTrainerId` ao invés de `nutricionistaId`
   - ID do documento: `{personalTrainerId}_{pacienteId}`
   - Validar e ajustar status automaticamente (em_aberto se houver parcela vencida)

3. Criar método `getPagamentoPersonalTrainerPaciente`:
   - Similar a `getPagamentoNutricionistaPaciente`
   - Buscar por ID composto: `{personalTrainerId}_{pacienteId}`

4. Criar método `getAllPagamentosPersonalTrainer`:
   - Similar a `getAllPagamentosNutricionista`
   - Buscar todos os pagamentos onde `personalTrainerId == personalTrainerId`
   - Retornar `Record<string, PagamentoPaciente>` indexado por `pacienteId`

**Referência:** Ver métodos do Nutricionista (linhas 292-426 do `pagamentoService.ts`)

---

### ETAPA 2: Adicionar estados necessários no metapersonal

**Arquivo:** `app/metapersonal/page.v2.tsx`

**Tarefas:**
1. Adicionar estados de filtros do financeiro (após linha ~193):
   ```typescript
   // Estados para seção Financeiro
   const [buscaPacienteFinanceiro, setBuscaPacienteFinanceiro] = useState<string>('');
   const [filtroStatusPagamentoFinanceiro, setFiltroStatusPagamentoFinanceiro] = useState<string>('todos');
   ```

2. Verificar se estados de modal já existem:
   - `showModalPagamento` ✅ (já existe)
   - `pacientePagamentoSelecionado` ✅ (já existe)
   - `dadosPagamento` ✅ (já existe)

3. Adicionar estado para carregar pacientes quando entrar no financeiro:
   - Usar `useEffect` que monitora `activeMenu === 'financeiro'`
   - Chamar `loadPacientesList()` quando entrar na seção

---

### ETAPA 3: Atualizar função loadPagamentos

**Arquivo:** `app/metapersonal/page.v2.tsx`

**Tarefas:**
1. Substituir implementação atual (linhas ~626-655) por:
   - Usar `PagamentoService.getAllPagamentosPersonalTrainer(user.uid)`
   - Filtrar apenas pagamentos dos pacientes visíveis (similar ao metanutri)
   - Atualizar `setPagamentosPacientes` com os pagamentos filtrados

**Referência:** Ver `loadPagamentos` do metanutri (linhas 1276-1302)

---

### ETAPA 4: Implementar UI do Financeiro

**Arquivo:** `app/metapersonal/page.v2.tsx`

**Tarefas:**
1. Substituir placeholder do case 'financeiro' (linhas ~2748-2754) pela implementação completa

2. Copiar estrutura do metanutri (linhas 5159-5344) e adaptar:
   - Cards de resumo (Receitas Recebidas, Em Aberto, Total Previsto)
   - Filtros (busca por nome, filtro por status)
   - Tabela de pacientes com pagamentos
   - Botão "Gerenciar" que abre modal

3. Adaptações necessárias:
   - Usar `pacientesVisiveis` do Personal Trainer (já existe)
   - Usar `pagamentosPacientes` (já existe)
   - Usar estados de filtro recém-criados
   - Manter mesma estrutura visual

**Referência:** Ver case 'financeiro' do metanutri (linhas 5159-5344)

---

### ETAPA 5: Implementar Modal de Pagamento

**Arquivo:** `app/metapersonal/page.v2.tsx`

**Tarefas:**
1. Adicionar modal completo após o return principal (antes do fechamento do componente)

2. Copiar estrutura do modal do metanutri (linhas 8418-8611) e adaptar:
   - Título: "Controle de Pagamento - {nome do paciente}"
   - Campos: Status, Forma de Pagamento, Valores (Total, Pago, Pendente), Observações
   - Botões: Salvar, Cancelar

3. Adaptações no handler de salvar:
   - Usar `PagamentoService.salvarPagamentoPersonalTrainerPaciente`
   - Passar `user.uid` como `personalTrainerId`
   - Passar `pacientePagamentoSelecionado.id` como `pacienteId`
   - Recarregar pagamentos após salvar
   - Fechar modal e mostrar mensagem de sucesso

**Referência:** Ver modal de pagamento do metanutri (linhas 8418-8611)

---

### ETAPA 6: Adicionar useEffect para carregar dados do financeiro

**Arquivo:** `app/metapersonal/page.v2.tsx`

**Tarefas:**
1. Adicionar `useEffect` que monitora `activeMenu === 'financeiro'`:
   ```typescript
   useEffect(() => {
     if (user && personalTrainer && activeMenu === 'financeiro') {
       loadPacientesList();
     }
   }, [user, personalTrainer, activeMenu, loadPacientesList]);
   ```

2. Garantir que `loadPacientesList` já chama `loadPagamentos` (já está implementado)

**Referência:** Ver useEffect similar no metanutri (linhas ~1304-1310)

---

### ETAPA 7: Atualizar Firestore Rules (se necessário)

**Arquivo:** `firestore.rules`

**Tarefas:**
1. Verificar se há regras para `pagamentos_personal_trainer_paciente`
2. Adicionar regras similares às de `pagamentos_nutricionista_paciente`:
   - Personal Trainer pode ler/escrever seus próprios pagamentos
   - Validar que `personalTrainerId` corresponde ao usuário autenticado

**Referência:** Ver regras do nutricionista (linhas ~214-251 do firestore.rules)

---

### ETAPA 8: Testes e Validações

**Tarefas:**
1. Testar carregamento de pagamentos:
   - Verificar se `getAllPagamentosPersonalTrainer` retorna dados corretos
   - Verificar se filtragem por pacientes visíveis funciona

2. Testar UI do financeiro:
   - Cards de resumo mostram valores corretos
   - Filtros funcionam (busca por nome, filtro por status)
   - Tabela mostra pacientes e pagamentos corretos
   - Botão "Gerenciar" abre modal

3. Testar modal de pagamento:
   - Salvar novo pagamento
   - Editar pagamento existente
   - Validar cálculos (valorPendente = valorTotal - valorPago)
   - Verificar se recarrega lista após salvar

4. Testar integração:
   - Verificar se pacientes são carregados ao entrar no financeiro
   - Verificar se pagamentos são carregados automaticamente
   - Testar navegação entre seções

---

## CHECKLIST DE IMPLEMENTAÇÃO

### Backend (PagamentoService)
- [ ] ETAPA 1.1: Adicionar constante `COLLECTION_PERSONAL_TRAINER_PACIENTE`
- [ ] ETAPA 1.2: Criar `salvarPagamentoPersonalTrainerPaciente`
- [ ] ETAPA 1.3: Criar `getPagamentoPersonalTrainerPaciente`
- [ ] ETAPA 1.4: Criar `getAllPagamentosPersonalTrainer`

### Frontend (metapersonal/page.v2.tsx)
- [ ] ETAPA 2: Adicionar estados de filtros do financeiro
- [ ] ETAPA 3: Atualizar `loadPagamentos` para usar novo método
- [ ] ETAPA 4: Implementar UI completa do financeiro
- [ ] ETAPA 5: Implementar modal de pagamento
- [ ] ETAPA 6: Adicionar useEffect para carregar dados

### Segurança (firestore.rules)
- [ ] ETAPA 7: Adicionar regras de segurança para collection

### Testes
- [ ] ETAPA 8: Testar todas as funcionalidades

---

## OBSERVAÇÕES IMPORTANTES

1. **Separação de dados:** O financeiro do Personal Trainer é completamente separado do Nutricionista e do Médico. Cada um tem sua própria collection.

2. **ID do documento:** Usar formato `{personalTrainerId}_{pacienteId}` para garantir unicidade e facilitar buscas.

3. **Pacientes visíveis:** Apenas pacientes compartilhados com o Personal Trainer (via `PacientePersonalTrainerService`) devem aparecer no financeiro.

4. **Performance:** Usar `getAllPagamentosPersonalTrainer` ao invés de buscar individualmente por paciente (muito mais eficiente).

5. **Consistência:** Manter mesma estrutura visual e funcional do `/metanutri` para consistência da plataforma.

---

## PRÓXIMOS PASSOS APÓS IMPLEMENTAÇÃO

1. Implementar seção Calendário (se ainda não estiver completa)
2. Adicionar exportação de relatórios financeiros (futuro)
3. Adicionar gráficos de receita ao longo do tempo (futuro)
4. Integrar com sistema de notificações para pagamentos vencidos (futuro)

---

## REFERÊNCIAS

- **Metanutri Financeiro:** `app/metanutri/page.v2.tsx` (linhas 5159-5344, 8418-8611)
- **PagamentoService Nutricionista:** `services/pagamentoService.ts` (linhas 292-426)
- **Tipos:** `types/pagamento.ts`
